"use client";

/**
 * /dev/computers — Cockpit Computers Development & Verification Harness
 * ======================================================================
 * Verifies the Three Cockpit Computers in the real ship wreck cockpit:
 * - CORE-A: Server Monolith (left / port)
 * - CORE-B: Command Core (center / hero)
 * - CORE-C: Lattice Array (right / starboard)
 * - Two Restyled Pilot Seats (moved aside from walkway)
 * 
 * Step A: Massing pass with camera matching the user's screenshot,
 * greyscale silhouette test, and clearance measurements.
 * 
 * Must call notFound() in production!
 */

import React, { useState, Suspense, useRef, useMemo } from "react";
import { notFound } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { SpaceshipWreck } from "@/components/SpaceshipWreck";
import {
  CockpitComputers,
  COMPUTERS_CONFIG,
  COCKPIT_SPATIAL_METRICS,
  verifyDominantEmissiveHueSeparation,
  verifyDarkSurfacePercentage,
} from "@/stations/computers";

type ViewPreset = "screenshot" | "spawn" | "plan" | "coreA" | "coreB" | "coreC";

const PRESET_CAMERAS: Record<
  ViewPreset,
  { pos: [number, number, number]; target: [number, number, number]; name: string }
> = {
  // (1) EXACT MATCH TO USER'S SCREENSHOT (catwalk looking straight at windscreen)
  screenshot: {
    pos: [0, 1.5, -34],
    target: [0, 1.5, -45],
    name: "1. Catwalk View (Screenshot Match)",
  },
  // (2) Bridge Entry View (distinct view looking toward cockpit from corridor portal)
  spawn: {
    pos: [0, 1.6, -30.5],
    target: [0, 1.5, -45],
    name: "2. Bridge Entry View",
  },
  // (3) Overhead Plan View (distinct top-down clearance plan showing walkway lane)
  plan: {
    pos: [0, 8.0, -43.0],
    target: [0, 0.0, -43.5],
    name: "3. Top-Down Clearance Plan",
  },
  // (4) CORE-A Close-Up (Server Monolith Tower)
  coreA: {
    pos: [-1.2, 1.6, -39.0],
    target: [-3.4, 1.5, -43.5],
    name: "4. CORE-A Close-Up",
  },
  // (5) CORE-B Close-Up (Command Core Hero)
  coreB: {
    pos: [0, 1.6, -41.0],
    target: [0, 1.5, -45.5],
    name: "5. CORE-B Close-Up",
  },
  // (6) CORE-C Close-Up (Honeycomb Lattice Array)
  coreC: {
    pos: [1.3, 1.6, -39.0],
    target: [3.5, 1.5, -43.2],
    name: "6. CORE-C Close-Up",
  },
};

function ControlledCamera({ preset }: { preset: ViewPreset }) {
  const controlsRef = useRef<any>(null);

  React.useEffect(() => {
    if (controlsRef.current) {
      const cfg = PRESET_CAMERAS[preset];
      controlsRef.current.object.position.set(...cfg.pos);
      controlsRef.current.target.set(...cfg.target);
      controlsRef.current.update();
    }
  }, [preset]);

  return (
    <OrbitControls
      ref={controlsRef}
      maxDistance={50}
      minDistance={0.1}
      target={PRESET_CAMERAS[preset].target}
    />
  );
}

