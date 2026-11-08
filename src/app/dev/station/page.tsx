"use client";

/**
 * /dev/station — 3D Data Station Development & Verification Harness
 * ===================================================================
 * Test page for verifying the Data Station prop, wrap-around monitors,
 * screen canvas textures, docking camera ease, and state transitions.
 * 
 * Must call notFound() in production!
 */

import React, { useState, Suspense, useRef, useEffect } from "react";
import { notFound } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DataStation } from "@/stations/dataStation/DataStation";
import { type StationScreenState } from "@/stations/dataStation/dataStation.screens";
import { usePendriveStore, pendriveStore } from "@/ui/terminal/pendriveStore";
import { onStationUploaded, type StationUploadedEvent } from "@/stations/dataStation/dataStation.events";
import { PendriveTerminal } from "@/ui/terminal/PendriveTerminal";
import { telemetryStore } from "@/components/telemetry/telemetryStore";

export default function DataStationDevPage() {
  // Must return 404 in production environment
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [reducedMotion, setReducedMotion] = useState(false);
  const [lastUploadedEvent, setLastUploadedEvent] = useState<StationUploadedEvent | null>(null);
  const [inputLockedStatus, setInputLockedStatus] = useState(false);
  const [devPrompt, setDevPrompt] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const { hasPendrive } = usePendriveStore();

  // Listen to station upload events
  useEffect(() => {
    return onStationUploaded((ev) => {
      setLastUploadedEvent(ev);
    });
  }, []);

  // Listen to telemetryStore terminal state
  useEffect(() => {
    return telemetryStore.subscribe(() => {
      setTerminalOpen(telemetryStore.getState().terminalOpen);
    });
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#05070a] text-white font-mono overflow-hidden select-none">
      {/* ── Top Test Controls Bar ───────────────────────────────────── */}
      <div className="fixed top-3 left-4 right-4 z-50 bg-[#0a1410]/90 border border-emerald-500/40 backdrop-blur-md px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl">
        <div className="flex items-center gap-2 font-bold text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>/dev/station 3D DATA STATION HARNESS</span>
        </div>

        {/* Interactive Testing Toggles */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => pendriveStore.setHasPendrive(!hasPendrive)}
            className={`px-3 py-1.5 rounded border font-bold transition-all cursor-pointer ${
              hasPendrive
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                : "bg-neutral-800 border-neutral-600 text-neutral-400"
            }`}
          >
            Pendrive: {hasPendrive ? "CONNECTED (ON)" : "DISCONNECTED (OFF)"}
          </button>

          <button
            type="button"
            onClick={() => setReducedMotion((m) => !m)}
            className={`px-3 py-1.5 rounded border font-bold transition-all cursor-pointer ${
              reducedMotion
                ? "bg-amber-950/80 border-amber-500 text-amber-300"
                : "bg-neutral-800 border-neutral-600 text-neutral-400"
            }`}
          >
            Reduce Motion: {reducedMotion ? "ON (CUT)" : "OFF (EASE)"}
          </button>

          <button
            type="button"
            onClick={() => {
              pendriveStore.reset();
              setLastUploadedEvent(null);
            }}
            className="px-3 py-1.5 rounded bg-red-950/70 hover:bg-red-900 border border-red-500/50 text-red-300 font-bold transition-all cursor-pointer"
          >
            Reset Store
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-[11px] text-neutral-400">
          <span>Input Lock: <strong className={inputLockedStatus ? "text-amber-400" : "text-emerald-400"}>{inputLockedStatus ? "LOCKED" : "FREE"}</strong></span>
          <span>Last Upload: <strong className="text-emerald-400">{lastUploadedEvent ? lastUploadedEvent.batchId : "None"}</strong></span>
        </div>
      </div>

      {/* ── 3D Scene Viewport ────────────────────────────────────────── */}
      <div className="w-full h-full">
        <Canvas
          camera={{
            position: [0, 1.45, 2.4],
            fov: 65,
            near: 0.1,
            far: 50,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          className="w-full h-full"
        >
          <color attach="background" args={["#030508"]} />

          {/* Fixed Ambient Light for Dev Harness */}
          <ambientLight intensity={1.5} />

          <Suspense fallback={null}>
            {/* The 3D Data Station Component under test */}
            <DataStation
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              reducedMotion={reducedMotion}
              onInputLocked={setInputLockedStatus}
              onPromptChange={setDevPrompt}
            />

            {/* Orbit Controls (Active when not docked) */}
            {!inputLockedStatus && (
              <OrbitControls
                target={[0, 1.25, 0]}
                maxDistance={6.0}
                minDistance={0.8}
                maxPolarAngle={Math.PI / 2 + 0.05}
              />
            )}
          </Suspense>
        </Canvas>
      </div>

      {/* ── Interactive HUD Prompt Pill in DOM Space ───────────────── */}
      {devPrompt && !terminalOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
            }}
            className="px-5 py-2.5 bg-black/90 hover:bg-emerald-950/90 border-2 border-emerald-400 text-emerald-300 font-mono text-xs tracking-wider rounded-full shadow-[0_0_25px_rgba(34,197,94,0.5)] cursor-pointer backdrop-blur-md flex items-center gap-2.5 transition-all animate-pulse"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold">{devPrompt}</span>
            <span className="text-[10px] text-emerald-400/90 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold">
              CLICK / [E]
            </span>
          </button>
        </div>
      )}

      {/* ── Connected 2D Pendrive Terminal Interface ───────────────── */}
      {terminalOpen && (
        <PendriveTerminal
          open={terminalOpen}
          onClose={() => telemetryStore.setTerminalOpen(false)}
          onUpload={(batchId) => {
            pendriveStore.recordBatchUpload(batchId);
          }}
          reducedMotion={reducedMotion}
        />
      )}

      {/* ── Bottom Instructions Pill ─────────────────────────────────── */}
      <div className="fixed bottom-4 left-6 z-40 bg-black/80 border border-neutral-700/60 px-4 py-2 rounded-lg text-xs text-neutral-400 backdrop-blur-md">
        <span>Controls: Orbit with Mouse • Move within 2.6m & Aim center to reveal <strong className="text-emerald-400">[E] Prompt</strong> • Press <strong className="text-emerald-400">[E]</strong> to Dock</span>
      </div>
    </div>
  );
}
