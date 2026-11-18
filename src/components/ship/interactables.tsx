"use client";
/**
 * interactables.tsx — Ship Interactables, Terminals & Power Lever
 * ===============================================================
 * Provides rich gameplay interactivity inside the ship:
 *   - Emergency Power Lever in Engine Room (pull with [E] to restore power)
 *   - 3 Sci-Fi Log Consoles (Bridge, Crew Quarters, Engine Room)
 *   - Steam Vent Shutoff Valve in Corridor
 *   - Collectible Encrypted Data Pad & Power Cell
 *   - Audio integration with shipAudio
 */
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { shipAudio } from "../../audio/shipAudio";
import { getScreenTexture } from "./materials";
import { telemetryStore } from "../telemetry/telemetryStore";
import { DataStation } from "../../stations/dataStation/DataStation";

export interface LogEntry {
  title: string;
  source: string;
  timestamp: string;
  lines: string[];
}

export const SHIP_LOGS: { [id: string]: LogEntry } = {
  bridge_log: {
    title: "FLIGHT RECORDER // LOG #884",
    source: "Commander V. Vance — Bridge Command",
    timestamp: "CYCLE 4492.1",
    lines: [
      "Gravitational anomaly detected at sector perimeter.",
      "Tachyon distortion exceeded structural hull limits.",
      "Guidance thrusters sheared off during atmospheric entry.",
      "Egress established at Port Hull Breach onto planetary regolith.",
    ],
  },
  crew_log: {
    title: "CREW ROSTER // PERSONAL ENTRY",
    source: "Chief Specialist K. Chen — Crew Deck",
    timestamp: "CYCLE 4492.2",
    lines: [
      "All decks evacuated after the main roof breach opened over Cargo.",
      "Life support collapsed, but the alien atmosphere is borderline breathable.",
      "Left emergency battery reserves in the aft cargo hold mezzanine.",
    ],
  },
  engine_log: {
    title: "REACTOR TELEMETRY // CORE STATUS",
    source: "Auxiliary Reactor Core — Automated",
    timestamp: "CYCLE 4492.3",
    lines: [
      "Magnetic containment field failing.",
      "Pull the emergency power lever to reboot secondary distribution.",
      "Close the corridor coolant valve before thermal runaway occurs.",
    ],
  },
};

interface InteractablesProps {
  powerRestored: boolean;
  onRestorePower: () => void;
  onOpenLog?: (log: LogEntry | null) => void;
  onOpenCrewTerminal?: () => void;
  onInteractionPrompt?: (prompt: string | null) => void;
  reducedMotion?: boolean;
  onInputLocked?: (locked: boolean) => void;
  isSection3Unlocked?: boolean;
  isSection3Passed?: boolean;
  isBeaconVerified?: boolean;
  onOpenSection3?: () => void;
  onOpenTransceiver?: () => void;
  onOpenAntennaCore?: () => void;
}

const _playerDistVec = new THREE.Vector3();

