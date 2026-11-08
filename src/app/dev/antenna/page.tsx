"use client";

/**
 * /dev/antenna — Roof Comms Array Development & Verification Harness
 * ===================================================================
 * Verifies the high-quality damaged comms array in isolation and in ship context:
 * - Angles 1 to 5 camera presets.
 * - Greyscale silhouette toggle (Test 1).
 * - State switchers ("dead" | "powering" | "aligning" | "transmitting").
 * - Cable pulse and target sliders.
 * - Ship hull context toggle with real cargo bay breach opening.
 * 
 * Must call notFound() in production!
 */

import React, { useState, Suspense, useRef } from "react";
import { notFound } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { AntennaMesh } from "@/props/antenna/AntennaMesh";
import {
  type AntennaState,
  setAntennaState,
  setCablePulse,
} from "@/props/antenna/antenna.types";
import { ANTENNA_WORLD_POS } from "@/props/antenna/antenna.config";
import { SpaceshipWreck } from "@/components/SpaceshipWreck";

type ViewPreset = "spawn" | "riser" | "lowAngle" | "closeup" | "outside";

const PRESET_CAMERAS: Record<
  ViewPreset,
  { pos: [number, number, number]; target: [number, number, number]; name: string }
> = {
  // (1) Looking up from spawn point through the open roof breach
  spawn: {
    pos: [-3.5, 1.8, -1.5],
    target: [2.2, 11.2, 13.6],
    name: "1. Spawn View (Through Roof)",
  },
  // (2) From relay node R6 looking down at the antenna base, cable gland, and deck run
  riser: {
    pos: [2.2, 2.2, 10.0],
    target: [2.2, 0.4, 13.6],
    name: "2. From Relay R6 (Base & Gland)",
  },
  // (3) Low-angle side view matching the user's screenshot
  lowAngle: {
    pos: [1.2, 1.2, 9.8],
    target: [2.2, 11.0, 13.6],
    name: "3. Low-Angle Side (Screenshot Match)",
  },
  // (4) Close-up of dish face, ribs, rim dent, and feedhorn (front-facing view)
  closeup: {
    pos: [1.2, 12.0, 10.0],
    target: [2.2, 11.4, 13.6],
    name: "4. Dish Face & Feedhorn Close-Up",
  },
  // (5) Full exterior view of ship hull and array
  outside: {
    pos: [12.0, 20.0, 18.0],
    target: [2.2, 11.0, 13.6],
    name: "5. Exterior Hull View",
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
      maxDistance={45}
      minDistance={0.5}
      target={PRESET_CAMERAS[preset].target}
    />
  );
}

export default function AntennaDevPage() {
  // Strict Production 404 Guard
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [activePreset, setActivePreset] = useState<ViewPreset>("lowAngle");
  const [greyscale, setGreyscale] = useState(false);
  const [showShip, setShowShip] = useState(true);
  const [state, setState] = useState<AntennaState>("dead");
  const [pulse, setPulse] = useState(0.0);

  const handleStateChange = (nextState: AntennaState) => {
    setState(nextState);
    setAntennaState(nextState);
  };

  const handlePulseChange = (val: number) => {
    setPulse(val);
    setCablePulse(val);
  };

  return (
    <div className="relative w-screen h-screen bg-[#020306] text-white font-mono select-none overflow-hidden">
      {/* ── Top Header & Test Controls ─────────────────────────────── */}
      <div className="fixed top-3 left-4 right-4 z-50 bg-[#090e15]/90 border border-cyan-500/40 backdrop-blur-md px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl">
        <div className="flex items-center gap-2.5 font-bold text-cyan-400">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>/dev/antenna // ROOF COMMS ARRAY HARNESS</span>
        </div>

        {/* View Presets (Angles 1 to 5) */}
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
            SHIP HULL: {showShip ? "SHOWN" : "HIDDEN"}
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
      <div className="w-full h-full">
        <Canvas
          camera={{
            position: PRESET_CAMERAS.lowAngle.pos,
            fov: 65,
            near: 0.1,
            far: 120,
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
                position={[10, 25, 10]}
                intensity={greyscale ? 0.5 : 1.2}
                color={greyscale ? "#ffffff" : "#cde9ff"}
              />
            </>
          )}

          {/* Starfield points for silhouette contrast */}
          <points>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array(
                    Array.from({ length: 600 * 3 }, () => (Math.random() - 0.5) * 80)
                  ),
                  3,
                ]}
              />
            </bufferGeometry>
            <pointsMaterial size={1.2} color="#ffffff" sizeAttenuation={false} />
          </points>

          <Suspense fallback={null}>
            {/* The Antenna Component at its real world position */}
            <AntennaMesh
              position={[ANTENNA_WORLD_POS.x, ANTENNA_WORLD_POS.y, ANTENNA_WORLD_POS.z]}
              state={state}
              greyscale={greyscale}
            />

            {/* Mock Node R6 Box at [2.1, 0.04, 11.4] to visually verify no overlap */}
            {showShip && (
              <group position={[2.1, 0.28, 11.4]} rotation={[0, -0.22, 0]}>
                <mesh>
                  <boxGeometry args={[0.7, 0.48, 0.7]} />
                  <meshBasicMaterial color={greyscale ? "#222222" : "#10141a"} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                  <planeGeometry args={[0.62, 0.62]} />
                  <meshBasicMaterial color={greyscale ? "#555555" : "#00e5ff"} />
                </mesh>
              </group>
            )}

            {/* Starship Wreck Environment (Breach & Ceiling Ribs) */}
            {showShip && (
              <SpaceshipWreck
                quality="high"
                reducedMotion={false}
              />
            )}

            {!showShip && (
              <gridHelper
                args={[30, 30, greyscale ? "#333333" : "#0e2238", greyscale ? "#1a1a1a" : "#071220"]}
                position={[2.2, 0.04, 11.8]}
              />
            )}

            <ControlledCamera preset={activePreset} />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Bottom State & Pulse Controls Tray ─────────────────────── */}
      <div className="fixed bottom-3 left-4 right-4 z-50 bg-[#090e15]/90 border border-cyan-500/40 backdrop-blur-md px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl font-mono">
        {/* State Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 font-bold">STATE:</span>
          {(["dead", "powering", "aligning", "transmitting"] as AntennaState[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStateChange(s)}
              className={`px-3 py-1 rounded border font-bold uppercase transition-all cursor-pointer ${
                state === s
                  ? s === "transmitting"
                    ? "bg-emerald-950 border-emerald-400 text-emerald-300"
                    : s === "aligning"
                    ? "bg-amber-950 border-amber-400 text-amber-300"
                    : s === "powering"
                    ? "bg-sky-950 border-sky-400 text-sky-300"
                    : "bg-cyan-950 border-cyan-400 text-cyan-300"
                  : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Cable Pulse Slider */}
        <div className="flex items-center gap-3">
          <span className="text-neutral-400 font-bold">CABLE PULSE:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={pulse}
            onChange={(e) => handlePulseChange(parseFloat(e.target.value))}
            className="w-36 accent-cyan-400 cursor-pointer"
          />
          <span className="w-10 text-cyan-300 text-right">{(pulse * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
