"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import "../../styles/systemCoreTokens.css";
import { terminalSound } from "../../ui/terminal/sound";
import { shipAudio, AudioQualityPreset } from "../../audio/shipAudio";
import { scene1Sound } from "../../scenes/scene1/sound";

export type SystemMenuTab = "resume" | "settings" | "controls" | "quit";

export interface ScrapPauseMenuProps {
  open?: boolean;
  initialTab?: SystemMenuTab;
  initialFocusedControl?: number;
  initialQuitChoice?: 0 | 1;
  viewport?: "1280x720" | "1024x600";
  isEmbedded?: boolean;
  onTabChange?: (tab: SystemMenuTab) => void;
  onResume?: () => void;
  onQuitToTitle?: () => void;
  mouseSensitivity?: number;
  onSensitivityChange?: (val: number) => void;
  masterVolume?: number;
  onVolumeChange?: (val: number) => void;
  isMuted?: boolean;
  onToggleMute?: (muted?: boolean) => void;
  reducedMotion?: boolean;
  onToggleReduceMotion?: () => void;
}

export function ScrapPauseMenu({
  open = true,
  initialTab = "resume",
  initialFocusedControl = 0,
  initialQuitChoice = 0,
  viewport = "1280x720",
  isEmbedded = false,
  onTabChange,
  onResume,
  onQuitToTitle,
  mouseSensitivity: propSensitivity,
  onSensitivityChange,
  masterVolume: propMasterVolume,
  onVolumeChange,
  isMuted: propIsMuted,
  onToggleMute,
  reducedMotion = false,
  onToggleReduceMotion,
}: ScrapPauseMenuProps) {
  const [activeTab, setActiveTab] = useState<SystemMenuTab>(initialTab);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusedControl, setFocusedControl] = useState<number>(initialFocusedControl);
  const [quitChoice, setQuitChoice] = useState<0 | 1>(initialQuitChoice);

  // Sync prop changes
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (typeof initialFocusedControl === "number") setFocusedControl(initialFocusedControl);
  }, [initialFocusedControl]);

  useEffect(() => {
    if (typeof initialQuitChoice === "number") setQuitChoice(initialQuitChoice);
  }, [initialQuitChoice]);

  // Playtime counter
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  // Responsive uniform scaling for standalone modal
  const [scale, setScale] = useState(1);
  const isCompact = viewport === "1024x600";

  useEffect(() => {
    if (isEmbedded) {
      setScale(1);
      return;
    }
    function updateScale() {
      if (typeof window === "undefined") return;
      const targetW = isCompact ? 1024 : 1280;
      const targetH = isCompact ? 600 : 720;
      const availW = window.innerWidth;
      const availH = window.innerHeight;
      const s = Math.min(availW / targetW, availH / targetH);
      setScale(Math.max(0.65, Math.min(1.4, s)));
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [isCompact, isEmbedded]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectTab = useCallback(
    (tab: SystemMenuTab) => {
      terminalSound.playSelectBlip();
      setActiveTab(tab);
      if (onTabChange) onTabChange(tab);
    },
    [onTabChange]
  );

  // ── SETTINGS STATE & PERSISTENCE ─────────────────────────────────────────
  const [mouseSensitivity, setMouseSensitivity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("neuroscrap_mouse_sens");
        if (s) {
          const v = parseFloat(s);
          if (!isNaN(v) && v >= 0.2 && v <= 3.0) return v;
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
        const s = localStorage.getItem("scene1_audio_volume");
        if (s) {
          const v = parseFloat(s);
          if (!isNaN(v)) return Math.round(v * 100);
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
          const p = JSON.parse(item);
          if (typeof p.ambience === "number") return Math.round(p.ambience * 100);
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
          const p = JSON.parse(item);
          if (typeof p.sfx === "number") return Math.round(p.sfx * 100);
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
        const s = localStorage.getItem("neuroscrap_graphics_quality") as any;
        if (s === "low" || s === "medium" || s === "high") return s;
      } catch {}
    }
    return "high";
  });

  const [headBob, setHeadBob] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("neuroscrap_head_bob") !== "false";
      } catch {}
    }
    return true;
  });

  const [textSize, setTextSize] = useState<"normal" | "large" | "xlarge">(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem("neuroscrap_text_size") as any;
        if (s === "normal" || s === "large" || s === "xlarge") return s;
      } catch {}
    }
    return "normal";
  });

  const [captions, setCaptions] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("neuroscrap_captions") === "true";
      } catch {}
    }
    return true;
  });

  // Sync props if passed from Game.tsx
  useEffect(() => {
    if (typeof propSensitivity === "number") setMouseSensitivity(propSensitivity);
  }, [propSensitivity]);

  useEffect(() => {
    if (typeof propMasterVolume === "number") setMasterVolume(propMasterVolume);
  }, [propMasterVolume]);

  useEffect(() => {
    if (typeof propIsMuted === "boolean") setIsMuted(propIsMuted);
  }, [propIsMuted]);

  const triggerApplied = useCallback((label: string) => {
    setAppliedFeedback(label);
    terminalSound.playSuccessChime();
    const t = setTimeout(() => setAppliedFeedback(null), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleSensitivity = (val: number) => {
    setMouseSensitivity(val);
    if (onSensitivityChange) onSensitivityChange(val);
    try {
      localStorage.setItem("neuroscrap_mouse_sens", val.toString());
    } catch {}
    triggerApplied("SENSITIVITY APPLIED");
  };

  const handleInvertY = (val: boolean) => {
    setInvertY(val);
    try {
      localStorage.setItem("neuroscrap_invert_y", val ? "true" : "false");
    } catch {}
    triggerApplied(val ? "INVERT Y ON" : "INVERT Y OFF");
  };

  const handleMasterVol = (pct: number) => {
    setMasterVolume(pct);
    const v = pct / 100;
    shipAudio.setMasterVolume(v);
    scene1Sound.setVolume(v);
    if (onVolumeChange) onVolumeChange(pct);
    if (pct > 0 && isMuted) {
      setIsMuted(false);
      shipAudio.setMuted(false);
      scene1Sound.setMuted(false);
      terminalSound.setMuted(false);
      try {
        localStorage.setItem("scene1_audio_muted", "false");
      } catch {}
      if (onToggleMute) onToggleMute(false);
    }
    try {
      localStorage.setItem("scene1_audio_volume", v.toString());
    } catch {}
    terminalSound.playSnapTick();
  };

  const handleAmbienceVol = (pct: number) => {
    setAmbienceVolume(pct);
    const v = pct / 100;
    shipAudio.setAmbienceVolume(v);
    if (pct > 0 && isMuted) {
      setIsMuted(false);
      shipAudio.setMuted(false);
      scene1Sound.setMuted(false);
      terminalSound.setMuted(false);
      try {
        localStorage.setItem("scene1_audio_muted", "false");
      } catch {}
      if (onToggleMute) onToggleMute(false);
    }
    terminalSound.playSnapTick();
  };

  const handleSfxVol = (pct: number) => {
    setSfxVolume(pct);
    const v = pct / 100;
    shipAudio.setSfxVolume(v);
    if (pct > 0 && isMuted) {
      setIsMuted(false);
      shipAudio.setMuted(false);
      scene1Sound.setMuted(false);
      terminalSound.setMuted(false);
      try {
        localStorage.setItem("scene1_audio_muted", "false");
      } catch {}
      if (onToggleMute) onToggleMute(false);
    }
    terminalSound.playSnapTick();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    shipAudio.setMuted(next);
    scene1Sound.setMuted(next);
    terminalSound.setMuted(next);
    try {
      localStorage.setItem("scene1_audio_muted", next ? "true" : "false");
    } catch {}
    triggerApplied(next ? "AUDIO MUTED" : "AUDIO UNMUTED");
    if (onToggleMute) {
      onToggleMute(next);
    }
  };

  const handleQuality = (q: "low" | "medium" | "high") => {
    setGraphicsQuality(q);
    shipAudio.setQuality(q as AudioQualityPreset);
    try {
      localStorage.setItem("neuroscrap_graphics_quality", q);
    } catch {}
    triggerApplied(`QUALITY ${q.toUpperCase()}`);
  };

  const handleHeadBob = (val: boolean) => {
    setHeadBob(val);
    try {
      localStorage.setItem("neuroscrap_head_bob", val ? "true" : "false");
    } catch {}
    triggerApplied(val ? "HEAD BOB ON" : "HEAD BOB OFF");
  };

  const handleTextSize = (s: "normal" | "large" | "xlarge") => {
    setTextSize(s);
    try {
      localStorage.setItem("neuroscrap_text_size", s);
    } catch {}
    triggerApplied(`TEXT ${s.toUpperCase()}`);
  };

  const handleCaptions = (val: boolean) => {
    setCaptions(val);
    try {
      localStorage.setItem("neuroscrap_captions", val ? "true" : "false");
    } catch {}
    triggerApplied(val ? "CAPTIONS ON" : "CAPTIONS OFF");
  };

  // Keyboard adjustment for active setting row
  const adjustSetting = useCallback(
    (dir: -1 | 1) => {
      switch (focusedControl) {
        case 0: {
          const presets: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
          const curr = presets.indexOf(graphicsQuality);
          const next = presets[(curr + dir + presets.length) % presets.length];
          handleQuality(next);
          break;
        }
        case 1: {
          const next = Math.max(0, Math.min(100, masterVolume + dir * 5));
          handleMasterVol(next);
          break;
        }
        case 2: {
          const next = Math.max(0, Math.min(100, ambienceVolume + dir * 5));
          handleAmbienceVol(next);
          break;
        }
        case 3: {
          const next = Math.max(0, Math.min(100, sfxVolume + dir * 5));
          handleSfxVol(next);
          break;
        }
        case 4: {
          handleToggleMute();
          break;
        }
        case 5: {
          const next = Math.max(0.2, Math.min(3.0, parseFloat((mouseSensitivity + dir * 0.1).toFixed(2))));
          handleSensitivity(next);
          break;
        }
        case 6: {
          handleInvertY(!invertY);
          break;
        }
        case 7: {
          handleHeadBob(!headBob);
          break;
        }
        case 8: {
          if (onToggleReduceMotion) onToggleReduceMotion();
          triggerApplied("REDUCE MOTION TOGGLED");
          break;
        }
        case 9: {
          const sizes: ("normal" | "large" | "xlarge")[] = ["normal", "large", "xlarge"];
          const curr = sizes.indexOf(textSize);
          const next = sizes[(curr + dir + sizes.length) % sizes.length];
          handleTextSize(next);
          break;
        }
        case 10: {
          handleCaptions(!captions);
          break;
        }
        default:
          break;
      }
    },
    [
      focusedControl,
      graphicsQuality,
      masterVolume,
      ambienceVolume,
      sfxVolume,
      mouseSensitivity,
      invertY,
      headBob,
      textSize,
      captions,
      onToggleReduceMotion,
      triggerApplied,
    ]
  );

  const activateSetting = useCallback(() => {
    adjustSetting(1);
  }, [adjustSetting]);

  // Menu items list (4 items: RESUME, SETTINGS, CONTROLS, QUIT TO TITLE)
  const menuItems: { id: SystemMenuTab; keyNum: string; label: string }[] = useMemo(
    () => [
      { id: "resume", keyNum: "1", label: "RESUME" },
      { id: "settings", keyNum: "2", label: "SETTINGS" },
      { id: "controls", keyNum: "3", label: "CONTROLS" },
      { id: "quit", keyNum: "4", label: "QUIT TO TITLE" },
    ],
    []
  );

  // Format mm:ss
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Keyboard navigation & interaction
  useEffect(() => {
    if (!open) return;

    if (!reducedMotion) {
      terminalSound.playPowerOnHum();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement && e.target.type === "text") return;

      // ── ESC / Q: Resume ──
      if (e.key === "Escape" || e.code === "KeyQ") {
        e.preventDefault();
        terminalSound.playSelectBlip();
        if (onResume) onResume();
        return;
      }

      // ── 1-4 Keys: Jump directly to tabs ──
      if (["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const tabIdx = parseInt(e.key, 10) - 1;
        if (tabIdx >= 0 && tabIdx < menuItems.length) {
          selectTab(menuItems[tabIdx].id);
          if (menuItems[tabIdx].id === "resume" && onResume) {
            onResume();
          }
        }
        return;
      }

      // ── Tab / Shift+Tab: Cycle focus within current tab ──
      if (e.key === "Tab") {
        e.preventDefault();
        terminalSound.playKeyTick();
        if (activeTab === "settings") {
          const totalControls = 11;
          setFocusedControl((prev) =>
            e.shiftKey ? (prev - 1 + totalControls) % totalControls : (prev + 1) % totalControls
          );
        } else if (activeTab === "quit") {
          setQuitChoice((prev) => (prev === 0 ? 1 : 0));
        }
        return;
      }

      // ── Up / Down (or W / S): Navigation ──
      if (e.key === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (activeTab === "settings" && e.key === "ArrowUp") {
          terminalSound.playKeyTick();
          setFocusedControl((prev) => (prev - 1 + 11) % 11);
        } else {
          terminalSound.playKeyTick();
          const currIdx = menuItems.findIndex((m) => m.id === activeTab);
          const nextIdx = (currIdx - 1 + menuItems.length) % menuItems.length;
          selectTab(menuItems[nextIdx].id);
        }
        return;
      }

      if (e.key === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        if (activeTab === "settings" && e.key === "ArrowDown") {
          terminalSound.playKeyTick();
          setFocusedControl((prev) => (prev + 1) % 11);
        } else {
          terminalSound.playKeyTick();
          const currIdx = menuItems.findIndex((m) => m.id === activeTab);
          const nextIdx = (currIdx + 1) % menuItems.length;
          selectTab(menuItems[nextIdx].id);
        }
        return;
      }

      // ── Left / Right (or A / D): Sliders & Choices ──
      if (e.key === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        if (activeTab === "settings") {
          adjustSetting(-1);
        } else if (activeTab === "quit") {
          terminalSound.playKeyTick();
          setQuitChoice(0);
        }
        return;
      }

      if (e.key === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        if (activeTab === "settings") {
          adjustSetting(1);
        } else if (activeTab === "quit") {
          terminalSound.playKeyTick();
          setQuitChoice(1);
        }
        return;
      }

      // ── Enter / Space / E: Select / Confirm / Toggle ──
      if (e.key === "Enter" || e.code === "Space" || e.code === "KeyE") {
        e.preventDefault();
        if (activeTab === "resume") {
          terminalSound.playSelectBlip();
          if (onResume) onResume();
        } else if (activeTab === "quit") {
          if (quitChoice === 0) {
            terminalSound.playSelectBlip();
            if (onResume) onResume();
          } else {
            terminalSound.playBackBlip();
            if (onQuitToTitle) onQuitToTitle();
          }
        } else if (activeTab === "settings") {
          activateSetting();
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    open,
    activeTab,
    focusedControl,
    quitChoice,
    reducedMotion,
    menuItems,
    selectTab,
    onResume,
    onQuitToTitle,
    adjustSetting,
    activateSetting,
  ]);

  const stageContent = (
    <div
      className="relative select-none overflow-hidden font-mono text-[var(--sc-text)] flex flex-col justify-between"
      style={{
        width: isCompact ? "1024px" : "1280px",
        height: isCompact ? "600px" : "720px",
        transform: isEmbedded ? "none" : `scale(${scale})`,
        transformOrigin: "center center",
        flexShrink: 0,
      }}
    >
      {/* ── 4 Corner Brackets ───────────────────────────────────────────── */}
      <div
        className="absolute top-4 left-4 w-4 h-4 pointer-events-none"
        style={{ borderTop: "1px solid var(--sc-line)", borderLeft: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />
      <div
        className="absolute top-4 right-4 w-4 h-4 pointer-events-none"
        style={{ borderTop: "1px solid var(--sc-line)", borderRight: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-4 left-4 w-4 h-4 pointer-events-none"
        style={{ borderBottom: "1px solid var(--sc-line)", borderLeft: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-4 right-4 w-4 h-4 pointer-events-none"
        style={{ borderBottom: "1px solid var(--sc-line)", borderRight: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />

      {/* ── TOP STRIP (28 px, Hairline Below) ───────────────────────────── */}
      <header
        className="relative z-20 w-full h-[28px] px-8 flex items-center justify-between text-xs font-mono uppercase tracking-widest"
        style={{ borderBottom: "1px solid var(--sc-line)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--sc-accent-cyan)", boxShadow: "0 0 6px var(--sc-accent-cyan)" }}
          />
          <span className="font-bold text-[var(--sc-accent-cyan)] sc-glow-cyan tracking-[0.2em]">
            SCRAP-07
          </span>
        </div>

        <div className="flex items-center gap-4 text-[var(--sc-dim)]">
          <span>ELAPSED: {formatTime(elapsedSeconds)}</span>
          <span style={{ color: "var(--sc-line)" }}>|</span>
          <span className="text-[var(--sc-accent-cyan)] font-bold">SIGNAL</span>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────── */}
      {!isCompact ? (
        /* Standard 1280x720 Layout */
        <div className="relative w-full h-[calc(720px-28px-32px)] flex">
          {/* LEFT COLUMN: 4 stacked menu words with text motion animations */}
          <nav
            className="w-[440px] pl-16 pr-8 flex flex-col justify-center gap-14 z-10"
            role="navigation"
            aria-label="Pause Menu Navigation"
          >
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    selectTab(item.id);
                    if (item.id === "resume" && onResume) {
                      onResume();
                    }
                  }}
                  onMouseEnter={() => terminalSound.playKeyTick()}
                  className="group relative flex items-center gap-5 cursor-pointer select-none py-2"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  {/* Left accent bar with slide & glow */}
                  <div
                    className="sc-indicator-bar absolute -left-8 top-1/2 -translate-y-1/2 w-[4px]"
                    style={{
                      height: isSelected ? "42px" : "0px",
                      backgroundColor: "var(--sc-accent-cyan)",
                      boxShadow: isSelected ? "0 0 14px var(--sc-accent-cyan)" : "none",
                      opacity: isSelected ? 1 : 0,
                    }}
                  />

                  {/* Tiny number key (01-04) with smooth motion */}
                  <span
                    className="text-xs font-mono transition-all duration-200"
                    style={{
                      color: isSelected ? "var(--sc-accent-cyan)" : "var(--sc-dim)",
                      transform: isSelected ? "translateX(6px)" : "translateX(0)",
                      textShadow: isSelected ? "0 0 8px rgba(25, 240, 255, 0.6)" : "none",
                    }}
                  >
                    0{item.keyNum}
                  </span>

                  {/* Word: 44px unselected, 52px selected with text motion animation */}
                  <div className="relative">
                    <span
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: isSelected ? "52px" : "44px",
                        lineHeight: "1.0",
                        fontWeight: isSelected ? 700 : 500,
                      }}
                      className={`sc-menu-text uppercase inline-block ${
                        isSelected ? "sc-menu-text-active" : "text-[var(--sc-dim)]"
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Chamfered kinetic underline under selected word */}
                    {isSelected && (
                      <div
                        className="absolute -bottom-2.5 left-0 right-0 h-[2px] sc-chamfer-8 animate-in fade-in duration-200"
                        style={{
                          backgroundColor: "var(--sc-accent-cyan)",
                          boxShadow: "0 0 10px var(--sc-accent-cyan)",
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* RIGHT AREA: Content Panel (Minimal & Transparent) */}
          <main className="flex-1 pr-16 pl-6 flex flex-col justify-center z-10 overflow-hidden">
            {/* ── TAB 1: RESUME (Clean view, looking straight through to game) ─ */}
            {activeTab === "resume" && null}

            {/* ── TAB 2: SETTINGS VIEW ──────────────────────────────────── */}
            {activeTab === "settings" && (
              <div className="relative w-full h-[520px] p-6 sc-chamfer-8 flex flex-col gap-6 overflow-y-auto sc-content-fade" style={{ backgroundColor: "var(--sc-haze)", border: "1px solid var(--sc-line)" }}>
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--sc-line)" }}>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-[var(--sc-accent-cyan)] tracking-widest uppercase">
                      SYSTEM CONFIGURATION
                    </span>
                    <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--sc-core-white)]" style={{ fontFamily: "var(--font-condensed)" }}>
                      HARDWARE, AUDIO & ACCESSIBILITY
                    </h2>
                  </div>
                  {appliedFeedback && (
                    <span className="px-2 py-0.5 sc-chamfer-8 text-[11px] font-mono font-bold text-[var(--sc-core-white)] bg-[var(--sc-accent-cyan)] text-[var(--sc-void)] animate-pulse">
                      {appliedFeedback}
                    </span>
                  )}
                </div>

                {/* 1. GRAPHICS HEADING */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-mono font-bold text-[var(--sc-accent-cyan)] uppercase tracking-wider">
                    GRAPHICS
                  </span>
                  <div
                    onClick={() => setFocusedControl(0)}
                    className="flex items-center justify-between text-xs font-mono p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 0 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 0 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <span className="text-[var(--sc-text)] flex items-center gap-2">
                      {focusedControl === 0 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                      QUALITY PRESET
                    </span>
                    <div className="flex gap-2">
                      {(["low", "medium", "high"] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => handleQuality(q)}
                          className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer transition-all"
                          style={{
                            backgroundColor: graphicsQuality === q ? "var(--sc-accent-cyan)" : "var(--sc-void)",
                            color: graphicsQuality === q ? "var(--sc-void)" : "var(--sc-text)",
                            border: `1px solid ${graphicsQuality === q ? "var(--sc-accent-cyan)" : "var(--sc-line)"}`,
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. AUDIO HEADING */}
                <div className="flex flex-col gap-4 pt-3" style={{ borderTop: "1px solid var(--sc-line)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[var(--sc-accent-cyan)] uppercase tracking-wider">
                      AUDIO
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedControl(4);
                        handleToggleMute();
                      }}
                      className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                      style={{
                        backgroundColor: isMuted ? "var(--sc-warm)" : "var(--sc-void)",
                        color: isMuted ? "var(--sc-void)" : "var(--sc-text)",
                        border: `1px solid ${isMuted ? "var(--sc-warm)" : "var(--sc-line)"}`,
                        outline: focusedControl === 4 ? "1px solid var(--sc-accent-cyan)" : "none",
                      }}
                    >
                      {isMuted ? "MUTED" : "UNMUTED"}
                    </button>
                  </div>

                  <div
                    onClick={() => setFocusedControl(1)}
                    className="flex flex-col gap-2 p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 1 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 1 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <div className="flex justify-between text-xs font-mono">
                      <span className="flex items-center gap-2">
                        {focusedControl === 1 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                        MASTER VOLUME
                      </span>
                      <span className="font-bold text-[var(--sc-accent-cyan)]">{isMuted ? "0%" : `${masterVolume}%`}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : masterVolume}
                      onChange={(e) => handleMasterVol(parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-[var(--sc-void)] appearance-none cursor-pointer accent-[var(--sc-accent-cyan)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setFocusedControl(2)}
                      className="flex flex-col gap-1.5 text-xs font-mono p-1 rounded transition-all"
                      style={{
                        outline: focusedControl === 2 ? "1px solid var(--sc-accent-cyan)" : "none",
                        backgroundColor: focusedControl === 2 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                      }}
                    >
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          {focusedControl === 2 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                          AMBIENCE VOLUME
                        </span>
                        <span className="text-[var(--sc-accent-cyan)]">{ambienceVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : ambienceVolume}
                        onChange={(e) => handleAmbienceVol(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-[var(--sc-void)] appearance-none cursor-pointer accent-[var(--sc-accent-cyan)]"
                      />
                    </div>
                    <div
                      onClick={() => setFocusedControl(3)}
                      className="flex flex-col gap-1.5 text-xs font-mono p-1 rounded transition-all"
                      style={{
                        outline: focusedControl === 3 ? "1px solid var(--sc-accent-cyan)" : "none",
                        backgroundColor: focusedControl === 3 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                      }}
                    >
                      <div className="flex justify-between">
                        <span className="flex items-center gap-2">
                          {focusedControl === 3 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                          EFFECTS VOLUME
                        </span>
                        <span className="text-[var(--sc-accent-cyan)]">{sfxVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : sfxVolume}
                        onChange={(e) => handleSfxVol(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-[var(--sc-void)] appearance-none cursor-pointer accent-[var(--sc-accent-cyan)]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. CONTROLS HEADING */}
                <div className="flex flex-col gap-4 pt-3" style={{ borderTop: "1px solid var(--sc-line)" }}>
                  <span className="text-xs font-mono font-bold text-[var(--sc-accent-cyan)] uppercase tracking-wider">
                    CONTROLS
                  </span>

                  <div
                    onClick={() => setFocusedControl(5)}
                    className="flex flex-col gap-2 p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 5 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 5 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <div className="flex justify-between text-xs font-mono">
                      <span className="flex items-center gap-2">
                        {focusedControl === 5 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                        MOUSE LOOK SENSITIVITY
                      </span>
                      <span className="font-bold text-[var(--sc-accent-cyan)]">{mouseSensitivity.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={mouseSensitivity}
                      onChange={(e) => handleSensitivity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-[var(--sc-void)] appearance-none cursor-pointer accent-[var(--sc-accent-cyan)]"
                    />
                  </div>

                  <div
                    onClick={() => setFocusedControl(6)}
                    className="flex items-center justify-between text-xs font-mono p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 6 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 6 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {focusedControl === 6 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                      INVERT Y-AXIS
                    </span>
                    <button
                      type="button"
                      onClick={() => handleInvertY(!invertY)}
                      className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                      style={{
                        backgroundColor: invertY ? "var(--sc-accent-cyan)" : "var(--sc-void)",
                        color: invertY ? "var(--sc-void)" : "var(--sc-text)",
                        border: `1px solid ${invertY ? "var(--sc-accent-cyan)" : "var(--sc-line)"}`,
                      }}
                    >
                      {invertY ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div
                    onClick={() => setFocusedControl(7)}
                    className="flex items-center justify-between text-xs font-mono p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 7 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 7 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {focusedControl === 7 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                      WALKING HEAD-BOB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleHeadBob(!headBob)}
                      className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                      style={{
                        backgroundColor: headBob ? "var(--sc-accent-cyan)" : "var(--sc-void)",
                        color: headBob ? "var(--sc-void)" : "var(--sc-text)",
                        border: `1px solid ${headBob ? "var(--sc-accent-cyan)" : "var(--sc-line)"}`,
                      }}
                    >
                      {headBob ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>

                {/* 4. ACCESSIBILITY HEADING */}
                <div className="flex flex-col gap-4 pt-3" style={{ borderTop: "1px solid var(--sc-line)" }}>
                  <span className="text-xs font-mono font-bold text-[var(--sc-accent-cyan)] uppercase tracking-wider">
                    ACCESSIBILITY
                  </span>

                  <div
                    onClick={() => setFocusedControl(8)}
                    className="flex items-center justify-between text-xs font-mono p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 8 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 8 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2">
                        {focusedControl === 8 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                        REDUCE MOTION
                      </span>
                      <span className="text-[10px] text-[var(--sc-dim)]">Disables head bob, screen flicker & fast roll</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleReduceMotion) onToggleReduceMotion();
                        triggerApplied("REDUCE MOTION TOGGLED");
                      }}
                      className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                      style={{
                        backgroundColor: reducedMotion ? "var(--sc-accent-cyan)" : "var(--sc-void)",
                        color: reducedMotion ? "var(--sc-void)" : "var(--sc-text)",
                        border: `1px solid ${reducedMotion ? "var(--sc-accent-cyan)" : "var(--sc-line)"}`,
                      }}
                    >
                      {reducedMotion ? "ON" : "OFF"}
                    </button>
                  </div>

                  <div
                    onClick={() => setFocusedControl(9)}
                    className="flex items-center justify-between text-xs font-mono p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 9 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 9 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {focusedControl === 9 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                      TEXT SCALING
                    </span>
                    <div className="flex gap-2">
                      {(["normal", "large", "xlarge"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleTextSize(s)}
                          className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                          style={{
                            backgroundColor: textSize === s ? "var(--sc-accent-cyan)" : "var(--sc-void)",
                            color: textSize === s ? "var(--sc-void)" : "var(--sc-text)",
                            border: `1px solid ${textSize === s ? "var(--sc-accent-cyan)" : "var(--sc-line)"}`,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    onClick={() => setFocusedControl(10)}
                    className="flex items-center justify-between text-xs font-mono p-1 rounded transition-all"
                    style={{
                      outline: focusedControl === 10 ? "1px solid var(--sc-accent-cyan)" : "none",
                      backgroundColor: focusedControl === 10 ? "rgba(25, 240, 255, 0.05)" : "transparent",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      {focusedControl === 10 && <span className="text-[var(--sc-accent-cyan)]">▶</span>}
                      AUDITORY CAPTIONS
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCaptions(!captions)}
                      className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                      style={{
                        backgroundColor: captions ? "var(--sc-accent-cyan)" : "var(--sc-void)",
                        color: captions ? "var(--sc-void)" : "var(--sc-text)",
                        border: `1px solid ${captions ? "var(--sc-accent-cyan)" : "var(--sc-line)"}`,
                      }}
                    >
                      {captions ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: CONTROLS VIEW (Drawn Keycaps) ───────────────────── */}
            {activeTab === "controls" && (
              <div className="relative w-full h-[520px] p-6 sc-chamfer-8 flex flex-col gap-6 sc-content-fade" style={{ backgroundColor: "var(--sc-haze)", border: "1px solid var(--sc-line)" }}>
                <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--sc-line)" }}>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-[var(--sc-accent-cyan)] tracking-widest uppercase">
                      TACTICAL SUIT MATRIX
                    </span>
                    <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--sc-core-white)]" style={{ fontFamily: "var(--font-condensed)" }}>
                      INPUT BINDINGS & SENSOR MAP
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2">
                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">THRUST LOCOMOTION</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      W A S D
                    </span>
                  </div>

                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">SPRINT OVERDRIVE</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      SHIFT
                    </span>
                  </div>

                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">360° OPTICAL LOOK</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      MOUSE
                    </span>
                  </div>

                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">TACTICAL FLASHLIGHT</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      T
                    </span>
                  </div>

                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">INTERACT & CONSOLES</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      E / CLICK
                    </span>
                  </div>

                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">SONAR PING / SKY SCAN</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      E / F
                    </span>
                  </div>

                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">PAUSE / SYSTEM MENU</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      ESC
                    </span>
                  </div>

                  <div className="p-3.5 sc-chamfer-8 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: "var(--sc-void)", border: "1px solid var(--sc-line)" }}>
                    <span className="font-bold">QUICK RESUME</span>
                    <span className="px-2.5 py-1 sc-chamfer-8 font-black text-[var(--sc-core-white)] bg-[var(--sc-haze)] border border-[var(--sc-line)]">
                      Q
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: QUIT TO TITLE VIEW ─────────────────────────────── */}
            {activeTab === "quit" && (
              <div className="relative w-full h-[520px] p-8 sc-chamfer-8 flex flex-col justify-center items-center text-center gap-6 sc-content-fade" style={{ backgroundColor: "var(--sc-haze)", border: "1px solid var(--sc-line)" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center border border-[var(--sc-warm)] text-[var(--sc-warm)] font-bold">
                  !
                </div>

                <div className="flex flex-col gap-2 max-w-md">
                  <h2
                    className="text-2xl font-bold uppercase tracking-wider text-[var(--sc-core-white)]"
                    style={{ fontFamily: "var(--font-condensed)" }}
                  >
                    DISCONNECT OPERATIONAL SESSION?
                  </h2>
                  <p className="text-sm font-mono text-[var(--sc-dim)] leading-relaxed">
                    Story progress across Sections 1 to 4 is automatically saved to local storage. Returning to the title screen will release the active first-person camera and spawn position.
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full max-w-sm mt-4">
                  <button
                    type="button"
                    autoFocus
                    onMouseEnter={() => setQuitChoice(0)}
                    onClick={() => {
                      terminalSound.playSelectBlip();
                      if (onResume) onResume();
                    }}
                    className="flex-1 py-3 px-6 sc-chamfer-8 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                    style={{
                      backgroundColor: quitChoice === 0 ? "var(--sc-accent-cyan)" : "transparent",
                      color: quitChoice === 0 ? "var(--sc-void)" : "var(--sc-text)",
                      border: "1px solid var(--sc-accent-cyan)",
                      outline: quitChoice === 0 ? "2px solid var(--sc-accent-cyan)" : "none",
                      boxShadow: quitChoice === 0 ? "0 0 15px rgba(25, 240, 255, 0.4)" : "none",
                    }}
                  >
                    {quitChoice === 0 && <span className="mr-1">▶</span>} STAY
                  </button>

                  <button
                    type="button"
                    onMouseEnter={() => setQuitChoice(1)}
                    onClick={() => {
                      terminalSound.playBackBlip();
                      if (onQuitToTitle) onQuitToTitle();
                    }}
                    className="flex-1 py-3 px-6 sc-chamfer-8 font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                    style={{
                      backgroundColor: quitChoice === 1 ? "var(--sc-warm)" : "var(--sc-void)",
                      color: quitChoice === 1 ? "var(--sc-void)" : "var(--sc-warm)",
                      border: "1px solid var(--sc-warm)",
                      outline: quitChoice === 1 ? "2px solid var(--sc-warm)" : "none",
                      boxShadow: quitChoice === 1 ? "0 0 15px rgba(255, 154, 31, 0.4)" : "none",
                    }}
                  >
                    {quitChoice === 1 && <span className="mr-1">▶</span>} QUIT TO TITLE
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* ── Compact Single-Column Layout (< 1024x600) ─────────────────── */
        <div className="relative w-full h-[calc(600px-28px-32px)] flex flex-col p-4 gap-3 select-none">
          {/* Top Row Menu Words */}
          <div
            className="flex items-center gap-3 overflow-x-auto pb-2 shrink-0"
            style={{ borderBottom: "1px solid var(--sc-line)" }}
          >
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    selectTab(item.id);
                    if (item.id === "resume" && onResume) onResume();
                  }}
                  className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? "var(--sc-accent-cyan)" : "transparent",
                    color: isSelected ? "var(--sc-void)" : "var(--sc-dim)",
                    border: isSelected ? "1px solid var(--sc-accent-cyan)" : "1px solid var(--sc-line)",
                    fontFamily: "var(--font-condensed)",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Compact View Body */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "resume" && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-6">
                <button
                  type="button"
                  onClick={onResume}
                  className="py-2.5 px-6 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                  style={{
                    backgroundColor: "var(--sc-accent-cyan)",
                    color: "var(--sc-void)",
                  }}
                >
                  RESUME MISSION
                </button>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="flex flex-col gap-3 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span>SENSITIVITY</span>
                  <span>{mouseSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={mouseSensitivity}
                  onChange={(e) => handleSensitivity(parseFloat(e.target.value))}
                  className="accent-[var(--sc-accent-cyan)]"
                />

                <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid var(--sc-line)" }}>
                  <span>MASTER VOLUME</span>
                  <span>{masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => handleMasterVol(parseInt(e.target.value, 10))}
                  className="accent-[var(--sc-accent-cyan)]"
                />
              </div>
            )}

            {activeTab === "controls" && (
              <div className="flex flex-col gap-2 text-xs font-mono">
                <div className="flex justify-between"><span>MOVE</span><span>WASD</span></div>
                <div className="flex justify-between"><span>LOOK</span><span>MOUSE</span></div>
                <div className="flex justify-between"><span>SPRINT</span><span>SHIFT</span></div>
                <div className="flex justify-between"><span>INTERACT</span><span>E</span></div>
                <div className="flex justify-between"><span>SCAN</span><span>F</span></div>
              </div>
            )}

            {activeTab === "quit" && (
              <div className="flex flex-col gap-3 text-center py-4">
                <div className="text-sm font-bold text-[var(--sc-core-white)]">DISCONNECT SESSION?</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectTab("resume")}
                    className="flex-1 py-2 sc-chamfer-8 font-bold text-xs"
                    style={{ backgroundColor: "var(--sc-accent-cyan)", color: "var(--sc-void)" }}
                  >
                    STAY
                  </button>
                  <button
                    type="button"
                    onClick={onQuitToTitle}
                    className="flex-1 py-2 sc-chamfer-8 font-bold text-xs"
                    style={{ backgroundColor: "var(--sc-void)", color: "var(--sc-warm)", border: "1px solid var(--sc-warm)" }}
                  >
                    QUIT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER HINTS (32 px, zero words after //) ─────────────────── */}
      <footer
        className="relative z-20 w-full h-[32px] px-8 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[var(--sc-dim)]"
        style={{ borderTop: "1px solid var(--sc-line)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "settings" ? (
            <>
              <span>UP / DOWN SELECT ROW</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>LEFT / RIGHT ADJUST</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>ENTER TOGGLE</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>1-4 JUMP</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>Q / ESC RESUME</span>
            </>
          ) : activeTab === "quit" ? (
            <>
              <span>LEFT / RIGHT CHOOSE</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>ENTER CONFIRM</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>Q / ESC RESUME</span>
            </>
          ) : activeTab === "resume" ? (
            <>
              <span>ENTER / E RESUME</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>UP / DOWN HIGHLIGHT</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>1-4 JUMP</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>Q / ESC RESUME</span>
            </>
          ) : (
            <>
              <span>UP / DOWN HIGHLIGHT</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>E SELECT</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>1-4 JUMP</span>
              <span style={{ color: "var(--sc-line)" }}>.....</span>
              <span>Q / ESC RESUME</span>
            </>
          )}
        </div>
        <span className="hidden sm:inline" style={{ color: "var(--sc-line)" }}>
          UNIT SCRAP-07
        </span>
      </footer>
    </div>
  );

  if (isEmbedded) {
    return (
      <div
        className="relative w-full h-full select-none overflow-hidden font-mono text-[var(--sc-text)] sc-backdrop-gradient flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="SCRAP Pause Menu"
      >
        {stageContent}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden font-mono text-[var(--sc-text)] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="SCRAP Pause Menu"
    >
      <div className="absolute inset-0 sc-backdrop-gradient pointer-events-none" />
      {stageContent}
    </div>
  );
}

export default ScrapPauseMenu;
