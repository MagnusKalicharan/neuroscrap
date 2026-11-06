"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CrashCinematicProps, CRASH_DURATION_MS, CRASH_CUTS } from "./types";
import { evaluateCameraPose, mulberry32 } from "./math";
import { crashAudio } from "./crashAudio";

// ============================================================
// DEBRIS CONSTANTS & BALLISTICS
// ============================================================
interface DebrisSpec {
  spawnMs: number;
  startPos: [number, number, number];
  vel: [number, number, number];
  rotAxis: [number, number, number];
  rotSpeed: number;
  size: [number, number, number];
  lifeMs: number;
}

function generateDebrisSpecs(count: number): DebrisSpec[] {
  const rng = mulberry32(1337);
  const specs: DebrisSpec[] = [];

  for (let i = 0; i < count; i++) {
    const isSecondHit = i >= 36;
    const spawnMs = isSecondHit ? CRASH_CUTS.second : CRASH_CUTS.impact;

    const sx = (rng() - 0.5) * 3.6;
    const sy = 3.2 + rng() * 1.2;
    const sz = isSecondHit ? -13.0 + rng() * 3.0 : -15.0 + rng() * 4.0;

    const vx = (rng() - 0.5) * 2.8;
    const vy = -1.2 - rng() * 2.4;
    const vz = -3.5 - rng() * 5.0; // flies toward and past camera

    const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    const rotSpeed = 3.0 + rng() * 6.0;

    const scale = 0.25 + rng() * 0.9;
    const szX = scale * (0.8 + rng() * 0.4);
    const szY = scale * (0.3 + rng() * 0.4);
    const szZ = scale * (0.8 + rng() * 0.6);

    specs.push({
      spawnMs,
      startPos: [sx, sy, sz],
      vel: [vx, vy, vz],
      rotAxis: [axis.x, axis.y, axis.z],
      rotSpeed,
      size: [szX, szY, szZ],
      lifeMs: 1400,
    });
  }

  return specs;
}

