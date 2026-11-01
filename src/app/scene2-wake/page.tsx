"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import SpaceshipWreck from "@/components/SpaceshipWreck";
import WakeOverlay, { WakeCameraController } from "@/scenes/scene2/WakeAnimation";
import { evaluateWakePose } from "@/scenes/scene2/wakeMath";
import { blurManager } from "@/scenes/scene2/BlurManager";
import { WAKE_DURATION_MS, SCENE2_CONFIG } from "@/scenes/scene2/scene2.config";

export default function Scene2WakeTestPage() {
  const [progress, setProgress] = useState(0.02);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [quality, setQuality] = useState<"high" | "medium" | "low">("high");
  const [isShipLoaded, setIsShipLoaded] = useState(false);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // Read URL search params if present (e.g. ?p=0.2&quality=low)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const pParam = urlParams.get("p");
      if (pParam !== null) {
        const parsed = parseFloat(pParam);
        if (!isNaN(parsed)) setProgress(Math.min(1, Math.max(0, parsed)));
      }
      if (urlParams.get("quality") === "low") {
        setQuality("low");
        blurManager.setQuality("low");
      }
      if (urlParams.get("reduceMotion") === "1") {
        setReduceMotion(true);
      }
    }
  }, []);

  // Animation Playback loop (9000ms duration)
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
      const delta = (now - lastTimeRef.current) / WAKE_DURATION_MS;
      lastTimeRef.current = now;

      // Feed frame time into blur probe
      blurManager.recordFrameTime(now);

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

  const currentMs = Math.round(progress * WAKE_DURATION_MS);
  const evaluated = evaluateWakePose(progress, reduceMotion);
  const blur = blurManager.evaluate(progress, reduceMotion);

  // Check whether current pose equals Player starting pose
  const matchesPlayerSpawn =
    Math.abs(evaluated.position.x - SCENE2_CONFIG.playerSpawn[0]) < 0.01 &&
    Math.abs(evaluated.position.y - SCENE2_CONFIG.playerSpawn[1]) < 0.01 &&
    Math.abs(evaluated.position.z - SCENE2_CONFIG.playerSpawn[2]) < 0.01 &&
    Math.abs(evaluated.rotation.x) < 0.01 &&
    Math.abs(evaluated.rotation.y) < 0.01 &&
    Math.abs(evaluated.rotation.z) < 0.01;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none text-white font-mono">
      {/* ── 3D CANVAS CONTAINER (Wrapper receiving CSS blur in Mode A) ── */}
      <div
        ref={canvasWrapperRef}
        className="absolute inset-0 w-full h-full"
        style={{ transition: "none" }}
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{
            fov: 78,
            position: [SCENE2_CONFIG.wakeStartPos[0], SCENE2_CONFIG.wakeStartPos[1], SCENE2_CONFIG.wakeStartPos[2]],
            near: 0.1,
            far: 250,
          }}
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
            <WakeCameraController
              progress={progress}
              reduceMotion={reduceMotion}
              onDone={() => setIsPlaying(false)}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── WAKE OVERLAY (Eyelids, Blur Mode B fallback, Ghosting) ── */}
      <WakeOverlay
        progress={progress}
        reduceMotion={reduceMotion}
        quality={quality}
        canvasWrapperRef={canvasWrapperRef}
      />

      {/* ── FLOATING TESTBENCH CONTROLLER ── */}
      <div className="absolute top-4 left-4 right-4 z-50 p-4 bg-black/85 border border-cyan-500/50 rounded-lg backdrop-blur-md shadow-[0_0_30px_rgba(0,243,255,0.25)] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold text-sm tracking-wider">
              SCENE 2: WAKE TESTBENCH (STEP 1)
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
            {/* Quality Preset Toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400/80">QUALITY:</span>
              {(["high", "medium", "low"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuality(q);
                    blurManager.setQuality(q);
                  }}
                  className={`px-2 py-0.5 rounded uppercase cursor-pointer border ${
                    quality === q
                      ? "bg-cyan-500 text-black font-bold border-cyan-300"
                      : "bg-black/60 text-gray-400 border-gray-700"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

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
              {isPlaying ? "❚❚ PAUSE" : "▶ PLAY (9s)"}
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
              TIME: <strong className="text-white">{currentMs} ms</strong> / {WAKE_DURATION_MS} ms
            </span>
            <span className="text-cyan-400/80">
              PHASE:{" "}
              <strong className="text-amber-300">
                {progress < 0.12
                  ? "EYES OPEN (FLUTTER)"
                  : progress < 0.55
                  ? "OUT OF FOCUS / BREATHING"
                  : progress < 0.80
                  ? "HEAD & BODY RISE"
                  : "CALIBRATING UPRIGHT"}
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

        {/* ── KEYFRAME JUMP BUTTONS (Requested for Step 1 verification) ── */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-cyan-500/20 text-[11px]">
          <span className="text-cyan-400/70 mr-1 font-bold">STEP 1 TARGET CUTS:</span>
          {[
            { label: "p=0.02 (Blink 1)", val: 0.02 },
            { label: "p=0.08 (Blink 2)", val: 0.08 },
            { label: "p=0.20 (Look Up, Blur 20px)", val: 0.20 },
            { label: "p=0.40 (Focus 10px)", val: 0.40 },
            { label: "p=0.58 (Rise Start)", val: 0.58 },
            { label: "p=0.70 (Rising Ease)", val: 0.70 },
            { label: "p=0.90 (Calibrating)", val: 0.90 },
            { label: "p=1.00 (Player Starting Pose)", val: 1.00 },
          ].map((btn) => (
            <button
              key={btn.val}
              onClick={() => {
                setIsPlaying(false);
                setProgress(btn.val);
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer transition-all ${
                Math.abs(progress - btn.val) < 0.01
                  ? "bg-cyan-500 text-black font-bold border-cyan-300 shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                  : "bg-black/60 text-cyan-300/80 border-cyan-500/30 hover:border-cyan-400"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── TELEMETRY & POSE VERIFICATION READOUT ── */}
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
          <div>
            EYELIDS: {(evaluated.eyelidOpenPercent * 100).toFixed(0)}% OPEN
          </div>
          <div>
            BLUR: {blur.blurPx}px ({blur.mode === "A" ? "Mode A: CSS" : "Mode B: Overlay"})
          </div>
        </div>

        {/* ── VERIFICATION BANNER AT p = 1.00 ── */}
        {progress >= 0.999 && (
          <div
            className={`text-[11px] p-2 rounded text-center font-bold tracking-wider ${
              matchesPlayerSpawn
                ? "bg-emerald-950/80 border border-emerald-400 text-emerald-300"
                : "bg-red-950/80 border border-red-400 text-red-300"
            }`}
          >
            {matchesPlayerSpawn
              ? "✔ VERIFIED: Camera pose at p=1.00 EXACTLY EQUALS Player Starting Pose [0, 1.5, 6] facing -Z!"
              : "✖ Pose mismatch with Player starting spawn"}
          </div>
        )}
      </div>
    </div>
  );
}
