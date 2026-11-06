"use client";
/**
 * doors.tsx — Motorized Bulkhead Doors with Dynamic Collision & Auto-Proximity
 * ============================================================================
 * Renders sliding heavy blast doors for the ship's bulkheads.
 * Features:
 *   - Auto-proximity detection: opens automatically when the player approaches (<= 4.0m)
 *   - Closes automatically with smooth hysteresis when the player walks away (>= 5.2m)
 *   - Smooth hydraulic slide animation (left & right door leaves)
 *   - Dual-sided symmetry: identical Blade Runner neon noir styling from both +Z and -Z
 *   - Hazard chevron stripes and status indicator lights on both front and back
 *   - Updates collision bounds dynamically so player walks freely through when open
 *   - Heavy industrial sound via shipAudio.playDoorCycle()
 */
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DOORS, DoorDef } from "./layout";
import { Aabb } from "./collision";
import { shipAudio } from "../../audio/shipAudio";
import { getHazardStripeTexture } from "./materials";

interface DoorsProps {
  colliders?: Aabb[];
  onDoorStateChange?: (doorId: string, isOpen: boolean) => void;
  /** Current door collider registry hook */
  registerDoorColliders?: (colliders: Aabb[]) => void;
}

interface DoorRuntimeState {
  open: boolean;
  progress: number;
  lastAudioTime: number;
}

