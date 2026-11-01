"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import TitleScreen from "./TitleScreen";
import BootSequence from "./BootSequence";
import { scene1Sound } from "./sound";
import { shipAudio } from "../../audio/shipAudio";
import "./scene1.css";

export type Scene1State = "title" | "starting" | "boot" | "handoff" | "done";

interface Scene1Props {
  onSceneComplete: (sceneId: "scene1") => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  canvasContainerRef?: React.RefObject<HTMLDivElement | null>;
  isAssetsLoaded?: boolean; // Defaults to true or passes real loader state
  onCrashProgress?: (p: number | null) => void;
}

const VALID_TRANSITIONS: Record<Scene1State, Scene1State[]> = {
  title: ["starting", "handoff", "done"],
  starting: ["boot", "handoff"],
  boot: ["handoff"],
  handoff: ["done", "title"],
  done: ["title"],
};

export default function Scene1({
  onSceneComplete,
  canvasRef,
  canvasContainerRef,
  isAssetsLoaded = true,
  onCrashProgress,
}: Scene1Props) {
  // SINGLE SOURCE OF TRUTH STATE MACHINE
  const [state, setState] = useState<Scene1State>("title");
  const stateRef = useRef<Scene1State>("title");

  // Single transition function
  const goTo = useCallback((nextState: Scene1State) => {
    const current = stateRef.current;
    if (current === nextState) return;
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed || !allowed.includes(nextState)) {
      // Illegal transitions are strictly ignored
      return;
    }
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  // Settings & Accessibility state
  const [reduceMotion, setReduceMotion] = useState(false);
  const [textSize, setTextSize] = useState<"normal" | "large">("normal");
  const [graphicsQuality, setGraphicsQuality] = useState<"low" | "medium" | "high">("high");
  const [alwaysSkipIntro, setAlwaysSkipIntro] = useState(false);
  const [seenBefore, setSeenBefore] = useState(false);

  // Asset loading & handoff tracking
  const [bootFinished, setBootFinished] = useState(false);
  const [handoffTimeStart, setHandoffTimeStart] = useState<number | null>(null);
  const [showSlowLoadingNotice, setShowSlowLoadingNotice] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(85);

  const hasCompletedRef = useRef(false);
  const startingTimeoutRef = useRef<number | null>(null);
  const slowLoadingTimerRef = useRef<number | null>(null);
  const pointerLockWantedRef = useRef(false);

  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION & SAFE LOCAL STORAGE / MEDIA QUERY INSPECTION
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Detect prefers-reduced-motion media query
    try {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduceMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
      mediaQuery.addEventListener?.("change", listener);
    } catch {}

    // 2. Safe localStorage reads
    try {
      const seen = localStorage.getItem("scene1Seen");
      if (seen === "true") setSeenBefore(true);

      const skipPref = localStorage.getItem("scene1_always_skip");
      if (skipPref === "true") setAlwaysSkipIntro(true);

      const savedQuality = localStorage.getItem("scene1_graphics_quality") as any;
      if (savedQuality) setGraphicsQuality(savedQuality);

      const savedSize = localStorage.getItem("scene1_text_size") as any;
      if (savedSize) setTextSize(savedSize);
    } catch {}

    // 3. Inspect URL query parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("skip") === "1") {
        goTo("handoff");
      }
    } catch {}
  }, [goTo]);

  // Handle pointer lock change tracking
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onLockChange = () => {
      if (document.pointerLockElement) {
        pointerLockWantedRef.current = false;
      }
    };
    document.addEventListener("pointerlockchange", onLockChange);
    return () => document.removeEventListener("pointerlockchange", onLockChange);
  }, []);

  // Idle camera / background drift during title state (disabled under Reduce Motion)
  useEffect(() => {
    if (state !== "title" || reduceMotion) return;
    const container = canvasContainerRef?.current;
    if (!container) return;

    let rafId: number;
    let t = 0;
    const animateDrift = () => {
      t += 0.007;
      const dx = Math.sin(t) * 4.5;
      const dy = Math.cos(t * 0.7) * 3.2;
      container.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(1.015)`;
      rafId = requestAnimationFrame(animateDrift);
    };
    rafId = requestAnimationFrame(animateDrift);

    return () => {
      cancelAnimationFrame(rafId);
      if (container) container.style.transform = "none";
    };
  }, [state, reduceMotion, canvasContainerRef]);

  // ─────────────────────────────────────────────────────────────
  // PLAY CLICK (SYNCHRONOUS USER GESTURE DISPATCH)
  // ─────────────────────────────────────────────────────────────
  const handlePlayClick = useCallback(() => {
    // 1. Resume / Initialize AudioContext synchronously
    scene1Sound.initAndResume();
    try {
      shipAudio?.resume?.();
    } catch {}

    // 2. Synchronously request pointer lock on canvas
    pointerLockWantedRef.current = true;
    const targetCanvas =
      canvasRef?.current ||
      (document.querySelector("canvas") as HTMLCanvasElement | null);

    if (targetCanvas && typeof targetCanvas.requestPointerLock === "function") {
      try {
        const lockPromise = targetCanvas.requestPointerLock() as any;
        if (lockPromise && typeof lockPromise.catch === "function") {
          lockPromise.catch(() => {
            // Silently ignore browser cooldown rejection; pointerLockWanted remains true
          });
        }
      } catch {
        // Silently ignore
      }
    }

    // 3. Call goTo("starting") synchronously
    goTo("starting");

    // Play power down thunk
    scene1Sound.playPowerDownThunk();

    // After 0.6s starting fade-out, advance to boot
    startingTimeoutRef.current = window.setTimeout(() => {
      goTo("boot");
    }, 600);
  }, [canvasRef, goTo]);

  // ─────────────────────────────────────────────────────────────
  // HOLD STATE REACHED (From BootSequence)
  // ─────────────────────────────────────────────────────────────
  const handleHoldReached = useCallback(() => {
    setBootFinished(true);
    goTo("handoff");
  }, [goTo]);

  // ─────────────────────────────────────────────────────────────
  // HAND-OFF EVALUATION
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== "handoff") return;

    if (handoffTimeStart === null) {
      setHandoffTimeStart(Date.now());
    }

    // Timer for slow loading notice (> 4.0s)
    slowLoadingTimerRef.current = window.setTimeout(() => {
      setShowSlowLoadingNotice(true);
    }, 4000);

    // Fake progressive calibration percentage if assets take time
    const interval = window.setInterval(() => {
      setLoadingPercent((prev) => (prev < 99 ? prev + 1 : 99));
    }, 400);

    return () => {
      if (slowLoadingTimerRef.current !== null) {
        clearTimeout(slowLoadingTimerRef.current);
      }
      clearInterval(interval);
    };
  }, [state, handoffTimeStart]);

  // Check completion conditions
  useEffect(() => {
    if (state !== "handoff") return;

    const checkComplete = () => {
      const isAudioReady = scene1Sound.isAudioRunning() || scene1Sound.getIsMuted() || true;
      const canComplete = bootFinished && isAssetsLoaded && isAudioReady;

      if (canComplete && !hasCompletedRef.current) {
        hasCompletedRef.current = true;

        try {
          localStorage.setItem("scene1Seen", "true");
        } catch {}

        // Short atmospheric hold (0.5s) on black before handing over to Scene 2
        const timer = window.setTimeout(() => {
          onSceneComplete("scene1");
          goTo("done");
        }, 500);

        return true;
      }
      return false;
    };

    if (checkComplete()) return;

    // Periodic check every 200ms
    const checkInterval = window.setInterval(() => {
      if (checkComplete()) {
        clearInterval(checkInterval);
      }
    }, 200);

    // Guaranteed fallback: maximum 4s hold before progressing to Scene 2
    const fallbackTimer = window.setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onSceneComplete("scene1");
        goTo("done");
      }
    }, 4000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(fallbackTimer);
    };
  }, [state, bootFinished, isAssetsLoaded, onSceneComplete, goTo]);

  // ─────────────────────────────────────────────────────────────
  // REPLAY INTRO
  // ─────────────────────────────────────────────────────────────
  const handleReplayIntro = useCallback(() => {
    hasCompletedRef.current = false;
    setBootFinished(false);
    setShowSlowLoadingNotice(false);
    setHandoffTimeStart(null);
    goTo("title");
  }, [goTo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (startingTimeoutRef.current !== null) {
        clearTimeout(startingTimeoutRef.current);
      }
      if (slowLoadingTimerRef.current !== null) {
        clearTimeout(slowLoadingTimerRef.current);
      }
      scene1Sound.fadeOutAll(400);
    };
  }, []);

  if (state === "done") {
    return null;
  }

  return (
    <div className="scene1-container">
      {/* ── TITLE STATE ── */}
      {state === "title" && (
        <TitleScreen
          onPlayClick={handlePlayClick}
          onReplayIntro={handleReplayIntro}
          shipLoadProgress={isAssetsLoaded ? 1.0 : loadingPercent / 100}
          reduceMotion={reduceMotion}
          onToggleReduceMotion={(enabled) => {
            setReduceMotion(enabled);
            try {
              localStorage.setItem("scene1_reduce_motion", enabled ? "true" : "false");
            } catch {}
          }}
          textSize={textSize}
          onChangeTextSize={(size) => {
            setTextSize(size);
            try {
              localStorage.setItem("scene1_text_size", size);
            } catch {}
          }}
          graphicsQuality={graphicsQuality}
          onChangeGraphicsQuality={(quality) => {
            setGraphicsQuality(quality);
            try {
              localStorage.setItem("scene1_graphics_quality", quality);
            } catch {}
          }}
          alwaysSkipIntro={alwaysSkipIntro}
          onChangeAlwaysSkipIntro={(skip) => {
            setAlwaysSkipIntro(skip);
            try {
              localStorage.setItem("scene1_always_skip", skip ? "true" : "false");
            } catch {}
          }}
        />
      )}

      {/* ── STARTING STATE (0.6s FADE-OUT TO BLACK) ── */}
      {state === "starting" && (
        <div
          className="fixed inset-0 z-40 bg-black transition-opacity duration-500 ease-out pointer-events-none"
          style={{ opacity: 1 }}
        />
      )}

      {/* ── BOOT STATE ── */}
      {state === "boot" && (
        <BootSequence
          onHoldReached={handleHoldReached}
          reduceMotion={reduceMotion}
          seenBefore={seenBefore}
          onCrashProgress={onCrashProgress}
          isShipLoaded={isAssetsLoaded}
        />
      )}

      {/* ── HANDOFF STATE (HOLD ON BLACK SCREEN) ── */}
      {state === "handoff" && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center space-y-4 font-mono text-center select-none"
          style={{ minHeight: "100dvh" }}
        >
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-300 tracking-[0.25em] flex items-center gap-1">
            <span>REBOOTING</span>
            <span className="scene1-pulsing-dots inline-flex">
              <span className="animate-pulse delay-75">.</span>
              <span className="animate-pulse delay-150">.</span>
              <span className="animate-pulse delay-300">.</span>
            </span>
          </div>

          {showSlowLoadingNotice ? (
            <div className="text-xs text-amber-400 font-mono tracking-widest animate-pulse">
              Calibrating sensors... ({loadingPercent}%)
            </div>
          ) : (
            <div className="text-xs text-cyan-500/60 uppercase tracking-widest">
              SYNCHRONIZING SHIP SENSORS & NEURAL LINK
            </div>
          )}
        </div>
      )}
    </div>
  );
}
