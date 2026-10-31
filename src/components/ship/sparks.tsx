"use client";
/**
 * sparks.tsx — Dynamic Spark Bursts & Pooled Real-time Lights
 * ==========================================================
 * Simulates electric arcing from damaged cables using the original bright,
 * energetic particle design, enhanced with velocity-oriented streaking,
 * dynamic tip tracking, photosensitivity limiter, and 3D spatial audio.
 */
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CABLES, CableDef, FLOOR_Y } from "./layout";
import { shipAudio } from "../../audio/shipAudio";

export interface SparkEvent {
  cableId: string;
  position: [number, number, number];
  intensity: number;
  timestamp: number;
}

export type SparkListener = (event: SparkEvent) => void;

// Module-level event subscribers
const sparkListeners = new Set<SparkListener>();

export function onSparkBurst(callback: SparkListener): () => void {
  sparkListeners.add(callback);
  return () => {
    sparkListeners.delete(callback);
  };
}

export function offSparkBurst(callback: SparkListener): void {
  sparkListeners.delete(callback);
}

// Global hook for manual trigger ([K] key)
let manualTriggerFn: ((cableId?: string) => void) | null = null;
export function triggerManualSpark(cableId?: string) {
  manualTriggerFn?.(cableId);
}

export interface SparksProps {
  playerPositionRef?: React.RefObject<THREE.Vector3>;
  quality?: "low" | "medium" | "high";
  reducedMotion?: boolean;
  paused?: boolean;
  cableTips?: { [cableId: string]: THREE.Vector3 };
}

const MAX_SPARKS = 240;

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

// Scratch objects for InstancedMesh matrix updates (0 allocations per frame)
const _sparkMatrix = new THREE.Matrix4();
const _sparkPos = new THREE.Vector3();
const _sparkScale = new THREE.Vector3();
const _sparkQuat = new THREE.Quaternion();
const _sparkDir = new THREE.Vector3();
const _forward = new THREE.Vector3(0, 0, 1);
const _tipScratch = new THREE.Vector3();

