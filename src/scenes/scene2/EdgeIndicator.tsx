"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { SCENE2_CONFIG } from "./scene2.config";

interface EdgeIndicatorProps {
  camera: THREE.Camera | null;
  distance: number;
  visible: boolean;
}

export default function EdgeIndicator({
  camera,
  distance,
  visible,
}: EdgeIndicatorProps) {
  const indicatorData = useMemo(() => {
    if (!visible || !camera || typeof window === "undefined") {
      return { isOffscreen: false, angleDeg: 0, xPercent: 50, yPercent: 50 };
    }

    const [bx, by, bz] = SCENE2_CONFIG.beaconPos;
    const targetPos = new THREE.Vector3(bx, by + 1.0, bz);

    // Project beacon position to NDC (-1 to 1)
    const ndc = targetPos.clone().project(camera);

    const isBehind = ndc.z > 1.0;
    let screenX = (ndc.x + 1) / 2;
    let screenY = (-ndc.y + 1) / 2;

    const margin = 0.08;
    const isOffscreen =
      isBehind ||
      screenX < margin ||
      screenX > 1 - margin ||
      screenY < margin ||
      screenY > 1 - margin;

    if (!isOffscreen) {
      return { isOffscreen: false, angleDeg: 0, xPercent: screenX * 100, yPercent: screenY * 100 };
    }

    let dx = ndc.x;
    let dy = -ndc.y;

    if (isBehind) {
      dx = -dx;
      dy = -dy;
    }

    const angle = Math.atan2(dy, dx);
    const angleDeg = (angle * 180) / Math.PI;

    // Clamp to screen edge
    const r = Math.min(
      Math.abs((0.5 - margin) / Math.cos(angle)),
      Math.abs((0.5 - margin) / Math.sin(angle))
    );

    const clampedX = 0.5 + Math.cos(angle) * Math.min(0.42, r);
    const clampedY = 0.5 + Math.sin(angle) * Math.min(0.42, r);

    return {
      isOffscreen: true,
      angleDeg,
      xPercent: clampedX * 100,
      yPercent: clampedY * 100,
    };
  }, [camera, visible, distance]);

  if (!visible || !indicatorData.isOffscreen) return null;

  return (
    <div
      className="fixed z-40 pointer-events-none select-none -translate-x-1/2 -translate-y-1/2 transition-all duration-75 flex flex-col items-center gap-1"
      style={{
        left: `${indicatorData.xPercent.toFixed(1)}%`,
        top: `${indicatorData.yPercent.toFixed(1)}%`,
      }}
    >
      <div
        className="w-7 h-7 rounded-full bg-black/80 border border-cyan-400 flex items-center justify-center shadow-[0_0_12px_#38bdf8]"
        style={{
          transform: `rotate(${indicatorData.angleDeg}deg)`,
        }}
      >
        <span className="text-cyan-300 font-bold text-xs">▲</span>
      </div>
      <div className="bg-black/90 border border-cyan-500/50 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-200 tracking-wider shadow-[0_0_8px_rgba(0,255,255,0.3)]">
        {distance.toFixed(1)}m
      </div>
    </div>
  );
}
