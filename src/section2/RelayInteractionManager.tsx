"use client";
/**
 * src/section2/RelayInteractionManager.tsx — Relay Scanner R3F Logic & Colliders
 * ==============================================================================
 * Mounts in R3F scene:
 * - Detects proximity (<4.0m) and aim cone (dot > 0.7) for all 6 relay nodes
 * - Handles holding [E] or [F] over 0.9s to complete a scan
 * - Triggers procedural audio swells and rising chimes
 * - Registers node box physical colliders into the ship collision system
 */
import React, { useEffect, useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { relayStore } from "./relayStore";
import { SECTION2_NODES, RELAY_SCANNER_CONFIG } from "./section2.config";
import { relayAudio } from "./relayAudio";
import { RelayLine } from "./relayMesh";
import { isImagesValidated } from "./section2Dev";

interface RelayInteractionManagerProps {
  collidersRef?: React.MutableRefObject<any[]>;
}

const _nodePos = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _toNode = new THREE.Vector3();

export function RelayInteractionManager({ collidersRef }: RelayInteractionManagerProps) {
  const { camera } = useThree();
  const scanningTargetRef = useRef<string | null>(null);
  const scanTimerRef = useRef<number>(0);
  const isKeyDownRef = useRef<boolean>(false);

  // Performance: Subscribe strictly to macroscopic state changes.
  // Do NOT re-render on high-frequency scanProgress or activeTarget updates!
  const [lineProps, setLineProps] = useState(() => {
    const s = relayStore.getState();
    return {
      activeScanId: s.scanningNodeId,
      scannedNodeIds: s.scannedNodeIds,
      diagnosticConfig: s.diagnosticConfig,
      diagnosticPassed: s.diagnosticPassed,
    };
  });

  useEffect(() => {
    return relayStore.subscribe(() => {
      const s = relayStore.getState();
      setLineProps((prev) => {
        if (
          prev.activeScanId === s.scanningNodeId &&
          prev.diagnosticPassed === s.diagnosticPassed &&
          prev.diagnosticConfig === s.diagnosticConfig &&
          prev.scannedNodeIds === s.scannedNodeIds
        ) {
          return prev; // Zero React re-renders while scanning ticks!
        }
        return {
          activeScanId: s.scanningNodeId,
          scannedNodeIds: s.scannedNodeIds,
          diagnosticConfig: s.diagnosticConfig,
          diagnosticPassed: s.diagnosticPassed,
        };
      });
    });
  }, []);

  const scannedIds = useMemo(
    () => new Set(lineProps.scannedNodeIds),
    [lineProps.scannedNodeIds]
  );

  // Register Box Colliders (R1, R2, R3, R5, R6)
  useEffect(() => {
    if (!collidersRef) return;
    const nodeColliders = SECTION2_NODES.filter((n) => n.collider).map((n) => ({
      ...n.collider,
      id: `relay-node-${n.id}`,
    }));

    // Append to shared colliders
    collidersRef.current = [...(collidersRef.current || []), ...nodeColliders];

    return () => {
      if (collidersRef.current) {
        collidersRef.current = collidersRef.current.filter(
          (c) => !c.id?.startsWith("relay-node-")
        );
      }
    };
  }, [collidersRef]);

  // Key listeners for [E] and [F]
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isImagesValidated()) return;
      if (e.code === "KeyE" || e.code === "KeyF") {
        isKeyDownRef.current = true;
        const currentTargetId = relayStore.getState().activeTargetNodeId;
        if (currentTargetId && !relayStore.getState().scannedNodeIds.includes(currentTargetId)) {
          const targetNode = SECTION2_NODES.find((n) => n.id === currentTargetId);
          if (targetNode) {
            relayAudio.playScanSuccess();
            relayStore.completeScan(targetNode);
            scanningTargetRef.current = null;
            scanTimerRef.current = 0;
            relayStore.setScanning(null, 0);
          }
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "KeyE" || e.code === "KeyF") {
        isKeyDownRef.current = false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      relayAudio.stopScanCharge();
    };
  }, []);

  useFrame((_, delta) => {
    // If celestial data intake (Images) is not yet validated, walkway relay scanning remains dormant
    if (!isImagesValidated()) {
      if (relayStore.getState().activeTargetNodeId !== null) {
        relayStore.setActiveTarget(null);
      }
      if (scanningTargetRef.current) {
        scanningTargetRef.current = null;
        scanTimerRef.current = 0;
        relayAudio.stopScanCharge();
        relayStore.setScanning(null, 0);
      }
      return;
    }

    _camPos.copy(camera.position);
    camera.getWorldDirection(_camFwd);

    let bestTargetId: string | null = null;
    let closestDist = RELAY_SCANNER_CONFIG.maxDistance;

    // Find closest node in aim cone
    for (let i = 0; i < SECTION2_NODES.length; i++) {
      const node = SECTION2_NODES[i];
      _nodePos.set(node.position[0], node.position[1] + 0.35, node.position[2]);
      const dist = _camPos.distanceTo(_nodePos);

      if (dist <= closestDist) {
        _toNode.copy(_nodePos).sub(_camPos).normalize();
        const dot = _camFwd.dot(_toNode);
        const threshold = dist <= 2.8 ? 0.28 : RELAY_SCANNER_CONFIG.aimDotThreshold;

        if (dot >= threshold) {
          closestDist = dist;
          bestTargetId = node.id;
        }
      }
    }

    relayStore.setActiveTarget(bestTargetId);

    // If key is held while targeting an unscanned node, ensure scanning starts
    if (isKeyDownRef.current && bestTargetId && !scanningTargetRef.current) {
      if (!relayStore.getState().scannedNodeIds.includes(bestTargetId)) {
        scanningTargetRef.current = bestTargetId;
        scanTimerRef.current = 0;
        relayAudio.startScanCharge();
      }
    }

    // Active Scanning Progression
    if (scanningTargetRef.current) {
      const targetId = scanningTargetRef.current;
      const targetNode = SECTION2_NODES.find((n) => n.id === targetId);

      if (!targetNode || relayStore.getState().scannedNodeIds.includes(targetId)) {
        scanningTargetRef.current = null;
        scanTimerRef.current = 0;
        relayAudio.stopScanCharge();
        relayStore.setScanning(null, 0);
      } else {
        scanTimerRef.current += delta;
        const progress = Math.min(
          1.0,
          scanTimerRef.current / RELAY_SCANNER_CONFIG.scanDurationSec
        );

        relayStore.setScanning(targetId, progress);

        if (progress >= 1.0) {
          // Scan Completed!
          relayAudio.stopScanCharge();
          relayAudio.playScanSuccess();
          relayStore.completeScan(targetNode);
          scanningTargetRef.current = null;
          scanTimerRef.current = 0;
          relayStore.setScanning(null, 0);
        }
      }
    }
  });

  return (
    <group name="relay-section2-container">
      <RelayLine
        activeScanId={lineProps.activeScanId}
        scannedIds={scannedIds}
        diagnosticConfig={lineProps.diagnosticConfig}
        diagnosticPassed={lineProps.diagnosticPassed}
      />
    </group>
  );
}
