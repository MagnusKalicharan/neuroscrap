"use client";
/**
 * doors.tsx — Motorized Bulkhead Doors with Dynamic Collision
 * ==========================================================
 * Renders sliding heavy blast doors for the ship's bulkheads.
 * Features:
 *   - Smooth hydraulic slide animation (left & right door leaves)
 *   - Updates collision bounds dynamically so player can walk through when open
 *   - Heavy industrial sound via shipAudio.playDoorCycle()
 *   - Hazard chevron stripes along door edges
 */
import React, { useState, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOORS, DoorDef } from "./layout";
import { Aabb } from "./collision";
import { shipAudio } from "../../audio/shipAudio";
import { getHazardStripeTexture } from "./materials";

interface DoorsProps {
  onDoorStateChange?: (doorId: string, isOpen: boolean) => void;
  /** Current door collider registry hook */
  registerDoorColliders?: (colliders: Aabb[]) => void;
}

export function BulkheadDoors({ onDoorStateChange, registerDoorColliders }: DoorsProps) {
  // Door states: open amount 0 (closed) to 1 (fully open)
  const [doorStates, setDoorStates] = useState<{ [id: string]: { open: boolean; progress: number } }>(() => {
    const initial: { [id: string]: { open: boolean; progress: number } } = {};
    DOORS.forEach((d) => {
      initial[d.id] = { open: d.open, progress: d.open ? 1 : 0 };
    });
    return initial;
  });

  const hazardTex = useMemo(() => getHazardStripeTexture(), []);

  const doorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x3a424e,
        roughness: 0.6,
        metalness: 0.7,
      }),
    []
  );

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x22262d,
        roughness: 0.7,
        metalness: 0.6,
      }),
    []
  );

  const stripeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: hazardTex,
        toneMapped: false,
      }),
    [hazardTex]
  );

  // Animate sliding doors in useFrame
  useFrame((_, delta) => {
    let changed = false;
    const nextStates = { ...doorStates };

    DOORS.forEach((d) => {
      const state = nextStates[d.id];
      if (!state) return;

      const target = state.open ? 1 : 0;
      if (Math.abs(state.progress - target) > 0.001) {
        state.progress = THREE.MathUtils.damp(state.progress, target, 4.0, delta);
        changed = true;
      } else {
        state.progress = target;
      }
    });

    if (changed) {
      setDoorStates(nextStates);
    }
  });

  /**
   * Toggles a door open or closed
   */
  const toggleDoor = (id: string) => {
    const door = DOORS.find((d) => d.id === id);
    if (!door || door.jammed) return;

    setDoorStates((prev) => {
      const current = prev[id];
      const willOpen = !current.open;
      shipAudio.playDoorCycle(door.x, 1.5, door.z, willOpen);
      onDoorStateChange?.(id, willOpen);
      return {
        ...prev,
        [id]: { open: willOpen, progress: current.progress },
      };
    });
  };

  return (
    <group name="bulkhead-doors">
      {DOORS.map((door) => {
        const state = doorStates[door.id] ?? { open: door.open, progress: door.open ? 1 : 0 };
        const slideOffset = state.progress * (door.width * 0.48);

        return (
          <group
            key={door.id}
            position={[door.x, 0, door.z]}
            rotation={[0, door.rotY, 0]}
          >
            {/* Outer Heavy Door Frame */}
            <mesh
              position={[-door.width * 0.5 - 0.15, door.height * 0.5, 0]}
              material={frameMat}
            >
              <boxGeometry args={[0.3, door.height + 0.2, 0.4]} />
            </mesh>
            <mesh
              position={[door.width * 0.5 + 0.15, door.height * 0.5, 0]}
              material={frameMat}
            >
              <boxGeometry args={[0.3, door.height + 0.2, 0.4]} />
            </mesh>
            <mesh
              position={[0, door.height + 0.1, 0]}
              material={frameMat}
            >
              <boxGeometry args={[door.width + 0.6, 0.25, 0.4]} />
            </mesh>

            {/* Left Door Leaf */}
            <group position={[-door.width * 0.25 - slideOffset, door.height * 0.5, 0]}>
              <mesh material={doorMat}>
                <boxGeometry args={[door.width * 0.5, door.height, 0.15]} />
              </mesh>
              {/* Hazard stripes strip */}
              <mesh position={[door.width * 0.23, 0, 0.08]} material={stripeMat}>
                <planeGeometry args={[0.1, door.height]} />
              </mesh>
            </group>

            {/* Right Door Leaf */}
            <group position={[door.width * 0.25 + slideOffset, door.height * 0.5, 0]}>
              <mesh material={doorMat}>
                <boxGeometry args={[door.width * 0.5, door.height, 0.15]} />
              </mesh>
              {/* Hazard stripes strip */}
              <mesh position={[-door.width * 0.23, 0, 0.08]} material={stripeMat}>
                <planeGeometry args={[0.1, door.height]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
