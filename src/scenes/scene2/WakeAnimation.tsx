"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { evaluateWakePose } from "./wakeMath";
import { blurManager } from "./BlurManager";

interface WakeAnimationProps {
  progress: number; // 0.0 to 1.0
  reduceMotion?: boolean;
  quality?: "low" | "medium" | "high";
  canvasWrapperRef?: React.RefObject<HTMLDivElement | null>;
  onDone?: () => void;
}

export function WakeCameraController({
  progress,
  reduceMotion = false,
  onDone,
}: {
  progress: number;
  reduceMotion?: boolean;
  onDone?: () => void;
}) {
  const { camera, size } = useThree();

  const savedCameraRef = useRef<{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    fov: number;
  } | null>(null);

  const hasDoneFiredRef = useRef(false);

  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    if (!savedCameraRef.current) {
      savedCameraRef.current = {
        position: persp.position.clone(),
        rotation: persp.rotation.clone(),
        fov: persp.fov,
      };
    }

    return () => {
      // Guaranteed clean restoration
      if (savedCameraRef.current) {
        const s = savedCameraRef.current;
        persp.position.copy(s.position);
        persp.rotation.copy(s.rotation);
        persp.fov = s.fov;
        persp.updateProjectionMatrix();
        savedCameraRef.current = null;
      }
    };
  }, [camera]);

  useFrame(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const evaluated = evaluateWakePose(progress, reduceMotion, aspect);

    // Apply exact camera position and rotation in YXZ order
    persp.position.copy(evaluated.position);
    persp.rotation.copy(evaluated.rotation);

    if (Math.abs(persp.fov - evaluated.fov) > 0.1) {
      persp.fov = evaluated.fov;
      persp.updateProjectionMatrix();
    }

    // Trigger onDone at p >= 1.0
    if (progress >= 1.0 && !hasDoneFiredRef.current) {
      hasDoneFiredRef.current = true;
      onDone?.();
    } else if (progress < 1.0) {
      hasDoneFiredRef.current = false;
    }
  });

  return null;
}

export default function WakeOverlay({
  progress,
  reduceMotion = false,
  quality = "high",
  canvasWrapperRef,
}: WakeAnimationProps) {
  useEffect(() => {
    blurManager.setQuality(quality);
  }, [quality]);

  const wake = useMemo(() => evaluateWakePose(progress, reduceMotion), [progress, reduceMotion]);
  const blur = useMemo(() => blurManager.evaluate(progress, reduceMotion), [progress, reduceMotion]);

  // Apply or remove CSS blur filter on canvas wrapper div (Mode A vs Mode B)
  useEffect(() => {
    const wrapper = canvasWrapperRef?.current;
    if (!wrapper) return;

    if (blur.mode === "A") {
      if (blur.blurPx > 0) {
        wrapper.style.filter = `blur(${blur.blurPx}px)`;
      } else {
        wrapper.style.filter = "none";
      }
    } else {
      // In Mode B, remove filter so GPU is 100% unencumbered
      wrapper.style.filter = "none";
    }

    return () => {
      if (wrapper) wrapper.style.filter = "none";
    };
  }, [blur, canvasWrapperRef]);

  // Eyelid offset: 0.0 (closed) to 1.0 (open)
  const topEyelidY = -wake.eyelidOpenPercent * 100;
  const bottomEyelidY = wake.eyelidOpenPercent * 100;

  // Scanline sweeps at p in [0.80, 1.00] (two sweeps, 300ms each)
  const isScanning = !reduceMotion && progress >= 0.80 && progress < 0.98;
  const scanSubProgress = isScanning ? ((progress - 0.80) / 0.18) * 2 : 0;
  const scanPosPercent = (scanSubProgress % 1.0) * 100;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      {/* ── 1. SOLID BLACK LAYER UNDERNEATH EYELIDS (Fades out during blinks) ── */}
      {wake.blackLayerOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-none"
          style={{ opacity: wake.blackLayerOpacity }}
        />
      )}

      {/* ── 2. MODE B SOFT-FOCUS OVERLAY (Fallback for Low Quality or Low FPS) ── */}
      {blur.mode === "B" && blur.overlayOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-multiply"
          style={{
            opacity: blur.overlayOpacity,
            background:
              "radial-gradient(ellipse at center, rgba(15,23,42,0.5) 0%, rgba(2,6,23,0.95) 80%)",
          }}
        />
      )}

      {/* ── 3. DOUBLE-IMAGE GHOSTING & COLOR FRINGING (When blur > 8px) ── */}
      {blur.hasDoubleImage && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
          style={{
            transform: "translate3d(6px, -4px, 0)",
            filter: "drop-shadow(-3px 0 2px rgba(0, 243, 255, 0.4)) drop-shadow(3px 0 2px rgba(255, 50, 50, 0.4))",
          }}
        />
      )}

      {/* ── 4. EYELID SHUTTERS (Two panels with curved organic edges) ── */}
      {wake.eyelidOpenPercent < 0.999 && (
        <>
          {/* Top Eyelid */}
          <div
            className="absolute top-0 left-0 right-0 h-1/2 bg-black will-change-transform"
            style={{
              transform: `translateY(${topEyelidY.toFixed(2)}%)`,
              borderBottomLeftRadius: "50% 25%",
              borderBottomRightRadius: "50% 25%",
              boxShadow: "0 15px 40px rgba(0,0,0,0.9)",
            }}
          />

          {/* Bottom Eyelid */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/2 bg-black will-change-transform"
            style={{
              transform: `translateY(${bottomEyelidY.toFixed(2)}%)`,
              borderTopLeftRadius: "50% 25%",
              borderTopRightRadius: "50% 25%",
              boxShadow: "0 -15px 40px rgba(0,0,0,0.9)",
            }}
          />
        </>
      )}

      {/* ── 5. CALIBRATION SCAN SWEEPS (p in 0.80 .. 1.00) ── */}
      {isScanning && (
        <div
          className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] pointer-events-none opacity-70"
          style={{ top: `${scanPosPercent}%` }}
        />
      )}

      {/* ── 6. WAKE HUD INDICATORS (Bottom-Left) ── */}
      {progress > 0.05 && (
        <div
          className="absolute bottom-6 left-6 font-mono text-xs tracking-widest z-40 flex flex-col gap-1 select-none pointer-events-none"
          aria-live="polite"
        >
          {progress < 0.80 ? (
            <div className="flex items-center gap-2 text-cyan-300/90 bg-black/60 px-2.5 py-1 rounded border border-cyan-500/30 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>VISION: {blur.visionPercent}%</span>
              {blur.mode === "B" && (
                <span className="text-[10px] text-cyan-500/70 border-l border-cyan-500/30 pl-1.5">[LOW-Q]</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-300 bg-black/75 px-3 py-1.5 rounded border border-amber-500/50 backdrop-blur-sm shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
              <span className="text-amber-400 text-sm">⚠</span>
              <span className="font-bold">VISION: 100% // NEURAL CORE: 3%</span>
            </div>
          )}
        </div>
      )}

      {/* ── 7. SUBTLE RETICLE IN CENTER DURING CALIBRATION (p >= 0.80) ── */}
      {progress >= 0.80 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
          <div className="relative w-8 h-8 border border-cyan-400/50 rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
