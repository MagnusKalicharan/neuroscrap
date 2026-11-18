/**
 * src/ending/ship/RescueShipFar.tsx
 * ============================================================
 * Far Distance Representation of Rescue Two (for distances > 400m).
 * - Ultra-lightweight low-poly silhouette disc (< 120 triangles).
 * - Matching warm gunmetal tone and amber blinking beacon sprite.
 * - Zero visual pop: matches projected size and perceived brightness at the 400m transition.
 */
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface RescueShipFarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  navBlink?: boolean;
  engineThrust?: number;
  greyscale?: boolean;
}

export function RescueShipFar({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  navBlink = true,
  engineThrust = 0.0,
  greyscale = false,
}: RescueShipFarProps) {
  const spriteRef = useRef<THREE.Sprite>(null);

  // 1. Low-poly disc geometry (35m radius, 14m thickness, 16 segments)
  const geom = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.1, 6.2),
      new THREE.Vector2(14.0, 5.0),
      new THREE.Vector2(35.0, 0.0),
      new THREE.Vector2(14.0, -5.0),
      new THREE.Vector2(0.1, -6.8),
    ];
    const g = new THREE.LatheGeometry(pts, 16);
    g.computeVertexNormals();
    return g;
  }, []);

  // 2. Base gunmetal silhouette material
  const mat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: greyscale ? "#555555" : "#b8b2a8",
      toneMapped: false,
    });
  }, [greyscale]);

  // 3. Circular soft glow sprite texture for distant nav beacon
  const spriteTex = useMemo(() => {
    if (typeof document === "undefined") {
      const data = new Uint8Array([255, 200, 100, 255]);
      return new THREE.DataTexture(data, 1, 1);
    }
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, "rgba(255, 220, 140, 1.0)");
    grad.addColorStop(0.35, "rgba(245, 158, 11, 0.7)");
    grad.addColorStop(1, "rgba(245, 158, 11, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  const spriteMat = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: spriteTex,
      color: greyscale ? "#ffffff" : "#fbbf24",
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [spriteTex, greyscale]);

  React.useEffect(() => {
    return () => {
      geom.dispose();
      mat.dispose();
      spriteTex.dispose();
      spriteMat.dispose();
    };
  }, [geom, mat, spriteTex, spriteMat]);

  // 0.8 Hz Steady nav blink (matches Section 3 beacon properties: "faint, keeps a steady beat")
  useFrame(({ clock }) => {
    if (spriteRef.current) {
      const t = clock.getElapsedTime();
      const isLit = navBlink && ((t % 1.25) < 0.65);
      const thrustBonus = engineThrust * 0.5;
      spriteRef.current.material.opacity = isLit ? 0.9 + thrustBonus : 0.15;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geom} material={mat} />
      <sprite ref={spriteRef} material={spriteMat} scale={[38.0, 38.0, 1.0]} />
    </group>
  );
}
