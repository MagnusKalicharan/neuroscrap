"use client";

import React from "react";
import type { MathStep } from "./types";
import type { DataPoint } from "../nn/types";
import { terminalSound } from "../../ui/terminal/sound";

export interface MathWalkthroughControlsProps {
  currentStep: MathStep | null;
  currentStepIndex: number;
  totalSteps: number;
  isPlayingAuto: boolean;
  onToggleAutoPlay: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onRewind: () => void;
  onReplayStep: () => void;
  walkthroughSpeed: "slow" | "medium" | "fast";
  onChangeSpeed: (s: "slow" | "medium" | "fast") => void;
  currentSample: DataPoint | null;
  onNextSample: () => void;
  onOpenGlossary: () => void;
  activeMode: "walkthrough" | "playground";
  onToggleMode: () => void;
}

export function MathWalkthroughControls({
  currentStep,
  currentStepIndex,
  totalSteps,
  isPlayingAuto,
  onToggleAutoPlay,
  onNextStep,
  onPrevStep,
  onRewind,
  onReplayStep,
  walkthroughSpeed,
  onChangeSpeed,
  currentSample,
  onNextSample,
  onOpenGlossary,
  activeMode,
  onToggleMode,
}: MathWalkthroughControlsProps) {
  const progressPct = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="w-full bg-[#020a04] border-b border-[var(--term-outline-green)]/70 px-3 py-2 flex flex-col gap-1.5 font-mono select-none text-xs">
      {/* Top Row: Mode Switcher, Step Title, and Progress Indicator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              terminalSound.playSelectBlip();
              onToggleMode();
            }}
            className={`px-3 py-1 rounded border text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${
              activeMode === "walkthrough"
                ? "border-[#2EE85C] bg-[#062e0f] text-[#4BFF7B] shadow-[0_0_12px_rgba(46,232,92,0.3)]"
                : "border-[#FFB700] bg-[#221802] text-[#FFB700] shadow-[0_0_12px_rgba(255,183,0,0.3)]"
            }`}
            title="Toggle between Mathematical Walkthrough and Fast Playground mode"
          >
            <span>{activeMode === "walkthrough" ? "📐 MATH WALKTHROUGH" : "⚡ FAST PLAYGROUND"}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 text-white/70">
              SWITCH
            </span>
          </button>

          {/* Sample Picker Button */}
          {activeMode === "walkthrough" && currentSample && (
            <button
              type="button"
              onClick={() => {
                terminalSound.playKeyTick();
                onNextSample();
              }}
              className="px-2 py-1 rounded border border-[var(--term-outline-green)]/50 bg-[#031106] hover:bg-[#07250e] text-[10px] text-[var(--term-green-text-bright)] flex items-center gap-1"
              title="Pick next sample for mathematical walkthrough"
            >
              <span>SAMPLE:</span>
              <span className={`font-bold ${currentSample.label > 0 ? "text-[#FFB700]" : "text-[#2EE85C]"}`}>
                {currentSample.label > 0 ? "MACHINE (+1)" : "NATURAL (-1)"}
              </span>
              <span className="text-white/50 text-[9px]">[⚄ NEXT]</span>
            </button>
          )}
        </div>

        {/* Center: Chronological Step Description */}
        {activeMode === "walkthrough" && currentStep && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-[#010803] border border-[var(--term-outline-green)]/60 text-[#4BFF7B] font-bold text-[10px]">
              STEP {String(currentStepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </span>
            <span className="text-white font-bold text-xs truncate max-w-[280px]">
              {currentStep.title}
            </span>
          </div>
        )}

        {/* Right: Glossary & Help Button */}
        <div className="flex items-center gap-2">
          {activeMode === "walkthrough" && (
            <button
              type="button"
              onClick={() => {
                terminalSound.playSelectBlip();
                onOpenGlossary();
              }}
              className="px-2.5 py-1 rounded border border-[#2EE85C]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-[#4BFF7B] font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(46,232,92,0.2)]"
            >
              <span>[?]</span>
              <span>MATH GLOSSARY</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row (Walkthrough mode only): Transport controls, Scrub progress bar, Speed */}
      {activeMode === "walkthrough" && (
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--term-outline-green)]/30">
          {/* Transport buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                terminalSound.playKeyTick();
                onRewind();
              }}
              className="px-2 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-white"
              title="Rewind to Step 1"
            >
              ⏮
            </button>

            <button
              type="button"
              onClick={() => {
                terminalSound.playKeyTick();
                onPrevStep();
              }}
              className="px-2 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-white"
              title="Previous Step [◀]"
            >
              ◀ STEP
            </button>

            <button
              type="button"
              onClick={() => {
                terminalSound.playSelectBlip();
                onToggleAutoPlay();
              }}
              className={`px-3 py-0.5 rounded border text-[11px] font-bold transition-all flex items-center gap-1 ${
                isPlayingAuto
                  ? "border-[#FFB700] bg-[#221601] text-[#FFB700] shadow-[0_0_10px_rgba(255,183,0,0.4)]"
                  : "border-[#2EE85C] bg-[#062e0f] text-[#4BFF7B] shadow-[0_0_10px_rgba(46,232,92,0.3)]"
              }`}
            >
              <span>{isPlayingAuto ? "⏸ PAUSE" : "▶ AUTO PLAY"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                terminalSound.playKeyTick();
                onNextStep();
              }}
              className="px-2 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-white"
              title="Next Step [▶]"
            >
              STEP ▶
            </button>

            <button
              type="button"
              onClick={() => {
                terminalSound.playKeyTick();
                onReplayStep();
              }}
              className="px-2 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-[var(--term-green-text-dim)] hover:text-white"
              title="Replay Current Step"
            >
              ↺ REPLAY
            </button>
          </div>

          {/* Scrubber progress bar */}
          <div className="flex-1 max-w-[420px] flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-[#010803] border border-[var(--term-outline-green)]/50 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#2EE85C] via-[#00FFFF] to-[#FFB700] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] text-[var(--term-green-text-dim)] shrink-0 font-mono">
              {Math.round(progressPct)}%
            </span>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-[var(--term-green-text-dim)]">SPEED:</span>
            {(["slow", "medium", "fast"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeSpeed(s)}
                className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                  walkthroughSpeed === s
                    ? "border border-[#2EE85C] bg-[#072a10] text-[#4BFF7B]"
                    : "text-[var(--term-green-text-dim)] hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
