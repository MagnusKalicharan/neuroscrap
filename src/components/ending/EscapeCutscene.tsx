"use client";
/**
 * src/components/ending/EscapeCutscene.tsx
 * ============================================================
 * Cinematic Overlay for "THE ENDING":
 * - Driven strictly by endingClock (TimelineClock master clock engine)
 * - Translucent cinematic letterbox & live subtitles (ORACLE, RESCUE TWO, SCRAP)
 * - "2 Hours Later..." Time Lapse Title Card
 * - Synchronized Web Audio API sound effects
 * - Epilogue victory debrief card with replay & playground exploration
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { terminalSound } from "../../ui/terminal/sound";
import { shipAudio } from "../../audio/shipAudio";
import { endingClock } from "../../ending/endingClock";
import { endingState, EndingPhase } from "../../ending/endingState";

export interface EscapeCutsceneProps {
  onLandingComplete?: () => void;
  onComplete?: () => void;
  onExplorePlayground?: () => void;
  reducedMotion?: boolean;
}

export function EscapeCutscene({
  onLandingComplete,
  onComplete,
  onExplorePlayground,
  reducedMotion = false,
}: EscapeCutsceneProps) {
  // Master Clock elapsed time in seconds (0..60), driven monotonically by endingClock
  const [elapsed, setElapsed] = useState(0);

  // Ending State Subscription
  const [phase, setPhase] = useState<EndingPhase>(() => endingState.getPhase());
  const [nearShip, setNearShip] = useState(() => endingState.getNearRescueShip());
  const [boarded, setBoarded] = useState(() => endingState.getIsBoarded());

  // Audio Cue Tracking (fires once per cue)
  const audioTriggered = useRef<Record<string, boolean>>({});

  // ── Master Clock & Ending State Subscription ──────────────────────────────
  useEffect(() => {
    audioTriggered.current = {};
    endingState.reset();
    endingClock.start();

    const unsubClock = endingClock.subscribe((ms) => {
      setElapsed(ms / 1000);
    });

    const unsubState = endingState.subscribe(() => {
      setPhase(endingState.getPhase());
      setNearShip(endingState.getNearRescueShip());
      setBoarded(endingState.getIsBoarded());
    });

    return () => {
      unsubClock();
      unsubState();
      endingClock.stop();
    };
  }, []);

  // Boarding action
  const handleBoard = useCallback(() => {
    terminalSound.playSuccessChime();
    shipAudio.playPowerRestoreSequence();
    endingState.boardShip();
    endingClock.skipTo(48000);
    endingClock.resume();
  }, []);

  // Global [E] key listener during manual egress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && nearShip && phase === "manual_egress" && !boarded) {
        handleBoard();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nearShip, phase, boarded, handleBoard]);

  // ── Synchronized Audio Cue Triggers ──────────────────────────────────────
  useEffect(() => {
    const triggerAudio = (key: string, fn: () => void) => {
      if (!audioTriggered.current[key]) {
        audioTriggered.current[key] = true;
        try {
          fn();
        } catch {}
      }
    };

    // 0.5s: Antenna charging hum
    if (elapsed >= 0.5) {
      triggerAudio("antenna_hum", () => {
        terminalSound.playSuccessChime();
        shipAudio.playPowerRestoreSequence();
      });
    }

    // 3.0s: Energy beam discharge
    if (elapsed >= 3.0) {
      triggerAudio("beam_fire", () => {
        shipAudio.playConsoleBeep();
      });
    }

    // 9.5s: Time-lapse enter
    if (elapsed >= 9.5) {
      triggerAudio("timelapse", () => {
        terminalSound.playKeyTick();
      });
    }

    // 14.0s: Radio incoming transmission
    if (elapsed >= 14.0) {
      triggerAudio("radio_contact", () => {
        shipAudio.playConsoleBeep();
      });
    }

    // 16.5s: Saucer atmospheric re-entry
    if (elapsed >= 16.5) {
      triggerAudio("reentry", () => {
        shipAudio.playPowerRestoreSequence();
      });
    }

    // 28.5s: Touchdown & ramp hiss
    if (elapsed >= 28.5) {
      triggerAudio("touchdown", () => {
        terminalSound.playSuccessChime();
      });
    }

    // 48.5s: Liftoff blast
    if (elapsed >= 48.5) {
      triggerAudio("liftoff", () => {
        shipAudio.playPowerRestoreSequence();
      });
    }
  }, [elapsed]);

  // Completion trigger when UFO has fully landed on dunes (at 32.0s)
  useEffect(() => {
    if (elapsed >= 32.0 && onLandingComplete) {
      onLandingComplete();
    }
  }, [elapsed, onLandingComplete]);

  // Keyboard shortcut: [ESC] to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onLandingComplete) {
          onLandingComplete();
        } else {
          endingClock.skipTo(57000);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onLandingComplete]);

  // ── Subtitle Cues ────────────────────────────────────────────────────────
  let subtitle: { speaker: string; text: string; color: string } | null = null;

  if (elapsed >= 1.0 && elapsed < 4.0) {
    subtitle = {
      speaker: "ORACLE",
      text: "Distress uplink online. Locking Section 3 beacon coordinates...",
      color: "#10B981",
    };
  } else if (elapsed >= 4.0 && elapsed < 8.5) {
    subtitle = {
      speaker: "ORACLE",
      text: "Carrier frequency active. Transmitting distress carrier into deep space.",
      color: "#10B981",
    };
  } else if (elapsed >= 10.0 && elapsed < 13.0) {
    subtitle = {
      speaker: "ORACLE",
      text: "Carrier propagation distance: 2.4 million km... Receiving sub-space carrier response!",
      color: "#10B981",
    };
  } else if (elapsed >= 13.0 && elapsed < 16.0) {
    subtitle = {
      speaker: "RESCUE TWO",
      text: "SCRAP, this is Rescue Two. We hear you loud and clear. Entering atmospheric descent now. Hold on.",
      color: "#38BDF8",
    };
  } else if (elapsed >= 17.5 && elapsed < 22.0) {
    subtitle = {
      speaker: "ORACLE",
      text: "Extraction vessel detected entering upper atmosphere! Descending across black hole horizon.",
      color: "#10B981",
    };
  } else if (elapsed >= 22.0 && elapsed < 27.5) {
    subtitle = {
      speaker: "RESCUE TWO",
      text: "Visual on crashed freighter wreckage. Retro-braking thrusters engaged.",
      color: "#38BDF8",
    };
  } else if (elapsed >= 28.5 && elapsed < 33.0) {
    subtitle = {
      speaker: "RESCUE TWO",
      text: "Touchdown confirmed on left dunes! Airlock open. Scrap, get out here and board the ship!",
      color: "#38BDF8",
    };
  } else if (phase === "manual_egress" && !boarded) {
    subtitle = {
      speaker: "ORACLE",
      text: "Rescue Two is waiting on the dunes! Move out through the port hull breach and board the ship!",
      color: "#10B981",
    };
  } else if (elapsed >= 48.5 && elapsed < 53.0) {
    subtitle = {
      speaker: "RESCUE TWO",
      text: "All aboard! Securing airlock. Punching out of orbit to hyperspace!",
      color: "#38BDF8",
    };
  } else if (elapsed >= 53.0 && elapsed < 56.0) {
    subtitle = {
      speaker: "SCRAP",
      text: "...Thank you.",
      color: "#F59E0B",
    };
  }

  // ── "2 Hours Later..." Time Lapse Overlay (Act 2: 9s - 15.5s) ────────────
  const showTimeLapse = elapsed >= 9.0 && elapsed <= 15.5;
  const timeLapseOpacity =
    elapsed < 10.0
      ? (elapsed - 9.0) / 1.0
      : elapsed > 14.5
      ? (15.5 - elapsed) / 1.0
      : 1.0;

  // ── End Card Victory Screen (Act 7: >= 56s) ──────────────────────────────
  const showVictoryCard = elapsed >= 56.0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden font-mono">
      {/* ── Top Cinematic Letterbox Bar ── */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-black/90 border-b border-cyan-950/60 flex items-center justify-between px-6 z-10 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
            THE ENDING // RESCUE TWO EXTRACTION CINEMATIC
          </span>
          <span className="text-xs text-slate-500">
            {elapsed.toFixed(1)}s / 32.0s
          </span>
        </div>

        {/* Skip button */}
        {!showVictoryCard && (
          <button
            onClick={() => {
              if (onLandingComplete) {
                onLandingComplete();
              } else {
                endingClock.skipTo(57000);
              }
            }}
            className="px-3 py-1 text-xs border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:border-cyan-400 transition-colors rounded cursor-pointer"
          >
            [ESC] SKIP TO GAMEPLAY
          </button>
        )}
      </div>

      {/* ── Bottom Cinematic Letterbox Bar ── */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/90 border-t border-cyan-950/60 z-10" />

      {/* ── Subtitle Overlay Banner ── */}
      {subtitle && !showTimeLapse && !showVictoryCard && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-2xl w-full px-6 text-center">
          <div className="inline-block bg-black/85 border border-slate-700/80 backdrop-blur-md px-6 py-2.5 rounded-lg shadow-2xl">
            <span
              className="font-bold text-xs mr-2.5 tracking-wider px-1.5 py-0.5 rounded border"
              style={{
                color: subtitle.color,
                borderColor: `${subtitle.color}55`,
                backgroundColor: `${subtitle.color}15`,
              }}
            >
              {subtitle.speaker}
            </span>
            <span className="text-sm text-slate-100 font-medium">
              {subtitle.text}
            </span>
          </div>
        </div>
      )}

      {/* ── Manual Egress Player Objective & [E] Board Prompt ── */}
      {phase === "manual_egress" && !boarded && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 pointer-events-auto">
          <div className="bg-black/90 border border-cyan-400/80 px-5 py-2 rounded-full shadow-[0_0_20px_rgba(56,189,248,0.4)] flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold text-cyan-300 tracking-wider uppercase">
              {nearShip ? "RESCUE TWO ENTRYWAY WITHIN REACH" : "PROCEED TO RESCUE TWO ON THE LEFT DUNES"}
            </span>
          </div>

          {nearShip && (
            <button
              onClick={handleBoard}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm tracking-widest rounded-lg shadow-[0_0_30px_rgba(56,189,248,0.8)] cursor-pointer animate-bounce transition-all flex items-center gap-2 border-2 border-white"
            >
              <span>[E] BOARD RESCUE TWO & LEAVE</span>
            </button>
          )}
        </div>
      )}

      {/* ── "2 Hours Later..." Time Lapse Title Card ── */}
      {showTimeLapse && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm transition-opacity duration-700"
          style={{ opacity: timeLapseOpacity }}
        >
          <div className="text-center space-y-3 px-6">
            <div className="text-3xl md:text-5xl font-black text-white tracking-[0.25em] drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]">
              2 HOURS LATER...
            </div>
            <div className="text-xs md:text-sm text-cyan-400 tracking-[0.2em] uppercase">
              [ SUB-SPACE DISTRESS SIGNAL PROPAGATING ACROSS SECTOR 7 ]
            </div>
            <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mt-4" />
          </div>
        </div>
      )}

      {/* ── Epilogue / Mission Complete Summary Card (Act 7) ── */}
      {showVictoryCard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/95 p-6 pointer-events-auto animate-fadeIn">
          <div className="max-w-xl w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-6 md:p-8 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-slate-200 space-y-6">
            {/* Header */}
            <div className="border-b border-emerald-900/60 pb-4 text-center space-y-1">
              <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                MISSION ACCOMPLISHED // EXTRACTION CONFIRMED
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
                PLANETARY ESCAPE COMPLETE
              </h1>
            </div>

            {/* Mission Recap Checklist */}
            <div className="space-y-3 bg-slate-900/60 border border-slate-800 p-4 rounded-lg text-xs md:text-sm">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>✓ SECTION 1: DATA TELEMETRY</span>
                <span className="text-slate-400 font-normal">CLEANSED & VALIDATED</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>✓ SECTION 2: TRANSMISSION RELAY</span>
                <span className="text-slate-400 font-normal">VOLTAGE HARMONIZED (120V)</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>✓ SECTION 3: CORE-C BEACON</span>
                <span className="text-slate-400 font-normal">STEADY BEAT ISOLATED (0.8 Hz)</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>✓ SECTION 4: ANTENNA NEURAL LAB</span>
                <span className="text-slate-400 font-normal">SYNAPSES TRAINED (&gt; 95% ACCURACY)</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>✓ RESCUE TWO EXTRACTION</span>
                <span className="text-slate-400 font-normal">SCRAP SAFELY EVACUATED</span>
              </div>
            </div>

            {/* Story Dialogue Quote */}
            <div className="bg-cyan-950/20 border-l-2 border-cyan-400 p-3 rounded text-xs text-cyan-200/90 italic">
              "Your measurements found them, SCRAP. You saved us." — ORACLE
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  audioTriggered.current = {};
                  endingClock.start();
                }}
                className="flex-1 py-3 px-4 rounded bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-cyan-400 transition-colors font-bold text-xs uppercase tracking-wider text-center cursor-pointer"
              >
                ↺ REPLAY CINEMATIC
              </button>

              <button
                onClick={() => {
                  endingClock.stop();
                  onExplorePlayground?.();
                }}
                className="flex-1 py-3 px-4 rounded bg-cyan-950/80 border border-cyan-500/80 text-cyan-300 hover:bg-cyan-900 hover:text-white transition-colors font-bold text-xs uppercase tracking-wider text-center shadow-lg cursor-pointer"
              >
                🧠 EXPLORE NEURAL LAB
              </button>

              <button
                onClick={() => {
                  endingClock.stop();
                  onComplete?.();
                }}
                className="flex-1 py-3 px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors font-bold text-xs uppercase tracking-wider text-center shadow-lg shadow-emerald-900/40 cursor-pointer"
              >
                ✓ RETURN TO SHIP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
