"use client";

import React, { useEffect, useState, useRef } from "react";
import "./terminal.css";
import { terminalSound } from "./sound";

export interface TerminalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  subtitle?: string;
  exitLabel?: string;
  theme?: "green" | "cyan";
  hasCompactMode?: boolean;
  children: React.ReactNode;
  footerHints?: React.ReactNode;
  reducedMotion?: boolean;
}

export function TerminalShell({
  open,
  onClose,
  title,
  badge,
  subtitle,
  exitLabel,
  theme = "green",
  hasCompactMode = false,
  children,
  footerHints,
  reducedMotion = false,
}: TerminalShellProps) {
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  // Uniform responsive scaling: fits 1280x720 within current viewport
  useEffect(() => {
    function updateScale() {
      if (typeof window === "undefined") return;
      const margin = 24;
      const availW = window.innerWidth - margin;
      const availH = window.innerHeight - margin;
      const scaleX = availW / 1280;
      const scaleY = availH / 720;
      const s = Math.min(scaleX, scaleY);
      setScale(Math.max(0.65, Math.min(1.4, s)));
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Global ESC and Q key listener for terminal close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || (e.key === "q" && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        // Only if not actively typing inside an input
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        terminalSound.playSelectBlip();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const themeClass = theme === "cyan" ? "terminal-theme-cyan" : "";

  return (
    <div
      className={`terminal-stage-wrapper ${hasCompactMode ? "has-compact-mode" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Small viewport fallback warning (only for shells without responsive compact layout) */}
      {!hasCompactMode && (
        <div className="terminal-enlarge-warning font-mono">
          <div>TERMINAL RESOLUTION TOO LOW. PLEASE EXPAND WINDOW OR ROTATE DISPLAY.</div>
        </div>
      )}

      <div
        ref={stageRef}
        className={`terminal-stage ${themeClass} ${reducedMotion ? "" : "terminal-booting flicker-active"}`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {/* CRT Vignette Overlay */}
        <div className="terminal-vignette pointer-events-none" aria-hidden="true" />

        {/* ── Top Header Bar (34px bolted metal bezel) ────────────────── */}
        <header className="relative z-30 w-full h-[34px] px-4 bg-[#031106] border-b border-[var(--term-outline-green)] flex items-center justify-between text-[13px] font-mono select-none">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-header-green)] shadow-[0_0_8px_#2ee85c]" />
            <span className="font-bold text-[var(--term-green-text-bright)] tracking-wider uppercase term-glow">
              {title}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded border border-[#ffb700]/70 bg-[#1e1302] text-[#ffb700] text-[10px] font-bold tracking-widest uppercase">
                {badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[var(--term-green-text-dim)] font-mono hidden sm:inline">
              {subtitle || "SEC-4 // SYS-ANTENNA"}
            </span>
            <button
              type="button"
              onClick={() => {
                terminalSound.playSelectBlip();
                onClose();
              }}
              className="px-2.5 py-0.5 rounded border border-[var(--term-outline-green)] bg-[#041408] text-[var(--term-green-text-bright)] hover:bg-[#07240f] hover:border-[#4bff7b] transition-all font-bold text-xs cursor-pointer"
            >
              {exitLabel || "[Q] EXIT"}
            </button>
          </div>
        </header>

        {/* ── Solid Bright Phosphor Strip (22px) ───────────────────────── */}
        <div
          className="relative z-20 w-full h-[22px] bg-[var(--term-strip-green)] shadow-[0_0_12px_rgba(28,229,66,0.6)] shrink-0"
          aria-hidden="true"
        />

        {/* ── Main Body Panel ─────────────────────────────────────────── */}
        <main className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden bg-[#04060B]">
          {children}
        </main>

        {/* ── Footer Bar ───────────────────────────────────────────────── */}
        <footer className="relative z-30 w-full h-[32px] px-6 bg-[#031106] border-t border-[var(--term-outline-green)] flex items-center justify-between text-[12px] text-[var(--term-green-text)] font-mono uppercase font-bold term-glow select-none shrink-0">
          {footerHints || (
            <div className="w-full flex items-center justify-center gap-3">
              <span>SPACE PLAY/PAUSE</span>
              <span className="text-[var(--term-green-text-dim)]">.....</span>
              <span>S STEP</span>
              <span className="text-[var(--term-green-text-dim)]">.....</span>
              <span>R RESET</span>
              <span className="text-[var(--term-green-text-dim)]">.....</span>
              <span>T TEST DATA</span>
              <span className="text-[var(--term-green-text-dim)]">.....</span>
              <span>D DISCRETIZE</span>
              <span className="text-[var(--term-green-text-dim)]">.....</span>
              <span>Q BACK</span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
