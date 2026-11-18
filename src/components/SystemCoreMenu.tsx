"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Play,
  RotateCcw,
  Sliders,
  Compass,
  FileText,
  BookOpen,
  Power,
  Volume2,
  VolumeX,
  CheckCircle2,
  Lock,
  Eye,
  Check,
  AlertTriangle,
  Radio,
  Layers,
  Sparkles,
} from "lucide-react";
import { TerminalShell } from "../ui/terminal/TerminalShell";
import { FolderColumn, FolderSlotDef } from "../ui/terminal/FolderColumn";
import { Connector } from "../ui/terminal/Connector";
import { terminalSound } from "../ui/terminal/sound";
import { shipAudio, AudioQualityPreset } from "../audio/shipAudio";
import { scene1Sound } from "../scenes/scene1/sound";
import { taskStore, TaskItem } from "../ui/tasks/taskStore";
import { relayStore } from "../section2/relayStore";
import { section3Store } from "../section3/section3Store";
import { section4Store } from "../section4/section4Store";
import { telemetryStore } from "./telemetry/telemetryStore";
import { isImagesValidated } from "../section2/section2Dev";

export type SystemCoreFolderId =
  | "resume"
  | "mission_log"
  | "codex"
  | "settings"
  | "controls"
  | "quit";

export interface SystemCoreMenuProps {
  open: boolean;
  onClose: () => void;
  onResume: () => void;
  onQuitToTitle: () => void;
  reducedMotion?: boolean;
  onToggleReduceMotion?: () => void;
  // Optional override for previewing in dev test pages
  forceFolder?: SystemCoreFolderId;
  forceCompact?: boolean;
}

