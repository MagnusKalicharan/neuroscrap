"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CANDIDATES_DATA } from "./candidates";
import { CANDIDATE_CONFIGS, BEACON_ID } from "./beaconConfig";
import { section3Store } from "./section3Store";
import { taskStore } from "../ui/tasks/taskStore";
import { terminalSound } from "../ui/terminal/sound";
import { shipAudio } from "../audio/shipAudio";
import { FolderColumn, type FolderSlotDef } from "../ui/terminal/FolderColumn";
import { Connector } from "../ui/terminal/Connector";
import "../ui/terminal/terminal.css";

export interface CommsTransceiverModalProps {
  open: boolean;
  onClose: () => void;
  onProceedToAntennaCore?: () => void;
  reducedMotion?: boolean;
}

const CANDIDATE_SLOTS: FolderSlotDef[] = CANDIDATE_CONFIGS.map((cfg) => ({
  id: cfg.id,
  label: cfg.label,
}));

export function CommsTransceiverModal({
  open,
  onClose,
  onProceedToAntennaCore,
  reducedMotion = false,
}: CommsTransceiverModalProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    CANDIDATE_CONFIGS[0].id
  );
  const [transmitting, setTransmitting] = useState(false);
  const [verdictStatus, setVerdictStatus] = useState<
    "idle" | "error" | "success"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Folder & File Anchors for dynamic SVG connector line
  const [folderAnchor, setFolderAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [fileAnchor, setFileAnchor] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const selectedHeaderRef = useRef<HTMLDivElement | null>(null);

  const handleFolderAnchor = useCallback((pt: { x: number; y: number }) => {
    setFolderAnchor(pt);
  }, []);

  const updateFileAnchor = useCallback(() => {
    if (!selectedHeaderRef.current || !stageRef.current) return;
    const sRect = stageRef.current.getBoundingClientRect();
    const hRect = selectedHeaderRef.current.getBoundingClientRect();
    if (sRect.width === 0 || sRect.height === 0) return;
    const scaleX = 1280 / sRect.width;
    const scaleY = 720 / sRect.height;
    const localX = (hRect.left - sRect.left) * scaleX;
    const localY = (hRect.top + hRect.height / 2 - sRect.top) * scaleY;
    setFileAnchor({ x: localX, y: localY });
  }, []);

  useEffect(() => {
    updateFileAnchor();
  }, [selectedCandidateId, updateFileAnchor]);

  // Responsive scaling to 1280x720 canvas
  useEffect(() => {
    function updateScale() {
      if (typeof window === "undefined") return;
      const targetW = 1280;
      const targetH = 720;
      const margin = 20;
      const availW = Math.max(320, window.innerWidth - margin * 2);
      const availH = Math.max(240, window.innerHeight - margin * 2);
      const s = Math.min(availW / targetW, availH / targetH, 1.25);
      setScale(Math.max(0.45, s));
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Selected config & data
  const selectedConfig = CANDIDATE_CONFIGS.find(
    (c) => c.id === selectedCandidateId
  )!;
  const selectedData = CANDIDATES_DATA.find(
    (c) => c.id === selectedCandidateId
  )!;

  // Waveform drawing
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#010803";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(46, 232, 92, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Signal waveform
    const pts = selectedData.signal;
    if (pts.length > 0) {
      const stepX = w / (pts.length - 1);
      ctx.beginPath();
      ctx.strokeStyle =
        verdictStatus === "success"
          ? "#4BFF7B"
          : verdictStatus === "error"
          ? "#ef4444"
          : "#2EE85C";
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;

      for (let i = 0; i < pts.length; i++) {
        const x = i * stepX;
        const val = pts[i];
        const y = h - val * (h - 24) - 12;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [open, selectedCandidateId, verdictStatus, selectedData]);

  const handleTransmit = useCallback(() => {
    if (transmitting) return;
    terminalSound.playKeyTick();
    setTransmitting(true);
    setVerdictStatus("idle");

    setTimeout(() => {
      setTransmitting(false);
      if (selectedCandidateId === BEACON_ID) {
        // Correct Beacon Candidate!
        terminalSound.playSuccessChime();
        setVerdictStatus("success");
        section3Store.setBeaconVerified(true);
        section3Store.setPassed(true);

        // Register task for Section 4
        taskStore.registerTask({
          id: "section4-antenna-core",
          title: "LOCK ANTENNA CORE // TRAIN NEURAL SYNAPSES",
          location: "CARGO BAY // ANTENNA MAST",
          state: "available",
          progress: 0,
          total: 1,
        });
      } else {
        // Decoy signal
        try {
          shipAudio.playConsoleBeep();
        } catch {}
        setVerdictStatus("error");
        setErrorMessage(
          selectedConfig.decoyNote ||
            "Signal does not match machine beacon properties."
        );
      }
    }, 700);
  }, [selectedCandidateId, selectedConfig, transmitting]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
        e.preventDefault();
        terminalSound.playBackBlip();
        onClose();
        return;
      }

      if (e.key === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        terminalSound.playKeyTick();
        const curr = CANDIDATE_CONFIGS.findIndex((c) => c.id === selectedCandidateId);
        const next = curr > 0 ? curr - 1 : CANDIDATE_CONFIGS.length - 1;
        setSelectedCandidateId(CANDIDATE_CONFIGS[next].id);
        setVerdictStatus("idle");
        return;
      }

      if (e.key === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        terminalSound.playKeyTick();
        const curr = CANDIDATE_CONFIGS.findIndex((c) => c.id === selectedCandidateId);
        const next = (curr + 1) % CANDIDATE_CONFIGS.length;
        setSelectedCandidateId(CANDIDATE_CONFIGS[next].id);
        setVerdictStatus("idle");
        return;
      }

      if (e.key === "Enter" || e.key === "e" || e.key === "E") {
        if (verdictStatus !== "success") {
          e.preventDefault();
          handleTransmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, selectedCandidateId, handleTransmit, verdictStatus]);

  if (!open) return null;

  const currentIdx = CANDIDATE_CONFIGS.findIndex((c) => c.id === selectedCandidateId);
  const nextConfig = CANDIDATE_CONFIGS[(currentIdx + 1) % CANDIDATE_CONFIGS.length];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none overflow-hidden font-mono"
      role="dialog"
      aria-modal="true"
      aria-label="Command Core C"
    >
      <div className="terminal-stage-wrapper pointer-events-auto">
        <div
          ref={stageRef}
          className={`terminal-stage ${!reducedMotion ? "flicker-active" : ""}`}
          style={{
            transform: `scale(${scale})`,
          }}
        >
          {/* Subtle CRT Scanlines Overlay */}
          <div className="terminal-scanlines" aria-hidden="true" />

          {/* Soft Screen Vignette */}
          <div className="terminal-vignette" aria-hidden="true" />

          {/* ── 1. Top Header Bar (Solid bright green, cutout dark title, right exit square) ── */}
          <header className="terminal-header flex items-center justify-between px-5 h-[38px] bg-[var(--term-header-green)] text-[#020a04] font-black tracking-wider select-none">
            <div className="flex items-center gap-3">
              <span className="text-[18px] tracking-[0.18em]">COMMAND CORE C</span>
            </div>

            <div className="flex items-center">
              {/* Small Solid Square Exit Dot matching Salvage and Core B */}
              <div
                className="w-4 h-4 bg-[#020a04] cursor-pointer hover:opacity-75 active:scale-90 transition-all"
                title="Exit Terminal (Press Q or Esc)"
                onClick={(e) => {
                  e.stopPropagation();
                  terminalSound.playBackBlip();
                  onClose();
                }}
                role="button"
                tabIndex={0}
                aria-label="Exit Terminal"
              />
            </div>
          </header>

          {/* ── 2. Main Workspace Body (Folders on left, Signals & Telemetry on right) ── */}
          <main className="terminal-body relative flex-1 flex p-4 gap-4 overflow-hidden min-h-0 bg-[var(--term-dark-bg)]">
            {/* Dynamic SVG Connector Line */}
            <Connector
              startX={folderAnchor.x}
              startY={folderAnchor.y}
              endX={fileAnchor.x}
              endY={fileAnchor.y}
              reducedMotion={reducedMotion}
            />

            {/* Left Column: Candidate Signal Frequencies */}
            <FolderColumn
              slots={CANDIDATE_SLOTS}
              activeId={selectedCandidateId}
              isFocused={true}
              onSelectFolder={(id) => {
                terminalSound.playSelectBlip();
                setSelectedCandidateId(id);
                setVerdictStatus("idle");
              }}
              onReportAnchor={handleFolderAnchor}
            />

            {/* Right Column: Active Context + Body Panel */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-3">
              {/* Slot 1: Active Context Banner */}
              <div
                ref={selectedHeaderRef}
                className="h-[46px] bg-[#020a04] border border-[var(--term-outline-green)] rounded px-4 flex items-center justify-between text-[var(--term-green-text-bright)] select-none shrink-0"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-[16px] tracking-wider truncate">
                    INTERCEPTED FREQUENCY // {selectedConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--term-green-text-dim)] shrink-0">
                  [{currentIdx + 1}/6] SELECTED
                </div>
              </div>

              {/* Slot 2: Cycle Frequency Bar */}
              <div
                onClick={() => {
                  terminalSound.playSelectBlip();
                  setSelectedCandidateId(nextConfig.id);
                  setVerdictStatus("idle");
                }}
                className="h-[34px] bg-[#020a04] border border-[var(--term-outline-green)]/70 hover:border-[var(--term-header-green)] rounded px-4 flex items-center justify-between text-[13px] text-[var(--term-green-text)] cursor-pointer select-none transition-colors shrink-0"
              >
                <span className="truncate">
                  CYCLE FREQUENCY: {nextConfig.label}
                </span>
                <span className="text-[12px] text-[var(--term-green-text-dim)] font-mono">
                  [TAB / CLICK]
                </span>
              </div>

              {/* Slot 3: Main Body Panel */}
              <div className="flex-1 bg-[#020a04] border border-[var(--term-outline-green)] rounded flex flex-col overflow-hidden min-h-0 relative">
                {/* 22px Solid Bright Green Strip */}
                <div
                  className="w-full h-[22px] bg-[var(--term-strip-green)] shadow-[0_0_12px_rgba(28,229,66,0.6)] shrink-0"
                  aria-hidden="true"
                />

                <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto font-mono min-h-0 gap-3">
                  {/* Oscilloscope Waveform Panel */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--term-green-text-dim)]">
                        OSCILLOSCOPE CARRIER TELEMETRY // {selectedConfig.label}
                      </span>
                      <span className="text-[10px] text-[var(--term-green-text-dim)] font-mono">
                        64 SAMPLES (0.0 .. 1.0)
                      </span>
                    </div>
                    <div className="h-32 w-full rounded border border-[var(--term-outline-green)]/70 overflow-hidden relative">
                      <canvas ref={canvasRef} className="w-full h-full block" />
                    </div>
                  </div>

                  {/* Telemetry Metric Readouts */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-[#031106] border border-[var(--term-outline-green)]/50 text-center">
                      <span className="text-[9px] uppercase text-[var(--term-green-text-dim)] block">
                        FREQUENCY
                      </span>
                      <span className="text-xs font-bold text-[#4BFF7B]">
                        {selectedConfig.label}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#031106] border border-[var(--term-outline-green)]/50 text-center">
                      <span className="text-[9px] uppercase text-[var(--term-green-text-dim)] block">
                        CHROMATIC
                      </span>
                      <span className="text-xs font-bold text-[#4BFF7B]">
                        R:{selectedData.color[0].toFixed(2)} / G:{selectedData.color[1].toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-[#031106] border border-[var(--term-outline-green)]/50 text-center">
                      <span className="text-[9px] uppercase text-[var(--term-green-text-dim)] block">
                        RECEIVER STATUS
                      </span>
                      <span className="text-xs font-bold text-[#2EE85C]">TUNED</span>
                    </div>
                  </div>

                  {/* Verdict / Outcome Display */}
                  {verdictStatus === "error" && (
                    <div className="p-3 rounded border border-red-500/70 bg-red-950/30 text-red-400 flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-2 font-black tracking-wider text-red-300">
                        <span>⚠ FREQUENCY MISMATCH: NO CARRIER RETURN</span>
                      </div>
                      <p className="text-[11px] text-red-300/90">{errorMessage}</p>
                    </div>
                  )}

                  {verdictStatus === "success" && (
                    <div className="p-4 rounded border-2 border-[#2EE85C] bg-[#04240c]/80 text-[#4BFF7B] flex flex-col gap-3 shadow-[0_0_20px_rgba(46,232,92,0.3)]">
                      <div className="flex items-center gap-2 font-black text-sm tracking-widest text-[#4BFF7B]">
                        <span className="text-base">✓</span>
                        <span>SIGNAL IDENTIFIED CORRECTLY</span>
                      </div>
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            terminalSound.playKeyTick();
                            onClose();
                            onProceedToAntennaCore?.();
                          }}
                          className="px-4 py-2 rounded bg-[#2EE85C] text-black font-black text-xs hover:bg-[#4BFF7B] transition-all shadow-[0_0_15px_rgba(46,232,92,0.4)] flex items-center gap-2 cursor-pointer"
                        >
                          <span>[ RETURN TO SHIP // HEAD TO CARGO BAY ANTENNA ]</span>
                          <span>▶</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  {verdictStatus !== "success" && (
                    <div className="pt-2 flex items-center justify-between border-t border-[var(--term-outline-green)]/40 mt-auto">
                      <span className="text-[11px] text-[var(--term-green-text-dim)]">
                        TARGET: {selectedConfig.label}
                      </span>
                      <button
                        type="button"
                        disabled={transmitting}
                        onClick={handleTransmit}
                        className="px-5 py-2.5 rounded bg-[#072c10] border border-[#2EE85C] hover:bg-[#0c471a] text-[#4BFF7B] font-black text-xs tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(46,232,92,0.2)] cursor-pointer"
                      >
                        {transmitting ? (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#4BFF7B] border-t-transparent animate-spin" />
                            <span>BROADCASTING RETURN PING...</span>
                          </>
                        ) : (
                          <>
                            <span>📡</span>
                            <span>BROADCAST RETURN PING [E]</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* ── 3. Bottom Footer Bar (Unified keybindings & dot leaders) ── */}
          <footer className="terminal-footer h-[32px] bg-[#020a04] border-t border-[var(--term-outline-green)] flex items-center justify-between px-4 text-[12px] text-[var(--term-green-text)] select-none">
            <div className="flex items-center gap-2">
              <span className="text-[var(--term-green-text-bright)]">▲▼</span>
              <span>UP / DOWN SELECT SIGNAL</span>
              <span className="text-[var(--term-outline-green)]/50">.....</span>
              <span className="text-[var(--term-green-text-bright)]">E</span>
              <span>BROADCAST PING</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[var(--term-green-text-bright)]">Q</span>
              <span>BACK / EXIT</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
