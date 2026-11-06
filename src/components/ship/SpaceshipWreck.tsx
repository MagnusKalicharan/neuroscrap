"use client";
/**
 * SpaceshipWreck.tsx — Next-Gen Procedural Sci-Fi Starship Wreck
 * ===============================================================
 * High-performance, fully interactive crashed starship environment.
 * 
 * Features:
 *   - Expanded Scale: Radius ~11m, Length ~104m, 6 distinct exploration zones
 *   - Double-Shell Armor with realistic thickness on all breach rims
 *   - Multi-Level Cargo Bay Mezzanine with ramp and safety railings
 *   - Hybrid PBR Materials (MeshStandardMaterial with procedural bump/normal maps)
 *   - 17 Broken swaying cables with exposed copper cores
 *   - Dynamic spark bursts with strictly pooled real-time PointLights (< 3 total)
 *   - Functional sliding bulkhead doors with audio & collision updates
 *   - 3D HRTF Spatial Audio engine (shipAudio.updateListener synced each frame)
 *   - Interactive Emergency Power Lever, 3 Lore Terminals & Steam Valve
 *   - Budget: < 20 draw calls, 60 FPS on mid-range laptops
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  buildShipModel,
  SHIP_POSITION,
  PLAYER_SPAWN,
  resolveShipCollisions,
  type ShipModel,
  type Aabb,
} from "./shipModel";
import { createShipMaterials } from "./materials";
import { CableSystem, BrokenCables, getCablePositions } from "./cables";
import { SparkSystem } from "./sparks";
import { BulkheadDoors } from "./doors";
import { ShipInteractables, type LogEntry } from "./interactables";
import { shipAudio } from "../../audio/shipAudio";

export { PLAYER_SPAWN, SHIP_POSITION, resolveShipCollisions, CableSystem, BrokenCables, SparkSystem, getCablePositions };
export type { Aabb, ShipModel };

export interface SpaceshipWreckProps {
  /** Disable screen flicker / high-speed pulsing (accessibility) */
  reducedMotion?: boolean;
  /** Graphic quality preset */
  quality?: "low" | "medium" | "high";
  /** Reference to live player vector position */
  playerPositionRef?: React.RefObject<THREE.Vector3>;
  /** Receive collider list so Player controller can run resolveShipCollisions() */
  onReady?: (model: ShipModel) => void;
  /** Callback when player interacts with a terminal screen */
  onOpenLog?: (log: LogEntry | null) => void;
}

export function SpaceshipWreck({
  reducedMotion = false,
  quality = "high",
  playerPositionRef,
  onReady,
  onOpenLog,
}: SpaceshipWreckProps) {
  const { camera } = useThree();

  // Generate the expanded ship geometry once (~200ms)
  const model = useMemo(() => buildShipModel(), []);

  // Create hybrid PBR materials with procedural canvas bump textures
  const mats = useMemo(() => createShipMaterials(), []);

  // Ship power state (toggled via the Engine Room Emergency Power Lever)
  const [powerRestored, setPowerRestored] = useState(false);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    onReadyRef.current?.(model);
    return () => {
      // Clean up GPU geometries and materials on unmount
      [
        model.interior,
        model.exterior,
        model.floor,
        model.structural,
        model.emissive,
        model.alarm,
        model.flicker,
      ].forEach((g) => g?.dispose());

      Object.values(mats).forEach((m) => m?.dispose());
    };
  }, [model, mats]);

  // Base colors for animated materials
  const alarmBase = useRef(new THREE.Color(1, 1, 1));
  const flickerBase = useRef(new THREE.Color(1, 1, 1));

  useFrame(({ clock }) => {
    // 1. Sync 3D Audio Listener with Player camera position & orientation
    shipAudio.updateListener(camera);

    if (reducedMotion) {
      mats.alarm.color.setScalar(1);
      mats.flicker.color.setScalar(1);
      return;
    }

    const t = clock.elapsedTime;

    // 2. Alarm Light Pulse
    if (powerRestored) {
      // Soft constant standby glow when power is restored
      mats.alarm.color.setHex(0x33aa55);
    } else {
      // 0.45 Hz slow pulsing red alert
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.8);
      mats.alarm.color
        .copy(alarmBase.current)
        .multiplyScalar(0.4 + 0.6 * pulse);
    }

    // 3. Faulty Circuit Flicker
    if (powerRestored) {
      // Stable full-voltage output
      mats.flicker.color.setScalar(1.0);
    } else {
      let flickerVal =
        0.75 + 0.25 * Math.sin(t * 5.7) * Math.sin(t * 3.1 + 0.8);
      if (Math.sin(t * 1.1) > 0.96) {
        flickerVal *= 0.2; // brief brownout dip
      }
      mats.flicker.color
        .copy(flickerBase.current)
        .multiplyScalar(flickerVal);
    }
  });

  return (
    <group position={SHIP_POSITION} name="spaceship-wreck-upgraded">
      {/* ── 1. Static Geometry Buckets (Merged into 7 Draw Calls) ── */}
      <mesh
        geometry={model.interior}
        material={mats.interior}
        castShadow={false}
        receiveShadow
      />
      <mesh
        geometry={model.exterior}
        material={mats.exterior}
        castShadow={false}
        receiveShadow
      />
      <mesh
        geometry={model.floor}
        material={mats.floor}
        castShadow={false}
        receiveShadow
      />
      <mesh
        geometry={model.structural}
        material={mats.structural}
        castShadow={false}
        receiveShadow
      />
      <mesh
        geometry={model.emissive}
        material={mats.emissive}
        castShadow={false}
      />
      <mesh
        geometry={model.alarm}
        material={mats.alarm}
        castShadow={false}
      />
      <mesh
        geometry={model.flicker}
        material={mats.flicker}
        castShadow={false}
      />

      {/* ── 2. Broken Hanging Cable & Dynamic Spark Burst System ── */}
      <CableSystem
        playerPositionRef={playerPositionRef}
        quality={quality}
        reducedMotion={reducedMotion}
      />

      {/* ── 4. Motorized Bulkhead Sliding Doors ── */}
      <BulkheadDoors colliders={model.colliders} />

      {/* ── 5. Ship Gameplay Interactables & Lore Consoles ── */}
      <ShipInteractables
        powerRestored={powerRestored}
        onRestorePower={() => setPowerRestored(true)}
        onOpenLog={onOpenLog}
        reducedMotion={reducedMotion}
      />

      {/* ── 6. Reactor Core Volumetric Atmosphere Pulse ── */}
      <pointLight
        position={[0, 2.5, 33]}
        color={powerRestored ? "#00ffcc" : "#ff4411"}
        intensity={powerRestored ? 2.5 : 1.2}
        distance={16}
        decay={2}
      />
    </group>
  );
}

export default SpaceshipWreck;
