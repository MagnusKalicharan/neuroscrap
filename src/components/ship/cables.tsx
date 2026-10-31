"use client";
/**
 * cables.tsx — Broken Hanging Sci-Fi Power Cables with Reactive Spring Physics
 * ============================================================================
 * Restores the authentic CatmullRom curved cable design from layout.ts, enhanced
 * with smooth momentum spring dynamics, player proximity wake, and synchronized
 * tip tracking for sparks and 3D spatial audio.
 */
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CABLES, CableDef } from "./layout";
import { SparkSystem, onSparkBurst, offSparkBurst, triggerManualSpark, type SparkEvent } from "./sparks";

export { onSparkBurst, offSparkBurst, triggerManualSpark, type SparkEvent };

export function getCablePositions(): THREE.Vector3Tuple[] {
  return CABLES.map((c) => [c.endX, c.endY, c.endZ]);
}

export interface CableSystemProps {
  playerPositionRef?: React.RefObject<THREE.Vector3>;
  quality?: "low" | "medium" | "high";
  reducedMotion?: boolean;
  paused?: boolean;
  onRegisterInteractable?: (interactable: {
    id: string;
    name: string;
    type: string;
    description: string;
    position: [number, number, number];
  }) => void;
}

// Scratch vector objects for 0 allocations in useFrame
const _vPlayerPos = new THREE.Vector3();
const _vTipWorld = new THREE.Vector3();
const _vLocalEnd = new THREE.Vector3();
const _rotEuler = new THREE.Euler(0, 0, 0, "YXZ");
const _rotMatrix = new THREE.Matrix4();
const _prevPlayerPos = new THREE.Vector3();

