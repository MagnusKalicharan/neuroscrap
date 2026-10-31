'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLessonStore } from './useLessonStore.ts';

export interface Chapter1TerminalProps {
  position?: [number, number, number];
  flareActive?: boolean;
}

export const Chapter1Terminal: React.FC<Chapter1TerminalProps> = ({
  position = [0, 1.0, -28.5],
  flareActive = false,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const screenMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const flareLightRef = useRef<THREE.PointLight>(null);

  const store = useLessonStore();

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    // Soft pulsating outline/glow
    if (screenMatRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      if (store.completed) {
        // Green when completed
        screenMatRef.current.emissive.setRGB(0.18 * pulse, 0.88 * pulse, 0.45 * pulse);
      } else {
        // Soft pulsing cyan outline when active/offline
        screenMatRef.current.emissive.setRGB(0.27 * pulse, 0.9 * pulse, 1.0 * pulse);
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.4;
      const s = 1.0 + 0.05 * Math.sin(time * 2);
      ringRef.current.scale.set(s, s, 1);
    }

    // Radiation flare light animation during payoff
    if (flareLightRef.current && flareActive) {
      const flash = Math.sin(time * 15) > 0 ? 8 : 12;
      flareLightRef.current.intensity = flash;
    }
  });

  return (
    <>
      {/* 3D Terminal Mesh on the Bridge */}
      <group ref={groupRef} position={position}>
        {/* Terminal Pedestal Base */}
        <mesh position={[0, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 1.2, 0.6]} />
          <meshStandardMaterial color="#0c131f" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Angled Console Top */}
        <mesh position={[0, 0.35, 0.05]} rotation={[-0.45, 0, 0]}>
          <boxGeometry args={[0.9, 0.65, 0.12]} />
          <meshStandardMaterial color="#070c14" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Emissive Holographic Screen Surface */}
        <mesh position={[0, 0.38, 0.1]} rotation={[-0.45, 0, 0]}>
          <planeGeometry args={[0.8, 0.52]} />
          <meshStandardMaterial
            ref={screenMatRef}
            color="#040810"
            emissive={store.completed ? '#2de089' : '#44e6ff'}
            emissiveIntensity={1.8}
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>

        {/* Pulsing Outline Ring */}
        <mesh ref={ringRef} position={[0, 0.38, 0.12]} rotation={[-0.45, 0, 0]}>
          <ringGeometry args={[0.35, 0.38, 32]} />
          <meshBasicMaterial
            color={store.completed ? '#2de089' : '#44e6ff'}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Radiation Flare Light in Cockpit during payoff */}
      {flareActive && (
        <pointLight
          ref={flareLightRef}
          position={[0, 4.0, -38]}
          color="#ff4422"
          intensity={12}
          distance={40}
          decay={1.8}
        />
      )}
    </>
  );
};
