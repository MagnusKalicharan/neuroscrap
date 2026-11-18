"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AntennaTerminalPedestalProps {
  position?: [number, number, number];
  rotationY?: number;
  isUnlocked?: boolean;
}

/**
 * Creates procedural canvas texture for the small antenna CRT monitor
 */
function createAntennaScreenTexture(isUnlocked: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#020c04";
  ctx.fillRect(0, 0, 512, 320);

  // Border & Grid
  ctx.strokeStyle = isUnlocked ? "#2EE85C" : "#ca8a04";
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 300);

  ctx.strokeStyle = isUnlocked ? "rgba(46, 232, 92, 0.15)" : "rgba(202, 138, 4, 0.15)";
  ctx.lineWidth = 1;
  for (let y = 30; y < 310; y += 24) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(502, y);
    ctx.stroke();
  }

  // Header
  ctx.fillStyle = isUnlocked ? "#4BFF7B" : "#eab308";
  ctx.font = "bold 24px monospace";
  ctx.fillText("ANTENNA CORE // SEC-4", 26, 48);

  ctx.fillStyle = isUnlocked ? "#2EE85C" : "#a16207";
  ctx.font = "bold 16px monospace";
  ctx.fillText("NEURAL COPROCESSOR TERMINAL", 26, 76);

  // Status Indicator
  ctx.fillStyle = isUnlocked ? "#2EE85C" : "#ca8a04";
  ctx.fillRect(26, 100, 460, 30);
  ctx.fillStyle = "#010803";
  ctx.font = "bold 18px monospace";
  ctx.fillText(isUnlocked ? "● ONLINE: READY TO TRAIN" : "○ STANDBY: AWAITING HANDSHAKE", 36, 122);

  // Schematic Icon (3 node neural diagram)
  ctx.fillStyle = isUnlocked ? "#4BFF7B" : "#ca8a04";
  ctx.beginPath();
  ctx.arc(100, 210, 16, 0, Math.PI * 2);
  ctx.arc(100, 260, 16, 0, Math.PI * 2);
  ctx.arc(250, 235, 18, 0, Math.PI * 2);
  ctx.arc(400, 235, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isUnlocked ? "#2EE85C" : "#854d0e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(100, 210);
  ctx.lineTo(250, 235);
  ctx.lineTo(400, 235);
  ctx.moveTo(100, 260);
  ctx.lineTo(250, 235);
  ctx.stroke();

  ctx.fillStyle = isUnlocked ? "#4BFF7B" : "#ca8a04";
  ctx.font = "bold 15px monospace";
  ctx.fillText("X1, X2", 80, 298);
  ctx.fillText("HIDDEN", 225, 298);
  ctx.fillText("OUTPUT", 375, 298);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export function AntennaTerminalPedestal({
  position = [2.0, 0.04, 12.8],
  rotationY = 0,
  isUnlocked = false,
}: AntennaTerminalPedestalProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const beaconGlowRef = useRef<THREE.Mesh>(null);

  const screenTex = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createAntennaScreenTexture(isUnlocked);
  }, [isUnlocked]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (lightRef.current) {
      lightRef.current.intensity = isUnlocked
        ? 0.8 + Math.sin(t * 4) * 0.2
        : 0.3 + Math.sin(t * 1.5) * 0.1;
    }
    if (beaconGlowRef.current) {
      const mat = beaconGlowRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = isUnlocked ? 0.7 + Math.sin(t * 5) * 0.3 : 0.4;
      }
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ── Base Pedestal Column ── */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.55, 0.9, 0.4]} />
        <meshStandardMaterial
          color={0x141c24}
          roughness={0.5}
          metalness={0.8}
        />
      </mesh>

      {/* ── Floor Flange & Bolts ── */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.65, 0.04, 0.5]} />
        <meshStandardMaterial
          color={0x0b1016}
          roughness={0.7}
          metalness={0.85}
        />
      </mesh>

      {/* ── Angled Console Head ── */}
      <group position={[0, 0.9, 0]} rotation={[-0.45, 0, 0]}>
        {/* Chassis */}
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.52, 0.36, 0.12]} />
          <meshStandardMaterial
            color={0x1b2530}
            roughness={0.4}
            metalness={0.85}
          />
        </mesh>

        {/* Screen Bezel */}
        <mesh position={[0, 0.15, 0.065]}>
          <boxGeometry args={[0.44, 0.28, 0.02]} />
          <meshStandardMaterial
            color={0x080d12}
            roughness={0.8}
            metalness={0.5}
          />
        </mesh>

        {/* Screen Display Face */}
        {screenTex ? (
          <mesh position={[0, 0.15, 0.076]}>
            <planeGeometry args={[0.42, 0.26]} />
            <meshBasicMaterial
              map={screenTex}
              toneMapped={false}
            />
          </mesh>
        ) : (
          <mesh position={[0, 0.15, 0.076]}>
            <planeGeometry args={[0.42, 0.26]} />
            <meshBasicMaterial
              color={isUnlocked ? 0x2ee85c : 0xca8a04}
              toneMapped={false}
            />
          </mesh>
        )}

        {/* Console Keyboard / Button Row */}
        <mesh position={[0, -0.05, 0.05]}>
          <boxGeometry args={[0.46, 0.08, 0.04]} />
          <meshStandardMaterial color={0x232f3d} roughness={0.6} metalness={0.7} />
        </mesh>
      </group>

      {/* ── Indicator Light Post on Top ── */}
      <group position={[0.22, 1.15, -0.05]}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
          <meshStandardMaterial color={0x334155} metalness={0.8} />
        </mesh>
        <mesh ref={beaconGlowRef} position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshBasicMaterial
            color={isUnlocked ? "#2EE85C" : "#f59e0b"}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* ── Soft Local Spill Light ── */}
      <pointLight
        ref={lightRef}
        position={[0, 1.1, 0.3]}
        color={isUnlocked ? "#2EE85C" : "#f59e0b"}
        distance={2.5}
        decay={2}
      />
    </group>
  );
}
