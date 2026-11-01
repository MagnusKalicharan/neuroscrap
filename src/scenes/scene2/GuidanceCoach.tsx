"use client";

import React, { useState, useEffect } from "react";

interface GuidanceCoachProps {
  currentStepIndex: number; // 0: look, 1: move, 2: beacon
  objectiveText: string;
  nudgeMessage?: string | null;
  onShowMe?: () => void;
  showNudgePulse?: boolean;
}

export default function GuidanceCoach({
  currentStepIndex,
  objectiveText,
  nudgeMessage,
  onShowMe,
  showNudgePulse = false,
}: GuidanceCoachProps) {
  return (
    <div className="fixed top-6 left-6 z-40 max-w-md select-none pointer-events-none">
      <div className="bg-black/85 border border-cyan-500/40 rounded-xl p-3.5 backdrop-blur-md shadow-[0_0_25px_rgba(0,255,255,0.15)] flex flex-col gap-2">
        {/* Step tracker dots */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">
            MOTOR CALIBRATION SEQUENCE
          </span>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isDone
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : isCurrent
                      ? "bg-cyan-400 animate-ping shadow-[0_0_8px_#38bdf8]"
                      : "bg-neutral-700"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Objective line */}
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-cyan-500/70">
            OBJECTIVE:
          </span>
          <h2
            className="font-mono text-base sm:text-lg font-bold text-white tracking-wide"
            aria-live="polite"
          >
            {objectiveText}
          </h2>
        </div>

        {/* Nudge Alert */}
        {nudgeMessage && (
          <div
            className={`mt-1 font-mono text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1.5 rounded flex items-center justify-between pointer-events-auto transition-all ${
              showNudgePulse ? "animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.3)]" : ""
            }`}
          >
            <span>⚠ {nudgeMessage}</span>
            {onShowMe && (
              <button
                onClick={onShowMe}
                className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50 rounded transition-colors"
              >
                Show me
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
