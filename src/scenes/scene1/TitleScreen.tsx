"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Play, RotateCcw, Settings, X, Sliders } from "lucide-react";
import { scene1Sound } from "./sound";

interface TitleScreenProps {
  onPlayClick: () => void;
  onContinueClick?: () => void;
  onReplayIntro?: () => void;
  shipLoadProgress?: number; // 0.0 to 1.0
  reduceMotion: boolean;
  onToggleReduceMotion: (enabled: boolean) => void;
  textSize: "normal" | "large";
  onChangeTextSize: (size: "normal" | "large") => void;
  graphicsQuality: "low" | "medium" | "high";
  onChangeGraphicsQuality: (quality: "low" | "medium" | "high") => void;
  alwaysSkipIntro: boolean;
  onChangeAlwaysSkipIntro: (skip: boolean) => void;
}

export default function TitleScreen({
  onPlayClick,
  onContinueClick,
  onReplayIntro,
  shipLoadProgress = 1.0,
  reduceMotion,
  onToggleReduceMotion,
  textSize,
  onChangeTextSize,
  graphicsQuality,
  onChangeGraphicsQuality,
  alwaysSkipIntro,
  onChangeAlwaysSkipIntro,
}: TitleScreenProps) {
  const [hasSaveData, setHasSaveData] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showSettings, setShowSettings] = useState(false);
  const [scene1Seen, setScene1Seen] = useState(false);

  const playBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check saved progress and flags
    try {
      const save = localStorage.getItem("neuroscrap_save");
      if (save) setHasSaveData(true);
      const seen = localStorage.getItem("scene1Seen");
      if (seen === "true") setScene1Seen(true);
      setIsMuted(scene1Sound.getIsMuted());
      setVolume(Math.round(scene1Sound.getVolume() * 100));
    } catch {}

    // Focus primary button on mount for quick keyboard access
    playBtnRef.current?.focus();
  }, []);

  const handleToggleMute = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    scene1Sound.setMuted(nextMuted);
    scene1Sound.playClick();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    scene1Sound.setVolume(newVol / 100);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      scene1Sound.setMuted(false);
    }
  };

  return (
    <div
      className={`scene1-title-container absolute inset-0 z-30 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none ${
        textSize === "large" ? "text-lg" : "text-base"
      }`}
    >
      {/* ── TOP BAR: SOUND TOGGLE (TOP-RIGHT) ── */}
      <div className="flex justify-end w-full pointer-events-auto">
        <button
          onClick={handleToggleMute}
          onMouseEnter={() => scene1Sound.playHoverTick()}
          onFocus={() => scene1Sound.playHoverTick()}
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          title={isMuted ? "Unmute audio" : "Mute audio"}
          className="p-3 rounded-md bg-black/60 hover:bg-cyan-950/70 border border-cyan-500/40 text-cyan-400 hover:text-cyan-200 transition-all backdrop-blur-md cursor-pointer scene1-focus-ring shadow-[0_0_15px_rgba(0,243,255,0.2)]"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* ── TOP-LEFT: TITLE & SUBTITLE & PRIMARY ACTIONS ── */}
      <div className="max-w-2xl flex flex-col items-start space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="scene1-title text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_25px_rgba(0,243,255,0.7)]">
            NEURO-SCRAP
          </h1>
          <p className="scene1-subtitle text-xs sm:text-sm md:text-base font-mono uppercase tracking-[0.2em] text-cyan-300/80">
            Repair your brain. Repair the ship.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col items-start gap-3 w-full sm:w-auto pointer-events-auto">
          {/* PLAY BUTTON (Primary, Beveled Neon Outline) */}
          <div className="relative group w-full sm:w-64">
            <button
              ref={playBtnRef}
              onClick={() => {
                scene1Sound.playClick();
                onPlayClick();
              }}
              onMouseEnter={() => scene1Sound.playHoverTick()}
              onFocus={() => scene1Sound.playHoverTick()}
              className="scene1-play-btn w-full px-8 py-3.5 bg-black/75 hover:bg-cyan-950/50 border-2 border-cyan-400 text-white font-mono font-bold tracking-[0.25em] uppercase transition-all cursor-pointer flex items-center justify-center gap-3 scene1-focus-ring shadow-[0_0_20px_rgba(0,243,255,0.35)] hover:shadow-[0_0_35px_rgba(0,243,255,0.65)] hover:border-cyan-300"
              style={{
                clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))",
              }}
            >
              <Play className="w-4 h-4 fill-cyan-400 text-cyan-400" />
              <span>PLAY</span>
            </button>

            {/* Thin Loading Bar Under PLAY Button */}
            <div className="w-full h-1 bg-black/80 border border-cyan-500/30 mt-1.5 overflow-hidden rounded-full">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-300 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(8, shipLoadProgress * 100))}%` }}
              />
            </div>
          </div>

          {/* CONTINUE BUTTON (Only shown if save exists) */}
          {hasSaveData && (
            <button
              onClick={() => {
                scene1Sound.playClick();
                onContinueClick?.();
              }}
              onMouseEnter={() => scene1Sound.playHoverTick()}
              onFocus={() => scene1Sound.playHoverTick()}
              className="w-full sm:w-64 px-6 py-2.5 bg-black/60 hover:bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300/90 font-mono text-xs tracking-[0.2em] uppercase transition-all backdrop-blur-sm cursor-pointer scene1-focus-ring flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CONTINUE</span>
            </button>
          )}

          {/* SETTINGS BUTTON */}
          <button
            onClick={() => {
              scene1Sound.playClick();
              setShowSettings(true);
            }}
            onMouseEnter={() => scene1Sound.playHoverTick()}
            onFocus={() => scene1Sound.playHoverTick()}
            className="w-full sm:w-64 px-6 py-2.5 bg-black/60 hover:bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300/80 hover:text-cyan-200 font-mono text-xs tracking-[0.2em] uppercase transition-all backdrop-blur-sm cursor-pointer scene1-focus-ring flex items-center justify-center gap-2"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>SETTINGS</span>
          </button>
        </div>
      </div>

      {/* ── BOTTOM TACTICAL HINT ── */}
      <div className="font-mono text-[11px] text-cyan-400/50 uppercase tracking-widest pointer-events-none">
        [SYS] NEURO-SCRAP V0.1 // SHIP CRASH SITE
      </div>

      {/* ── SETTINGS MODAL ── */}
      {showSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-black/95 border-2 border-cyan-500/50 p-6 md:p-8 rounded-lg max-w-md w-full shadow-[0_0_40px_rgba(0,243,255,0.3)] space-y-6 text-white font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
              <h2 id="settings-title" className="text-lg font-bold tracking-wider text-cyan-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                SYSTEM SETTINGS
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-cyan-400 hover:text-white p-1 scene1-focus-ring cursor-pointer"
                aria-label="Close settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-cyan-200">
                  <span>MASTER VOLUME</span>
                  <span>{isMuted ? "MUTED" : `${volume}%`}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Graphics Quality */}
              <div className="space-y-1.5">
                <span className="text-cyan-200">GRAPHICS QUALITY</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => onChangeGraphicsQuality(q)}
                      className={`py-1.5 border rounded uppercase text-center cursor-pointer scene1-focus-ring ${
                        graphicsQuality === q
                          ? "border-cyan-400 bg-cyan-950/60 text-cyan-200 font-bold"
                          : "border-gray-800 bg-black/40 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reduce Motion */}
              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => onToggleReduceMotion(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
                <span className="text-cyan-200">REDUCE MOTION (Disable camera drift & flash shake)</span>
              </label>

              {/* Text Size */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-cyan-200">INTERFACE TEXT SIZE</span>
                <div className="flex gap-2">
                  {(["normal", "large"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => onChangeTextSize(s)}
                      className={`px-3 py-1 border rounded uppercase text-center cursor-pointer scene1-focus-ring ${
                        textSize === s
                          ? "border-cyan-400 bg-cyan-950/60 text-cyan-200 font-bold"
                          : "border-gray-800 bg-black/40 text-gray-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Always Skip Intro (Available if previously seen) */}
              {scene1Seen && (
                <label className="flex items-center gap-3 cursor-pointer pt-1 border-t border-cyan-500/20 pt-3">
                  <input
                    type="checkbox"
                    checked={alwaysSkipIntro}
                    onChange={(e) => onChangeAlwaysSkipIntro(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400"
                  />
                  <span className="text-cyan-200">ALWAYS SKIP INTRO</span>
                </label>
              )}

              {/* Replay Intro Button */}
              {onReplayIntro && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      onReplayIntro();
                    }}
                    className="w-full py-2 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 uppercase tracking-widest text-center bg-black/60 hover:bg-cyan-950/40 cursor-pointer scene1-focus-ring transition-all"
                  >
                    REPLAY INTRO
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
