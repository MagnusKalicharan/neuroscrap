"use client";
/**
 * SpaceshipWreck.tsx — drop-in crashed ship for Game.tsx
 * ------------------------------------------------------
 * Renders the procedural ship from shipModel.ts as 5 meshes (5 draw calls),
 * all MeshBasicMaterial with baked vertex-color lighting => no real lights,
 * no shadows, very cheap.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildShipModel, SHIP_POSITION, type ShipModel } from "./shipModel";

export { PLAYER_SPAWN, SHIP_POSITION, resolveShipCollisions } from "./shipModel";
export type { Aabb, ShipModel } from "./shipModel";

interface Props {
  /** Disable flicker / pulsing (accessibility). */
  reducedMotion?: boolean;
  /** Receive the collider list so your Player can call resolveShipCollisions(). */
  onReady?: (model: ShipModel) => void;
}

export function SpaceshipWreck({ reducedMotion = false, onReady }: Props) {
  // Build once. (~0.3 s on a laptop, ~27k triangles total.)
  const model = useMemo(() => buildShipModel(), []);

  const mats = useMemo(() => {
    const baked = { vertexColors: true, side: THREE.DoubleSide, toneMapped: false, fog: true } as const;
    return {
      interior: new THREE.MeshBasicMaterial(baked),
      exterior: new THREE.MeshBasicMaterial(baked),
      emissive: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false, fog: false }),
      alarm: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false, fog: false }),
      flicker: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false, fog: false }),
    };
  }, []);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    onReadyRef.current?.(model);
    return () => {
      // Free GPU memory when the ship unmounts
      Object.values(model).forEach((v) => v instanceof THREE.BufferGeometry && v.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    };
  }, [model, mats]);

  // Animated "lights": we only change a material multiplier, never a real light.
  const base = useRef(new THREE.Color(1, 1, 1));
  useFrame(({ clock }) => {
    if (reducedMotion) { mats.alarm.color.setScalar(1); mats.flicker.color.setScalar(1); return; }
    const t = clock.elapsedTime;
    // Alarm: slow pulse (about 0.4 Hz — safe for photosensitivity)
    mats.alarm.color.copy(base.current).multiplyScalar(0.55 + 0.45 * Math.sin(t * 2.5));
    // Faulty lamps/screens/sparks: irregular wobble + a rare dip (never faster than ~3 Hz)
    let v = 0.78 + 0.22 * Math.sin(t * 5.1) * Math.sin(t * 2.3 + 1);
    if (Math.sin(t * 0.9) > 0.97) v *= 0.25;
    mats.flicker.color.copy(base.current).multiplyScalar(v);
  });

  return (
    <group position={SHIP_POSITION}>
      <mesh geometry={model.interior} material={mats.interior} />
      <mesh geometry={model.exterior} material={mats.exterior} />
      <mesh geometry={model.emissive} material={mats.emissive} />
      <mesh geometry={model.alarm} material={mats.alarm} />
      <mesh geometry={model.flicker} material={mats.flicker} />
    </group>
  );
}

export default SpaceshipWreck;
