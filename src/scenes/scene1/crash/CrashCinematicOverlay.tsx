"use client";

import React, { useMemo } from "react";
import { CRASH_DURATION_MS, CRASH_CUTS } from "./types";
import { evaluateCameraPose } from "./math";

interface CrashCinematicOverlayProps {
  progress: number; // 0.0 to 1.0
  reduceMotion?: boolean;
}

export default function CrashCinematicOverlay({
  progress,
  reduceMotion = false,
}: CrashCinematicOverlayProps) {
  const timeMs = progress * CRASH_DURATION_MS;
  const evaluated = useMemo(
    () => evaluateCameraPose(progress, reduceMotion),
    [progress, reduceMotion]
  );

  // ─────────────────────────────────────────────────────────────
  // 1. WARNING HUD (1400 - 2000 ms)
  // ─────────────────────────────────────────────────────────────
  const showWarning = timeMs >= CRASH_CUTS.warning && timeMs < CRASH_CUTS.impact;

  // ─────────────────────────────────────────────────────────────
  // 2. PHOTOSENSITIVE-SAFE FULL-SCREEN FLASHES
  // Flash 1 at 2000ms: peak 65%, rise 40ms, fall 240ms
  // Flash 2 at 3700ms: peak 45%, rise 40ms, fall 240ms (1700ms interval)
  // ─────────────────────────────────────────────────────────────
  let flashAlpha = 0;
  let flashColor = "255, 240, 220"; // white-orange

  if (!reduceMotion) {
    if (timeMs >= 2000 && timeMs < 2300) {
      const dt = timeMs - 2000;
      if (dt < 40) {
        flashAlpha = (dt / 40) * 0.65;
      } else {
        flashAlpha = Math.max(0, 0.65 * (1 - (dt - 40) / 240));
      }
      flashColor = "255, 240, 220";
    } else if (timeMs >= 3700 && timeMs < 4000) {
      const dt = timeMs - 3700;
      if (dt < 40) {
        flashAlpha = (dt / 40) * 0.45;
      } else {
        flashAlpha = Math.max(0, 0.45 * (1 - (dt - 40) / 240));
      }
      flashColor = "255, 210, 210";
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. VISOR CRACK SVG (3700ms -> end)
  // ─────────────────────────────────────────────────────────────
  const showVisorCrack = timeMs >= CRASH_CUTS.second;
  // Draws over 160ms
  const crackProgress = Math.min(1, Math.max(0, (timeMs - CRASH_CUTS.second) / 160));
  const crackDashOffset = Math.round((1 - crackProgress) * 600);

  // ─────────────────────────────────────────────────────────────
  // 4. ROTATING RED EMERGENCY LIGHT SWEEP (4400 - 5000 ms)
  // ─────────────────────────────────────────────────────────────
  const showRedSweep = timeMs >= CRASH_CUTS.aftermath && timeMs < 5800;
  const sweepAngle = ((timeMs % 2400) / 2400) * 360;

  // ─────────────────────────────────────────────────────────────
  // 5. GLITCH SLICES (80ms each at 5150ms and 5450ms)
  // ─────────────────────────────────────────────────────────────
  const isGlitch1 = !reduceMotion && timeMs >= 5150 && timeMs < 5230;
  const isGlitch2 = !reduceMotion && timeMs >= 5450 && timeMs < 5530;
  const showGlitchSlices = isGlitch1 || isGlitch2;

  // ─────────────────────────────────────────────────────────────
  // 6. DEGRADE HUD (5000 - 5800 ms)
  // ─────────────────────────────────────────────────────────────
  const showDegradeAlert = timeMs >= CRASH_CUTS.degrade && timeMs < 5800;

  // ─────────────────────────────────────────────────────────────
  // 7. VIGNETTE CLOSING IN (100% -> 35% during degrade)
  // ─────────────────────────────────────────────────────────────
  let vignetteRadius = 100;
  if (timeMs >= CRASH_CUTS.degrade && timeMs < 5800) {
    const p = (timeMs - CRASH_CUTS.degrade) / 800;
    vignetteRadius = 100 - p * 65; // closes to 35%
  } else if (timeMs >= 5800) {
    vignetteRadius = 35;
  }

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden"
    >
      {/* ── 1. SCANLINES OVERLAY (4px repeating) ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 2px, transparent 2px, transparent 4px)",
        }}
      />

      {/* ── 2. DYNAMIC VIGNETTE ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) ${vignetteRadius * 0.7}%, rgba(0,0,0,0.95) ${vignetteRadius}%)`,
        }}
      />

      {/* ── 3. ROTATING EMERGENCY RED SWEEP ── */}
      {showRedSweep && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen transition-none"
          style={{
            background: `conic-gradient(from ${sweepAngle.toFixed(1)}deg at 50% 50%, rgba(255, 30, 45, 0.45) 0deg, transparent 90deg, transparent 360deg)`,
          }}
        />
      )}

      {/* ── 4. PHOTOSENSITIVE-SAFE FULL-SCREEN FLASH ── */}
      {flashAlpha > 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-none"
          style={{
            backgroundColor: `rgba(${flashColor}, ${flashAlpha.toFixed(3)})`,
          }}
        />
      )}

      {/* ── 5. VISOR CRACK SVG (Draws at 3700ms and holds) ── */}
      {showVisorCrack && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
        >
          {/* Main Visor Fracture Lines */}
          <path
            d="M 1240,0 L 1180,260 L 980,480 L 1020,540 L 890,720 L 780,1080"
            fill="none"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="3.5"
            strokeDasharray="600"
            strokeDashoffset={crackDashOffset}
            style={{ filter: "drop-shadow(0 0 6px rgba(0, 243, 255, 0.8))" }}
          />
          <path
            d="M 980,480 L 720,440 L 560,520 L 340,490"
            fill="none"
            stroke="rgba(255, 255, 255, 0.7)"
            strokeWidth="2.5"
            strokeDasharray="600"
            strokeDashoffset={crackDashOffset}
            style={{ filter: "drop-shadow(0 0 4px rgba(255, 50, 50, 0.8))" }}
          />
          <path
            d="M 1180,260 L 1420,290 L 1680,220"
            fill="none"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="2.0"
            strokeDasharray="600"
            strokeDashoffset={crackDashOffset}
          />
          <path
            d="M 890,720 L 1050,780 L 1280,840"
            fill="none"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="2.0"
            strokeDasharray="600"
            strokeDashoffset={crackDashOffset}
          />
        </svg>
      )}

      {/* ── 6. GLITCH SLICES (Horizontal strips offset by up to 12px) ── */}
      {showGlitchSlices && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/4 left-0 right-0 h-16 bg-cyan-500/15 mix-blend-difference"
            style={{ transform: "translateX(12px) skewX(4deg)" }}
          />
          <div
            className="absolute top-1/2 left-0 right-0 h-24 bg-red-500/20 mix-blend-difference"
            style={{ transform: "translateX(-10px) skewX(-3deg)" }}
          />
          <div
            className="absolute top-3/4 left-0 right-0 h-12 bg-amber-500/15 mix-blend-difference"
            style={{ transform: "translateX(8px)" }}
          />
        </div>
      )}

      {/* ── 7. WARNING HUD (1400 - 2000 ms) ── */}
      {showWarning && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-24 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-black/85 border-2 border-amber-400 text-amber-300 font-mono text-lg font-bold tracking-[0.25em] uppercase rounded shadow-[0_0_25px_rgba(255,184,0,0.6)] flex items-center gap-3 animate-pulse"
        >
          <span className="text-xl">▲</span>
          <span>PROXIMITY ALERT // IMPACT IMMINENT</span>
        </div>
      )}

      {/* ── 8. DEGRADE ALERT HUD (5000 - 5800 ms) ── */}
      {showDegradeAlert && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-24 left-1/2 -translate-x-1/2 z-40 px-6 py-2.5 bg-black/90 border border-red-500 text-red-400 font-mono text-base font-bold tracking-[0.2em] uppercase rounded shadow-[0_0_20px_rgba(239,68,68,0.7)] flex items-center gap-3 animate-pulse"
        >
          <span className="text-lg">✕</span>
          <span>VISUAL CORTEX: FAILING</span>
        </div>
      )}

      {/* ── 9. BLACK SCREEN OVERLAY (Fades in at end) ── */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-none"
        style={{
          opacity: evaluated.blackOpacity,
        }}
      />
    </div>
  );
}
