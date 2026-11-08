"use client";

/**
 * DataStation.tsx — 3D Interactive Data Station Component
 * ========================================================
 * High-performance 3D Station with:
 * - Large centre monitor and two wrap-around side monitors under a metal arch.
 * - Baked vertex colors, MeshBasicMaterial, zero dynamic lights or shadows.
 * - Authentic phosphor CRT canvases updated ONLY on state change (zero per-frame draw cost).
 * - Smooth camera docking sequence (450ms in, 350ms out, exact pose restore).
 * - Physical pendrive insertion animation with tactile synthesized audio.
 * - Integration with PendriveTerminal UI, typed events, and pendriveStore.
 */

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  DATA_STATION_POS,
  DATA_STATION_ROT,
  DATA_STATION_INTERACTION,
  DATA_STATION_DIMENSIONS,
} from "./dataStation.config.ts";
import { buildDataStationMesh, type DataStationMeshGroup } from "./dataStation.mesh";
import { type StationScreenState } from "./dataStation.screens";
import { dataStationAudio } from "./dataStation.sound";
import { stationEvents } from "./dataStation.events";
import { pendriveStore } from "../../ui/terminal/pendriveStore";
import { telemetryStore } from "../../components/telemetry/telemetryStore";
import { relayStore } from "../../section2/relayStore";

export interface DataStationProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  reducedMotion?: boolean;
  onInputLocked?: (locked: boolean) => void;
  onPromptChange?: (prompt: string | null) => void;
  onOpenTerminal?: () => void;
  onCloseTerminal?: () => void;
  /** Triggered on successful data upload */
  onUploadBatch?: (batchId: string) => void;
}

// Temporary vectors & matrices reused in useFrame (Zero per-frame allocations!)
const _stationPos = new THREE.Vector3();
const _playerPos = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _toStation = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();