export function BulkheadDoors({ colliders, onDoorStateChange }: DoorsProps) {
  const { camera } = useThree();

  // Runtime animation state ref per door (avoids per-frame React re-renders)
  const runtimeStates = useRef<{ [id: string]: DoorRuntimeState }>({});
  if (Object.keys(runtimeStates.current).length === 0) {
    DOORS.forEach((d) => {
      runtimeStates.current[d.id] = {
        open: d.open,
        progress: d.open ? 1 : 0,
        lastAudioTime: 0,
      };
    });
  }

  // Refs for moving door leaves and status indicators
  const leftLeaves = useRef<{ [id: string]: THREE.Group | null }>({});
  const rightLeaves = useRef<{ [id: string]: THREE.Group | null }>({});
  const statusLights = useRef<{ [id: string]: THREE.Mesh[] }>({});

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
        side: THREE.DoubleSide,
      }),
    [hazardTex]
  );

  const amberPillarMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffb23a,
        toneMapped: false,
      }),
    []
  );

  const statusLightOpenMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x19f0ff,
        toneMapped: false,
      }),
    []
  );

  const statusLightClosedMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xff9a1f,
        toneMapped: false,
      }),
    []
  );

  // Initialize collider states
  useEffect(() => {
    if (colliders) {
      DOORS.forEach((d) => {
        const col = colliders.find((c) => c.id === d.id);
        if (col) {
          col.isOpen = d.open;
        }
      });
    }
  }, [colliders]);

  // Frame loop: Proximity auto-opening, damping, and leaf translation
  useFrame((_, delta) => {
    const px = camera.position.x;
    const py = camera.position.y;
    const pz = camera.position.z;
    const now = performance.now();

    DOORS.forEach((door) => {
      const state = runtimeStates.current[door.id];
      if (!state) return;

      const dx = px - door.x;
      const dz = pz - door.z;
      const horizontalDist = Math.hypot(dx, dz);
      const verticalDist = Math.abs(py - door.height * 0.5);

      // Automatic proximity check:
      // Open when player approaches within 4.0m horizontally and 2.8m vertically.
      // Close with hysteresis when player is beyond 5.2m.
      const inProximity = horizontalDist < 4.0 && verticalDist < 2.8;

      if (!door.jammed) {
        if (inProximity && !state.open) {
          state.open = true;
          if (now - state.lastAudioTime > 800) {
            shipAudio.playDoorCycle(door.x, 1.5, door.z, true);
            state.lastAudioTime = now;
          }
          onDoorStateChange?.(door.id, true);
        } else if (!inProximity && state.open && horizontalDist > 5.2) {
          state.open = false;
          if (now - state.lastAudioTime > 800) {
            shipAudio.playDoorCycle(door.x, 1.5, door.z, false);
            state.lastAudioTime = now;
          }
          onDoorStateChange?.(door.id, false);
        }
      }

      // Smooth hydraulic slide damping
      const target = state.open ? 1 : 0;
      state.progress = THREE.MathUtils.damp(state.progress, target, 5.0, delta);

      // Synchronize dynamic collider: passable when progress > 0.4
      if (colliders) {
        const col = colliders.find((c) => c.id === door.id);
        if (col) {
          col.isOpen = state.progress > 0.4;
        }
      }

      // Slide leaves smoothly apart
      const slideOffset = state.progress * (door.width * 0.48);

      const leftGroup = leftLeaves.current[door.id];
      if (leftGroup) {
        leftGroup.position.x = -door.width * 0.25 - slideOffset;
      }

      const rightGroup = rightLeaves.current[door.id];
      if (rightGroup) {
        rightGroup.position.x = door.width * 0.25 + slideOffset;
      }

      // Update status indicator glow material (cyan = opening/open, amber = closed)
      const lights = statusLights.current[door.id];
      if (lights) {
        const mat = state.progress > 0.1 ? statusLightOpenMat : statusLightClosedMat;
        for (let i = 0; i < lights.length; i++) {
          if (lights[i].material !== mat) {
            lights[i].material = mat;
          }
        }
      }
    });
  });

  return (
    <group name="bulkhead-doors">
      {DOORS.map((door) => {
        return (
          <group
            key={door.id}
            position={[door.x, 0, door.z]}
            rotation={[0, door.rotY, 0]}
          >
            {/* Outer Heavy Door Frame Header & Posts */}
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

            {/* Glowing amber pillars for side doors not generated by makeBulkhead */}
            {door.rotY !== 0 && (
              <>
                {[-0.22, 0.22].map((pz, idx) => (
                  <React.Fragment key={idx}>
                    <mesh
                      position={[-door.width * 0.5 - 0.07, door.height * 0.5, pz]}
                      material={amberPillarMat}
                    >
                      <boxGeometry args={[0.14, door.height + 0.2, 0.1]} />
                    </mesh>
                    <mesh
                      position={[door.width * 0.5 + 0.07, door.height * 0.5, pz]}
                      material={amberPillarMat}
                    >
                      <boxGeometry args={[0.14, door.height + 0.2, 0.1]} />
                    </mesh>
                  </React.Fragment>
                ))}
              </>
            )}

            {/* Status indicator lights on lintel (Both Front +Z and Back -Z) */}
            <mesh
              ref={(el) => {
                if (!statusLights.current[door.id]) statusLights.current[door.id] = [];
                if (el && !statusLights.current[door.id].includes(el)) {
                  statusLights.current[door.id].push(el);
                }
              }}
              position={[0, door.height + 0.1, 0.21]}
              material={statusLightClosedMat}
            >
              <boxGeometry args={[0.24, 0.06, 0.02]} />
            </mesh>
            <mesh
              ref={(el) => {
                if (!statusLights.current[door.id]) statusLights.current[door.id] = [];
                if (el && !statusLights.current[door.id].includes(el)) {
                  statusLights.current[door.id].push(el);
                }
              }}
              position={[0, door.height + 0.1, -0.21]}
              material={statusLightClosedMat}
            >
              <boxGeometry args={[0.24, 0.06, 0.02]} />
            </mesh>

            {/* Left Door Leaf (Dual-sided Hazard Trim) */}
            <group
              ref={(el) => {
                leftLeaves.current[door.id] = el;
              }}
              position={[-door.width * 0.25, door.height * 0.5, 0]}
            >
              <mesh material={doorMat}>
                <boxGeometry args={[door.width * 0.5, door.height, 0.15]} />
              </mesh>
              {/* Front (+Z) Hazard Stripe Trim */}
              <mesh position={[door.width * 0.23, 0, 0.08]} material={stripeMat}>
                <planeGeometry args={[0.1, door.height]} />
              </mesh>
              {/* Back (-Z) Hazard Stripe Trim (Exact Symmetry) */}
              <mesh
                position={[door.width * 0.23, 0, -0.08]}
                rotation={[0, Math.PI, 0]}
                material={stripeMat}
              >
                <planeGeometry args={[0.1, door.height]} />
              </mesh>
            </group>

            {/* Right Door Leaf (Dual-sided Hazard Trim) */}
            <group
              ref={(el) => {
                rightLeaves.current[door.id] = el;
              }}
              position={[door.width * 0.25, door.height * 0.5, 0]}
            >
              <mesh material={doorMat}>
                <boxGeometry args={[door.width * 0.5, door.height, 0.15]} />
              </mesh>
              {/* Front (+Z) Hazard Stripe Trim */}
              <mesh position={[-door.width * 0.23, 0, 0.08]} material={stripeMat}>
                <planeGeometry args={[0.1, door.height]} />
              </mesh>
              {/* Back (-Z) Hazard Stripe Trim (Exact Symmetry) */}
              <mesh
                position={[-door.width * 0.23, 0, -0.08]}
                rotation={[0, Math.PI, 0]}
                material={stripeMat}
              >
                <planeGeometry args={[0.1, door.height]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
