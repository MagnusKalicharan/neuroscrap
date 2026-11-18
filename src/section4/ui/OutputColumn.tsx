"use client";

import React, { useRef, useEffect } from "react";
import type { DataPoint, Network } from "../nn/types";
import { outputGrid } from "../nn/network";
import { renderGridToCanvas } from "./heatmapColors";
import { terminalSound } from "../../ui/terminal/sound";

export interface OutputColumnProps {
  network: Network;
  renderTick?: number;
  trainData: DataPoint[];
  testData: DataPoint[];
  testLoss: number;
  trainLoss: number;
  testAccuracy: number;
  lossHistory: Array<{ epoch: number; trainLoss: number; testLoss: number }>;
  showTestData: boolean;
  onToggleShowTestData: () => void;
  discretizeOutput: boolean;
  onToggleDiscretize: () => void;
  datasetId: string;
}

export function OutputColumn({
  network,
  renderTick = 0,
  trainData,
  testData,
  testLoss,
  trainLoss,
  testAccuracy,
  lossHistory,
  showTestData,
  onToggleShowTestData,
  discretizeOutput,
  onToggleDiscretize,
  datasetId,
}: OutputColumnProps) {
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const lossCanvasRef = useRef<HTMLCanvasElement>(null);
  // 1. Draw Output Heatmap (Continuous real-time animation on every step)
  useEffect(() => {
    if (heatmapCanvasRef.current) {
      const res = 50; // 50x50 resolution upscaled, ultra-fast 0.35ms render for 60 FPS fluidity
      const grid = outputGrid(network, res);
      renderGridToCanvas(grid, heatmapCanvasRef.current, res, discretizeOutput);
    }
  }, [network, renderTick, discretizeOutput]);

  // 2. Draw Loss Curve (Last 300 epochs, Auto-scaled, Throttled <= 30 fps)
  const ptsToShow = lossHistory.slice(-300);
  const maxObserved = Math.max(
    1.0,
    ...ptsToShow.map((p) => Math.max(p.trainLoss, p.testLoss))
  );
  const maxLoss = Math.ceil(maxObserved * 10) / 10;

  useEffect(() => {
    const canvas = lossCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#010703";
    ctx.fillRect(0, 0, w, h);

    // Draw faint grid lines
    ctx.strokeStyle = "rgba(46, 232, 92, 0.15)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    if (ptsToShow.length < 2) {
      ctx.fillStyle = "#18983B";
      ctx.font = "9px monospace";
      ctx.fillText("READY TO TRAIN...", 12, h / 2 + 3);
      return;
    }

    const n = ptsToShow.length;

    // Draw Train Loss (Amber #FF9A1F / #FFB700)
    ctx.strokeStyle = "#FFB700";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ptsToShow.forEach((pt, i) => {
      const px = (i / (n - 1)) * w;
      const py =
        h - Math.min(1, Math.max(0, pt.trainLoss / maxLoss)) * (h - 6) - 3;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw Test Loss (Bright Phosphor Green #2EE85C)
    ctx.strokeStyle = "#2EE85C";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ptsToShow.forEach((pt, i) => {
      const px = (i / (n - 1)) * w;
      const py =
        h - Math.min(1, Math.max(0, pt.testLoss / maxLoss)) * (h - 6) - 3;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }, [ptsToShow, maxLoss]);

  const activePoints = showTestData ? [...trainData, ...testData] : trainData;

  return (
    <div
      className="w-[245px] h-full p-2 flex flex-col justify-between bg-[#020a04] font-mono select-none shrink-0 text-xs gap-1.5"
      role="region"
      aria-label="Model Output & Loss Inspection Column"
    >
      <div className="flex flex-col gap-2">
        {/* Top Header: Title & Readouts */}
        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--term-outline-green)]/40">
          <span className="font-bold text-[12px] text-[var(--term-green-text-bright)] tracking-wider">
            OUTPUT HEATMAP
          </span>
          <div className="px-2 py-0.5 rounded border border-[#2EE85C]/60 bg-[#041c09] text-[#4BFF7B] text-[11px] font-black">
            ACCURACY: {Math.round(testAccuracy * 100)}%
          </div>
        </div>

        {/* Losses Header Row */}
        <div className="flex items-center justify-between text-[11px] bg-[#010803] px-2 py-1 rounded border border-[var(--term-outline-green)]/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2EE85C]" />
            <span className="text-[var(--term-green-text-dim)]">TEST:</span>
            <span className="text-[#4BFF7B] font-bold">
              {testLoss.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFB700]" />
            <span className="text-[var(--term-green-text-dim)]">TRAIN:</span>
            <span className="text-[#FFB700] font-bold">
              {trainLoss.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Small Loss Curve Canvas (300 Epochs) */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[9px] text-[var(--term-green-text-dim)]">
            <span>LOSS CURVE (LAST 300 EPOCHS)</span>
            <span>0.00 .. {maxLoss.toFixed(2)}</span>
          </div>
          <div className="w-full h-11 rounded border border-[var(--term-outline-green)]/60 overflow-hidden bg-[#010703]">
            <canvas
              ref={lossCanvasRef}
              width={265}
              height={44}
              className="w-full h-full block"
            />
          </div>
        </div>

        {/* ── Main Output Heatmap Canvas (with Data Point Markers) ── */}
        <div className="relative w-full aspect-square rounded border border-[var(--term-outline-green)] overflow-hidden bg-[#04060B]">
          <canvas
            ref={heatmapCanvasRef}
            width={60}
            height={60}
            className="w-full h-full block image-rendering-pixelated"
          />

          {/* Data Points Overlay (SVG) */}
          <svg
            suppressHydrationWarning
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 260 260"
          >
            {activePoints.map((pt, idx) => {
              // Map from [-1, 1] to SVG [0, 260] with fixed rounding to prevent SSR/CSR hydration mismatches
              const rawPx = ((pt.x + 1) / 2) * 260;
              const rawPy = (1 - (pt.y + 1) / 2) * 260;
              const px = Math.round(rawPx * 100) / 100;
              const py = Math.round(rawPy * 100) / 100;
              const isTest = testData.includes(pt);

              if (pt.label === 1) {
                // Machine: Diamond (Phosphor Green #2EE85C)
                return (
                  <polygon
                    key={`pt-${idx}`}
                    points={`${px},${(py - 4.5).toFixed(2)} ${(px + 4.5).toFixed(2)},${py} ${px},${(py + 4.5).toFixed(2)} ${(px - 4.5).toFixed(2)},${py}`}
                    fill="#2EE85C"
                    stroke={isTest ? "#FFFFFF" : "#04060B"}
                    strokeWidth={isTest ? "1.5" : "1.0"}
                    filter="drop-shadow(0 0 3px #2EE85C)"
                  />
                );
              }

              // Natural: Circle (Amber #FFB700)
              return (
                <circle
                  key={`pt-${idx}`}
                  cx={px}
                  cy={py}
                  r="3.5"
                  fill="#FFB700"
                  stroke={isTest ? "#FFFFFF" : "#04060B"}
                  strokeWidth={isTest ? "1.5" : "1.0"}
                />
              );
            })}
          </svg>

          {/* Coordinate axis overlay tags */}
          <div className="absolute left-1 bottom-0.5 text-[8.5px] text-[var(--term-green-text-dim)] font-mono">
            {datasetId === "signal" ? "FAINT" : "-1"}
          </div>
          <div className="absolute right-1 bottom-0.5 text-[8.5px] text-[var(--term-green-text-dim)] font-mono">
            {datasetId === "signal" ? "BRIGHT" : "+1"}
          </div>
          <div className="absolute left-1 top-0.5 text-[8.5px] text-[var(--term-green-text-dim)] font-mono">
            {datasetId === "signal" ? "STEADY BEAT" : "+1"}
          </div>
        </div>

        {/* Diverging Color Bar Legend (-1 to 1) */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center justify-between text-[9px] text-[var(--term-green-text-dim)]">
            <span>-1 (NATURAL)</span>
            <span>0</span>
            <span>+1 (MACHINE)</span>
          </div>
          <div
            className="w-full h-2 rounded border border-[var(--term-outline-green)]/60"
            style={{
              background:
                "linear-gradient(to right, #FFB700 0%, #030D05 50%, #2EE85C 100%)",
            }}
          />
        </div>
      </div>

      {/* Checkboxes: Show Test Data & Discretize Output */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--term-outline-green)]/40 text-[10.5px]">
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--term-green-text-bright)]">
          <input
            type="checkbox"
            checked={showTestData}
            onChange={() => {
              terminalSound.playKeyTick();
              onToggleShowTestData();
            }}
            className="accent-[#2EE85C] rounded cursor-pointer"
          />
          <span>TEST DATA</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--term-green-text-bright)]">
          <input
            type="checkbox"
            checked={discretizeOutput}
            onChange={() => {
              terminalSound.playKeyTick();
              onToggleDiscretize();
            }}
            className="accent-[#2EE85C] rounded cursor-pointer"
          />
          <span>DISCRETIZE</span>
        </label>
      </div>
    </div>
  );
}
