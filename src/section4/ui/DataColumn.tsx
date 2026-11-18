"use client";

import React from "react";
import { terminalSound } from "../../ui/terminal/sound";

export type DatasetId = "signal" | "circle" | "xor" | "gaussian" | "spiral";

export interface DataColumnProps {
  datasetId: DatasetId;
  onSelectDataset: (id: DatasetId) => void;
  trainRatio: number; // 0.1 to 0.9
  onChangeTrainRatio: (ratio: number) => void;
  noise: number; // 0 to 50
  onChangeNoise: (noise: number) => void;
  batchSize: number; // 1 to 30
  onChangeBatchSize: (batchSize: number) => void;
  onRegenerate: () => void;
  mode: "watch" | "lab";
  datasetCategory: "beacon_signal" | "sandbox";
  onChangeCategory: (cat: "beacon_signal" | "sandbox") => void;
}

const EXPERIMENTAL_DATASETS: Array<{ id: DatasetId; label: string; icon: string; desc: string }> = [
  { id: "signal", label: "SIGNAL", icon: "📡", desc: "Beacon signal carrier" },
  { id: "circle", label: "CIRCLE", icon: "◎", desc: "Radial concentric boundary" },
  { id: "xor", label: "XOR", icon: "✢", desc: "Diagonal cross quadrant" },
  { id: "gaussian", label: "GAUSS", icon: "❖", desc: "Bimodal clusters" },
  { id: "spiral", label: "SPIRAL", icon: "🌀", desc: "Dual interleaved spirals" },
];

