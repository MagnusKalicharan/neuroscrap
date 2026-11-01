"use client";

import React, { useEffect, useRef } from "react";
import { crashAudio } from "./crashAudio";
import { CRASH_DURATION_MS } from "./types";

interface CrashFallback2DProps {
  onDone?: () => void;
  reduceMotion?: boolean;
}

export default function CrashFallback2D({
  onDone,
  reduceMotion = false,
}: CrashFallback2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    crashAudio.start();
    const startTime = performance.now();
    let rafId: number;

    const render = (now: number) => {
      const elapsed = now - startTime;
      crashAudio.updateTime(elapsed);

      if (elapsed >= CRASH_DURATION_MS) {
        onDone?.();
        return;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      crashAudio.stopAll(300);
    };
  }, [onDone]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 bg-black flex items-center justify-center overflow-hidden pointer-events-none select-none"
    >
      {/* Red vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 20%, rgba(180, 20, 20, 0.4) 70%, rgba(0, 0, 0, 0.95) 100%)",
        }}
      />

      <div className="font-mono text-center space-y-2 z-10 text-red-400">
        <div className="text-xl font-bold tracking-widest animate-pulse">
          [!] EMERGENCY SENSOR DISCONNECT // RUNNING EMERGENCY LOG
        </div>
        <div className="text-xs text-red-300/70">
          VISUAL MEMORY RETRIEVAL (FALLBACK 2D MODE)
        </div>
      </div>
    </div>
  );
}
