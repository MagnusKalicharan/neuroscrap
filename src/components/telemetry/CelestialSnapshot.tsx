"use client";

import React, { useState } from "react";
import type { TelemetryScan } from "./telemetryStore";

interface CelestialSnapshotProps {
  scan: TelemetryScan | null;
  className?: string;
  onExpand?: () => void;
}

export function CelestialSnapshot({ scan, className = "", onExpand }: CelestialSnapshotProps) {
  const [viewMode, setViewMode] = useState<"optical" | "gravity">("optical");

  if (!scan) {
    return (
      <div className={`relative w-full h-44 bg-black/60 rounded-lg border border-neutral-800 flex flex-col items-center justify-center text-neutral-500 text-xs p-4 ${className}`}>
        <span className="text-2xl mb-1.5 opacity-40">📷</span>
        <span className="font-mono text-[11px] tracking-wider uppercase text-neutral-400">NO TELEMETRY SCAN SELECTED</span>
        <span className="text-[10px] text-neutral-600 mt-0.5">Select a scan file from D:\ drive to view optical telemetry capture</span>
      </div>
    );
  }

  const isBlackHole = scan.category === "black_hole";
  const isPlanet = scan.category === "planet";
  const isStars = scan.category === "stars";

  const isKronos = scan.targetName.toLowerCase().includes("kronos") || scan.targetName.toLowerCase().includes("gas");
  const isIgnis = scan.targetName.toLowerCase().includes("ignis") || scan.targetName.toLowerCase().includes("lava") || scan.targetName.toLowerCase().includes("magma");
  const isGlacies = scan.targetName.toLowerCase().includes("glacies") || scan.targetName.toLowerCase().includes("ice");

  return (
    <div className={`relative w-full bg-black/90 rounded-lg border border-cyan-500/40 overflow-hidden shadow-[0_0_20px_rgba(25,240,255,0.15)] flex flex-col font-mono select-none ${className}`}>
      {/* ── Top Sensor Banner ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#09101a] border-b border-cyan-500/25 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-cyan-300 font-bold tracking-wider">
            OPTICAL CAM-03 // CAPTURE FRAME
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode((m) => (m === "optical" ? "gravity" : "optical"))}
            className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 transition-colors cursor-pointer"
          >
            {viewMode === "optical" ? "VISUAL" : "GRAV-GRID"}
          </button>
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
              title="Expand snapshot"
            >
              ⛶
            </button>
          )}
        </div>
      </div>

      {/* ── Viewport Area: The Photographic Telemetry Capture ───────── */}
      <div className="relative w-full h-40 sm:h-44 bg-[#03060a] overflow-hidden flex items-center justify-center">
        {/* Subtle scanline overlay on snapshot */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 opacity-30 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.6)_0px,rgba(0,0,0,0.6)_1px,transparent_1px,transparent_2px)]"
        />

        {/* Viewfinder Target Brackets (Camera HUD Overlay) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 z-20 border border-cyan-500/20 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
            <span className="text-[8px] text-cyan-400/80 tracking-widest pt-0.5">
              REC ● RAW 14-BIT
            </span>
            <span className="w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400" />
          </div>
          {/* Center Crosshair */}
          <div className="self-center flex items-center justify-center">
            <div className="w-6 h-6 border border-cyan-400/40 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-cyan-400/80 rounded-full" />
            </div>
          </div>
          <div className="flex justify-between items-end">
            <span className="w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
            <span className="text-[8px] text-neutral-400 tracking-wider pb-0.5">
              FOV: 42° // ISO 3200 // 1/8000s
            </span>
            <span className="w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />
          </div>
        </div>

        {/* Render Actual In-Game Captured Screenshot if available */}
        {scan.imageDataUrl && viewMode === "optical" ? (
          <img
            src={scan.imageDataUrl}
            alt={scan.targetName}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            {/* ── A. Black Hole Celestial Visual (Gargantua Singularity) ── */}
            {isBlackHole && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Deep Space Background Stars */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0b121e_0%,_#020408_80%)]" />

            {/* Relativistic Accretion Disk (Upper & Lower Lensed Halo) */}
            <div
              className={`absolute w-36 h-36 rounded-full transition-all duration-700 ${
                viewMode === "gravity"
                  ? "border border-red-500 shadow-[0_0_40px_#ef4444]"
                  : "bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-300 blur-[2px] opacity-90 shadow-[0_0_50px_rgba(245,158,11,0.8)]"
              }`}
            />

            {/* Accretion Disk Equator (Doppler Beaming - brighter on left) */}
            <div
              className="absolute w-48 h-10 rounded-[100%] bg-gradient-to-r from-yellow-100 via-amber-500 to-red-600 opacity-95 shadow-[0_0_35px_rgba(251,191,36,0.9)] transform -rotate-12"
              style={{
                background:
                  viewMode === "gravity"
                    ? "repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 2px, transparent 2px, transparent 6px)"
                    : undefined,
              }}
            />

            {/* Photon Sphere Pure Ring */}
            <div className="absolute w-20 h-20 rounded-full border-2 border-yellow-200/90 shadow-[0_0_20px_#fef08a]" />

            {/* Pure Pitch Black Event Horizon */}
            <div className="absolute w-16 h-16 rounded-full bg-black shadow-[inset_0_0_15px_rgba(0,0,0,1)] border border-neutral-900 z-10 flex items-center justify-center">
              <span className="text-[7px] text-red-400/90 tracking-tighter opacity-70">
                0.98 G
              </span>
            </div>

            {/* Target Label */}
            <div className="absolute top-2 left-3 z-20 text-[9px] text-amber-400 font-bold bg-black/60 px-1.5 py-0.5 rounded border border-amber-500/30">
              TARGET: GARGANTUA SINGULARITY
            </div>
          </div>
        )}

        {/* ── B. Planetary Celestial Visual (Gas Giant / Magma / Ice) ── */}
        {isPlanet && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Deep Space Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#081422_0%,_#020408_85%)]" />

            {/* 1. Kronos Prime (Ringed Gas Giant) */}
            {isKronos || (!isIgnis && !isGlacies) ? (
              <div className="relative flex items-center justify-center">
                {/* Planetary Rings */}
                <div
                  className="absolute w-52 h-14 rounded-[100%] border-4 border-amber-300/60 shadow-[0_0_25px_rgba(245,158,11,0.5)] transform -rotate-[24deg] z-10 pointer-events-none"
                  style={{
                    boxShadow: "0 0 15px rgba(251,191,36,0.4), inset 0 0 15px rgba(217,119,6,0.5)",
                    borderTopColor: "rgba(253, 230, 138, 0.9)",
                  }}
                />
                {/* Planet Body with Atmospheric Banding */}
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.3),inset_-10px_-10px_25px_rgba(0,0,0,0.9)] z-0"
                  style={{
                    background:
                      viewMode === "gravity"
                        ? "repeating-linear-gradient(0deg, #0284c7 0px, #0284c7 3px, #082f49 3px, #082f49 8px)"
                        : "linear-gradient(135deg, #fcd34d 0%, #d97706 25%, #0284c7 45%, #0369a1 60%, #1e293b 85%, #090d16 100%)",
                  }}
                >
                  {/* Atmospheric cloud bands */}
                  <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.4)_0px,rgba(255,255,255,0.4)_2px,transparent_2px,transparent_6px)] transform -rotate-[24deg]" />
                </div>
                <div className="absolute top-2 left-3 z-20 text-[9px] text-cyan-300 font-bold bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  TARGET: GAS GIANT
                </div>
              </div>
            ) : isIgnis ? (
              /* 2. Ignis-IV (Molten Magma Moon) */
              <div className="relative flex items-center justify-center">
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden shadow-[0_0_35px_rgba(239,68,68,0.5),inset_-8px_-8px_20px_rgba(0,0,0,0.95)]"
                  style={{
                    background:
                      viewMode === "gravity"
                        ? "radial-gradient(circle, #ea580c 0%, #7c2d12 70%, #000 100%)"
                        : "radial-gradient(circle at 35% 35%, #f97316 0%, #c2410c 35%, #451a03 70%, #180802 100%)",
                  }}
                >
                  {/* Lava fissure veins */}
                  <div className="absolute inset-0 opacity-80 bg-[radial-gradient(ellipse_at_30%_40%,_#fef08a_0%,_transparent_25%),linear-gradient(45deg,transparent_45%,#f97316_48%,#fef08a_50%,#f97316_52%,transparent_55%)]" />
                </div>
                <div className="absolute top-2 left-3 z-20 text-[9px] text-orange-400 font-bold bg-black/60 px-1.5 py-0.5 rounded border border-orange-500/30">
                  TARGET: LAVA PLANET
                </div>
              </div>
            ) : (
              /* 3. Glacies-VII (Crystalline Ice World) */
              <div className="relative flex items-center justify-center">
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.5),inset_-8px_-8px_20px_rgba(0,0,0,0.9)]"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 35%, #a5f3fc 0%, #06b6d4 40%, #0e7490 70%, #082f49 100%)",
                  }}
                >
                  {/* Polar ice rift pattern */}
                  <div className="absolute inset-0 opacity-60 bg-[repeating-radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.7)_0px,transparent_4px,rgba(255,255,255,0.4)_8px)]" />
                </div>
                <div className="absolute top-2 left-3 z-20 text-[9px] text-cyan-300 font-bold bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  TARGET: ICE PLANET
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── C. Distant Stellar Void (Faint Stars / Deep Space) ──────── */}
        {isStars && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Deep Space Background with Cosmic Dust Nebula Filaments */}
            <div className="absolute inset-0 bg-[#020306]" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(circle at 70% 30%, rgba(99,102,241,0.2) 0%, transparent 50%), radial-gradient(circle at 30% 70%, rgba(20,184,166,0.15) 0%, transparent 50%)",
              }}
            />

            {/* Scattered Starfield Points (Simulating authentic deep field astrophotography) */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 160">
              {/* Brighter foreground guide stars with diffraction spikes */}
              <g className="animate-pulse">
                <circle cx="150" cy="80" r="2.2" fill="#e0f2fe" />
                <line x1="144" y1="80" x2="156" y2="80" stroke="#bae6fd" strokeWidth="0.8" opacity="0.8" />
                <line x1="150" y1="74" x2="150" y2="86" stroke="#bae6fd" strokeWidth="0.8" opacity="0.8" />
              </g>
              <g>
                <circle cx="85" cy="40" r="1.8" fill="#fef08a" />
                <line x1="81" y1="40" x2="89" y2="40" stroke="#fef08a" strokeWidth="0.6" opacity="0.7" />
                <line x1="85" y1="36" x2="85" y2="44" stroke="#fef08a" strokeWidth="0.6" opacity="0.7" />
              </g>
              <circle cx="230" cy="115" r="1.6" fill="#fbcfe8" />
              <circle cx="60" cy="120" r="1.2" fill="#ffffff" />
              <circle cx="210" cy="35" r="1.4" fill="#bae6fd" />
              <circle cx="120" cy="130" r="1.0" fill="#ffffff" />
              <circle cx="180" cy="45" r="1.1" fill="#fef08a" />
              <circle cx="35" cy="70" r="0.9" fill="#ffffff" />
              <circle cx="265" cy="75" r="1.1" fill="#bae6fd" />

              {/* Faint distant stellar background (near-zero gravity) */}
              {[
                [20, 25], [45, 95], [75, 75], [95, 110], [110, 20], [135, 60],
                [165, 115], [175, 25], [195, 90], [220, 65], [245, 20], [255, 135],
                [280, 50], [285, 105], [140, 140], [160, 10], [50, 45], [235, 145]
              ].map(([x, y], idx) => (
                <circle key={idx} cx={x} cy={y} r="0.6" fill="#cbd5e1" opacity="0.65" />
              ))}
            </svg>

            {/* Target Label */}
            <div className="absolute top-2 left-3 z-20 text-[9px] text-neutral-300 font-bold bg-black/60 px-1.5 py-0.5 rounded border border-neutral-700">
              TARGET: DISTANT STELLAR VOID (ZERO-G)
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* ── Bottom Telemetry Optical Metadata Bar ────────────────────── */}
      <div className="p-2.5 bg-[#080d15] border-t border-cyan-500/20 text-[11px] space-y-1">
        <div className="flex items-center justify-between text-neutral-300">
          <span className="font-bold text-white truncate max-w-[200px]">{scan.targetName}</span>
          <span className="text-[10px] text-cyan-400 font-mono">
            FILE: {scan.filename}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-400 pt-0.5">
          <div>
            GRAVITY: <span className="text-cyan-300 font-bold">{scan.gravity} G</span>
          </div>
          <div>
            ELEV: <span className="text-amber-300 font-bold">{scan.elevationDeg.toFixed(1)}°</span>
          </div>
          <div>
            AZIM: <span className="text-emerald-300 font-bold">{scan.azimuthDeg.toFixed(1)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CelestialSnapshot;