export function SparkSystem({
  playerPositionRef,
  reducedMotion = false,
  paused = false,
  cableTips,
}: SparksProps) {
  const { camera } = useThree();

  // Active sparking cables from layout.ts
  const faultyCables = useMemo(() => CABLES.filter((c) => c.sparks), []);

  // Pre-allocated particle pool
  const particles = useRef<SparkParticle[]>([]);
  if (particles.current.length === 0) {
    for (let i = 0; i < MAX_SPARKS; i++) {
      particles.current.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        scale: 0.04,
      });
    }
  }

  // Pooled dynamic point lights (electric blue & warm amber)
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const light1Expiry = useRef(0);
  const light2Expiry = useRef(0);

  // Photosensitivity limiter (max 3 light flashes per second globally)
  const flashTimestamps = useRef<number[]>([]);

  // Timers for each faulty cable to trigger bursts (Lower frequency: sporadic, cinematic)
  const cableTimers = useRef<number[]>([]);
  if (cableTimers.current.length !== faultyCables.length) {
    cableTimers.current = faultyCables.map((_, i) => 8.0 + i * 4.0 + Math.random() * 10.0);
  }

  // Global cooldown between bursts so bursts don't fire simultaneously
  const lastGlobalBurstTime = useRef(0);

  // Double burst queue for occasional rapid twin crackles
  const doubleBurstQueue = useRef<{ cable: CableDef; timer: number }[]>([]);

  const instMeshRef = useRef<THREE.InstancedMesh>(null);

  // Spark particle geometry & emissive material from original design
  const sparkGeo = useMemo(() => new THREE.BoxGeometry(0.04, 0.04, 0.12), []);
  const sparkMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffe090,
        toneMapped: false,
      }),
    []
  );

  // Helper to obtain live tip position
  const getTipPos = (cable: CableDef, out: THREE.Vector3): THREE.Vector3 => {
    if (cableTips && cableTips[cable.id]) {
      return out.copy(cableTips[cable.id]);
    }
    return out.set(cable.endX, cable.endY, cable.endZ);
  };

  /**
   * Spawns a burst of sparks at a cable tip and triggers light flash + audio
   */
  const triggerBurst = (cable: CableDef, now: number) => {
    getTipPos(cable, _tipScratch);
    const pPos = playerPositionRef?.current || camera.position;
    const distToPlayer = _tipScratch.distanceTo(pPos);

    // Distance gating: cull bursts beyond 28m
    if (distToPlayer > 28) return;

    lastGlobalBurstTime.current = now;

    let burstCount = 10 + Math.floor(Math.random() * 12);
    if (distToPlayer < 6) burstCount = Math.floor(burstCount * 1.3);
    else if (distToPlayer > 16) burstCount = Math.floor(burstCount * 0.5);

    let spawned = 0;
    for (let i = 0; i < MAX_SPARKS && spawned < burstCount; i++) {
      const p = particles.current[i];
      if (!p.active) {
        p.active = true;
        p.x = _tipScratch.x;
        p.y = _tipScratch.y;
        p.z = _tipScratch.z;

        // Directional spray outward with downward bias
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.6 + Math.random() * 3.8;
        p.vx = Math.cos(angle) * speed * 0.7;
        p.vy = (Math.random() - 0.25) * speed;
        p.vz = Math.sin(angle) * speed * 0.7;
        p.life = 0;
        p.maxLife = 0.22 + Math.random() * 0.4;
        p.scale = 0.032 + Math.random() * 0.032;
        spawned++;
      }
    }

    // 8% Chance of secondary double burst 120ms later
    if (Math.random() < 0.08) {
      doubleBurstQueue.current.push({ cable, timer: 0.12 });
    }

    // Photosensitivity limiter check
    flashTimestamps.current = flashTimestamps.current.filter((t) => now - t < 1.0);
    const allowLight = flashTimestamps.current.length < 3 && !reducedMotion;

    if (allowLight) {
      flashTimestamps.current.push(now);
      const flashDur = 0.09 + Math.random() * 0.06;

      if (now > light1Expiry.current) {
        if (light1Ref.current) {
          light1Ref.current.position.copy(_tipScratch);
          light1Ref.current.intensity = 2.6;
          light1Expiry.current = now + flashDur;
        }
      } else if (now > light2Expiry.current) {
        if (light2Ref.current) {
          light2Ref.current.position.copy(_tipScratch);
          light2Ref.current.intensity = 2.6;
          light2Expiry.current = now + flashDur;
        }
      }
    }

    // Positional 3D audio crackle
    shipAudio.playSpark(_tipScratch.x, _tipScratch.y, _tipScratch.z);

    // Notify listeners
    const ev: SparkEvent = {
      cableId: cable.id,
      position: [_tipScratch.x, _tipScratch.y, _tipScratch.z],
      intensity: 2.6,
      timestamp: now,
    };
    sparkListeners.forEach((fn) => fn(ev));
  };

  // Manual trigger hook ([K] key)
  useEffect(() => {
    manualTriggerFn = (cableId?: string) => {
      const pPos = playerPositionRef?.current || camera.position;
      let targetCable = faultyCables[0];
      let minD = Infinity;

      for (const c of faultyCables) {
        if (cableId && c.id === cableId) {
          targetCable = c;
          break;
        }
        getTipPos(c, _tipScratch);
        const d = _tipScratch.distanceTo(pPos);
        if (d < minD) {
          minD = d;
          targetCable = c;
        }
      }

      if (targetCable) {
        triggerBurst(targetCable, performance.now() * 0.001);
      }
    };
    return () => {
      manualTriggerFn = null;
    };
  }, [faultyCables, camera, playerPositionRef]);

  useFrame(({ clock }, delta) => {
    if (paused) return;

    const t = clock.elapsedTime;
    const now = performance.now() * 0.001;
    const dt = Math.min(delta, 0.06);

    // 1. Process double bursts
    for (let d = doubleBurstQueue.current.length - 1; d >= 0; d--) {
      const db = doubleBurstQueue.current[d];
      db.timer -= dt;
      if (db.timer <= 0) {
        triggerBurst(db.cable, now);
        doubleBurstQueue.current.splice(d, 1);
      }
    }

    // 2. Check cable burst timers (Spaced-out, sporadic frequency)
    for (let c = 0; c < faultyCables.length; c++) {
      cableTimers.current[c] -= dt;
      if (cableTimers.current[c] <= 0) {
        // Enforce at least 5.5s spacing between any bursts across the ship
        if (now - lastGlobalBurstTime.current < 5.5) {
          // Push timer back by 3.0 to 6.0 seconds so bursts don't clash
          cableTimers.current[c] = 3.0 + Math.random() * 3.0;
          continue;
        }

        getTipPos(faultyCables[c], _tipScratch);
        const pPos = playerPositionRef?.current || camera.position;
        // Cull distant bursts beyond 28m
        if (_tipScratch.distanceTo(pPos) <= 28) {
          triggerBurst(faultyCables[c], now);
        }

        // Next burst in 16.0 to 36.0 seconds (very sporadic and cinematic)
        cableTimers.current[c] = 16.0 + Math.random() * 20.0;
      }
    }

    // 3. Fade active light flashes smoothly
    if (light1Ref.current) {
      if (now > light1Expiry.current) {
        light1Ref.current.intensity = 0;
      } else {
        const remaining = (light1Expiry.current - now) / 0.12;
        light1Ref.current.intensity = Math.max(0, remaining * 2.6);
      }
    }
    if (light2Ref.current) {
      if (now > light2Expiry.current) {
        light2Ref.current.intensity = 0;
      } else {
        const remaining = (light2Expiry.current - now) / 0.12;
        light2Ref.current.intensity = Math.max(0, remaining * 2.6);
      }
    }

    // 4. Update particles physics & InstancedMesh transforms (0 allocations)
    const mesh = instMeshRef.current;
    if (!mesh) return;

    const gravity = -9.8;

    for (let i = 0; i < MAX_SPARKS; i++) {
      const p = particles.current[i];
      if (p.active) {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _sparkMatrix.makeScale(0, 0, 0);
          mesh.setMatrixAt(i, _sparkMatrix);
          continue;
        }

        // Ballistic integration
        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        // Floor bounce & friction
        if (p.y <= FLOOR_Y + 0.02) {
          p.y = FLOOR_Y + 0.02;
          p.vy = -p.vy * 0.35; // bounce damping
          p.vx *= 0.75;
          p.vz *= 0.75;
        }

        // Decay scale
        const fade = 1 - p.life / p.maxLife;
        const currentScale = p.scale * fade;

        _sparkPos.set(p.x, p.y, p.z);
        const speed = Math.hypot(p.vx, p.vy, p.vz);
        _sparkScale.set(currentScale, currentScale, currentScale * (1.8 + speed * 0.15));

        // Align spark along flight direction
        _sparkDir.set(p.vx, p.vy, p.vz).normalize();
        _sparkQuat.setFromUnitVectors(_forward, _sparkDir);

        _sparkMatrix.compose(_sparkPos, _sparkQuat, _sparkScale);
        mesh.setMatrixAt(i, _sparkMatrix);
      } else {
        _sparkMatrix.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, _sparkMatrix);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="spark-system">
      {/* 1 single draw call for all sparks */}
      <instancedMesh
        ref={instMeshRef}
        args={[sparkGeo, sparkMat, MAX_SPARKS]}
        frustumCulled={false}
      />

      {/* Strictly 2 pooled point lights for flashes (electric blue & warm amber) */}
      <pointLight
        ref={light1Ref}
        color="#88d8ff"
        intensity={0}
        distance={8.0}
        decay={2}
      />
      <pointLight
        ref={light2Ref}
        color="#ffaa44"
        intensity={0}
        distance={8.0}
        decay={2}
      />
    </group>
  );
}

export default SparkSystem;
