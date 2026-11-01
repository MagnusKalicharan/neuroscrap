"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { SCENE2_CONFIG } from "./scene2.config";
import WakeOverlay, { WakeCameraController } from "./WakeAnimation";
import DialogueBox from "./Dialogue";
import dialogueData from "./dialogue.json";
import GuidanceCoach from "./GuidanceCoach";
import { LookTracker, LookStepOverlay } from "./LookStep";
import { MoveTracker, MoveStepOverlay } from "./MoveStep";
import Beacon from "./Beacon";
import EdgeIndicator from "./EdgeIndicator";
import { scene2Sound } from "./sound";

export type Scene2State =
  | "waiting"
  | "wake"
  | "dialogue"
  | "learnLook"
  | "learnMove"
  | "goToBeacon"
  | "arrived"
  | "done";

/**
 * Lightweight synchronous bridge between DOM Scene2 and 3D Scene2Canvas
 */
export const scene2Bridge = {
  state: "wake" as Scene2State,
  wakeProgress: 0,
  isArrived: false,
  camera: null as THREE.Camera | null,
  onLookComplete: null as (() => void) | null,
  onMoveComplete: null as (() => void) | null,
  listeners: new Set<() => void>(),

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  },

  notify() {
    this.listeners.forEach((l) => l());
  },

  reset() {
    this.state = "wake";
    this.wakeProgress = 0;
    this.isArrived = false;
    this.notify();
  },
};

interface Scene2Props {
  onSceneComplete: (sceneId: "scene2", data?: { playerPos: [number, number, number]; yaw: number }) => void;
  canvasWrapperRef?: React.RefObject<HTMLDivElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  isLocked?: boolean;
  requestLock?: () => void;
  quality?: "low" | "medium" | "high";
  reduceMotion?: boolean;
  onSetInputLocked?: (locked: boolean) => void;
  cameraRef?: React.MutableRefObject<THREE.Camera | null>;
}

