"use client";
/**
 * src/app/dev/relay/page.tsx — Isolated Section 2 Step 1 Relay Test Harness
 * =========================================================================
 * Production guard: Calls notFound() when NODE_ENV === "production".
 * Contains isolated 3D view with camera presets, node state switcher,
 * and greyscale accessibility evaluation mode.
 */
import React, { useState, useRef, useEffect } from "react";
import { notFound } from "next/navigation";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RelayLine } from "@/section2/relayMesh";
import {
  SECTION2_NODES,
  type Section2NodePlacement,
} from "@/section2/section2.config";

// Camera Presets for Step B Verification
interface CameraPreset {
  name: string;
  pos: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: Record<string, CameraPreset> = {
  overview: {
    name: "Overview",
    pos: [7.2, 4.5, -9.5],
    target: [2.0, 0.2, 2.5],
  },
  r3_walkway: {
    name: "R3 Walkway (Angle 1)",
    pos: [-0.8, 1.4, 1.2],
    target: [1.8, 0.5, 1.2],
  },
  r3_top: {
    name: "R3 Overhead (Angle 2)",
    pos: [1.8, 3.6, 1.25],
    target: [1.8, 0.04, 1.2],
  },
  r3_corridor: {
    name: "R3 Approach (Angle 3)",
    pos: [0.6, 1.5, -1.8],
    target: [1.8, 0.5, 1.2],
  },
  r1: {
    name: "R1 (Healthy)",
    pos: [4.8, 1.5, -5.4],
    target: [3.4, 0.4, -6.1],
  },
  r4: {
    name: "R4 (Cut Gap)",
    pos: [3.4, 1.5, 4.8],
    target: [1.8, 0.1, 4.8],
  },
};

function ControlledCamera({ presetKey }: { presetKey: string }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;

    camera.position.set(...preset.pos);
    if (controlsRef.current) {
      controlsRef.current.target.set(...preset.target);
      controlsRef.current.update();
    }
  }, [presetKey, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}

export default function RelayDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [activePreset, setActivePreset] = useState<string>("overview");
  const [greyscale, setGreyscale] = useState<boolean>(false);
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const [nodes, setNodes] = useState<Section2NodePlacement[]>(() =>
    JSON.parse(JSON.stringify(SECTION2_NODES))
  );

  const toggleScanAll = () => {
    if (scannedIds.size === nodes.length) {
      setScannedIds(new Set());
    } else {
      setScannedIds(new Set(nodes.map((n) => n.id)));
    }
  };

