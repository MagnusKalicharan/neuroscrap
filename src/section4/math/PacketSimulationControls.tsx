"use client";

import React from "react";
import type { SimulationEvent } from "./packetSimulation";
import type { DataPoint } from "../nn/types";
import { terminalSound } from "../../ui/terminal/sound";

export interface PacketSimulationControlsProps {
  currentEvent: SimulationEvent;
  stageIndex: number;
  totalStages: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextStage: () => void;
  onPrevStage: () => void;
  onReset: () => void;
  speed: 0.25 | 0.5 | 1 | 2;
  onChangeSpeed: (speed: 0.25 | 0.5 | 1 | 2) => void;
  currentSample: DataPoint | null;
  onNextSample: () => void;
  showEventList: boolean;
  onToggleEventList: () => void;
  onOpenGlossary: () => void;
  onToggleMode: () => void;
}

export function PacketSimulationControls({
  currentEvent,
  stageIndex,
  totalStages,
  isPlaying,
  onTogglePlay,
  onNextStage,
  onPrevStage,
  onReset,
  speed,
  onChangeSpeed,
  currentSample,
  onNextSample,
  showEventList,
  onToggleEventList,
  onOpenGlossary,
  onToggleMode,
}: PacketSimulationControlsProps) {
  const progressPct = ((stageIndex + 1) / totalStages) * 100;

  return (
    <div className="w-full bg-[#020a04] border-b border-[var(--term-outline-green)]/70 px-3 py-2 flex flex-col gap-1.5 font-mono select-none text-xs">
      {/* ── Top Row: Header, Cisco Simulation Badge, Step Description & Actions ─ */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Mode Switcher & Cisco Packet Tracer badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#2EE85C] bg-[#062e0f] text-[#4BFF7B] shadow-[0_0_12px_rgba(46,232,92,0.3)] font-black text-xs">
            <span className="w-2 h-2 rounded-full bg-[#2EE85C] animate-pulse" />
            <span>CISCO PACKET TRACER // SIMULATION MODE</span>
          </div>

          <button
            type="button"
            onClick={() => {
              terminalSound.playSelectBlip();
              onToggleMode();
            }}
            className="px-2.5 py-1 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[10px] text-[var(--term-green-text-bright)] transition-all"
            title="Switch to Fast Continuous Playground Training"
          >
            ⚡ SWITCH TO PLAYGROUND
          </button>

          {/* Sample Switcher */}
          {currentSample && (
            <button
              type="button"
              onClick={() => {
                terminalSound.playKeyTick();
                onNextSample();
              }}
              className="px-2 py-1 rounded border border-[var(--term-outline-green)]/50 bg-[#031106] hover:bg-[#07250e] text-[10px] text-[var(--term-green-text-bright)] flex items-center gap-1"
              title="Inject next signal vector"
            >
              <span>INJECT:</span>
              <span className={`font-bold ${currentSample.label > 0 ? "text-[#FFB700]" : "text-[#2EE85C]"}`}>
                {currentSample.label > 0 ? "MACHINE (+1)" : "NATURAL (-1)"}
              </span>
              <span className="text-white/50 text-[9px]">[⚄ NEXT]</span>
            </button>
          )}
        </div>

        {/* Center: Real-time Event Title & Phase Indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
              currentEvent.phase === "backward"
                ? "border-[#E82EA5] bg-[#250017] text-[#FF80DF]"
                : currentEvent.phase === "loss"
                ? "border-[#FFB700] bg-[#221601] text-[#FFB700]"
                : "border-[#2EE85C] bg-[#010803] text-[#4BFF7B]"
            }`}
          >
            {currentEvent.timeLabel} • STAGE {stageIndex + 1}/{totalStages}
          </span>
          <span className="text-white font-bold text-xs truncate max-w-[340px]">
            {currentEvent.title}
          </span>
        </div>

        {/* Right: Event List Drawer toggle & Glossary */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              terminalSound.playSelectBlip();
              onToggleEventList();
            }}
            className={`px-2.5 py-1 rounded border text-[11px] font-bold flex items-center gap-1 transition-all ${
              showEventList
                ? "border-[#2EE85C] bg-[#072a10] text-[#4BFF7B]"
                : "border-[var(--term-outline-green)]/60 bg-[#031106] text-[var(--term-green-text-bright)]"
            }`}
          >
            <span>📋</span>
            <span>EVENT LIST</span>
          </button>

          <button
            type="button"
            onClick={() => {
              terminalSound.playSelectBlip();
              onOpenGlossary();
            }}
            className="px-2 py-1 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-[var(--term-green-text-bright)]"
          >
            [?] NOTATION
          </button>
        </div>
      </div>

      {/* ── Bottom Row: Cisco Packet Tracer VCR Transport Controls ─────── */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--term-outline-green)]/30">
        {/* VCR Play / Step Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              terminalSound.playKeyTick();
              onReset();
            }}
            className="px-2 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-white"
            title="Rewind to Stage 0"
          >
            ⏮ RESET
          </button>

          <button
            type="button"
            onClick={() => {
              terminalSound.playKeyTick();
              onPrevStage();
            }}
            className="px-2 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-white"
            title="Step Back [◀]"
          >
            |◀ PREV
          </button>

          <button
            type="button"
            onClick={() => {
              terminalSound.playSelectBlip();
              onTogglePlay();
            }}
            className={`px-3 py-0.5 rounded border text-[11px] font-bold transition-all flex items-center gap-1 ${
              isPlaying
                ? "border-[#FFB700] bg-[#221601] text-[#FFB700] shadow-[0_0_10px_rgba(255,183,0,0.4)]"
                : "border-[#2EE85C] bg-[#062e0f] text-[#4BFF7B] shadow-[0_0_10px_rgba(46,232,92,0.3)]"
            }`}
          >
            <span>{isPlaying ? "⏸ PAUSE" : "▶ AUTO SIMULATE"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              terminalSound.playKeyTick();
              onNextStage();
            }}
            className="px-2.5 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] hover:bg-[#07250e] text-[11px] text-[#4BFF7B] font-bold"
            title="Step Forward [▶]"
          >
            NEXT ▶|
          </button>
        </div>

        {/* Cisco Packet Tracer Simulation Progress Bar */}
        <div className="flex-1 max-w-[460px] flex items-center gap-2">
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

        {/* Speed Selector */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-[var(--term-green-text-dim)]">SPEED:</span>
          {([0.25, 0.5, 1, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeSpeed(s)}
              className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                speed === s
                  ? "border border-[#2EE85C] bg-[#072a10] text-[#4BFF7B]"
                  : "text-[var(--term-green-text-dim)] hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