export default function Scene2({
  onSceneComplete,
  canvasWrapperRef,
  canvasRef,
  isLocked = false,
  requestLock,
  quality = "high",
  reduceMotion = false,
  onSetInputLocked,
  cameraRef,
}: Scene2Props) {
  const [state, setState] = useState<Scene2State>("wake");
  const stateRef = useRef<Scene2State>("wake");

  // Master Clock & Wake Animation Progress (0..1)
  const [wakeProgress, setWakeProgress] = useState(0);
  const wakeStartTimeRef = useRef<number | null>(null);
  const wakeResumeTimeRef = useRef<number | null>(null);

  // Wake dialogue index for W1-W3 (0: W1, 1: W2, 2: W3, 3: done)
  const [wakeDialogueIndex, setWakeDialogueIndex] = useState(0);

  // Dialogue index for post-wake (D1-D3)
  const [dialogueIndex, setDialogueIndex] = useState(0);

  // Active dialogue line (can be wake subtitles or D1-D3)
  const [activeSubtitle, setActiveSubtitle] = useState<any>(null);

  // Reaction speech overlay (e.g. "Good. Your eyes respond.")
  const [reactionLine, setReactionLine] = useState<any>(null);

  // Step Progresses
  const [lookProgressPercent, setLookProgressPercent] = useState(0);
  const [moveProgressPercent, setMoveProgressPercent] = useState(0);
  const [highlightW, setHighlightW] = useState(false);

  // Beacon & Arrival
  const [beaconDistance, setBeaconDistance] = useState(14.0);
  const [isArrived, setIsArrived] = useState(false);

  // Idle Nudges
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);
  const [showNudgePulse, setShowNudgePulse] = useState(false);
  const idleTimerRef = useRef<number>(0);

  // StrictMode guards
  const hasCompletedFiredRef = useRef(false);
  const hasStartedRef = useRef(false);

  // Pointer lock prompt flag
  const [showLockPrompt, setShowLockPrompt] = useState(false);

  // Single state transition function
  const goTo = useCallback(
    (nextState: Scene2State) => {
      const current = stateRef.current;
      if (current === "done" || current === nextState) return;

      const validTransitions: { [key in Scene2State]?: Scene2State[] } = {
        waiting: ["wake"],
        wake: ["dialogue", "learnLook", "done"],
        dialogue: ["learnLook", "done"],
        learnLook: ["learnMove", "done"],
        learnMove: ["goToBeacon", "done"],
        goToBeacon: ["arrived", "done"],
        arrived: ["done"],
        done: [],
      };

      if (!validTransitions[current]?.includes(nextState)) {
        return;
      }

      stateRef.current = nextState;
      setState(nextState);
      scene2Bridge.state = nextState;
      scene2Bridge.notify();

      // Handle inputLock status
      if (nextState === "wake" || nextState === "dialogue" || nextState === "arrived") {
        onSetInputLocked?.(true);
      } else if (nextState === "learnLook" || nextState === "learnMove" || nextState === "goToBeacon") {
        onSetInputLocked?.(false);
      }

      // Reset idle timer on state change
      idleTimerRef.current = 0;
      setNudgeMessage(null);
      setShowNudgePulse(false);
    },
    [onSetInputLocked]
  );

  // Advance W1 -> W2 -> W3 -> Wake rise
  const handleAdvanceWakeDialogue = useCallback(() => {
    setWakeDialogueIndex((prev) => prev + 1);
  }, []);

  // Initialize Wake Audio & Sound cues
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      scene2Bridge.reset();
      scene2Sound.initAndResume();
      scene2Sound.playBootHum();
      onSetInputLocked?.(true);
    }

    return () => {
      scene2Sound.fadeOutAll(300);
    };
  }, [onSetInputLocked]);

  // Two-stage Master Clock loop for state === "wake"
  useEffect(() => {
    if (state !== "wake") return;

    let animFrame: number;
    let servoPlayed = false;
    let thud1Played = false;
    let thud2Played = false;

    const tick = (timestamp: number) => {
      // Stage 1: Opening eyelids & looking up (0.0 -> 0.15 in ~1.2 seconds)
      if (wakeDialogueIndex < 3) {
        if (wakeStartTimeRef.current === null) {
          wakeStartTimeRef.current = timestamp;
        }

        const elapsed = timestamp - wakeStartTimeRef.current;
        const p = Math.min(0.15, (elapsed / 1200) * 0.15);

        setWakeProgress(p);
        scene2Bridge.wakeProgress = p;
        scene2Bridge.notify();

        if (p < 0.15) {
          animFrame = requestAnimationFrame(tick);
        }
        return;
      }

      // Stage 2: Rising upright (0.15 -> 1.0 in ~3.8 seconds)
      if (wakeResumeTimeRef.current === null) {
        wakeResumeTimeRef.current = timestamp;
      }

      const elapsed = timestamp - wakeResumeTimeRef.current;
      const progressFraction = Math.min(1.0, elapsed / 3800);
      const p = 0.15 + progressFraction * (1.0 - 0.15);

      setWakeProgress(p);
      scene2Bridge.wakeProgress = p;
      scene2Bridge.notify();

      // Sound triggers during rising
      if (p >= 0.55 && !servoPlayed) {
        servoPlayed = true;
        scene2Sound.playServoWhir();
      }
      if (p >= 0.70 && !thud1Played) {
        thud1Played = true;
        scene2Sound.playRiseThud(0.8);
      }
      if (p >= 0.78 && !thud2Played) {
        thud2Played = true;
        scene2Sound.playRiseThud(1.0);
      }

      if (p < 1.0) {
        animFrame = requestAnimationFrame(tick);
      } else {
        goTo("dialogue");
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [state, wakeDialogueIndex, goTo]);

  // Check if pointer lock is required after dialogue
  useEffect(() => {
    if (state === "learnLook" || state === "learnMove" || state === "goToBeacon") {
      setShowLockPrompt(!isLocked);
    } else {
      setShowLockPrompt(false);
    }
  }, [state, isLocked]);

  // Idle Timer & Nudges during learning states
  useEffect(() => {
    if (state !== "learnLook" && state !== "learnMove" && state !== "goToBeacon") return;

    const interval = window.setInterval(() => {
      idleTimerRef.current += 1000;
      const t = idleTimerRef.current;

      if (state === "learnMove" && t >= 8000) {
        setHighlightW(true);
      }

      if (t >= SCENE2_CONFIG.nudgeShowMeMs) {
        setShowNudgePulse(true);
        if (state === "learnLook") setNudgeMessage("Click and move your mouse across the screen.");
        if (state === "learnMove") setNudgeMessage("Hold down W to move forward.");
        if (state === "goToBeacon") setNudgeMessage("Follow the blue chevron towards the beacon.");
      } else if (t >= SCENE2_CONFIG.nudgeMediumMs) {
        setShowNudgePulse(true);
        if (state === "learnLook") setNudgeMessage(dialogueData.nudges.lookShort);
        if (state === "learnMove") setNudgeMessage(dialogueData.nudges.moveShort);
        if (state === "goToBeacon") setNudgeMessage(dialogueData.nudges.beaconShort);
      } else if (t >= SCENE2_CONFIG.nudgeShortMs) {
        if (state === "learnLook") setNudgeMessage("Try looking around.");
        if (state === "learnMove") setNudgeMessage("Press W A S D to walk.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state]);

  // Advance D1 -> D2 -> D3 -> learnLook
  const handleAdvanceDialogue = useCallback(() => {
    if (state !== "dialogue") return;

    const introLines = dialogueData.dialogue;
    if (dialogueIndex + 1 < introLines.length) {
      setDialogueIndex((prev) => prev + 1);
    } else {
      goTo("learnLook");
    }
  }, [state, dialogueIndex, goTo]);

  // Skip handler (Jump to dialogue or finish)
  const handleSkip = useCallback(() => {
    if (state === "wake") {
      setWakeProgress(1.0);
      setWakeDialogueIndex(3);
      scene2Bridge.wakeProgress = 1.0;
      goTo("dialogue");
    } else {
      goTo("done");
    }
  }, [state, goTo]);

  // Look complete handler
  const handleLookComplete = useCallback(() => {
    setReactionLine(dialogueData.reactions.lookComplete);
    scene2Sound.playRadioVoiceBurst();
    setTimeout(() => {
      setReactionLine(null);
      goTo("learnMove");
    }, 1800);
  }, [goTo]);

  // Move complete handler
  const handleMoveComplete = useCallback(() => {
    setReactionLine(dialogueData.reactions.moveComplete);
    scene2Sound.playRadioVoiceBurst();
    setTimeout(() => {
      setReactionLine(null);
      goTo("goToBeacon");
    }, 1800);
  }, [goTo]);

  // Arrival handler at Beacon
  const handleBeaconArrival = useCallback(() => {
    if (state !== "goToBeacon" || isArrived) return;
    setIsArrived(true);
    scene2Bridge.isArrived = true;
    scene2Bridge.notify();
    goTo("arrived");
    scene2Sound.playArrivalChime();
    setReactionLine(dialogueData.reactions.arrived);

    // Mark scene2Seen
    try {
      localStorage.setItem("scene2Seen", "true");
    } catch {}

    // Complete scene after brief atmospheric hold (1.2s)
    setTimeout(() => {
      if (!hasCompletedFiredRef.current) {
        hasCompletedFiredRef.current = true;
        const [bx, by, bz] = SCENE2_CONFIG.beaconPos;
        onSceneComplete("scene2", {
          playerPos: [bx, by + 1.5, bz],
          yaw: 0,
        });
        goTo("done");
      }
    }, SCENE2_CONFIG.arriveHoldMs);
  }, [state, isArrived, goTo, onSceneComplete]);

  // Register bridge callbacks
  useEffect(() => {
    scene2Bridge.onLookComplete = handleLookComplete;
    scene2Bridge.onMoveComplete = handleMoveComplete;
    return () => {
      scene2Bridge.onLookComplete = null;
      scene2Bridge.onMoveComplete = null;
    };
  }, [handleLookComplete, handleMoveComplete]);

  // Distance monitoring to beacon
  const handleDistanceCheck = useCallback(
    (dist: number) => {
      setBeaconDistance(dist);
      scene2Sound.updateBeaconHum(dist, state === "goToBeacon");
      if (state === "goToBeacon" && dist <= SCENE2_CONFIG.beaconArrivalRadius) {
        handleBeaconArrival();
      }
    },
    [state, handleBeaconArrival]
  );

  // Periodic distance check during goToBeacon
  useEffect(() => {
    if (state !== "goToBeacon") return;

    const interval = window.setInterval(() => {
      const cam = cameraRef?.current || scene2Bridge.camera;
      if (!cam) return;

      const [bx, by, bz] = SCENE2_CONFIG.beaconPos;
      const dist = Math.hypot(cam.position.x - bx, cam.position.z - bz);
      handleDistanceCheck(dist);
    }, 100);

    return () => clearInterval(interval);
  }, [state, cameraRef, handleDistanceCheck]);

  if (state === "done") {
    return null;
  }

  const currentDLine = state === "dialogue" ? dialogueData.dialogue[dialogueIndex] : null;

  return (
    <div className="scene2-root">
      {/* ── 1. WAKE OVERLAY (Eyelids, Blur, Vision HUD, Scan Sweeps) ── */}
      {state === "wake" && (
        <WakeOverlay
          progress={wakeProgress}
          reduceMotion={reduceMotion}
          quality={quality}
          canvasWrapperRef={canvasWrapperRef}
        />
      )}

      {/* ── 2. SUBTITLES & DIALOGUE BOX ── */}
      {/* W1-W3 during wake holding stage (eyes open, lying on floor looking at sky) */}
      {state === "wake" && wakeProgress >= 0.15 && wakeDialogueIndex < 3 && (
        <DialogueBox
          currentLine={dialogueData.wake[wakeDialogueIndex]}
          onAdvance={handleAdvanceWakeDialogue}
          onSkip={handleSkip}
          isInteractive={true}
          showAdvancePrompt={true}
        />
      )}

      {/* D1-D3 after standing upright */}
      {state === "dialogue" && currentDLine && (
        <DialogueBox
          currentLine={currentDLine}
          onAdvance={handleAdvanceDialogue}
          onSkip={handleSkip}
          isInteractive={true}
          showAdvancePrompt={true}
        />
      )}

      {/* Reaction Speech Box */}
      {reactionLine && (
        <DialogueBox
          currentLine={reactionLine}
          isInteractive={false}
          showAdvancePrompt={false}
        />
      )}

      {/* ── 3. GUIDANCE COACH & OBJECTIVE BAR ── */}
      {(state === "learnLook" || state === "learnMove" || state === "goToBeacon") && (
        <GuidanceCoach
          currentStepIndex={state === "learnLook" ? 0 : state === "learnMove" ? 1 : 2}
          objectiveText={
            state === "learnLook"
              ? "Move the mouse to look around."
              : state === "learnMove"
              ? "Press W A S D to walk."
              : isArrived
              ? "Beacon reached."
              : "Walk to the glowing cyan beacon."
          }
          nudgeMessage={nudgeMessage}
          showNudgePulse={showNudgePulse}
          onShowMe={() => {
            setNudgeMessage("Follow the highlighted controls below!");
          }}
        />
      )}

      {/* ── 4. LOOK STEP OVERLAY ── */}
      {state === "learnLook" && (
        <LookStepOverlay progressPercent={lookProgressPercent} />
      )}

      {/* ── 5. MOVE STEP OVERLAY ── */}
      {state === "learnMove" && (
        <MoveStepOverlay progressPercent={moveProgressPercent} highlightW={highlightW} />
      )}

      {/* ── 6. EDGE INDICATOR TO BEACON ── */}
      {state === "goToBeacon" && (
        <EdgeIndicator
          camera={cameraRef?.current || scene2Bridge.camera}
          distance={beaconDistance}
          visible={!isArrived}
        />
      )}

      {/* ── 7. POINTER LOCK PROMPT (If unlocked during controls) ── */}
      {showLockPrompt && (
        <div
          onClick={() => requestLock?.()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer select-none"
        >
          <div className="bg-black/90 border border-cyan-400 p-6 rounded-xl text-center max-w-sm shadow-[0_0_30px_rgba(0,255,255,0.3)] animate-pulse">
            <h3 className="font-mono text-xl font-black text-cyan-300 tracking-wider mb-2">
              CLICK TO TAKE CONTROL
            </h3>
            <p className="font-mono text-xs text-cyan-200/80">
              Click anywhere or press Enter to resume tutorial.
            </p>
          </div>
        </div>
      )}

      {/* ── 8. PERSISTENT SKIP BUTTON (Bottom-Right) ── */}
      {state !== "arrived" && (
        <button
          onClick={handleSkip}
          className="fixed bottom-6 right-6 z-40 font-mono text-xs text-cyan-400/80 hover:text-cyan-200 bg-black/70 hover:bg-black/90 border border-cyan-500/40 hover:border-cyan-400 px-3 py-1.5 rounded uppercase tracking-widest backdrop-blur-sm transition-all shadow-[0_0_15px_rgba(0,255,255,0.1)] cursor-pointer"
        >
          Skip ▸
        </button>
      )}
    </div>
  );
}

/**
 * 3D Canvas Elements of Scene 2 (Beacon & Camera Controllers)
 * Mounts directly inside <Canvas>
 */
export function Scene2Canvas({
  reduceMotion = false,
}: {
  reduceMotion?: boolean;
}) {
  const [bridgeState, setBridgeState] = useState(() => ({
    state: scene2Bridge.state,
    wakeProgress: scene2Bridge.wakeProgress,
    isArrived: scene2Bridge.isArrived,
  }));

  const { camera } = useThree();

  useEffect(() => {
    scene2Bridge.camera = camera;
    return scene2Bridge.subscribe(() => {
      setBridgeState({
        state: scene2Bridge.state,
        wakeProgress: scene2Bridge.wakeProgress,
        isArrived: scene2Bridge.isArrived,
      });
    });
  }, [camera]);

  const { state, wakeProgress, isArrived } = bridgeState;

  return (
    <>
      {/* Scripted Camera Controller during "wake" state */}
      {state === "wake" && (
        <WakeCameraController
          progress={wakeProgress}
          reduceMotion={reduceMotion}
        />
      )}

      {/* Look Tracker */}
      {state === "learnLook" && (
        <LookTracker
          isActive={true}
          onComplete={() => scene2Bridge.onLookComplete?.()}
        />
      )}

      {/* Move Tracker */}
      {state === "learnMove" && (
        <MoveTracker
          isActive={true}
          onComplete={() => scene2Bridge.onMoveComplete?.()}
        />
      )}

      {/* 3D Beacon (Shown during beacon step and arrived state) */}
      {(state === "goToBeacon" || state === "arrived") && (
        <Beacon isArrived={isArrived} />
      )}
    </>
  );
}