export function BrokenCables({
  playerPositionRef,
  reducedMotion = false,
  paused = false,
  onUpdateTips,
}: {
  playerPositionRef?: React.RefObject<THREE.Vector3>;
  quality?: "low" | "medium" | "high";
  reducedMotion?: boolean;
  paused?: boolean;
  onUpdateTips?: (tips: { [cableId: string]: THREE.Vector3 }) => void;
}) {
  const { camera } = useThree();

  // Pre-generate authentic CatmullRom curved tube geometries for each cable
  const cableGeos = useMemo(() => {
    return CABLES.map((def: CableDef) => {
      const top = new THREE.Vector3(def.topX, def.topY, def.topZ);
      // Mid sag point (gravity droop + subtle natural curvature)
      const midX = (def.topX + def.endX) * 0.5 + Math.sin(def.topZ) * 0.3;
      const midY = (def.topY + def.endY) * 0.5 - 0.42; // natural gravity droop
      const midZ = (def.topZ + def.endZ) * 0.5 + Math.cos(def.topX) * 0.3;
      const mid = new THREE.Vector3(midX, midY, midZ);
      const end = new THREE.Vector3(def.endX, def.endY, def.endZ);

      const curve = new THREE.CatmullRomCurve3([top, mid, end]);
      const mainTube = new THREE.TubeGeometry(curve, 16, 0.048, 6, false);

      // Dual exposed copper core strands at the severed tip
      const copperCurve1 = new THREE.CatmullRomCurve3([
        end,
        new THREE.Vector3(end.x + 0.05, end.y - 0.12, end.z + 0.02),
        new THREE.Vector3(end.x + 0.02, end.y - 0.22, end.z - 0.04),
      ]);
      const copperTube1 = new THREE.TubeGeometry(copperCurve1, 6, 0.015, 4, false);

      const copperCurve2 = new THREE.CatmullRomCurve3([
        end,
        new THREE.Vector3(end.x - 0.04, end.y - 0.10, end.z + 0.03),
        new THREE.Vector3(end.x - 0.05, end.y - 0.19, end.z + 0.01),
      ]);
      const copperTube2 = new THREE.TubeGeometry(copperCurve2, 6, 0.012, 4, false);

      return {
        def,
        mainTube,
        copperTube1,
        copperTube2,
      };
    });
  }, []);

  // Shared dark industrial rubber & metallic copper materials
  const cableMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x161a20,
        roughness: 0.85,
        metalness: 0.2,
      }),
    []
  );

  const copperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xdf7a3e,
        roughness: 0.3,
        metalness: 0.9,
      }),
    []
  );

  // Pre-generate industrial ceiling mounting hardware & conduit collars (Merged into 1 draw call)
  const mountingHardwareGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];

    CABLES.forEach((c) => {
      // 1. Industrial Steel Terminal Box (Weathered enclosure bolted to ceiling/rib)
      const box = new THREE.BoxGeometry(0.38, 0.22, 0.32);
      box.translate(c.topX, c.topY + 0.11, c.topZ);
      parts.push(box);

      // 2. Mounting Flange Bracket (bolted against the ceiling rib or fixture housing)
      const flange = new THREE.BoxGeometry(0.48, 0.05, 0.42);
      flange.translate(c.topX, c.topY + 0.22, c.topZ);
      parts.push(flange);

      // 3. Overhead Conduit Feed Pipe (running up into the ceiling rib/wall)
      const pipe = new THREE.CylinderGeometry(0.065, 0.065, 0.4, 8);
      pipe.translate(c.topX, c.topY + 0.35, c.topZ);
      parts.push(pipe);

      // 4. Rubber Compression Gland Collar (from which the flexible cable emerges)
      const gland = new THREE.CylinderGeometry(0.07, 0.052, 0.12, 8);
      gland.translate(c.topX, c.topY - 0.02, c.topZ);
      parts.push(gland);
    });

    const merged = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }, []);

  const hardwareMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x2e3845,
        roughness: 0.65,
        metalness: 0.8,
      }),
    []
  );

  // Group references for rotation pivots
  const groupRefs = useRef<(THREE.Group | null)[]>([]);

  // Smooth momentum spring physics states
  const springDisps = useRef<{ x: number; z: number }[]>([]);
  const springVels = useRef<{ x: number; z: number }[]>([]);
  if (springDisps.current.length !== CABLES.length) {
    springDisps.current = CABLES.map(() => ({ x: 0, z: 0 }));
    springVels.current = CABLES.map(() => ({ x: 0, z: 0 }));
  }

  // Live tip positions map passed to SparkSystem for pixel-perfect spark sync
  const tipPositionsRef = useRef<{ [cableId: string]: THREE.Vector3 }>({});
  if (Object.keys(tipPositionsRef.current).length === 0) {
    CABLES.forEach((c) => {
      tipPositionsRef.current[c.id] = new THREE.Vector3(c.endX, c.endY, c.endZ);
    });
  }

  // Animation frame loop
  useFrame(({ clock }, delta) => {
    if (paused) return;

    const dt = Math.min(delta, 0.06);
    const t = clock.elapsedTime;
    const pPos = playerPositionRef?.current || camera.position;

    // Track player movement speed for dynamic push force
    const playerSpeed = _prevPlayerPos.distanceTo(pPos) / Math.max(dt, 0.001);
    _prevPlayerPos.copy(pPos);

    for (let i = 0; i < CABLES.length; i++) {
      const g = groupRefs.current[i];
      if (!g) continue;
      const def = CABLES[i];

      // 1. Natural compound sinusoidal idle sway (wind from the open roof breach)
      const swayFreq = 1.15 + (i % 5) * 0.18;
      const idleZ = reducedMotion
        ? 0
        : Math.sin(t * swayFreq + i * 1.3) * 0.038 + Math.sin(t * 1.6 * swayFreq + i) * 0.012;
      const idleX = reducedMotion
        ? 0
        : Math.cos(t * 0.85 * swayFreq + i * 1.7) * 0.035 + Math.cos(t * 1.35 + i) * 0.01;

      // 2. Compute current world tip position taking current rotation into account
      _vLocalEnd.set(def.endX - def.topX, def.endY - def.topY, def.endZ - def.topZ);
      _rotEuler.set(g.rotation.x, 0, g.rotation.z);
      _rotMatrix.makeRotationFromEuler(_rotEuler);
      _vTipWorld.copy(_vLocalEnd).applyMatrix4(_rotMatrix).add(g.position);

      // Update exported tip position
      tipPositionsRef.current[def.id].copy(_vTipWorld);

      // 3. Player Proximity Wake & Momentum Spring Push
      if (!reducedMotion) {
        const dx = _vTipWorld.x - pPos.x;
        const dz = _vTipWorld.z - pPos.z;
        const distXZ = Math.hypot(dx, dz);

        // Within 1.8m and player height spans the cable
        if (distXZ < 1.8 && pPos.y >= def.endY - 0.6 && pPos.y <= def.topY + 0.6) {
          const pushForce = (1.8 - distXZ) * (4.0 + Math.min(playerSpeed * 0.5, 6.0));
          const pushDirX = dx / Math.max(distXZ, 0.01);
          const pushDirZ = dz / Math.max(distXZ, 0.01);

          // Rotate group away from player push direction
          springVels.current[i].z += pushDirX * pushForce * dt;
          springVels.current[i].x += -pushDirZ * pushForce * dt;
        }

        // Spring physics: F = -k*x - d*v
        const springK = 14.0;
        const springDamping = 3.2;
        springVels.current[i].x += (-springK * springDisps.current[i].x - springDamping * springVels.current[i].x) * dt;
        springVels.current[i].z += (-springK * springDisps.current[i].z - springDamping * springVels.current[i].z) * dt;

        springDisps.current[i].x += springVels.current[i].x * dt;
        springDisps.current[i].z += springVels.current[i].z * dt;

        // Clamp to realistic maximum swing angles (radians)
        springDisps.current[i].x = THREE.MathUtils.clamp(springDisps.current[i].x, -0.32, 0.32);
        springDisps.current[i].z = THREE.MathUtils.clamp(springDisps.current[i].z, -0.32, 0.32);
      }

      // 4. Apply combined rotation to the parent pivot group
      g.rotation.z = idleZ + springDisps.current[i].z;
      g.rotation.x = idleX + springDisps.current[i].x;
    }

    onUpdateTips?.(tipPositionsRef.current);
  });

  return (
    <group name="broken-cables">
      {/* ── 1. Stationary Ceiling Mounting Hardware (Terminal Boxes & Conduit Pipes - 1 Draw Call) ── */}
      <mesh geometry={mountingHardwareGeo} material={hardwareMat} castShadow={false} />

      {/* ── 2. Dynamic Swaying Cables & Exposed Copper Cores ── */}
      {cableGeos.map((item, idx) => (
        <group
          key={item.def.id}
          ref={(el) => {
            groupRefs.current[idx] = el;
          }}
          position={[item.def.topX, item.def.topY, item.def.topZ]}
        >
          {/* Offset children so rotation pivots realistically at ceiling anchor */}
          <group position={[-item.def.topX, -item.def.topY, -item.def.topZ]}>
            <mesh geometry={item.mainTube} material={cableMat} castShadow={false} />
            <mesh geometry={item.copperTube1} material={copperMat} castShadow={false} />
            <mesh geometry={item.copperTube2} material={copperMat} castShadow={false} />
          </group>
        </group>
      ))}
    </group>
  );
}

