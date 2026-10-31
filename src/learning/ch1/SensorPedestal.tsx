'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface SensorPedestalProps {
  type: 'air' | 'temp' | 'radiation';
  position: [number, number, number];
  scanned: boolean;
  activeTarget?: boolean;
}

export const SensorPedestal: React.FC<SensorPedestalProps> = ({
  type,
  position,
  scanned,
  activeTarget = false,
}) => {
  const iconRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const color =
    type === 'air' ? '#44e6ff' : type === 'temp' ? '#ffb23a' : '#d97dff';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (iconRef.current) {
      iconRef.current.rotation.y = t * 1.2;
      iconRef.current.position.y = 1.05 + Math.sin(t * 3) * 0.05;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.8;
      const s = 1.0 + Math.sin(t * 4) * 0.08;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={position}>
      {/* Heavy Pedestal Base */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.38, 0.9, 12]} />
        <meshStandardMaterial color="#0b121e" metalness={0.85} roughness={0.25} />
      </mesh>

      {/* Terminal Bezel */}
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.3, 0.28, 0.08, 12]} />
        <meshStandardMaterial color="#1a2738" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Floating Holographic Sensor Icon */}
      <mesh ref={iconRef} position={[0, 1.05, 0]}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial
          color={scanned ? '#2de089' : color}
          emissive={scanned ? '#2de089' : color}
          emissiveIntensity={activeTarget ? 2.5 : 1.5}
          wireframe
        />
      </mesh>

      {/* Pulsing Beacon Ring */}
      <mesh ref={ringRef} position={[0, 0.96, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.38, 24]} />
        <meshBasicMaterial
          color={scanned ? '#2de089' : color}
          transparent
          opacity={scanned ? 0.4 : activeTarget ? 0.9 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Scanned Checkmark Indicator Light */}
      {scanned && (
        <pointLight position={[0, 1.2, 0]} color="#2de089" intensity={1.5} distance={3} decay={2} />
      )}
    </group>
  );
};
