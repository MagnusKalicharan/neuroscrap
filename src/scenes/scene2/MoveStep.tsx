"use client";

import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE2_CONFIG } from "./scene2.config";
import { scene2Sound } from "./sound";

interface MoveStepProps {
  onComplete: () => void;
  isActive: boolean;
}

export function MoveTracker({ onComplete, isActive }: MoveStepProps) {
  const { camera } = useThree();
  const prevPosRef = useRef(new THREE.Vector3());
  const accumDistRef = useRef(0);
  const targetDist = SCENE2_CONFIG.moveAccumDistUnits;
  const hasTriggeredRef = useRef(false);
  const lastFootstepDistRef = useRef(0);

  useEffect(() => {
    if (isActive) {
      prevPosRef.current.copy(camera.position);
      accumDistRef.current = 0;
      lastFootstepDistRef.current = 0;
      hasTriggeredRef.current = false;
    }
  }, [isActive, camera]);

  useFrame(() => {
    if (!isActive || hasTriggeredRef.current) return;

    const dx = camera.position.x - prevPosRef.current.x;
    const dz = camera.position.z - prevPosRef.current.z;
    const distDelta = Math.hypot(dx, dz);

    if (distDelta > 0.001) {
      accumDistRef.current += distDelta;
      prevPosRef.current.copy(camera.position);

      // Play footstep sound every 1.6 units walked
      if (accumDistRef.current - lastFootstepDistRef.current >= 1.6) {
        scene2Sound.playFootstep();
        lastFootstepDistRef.current = accumDistRef.current;
      }

      if (accumDistRef.current >= targetDist) {
        hasTriggeredRef.current = true;
        onComplete();
      }
    }
  });

  return null;
}

export function MoveStepOverlay({
  progressPercent,
  highlightW = false,
}: {
  progressPercent: number;
  highlightW?: boolean;
}) {
  const [pressedKeys, setPressedKeys] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const code = e.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
        setPressedKeys((prev) => ({ ...prev, [code]: true }));
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      const code = e.code;
      setPressedKeys((prev) => ({ ...prev, [code]: false }));
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const isW = pressedKeys["KeyW"] || pressedKeys["ArrowUp"];
  const isA = pressedKeys["KeyA"] || pressedKeys["ArrowLeft"];
  const isS = pressedKeys["KeyS"] || pressedKeys["ArrowDown"];
  const isD = pressedKeys["KeyD"] || pressedKeys["ArrowRight"];

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 select-none pointer-events-none">
      {/* Keycaps Grid */}
      <div className="flex flex-col items-center gap-1.5">
        {/* W Key */}
        <div
          className={`w-11 h-11 rounded-lg border flex items-center justify-center font-mono font-bold text-sm transition-all duration-100 ${
            isW
              ? "bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_#38bdf8] scale-95"
              : highlightW
              ? "bg-cyan-950/70 border-cyan-400 text-cyan-200 animate-pulse shadow-[0_0_15px_#06b6d4]"
              : "bg-black/80 border-cyan-500/40 text-cyan-300"
          }`}
        >
          W
        </div>

        {/* A S D Keys */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-11 h-11 rounded-lg border flex items-center justify-center font-mono font-bold text-sm transition-all duration-100 ${
              isA
                ? "bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_#38bdf8] scale-95"
                : "bg-black/80 border-cyan-500/40 text-cyan-300"
            }`}
          >
            A
          </div>
          <div
            className={`w-11 h-11 rounded-lg border flex items-center justify-center font-mono font-bold text-sm transition-all duration-100 ${
              isS
                ? "bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_#38bdf8] scale-95"
                : "bg-black/80 border-cyan-500/40 text-cyan-300"
            }`}
          >
            S
          </div>
          <div
            className={`w-11 h-11 rounded-lg border flex items-center justify-center font-mono font-bold text-sm transition-all duration-100 ${
              isD
                ? "bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_#38bdf8] scale-95"
                : "bg-black/80 border-cyan-500/40 text-cyan-300"
            }`}
          >
            D
          </div>
        </div>
      </div>

      <div className="bg-black/80 px-3 py-1 rounded border border-cyan-500/30 text-xs font-mono text-cyan-200 uppercase tracking-widest">
        WALK TO CALIBRATE MOTORS ({Math.min(100, Math.round(progressPercent))}%)
      </div>
    </div>
  );
}