/**
 * Master CableSystem component combining Cables, Sparks, Audio and Debugging
 */
export function CableSystem({
  playerPositionRef,
  quality = "high",
  reducedMotion = false,
  paused = false,
  onRegisterInteractable,
}: CableSystemProps) {
  const [cableTips, setCableTips] = useState<{ [cableId: string]: THREE.Vector3 }>({});
  const [showDebugMarkers, setShowDebugMarkers] = useState(false);

  // Register cables as tactical interactables
  useEffect(() => {
    if (!onRegisterInteractable) return;
    CABLES.filter((c) => c.sparks).forEach((c) => {
      onRegisterInteractable({
        id: c.id,
        name: "Damaged Power Conduit",
        type: "conduit",
        description: "480V starship feedline severed in breach. Intermittently arcing discharge.",
        position: [c.endX, c.endY, c.endZ],
      });
    });
  }, [quality, onRegisterInteractable]);

  // Tactical debug keybindings: [K] Trigger spark burst, [J] Toggle markers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "k" || e.key === "K") {
        triggerManualSpark();
      }
      if (e.key === "j" || e.key === "J") {
        setShowDebugMarkers((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <group name="spaceship-cable-and-spark-system">
      {/* ── Authentic Broken Cables with Enhanced Momentum Sway ── */}
      <BrokenCables
        playerPositionRef={playerPositionRef}
        quality={quality}
        reducedMotion={reducedMotion}
        paused={paused}
        onUpdateTips={setCableTips}
      />

      {/* ── Dynamic Sparks & Pooled Real-time Lights ── */}
      <SparkSystem
        playerPositionRef={playerPositionRef}
        quality={quality}
        reducedMotion={reducedMotion}
        paused={paused}
        cableTips={cableTips}
      />

      {/* ── Debug Anchor & Tip Gizmo Markers ([J] Toggle) ── */}
      {showDebugMarkers && (
        <group name="cable-debug-markers">
          {CABLES.map((c) => {
            const tip = cableTips[c.id] || new THREE.Vector3(c.endX, c.endY, c.endZ);
            return (
              <group key={`debug_${c.id}`}>
                {/* Green wireframe sphere at ceiling anchor */}
                <mesh position={[c.topX, c.topY, c.topZ]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshBasicMaterial color="#00ff66" wireframe />
                </mesh>
                {/* Amber/Red wireframe sphere at swaying tip */}
                <mesh position={[tip.x, tip.y, tip.z]}>
                  <sphereGeometry args={[0.09, 8, 8]} />
                  <meshBasicMaterial color={c.sparks ? "#ffaa00" : "#ff3333"} wireframe />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}

export default CableSystem;