export function ShipInteractables({
  powerRestored,
  onRestorePower,
  onOpenLog,
  onOpenCrewTerminal,
  onInteractionPrompt,
  reducedMotion = false,
  onInputLocked,
  isSection3Unlocked = false,
  isSection3Passed = false,
  isBeaconVerified = false,
  onOpenSection3,
  onOpenTransceiver,
  onOpenAntennaCore,
}: InteractablesProps) {
  const [steamValveClosed, setSteamValveClosed] = useState(false);
  const [dataPadCollected, setDataPadCollected] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const activePromptRef = useRef<string | null>(null);

  // Lever rotation animation
  const leverAngle = useRef(0); // 0 = unpulled, 0.9 = pulled

  // Screen texture for CRT monitors
  const screenTex = useMemo(() => getScreenTexture(), []);

  const screenMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: screenTex,
        toneMapped: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [screenTex]
  );

  const valveMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xcc3322,
        roughness: 0.4,
        metalness: 0.8,
      }),
    []
  );

  const leverMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        roughness: 0.3,
        metalness: 0.9,
      }),
    []
  );

  const dataPadMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        roughness: 0.2,
        metalness: 0.9,
        emissive: new THREE.Color(0x00a0cc),
        emissiveIntensity: 0.6,
      }),
    []
  );

  const terminalChassisMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1c2430,
        roughness: 0.45,
        metalness: 0.85,
      }),
    []
  );

  const deskMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x10161f,
        roughness: 0.65,
        metalness: 0.9,
      }),
    []
  );

  const greenGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        toneMapped: false,
      }),
    []
  );

  const amberGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        toneMapped: false,
      }),
    []
  );

  const cyanGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        toneMapped: false,
      }),
    []
  );

  const pendriveBodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.3,
        metalness: 0.9,
      }),
    []
  );

  const pendriveGoldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.2,
        metalness: 0.95,
      }),
    []
  );

  // Proximity check in useFrame
  useFrame(({ camera }) => {
    const p = camera.position;

    // 1. Power Lever (x: 0, y: 1.5, z: 31)
    _playerDistVec.set(0, 1.5, 31);
    const distLever = p.distanceTo(_playerDistVec);

    // 2. Steam Valve (x: -3.2, y: 1.8, z: -21)
    _playerDistVec.set(-3.2, 1.8, -21);
    const distValve = p.distanceTo(_playerDistVec);

    // 3. Cockpit Dome CORE-B Command Core (x: 0, y: 1.3, z: -44.5)
    _playerDistVec.set(0, 1.3, -44.5);
    const distCoreB = p.distanceTo(_playerDistVec);

    // 4. Cockpit Starboard CORE-C Comms Transceiver (x: 3.5, y: 1.3, z: -43.2)
    _playerDistVec.set(3.5, 1.3, -43.2);
    const distCoreC = p.distanceTo(_playerDistVec);

    // 5. Cargo Bay Antenna Mast Terminal (x: 2.0, y: 1.2, z: 12.8)
    _playerDistVec.set(2.0, 1.2, 12.8);
    const distAntennaTerminal = p.distanceTo(_playerDistVec);

    // 6. Cockpit Port CORE-A Antenna Core (x: -3.8, y: 1.3, z: -42.5)
    _playerDistVec.set(-3.8, 1.3, -42.5);
    const distCoreA = p.distanceTo(_playerDistVec);

    // 7. Data Pad (x: -8, y: 3.6, z: 12 on Mezzanine)
    _playerDistVec.set(-8, 3.6, 12);
    const distPad = p.distanceTo(_playerDistVec);

    let nextPrompt: string | null = null;

    if (distLever < 2.5) {
      nextPrompt = powerRestored
        ? "AUXILIARY POWER ONLINE"
        : "PRESS [E] TO RESTORE SHIP POWER";
    } else if (distValve < 2.2 && !steamValveClosed) {
      nextPrompt = "PRESS [E] TO CLOSE COOLANT VALVE";
    } else if (distCoreB < 2.8) {
      if (isSection3Unlocked) {
        nextPrompt = "PRESS [E] TO ACCESS CORE-B (ANALYZE DEEP-SPACE SIGNALS)";
      } else {
        nextPrompt = "CORE-B AVIONICS // OFFLINE (AWAITING TRANSMISSION RELAY)";
      }
    } else if (distCoreC < 2.8) {
      if (isSection3Unlocked) {
        nextPrompt = "PRESS [E] TO ACCESS COMMS TRANSCEIVER // TRANSMIT BEACON TARGET ID";
      } else {
        nextPrompt = "COMMS TRANSCEIVER // OFFLINE (AWAITING TRANSMISSION RELAY)";
      }
    } else if (distAntennaTerminal < 2.8 || distCoreA < 2.8) {
      if (isBeaconVerified) {
        nextPrompt = "PRESS [E] TO ACCESS ANTENNA TERMINAL // NEURAL TRAINING LAB";
      } else {
        nextPrompt = "ANTENNA COPROCESSOR // STANDBY (TRANSMIT BEACON HANDSHAKE FIRST)";
      }
    } else if (distPad < 2.2 && !dataPadCollected) {
      nextPrompt = "PRESS [E] TO PICK UP ENCRYPTED DATA PAD";
    } else {
      nextPrompt = null;
    }

    if (nextPrompt !== activePromptRef.current) {
      activePromptRef.current = nextPrompt;
      setActivePrompt(nextPrompt);
      onInteractionPrompt?.(nextPrompt);
    }

    // Lever animation
    const targetAngle = powerRestored ? 0.95 : 0;
    leverAngle.current = THREE.MathUtils.lerp(leverAngle.current, targetAngle, 0.1);
  });

  // Stable Keydown listener for interaction [E]
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== "KeyE") return;
      const prompt = activePromptRef.current;
      if (!prompt) return;

      if (prompt.includes("RESTORE SHIP POWER") && !powerRestored) {
        shipAudio.playPowerRestoreSequence();
        onRestorePower();
      } else if (prompt.includes("CLOSE COOLANT VALVE")) {
        setSteamValveClosed(true);
        shipAudio.playConsoleBeep();
      } else if (prompt.includes("ACCESS CORE-B")) {
        if (isSection3Unlocked) {
          shipAudio.playConsoleBeep();
          onOpenSection3?.();
        }
      } else if (prompt.includes("COMMS TRANSCEIVER")) {
        if (isSection3Unlocked) {
          shipAudio.playConsoleBeep();
          onOpenTransceiver?.();
        }
      } else if (prompt.includes("ACCESS ANTENNA") || prompt.includes("ANTENNA TERMINAL")) {
        if (isBeaconVerified) {
          shipAudio.playConsoleBeep();
          onOpenAntennaCore?.();
        }
      } else if (
        prompt.includes("CREW TERMINAL") ||
        prompt.includes("TELEMETRY PENDRIVE") ||
        prompt.includes("DATA STATION") ||
        prompt.includes("INSERT TELEMETRY")
      ) {
        shipAudio.playConsoleBeep();
        telemetryStore.setTerminalOpen(true);
        onOpenCrewTerminal?.();
      } else if (prompt.includes("DATA PAD")) {
        setDataPadCollected(true);
        shipAudio.playConsoleBeep();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    powerRestored,
    onRestorePower,
    onOpenLog,
    onOpenCrewTerminal,
    isSection3Unlocked,
    isSection3Passed,
    isBeaconVerified,
    onOpenSection3,
    onOpenTransceiver,
    onOpenAntennaCore,
  ]);

  return (
    <group name="ship-interactables">
      {/* ── 1. EMERGENCY POWER LEVER IN ENGINE ROOM ── */}
      <group position={[0, 1.4, 31]}>
        {/* Lever Base Console */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.5]} />
          <meshStandardMaterial color={0x2a3038} roughness={0.7} metalness={0.6} />
        </mesh>
        {/* Status Indicator Light */}
        <mesh position={[0, 0.05, 0.26]}>
          <circleGeometry args={[0.08, 16]} />
          <meshBasicMaterial
            color={powerRestored ? 0x00ff88 : 0xff2200}
            toneMapped={false}
          />
        </mesh>
        {/* Animated Lever Arm */}
        <group rotation={[leverAngle.current, 0, 0]}>
          <mesh position={[0, 0.25, 0]} material={leverMat}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color={0xff3300} roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      </group>

      {/* ── 2. STEAM VALVE & PIPE MANIFOLD IN CORRIDOR ── */}
      <group position={[-3.2, 1.8, -21]}>
        {/* Vertical coolant pipe extending from floor to ceiling */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 3.8, 12]} />
          <meshStandardMaterial color={0x40727c} roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Heavy cast iron valve junction body */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.3, 0.35, 0.3]} />
          <meshStandardMaterial color={0x2a323c} roughness={0.6} metalness={0.8} />
        </mesh>
        {/* Valve stem extending forward */}
        <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.18, 8]} />
          <meshStandardMaterial color={0xd49a34} roughness={0.3} metalness={0.9} />
        </mesh>
        {/* Animated red handwheel */}
        <group position={[0, 0, 0.26]} rotation={[0, 0, steamValveClosed ? 1.8 : 0]}>
          <mesh material={valveMat}>
            <torusGeometry args={[0.22, 0.035, 8, 24]} />
          </mesh>
          <mesh material={valveMat}>
            <cylinderGeometry args={[0.025, 0.025, 0.44, 8]} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={valveMat}>
            <cylinderGeometry args={[0.025, 0.025, 0.44, 8]} />
          </mesh>
        </group>
        {/* Steam leak glow when open */}
        {!steamValveClosed && (
          <pointLight color="#88ddff" intensity={0.4} distance={2.5} />
        )}
      </group>

      {/* ── 3. BRIDGE CRT TERMINAL (Replaced by modern Three Cockpit Computers in src/stations/computers) ── */}

      {/* ── 4. 3D DATA STATION (Wrap-around Triple Monitor Console with Arch & Status Bar) ── */}
      <DataStation
        reducedMotion={reducedMotion}
        onPromptChange={onInteractionPrompt}
        onInputLocked={onInputLocked}
        onUploadBatch={() => {
          try {
            shipAudio.playPowerRestoreSequence();
          } catch {
            // Audio manager safe call
          }
        }}
      />

      {/* ── 5. COLLECTIBLE DATA PAD (on Cargo Bay Mezzanine) ── */}
      {!dataPadCollected && (
        <group position={[-8, 3.6, 12]} rotation={[0, 0.4, 0]}>
          <mesh material={dataPadMat}>
            <boxGeometry args={[0.3, 0.02, 0.45]} />
          </mesh>
          <pointLight color="#00ffff" intensity={0.5} distance={2.5} />
        </group>
      )}

      {/* ── 6. 3D FLOATING INTERACTION PROMPT ── */}
      {activePrompt && (
        <group position={[0, 1.5, -40]}>
          {/* Handled primarily via standard HUD overlay or 3D text */}
        </group>
      )}
    </group>
  );
}