// Cubic ease-in-out pure function
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function DataStation({
  position,
  rotation,
  reducedMotion = false,
  onInputLocked,
  onPromptChange,
  onOpenTerminal,
  onCloseTerminal,
  onUploadBatch,
}: DataStationProps) {
  const { camera } = useThree();

  // Root station transform
  const stationPosition = useMemo(
    () => (position ? new THREE.Vector3(...position) : DATA_STATION_POS.clone()),
    [position]
  );
  const stationRotation = useMemo(
    () => (rotation ? new THREE.Euler(...rotation) : DATA_STATION_ROT.clone()),
    [rotation]
  );

  // Station Screen State (Internal ref only — zero React state overhead!)
  const stationStateRef = useRef<StationScreenState>("idle");

  // Interaction aim cone state
  const inRangeAndAimRef = useRef(false);

  // Docking Animation State: "none" | "in" | "docked" | "out"
  const dockPhaseRef = useRef<"none" | "in" | "docked" | "out">("none");
  const dockProgressRef = useRef(0);
  const lastInteractTimeRef = useRef(0);

  // Stored exact camera pose for 100% drift-free restoration
  const savedCamPosRef = useRef(new THREE.Vector3());
  const savedCamQuatRef = useRef(new THREE.Quaternion());
  const savedCamFovRef = useRef(75);

  // 3D Mesh Handle
  const meshGroupRef = useRef<DataStationMeshGroup | null>(null);
  const groupRef = useRef<THREE.Group>(null);

  // ============================================================
  // 1. INITIALIZE STATIC MESH & PROCEDURAL SOUND
  // ============================================================
  useEffect(() => {
    const meshData = buildDataStationMesh();
    meshGroupRef.current = meshData;

    if (groupRef.current) {
      groupRef.current.add(meshData.group);
    }

    // Check if store already has uploaded batches
    const stored = pendriveStore.getState();
    if (stored.uploadedBatches.length > 0) {
      stationStateRef.current = "loaded";
      meshData.screenTextures.renderAll({ state: "loaded" });
      meshData.statusBarMaterial.color.setHex(0x22c55e);
      meshData.portLedMaterial.color.setHex(0x22c55e);
      meshData.pendriveMesh.visible = true;
    } else {
      // 2-second boot sequence
      stationStateRef.current = "booting";
      meshData.screenTextures.renderAll({ state: "booting" });
      const bootTimer = setTimeout(() => {
        if (stationStateRef.current === "booting") {
          stationStateRef.current = "idle";
          meshData.screenTextures.renderAll({ state: "idle" });
        }
      }, 2000);

      return () => {
        clearTimeout(bootTimer);
        dataStationAudio.dispose();
        meshData.dispose();
        if (groupRef.current) {
          groupRef.current.remove(meshData.group);
        }
      };
    }

    return () => {
      dataStationAudio.dispose();
      meshData.dispose();
      if (groupRef.current) {
        groupRef.current.remove(meshData.group);
      }
    };
  }, []);

  // Update screen textures when state changes
  const applyStationState = useCallback((nextState: StationScreenState, extra?: any) => {
    stationStateRef.current = nextState;
    if (!meshGroupRef.current) return;
    const mg = meshGroupRef.current;
    mg.screenTextures.renderAll({ state: nextState, ...extra });

    const statusColor = mg.screenTextures.getStatusBarColor();
    mg.statusBarMaterial.color.setHex(statusColor);

    if (nextState === "loaded") {
      mg.portLedMaterial.color.setHex(0x22c55e);
      mg.pendriveMesh.visible = true;
    } else if (nextState === "error") {
      mg.portLedMaterial.color.setHex(0xff2222);
    } else if (nextState === "uploading") {
      mg.portLedMaterial.color.setHex(0xffaa00);
      mg.pendriveMesh.visible = true;
    }
  }, []);

  // ============================================================
  // 2. INTERACTION TRIGGER (E / CLICK)
  // ============================================================
  const triggerInteraction = useCallback(() => {
    const now = performance.now();
    if (now - lastInteractTimeRef.current < DATA_STATION_INTERACTION.debounceMs) {
      return;
    }
    lastInteractTimeRef.current = now;

    // Check pendrive possession or diagnostic unlocked
    const rState = relayStore.getState();
    const isDiagReady = rState.consoleUnlocked && !rState.diagnosticPassed;

    const pState = pendriveStore.getState();
    const canAccess = pState.hasPendrive || isDiagReady || pState.uploadedBatches.length > 0 || rState.consoleUnlocked;

    if (!canAccess) {
      dataStationAudio.playLockedBuzz();
      return;
    }

    // Never re-trigger if already docking or docked
    if (dockPhaseRef.current !== "none") return;

    // Save exact camera state
    savedCamPosRef.current.copy(camera.position);
    savedCamQuatRef.current.copy(camera.quaternion);
    savedCamFovRef.current = (camera as THREE.PerspectiveCamera).fov;

    // Clear HUD prompt and lock player locomotion
    onPromptChange?.(null);
    onInputLocked?.(true);

    if (reducedMotion) {
      // 100ms cut without camera tween
      dockPhaseRef.current = "docked";
      dataStationAudio.playInsertClick();
      if (meshGroupRef.current) {
        meshGroupRef.current.pendriveMesh.visible = true;
      }
      setTimeout(() => {
        dataStationAudio.playMountChirp();
        applyStationState("inserted");
        const rStateNow = relayStore.getState();
        if (rStateNow.consoleUnlocked && !rStateNow.diagnosticPassed) {
          relayStore.setActiveStationTab("diagnostic");
          relayStore.setDiagnosticConsoleOpen(true);
        } else {
          telemetryStore.setTerminalOpen(true);
          onOpenTerminal?.();
        }
      }, 100);
    } else {
      // Begin 450ms smooth camera ease
      dockPhaseRef.current = "in";
      dockProgressRef.current = 0;
    }
  }, [camera, reducedMotion, onInputLocked, onPromptChange, onOpenTerminal, applyStationState]);

  // Terminal Close Callback
  const handleTerminalClose = useCallback(
    (reason: "back" | "eject" | "uploaded") => {
      onCloseTerminal?.();
      if (relayStore.getState().diagnosticConsoleOpen) {
        relayStore.setDiagnosticConsoleOpen(false);
      }

      if (reason === "eject") {
        applyStationState("idle");
        if (meshGroupRef.current) {
          meshGroupRef.current.pendriveMesh.visible = false;
        }
      }

      if (reducedMotion) {
        // Instant restore under Reduce Motion
        camera.position.copy(savedCamPosRef.current);
        camera.quaternion.copy(savedCamQuatRef.current);
        camera.rotation.order = "YXZ";
        camera.rotation.z = 0;
        (camera as THREE.PerspectiveCamera).fov = savedCamFovRef.current;
        camera.updateProjectionMatrix();
        onInputLocked?.(false);
        dockPhaseRef.current = "none";
      } else {
        // Smooth camera ease back (if mid-dock "in", reverse cleanly from current progress)
        dockPhaseRef.current = "out";
        if (dockProgressRef.current <= 0) {
          dockProgressRef.current = 1;
        }
      }
    },
    [camera, reducedMotion, onCloseTerminal, onInputLocked, applyStationState]
  );

  // Listen for terminal open & close events from outside DOM modal / interactables
  useEffect(() => {
    const unsubTelemetry = telemetryStore.subscribe(() => {
      const isTermOpen = telemetryStore.getState().terminalOpen;
      const isDiagOpen = relayStore.getState().diagnosticConsoleOpen;
      if (isTermOpen && dockPhaseRef.current === "none" && inRangeAndAimRef.current) {
        triggerInteraction();
      } else if (!isTermOpen && !isDiagOpen && (dockPhaseRef.current === "docked" || dockPhaseRef.current === "in")) {
        handleTerminalClose("back");
      }
    });

    const unsubRelay = relayStore.subscribe(() => {
      const isTermOpen = telemetryStore.getState().terminalOpen;
      const isDiagOpen = relayStore.getState().diagnosticConsoleOpen;
      if (isDiagOpen && dockPhaseRef.current === "none" && inRangeAndAimRef.current) {
        triggerInteraction();
      } else if (!isDiagOpen && !isTermOpen && (dockPhaseRef.current === "docked" || dockPhaseRef.current === "in")) {
        handleTerminalClose("back");
      }
    });

    return () => {
      unsubTelemetry();
      unsubRelay();
    };
  }, [triggerInteraction, handleTerminalClose]);

  // Keyboard shortcut listener [E]
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "KeyE") {
        const isTermOpen = telemetryStore.getState().terminalOpen;
        const isDiagOpen = relayStore.getState().diagnosticConsoleOpen;
        if (inRangeAndAimRef.current && dockPhaseRef.current === "none" && !isTermOpen && !isDiagOpen) {
          e.preventDefault();
          triggerInteraction();
        }
      } else if (e.code === "Escape") {
        // Reverse docking ease cleanly if user cancels mid-dock
        if (dockPhaseRef.current === "in") {
          dockPhaseRef.current = "out";
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerInteraction]);

  // Upload Completion Reaction
  const handleTerminalUpload = useCallback(
    (batchId: string) => {
      applyStationState("uploading", { batchName: batchId, uploadProgress: 0.1 });

      // Animate progress up to 100%
      let p = 0.1;
      const interval = setInterval(() => {
        p += 0.18;
        if (p < 1.0) {
          dataStationAudio.playDataStreamTick();
          if (meshGroupRef.current) {
            meshGroupRef.current.screenTextures.renderAll({
              state: "uploading",
              batchName: batchId,
              uploadProgress: p,
            });
          }
        } else {
          clearInterval(interval);
          // Upload complete!
          applyStationState("loaded", { batchName: batchId });
          dataStationAudio.playLoadedChime();
          pendriveStore.recordBatchUpload(batchId);
          stationEvents.emit("uploaded", { batchId, time: Date.now() });
          onUploadBatch?.(batchId);
        }
      }, 120);
    },
    [applyStationState, onUploadBatch]
  );

  // ============================================================
  // 3. FRAME LOOP: AIM CONE, DOCK CAMERA TWEEN, AND FLICKER
  // ============================================================
  useFrame(({ camera: activeCam }, delta) => {
    _stationPos.copy(stationPosition);
    _playerPos.copy(activeCam.position);

    // 1. Proximity & Aim Cone Calculation (Zero allocations)
    const dist = _playerPos.distanceTo(_stationPos);

    if (dist <= DATA_STATION_INTERACTION.maxRange) {
      activeCam.getWorldDirection(_camFwd);
      // Vector towards station center monitor
      _toStation.copy(_stationPos).add(new THREE.Vector3(0, DATA_STATION_DIMENSIONS.centerElevation, 0)).sub(_playerPos).normalize();
      const dot = _camFwd.dot(_toStation);
      const isAiming = dot >= DATA_STATION_INTERACTION.aimDotThreshold;

      if (isAiming !== inRangeAndAimRef.current) {
        inRangeAndAimRef.current = isAiming;
        if (dockPhaseRef.current === "none") {
          const hasPen = pendriveStore.getState().hasPendrive;
          const rState = relayStore.getState();
          const isDiagReady = rState.consoleUnlocked && !rState.diagnosticPassed;

          let promptText: string | null = null;
          if (isAiming) {
            promptText = "PRESS [E] TO OPEN DATA STATION";
          }
          onPromptChange?.(promptText);
        }
      }
    } else if (inRangeAndAimRef.current) {
      inRangeAndAimRef.current = false;
      if (dockPhaseRef.current === "none") {
        onPromptChange?.(null);
      }
    }

    // 2. Camera Docking Ease (Pure function of progress, 450ms in, 350ms out)
    const phase = dockPhaseRef.current;
    if (phase === "in" || phase === "out") {
      const duration = phase === "in" ? 0.45 : 0.35;
      const step = delta / duration;

      if (phase === "in") {
        dockProgressRef.current = Math.min(1, dockProgressRef.current + step);
      } else {
        dockProgressRef.current = Math.max(0, dockProgressRef.current - step);
      }

      const t = easeInOutCubic(dockProgressRef.current);

      // Target camera position: dockDistance units in front of center monitor
      const forwardOffset = new THREE.Vector3(0, DATA_STATION_DIMENSIONS.centerElevation, DATA_STATION_INTERACTION.dockDistance).applyEuler(stationRotation);
      _targetCamPos.copy(_stationPos).add(forwardOffset);

      // Target lookAt: center monitor
      _targetLookAt.copy(_stationPos).add(new THREE.Vector3(0, DATA_STATION_DIMENSIONS.centerElevation, 0));

      // Calculate target quaternion looking at center screen
      _lookMat.lookAt(_targetCamPos, _targetLookAt, activeCam.up);
      _targetQuat.setFromRotationMatrix(_lookMat);

      // Lerp Position & Slerp Quaternion
      activeCam.position.lerpVectors(savedCamPosRef.current, _targetCamPos, t);
      activeCam.quaternion.slerpQuaternions(savedCamQuatRef.current, _targetQuat, t);

      // Completion conditions
      if (phase === "in" && dockProgressRef.current >= 1) {
        dockPhaseRef.current = "docked";
        // Play physical pendrive insert slide and tactile click
        dataStationAudio.playInsertClick();
        if (meshGroupRef.current) {
          meshGroupRef.current.pendriveMesh.visible = true;
        }

        setTimeout(() => {
          dataStationAudio.playMountChirp();
          applyStationState("inserted");
          const rStateNow = relayStore.getState();
          if (rStateNow.consoleUnlocked && !rStateNow.diagnosticPassed) {
            relayStore.setActiveStationTab("diagnostic");
            relayStore.setDiagnosticConsoleOpen(true);
          } else {
            telemetryStore.setTerminalOpen(true);
            onOpenTerminal?.();
          }
        }, 150);
      } else if (phase === "out" && dockProgressRef.current <= 0) {
        dockPhaseRef.current = "none";
        // Exact restore without any floating-point drift!
        activeCam.position.copy(savedCamPosRef.current);
        activeCam.quaternion.copy(savedCamQuatRef.current);
        activeCam.rotation.order = "YXZ";
        activeCam.rotation.z = 0;
        (activeCam as THREE.PerspectiveCamera).fov = savedCamFovRef.current;
        activeCam.updateProjectionMatrix();
        onInputLocked?.(false);
      }
    }

    // 3. Subtle CRT Flicker (max 1 Hz, +-3% brightness, disabled under Reduce Motion)
    if (!reducedMotion && meshGroupRef.current) {
      const nowSec = performance.now() * 0.001;
      const flicker = 1.0 + Math.sin(nowSec * 5.2) * 0.02 + (Math.random() - 0.5) * 0.015;
      meshGroupRef.current.setScreenFlicker(flicker);
    }
  });

  return (
    <group
      ref={groupRef}
      position={stationPosition}
      rotation={stationRotation}
    />
  );
}

export default DataStation;
