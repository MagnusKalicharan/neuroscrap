"use client";

import React, { useEffect, useRef, useState } from "react";
import { scene1Sound } from "./sound";

interface CrashFlashProps {
  onComplete?: () => void;
  reduceMotion?: boolean;
}

const MAX_PARTICLES = 80;

export default function CrashFlash({ onComplete, reduceMotion = false }: CrashFlashProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashOverlayRef = useRef<HTMLDivElement>(null);
  const redSweepRef = useRef<HTMLDivElement>(null);

  // Pre-allocated particle pools (zero allocation in animation loop)
  const poolRef = useRef<{
    x: Float32Array;
    y: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    life: Float32Array;
    maxLife: Float32Array;
    size: Float32Array;
    activeCount: number;
  }>({
    x: new Float32Array(MAX_PARTICLES),
    y: new Float32Array(MAX_PARTICLES),
    vx: new Float32Array(MAX_PARTICLES),
    vy: new Float32Array(MAX_PARTICLES),
    life: new Float32Array(MAX_PARTICLES),
    maxLife: new Float32Array(MAX_PARTICLES),
    size: new Float32Array(MAX_PARTICLES),
    activeCount: 0,
  });

  useEffect(() => {
    // Trigger sound
    scene1Sound.playCrashSequence();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const container = containerRef.current;
    const flashOverlay = flashOverlayRef.current;
    const redSweep = redSweepRef.current;

    const startTime = performance.now();
    const DURATION = 2500; // 2.5 seconds
    let rafId: number | null = null;
    let sparksSpawned1 = false;
    let sparksSpawned2 = false;

    // Resize canvas to match display size
    const updateSize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Helper to spawn spark burst from coordinate (cx, cy)
    const spawnSparks = (cx: number, cy: number, count: number) => {
      if (reduceMotion) return;
      const pool = poolRef.current;
      const toAdd = Math.min(count, MAX_PARTICLES - pool.activeCount);
      for (let i = 0; i < toAdd; i++) {
        const idx = pool.activeCount++;
        pool.x[idx] = cx;
        pool.y[idx] = cy;
        const angle = Math.random() * Math.PI * 2;
        const speed = 120 + Math.random() * 260; // px/sec
        pool.vx[idx] = Math.cos(angle) * speed;
        pool.vy[idx] = Math.sin(angle) * speed - 60; // slight upward bias
        pool.life[idx] = 0;
        pool.maxLife[idx] = 0.4 + Math.random() * 0.5; // seconds
        pool.size[idx] = 1.5 + Math.random() * 2.5;
      }
    };

    let lastTime = startTime;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (elapsed >= DURATION) {
        if (container) container.style.transform = "none";
        onComplete?.();
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // 1. PHOTOSENSITIVE-SAFE FLASH ENVELOPE (Opacity of 2D layer)
      // Flash 1 at t=0ms (duration ~250ms, peak luminance 0.62)
      // Flash 2 at t=600ms (interval 600ms >= 350ms, peak 0.45)
      // ─────────────────────────────────────────────────────────────
      if (flashOverlay) {
        if (reduceMotion) {
          // Soft smooth red fade under reduce motion
          const progress = elapsed / DURATION;
          const softAlpha = Math.sin(progress * Math.PI) * 0.35;
          flashOverlay.style.backgroundColor = `rgba(220, 30, 40, ${softAlpha.toFixed(3)})`;
        } else {
          let flashAlpha = 0;
          if (elapsed < 300) {
            // Flash 1: 0ms -> 300ms
            const t = elapsed / 300;
            flashAlpha = Math.sin(t * Math.PI) * 0.62; // Under 70% white
            if (!sparksSpawned1 && canvas) {
              sparksSpawned1 = true;
              spawnSparks(canvas.width * 0.35, canvas.height * 0.45, 38);
            }
          } else if (elapsed >= 600 && elapsed < 900) {
            // Flash 2: 600ms -> 900ms (interval 600ms > 350ms requirement)
            const t = (elapsed - 600) / 300;
            flashAlpha = Math.sin(t * Math.PI) * 0.45;
            if (!sparksSpawned2 && canvas) {
              sparksSpawned2 = true;
              spawnSparks(canvas.width * 0.65, canvas.height * 0.52, 35);
            }
          }
          flashOverlay.style.backgroundColor = `rgba(255, 230, 230, ${flashAlpha.toFixed(3)})`;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 2. RED EMERGENCY LIGHT SWEEP
      // ─────────────────────────────────────────────────────────────
      if (redSweep) {
        const sweepProgress = (elapsed % 1400) / 1400; // 1.4s sweep period
        const sweepX = -100 + sweepProgress * 200;
        redSweep.style.transform = `translateX(${sweepX}%)`;
      }

      // ─────────────────────────────────────────────────────────────
      // 3. LAYER SHAKE & TILT (Max 6px, disabled under Reduce Motion)
      // ─────────────────────────────────────────────────────────────
      if (container) {
        if (reduceMotion) {
          container.style.transform = "none";
        } else {
          // Decay shake intensity over time
          const decay = Math.max(0, 1 - elapsed / 2200);
          const shakeX = (Math.sin(elapsed * 0.05) * 5.2 + Math.cos(elapsed * 0.03) * 2.1) * decay;
          const shakeY = (Math.cos(elapsed * 0.045) * 4.8) * decay;
          const tiltDeg = (Math.sin(elapsed * 0.035) * 0.8) * decay;
          container.style.transform = `translate3d(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px, 0) rotate(${tiltDeg.toFixed(2)}deg)`;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 4. CANVAS SPARK PARTICLES UPDATE & DRAW
      // ─────────────────────────────────────────────────────────────
      if (ctx && canvas && !reduceMotion) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pool = poolRef.current;
        let active = 0;

        for (let i = 0; i < pool.activeCount; i++) {
          pool.life[i] += dt;
          if (pool.life[i] < pool.maxLife[i]) {
            // Apply physics: gravity + air resistance
            pool.vy[i] += 480 * dt; // gravity
            pool.vx[i] *= 0.96;
            pool.x[i] += pool.vx[i] * dt;
            pool.y[i] += pool.vy[i] * dt;

            // Retain active in pool
            if (active !== i) {
              pool.x[active] = pool.x[i];
              pool.y[active] = pool.y[i];
              pool.vx[active] = pool.vx[i];
              pool.vy[active] = pool.vy[i];
              pool.life[active] = pool.life[i];
              pool.maxLife[active] = pool.maxLife[i];
              pool.size[active] = pool.size[i];
            }

            const alpha = 1 - pool.life[active] / pool.maxLife[active];
            ctx.fillStyle = `rgba(255, ${Math.floor(180 + Math.random() * 75)}, 60, ${alpha.toFixed(2)})`;
            ctx.shadowColor = "#ffaa00";
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(pool.x[active], pool.y[active], pool.size[active], 0, Math.PI * 2);
            ctx.fill();

            active++;
          }
        }
        pool.activeCount = active;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateSize);
      if (container) container.style.transform = "none";
    };
  }, [onComplete, reduceMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 z-40 overflow-hidden pointer-events-none select-none bg-black will-change-transform"
      style={{
        transformOrigin: "center center",
      }}
    >
      {/* ── VECTOR SILHOUETTE OF THE BROKEN SHIP CORRIDOR ── */}
      <svg
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="corridorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06090d" />
            <stop offset="100%" stopColor="#0c1117" />
          </linearGradient>
          <linearGradient id="emergencyGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255, 30, 45, 0.4)" />
            <stop offset="100%" stopColor="rgba(255, 30, 45, 0)" />
          </linearGradient>
        </defs>

        {/* Outer Hull Bulkheads & Jagged Fractures */}
        <path
          d="M0,0 L720,0 L640,240 L520,380 L380,420 L240,680 L180,820 L0,1080 Z"
          fill="url(#corridorGrad)"
          stroke="#1f2937"
          strokeWidth="3"
        />
        <path
          d="M1920,0 L1240,0 L1320,280 L1440,420 L1560,540 L1680,820 L1920,1080 Z"
          fill="url(#corridorGrad)"
          stroke="#1f2937"
          strokeWidth="3"
        />

        {/* Collapsed Ceiling Beams & Hanging Conduit Ribs */}
        <polygon
          points="400,0 480,0 780,480 720,500"
          fill="#0a0f15"
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="12 6"
        />
        <polygon
          points="1520,0 1440,0 1140,460 1200,480"
          fill="#0a0f15"
          stroke="#374151"
          strokeWidth="2"
        />

        {/* Sheared Doorway Arch */}
        <path
          d="M720,280 L1200,280 L1150,720 L770,720 Z"
          fill="none"
          stroke="#374151"
          strokeWidth="4"
        />
        <line x1="770" y1="500" x2="1150" y2="520" stroke="#ef4444" strokeWidth="2" opacity="0.6" />

        {/* Dangling Severed Cable Sparks Anchor Points */}
        <path
          d="M660,180 Q640,320 670,410 T680,460"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          opacity="0.8"
        />
        <path
          d="M1250,220 Q1270,340 1240,440 T1260,510"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          opacity="0.8"
        />

        {/* Floor Rubble Silhouette */}
        <polygon
          points="0,1080 320,960 480,990 740,940 980,970 1280,930 1560,980 1920,1080"
          fill="#040608"
        />
      </svg>

      {/* ── RED EMERGENCY LIGHT SWEEP ── */}
      <div
        ref={redSweepRef}
        className="absolute inset-y-0 w-3/4 pointer-events-none opacity-45 mix-blend-screen"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 30, 45, 0.45) 50%, transparent 100%)",
        }}
      />

      {/* ── PARTICLE CANVAS (Max 80 pooled spark particles) ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* ── PHOTOSENSITIVE-SAFE FULL-SCREEN FLASH OVERLAY ── */}
      <div
        ref={flashOverlayRef}
        className="absolute inset-0 pointer-events-none transition-none"
        style={{ backgroundColor: "rgba(0,0,0,0)" }}
      />
    </div>
  );
}
