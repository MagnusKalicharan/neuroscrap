"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { TimelineClock, TimelineCueDefinition } from "./timeline";
import { SCENE1_BOOT_DURATION_MS, SCENE1_CUES, TerminalLinePayload } from "./scene1.timeline";
import { scene1Sound } from "./sound";
import CrashCinematicOverlay from "./crash/CrashCinematicOverlay";
import CrashFallback2D from "./crash/CrashFallback2D";

interface BootSequenceProps {
  onHoldReached: () => void;
  reduceMotion?: boolean;
  seenBefore?: boolean;
  onCrashProgress?: (p: number | null) => void;
  isShipLoaded?: boolean;
}

export default function BootSequence({
  onHoldReached,
  reduceMotion = false,
  seenBefore = false,
  onCrashProgress,
  isShipLoaded = true,
}: BootSequenceProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<TimelineClock | null>(null);

  const [crashProgress, setCrashProgress] = useState<number | null>(null);
  const [showFallback2D, setShowFallback2D] = useState(false);
  const [isHoldState, setIsHoldState] = useState(false);
  const [showSkipButton, setShowSkipButton] = useState(seenBefore);

  const hasSkippedRef = useRef(false);
  const activeTypewriterTimeouts = useRef<number[]>([]);

  // ─────────────────────────────────────────────────────────────
  // DIRECT DOM TYPEWRITER HELPER
  // ─────────────────────────────────────────────────────────────
  const appendTypedLine = useCallback(
    (payload: TerminalLinePayload) => {
      const container = terminalRef.current;
      if (!container || hasSkippedRef.current) return;

      const lineEl = document.createElement("div");
      lineEl.className = "scene1-term-line flex items-start gap-2.5 my-1.5 opacity-0";
      lineEl.setAttribute("data-line-id", payload.lineId);

      // Icon element (never color-only)
      const iconSpan = document.createElement("span");
      let iconColorClass = "text-cyan-400";
      if (payload.iconType === "warn") iconColorClass = "text-amber-400";
      if (payload.iconType === "danger") iconColorClass = "text-red-400";
      if (payload.iconType === "wait") iconColorClass = "text-cyan-300 animate-pulse";
      if (payload.iconType === "success") iconColorClass = "text-emerald-400";

      iconSpan.className = `font-bold shrink-0 ${iconColorClass}`;
      iconSpan.textContent = payload.icon;
      lineEl.appendChild(iconSpan);

      // Text wrapper
      const textSpan = document.createElement("span");
      textSpan.className = "text-cyan-200/90 tracking-wider";
      lineEl.appendChild(textSpan);

      // Insert before cursor or append
      container.appendChild(lineEl);

      // Fade line in
      lineEl.style.opacity = "1";

      const fullText = payload.prefix;
      const speed = payload.typeSpeedCharsPerSec || 45;
      const intervalMs = 1000 / speed;

      let charIndex = 0;
      const typeNextChar = () => {
        if (hasSkippedRef.current) return;
        if (charIndex < fullText.length) {
          textSpan.textContent += fullText[charIndex];
          // Soft typewriter tick sound every 2 characters
          if (charIndex % 2 === 0) {
            scene1Sound.playTypeTick();
          }
          charIndex++;
          const timeoutId = window.setTimeout(typeNextChar, intervalMs);
          activeTypewriterTimeouts.current.push(timeoutId);
        } else {
          // After prefix is finished, append value with special effect
          if (payload.value) {
            const valSpan = document.createElement("span");
            valSpan.className = "font-bold ml-1";

            if (payload.valueEffect === "flicker_3x") {
              valSpan.className += " scene1-flicker-3x text-amber-300";
            } else if (payload.valueEffect === "amber_glow") {
              valSpan.className += " scene1-amber-glow text-amber-400";
            } else if (payload.valueEffect === "red_flicker") {
              valSpan.className += " scene1-red-flicker text-red-500 font-black";
            } else if (payload.valueEffect === "corrupt") {
              valSpan.className += " scene1-corrupt-text text-red-400";
            } else if (payload.valueEffect === "pulse_cyan") {
              valSpan.className += " scene1-pulse-cyan text-cyan-300";
            }

            valSpan.textContent = payload.value;
            lineEl.appendChild(valSpan);
          }
        }
      };

      typeNextChar();
    },
    []
  );

  // ─────────────────────────────────────────────────────────────
  // MASTER SKIP HANDLER
  // ─────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (hasSkippedRef.current) return;
    hasSkippedRef.current = true;

    // 1. Stop master clock and cancel all cues
    if (clockRef.current) {
      clockRef.current.destroy();
      clockRef.current = null;
    }

    // 2. Clear all active typing timeouts
    activeTypewriterTimeouts.current.forEach((id) => clearTimeout(id));
    activeTypewriterTimeouts.current = [];

    // 3. Fade audio smoothly
    scene1Sound.fadeOutAll(300);

    // 4. Remove active crash cinematic
    setCrashProgress(null);
    onCrashProgress?.(null);
    setShowFallback2D(false);

    // 5. Clear terminal DOM
    if (terminalRef.current) {
      terminalRef.current.innerHTML = "";
    }

    // 6. Enter hold state immediately
    setIsHoldState(true);
    onHoldReached();
  }, [onHoldReached]);

  // Keyboard shortcut listener (Space/Enter to skip; Esc does NOT skip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSkip]);

  // ─────────────────────────────────────────────────────────────
  // MOUNT MASTER TIMELINE CLOCK
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const clock = new TimelineClock(SCENE1_BOOT_DURATION_MS, SCENE1_CUES);
    clockRef.current = clock;

    // CUE HANDLER
    clock.onCue((cue: TimelineCueDefinition) => {
      if (hasSkippedRef.current) return;

      switch (cue.type) {
        case "hum_start":
          scene1Sound.startHumBed();
          break;

        case "type_line":
          if (cue.payload) {
            appendTypedLine(cue.payload);
          }
          break;

        case "signal_found":
          scene1Sound.playRadioBlip();
          if (cue.payload) {
            appendTypedLine(cue.payload);
          }
          break;

        case "crash_cinematic_start":
          if (isShipLoaded) {
            setCrashProgress(0.0);
            onCrashProgress?.(0.0);
          } else {
            setShowFallback2D(true);
          }
          break;

        case "crash_cinematic_end":
          setCrashProgress(null);
          onCrashProgress?.(null);
          setShowFallback2D(false);
          break;

        case "hold_rebooting":
          setCrashProgress(null);
          onCrashProgress?.(null);
          setShowFallback2D(false);
          setIsHoldState(true);
          scene1Sound.stopHumBed();
          scene1Sound.playBootChime();
          onHoldReached();
          break;

        default:
          break;
      }
    });

    // TICK HANDLER: Reveal Skip button after 1.0s & update crash progress
    clock.onTick((elapsedMs: number) => {
      if (elapsedMs >= 1000 && !showSkipButton) {
        setShowSkipButton(true);
      }

      // During crash cinematic (9200ms - 15200ms)
      if (elapsedMs >= 9200 && elapsedMs <= 15200) {
        const p = Math.min(1.0, Math.max(0.0, (elapsedMs - 9200) / 6000));
        setCrashProgress(p);
        onCrashProgress?.(p);
      } else if (elapsedMs > 15200 && crashProgress !== null) {
        setCrashProgress(null);
        onCrashProgress?.(null);
      }
    });

    // END HANDLER
    clock.onEnd(() => {
      if (!hasSkippedRef.current) {
        setIsHoldState(true);
        onHoldReached();
      }
    });

    clock.start();

    return () => {
      clock.destroy();
      activeTypewriterTimeouts.current.forEach((id) => clearTimeout(id));
      activeTypewriterTimeouts.current = [];
    };
  }, [appendTypedLine, onHoldReached, showSkipButton]);

  return (
    <div
      className={`scene1-boot-overlay fixed inset-0 z-40 ${
        crashProgress !== null ? "bg-transparent pointer-events-none" : "bg-black pointer-events-auto"
      } flex flex-col justify-center items-center p-6 md:p-12 overflow-hidden select-none transition-colors duration-200`}
      style={{ minHeight: "100dvh" }}
    >
      {/* ── 3D CRASH CINEMATIC OVERLAY (When 3D crash is playing) ── */}
      {crashProgress !== null && !hasSkippedRef.current && (
        <CrashCinematicOverlay progress={crashProgress} reduceMotion={reduceMotion} />
      )}

      {/* ── 2D FALLBACK (If 3D ship failed to load) ── */}
      {showFallback2D && !hasSkippedRef.current && (
        <CrashFallback2D reduceMotion={reduceMotion} />
      )}

      {/* ── TERMINAL LOG / BOOT SCREEN CONTAINER ── */}
      {!isHoldState ? (
        crashProgress === null && (
          <div
            className="w-full max-w-xl mx-auto font-mono text-base sm:text-lg text-left"
            aria-live="polite"
            aria-atomic="false"
          >
            {/* Batched Terminal Lines Appended Here */}
            <div ref={terminalRef} className="space-y-1" />

            {/* Faint Terminal Blinking Cursor */}
            <div className="flex items-center gap-2 mt-2">
              <span
                ref={cursorRef}
                className="inline-block w-2.5 h-5 bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,243,255,0.8)]"
              />
            </div>
          </div>
        )
      ) : (
        /* ── HELD BLACK REBOOTING STATE (Hand-off screen) ── */
        <div className="flex flex-col items-center justify-center space-y-4 font-mono text-center">
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-300 tracking-[0.25em] flex items-center gap-1">
            <span>REBOOTING</span>
            <span className="scene1-pulsing-dots inline-flex">
              <span className="animate-pulse delay-75">.</span>
              <span className="animate-pulse delay-150">.</span>
              <span className="animate-pulse delay-300">.</span>
            </span>
          </div>
          <div className="text-xs text-cyan-500/60 uppercase tracking-widest">
            SYNCHRONIZING NEURAL SCRAP CORES
          </div>
        </div>
      )}

      {/* ── SKIP BUTTON (Bottom-Right, Appears after 1s or immediately if seen) ── */}
      {showSkipButton && !isHoldState && (
        <button
          onClick={handleSkip}
          onMouseEnter={() => scene1Sound.playHoverTick()}
          onFocus={() => scene1Sound.playHoverTick()}
          className="fixed bottom-6 right-6 z-50 px-5 py-2.5 bg-black/70 hover:bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 hover:text-white font-mono text-xs uppercase tracking-[0.2em] rounded backdrop-blur-md cursor-pointer scene1-focus-ring transition-all shadow-[0_0_15px_rgba(0,243,255,0.2)] flex items-center gap-2"
        >
          <span>Skip</span>
          <span>▸</span>
        </button>
      )}
    </div>
  );
}
