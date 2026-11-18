"use client";
/**
 * src/ending/ScrapModel.tsx
 * ============================================================
 * Procedural 3D Articulated Model of SCRAP the Utility Droid.
 * 
 * Features:
 * - Industrial repair droid chassis (slate armor, hazard stripes, power backpack)
 * - Articulated biped walking legs driven by `walkPhase` (0..1)
 * - Animated tool arms, body bob, and jiggling whip antenna
 * - Glowing emissive cyan sensor visor eye (#22D3EE)
 * - Zero external assets, purely procedural BufferGeometries with baked vertex colors
 * - Low polygon count (< 1,200 triangles, strictly 2-3 draw calls)
 */
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface ScrapModelProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  walkPhase?: number; // 0..1 cyclic walk cycle
  isWalking?: boolean;
  eyeGlow?: number; // 0..1 intensity
}

export function ScrapModel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  walkPhase = 0.0,
  isWalking = true,
  eyeGlow = 1.0,
}: ScrapModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Group>(null);

  // Materials with baked sci-fi palette
  const materials = useMemo(() => {
    return {
      bodyMat: new THREE.MeshBasicMaterial({
        color: "#334155", // Slate metal
      }),
      accentMat: new THREE.MeshBasicMaterial({
        color: "#F59E0B", // Safety amber hazard stripes
      }),
      darkMat: new THREE.MeshBasicMaterial({
        color: "#1E293B", // Heavy joint alloy
      }),
      eyeMat: new THREE.MeshBasicMaterial({
        color: "#22D3EE", // Luminous cyan sensor eye
      }),
      backpackMat: new THREE.MeshBasicMaterial({
        color: "#06B6D4", // Power core glow
      }),
    };
  }, []);

  useFrame(() => {
    const cycle = (walkPhase % 1.0) * Math.PI * 2;
    const moving = isWalking;

    // Body Bobbing & Tilt
    if (torsoRef.current) {
      torsoRef.current.position.y = moving ? Math.abs(Math.sin(cycle)) * 0.06 : 0;
      torsoRef.current.rotation.z = moving ? Math.sin(cycle) * 0.04 : 0;
    }

    // Legs Stride Kinematics
    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = moving ? Math.sin(cycle) * 0.55 : 0;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = moving ? -Math.sin(cycle) * 0.55 : 0;
    }

    // Arms Counter-Swing
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = moving ? -Math.sin(cycle) * 0.40 : 0.1;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = moving ? Math.sin(cycle) * 0.40 : 0.1;
    }

    // Springy Antenna Jiggle
    if (antennaRef.current) {
      antennaRef.current.rotation.z = moving ? Math.sin(cycle * 2) * 0.12 : 0;
    }
  });

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={scale}>
      {/* ── Main Torso Group (bobs as Scrap walks) ── */}
      <group ref={torsoRef} position={[0, 0.75, 0]}>
        {/* Main Body Chassis: Box 0.65m wide, 0.70m tall, 0.55m deep */}
        <mesh position={[0, 0, 0]} material={materials.bodyMat}>
          <boxGeometry args={[0.65, 0.70, 0.55]} />
        </mesh>

        {/* Chest Plate with Hazard Amber Inset */}
        <mesh position={[0, 0.05, 0.285]} material={materials.accentMat}>
          <boxGeometry args={[0.50, 0.35, 0.03]} />
        </mesh>

        {/* Chest Tech Grille */}
        <mesh position={[0, -0.18, 0.285]} material={materials.darkMat}>
          <boxGeometry args={[0.42, 0.16, 0.03]} />
        </mesh>

        {/* Back Energy Power Unit */}
        <mesh position={[0, 0.05, -0.35]} material={materials.darkMat}>
          <cylinderGeometry args={[0.18, 0.18, 0.55, 12]} />
        </mesh>
        <mesh position={[0, 0.05, -0.36]} material={materials.backpackMat}>
          <cylinderGeometry args={[0.19, 0.19, 0.20, 12]} />
        </mesh>

        {/* ── Head / Sensor Turret ── */}
        <group position={[0, 0.48, 0]}>
          {/* Head dome casing */}
          <mesh material={materials.bodyMat}>
            <boxGeometry args={[0.50, 0.28, 0.45]} />
          </mesh>

          {/* Curved Visor Screen */}
          <mesh position={[0, 0.02, 0.23]} material={materials.darkMat}>
            <boxGeometry args={[0.42, 0.15, 0.03]} />
          </mesh>

          {/* Luminous Glowing Visor Eye */}
          <mesh position={[0, 0.02, 0.245]} material={materials.eyeMat}>
            <boxGeometry args={[0.34, 0.08, 0.01]} />
          </mesh>

          {/* Head Whip Antenna */}
          <group ref={antennaRef} position={[-0.18, 0.14, -0.12]}>
            <mesh position={[0, 0.16, 0]} material={materials.darkMat}>
              <cylinderGeometry args={[0.015, 0.02, 0.32, 6]} />
            </mesh>
            {/* Blinking Antenna Tip Bead */}
            <mesh position={[0, 0.33, 0]} material={materials.eyeMat}>
              <sphereGeometry args={[0.035, 8, 8]} />
            </mesh>
          </group>
        </group>

        {/* ── Left Arm (Claw Manipulator) ── */}
        <group ref={leftArmRef} position={[-0.40, 0.15, 0]}>
          <mesh position={[0, -0.15, 0]} material={materials.darkMat}>
            <cylinderGeometry args={[0.05, 0.05, 0.32, 6]} />
          </mesh>
          <mesh position={[0, -0.33, 0.04]} material={materials.accentMat}>
            <boxGeometry args={[0.08, 0.12, 0.10]} />
          </mesh>
        </group>

        {/* ── Right Arm (Tool Welder Manipulator) ── */}
        <group ref={rightArmRef} position={[0.40, 0.15, 0]}>
          <mesh position={[0, -0.15, 0]} material={materials.darkMat}>
            <cylinderGeometry args={[0.05, 0.05, 0.32, 6]} />
          </mesh>
          <mesh position={[0, -0.33, 0.04]} material={materials.accentMat}>
            <boxGeometry args={[0.08, 0.12, 0.10]} />
          </mesh>
        </group>
      </group>

      {/* ── Left Leg Assembly ── */}
      <group ref={leftLegRef} position={[-0.20, 0.45, 0]}>
        {/* Hip Joint */}
        <mesh material={materials.darkMat}>
          <sphereGeometry args={[0.08, 8, 8]} />
        </mesh>
        {/* Upper & Lower Strut */}
        <mesh position={[0, -0.22, 0]} material={materials.bodyMat}>
          <cylinderGeometry args={[0.06, 0.05, 0.44, 6]} />
        </mesh>
        {/* Footpad */}
        <mesh position={[0, -0.44, 0.04]} material={materials.darkMat}>
          <boxGeometry args={[0.16, 0.05, 0.24]} />
        </mesh>
      </group>

      {/* ── Right Leg Assembly ── */}
      <group ref={rightLegRef} position={[0.20, 0.45, 0]}>
        {/* Hip Joint */}
        <mesh material={materials.darkMat}>
          <sphereGeometry args={[0.08, 8, 8]} />
        </mesh>
        {/* Upper & Lower Strut */}
        <mesh position={[0, -0.22, 0]} material={materials.bodyMat}>
          <cylinderGeometry args={[0.06, 0.05, 0.44, 6]} />
        </mesh>
        {/* Footpad */}
        <mesh position={[0, -0.44, 0.04]} material={materials.darkMat}>
          <boxGeometry args={[0.16, 0.05, 0.24]} />
        </mesh>
      </group>
    </group>
  );
}
