"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE2_CONFIG } from "./scene2.config";

interface BeaconProps {
  isArrived?: boolean;
  distanceToPlayer?: number;
}

export default function Beacon({ isArrived = false }: BeaconProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const shaftRef = useRef<THREE.Mesh>(null);
  const chevronRef = useRef<THREE.Group>(null);

  const [bx, by, bz] = SCENE2_CONFIG.beaconPos;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Subtle breathing pulse on the ring
    if (ringRef.current) {
      const pulse = 1 + Math.sin(time * 3) * 0.08;
      ringRef.current.scale.set(pulse, 1, pulse);
    }

    // Slow bobbing on floating chevron
    if (chevronRef.current) {
      chevronRef.current.position.y = 1.6 + Math.sin(time * 2.5) * 0.12;
      chevronRef.current.rotation.y = time * 0.8;
    }

    // Light shaft opacity shimmer
    if (shaftRef.current) {
      const mat = shaftRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.12 + Math.sin(time * 4) * 0.04;
      }
    }
  });

  const ringColor = isArrived ? "#22c55e" : "#44e6ff";
  const chevronColor = isArrived ? "#4ade80" : "#38bdf8";

  return (
    <group position={[bx, by, bz]}>
      {/* ── 1. EMISSIVE FLOOR RING ── */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      >
        <ringGeometry args={[1.1, 1.35, 32]} />
        <meshBasicMaterial
          color={ringColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Inner glowing circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.05, 32]} />
        <meshBasicMaterial
          color={ringColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.18}
        />
      </mesh>

      {/* ── 2. ADDITIVE VERTICAL LIGHT SHAFT ── */}
      <mesh ref={shaftRef} position={[0, 2.0, 0]}>
        <cylinderGeometry args={[1.1, 1.25, 4.0, 24, 1, true]} />
        <meshBasicMaterial
          color={ringColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── 3. FLOATING BOBBING CHEVRON ARROW ── */}
      <group ref={chevronRef} position={[0, 1.6, 0]}>
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.24, 0.45, 4]} />
          <meshBasicMaterial
            color={chevronColor}
            wireframe={false}
          />
        </mesh>
      </group>
    </group>
  );
}