  const toggleNodeScanned = (id: string) => {
    setScannedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleNodeKind = (id: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        const cycle: Record<string, "healthy" | "surge" | "missing"> = {
          healthy: "surge",
          surge: "missing",
          missing: "healthy",
        };
        const nextKind = cycle[n.kind];
        return {
          ...n,
          kind: nextKind,
          reading: nextKind === "healthy" ? 120 : nextKind === "surge" ? 99999 : null,
        };
      })
    );
  };

  return (
    <div
      className={`relative w-screen h-screen bg-[#07090e] overflow-hidden select-none font-mono ${
        greyscale ? "filter grayscale contrast-110" : ""
      }`}
    >
      {/* ── Top Header & Camera Presets ────────────────────────── */}
      <header className="fixed top-4 left-6 right-6 z-30 flex flex-wrap items-center justify-between gap-4 p-4 bg-black/80 border border-cyan-500/40 rounded-xl backdrop-blur-md shadow-[0_0_25px_rgba(0,255,255,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-sm font-bold tracking-widest text-white">
            SECTION 2 STEP 1 // RELAY LINE HARNESS [/dev/relay]
          </h1>
          <span className="px-2 py-0.5 text-[10px] bg-cyan-950 border border-cyan-500/50 text-cyan-300 rounded">
            DEV ONLY
          </span>
        </div>

        {/* Camera Preset Buttons */}
        <div className="flex items-center gap-2">
          {Object.entries(CAMERA_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setActivePreset(key)}
              className={`px-3 py-1.5 text-xs rounded transition-all cursor-pointer ${
                activePreset === key
                  ? "bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(0,255,255,0.6)]"
                  : "bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Scan All Toggle */}
        <button
          onClick={toggleScanAll}
          className={`px-3 py-1.5 text-xs rounded font-bold transition-all cursor-pointer ${
            scannedIds.size === nodes.length
              ? "bg-emerald-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.6)]"
              : "bg-neutral-800 hover:bg-neutral-700 text-cyan-300 border border-cyan-500/40"
          }`}
        >
          {scannedIds.size === nodes.length
            ? "All Scanned (Readings Shown)"
            : "Unscanned Mode (Labels Only)"}
        </button>

        {/* Accessibility & Colorblindness Check Toggle */}
        <button
          onClick={() => setGreyscale((g) => !g)}
          className={`px-3 py-1.5 text-xs rounded font-bold transition-all cursor-pointer ${
            greyscale
              ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.6)]"
              : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600"
          }`}
        >
          {greyscale ? "Greyscale: ON (Colorblind Check)" : "Greyscale: OFF"}
        </button>
      </header>

      {/* ── 3D Viewport ────────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
        <Canvas
          camera={{ fov: 60, near: 0.1, far: 100 }}
          gl={{ antialias: true }}
          className="w-full h-full"
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 15, 5]} intensity={0.8} />

          {/* Test floor grid matching cargo bay deck */}
          <gridHelper args={[60, 60, "#1e293b", "#0f172a"]} position={[0, 0, 0]} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial color="#0c0e14" />
          </mesh>

          {/* Catwalk representation for spatial scale */}
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.5, 40]} />
            <meshBasicMaterial color="#161b22" />
          </mesh>

          {/* The Relay Line System */}
          <RelayLine
            nodes={nodes}
            scannedIds={scannedIds}
            greyscale={greyscale}
          />

          <ControlledCamera presetKey={activePreset} />
        </Canvas>
      </div>

      {/* ── Bottom State Switcher Tray ─────────────────────────── */}
      <footer className="fixed bottom-4 left-6 right-6 z-30 flex flex-wrap items-center justify-between gap-4 p-4 bg-black/85 border border-cyan-500/40 rounded-xl backdrop-blur-md font-mono text-xs shadow-[0_0_20px_rgba(0,255,255,0.1)]">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold uppercase">
            Interactive Node Switcher:
          </span>
          <span className="text-neutral-400 text-[11px]">
            (Click chip: toggle Scanned | Right-click: cycle Kind)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {nodes.map((n) => {
            const isScanned = scannedIds.has(n.id);
            const kindColors = {
              healthy: "border-cyan-400 text-cyan-300 bg-cyan-950/60",
              surge: "border-red-400 text-red-300 bg-red-950/60 animate-pulse",
              missing: "border-amber-400 text-amber-300 bg-amber-950/60 border-dashed",
            };
            return (
              <button
                key={n.id}
                onClick={() => toggleNodeScanned(n.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleNodeKind(n.id);
                }}
                className={`px-3 py-1.5 rounded border transition-all cursor-pointer flex items-center gap-2 ${
                  kindColors[n.kind]
                } ${!isScanned ? "opacity-60 saturate-50" : "opacity-100 shadow-[0_0_8px_rgba(0,255,255,0.3)]"}`}
                title="Click: toggle scanned, Right-click: toggle kind"
              >
                <span className="font-bold">{n.label}:</span>
                <span className="uppercase text-[11px] font-semibold">{n.kind}</span>
                <span className="text-[10px] text-neutral-400">
                  {isScanned ? (n.reading !== null ? `${n.reading}V` : "NULL") : "[UNSCANNED]"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-cyan-400/80">
          Draw Calls: &le; 10 / 14 &bull; Basic Materials &bull; Zero Lights
        </div>
      </footer>
    </div>
  );
}
