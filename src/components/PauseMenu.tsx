"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Settings,
  Volume2,
  VolumeX,
  Compass,
  ArrowLeft,
  RotateCcw,
  Sliders,
  Shield,
  Eye,
  Home,
} from "lucide-react";
import { terminalSound } from "../ui/terminal/sound";
import { shipAudio } from "../audio/shipAudio";

export interface PauseMenuProps {
  onResume: () => void;
  mouseSensitivity: number;
  onSensitivityChange: (val: number) => void;
  masterVolume: number;
  onVolumeChange: (val: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  reducedMotion: boolean;
  onToggleReduceMotion: () => void;
  onReturnToBaseCamp: () => void;
}

export function PauseMenu({
  onResume,
  mouseSensitivity,
  onSensitivityChange,
  masterVolume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  reducedMotion,
  onToggleReduceMotion,
  onReturnToBaseCamp,
}: PauseMenuProps) {
  const [activeTab, setActiveTab] = useState<"menu" | "settings" | "controls">("menu");

  // Handle ESC / Spacebar to resume or go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (activeTab !== "menu") {
          terminalSound.playBackBlip();
          setActiveTab("menu");
        } else {
          terminalSound.playSelectBlip();
          onResume();
        }
      } else if (e.code === "Space" && activeTab === "menu") {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          terminalSound.playSelectBlip();
          onResume();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, onResume]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && activeTab === "menu") {
          terminalSound.playSelectBlip();
          onResume();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md font-mono select-none p-4 cursor-default"
      role="dialog"
      aria-modal="true"
      aria-label="Game Pause Menu"
    >
      {/* Subtle background animated scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,255,255,0.15)_50%)] bg-[length:100%_4px]"
        aria-hidden="true"
      />

      {/* Main Sci-Fi Terminal Window Frame */}
      <div className="relative w-full max-w-xl bg-slate-950/95 border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(0,255,255,0.25)] overflow-hidden flex flex-col pointer-events-auto">
        {/* ── Top Header Bar ── */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-cyan-950/80 border-b border-cyan-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] text-amber-400 font-bold tracking-[0.25em] uppercase">
                SYSTEM STATUS // PAUSED
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-[0.2em] uppercase [text-shadow:0_0_15px_rgba(0,255,255,0.7)]">
                ORBITAL OPERATIONS
              </h2>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-cyan-400/60 block">VESSEL: AURELIA-IV</span>
            <span className="text-[10px] text-cyan-400 font-bold tracking-wider">SECTOR // SCHWARZSCHILD</span>
          </div>
        </div>

        {/* ── Content View Area ── */}
        <div className="p-6 md:p-8 flex flex-col gap-6">
          {/* VIEW 1: MAIN MENU */}
          {activeTab === "menu" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* RESUME BUTTON (Hero) */}
              <button
                type="button"
                onClick={() => {
                  terminalSound.playSelectBlip();
                  onResume();
                }}
                onMouseEnter={() => terminalSound.playKeyTick()}
                className="group relative w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-950/90 via-cyan-900/60 to-cyan-950/90 hover:from-cyan-900 hover:to-cyan-800 border-2 border-cyan-400 text-cyan-100 font-black text-base md:text-lg tracking-[0.25em] uppercase transition-all duration-200 shadow-[0_0_30px_rgba(0,255,255,0.3)] hover:shadow-[0_0_45px_rgba(0,255,255,0.6)] flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="w-5 h-5 text-cyan-300 fill-cyan-300 group-hover:scale-110 transition-transform animate-pulse" />
                <span>RESUME MISSION</span>
                <span className="absolute right-4 text-xs font-normal text-cyan-400/60 hidden sm:inline">
                  [SPACE / ESC]
                </span>
              </button>

              {/* SETTINGS BUTTON */}
              <button
                type="button"
                onClick={() => {
                  terminalSound.playSelectBlip();
                  setActiveTab("settings");
                }}
                onMouseEnter={() => terminalSound.playKeyTick()}
                className="w-full py-3.5 px-6 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-cyan-500/40 hover:border-cyan-300 text-cyan-200 font-bold text-sm tracking-[0.2em] uppercase transition-all flex items-center justify-between cursor-pointer shadow-sm hover:shadow-[0_0_20px_rgba(0,255,255,0.2)]"
              >
                <div className="flex items-center gap-3">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>AVIONICS SETTINGS</span>
                </div>
                <span className="text-xs text-cyan-400/50">SENSITIVITY & AUDIO ▸</span>
              </button>

              {/* CONTROLS BUTTON */}
              <button
                type="button"
                onClick={() => {
                  terminalSound.playSelectBlip();
                  setActiveTab("controls");
                }}
                onMouseEnter={() => terminalSound.playKeyTick()}
                className="w-full py-3.5 px-6 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-cyan-500/40 hover:border-cyan-300 text-cyan-200 font-bold text-sm tracking-[0.2em] uppercase transition-all flex items-center justify-between cursor-pointer shadow-sm hover:shadow-[0_0_20px_rgba(0,255,255,0.2)]"
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>FLIGHT MANUAL & CONTROLS</span>
                </div>
                <span className="text-xs text-cyan-400/50">KEYBOARD BINDINGS ▸</span>
              </button>

              {/* RETURN TO BASE CAMP BUTTON */}
              <button
                type="button"
                onClick={() => {
                  terminalSound.playSelectBlip();
                  onReturnToBaseCamp();
                }}
                onMouseEnter={() => terminalSound.playKeyTick()}
                className="w-full py-3 px-6 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800 hover:border-red-500/60 text-neutral-400 hover:text-red-300 font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-between cursor-pointer mt-2"
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4" />
                  <span>RETURN TO BASE CAMP</span>
                </div>
                <span className="text-[10px] text-neutral-600">QUIT TO TITLE</span>
              </button>
            </div>
          )}

          {/* VIEW 2: SETTINGS (Sensitivity, Volume, Audio) */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-150">
              {/* Back to menu button */}
              <button
                type="button"
                onClick={() => {
                  terminalSound.playBackBlip();
                  setActiveTab("menu");
                }}
                className="self-start text-xs text-cyan-400 hover:text-cyan-200 flex items-center gap-1.5 transition-colors cursor-pointer font-bold tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK TO PAUSE MENU</span>
              </button>

              <div className="flex flex-col gap-6 bg-slate-900/60 border border-cyan-900/60 rounded-xl p-5">
                {/* ── 1. MOUSE SENSITIVITY CONTROL ── */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 tracking-wider flex items-center gap-2">
                      <Compass className="w-4 h-4 text-cyan-400" />
                      MOUSE LOOK SENSITIVITY
                    </span>
                    <span className="text-xs font-black text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
                      {mouseSensitivity.toFixed(2)}x
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={mouseSensitivity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onSensitivityChange(val);
                      try {
                        localStorage.setItem("neuroscrap_mouse_sens", val.toString());
                      } catch {}
                    }}
                    className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-900 focus:outline-none"
                    aria-label="Mouse Sensitivity Slider"
                  />

                  <div className="flex justify-between text-[10px] text-cyan-400/50 font-bold px-0.5">
                    <span>0.2x (TACTICAL)</span>
                    <span>1.0x (DEFAULT)</span>
                    <span>3.0x (TWITCH)</span>
                  </div>
                </div>

                {/* ── 2. AUDIO & SOUND CONTROL ── */}
                <div className="flex flex-col gap-3 border-t border-cyan-900/40 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 tracking-wider flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      MASTER AUDIO VOLUME
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded">
                        {isMuted ? "MUTED" : `${masterVolume}%`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          terminalSound.playSelectBlip();
                          onToggleMute();
                        }}
                        className={`p-1.5 rounded border transition-all cursor-pointer ${
                          isMuted
                            ? "bg-red-950/80 border-red-500/60 text-red-300"
                            : "bg-slate-800 border-cyan-500/40 text-cyan-300 hover:border-cyan-300"
                        }`}
                        title={isMuted ? "Unmute Audio" : "Mute Audio"}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    disabled={isMuted}
                    value={isMuted ? 0 : masterVolume}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      onVolumeChange(val);
                    }}
                    className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-900 disabled:opacity-30 focus:outline-none"
                    aria-label="Master Volume Slider"
                  />
                </div>

                {/* ── 3. REDUCE MOTION TOGGLE ── */}
                <div className="flex items-center justify-between border-t border-cyan-900/40 pt-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-cyan-300 tracking-wider flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      REDUCE MOTION
                    </span>
                    <span className="text-[10px] text-cyan-400/60">
                      Disables head bob, screen flicker & aggressive camera roll
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      terminalSound.playSelectBlip();
                      onToggleReduceMotion();
                    }}
                    className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                      reducedMotion
                        ? "bg-cyan-500 text-black border-cyan-300"
                        : "bg-slate-950 text-cyan-300 border-cyan-800 hover:border-cyan-500"
                    }`}
                  >
                    {reducedMotion ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: CONTROLS REFERENCE */}
          {activeTab === "controls" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => {
                  terminalSound.playBackBlip();
                  setActiveTab("menu");
                }}
                className="self-start text-xs text-cyan-400 hover:text-cyan-200 flex items-center gap-1.5 transition-colors cursor-pointer font-bold tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK TO PAUSE MENU</span>
              </button>

              <div className="bg-slate-900/70 border border-cyan-900/60 rounded-xl p-4 flex flex-col gap-3">
                <div className="text-[11px] font-bold text-cyan-400/80 tracking-widest border-b border-cyan-900/40 pb-2 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  AVIONICS FLIGHT KEYBINDINGS
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-cyan-950">
                    <span className="text-cyan-300 font-bold">W A S D</span>
                    <span className="text-slate-400">Thruster Move</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-cyan-950">
                    <span className="text-cyan-300 font-bold">SHIFT</span>
                    <span className="text-slate-400">Sprint Boost</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-cyan-950">
                    <span className="text-cyan-300 font-bold">MOUSE</span>
                    <span className="text-slate-400">360° Free Look</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-cyan-950">
                    <span className="text-cyan-300 font-bold">T</span>
                    <span className="text-slate-400">Toggle Flashlight</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-cyan-950">
                    <span className="text-cyan-300 font-bold">E / F</span>
                    <span className="text-slate-400">Interact / Scan</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-cyan-950">
                    <span className="text-cyan-300 font-bold">ESC</span>
                    <span className="text-slate-400">Pause Menu</span>
                  </div>
                </div>

                <div className="text-[11px] text-amber-300/80 border-t border-cyan-950 pt-2 flex items-center gap-1.5">
                  <span>✦</span>
                  <span>Physical Obstacle Collisions Active — Wreckage & boulders are solid</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 bg-slate-950 border-t border-cyan-950/80 flex items-center justify-between text-[10px] text-cyan-400/50">
          <span>ANTIGRAVITY SYSTEMS // NEURO-SCRAP</span>
          <span>CLICK OUTSIDE OR PRESS [ESC] TO RESUME</span>
        </div>
      </div>
    </div>
  );
}

export default PauseMenu;
