"use client";

import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE2_CONFIG } from "./scene2.config";

interface LookStepProps {
  onComplete: () => void;
  isActive: boolean;
}

export function LookTracker({ onComplete, isActive }: LookStepProps) {
  const { camera } = useThree();
  const prevQuatRef = useRef(new THREE.Quaternion());
  const accumAngleRef = useRef(0);
  const targetAngleRad = (SCENE2_CONFIG.lookAccumAngleDeg * Math.PI) / 180;
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      prevQuatRef.current.copy(camera.quaternion);
      accumAngleRef.current = 0;
      hasTriggeredRef.current = false;
    }
  }, [isActive, camera]);

  useFrame(() => {
    if (!isActive || hasTriggeredRef.current) return;

    const angleDelta = camera.quaternion.angleTo(prevQuatRef.current);
    if (angleDelta > 0.001) {
      accumAngleRef.current += angleDelta;
      prevQuatRef.current.copy(camera.quaternion);

      if (accumAngleRef.current >= targetAngleRad) {
        hasTriggeredRef.current = true;
        onComplete();
      }
    }
  });

  return null;
}

export function LookStepOverlay({ progressPercent }: { progressPercent: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 select-none pointer-events-none">
      <div className="relative w-16 h-16 flex items-center justify-center bg-black/75 border border-cyan-500/40 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.2)]">
        {/* Progress circular ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-neutral-800"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-cyan-400 transition-all duration-75"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Mouse Icon */}
        <div className="w-5 h-7 border-2 border-cyan-300 rounded-full flex flex-col items-center pt-1">
          <div className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce" />
        </div>
      </div>

      <div className="bg-black/80 px-3 py-1 rounded border border-cyan-500/30 text-xs font-mono text-cyan-200 uppercase tracking-widest">
        MOVE MOUSE TO LOOK ({Math.min(100, Math.round(progressPercent))}%)
      </div>
    </div>
  );
}