// ============================================================
// MAIN 3D IN-ENGINE CRASH COMPONENT
// ============================================================
export default function CrashCinematic({
  progress,
  reduceMotion = false,
  quality = "high",
  onDone,
}: CrashCinematicProps) {
  const { camera, scene, size } = useThree();

  const maxDebrisCount = quality === "low" ? 24 : 60;
  const debrisSpecs = useMemo(() => generateDebrisSpecs(maxDebrisCount), [maxDebrisCount]);

  // Mesh & Particle references
  const debrisMeshRef = useRef<THREE.InstancedMesh>(null);
  const smokeMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const cableGroupRef = useRef<THREE.Group>(null);

  // Saved original states for guaranteed clean restoration
  const savedCameraRef = useRef<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    fov: number;
  } | null>(null);

  const savedMaterialsRef = useRef<Map<THREE.Material, THREE.Color>>(new Map());
  const hasDoneFiredRef = useRef(false);
  const lastTimeMsRef = useRef<number>(-1);

  // Scratch objects for zero per-frame allocation
  const _matrix = useMemo(() => new THREE.Matrix4(), []);
  const _dummy = useMemo(() => new THREE.Object3D(), []);
  const _color = useMemo(() => new THREE.Color(), []);

  // ─────────────────────────────────────────────────────────────
  // 1. SAVE CAMERA & MATERIALS ON MOUNT, RESTORE ON UNMOUNT
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const perspCamera = camera as THREE.PerspectiveCamera;

    // Save camera
    if (!savedCameraRef.current) {
      savedCameraRef.current = {
        position: perspCamera.position.clone(),
        rotation: perspCamera.rotation.clone(),
        fov: perspCamera.fov,
      };
    }

    // Save all scene material colors for smooth restoration
    const savedMap = savedMaterialsRef.current;
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material;
        if (mat && (mat as any).color && !savedMap.has(mat as THREE.Material)) {
          savedMap.set(mat as THREE.Material, (mat as any).color.clone());
        }
      }
    });

    // Start synthesized crash audio
    crashAudio.start();

    return () => {
      // 1. Restore camera pose & FOV
      if (savedCameraRef.current) {
        const s = savedCameraRef.current;
        perspCamera.position.copy(s.position);
        perspCamera.rotation.copy(s.rotation);
        perspCamera.fov = s.fov;
        perspCamera.updateProjectionMatrix();
        savedCameraRef.current = null;
      }
      // Guaranteed camera level stabilization: zero roll/tilt after cinematic
      perspCamera.rotation.z = 0;
      perspCamera.rotation.order = "YXZ";

      // 2. Restore all material colors
      savedMap.forEach((origColor, mat) => {
        if ((mat as any).color) {
          (mat as any).color.copy(origColor);
        }
      });
      savedMap.clear();

      // 3. Stop audio voices within 300ms
      crashAudio.stopAll(300);
    };
  }, [camera, scene]);

  // ─────────────────────────────────────────────────────────────
  // 2. SPARK PARTICLES BUFFER SETUP
  // ─────────────────────────────────────────────────────────────
  const sparkCount = quality === "low" ? 60 : 120;
  const sparkData = useMemo(() => {
    const positions = new Float32Array(sparkCount * 3);
    const colors = new Float32Array(sparkCount * 3);
    const rng = mulberry32(404);

    for (let i = 0; i < sparkCount; i++) {
      positions[i * 3] = (rng() - 0.5) * 4.0;
      positions[i * 3 + 1] = 2.5 + rng() * 1.5;
      positions[i * 3 + 2] = -16.0 + rng() * 4.0;

      // Golden white to bright orange
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.8 + rng() * 0.2;
      colors[i * 3 + 2] = 0.3;
    }

    return { positions, colors };
  }, [sparkCount]);

  // ─────────────────────────────────────────────────────────────
  // 3. MAIN ANIMATION LOOP (PURE EVALUATION OF PROGRESS p)
  // ─────────────────────────────────────────────────────────────
  useFrame(() => {
    const perspCamera = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const evaluated = evaluateCameraPose(progress, reduceMotion, aspect);

    // Camera pose
    perspCamera.position.copy(evaluated.position);
    perspCamera.rotation.copy(evaluated.rotation);
    if (Math.abs(perspCamera.fov - evaluated.fov) > 0.1) {
      perspCamera.fov = evaluated.fov;
      perspCamera.updateProjectionMatrix();
    }

    const timeMs = progress * CRASH_DURATION_MS;

    // Sync procedural audio cues
    if (Math.abs(timeMs - lastTimeMsRef.current) > 10) {
      lastTimeMsRef.current = timeMs;
      crashAudio.updateTime(timeMs);
    }

    // ───────────────────────────────────────────────────────────
    // LIGHTING / MATERIAL TINT & BRIGHTNESS MULTIPLIERS
    // ───────────────────────────────────────────────────────────
    let brightness = 1.0;
    _color.setRGB(1.0, 1.0, 1.0); // normal white multiplier

    if (timeMs < CRASH_CUTS.warning) {
      // 0 - 1400ms: Normal interior lighting
      brightness = 1.0;
      _color.setRGB(1.0, 1.0, 1.0);
    } else if (timeMs < CRASH_CUTS.impact) {
      // 1400 - 2000ms: Smooth dimming 1.0 -> 0.6 (over 300ms, NO strobing)
      const dimP = Math.min(1, (timeMs - CRASH_CUTS.warning) / 300);
      brightness = 1.0 - dimP * 0.4;
      _color.setRGB(brightness, brightness * 0.95, brightness * 0.9);
    } else if (timeMs < CRASH_CUTS.second) {
      // 2000 - 3700ms: Cut to emergency: 0.12 brightness + strong red tint
      brightness = 0.12;
      _color.setRGB(0.7, 0.1, 0.1);
    } else if (timeMs < CRASH_CUTS.aftermath) {
      // 3700 - 4400ms: Deeper red scrape
      brightness = 0.09;
      _color.setRGB(0.55, 0.06, 0.06);
    } else if (timeMs < 5800) {
      // 4400 - 5800ms: Settle at dim emergency red tint
      brightness = 0.14;
      _color.setRGB(0.65, 0.1, 0.1);
    } else {
      // 5800 - 6000ms: Fade down to black
      const offP = (timeMs - 5800) / 200;
      const b = Math.max(0.001, (1 - offP) * 0.14);
      _color.setRGB(b * 4.5, b * 0.7, b * 0.7);
    }

    // Apply color multiplier to all ship materials
    savedMaterialsRef.current.forEach((origColor, mat) => {
      if ((mat as any).color) {
        (mat as any).color.r = origColor.r * _color.r;
        (mat as any).color.g = origColor.g * _color.g;
        (mat as any).color.b = origColor.b * _color.b;
      }
    });

    // ───────────────────────────────────────────────────────────
    // INSTANCED DEBRIS BALLISTICS (PURE CLOSED-FORM)
    // ───────────────────────────────────────────────────────────
    if (debrisMeshRef.current && !reduceMotion) {
      const mesh = debrisMeshRef.current;

      for (let i = 0; i < debrisSpecs.length; i++) {
        const spec = debrisSpecs[i];
        const ageMs = timeMs - spec.spawnMs;

        if (ageMs < 0 || ageMs > spec.lifeMs) {
          // Inactive / hidden
          _dummy.position.set(0, -999, 0);
          _dummy.scale.set(0, 0, 0);
        } else {
          // Closed-form ballistics: pos = start + v*t + 0.5*g*t^2
          const tSec = ageMs / 1000;
          const g = -9.8; // gravity

          const px = spec.startPos[0] + spec.vel[0] * tSec;
          const py = spec.startPos[1] + spec.vel[1] * tSec + 0.5 * g * tSec * tSec;
          const pz = spec.startPos[2] + spec.vel[2] * tSec;

          _dummy.position.set(px, py, pz);
          _dummy.rotation.x = spec.rotAxis[0] * spec.rotSpeed * tSec;
          _dummy.rotation.y = spec.rotAxis[1] * spec.rotSpeed * tSec;
          _dummy.rotation.z = spec.rotAxis[2] * spec.rotSpeed * tSec;
          _dummy.scale.set(spec.size[0], spec.size[1], spec.size[2]);
        }

        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // ───────────────────────────────────────────────────────────
    // HERO CABLES & SPARKS (DYNAMIC SWAY & IMPACT WHIP)
    // ───────────────────────────────────────────────────────────
    if (cableGroupRef.current) {
      const cables = cableGroupRef.current.children;

      // Cable 1 (left) sways gently
      if (cables[0]) {
        const sway = Math.sin(timeMs * 0.005) * 0.08;
        cables[0].rotation.z = sway;
      }

      // Cable 2 (right) snaps at impact 2000ms and whips vigorously!
      if (cables[1]) {
        if (timeMs < CRASH_CUTS.impact) {
          cables[1].rotation.z = Math.cos(timeMs * 0.004) * 0.06;
          cables[1].scale.set(1, 1, 1);
        } else {
          const whipDt = (timeMs - CRASH_CUTS.impact) / 1000;
          const whip = Math.sin(whipDt * 18.0) * Math.exp(-whipDt * 2.5) * 0.45;
          cables[1].rotation.z = whip;
          cables[1].rotation.x = Math.cos(whipDt * 12.0) * 0.25;
        }
      }

      // Cable 3 (center)
      if (cables[2]) {
        cables[2].rotation.x = Math.sin(timeMs * 0.006) * 0.07;
      }
    }

    // ───────────────────────────────────────────────────────────
    // COMPLETION CALLBACK AT p >= 1.0
    // ───────────────────────────────────────────────────────────
    if (progress >= 1.0 && !hasDoneFiredRef.current) {
      hasDoneFiredRef.current = true;
      onDone?.();
    } else if (progress < 1.0) {
      hasDoneFiredRef.current = false;
    }
  });

  return (
    <group>
      {/* ── 1. INSTANCED DEBRIS MESH (60 instances max, gunmetal metal) ── */}
      {!reduceMotion && (
        <instancedMesh
          ref={debrisMeshRef}
          args={[undefined, undefined, maxDebrisCount]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#2d3748" />
        </instancedMesh>
      )}

      {/* ── 2. INSTANCED SMOKE SPRITES (24 particles) ── */}
      {!reduceMotion && quality !== "low" && (
        <instancedMesh
          ref={smokeMeshRef}
          args={[undefined, undefined, 24]}
          frustumCulled={false}
        >
          <planeGeometry args={[1.8, 1.8]} />
          <meshBasicMaterial
            color="#4a3f35"
            transparent
            opacity={progress > 0.33 ? 0.22 : 0.0}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* ── 3. HERO CABLES (3 corridor conduits) ── */}
      <group ref={cableGroupRef}>
        {/* Cable 1: Left */}
        <mesh position={[-1.3, 3.4, -15.5]}>
          <cylinderGeometry args={[0.025, 0.025, 1.6, 8]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
        {/* Cable 2: Right (Snaps and whips at impact) */}
        <mesh position={[1.2, 3.3, -15.0]}>
          <cylinderGeometry args={[0.028, 0.028, 1.8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        {/* Cable 3: Center */}
        <mesh position={[0.2, 3.5, -14.5]}>
          <cylinderGeometry args={[0.022, 0.022, 1.4, 8]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* ── 4. PROCEDURAL SPARK BURSTS (Points, Additive) ── */}
      {!reduceMotion && (
        <points ref={sparksRef} visible={progress > 0.33 && progress < 0.75}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[sparkData.positions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[sparkData.colors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.07}
            vertexColors
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </points>
      )}
    </group>
  );
}