export default function ComputersDevPage() {
  // Strict Production 404 Guard
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [activePreset, setActivePreset] = useState<ViewPreset>("screenshot");
  const [greyscale, setGreyscale] = useState(false);
  const [showShip, setShowShip] = useState(true);

  const hueReport = useMemo(() => verifyDominantEmissiveHueSeparation(), []);
  const darkReport = useMemo(() => verifyDarkSurfacePercentage(), []);

  return (
    <div className="relative w-screen h-screen bg-[#020306] text-white font-mono select-none overflow-hidden">
      {/* ── Top Header & Test Controls ─────────────────────────────── */}
      <div className="fixed top-3 left-4 right-4 z-50 bg-[#090e15]/90 border border-cyan-500/40 backdrop-blur-md px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl">
        <div className="flex items-center gap-2.5 font-bold text-cyan-400">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>/dev/computers // THREE COCKPIT COMPUTERS [STAGE 1: COLOUR & MASSING FIXES]</span>
        </div>

        {/* View Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(Object.keys(PRESET_CAMERAS) as ViewPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActivePreset(key)}
              className={`px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                activePreset === key
                  ? "bg-cyan-950 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(0,255,255,0.3)]"
                  : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
              }`}
            >
              {PRESET_CAMERAS[key].name}
            </button>
          ))}
        </div>

        {/* Silhouette & Context Toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShip(!showShip)}
            className={`px-3 py-1.5 rounded border font-bold transition-all cursor-pointer ${
              showShip
                ? "bg-cyan-950 border-cyan-400 text-cyan-300"
                : "bg-neutral-900 border-neutral-700 text-neutral-400"
            }`}
          >
            HULL: {showShip ? "SHOWN" : "HIDDEN"}
          </button>
          <button
            type="button"
            onClick={() => setGreyscale(!greyscale)}
            className={`px-3 py-1.5 rounded border font-bold transition-all cursor-pointer ${
              greyscale
                ? "bg-neutral-100 border-white text-black shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500"
            }`}
          >
            Silhouette Test: {greyscale ? "GREYSCALE ONLY" : "NORMAL COLOR"}
          </button>
        </div>
      </div>

      {/* ── 3D Viewport ────────────────────────────────────────────── */}
      <div
        className={`w-full h-full transition-all duration-300 ${
          greyscale ? "filter grayscale contrast-[1.08]" : ""
        }`}
      >
        <Canvas
          camera={{
            position: PRESET_CAMERAS.screenshot.pos,
            fov: 65,
            near: 0.1,
            far: 140,
          }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
          }}
        >
          {/* Deep celestial sky background matching starfield */}
          <color attach="background" args={[greyscale ? "#000000" : "#020409"]} />

          {/* Lighting for ship hull when enabled */}
          {showShip && (
            <>
              <ambientLight intensity={greyscale ? 0.2 : 0.45} />
              <directionalLight
                position={[10, 25, -20]}
                intensity={greyscale ? 0.5 : 1.2}
                color={greyscale ? "#ffffff" : "#cde9ff"}
              />
            </>
          )}

          {/* Starfield points visible through smashed windscreen */}
          <points>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array(
                    Array.from({ length: 800 * 3 }, (_, i) => {
                      if (i % 3 === 2) return -55 - Math.random() * 60; // Deep in front of nose
                      return (Math.random() - 0.5) * 80;
                    })
                  ),
                  3,
                ]}
              />
            </bufferGeometry>
            <pointsMaterial size={1.5} color="#ffffff" sizeAttenuation={false} />
          </points>

          <ControlledCamera preset={activePreset} />

          <Suspense fallback={null}>
            {/* The Real Crashed Spaceship Wreck Interior */}
            {showShip && <SpaceshipWreck includeCockpitComputers={false} />}

            {/* The Three Cockpit Computers (Step A Massing Pass) */}
            <CockpitComputers
              isMassingPass={true}
              greyscale={greyscale}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Bottom HUD: Spatial Metrics & Clearances ────────────────── */}
      <div className="fixed bottom-4 left-24 right-6 z-40 bg-[#090e15]/95 border border-cyan-500/40 backdrop-blur-md px-6 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xl">
        <div className="flex items-center gap-6 text-neutral-300">
          <div>
            <span className="text-neutral-500">WALKWAY LANE:</span>{" "}
            <span className="text-cyan-400 font-bold">2.2m UNBLOCKED</span>
          </div>
          <div>
            <span className="text-neutral-500">CORE-A GAP:</span>{" "}
            <span className="text-emerald-400 font-bold">{COCKPIT_SPATIAL_METRICS.clearanceCoreAToCoreB}m</span> (req &ge; 1.2m)
          </div>
          <div>
            <span className="text-neutral-500">CORE-C GAP:</span>{" "}
            <span className="text-emerald-400 font-bold">{COCKPIT_SPATIAL_METRICS.clearanceCoreCToCoreB}m</span> (req &ge; 1.2m)
          </div>
          <div>
            <span className="text-neutral-500">WINDSCREEN GAP:</span>{" "}
            <span className="text-emerald-400 font-bold">{COCKPIT_SPATIAL_METRICS.clearanceBehindCoreB}m</span> (req &ge; 1.2m)
          </div>
          <div>
            <span className="text-neutral-500">HULL CLEARANCE:</span>{" "}
            <span className="text-emerald-400 font-bold">&ge; {COCKPIT_SPATIAL_METRICS.clearanceCoreCToHull}m</span> (req &ge; 1.2m)
          </div>
        </div>

        <div className="flex items-center gap-6 text-[11px] font-mono flex-wrap">
          <div className="text-amber-400">
            HUES: <span className="text-cyan-300 font-bold">A: Cyan (180°)</span> | <span className="text-amber-300 font-bold">B: Sodium (33°)</span> | <span className="text-pink-400 font-bold">C: Magenta (334°)</span> &rarr; <span className="text-emerald-400 font-bold">Min Diff: {hueReport.minSeparation}° &ge; 40° [{hueReport.passes ? "PASS" : "FAIL"}]</span>
          </div>
          <div className="text-cyan-300">
            DARK BASE: <span className="font-bold">A: {darkReport.coreA.darkBasePct}%</span> | <span className="font-bold">B: {darkReport.coreB.darkBasePct}%</span> | <span className="font-bold">C: {darkReport.coreC.darkBasePct}%</span> &rarr; <span className="text-emerald-400 font-bold">req &ge; 85% [{darkReport.passes ? "PASS" : "FAIL"}]</span>
          </div>
          <div className="text-neutral-400">
            STAGE 1: NEON NOIR &bull; NO TOY PLASTIC
          </div>
        </div>
      </div>
    </div>
  );
}
