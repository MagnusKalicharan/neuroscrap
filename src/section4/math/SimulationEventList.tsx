"use client";

import React from "react";
import type { SimulationFrame } from "./packetSimulation";

export interface SimulationEventListProps {
  frames: SimulationFrame[];
  currentStageIndex: number;
  onSelectStage: (idx: number) => void;
  onClose: () => void;
}

export function SimulationEventList({
  frames,
  currentStageIndex,
  onSelectStage,
  onClose,
}: SimulationEventListProps) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-[380px] max-w-[90vw] z-40 bg-[#020d04]/95 border-l-2 border-[#2EE85C] shadow-[-10px_0_30px_rgba(0,0,0,0.85)] flex flex-col font-mono select-none text-xs backdrop-blur-md animate-fade-in">
      {/* Header */}
      <div className="p-3 border-b border-[#2EE85C]/50 flex items-center justify-between bg-[#041607] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="font-bold text-xs text-[#4BFF7B] uppercase tracking-wider">
            SIMULATION EVENT LIST
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-0.5 rounded border border-[#2EE85C]/60 text-[#4BFF7B] hover:bg-[#2EE85C]/20 text-xs font-bold"
        >
          ✕ CLOSE
        </button>
      </div>

      {/* Subheader info */}
      <div className="px-3 py-1.5 border-b border-[var(--term-outline-green)]/30 bg-[#010602] text-[10px] text-[var(--term-green-text-dim)] flex items-center justify-between shrink-0">
        <span>CLICK ANY EVENT TO JUMP</span>
        <span>{frames.length} TOTAL EVENTS</span>
      </div>

      {/* Scrollable event list table */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {frames.map((frame, idx) => {
          const isCurrent = idx === currentStageIndex;
          const isPast = idx < currentStageIndex;

          const badgeBorder =
            frame.event.phase === "backward"
              ? "border-[#E82EA5] text-[#FF80DF]"
              : frame.event.phase === "loss"
              ? "border-[#FFB700] text-[#FFB700]"
              : "border-[#2EE85C] text-[#4BFF7B]";

          return (
            <div
              key={frame.event.id}
              onClick={() => onSelectStage(idx)}
              className={`p-2 rounded border transition-all cursor-pointer flex flex-col gap-1 ${
                isCurrent
                  ? "border-[#2EE85C] bg-[#072a10] shadow-[0_0_12px_rgba(46,232,92,0.3)] ring-1 ring-white/30"
                  : isPast
                  ? "border-[var(--term-outline-green)]/40 bg-[#010803] hover:border-[var(--term-outline-green)] text-white/80"
                  : "border-gray-800/60 bg-[#010502]/60 opacity-60 hover:opacity-90"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1 py-0.2 rounded border ${badgeBorder} font-bold`}>
                    {frame.event.timeLabel}
                  </span>
                  <span className="font-bold text-[11px] text-white">
                    {frame.event.title}
                  </span>
                </div>
                {isCurrent && (
                  <span className="w-2 h-2 rounded-full bg-[#2EE85C] animate-ping" />
                )}
              </div>

              <div className="text-[10px] text-[var(--term-green-text-dim)] leading-tight">
                {frame.event.description}
              </div>

              {frame.event.summary && (
                <div className="flex items-center justify-between text-[9px] border-t border-[var(--term-outline-green)]/20 pt-1 mt-0.5">
                  <span className="text-[var(--term-green-text-dim)] uppercase">
                    {frame.event.summary.label}:
                  </span>
                  <span className="font-bold text-[#4BFF7B]">
                    {frame.event.summary.value}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--term-outline-green)]/40 bg-[#010602] text-[10px] text-[var(--term-green-text-dim)] text-center shrink-0">
        CISCO PACKET TRACER // NEURAL EVENT ENGINE
      </div>
    </div>
  );
}
