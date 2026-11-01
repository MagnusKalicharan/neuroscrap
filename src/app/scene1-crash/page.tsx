"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import SpaceshipWreck from "@/components/SpaceshipWreck";
import CrashCinematic from "@/scenes/scene1/crash/CrashCinematic";
import CrashCinematicOverlay from "@/scenes/scene1/crash/CrashCinematicOverlay";
import { evaluateCameraPose } from "@/scenes/scene1/crash/math";
import { CRASH_DURATION_MS, CRASH_CUTS } from "@/scenes/scene1/crash/types";

export default function Scene1CrashTestPage() {
  const [progress, setProgress] = useState(0.05);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isShipLoaded, setIsShipLoaded] = useState(false);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // Read ?p=... from URL on initial load if provided
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const pParam = urlParams.get("p");
      if (pParam !== null) {
        const parsed = parseFloat(pParam);
        if (!isNaN(parsed)) {
          setProgress(Math.min(1, Math.max(0, parsed)));
        }
      }
      if (urlParams.get("reduceMotion") === "1") {
        setReduceMotion(true);
      }
    }
  }, []);

  // Playback loop (6000ms duration)
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimeRef.current) / CRASH_DURATION_MS;
      lastTimeRef.current = now;

      setProgress((prev) => {
        const next = prev + delta;
        if (next >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return next;
      });

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying]);

  const currentMs = Math.round(progress * CRASH_DURATION_MS);
  const evaluated = evaluateCameraPose(progress, reduceMotion);

  // Apply CRT squash transform to canvas wrapper
  const wrapperTransform =
    evaluated.crtSquashY < 0.99
      ? `scaleY(${evaluated.crtSquashY.toFixed(4)})`
      : "none";

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none text-white font-mono">
      {/* ── 3D CANVAS WRAPPER (Subject to CRT-off squash at end) ── */}
      <div
        ref={canvasWrapperRef}
        className="absolute inset-0 w-full h-full will-change-transform"
        style={{
          transformOrigin: "center center",
          transform: wrapperTransform,
        }}
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 78, position: [0, 1.5, -18], near: 0.1, far: 250 }}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
          className="w-full h-full"
        >
          <ambientLight color="#141824" intensity={2.6} />
          <directionalLight position={[-35, 55, -75]} color="#ffd8a8" intensity={3.2} />
          <directionalLight position={[35, 25, 40]} color="#4477aa" intensity={1.2} />

          <Suspense fallback={null}>
            <SpaceshipWreck
              reducedMotion={reduceMotion}
              onReady={() => setIsShipLoaded(true)}
            />
            <CrashCinematic
              progress={progress}
              reduceMotion={reduceMotion}
              onDone={() => setIsPlaying(false)}
            />
          </Suspense>
        </Canvas>

        {/* 2D Overlay (Handles transparent canvas & black screen transitions) */}
        <CrashCinematicOverlay progress={progress} reduceMotion={reduceMotion} />
      </div>

      {/* ── FLOATING SCRUBBER CONTROL PANEL ── */}
      <div className="absolute top-4 left-4 right-4 z-50 p-4 bg-black/85 border border-cyan-500/50 rounded-lg backdrop-blur-md shadow-[0_0_30px_rgba(0,243,255,0.25)] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold text-sm tracking-wider">
              CRASH CINEMATIC TESTBENCH (STEP 1)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isShipLoaded
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-950 text-amber-400 border border-amber-500/30 animate-pulse"
              }`}
            >
              {isShipLoaded ? "SHIP: READY" : "SHIP: LOADING"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-cyan-200">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="accent-cyan-400"
              />
              <span>REDUCE MOTION</span>
            </label>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="px-4 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 font-bold rounded cursor-pointer transition-all"
            >
              {isPlaying ? "❚❚ PAUSE" : "▶ PLAY (6s)"}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setProgress(0);
              }}
              className="px-3 py-1.5 bg-black/60 hover:bg-slate-900 border border-cyan-500/30 text-cyan-400 rounded cursor-pointer"
            >
              ↺ RESET
            </button>
          </div>
        </div>

        {/* ── SCRUBBER SLIDER ── */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-cyan-300">
            <span>
              PROGRESS: <strong className="text-white">{progress.toFixed(3)}</strong>
            </span>
            <span>
              TIME: <strong className="text-white">{currentMs} ms</strong> / {CRASH_DURATION_MS} ms
            </span>
            <span className="text-cyan-400/80">
              PHASE:{" "}
              <strong className="text-amber-300">
                {currentMs < CRASH_CUTS.warning
                  ? "CALM BEFORE"
                  : currentMs < CRASH_CUTS.impact
                  ? "WARNING"
                  : currentMs < CRASH_CUTS.second
                  ? "IMPACT & CHAOS"
                  : currentMs < CRASH_CUTS.aftermath
                  ? "SECOND HIT & SLIDE"
                  : currentMs < CRASH_CUTS.degrade
                  ? "AFTERMATH"
                  : currentMs < 5800
                  ? "DEGRADE"
                  : "CRT OFF"}
              </strong>
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={(e) => {
              setIsPlaying(false);
              setProgress(parseFloat(e.target.value));
            }}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded"
          />
        </div>

        {/* ── KEYFRAME JUMP BUTTONS ── */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-cyan-500/20 text-[11px]">
          <span className="text-cyan-400/70 mr-1 font-bold">SHOT LIST CUTS:</span>
          {[
            { label: "p=0.05 (Calm)", val: 0.05 },
            { label: "p=0.30 (Warning)", val: 0.30 },
            { label: "p=0.34 (Impact)", val: 0.34 },
            { label: "p=0.50 (Chaos)", val: 0.50 },
            { label: "p=0.62 (2nd Hit)", val: 0.62 },
            { label: "p=0.80 (Aftermath)", val: 0.80 },
            { label: "p=0.95 (Degrade)", val: 0.95 },
            { label: "p=1.00 (Off)", val: 1.00 },
          ].map((btn) => (
            <button
              key={btn.val}
              onClick={() => {
                setIsPlaying(false);
                setProgress(btn.val);
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer transition-all ${
                Math.abs(progress - btn.val) < 0.015
                  ? "bg-cyan-500 text-black font-bold border-cyan-300 shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                  : "bg-black/60 text-cyan-300/80 border-cyan-500/30 hover:border-cyan-400"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── TELEMETRY READOUT ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[10px] text-cyan-400/80 bg-black/40 p-2 rounded">
          <div>
            POS: ({evaluated.position.x.toFixed(2)}, {evaluated.position.y.toFixed(2)},{" "}
            {evaluated.position.z.toFixed(2)})
          </div>
          <div>
            ROT (deg): ({(evaluated.rotation.x * 57.3).toFixed(1)}°,{" "}
            {(evaluated.rotation.y * 57.3).toFixed(1)}°,{" "}
            {(evaluated.rotation.z * 57.3).toFixed(1)}°)
          </div>
          <div>SHAKE AMP: {evaluated.shakeMagnitude.toFixed(3)}</div>
          <div>CRT SQUASH Y: {evaluated.crtSquashY.toFixed(3)}</div>
        </div>
      </div>
    </div>
  );
}