export function SystemCoreMenu({
  open,
  onClose,
  onResume,
  onQuitToTitle,
  reducedMotion = false,
  onToggleReduceMotion,
  forceFolder,
  forceCompact = false,
}: SystemCoreMenuProps) {
  const [activeFolder, setActiveFolder] = useState<SystemCoreFolderId>(forceFolder || "resume");
  const [connectorAnchor, setConnectorAnchor] = useState<{ x: number; y: number }>({ x: 270, y: 70 });
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [sessionStartTime] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompactViewport, setIsCompactViewport] = useState(forceCompact);

  // Responsive compact check (< 1024px width or < 600px height)
  useEffect(() => {
    if (forceCompact) {
      setIsCompactViewport(true);
      return;
    }
    function checkViewport() {
      if (typeof window !== "undefined") {
        setIsCompactViewport(window.innerWidth < 1024 || window.innerHeight < 600);
      }
    }
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, [forceCompact]);

  // Session playtime ticker
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [open, sessionStartTime]);

  // Sync forceFolder if provided
  useEffect(() => {
    if (forceFolder) setActiveFolder(forceFolder);
  }, [forceFolder]);

  // ── SETTINGS PERSISTENCE & LIVE APPLICATION ──────────────────────────────
  const [mouseSensitivity, setMouseSensitivity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("neuroscrap_mouse_sens");
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val) && val >= 0.2 && val <= 3.0) return val;
        }
      } catch {}
    }
    return 1.0;
  });

  const [invertY, setInvertY] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("neuroscrap_invert_y") === "true";
      } catch {}
    }
    return false;
  });

  const [masterVolume, setMasterVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("scene1_audio_volume");
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val)) return Math.round(val * 100);
        }
      } catch {}
    }
    return 80;
  });

  const [ambienceVolume, setAmbienceVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const item = localStorage.getItem("ship_audio_settings");
        if (item) {
          const parsed = JSON.parse(item);
          if (typeof parsed.ambience === "number") return Math.round(parsed.ambience * 100);
        }
      } catch {}
    }
    return 30;
  });

  const [sfxVolume, setSfxVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const item = localStorage.getItem("ship_audio_settings");
        if (item) {
          const parsed = JSON.parse(item);
          if (typeof parsed.sfx === "number") return Math.round(parsed.sfx * 100);
        }
      } catch {}
    }
    return 80;
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("scene1_audio_muted") === "true";
      } catch {}
    }
    return false;
  });

  const [graphicsQuality, setGraphicsQuality] = useState<"low" | "medium" | "high">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("neuroscrap_graphics_quality") as any;
        if (saved === "low" || saved === "medium" || saved === "high") return saved;
      } catch {}
    }
    return "medium";
  });

  const [textSize, setTextSize] = useState<"normal" | "large" | "xlarge">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("neuroscrap_text_size") as any;
        if (saved === "normal" || saved === "large" || saved === "xlarge") return saved;
      } catch {}
    }
    return "normal";
  });

  const [colorblindMode, setColorblindMode] = useState<"off" | "protanopia" | "deuteranopia" | "tritanopia">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("neuroscrap_colorblind") as any;
        if (saved === "off" || saved === "protanopia" || saved === "deuteranopia" || saved === "tritanopia") return saved;
      } catch {}
    }
    return "off";
  });

  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("neuroscrap_captions") === "true";
      } catch {}
    }
    return true;
  });

  const [headBobEnabled, setHeadBobEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("neuroscrap_head_bob");
        return saved !== "false";
      } catch {}
    }
    return true;
  });

  const triggerAppliedNotification = useCallback((label: string) => {
    setAppliedFeedback(label);
    terminalSound.playSuccessChime();
    const timer = setTimeout(() => setAppliedFeedback(null), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Setting update handlers
  const handleSensitivityChange = (val: number) => {
    setMouseSensitivity(val);
    try {
      localStorage.setItem("neuroscrap_mouse_sens", val.toString());
    } catch {}
    triggerAppliedNotification("SENSITIVITY UPDATED");
  };

  const handleInvertYChange = (val: boolean) => {
    setInvertY(val);
    try {
      localStorage.setItem("neuroscrap_invert_y", val ? "true" : "false");
    } catch {}
    triggerAppliedNotification(`INVERT-Y: ${val ? "ON" : "OFF"}`);
  };

  const handleMasterVolumeChange = (volPercent: number) => {
    setMasterVolume(volPercent);
    const v = volPercent / 100;
    shipAudio.setMasterVolume(v);
    scene1Sound.setVolume(v);
    if (volPercent > 0 && isMuted) {
      setIsMuted(false);
      shipAudio.setMuted(false);
      scene1Sound.setMuted(false);
      terminalSound.setMuted(false);
    }
    try {
      localStorage.setItem("scene1_audio_volume", v.toString());
    } catch {}
    terminalSound.playSnapTick();
  };

  const handleAmbienceVolumeChange = (volPercent: number) => {
    setAmbienceVolume(volPercent);
    const v = volPercent / 100;
    shipAudio.setAmbienceVolume(v);
    triggerAppliedNotification("AMBIENCE VOLUME UPDATED");
  };

  const handleSfxVolumeChange = (volPercent: number) => {
    setSfxVolume(volPercent);
    const v = volPercent / 100;
    shipAudio.setSfxVolume(v);
    triggerAppliedNotification("SFX VOLUME UPDATED");
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      shipAudio.setMuted(next);
      scene1Sound.setMuted(next);
      terminalSound.setMuted(next);
      try {
        localStorage.setItem("scene1_audio_muted", next ? "true" : "false");
      } catch {}
      triggerAppliedNotification(next ? "AUDIO MUTED" : "AUDIO RESTORED");
      return next;
    });
  };

  const handleGraphicsQualityChange = (q: "low" | "medium" | "high") => {
    setGraphicsQuality(q);
    shipAudio.setQuality(q as AudioQualityPreset);
    try {
      localStorage.setItem("neuroscrap_graphics_quality", q);
    } catch {}
    triggerAppliedNotification(`GRAPHICS QUALITY: ${q.toUpperCase()}`);
  };

  const handleTextSizeChange = (s: "normal" | "large" | "xlarge") => {
    setTextSize(s);
    try {
      localStorage.setItem("neuroscrap_text_size", s);
    } catch {}
    triggerAppliedNotification(`TEXT SIZE: ${s.toUpperCase()}`);
  };

  const handleColorblindChange = (mode: "off" | "protanopia" | "deuteranopia" | "tritanopia") => {
    setColorblindMode(mode);
    try {
      localStorage.setItem("neuroscrap_colorblind", mode);
    } catch {}
    triggerAppliedNotification(`COLORBLIND FILTER: ${mode.toUpperCase()}`);
  };

  const handleCaptionsChange = (enabled: boolean) => {
    setCaptionsEnabled(enabled);
    try {
      localStorage.setItem("neuroscrap_captions", enabled ? "true" : "false");
    } catch {}
    triggerAppliedNotification(`CAPTIONS: ${enabled ? "ON" : "OFF"}`);
  };

  const handleHeadBobChange = (enabled: boolean) => {
    setHeadBobEnabled(enabled);
    try {
      localStorage.setItem("neuroscrap_head_bob", enabled ? "true" : "false");
    } catch {}
    triggerAppliedNotification(`HEAD BOB: ${enabled ? "ON" : "OFF"}`);
  };

  // ── REAL PROGRESS & MISSION LOG DATA ─────────────────────────────────────
  const isSec1Done = isImagesValidated();
  const relayState = relayStore.getState();
  const isSec2Done = isSec1Done && Boolean(relayState.diagnosticPassed);
  const s3State = section3Store.getSnapshot();
  const isSec3Done = isSec2Done && (Boolean(s3State.passed) || Boolean(s3State.beaconVerified));
  const s4State = section4Store.getState();
  const isSec4Done = isSec3Done && Boolean(s4State.labState.isComplete);

  const currentObjective = useMemo(() => {
    if (!isSec1Done) {
      return "COLLECT 10 UNBIASED CELESTIAL TELEMETRY SCANS & UPLOAD AT SALVAGE TERMINAL";
    }
    if (!isSec2Done) {
      return "INSPECT POWER RELAY NODES R1-R6 ALONG WALKWAY & COMPLETE TRANSMISSION DIAGNOSTIC";
    }
    if (!isSec3Done) {
      return "CARGO DECK SIGNAL BENCH // EXTRACT FEATURES & DECODE RESCUE BEACON";
    }
    if (!isSec4Done) {
      return "ANTENNA CORE // TRAIN DEEP FILTER NEURAL CLASSIFIER TO RESTORE ESCAPE FREQUENCY";
    }
    return "SIGNAL VERIFIED // RESCUE TWO DOCKED AT ROOF GANTRY // BOARD RESCUE SHIP";
  }, [isSec1Done, isSec2Done, isSec3Done, isSec4Done]);

  // Tasks from taskStore
  const [tasks, setTasks] = useState<TaskItem[]>(() => taskStore.getSnapshot().tasks);
  useEffect(() => {
    return taskStore.subscribe(() => {
      setTasks(taskStore.getSnapshot().tasks);
    });
  }, []);

  // ── CODEX CARDS (Real concept cards from Sections 2 to 4) ────────────────
  const codexCards = useMemo(() => {
    return [
      {
        id: "concept_outlier",
        section: "SECTION 2: TRANSMISSION",
        title: "OUTLIER REJECTION // DROPPING ANOMALOUS READINGS",
        description: "Disconnecting corrupted surge nodes prevents transmission line collapse.",
        unlocked: Boolean(relayState.diagnosticPassed || relayState.scannedNodeIds.includes("R3")),
      },
      {
        id: "concept_imputation",
        section: "SECTION 2: TRANSMISSION",
        title: "DATA IMPUTATION // INTERPOLATING GAPS FROM NEIGHBORS",
        description: "Reconstructing zeroed readings using adjacent clean sensor node averages.",
        unlocked: Boolean(relayState.diagnosticPassed || relayState.scannedNodeIds.includes("R4")),
      },
      {
        id: "concept_feature_extraction",
        section: "SECTION 3: SIGNAL BENCH",
        title: "FEATURE EXTRACTION // MULTI-DIMENSIONAL REDUCTION",
        description: "Calculating carrier mean and jumpiness collapses complex raw waveforms into distinct coordinates.",
        unlocked: Boolean(Object.keys(s3State.toolsApplied).length > 0 || s3State.passed),
      },
      {
        id: "concept_classification",
        section: "SECTION 3: SIGNAL BENCH",
        title: "SIGNAL CLASSIFICATION // BEACON SEPARATION",
        description: "Isolating emergency beacon harmonics from ambient cosmic noise decoys across feature boundaries.",
        unlocked: Boolean(s3State.beaconVerified || s3State.passed),
      },
      {
        id: "concept_neural_training",
        section: "SECTION 4: ANTENNA CORE",
        title: "NEURAL NETWORK OPTIMIZATION // GRADIENT DESCENT",
        description: "Backpropagating output prediction error iteratively updates synaptic weights to minimize cross-entropy loss.",
        unlocked: Boolean(s4State.labState.isComplete || s4State.labState.epoch > 0),
      },
    ];
  }, [relayState, s3State, s4State]);

  // ── FOLDER DEFINITIONS (6 SLOTS) ─────────────────────────────────────────
  const folderSlots: FolderSlotDef[] = useMemo(
    () => [
      { id: "resume", label: "RESUME" },
      { id: "mission_log", label: "MISSION LOG" },
      { id: "codex", label: "CODEX" },
      { id: "settings", label: "SETTINGS" },
      { id: "controls", label: "CONTROLS" },
      { id: "quit", label: "QUIT TO TITLE" },
    ],
    []
  );

  // ── KEYBOARD NAVIGATION (Up/Down, W/S, 1-6, E/Enter, Q/Esc) ──────────────
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const currentIndex = folderSlots.findIndex((f) => f.id === activeFolder);

      if (e.key === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        terminalSound.playKeyTick();
        const prevIndex = (currentIndex - 1 + folderSlots.length) % folderSlots.length;
        setActiveFolder(folderSlots[prevIndex].id as SystemCoreFolderId);
      } else if (e.key === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        terminalSound.playKeyTick();
        const nextIndex = (currentIndex + 1) % folderSlots.length;
        setActiveFolder(folderSlots[nextIndex].id as SystemCoreFolderId);
      } else if (e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        terminalSound.playSelectBlip();
        const target = folderSlots[parseInt(e.key, 10) - 1];
        if (target) setActiveFolder(target.id as SystemCoreFolderId);
      } else if (e.key === "Enter" || e.code === "KeyE") {
        if (activeFolder === "resume") {
          e.preventDefault();
          terminalSound.playSelectBlip();
          onResume();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeFolder, folderSlots, onResume]);

  if (!open) return null;

  const formatPlayTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <TerminalShell
      open={open}
      onClose={onResume}
      title="SCRAP // SYSTEM CORE"
      subtitle="UNIT SCRAP-07 // PAUSED"
      exitLabel="[Q] BACK / RESUME"
      theme="cyan"
      reducedMotion={reducedMotion}
      hasCompactMode={true}
      footerHints={
        <div className="w-full flex items-center justify-between text-[11px] sm:text-[12px] font-mono select-none px-2 text-[var(--term-green-text)]">
          <div className="flex items-center gap-2 flex-wrap">
            <span>UP / DOWN HIGHLIGHT</span>
            <span className="text-[var(--term-green-text-dim)]">.....</span>
            <span>E SELECT</span>
            <span className="text-[var(--term-green-text-dim)]">.....</span>
            <span>1-6 JUMP</span>
            <span className="text-[var(--term-green-text-dim)]">.....</span>
            <span>Q / ESC RESUME</span>
          </div>
          {appliedFeedback && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400 text-cyan-200 font-bold text-[11px] animate-pulse">
              <Check className="w-3 h-3 text-cyan-300" />
              <span>{appliedFeedback}</span>
            </div>
          )}
        </div>
      }
    >
      {/* ── Standard 2-Column Terminal Frame (>= 1024x600) ────────────────── */}
      {!isCompactViewport ? (
        <div className="relative flex-1 flex p-6 gap-8 overflow-hidden select-none">
          {/* Connector Line between active folder and content body */}
          <Connector
            startX={connectorAnchor.x}
            startY={connectorAnchor.y}
            endX={connectorAnchor.x + 36}
            endY={connectorAnchor.y}
            reducedMotion={reducedMotion}
          />

          {/* Left Column: 6 Folder Slots */}
          <FolderColumn
            slots={folderSlots}
            activeId={activeFolder}
            isFocused={true}
            onSelectFolder={(id) => {
              terminalSound.playSelectBlip();
              setActiveFolder(id as SystemCoreFolderId);
            }}
            onReportAnchor={setConnectorAnchor}
          />

          {/* Right Column: Active Content Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#020b12] border border-[var(--term-outline-green)] rounded-lg p-6 overflow-y-auto z-10 shadow-[inset_0_0_40px_rgba(0,0,0,0.85)]">
            {/* ── FOLDER 1: RESUME ─────────────────────────────────────── */}
            {activeFolder === "resume" && (
              <div className="flex flex-col gap-6">
                <div className="border-b border-cyan-900/60 pb-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-cyan-500 font-bold tracking-widest uppercase">
                      DIAGNOSTIC STATUS // ACTIVE MISSION
                    </span>
                    <h2 className="text-xl font-black text-cyan-100 tracking-wider uppercase term-glow">
                      SYSTEM READY // STANDBY PAUSE
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded border border-cyan-500/40 bg-cyan-950/70 text-cyan-300 text-xs font-mono font-bold">
                    T-ELAPSED: {formatPlayTime(elapsedSeconds)}
                  </span>
                </div>

                {/* Status Telemetry Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[#031522] border border-cyan-900/60 flex flex-col gap-1">
                    <span className="text-[11px] text-cyan-400/70 uppercase font-bold">VESSEL IDENTITY</span>
                    <span className="text-base text-cyan-200 font-black tracking-wide">AURELIA-IV // WRECKAGE</span>
                  </div>

                  <div className="p-4 rounded-lg bg-[#031522] border border-cyan-900/60 flex flex-col gap-1">
                    <span className="text-[11px] text-cyan-400/70 uppercase font-bold">ACTIVE OPERATOR</span>
                    <span className="text-base text-cyan-200 font-black tracking-wide">SURVIVOR DROID SCRAP-07</span>
                  </div>
                </div>

                {/* Primary Objective Banner */}
                <div className="p-5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 flex flex-col gap-2">
                  <span className="text-[11px] text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    CURRENT ACTIVE DIRECTIVE
                  </span>
                  <div className="text-sm font-bold text-cyan-100 leading-relaxed tracking-wide">
                    {currentObjective}
                  </div>
                </div>

                {/* Hero RESUME Button */}
                <button
                  type="button"
                  onClick={() => {
                    terminalSound.playSelectBlip();
                    onResume();
                  }}
                  className="mt-4 w-full py-4 px-6 rounded-lg bg-cyan-900/40 hover:bg-cyan-800/60 border-2 border-cyan-400 text-cyan-100 font-black text-base tracking-[0.25em] uppercase transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Play className="w-5 h-5 text-cyan-300 fill-cyan-300" />
                  <span>RESUME MISSION</span>
                  <span className="text-xs text-cyan-400/70 font-normal">[E / ENTER / SPACE]</span>
                </button>
              </div>
            )}

            {/* ── FOLDER 2: MISSION LOG ─────────────────────────────────── */}
            {activeFolder === "mission_log" && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-cyan-900/60 pb-3">
                  <span className="text-[11px] text-cyan-500 font-bold tracking-widest uppercase">
                    FLIGHT RECORDER // MISSION LOG
                  </span>
                  <h2 className="text-xl font-black text-cyan-100 tracking-wider uppercase term-glow">
                    SURVIVAL & SIGNAL RESTORATION PROGRESS
                  </h2>
                </div>

                {/* Large Objective Display */}
                <div className="p-4 rounded-lg bg-[#041d2e] border-l-4 border-amber-400 flex flex-col gap-1.5">
                  <span className="text-[11px] text-amber-300 uppercase font-black tracking-widest">
                    PRIMARY OBJECTIVE
                  </span>
                  <div className="text-sm font-bold text-cyan-50 leading-snug">
                    {currentObjective}
                  </div>
                </div>

                {/* Section Progress Checklist */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
                    SECTOR RESTORATION MILESTONES
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded border text-xs font-mono flex items-center justify-between ${isSec1Done ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}>
                      <span>SEC 1: TELEMETRY INTAKE</span>
                      <span>{isSec1Done ? "COMPLETED" : "IN PROGRESS"}</span>
                    </div>

                    <div className={`p-3 rounded border text-xs font-mono flex items-center justify-between ${isSec2Done ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}>
                      <span>SEC 2: RELAY DIAGNOSTIC</span>
                      <span>{isSec2Done ? "COMPLETED" : isSec1Done ? "AVAILABLE" : "LOCKED"}</span>
                    </div>

                    <div className={`p-3 rounded border text-xs font-mono flex items-center justify-between ${isSec3Done ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}>
                      <span>SEC 3: BEACON DECODER</span>
                      <span>{isSec3Done ? "COMPLETED" : isSec2Done ? "AVAILABLE" : "LOCKED"}</span>
                    </div>

                    <div className={`p-3 rounded border text-xs font-mono flex items-center justify-between ${isSec4Done ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}>
                      <span>SEC 4: ANTENNA NEURAL LAB</span>
                      <span>{isSec4Done ? "COMPLETED" : isSec3Done ? "AVAILABLE" : "LOCKED"}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Task Store List */}
                <div className="flex flex-col gap-2 pt-2 border-t border-cyan-900/40">
                  <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
                    ACTIVE DIRECTIVE QUEUE ({tasks.length} REGISTERED)
                  </span>
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {tasks.map((task) => {
                      const isDone = task.state === "done";
                      const isLocked = task.state === "locked";
                      return (
                        <div
                          key={task.id}
                          className={`p-3 rounded border flex items-center justify-between text-xs font-mono ${
                            isDone
                              ? "bg-cyan-950/30 border-cyan-800 text-cyan-300"
                              : isLocked
                              ? "bg-slate-950/40 border-slate-800 text-slate-500"
                              : "bg-[#041a29] border-cyan-500/60 text-cyan-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : isLocked ? (
                              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-bold tracking-wide">{task.title}</span>
                              <span className="text-[10px] text-cyan-500/70">{task.location}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold">
                              {task.progress} / {task.total}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                isDone
                                  ? "border-emerald-500/50 text-emerald-400 bg-emerald-950/50"
                                  : isLocked
                                  ? "border-slate-700 text-slate-500 bg-slate-950"
                                  : "border-amber-500/50 text-amber-300 bg-amber-950/50"
                              }`}
                            >
                              {task.state}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── FOLDER 3: CODEX ───────────────────────────────────────── */}
            {activeFolder === "codex" && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-cyan-900/60 pb-3">
                  <span className="text-[11px] text-cyan-500 font-bold tracking-widest uppercase">
                    DATA SCIENCE // RECOVERY CODEX
                  </span>
                  <h2 className="text-xl font-black text-cyan-100 tracking-wider uppercase term-glow">
                    UNLOCKED SYSTEMS & MATHEMATICAL CONCEPTS
                  </h2>
                </div>

                <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-2">
                  {codexCards.map((card) => {
                    return (
                      <div
                        key={card.id}
                        className={`p-4 rounded-lg border transition-all ${
                          card.unlocked
                            ? "bg-[#031b2c] border-cyan-500/50 text-cyan-100"
                            : "bg-slate-950/50 border-slate-900 text-slate-600"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold tracking-widest uppercase ${card.unlocked ? "text-cyan-400" : "text-slate-600"}`}>
                            {card.section}
                          </span>
                          <span
                            className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              card.unlocked
                                ? "border-cyan-400 bg-cyan-950 text-cyan-300"
                                : "border-slate-800 bg-slate-950 text-slate-600"
                            }`}
                          >
                            {card.unlocked ? (
                              <>
                                <Check className="w-3 h-3 text-cyan-400" />
                                <span>UNLOCKED</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>LOCKED</span>
                              </>
                            )}
                          </span>
                        </div>

                        {card.unlocked ? (
                          <>
                            <h3 className="text-sm font-black text-white tracking-wide uppercase mb-1">
                              {card.title}
                            </h3>
                            <p className="text-xs text-cyan-200/90 leading-relaxed font-mono">
                              {card.description}
                            </p>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 py-2 text-xs font-mono text-slate-600">
                            <Lock className="w-4 h-4" />
                            <span>CLASSIFIED // COMPLETE PRECEDING MISSION DIRECTIVES TO DECRYPT</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── FOLDER 4: SETTINGS ─────────────────────────────────────── */}
            {activeFolder === "settings" && (
              <div className="flex flex-col gap-6">
                <div className="border-b border-cyan-900/60 pb-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-cyan-500 font-bold tracking-widest uppercase">
                      SYSTEM CONFIGURATION // AVIONICS
                    </span>
                    <h2 className="text-xl font-black text-cyan-100 tracking-wider uppercase term-glow">
                      HARDWARE, AUDIO & ACCESSIBILITY CONTROLS
                    </h2>
                  </div>
                  {appliedFeedback && (
                    <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-300 text-xs font-bold animate-pulse">
                      ✓ {appliedFeedback}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-6 max-h-[460px] overflow-y-auto pr-2">
                  {/* 1. MOUSE CONTROLS (Sensitivity & Invert-Y) */}
                  <div className="p-4 rounded-lg bg-[#031522] border border-cyan-900/60 flex flex-col gap-3">
                    <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                      <Compass className="w-4 h-4 text-cyan-400" />
                      INPUT & LOOK DYNAMICS
                    </span>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-200">MOUSE SENSITIVITY</span>
                        <span className="text-xs font-black text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                          {mouseSensitivity.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.05"
                        value={mouseSensitivity}
                        onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-900"
                        aria-label="Mouse Sensitivity Slider"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-cyan-950">
                      <span className="text-xs font-bold text-cyan-200">INVERT Y-AXIS (FLIGHT STICK)</span>
                      <button
                        type="button"
                        onClick={() => handleInvertYChange(!invertY)}
                        className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                          invertY
                            ? "bg-cyan-500 text-black border-cyan-300"
                            : "bg-slate-950 text-cyan-400 border-cyan-900 hover:border-cyan-600"
                        }`}
                      >
                        {invertY ? "INVERTED (ON)" : "STANDARD (OFF)"}
                      </button>
                    </div>
                  </div>

                  {/* 2. AUDIO VOLUMES & MUTE */}
                  <div className="p-4 rounded-lg bg-[#031522] border border-cyan-900/60 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                        SYNTHETIC AUDIO ENGINE
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleMute}
                        className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isMuted
                            ? "bg-red-950 border-red-500 text-red-300"
                            : "bg-slate-950 border-cyan-700 text-cyan-300 hover:border-cyan-400"
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isMuted ? "MUTED" : "ACTIVE"}</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-200">MASTER VOLUME</span>
                        <span className="text-xs font-black text-cyan-300 font-mono">
                          {isMuted ? "0%" : `${masterVolume}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        disabled={isMuted}
                        value={isMuted ? 0 : masterVolume}
                        onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-cyan-900 disabled:opacity-30"
                        aria-label="Master Audio Volume"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-cyan-950">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-cyan-300">AMBIENCE BED</span>
                          <span className="text-[11px] font-mono text-cyan-400">{ambienceVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          disabled={isMuted}
                          value={isMuted ? 0 : ambienceVolume}
                          onChange={(e) => handleAmbienceVolumeChange(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400 border border-cyan-900 disabled:opacity-30"
                          aria-label="Ambience Audio Volume"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-cyan-300">SFX / INTERACTION</span>
                          <span className="text-[11px] font-mono text-cyan-400">{sfxVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          disabled={isMuted}
                          value={isMuted ? 0 : sfxVolume}
                          onChange={(e) => handleSfxVolumeChange(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400 border border-cyan-900 disabled:opacity-30"
                          aria-label="SFX Audio Volume"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. VISUAL & ACCESSIBILITY CONTROLS */}
                  <div className="p-4 rounded-lg bg-[#031522] border border-cyan-900/60 flex flex-col gap-3">
                    <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      DISPLAY, GRAPHICS & ACCESSIBILITY
                    </span>

                    {/* Graphics Quality */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-200">GRAPHICS QUALITY</span>
                      <div className="flex gap-1.5">
                        {(["low", "medium", "high"] as const).map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => handleGraphicsQualityChange(q)}
                            className={`px-2.5 py-1 rounded text-xs font-bold uppercase border transition-all cursor-pointer ${
                              graphicsQuality === q
                                ? "bg-cyan-500 text-black border-cyan-300 font-black"
                                : "bg-slate-950 text-cyan-400 border-cyan-900 hover:border-cyan-600"
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reduce Motion */}
                    <div className="flex items-center justify-between pt-2 border-t border-cyan-950">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-cyan-200">REDUCE MOTION</span>
                        <span className="text-[10px] text-cyan-500/70">Disables camera bob, boot flicker & fast animations</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onToggleReduceMotion) onToggleReduceMotion();
                          triggerAppliedNotification("REDUCE MOTION TOGGLED");
                        }}
                        className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                          reducedMotion
                            ? "bg-cyan-500 text-black border-cyan-300"
                            : "bg-slate-950 text-cyan-400 border-cyan-900 hover:border-cyan-600"
                        }`}
                      >
                        {reducedMotion ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Head-Bob Switch */}
                    <div className="flex items-center justify-between pt-2 border-t border-cyan-950">
                      <span className="text-xs font-bold text-cyan-200">WALKING HEAD-BOB</span>
                      <button
                        type="button"
                        onClick={() => handleHeadBobChange(!headBobEnabled)}
                        className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                          headBobEnabled
                            ? "bg-cyan-500 text-black border-cyan-300"
                            : "bg-slate-950 text-cyan-400 border-cyan-900 hover:border-cyan-600"
                        }`}
                      >
                        {headBobEnabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Text Size */}
                    <div className="flex items-center justify-between pt-2 border-t border-cyan-950">
                      <span className="text-xs font-bold text-cyan-200">UI TEXT SCALING</span>
                      <div className="flex gap-1.5">
                        {(["normal", "large", "xlarge"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleTextSizeChange(s)}
                            className={`px-2.5 py-1 rounded text-xs font-bold uppercase border transition-all cursor-pointer ${
                              textSize === s
                                ? "bg-cyan-500 text-black border-cyan-300 font-black"
                                : "bg-slate-950 text-cyan-400 border-cyan-900 hover:border-cyan-600"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Captions Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-cyan-950">
                      <span className="text-xs font-bold text-cyan-200">AUDITORY CAPTIONS</span>
                      <button
                        type="button"
                        onClick={() => handleCaptionsChange(!captionsEnabled)}
                        className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                          captionsEnabled
                            ? "bg-cyan-500 text-black border-cyan-300"
                            : "bg-slate-950 text-cyan-400 border-cyan-900 hover:border-cyan-600"
                        }`}
                      >
                        {captionsEnabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Colourblind Mode */}
                    <div className="flex items-center justify-between pt-2 border-t border-cyan-950">
                      <span className="text-xs font-bold text-cyan-200">COLOURBLIND CORRECTION</span>
                      <div className="flex gap-1 flex-wrap">
                        {(["off", "protanopia", "deuteranopia", "tritanopia"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleColorblindChange(m)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border transition-all cursor-pointer ${
                              colorblindMode === m
                                ? "bg-cyan-500 text-black border-cyan-300 font-black"
                                : "bg-slate-950 text-cyan-400 border-cyan-900 hover:border-cyan-600"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FOLDER 5: CONTROLS ─────────────────────────────────────── */}
            {activeFolder === "controls" && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-cyan-900/60 pb-3">
                  <span className="text-[11px] text-cyan-500 font-bold tracking-widest uppercase">
                    INPUT MATRIX // KEYCAP BINDINGS
                  </span>
                  <h2 className="text-xl font-black text-cyan-100 tracking-wider uppercase term-glow">
                    TACTICAL SUIT & TERMINAL CONTROL SPECIFICATION
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-2">
                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">THRUSHER MOVEMENT</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      W A S D
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">SPRINT BOOST</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      SHIFT
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">OPTICAL 360° LOOK</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      MOUSE
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">TACTICAL FLASHLIGHT</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      T
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">INTERACT // ACTIVATE</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      E / CLICK
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">PING SONAR / SKY SCAN</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      E / F
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">SYSTEM PAUSE // UNLOCK</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      ESC
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">TERMINAL EXIT // RESUME</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      Q
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">LIST HIGHLIGHT</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      UP / DOWN
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#031522] border border-cyan-900/60 flex items-center justify-between">
                    <span className="text-xs text-cyan-200 font-bold">CYCLE FREQUENCY / TAB</span>
                    <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-500 text-cyan-300 text-xs font-black font-mono">
                      TAB
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-300/90 font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Physical collision geometry is active across all hull bulkheads, debris and rocks.</span>
                </div>
              </div>
            )}

            {/* ── FOLDER 6: QUIT TO TITLE ───────────────────────────────── */}
            {activeFolder === "quit" && (
              <div className="flex flex-col gap-6 items-center justify-center h-full text-center py-8">
                <div className="p-4 rounded-full bg-red-950/60 border-2 border-red-500 text-red-400">
                  <Power className="w-8 h-8" />
                </div>

                <div className="flex flex-col gap-2 max-w-md">
                  <h2 className="text-xl font-black text-white tracking-widest uppercase [text-shadow:0_0_15px_rgba(239,68,68,0.7)]">
                    DISCONNECT OPERATIONAL SESSION?
                  </h2>
                  <p className="text-xs text-cyan-200/90 leading-relaxed font-mono">
                    Story progression milestones across Sections 1 to 4 are automatically saved to permanent local storage. Returning to Title will release the current camera position.
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full max-w-sm mt-4">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      terminalSound.playSelectBlip();
                      setActiveFolder("resume");
                    }}
                    className="flex-1 py-3 px-4 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border-2 border-cyan-400 text-cyan-100 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  >
                    CANCEL // STAY
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      terminalSound.playSelectBlip();
                      onQuitToTitle();
                    }}
                    className="flex-1 py-3 px-4 rounded-lg bg-red-950/80 hover:bg-red-900 border-2 border-red-500 text-red-100 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    CONFIRM QUIT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Compact Single-Column Layout (< 1024x600) ─────────────────────── */
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden select-none">
          {/* Top horizontal folder list */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 border-b border-cyan-900/60">
            {folderSlots.map((slot) => {
              const isActive = slot.id === activeFolder;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    terminalSound.playSelectBlip();
                    setActiveFolder(slot.id as SystemCoreFolderId);
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase whitespace-nowrap border transition-all cursor-pointer ${
                    isActive
                      ? "bg-cyan-400 text-black border-cyan-300 font-black"
                      : "bg-[#041421] text-cyan-400 border-cyan-900 hover:border-cyan-600"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>

          {/* Compact Body View */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#020b12] border border-cyan-900/60 rounded p-4 text-xs font-mono">
            {activeFolder === "resume" && (
              <div className="flex flex-col gap-4">
                <div className="p-3 rounded bg-cyan-950/40 border border-cyan-500/40">
                  <span className="text-[10px] text-amber-400 font-bold block mb-1">CURRENT DIRECTIVE</span>
                  <div className="text-xs text-white font-bold">{currentObjective}</div>
                </div>
                <div className="flex justify-between text-cyan-300 text-[11px] border-b border-cyan-950 pb-2">
                  <span>PLAYTIME: {formatPlayTime(elapsedSeconds)}</span>
                  <span>STATUS: PAUSED</span>
                </div>
                <button
                  type="button"
                  onClick={onResume}
                  className="w-full py-3 rounded bg-cyan-900/60 border border-cyan-400 text-cyan-100 font-bold uppercase tracking-wider"
                >
                  RESUME MISSION [ENTER / SPACE]
                </button>
              </div>
            )}

            {activeFolder === "mission_log" && (
              <div className="flex flex-col gap-3">
                <span className="font-bold text-cyan-300 uppercase">DIRECTIVES QUEUE</span>
                <div className="flex flex-col gap-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="p-2 rounded border border-cyan-950 bg-black/40 flex justify-between">
                      <span>{t.title}</span>
                      <span className="text-cyan-400 font-bold">[{t.state.toUpperCase()}]</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFolder === "codex" && (
              <div className="flex flex-col gap-3">
                <span className="font-bold text-cyan-300 uppercase">CONCEPT CODEX</span>
                {codexCards.map((c) => (
                  <div key={c.id} className="p-2 rounded border border-cyan-950 bg-black/40">
                    <div className="text-[10px] text-cyan-500 font-bold">{c.section}</div>
                    <div className="font-bold text-white">{c.title}</div>
                    {c.unlocked ? (
                      <div className="text-cyan-200 mt-1">{c.description}</div>
                    ) : (
                      <div className="text-slate-500 mt-1">[LOCKED // RESTRICTED]</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeFolder === "settings" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>SENSITIVITY</span>
                    <span>{mouseSensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={mouseSensitivity}
                    onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                    className="accent-cyan-400"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>MASTER VOLUME</span>
                    <span>{masterVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={masterVolume}
                    onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value, 10))}
                    className="accent-cyan-400"
                  />
                </div>

                <div className="flex justify-between items-center border-t border-cyan-950 pt-2">
                  <span>AUDIO MUTE</span>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="px-2 py-1 rounded border border-cyan-700 bg-slate-900"
                  >
                    {isMuted ? "MUTED" : "UNMUTED"}
                  </button>
                </div>

                <div className="flex justify-between items-center border-t border-cyan-950 pt-2">
                  <span>REDUCE MOTION</span>
                  <button
                    type="button"
                    onClick={onToggleReduceMotion}
                    className="px-2 py-1 rounded border border-cyan-700 bg-slate-950"
                  >
                    {reducedMotion ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            )}

            {activeFolder === "controls" && (
              <div className="flex flex-col gap-2">
                <span className="font-bold text-cyan-300 uppercase">KEYBOARD BINDINGS</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>WASD: Move</div>
                  <div>SHIFT: Sprint</div>
                  <div>MOUSE: Look</div>
                  <div>T: Flashlight</div>
                  <div>E/F: Ping & Scan</div>
                  <div>ESC: Pause</div>
                </div>
              </div>
            )}

            {activeFolder === "quit" && (
              <div className="flex flex-col gap-4 text-center py-4">
                <div className="text-white font-bold">QUIT TO TITLE SCREEN?</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFolder("resume")}
                    className="flex-1 py-2 rounded bg-cyan-900 text-white font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={onQuitToTitle}
                    className="flex-1 py-2 rounded bg-red-950 border border-red-500 text-red-200 font-bold"
                  >
                    QUIT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </TerminalShell>
  );
}

export default SystemCoreMenu;
