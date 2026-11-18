"use client";

import React from "react";
import type { ActivationType } from "../nn/types";
import { terminalSound } from "../../ui/terminal/sound";

export interface NeuralTopBarProps {
  epoch: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  learningRate: number;
  onChangeLearningRate: (lr: number) => void;
  activation: ActivationType;
  onChangeActivation: (act: ActivationType) => void;
  mode: "watch" | "lab";
  speed: 1 | 5 | 20;
  onChangeSpeed: (spd: 1 | 5 | 20) => void;
  epochsPerSec?: number;
  showEscapeButton?: boolean;
  onEscape?: () => void;
}

export const LEARNING_RATES = [
  0.00001, 0.0001, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10,
];

export const ACTIVATIONS_LIST: ActivationType[] = [
  "tanh",
  "relu",
  "sigmoid",
  "linear",
];

export function NeuralTopBar({
  epoch,
  isPlaying,
  onTogglePlay,
  onStep,
  onReset,
  learningRate,
  onChangeLearningRate,
  activation,
  onChangeActivation,
  mode,
  speed,
  onChangeSpeed,
  epochsPerSec,
  showEscapeButton,
  onEscape,
}: NeuralTopBarProps) {
  // Format epoch as "000,142"
  const formattedEpoch = String(epoch)
    .padStart(6, "0")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <div className="flex-1 min-w-0 h-[52px] bg-[#020a04] border-b border-[var(--term-outline-green)]/70 px-3 flex items-center justify-between text-mono font-mono select-none gap-2">
      {/* ── Group 1: Playback Controls ─────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Reset Button */}
        <button
          type="button"
          onClick={() => {
            terminalSound.playSelectBlip();
            onReset();
          }}
          className="w-7 h-7 rounded border border-[var(--term-outline-green)] bg-[#031106] hover:bg-[#061e0b] hover:border-[#4bff7b] flex items-center justify-center text-[var(--term-green-text-bright)] transition-all shadow-sm"
          title="Reset Network [R]"
          aria-label="Reset Network [R]"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </button>

        {/* Play / Pause Button */}
        <button
          type="button"
          onClick={() => {
            terminalSound.playSelectBlip();
            onTogglePlay();
          }}
          className={`h-8 px-3 rounded border flex items-center gap-1.5 font-black text-xs tracking-wider transition-all shadow-[0_0_12px_rgba(46,232,92,0.25)] ${
            isPlaying
              ? "bg-[#1c1202] border-[#ffb700] text-[#ffb700] hover:bg-[#2b1b04]"
              : "bg-[#041c09] border-[#2EE85C] text-[#4BFF7B] hover:bg-[#072c10]"
          }`}
          title="Play / Pause Training [SPACE]"
          aria-label={isPlaying ? "Pause Training [SPACE]" : "Play Training [SPACE]"}
        >
          {isPlaying ? (
            <>
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>PLAY</span>
            </>
          )}
        </button>

        {/* Step Button */}
        <button
          type="button"
          onClick={() => {
            terminalSound.playKeyTick();
            onStep();
          }}
          className="h-7 px-2 rounded border border-[var(--term-outline-green)] bg-[#031106] hover:bg-[#061e0b] hover:border-[#4bff7b] flex items-center gap-1 text-[11px] text-[var(--term-green-text-bright)] transition-all font-bold"
          title="Step One Iteration [S]"
          aria-label="Step One Iteration [S]"
        >
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
          <span className="hidden sm:inline">STEP</span>
        </button>

        {/* Speed Selector (1x / 5x / 20x) */}
        <div className="flex items-center rounded border border-[var(--term-outline-green)]/60 bg-[#031106] p-0.5 ml-0.5 text-[10px] font-bold">
          {([1, 5, 20] as const).map((spd) => (
            <button
              key={`spd-${spd}`}
              type="button"
              onClick={() => {
                terminalSound.playKeyTick();
                onChangeSpeed(spd);
              }}
              className={`px-1.5 py-0.5 rounded transition-all ${
                speed === spd
                  ? "bg-[#2EE85C]/20 text-[#4BFF7B] border border-[#2EE85C]/60 shadow-[0_0_6px_rgba(46,232,92,0.3)]"
                  : "text-[var(--term-green-text-dim)] hover:text-[var(--term-green-text-bright)]"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* ── Group 2: Epoch Counter ──────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#010803] border border-[var(--term-outline-green)]/70 rounded shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-[var(--term-green-text-dim)]">
          EPOCH
        </span>
        <span className="text-[15px] font-black text-[#4BFF7B] tracking-widest font-mono drop-shadow-[0_0_8px_rgba(75,255,123,0.4)]">
          {formattedEpoch}
        </span>
        {epochsPerSec !== undefined && epochsPerSec > 0 && isPlaying && (
          <span className="text-[9.5px] text-[var(--term-green-text-dim)] font-mono ml-0.5">
            ({epochsPerSec.toFixed(1)}/s)
          </span>
        )}
      </div>

      {/* ── Group 3: Hyperparameters & Escape Action ────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Learning Rate Select */}
        <div className="flex flex-col">
          <label
            htmlFor="neural-lr-select"
            className="text-[9px] uppercase font-bold text-[var(--term-green-text-dim)] tracking-wider"
          >
            LR
          </label>
          <select
            id="neural-lr-select"
            value={learningRate}
            onChange={(e) => {
              terminalSound.playKeyTick();
              onChangeLearningRate(parseFloat(e.target.value));
            }}
            className="bg-[#031106] border border-[var(--term-outline-green)] text-[var(--term-green-text-bright)] text-[11px] font-bold rounded px-1.5 py-0.5 outline-none hover:border-[#ffb700] transition-colors cursor-pointer"
          >
            {LEARNING_RATES.map((lr) => (
              <option key={`lr-${lr}`} value={lr} className="bg-[#040e06] text-[#4bff7b]">
                {lr}
              </option>
            ))}
          </select>
        </div>

        {/* Activation Select */}
        <div className="flex flex-col">
          <label
            htmlFor="neural-act-select"
            className="text-[9px] uppercase font-bold text-[var(--term-green-text-dim)] tracking-wider"
          >
            ACT
          </label>
          <select
            id="neural-act-select"
            value={activation}
            onChange={(e) => {
              terminalSound.playKeyTick();
              onChangeActivation(e.target.value as ActivationType);
            }}
            className="bg-[#031106] border border-[var(--term-outline-green)] text-[var(--term-green-text-bright)] text-[11px] font-bold rounded px-1.5 py-0.5 outline-none hover:border-[#ffb700] transition-colors cursor-pointer uppercase"
          >
            {ACTIVATIONS_LIST.map((act) => (
              <option key={`act-${act}`} value={act} className="bg-[#040e06] text-[#4bff7b] uppercase">
                {act === "relu" ? "ReLU" : act === "tanh" ? "Tanh" : act === "sigmoid" ? "Sigmoid" : "Linear"}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Tag */}
        <div className="flex items-center gap-1 pl-1 border-l border-[var(--term-outline-green)]/40 shrink-0">
          {mode === "watch" ? (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#ffb700]/70 bg-[#1a1102] text-[#ffb700] text-[9.5px] font-bold tracking-wider"
              title="Watch Mode: Guided analysis. Parameters unlocked in training lab."
            >
              <span>🔒</span>
              <span>WATCH</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#2EE85C]/70 bg-[#041c09] text-[#4BFF7B] text-[9.5px] font-bold tracking-wider shadow-[0_0_8px_rgba(46,232,92,0.3)]"
              title="Lab Mode: Full experiment playground enabled."
            >
              <span>⚡</span>
              <span>PLAYGROUND</span>
            </div>
          )}
        </div>

        {/* ── Group 4: Escape Action (Visible at top right, active when accuracy >= 95%) ── */}
        {onEscape && (
          <button
            type="button"
            disabled={!showEscapeButton}
            onClick={() => {
              if (!showEscapeButton) return;
              terminalSound.playSuccessChime();
              onEscape();
            }}
            className={`px-3 py-1.5 rounded border-2 font-black text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ml-1 ${
              showEscapeButton
                ? "border-[#2EE85C] bg-[#073612] hover:bg-[#0c4e1b] text-[#4BFF7B] shadow-[0_0_20px_rgba(46,232,92,0.8)] cursor-pointer animate-pulse pointer-events-auto"
                : "border-neutral-800 bg-[#020d05] text-neutral-600 opacity-60 cursor-not-allowed pointer-events-none"
            }`}
            title={
              showEscapeButton
                ? "Broadcast Extraction Beam & Escape Sector 4"
                : "Train neural network on Beacon Signal to ≥95% accuracy to initiate escape"
            }
          >
            <span>🚀</span>
            <span>INITIATE ESCAPE</span>
            <span>▶</span>
          </button>
        )}
      </div>
    </div>
  );
}