export function DataColumn({
  datasetId,
  onSelectDataset,
  trainRatio,
  onChangeTrainRatio,
  noise,
  onChangeNoise,
  batchSize,
  onChangeBatchSize,
  onRegenerate,
  mode,
  datasetCategory,
  onChangeCategory,
}: DataColumnProps) {
  const isLocked = mode === "watch";
  const lockTooltip = "Unlocks in the training lab";

  return (
    <div
      className="w-[165px] h-full p-2 flex flex-col justify-between border-r border-[var(--term-outline-green)]/60 bg-[#020904] font-mono select-none shrink-0 text-xs overflow-y-auto"
      role="region"
      aria-label="Dataset Configuration Column"
    >
      <div className="flex flex-col gap-2">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[var(--term-outline-green)]/40">
          <span className="font-bold text-[11px] text-[var(--term-green-text-bright)] tracking-wider">
            DATASET
          </span>
          {isLocked && (
            <span className="text-[10px] text-[#ffb700]" title={lockTooltip}>
              🔒
            </span>
          )}
        </div>

        {/* ── Two-Category Switcher ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#010602] border border-[var(--term-outline-green)]/50 rounded">
          {/* Option 1: Main Mission Beacon Signal */}
          <button
            type="button"
            onClick={() => {
              terminalSound.playSelectBlip();
              onChangeCategory("beacon_signal");
              onSelectDataset("signal");
            }}
            className={`p-1 rounded flex flex-col items-center justify-center text-center transition-all ${
              datasetCategory === "beacon_signal"
                ? "bg-[#04240c] text-[#4BFF7B] font-bold border border-[#2EE85C] shadow-[0_0_8px_rgba(46,232,92,0.3)]"
                : "text-[var(--term-green-text-dim)] hover:text-[#4BFF7B] border border-transparent"
            }`}
          >
            <span className="text-xs">📡</span>
            <span className="text-[8.5px] leading-tight font-bold">BEACON</span>
            <span className="text-[7.5px] text-[var(--term-green-text-dim)]">Signal</span>
          </button>

          {/* Option 2: Trying Different Things (Playground) */}
          <button
            type="button"
            onClick={() => {
              terminalSound.playSelectBlip();
              onChangeCategory("sandbox");
            }}
            className={`p-1 rounded flex flex-col items-center justify-center text-center transition-all ${
              datasetCategory === "sandbox"
                ? "bg-[#04240c] text-[#FFB700] font-bold border border-[#FFB700] shadow-[0_0_8px_rgba(255,183,0,0.3)]"
                : "text-[var(--term-green-text-dim)] hover:text-[#FFB700] border border-transparent"
            }`}
          >
            <span className="text-xs">🧪</span>
            <span className="text-[8.5px] leading-tight font-bold">PLAYGROUND</span>
            <span className="text-[7.5px] text-[var(--term-green-text-dim)]">Custom</span>
          </button>
        </div>

        {/* ── Category 1: Main Mission Beacon Signal ──────────────────── */}
        {datasetCategory === "beacon_signal" ? (
          <div className="flex flex-col gap-2 p-2 bg-[#031306] border border-[#2EE85C]/60 rounded">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-[#4BFF7B] flex items-center gap-1">
                <span>📡</span> PRIMARY MISSION TARGET
              </span>
              <span className="text-[8px] px-1 py-0.5 rounded bg-[#010803] text-[#2EE85C] border border-[#2EE85C]/50 font-bold">
                CANONICAL
              </span>
            </div>

            <p className="text-[9.5px] text-[var(--term-green-text-dim)] leading-tight">
              Train neural synaptic weights to <span className="text-[#4BFF7B] font-bold">≥95% accuracy</span> to lock onto the rescue beacon carrier and escape Sector 4.
            </p>

            <div className="text-[9px] bg-[#010803] p-1.5 rounded border border-[var(--term-outline-green)]/30 flex flex-col gap-0.5">
              <div className="text-[#4BFF7B] font-bold uppercase tracking-wider text-[8.5px]">Sensor Properties:</div>
              <div className="flex justify-between text-[var(--term-green-text-dim)]">
                <span>X₁: Brightness</span>
                <span className="text-[#4BFF7B]">[-1, +1]</span>
              </div>
              <div className="flex justify-between text-[var(--term-green-text-dim)]">
                <span>X₂: Steady Beat</span>
                <span className="text-[#4BFF7B]">[-1, +1]</span>
              </div>
              <div className="flex justify-between text-[var(--term-green-text-dim)]">
                <span>Target:</span>
                <span className="text-[#FFB700]">+1 Beacon / -1 Noise</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Category 2: Trying Different Things (Sandbox) ─────────── */
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] text-[#FFB700] font-bold uppercase tracking-wider">
                Select Benchmark Dataset:
              </span>
              <span className="text-[8px] text-[var(--term-green-text-dim)]">5 benchmarks</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {EXPERIMENTAL_DATASETS.map((ds) => {
                const isSelected = datasetId === ds.id;
                return (
                  <button
                    key={ds.id}
                    type="button"
                    disabled={isLocked && !isSelected}
                    onClick={() => {
                      if (isLocked) return;
                      terminalSound.playSelectBlip();
                      onSelectDataset(ds.id);
                    }}
                    title={isLocked && !isSelected ? lockTooltip : `${ds.label}: ${ds.desc}`}
                    className={`p-1.5 rounded border flex flex-col items-center justify-center gap-0.5 text-center transition-all ${
                      isSelected
                        ? "border-[#FFB700] bg-[#1a1202] text-[#FFB700] font-black shadow-[0_0_8px_rgba(255,183,0,0.35)]"
                        : isLocked
                        ? "border-[var(--term-outline-green)]/30 bg-[#020803] text-[var(--term-green-text-dim)] opacity-50 cursor-not-allowed"
                        : "border-[var(--term-outline-green)]/70 bg-[#031106] hover:border-[#FFB700] text-[var(--term-green-text)] cursor-pointer"
                    }`}
                  >
                    <span className="text-base">{ds.icon}</span>
                    <span className="text-[9.5px] font-bold tracking-tight">{ds.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-[8.5px] p-1.5 rounded bg-[#100b02] border border-[#FFB700]/40 text-[#FFD666] leading-tight">
              ✨ <span className="font-bold">Extra Inputs Unlocked:</span> Polynomial & sinusoidal feature inputs are now selectable in the Features panel!
            </div>
          </div>
        )}

        {/* ── Dataset Parameters (Train/Test, Noise, Batch Size) ──────── */}
        <div className="flex flex-col gap-2 pt-1 border-t border-[var(--term-outline-green)]/30">
          {/* Ratio & Noise are hidden for Beacon section; unlocked only in Playground */}
          {datasetCategory === "sandbox" && (
            <>
              {/* Train / Test Ratio Slider */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[var(--term-green-text-dim)]">RATIO:</span>
                  <span className="font-bold text-[var(--term-green-text-bright)]">
                    {Math.round(trainRatio * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  disabled={isLocked}
                  value={trainRatio}
                  onChange={(e) => {
                    terminalSound.playKeyTick();
                    onChangeTrainRatio(parseFloat(e.target.value));
                  }}
                  className="w-full accent-[var(--term-green)] cursor-pointer h-1 bg-[var(--term-bg-screen)]"
                  aria-label="Training data ratio slider"
                />
              </div>

              {/* Noise Slider */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-[var(--term-green-text-dim)]">NOISE:</span>
                  <span className="font-bold text-[var(--term-green-text-bright)]">{noise}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  disabled={isLocked}
                  value={noise}
                  onChange={(e) => {
                    terminalSound.playKeyTick();
                    onChangeNoise(parseInt(e.target.value, 10));
                  }}
                  className="w-full accent-[var(--term-green)] cursor-pointer h-1 bg-[var(--term-bg-screen)]"
                  aria-label="Dataset noise level slider"
                />
              </div>
            </>
          )}

          {/* Batch Size Slider (Available in both Beacon and Playground) */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--term-green-text-dim)]">BATCH:</span>
              <span className="font-bold text-[var(--term-green-text-bright)]">{batchSize}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              disabled={isLocked}
              value={batchSize}
              onChange={(e) => {
                terminalSound.playKeyTick();
                onChangeBatchSize(parseInt(e.target.value, 10));
              }}
              className="w-full accent-[var(--term-green)] cursor-pointer h-1 bg-[var(--term-bg-screen)]"
              aria-label="Training batch size slider"
            />
          </div>
        </div>
      </div>

      {/* Regenerate Button */}
      <div className="pt-2 border-t border-[var(--term-outline-green)]/40">
        <button
          type="button"
          disabled={isLocked}
          onClick={() => {
            if (isLocked) return;
            terminalSound.playSelectBlip();
            onRegenerate();
          }}
          className={`w-full py-1.5 px-2 rounded border text-[10px] font-bold tracking-wider transition-all flex items-center justify-center gap-1 ${
            isLocked
              ? "border-[var(--term-outline-green)]/20 text-[var(--term-green-text-dim)] opacity-40 cursor-not-allowed"
              : "border-[var(--term-outline-green)] text-[var(--term-green-text)] hover:bg-[#07250e] hover:border-[#4bff7b] cursor-pointer"
          }`}
        >
          {isLocked ? "🔒 REGENERATE" : "⟳ REGENERATE"}
        </button>
      </div>
    </div>
  );
}
