"use client";

/**
 * Section 3: CORE-A Archive Terminal
 * ====================================
 * Dedicated terminal shell for viewing the historical telemetry archive:
 * - KNOWN SCANS (10 scans from Section 1 with curves & thumbnails & class stack)
 * - UNKNOWN SIGNALS (6 candidate signals from antenna)
 *
 * Visual design matches the SALVAGE TERMINAL & BENCH TERMINAL:
 * - Green phosphor CRT aesthetic calibrated to 1280x720 canvas.
 * - Header: "SERVER TOWER // ARCHIVE" with exit [Q].
 * - 4 Folder slots: KNOWN SCANS, UNKNOWN SIGNALS, empty slot 3, empty slot 4.
 * - Angle connector line to active body.
 * - Reduced motion support & full keyboard/mouse navigation.
 * - Zero banned words.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "../ui/terminal/terminal.css";
import { FolderColumn, type FolderSlotDef } from "../ui/terminal/FolderColumn.tsx";
import { Connector } from "../ui/terminal/Connector.tsx";
import { terminalSound } from "../ui/terminal/sound.ts";
import { section3Store, useSection3Store } from "./section3Store.ts";
import { recordsFromScans } from "./signals.ts";
import { createCandidates } from "./candidates.ts";
import type { SectionThreeRecord } from "./types.ts";

export interface ArchiveTerminalProps {
  open: boolean;
  onClose: () => void;
  records?: SectionThreeRecord[];
  reducedMotion?: boolean;
}

type ArchiveFolder = "known" | "unknown";

const ARCHIVE_FOLDER_SLOTS: FolderSlotDef[] = [
  { id: "known", label: "KNOWN SCANS" },
  { id: "unknown", label: "UNKNOWN SIGNALS" },
  { id: "empty_3", label: null },
  { id: "empty_4", label: null },
];

export function ArchiveTerminal({
  open,
  onClose,
  records: propRecords,
  reducedMotion = false,
}: ArchiveTerminalProps) {
  const store = useSection3Store();

  // Scale factor calculation for uniform 1280x720 scaling
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);

  // Active folder & selection
  const [activeFolderId, setActiveFolderId] = useState<ArchiveFolder>("known");
  const [selectedKnownIdx, setSelectedKnownIdx] = useState(0);
  const [selectedUnknownIdx, setSelectedUnknownIdx] = useState(0);
  const [activePane, setActivePane] = useState<"folders" | "list" | "detail">("list");
  const [booting, setBooting] = useState(true);

  // Fallback records if none passed
  const records = useMemo<SectionThreeRecord[]>(() => {
    if (propRecords && propRecords.length > 0) return propRecords;
    const fallbackScans: Array<{ id: string; category: "black_hole" | "planet" | "stars" }> = [
      { id: "bh_1", category: "black_hole" },
      { id: "bh_2", category: "black_hole" },
      { id: "pl_1", category: "planet" },
      { id: "pl_2", category: "planet" },
      { id: "pl_3", category: "planet" },
      { id: "st_1", category: "stars" },
      { id: "st_2", category: "stars" },
      { id: "st_3", category: "stars" },
      { id: "st_4", category: "stars" },
      { id: "st_5", category: "stars" },
    ];
    return recordsFromScans(fallbackScans);
  }, [propRecords]);

  // Candidates (6 unknown signals)
  const candidates = useMemo(() => createCandidates(), []);

  // Measured connector anchors
  const [folderAnchor, setFolderAnchor] = useState<{ x: number; y: number } | null>(null);
  const [bodyAnchor, setBodyAnchor] = useState<{ x: number; y: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Responsive scale to fit 1280x720 canvas
  useEffect(() => {
    function updateScale() {
      if (!stageWrapperRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / 1280, vh / 720, 1);
      setScale(Math.max(0.5, s));
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Boot sequence
  useEffect(() => {
    if (open) {
      setBooting(true);
      terminalSound.playPowerOnHum();
      const t = setTimeout(() => setBooting(false), reducedMotion ? 50 : 250);
      return () => clearTimeout(t);
    }
  }, [open, reducedMotion]);

  // Mark scan viewed when looking at it in KNOWN SCANS
  useEffect(() => {
    if (!open || activeFolderId !== "known") return;
    const activeRec = records[selectedKnownIdx];
    if (activeRec) {
      section3Store.markExampleViewed(activeRec.scanId);
    }
  }, [open, activeFolderId, selectedKnownIdx, records]);

  // Set unknownOpened when UNKNOWN SIGNALS folder is selected
  useEffect(() => {
    if (!open) return;
    if (activeFolderId === "unknown") {
      section3Store.setUnknownOpened(true);
    }
  }, [open, activeFolderId]);

  // Measure body left anchor
  useEffect(() => {
    if (bodyRef.current) {
      const rect = bodyRef.current.getBoundingClientRect();
      const stage = bodyRef.current.closest(".terminal-stage");
      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        const sc = stageRect.width / 1280;
        const x = (rect.left - stageRect.left) / sc;
        const y = (rect.top + 38 - stageRect.top) / sc;
        setBodyAnchor({ x: Math.round(x), y: Math.round(y) });
      }
    }
  }, [activeFolderId, open, scale]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.code === "KeyQ") {
        e.preventDefault();
        terminalSound.playBackBlip();
        onClose();
        return;
      }

      // Tab switching between folders / lists
      if (e.key === "Tab") {
        e.preventDefault();
        terminalSound.playKeyTick();
        setActiveFolderId((prev) => (prev === "known" ? "unknown" : "known"));
        return;
      }

      // Up / Down navigation
      if (e.key === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        terminalSound.playKeyTick();
        if (activeFolderId === "known") {
          setSelectedKnownIdx((i) => (i > 0 ? i - 1 : records.length - 1));
        } else {
          setSelectedUnknownIdx((i) => (i > 0 ? i - 1 : candidates.length - 1));
        }
      } else if (e.key === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        terminalSound.playKeyTick();
        if (activeFolderId === "known") {
          setSelectedKnownIdx((i) => (i < records.length - 1 ? i + 1 : 0));
        } else {
          setSelectedUnknownIdx((i) => (i < candidates.length - 1 ? i + 1 : 0));
        }
      } else if (e.key === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        if (activeFolderId === "unknown") {
          terminalSound.playSelectBlip();
          setActiveFolderId("known");
        }
      } else if (e.key === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        if (activeFolderId === "known") {
          terminalSound.playSelectBlip();
          setActiveFolderId("unknown");
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeFolderId, records.length, candidates.length, onClose]);

  if (!open) return null;

  const currentKnown = records[selectedKnownIdx] || records[0];
  const currentCandidate = candidates[selectedUnknownIdx] || candidates[0];

  // Group records by class for secondary stacked pane
  const classGroups = {
    black_hole: records.filter((r) => r.category === "black_hole"),
    planet: records.filter((r) => r.category === "planet"),
    stars: records.filter((r) => r.category === "stars"),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ARCHIVE TERMINAL"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#010703]/90 select-none overflow-hidden"
    >
      <div
        ref={stageWrapperRef}
        className="w-full h-full flex items-center justify-center p-0 m-0"
      >
        <div
          ref={stageRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
          className="terminal-stage relative w-[1280px] h-[720px] bg-[#020d04] border-2 border-[var(--term-outline-green)] shadow-[0_0_50px_rgba(30,170,70,0.35)] flex flex-col overflow-hidden text-[var(--term-green-text)] font-mono"
        >
          {/* CRT scanline shimmers */}
          <div className="pointer-events-none absolute inset-0 term-scanlines z-30 opacity-60" />
          <div className="pointer-events-none absolute inset-0 term-vignette z-30" />

          {/* ── Top Header Bar ─────────────────────────────────────────── */}
          <div className="relative z-20 h-[52px] bg-[#010803] border-b border-[var(--term-outline-green)] px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 bg-[var(--term-green-text-bright)] shadow-[0_0_8px_var(--term-green-text-bright)] animate-pulse" />
              <span className="text-[18px] font-black tracking-[0.2em] text-[var(--term-green-text-bright)] term-glow">
                SERVER TOWER // ARCHIVE
              </span>
              <span className="text-[12px] tracking-widest text-[var(--term-green-text-dim)] border border-[var(--term-outline-green)]/40 px-2 py-0.5 rounded">
                CORE-A TELEMETRY VAULT
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[12px] text-[var(--term-green-text-dim)]">
                VIEWED: {store.examplesViewed.length}/10 KNOWN SCANS
              </span>
              <button
                type="button"
                onClick={() => {
                  terminalSound.playBackBlip();
                  onClose();
                }}
                className="px-3 py-1 bg-transparent border border-[var(--term-outline-green)] hover:border-[var(--term-green-text-bright)] hover:text-[var(--term-green-text-bright)] hover:bg-[rgba(28,168,72,0.12)] text-[13px] font-bold tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>EXIT</span>
                <span className="text-[10px] text-[var(--term-green-text-dim)]">[Q]</span>
              </button>
            </div>
          </div>

          {/* ── Main Stage Area: Folders Sidebar + Body ────────────────── */}
          <div className="relative z-10 flex-1 flex p-6 gap-6 overflow-hidden">
            {/* Left Folders Column */}
            <FolderColumn
              slots={ARCHIVE_FOLDER_SLOTS}
              activeId={activeFolderId}
              isFocused={activePane === "folders"}
              onSelectFolder={(id) => {
                if (id === "known" || id === "unknown") {
                  setActiveFolderId(id);
                }
              }}
              onReportAnchor={setFolderAnchor}
            />

            {/* Angular Connector Line */}
            {folderAnchor && bodyAnchor && (
              <Connector
                startX={folderAnchor.x}
                startY={folderAnchor.y}
                endX={bodyAnchor.x}
                endY={bodyAnchor.y}
                reducedMotion={reducedMotion}
              />
            )}

            {/* Right Body Container */}
            <div
              ref={bodyRef}
              className="flex-1 flex flex-col bg-[#010904] border border-[var(--term-outline-green)] relative overflow-hidden"
            >
              {/* Top Bright Green Phosphor Strip */}
              <div className="h-[38px] bg-[#031c0a] border-b border-[var(--term-outline-green)] px-5 flex items-center justify-between text-[13px] font-bold tracking-[0.16em] text-[var(--term-green-text-bright)]">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-[var(--term-green-text-bright)] shadow-[0_0_6px_var(--term-green-text-bright)]" />
                  <span>
                    {activeFolderId === "known"
                      ? "FOLDER: KNOWN SCANS (SECTION 1 ARCHIVE)"
                      : "FOLDER: UNKNOWN SIGNALS (ANTENNA BUFFER)"}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--term-green-text-dim)] font-normal tracking-wider">
                  {activeFolderId === "known"
                    ? `${selectedKnownIdx + 1} OF ${records.length} ENTRIES`
                    : `${selectedUnknownIdx + 1} OF ${candidates.length} CANDIDATES`}
                </div>
              </div>

              {/* Main Body Content Pane */}
              <div className="flex-1 flex p-5 gap-5 overflow-hidden">
                {activeFolderId === "known" ? (
                  /* ── KNOWN SCANS PANE ──────────────────────────────────── */
                  <div className="flex-1 flex gap-5 overflow-hidden">
                    {/* Left List of 10 Scans */}
                    <div className="w-[240px] flex flex-col bg-[#020b05] border border-[var(--term-outline-green)]/70 overflow-hidden">
                      <div className="p-2 border-b border-[var(--term-outline-green)]/40 text-[11px] font-bold text-[var(--term-green-text-dim)] tracking-wider">
                        ARCHIVED RECORDS [↑ / ↓]
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y divide-[var(--term-outline-green)]/20">
                        {records.map((rec, idx) => {
                          const isSel = idx === selectedKnownIdx;
                          const isViewed = store.examplesViewed.includes(rec.scanId);
                          return (
                            <button
                              key={rec.scanId}
                              type="button"
                              onClick={() => {
                                terminalSound.playKeyTick();
                                setSelectedKnownIdx(idx);
                              }}
                              className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-[12px] font-bold transition-all cursor-pointer ${
                                isSel
                                  ? "bg-[#04240e] text-[var(--term-green-text-bright)] border-l-4 border-[var(--term-green-text-bright)] pl-2"
                                  : "text-[var(--term-green-text)] hover:bg-[#031509] hover:text-[var(--term-green-text-bright)]"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-[10px] text-[var(--term-green-text-dim)]">
                                  #{idx + 1}
                                </span>
                                <span className="truncate">{rec.targetName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isViewed && (
                                  <span className="text-[9px] text-[#22c55e] border border-[#22c55e]/40 px-1 rounded">
                                    LOGGED
                                  </span>
                                )}
                                <span className="text-[12px]">
                                  {rec.category === "black_hole"
                                    ? "●"
                                    : rec.category === "planet"
                                    ? "■"
                                    : "▲"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Middle Detail Pane: 64-point curve + Section 1 thumbnail */}
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                      <div className="flex-1 flex flex-col bg-[#020b05] border border-[var(--term-outline-green)] p-4 overflow-hidden">
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--term-outline-green)]/40 text-[12px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--term-green-text-bright)] text-[14px]">
                              {currentKnown.targetName}
                            </span>
                            <span className="text-[10px] text-[var(--term-green-text-dim)]">
                              [{currentKnown.filename}]
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[var(--term-green-text)]">
                              {currentKnown.category === "black_hole"
                                ? "BLACK HOLE (●)"
                                : currentKnown.category === "planet"
                                ? "PLANET (■)"
                                : "STARS (▲)"}
                            </span>
                          </div>
                        </div>

                        {/* Top: Section 1 procedural visual thumbnail */}
                        <div className="h-[120px] w-full flex items-center justify-center bg-[#010603] border border-[var(--term-outline-green)]/50 rounded mb-3 overflow-hidden relative">
                          {renderArchiveThumbnail(currentKnown, reducedMotion)}
                        </div>

                        {/* Bottom: 64-sample Light Curve */}
                        <div className="flex-1 flex flex-col min-h-0">
                          <div className="flex items-center justify-between text-[10px] text-[var(--term-green-text-dim)] mb-1">
                            <span>PHOTOMETRIC LIGHT CURVE // 64 SAMPLE POINTS</span>
                            <span>TIME (0 .. 64)</span>
                          </div>
                          <div className="flex-1 w-full bg-[#010502] border border-[var(--term-outline-green)]/60 rounded p-2 flex items-center justify-center">
                            <CurveSvg signal={currentKnown.signal} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Secondary Pane: All 10 Curves Stacked by Class */}
                    <div className="w-[280px] flex flex-col bg-[#020b05] border border-[var(--term-outline-green)]/80 p-3 overflow-hidden">
                      <div className="text-[11px] font-bold text-[var(--term-green-text-bright)] pb-2 mb-2 border-b border-[var(--term-outline-green)]/40">
                        CLASS REFERENCE STACK
                      </div>
                      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
                        {/* Black Holes */}
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] font-bold text-[var(--term-green-text-dim)] flex items-center gap-1.5">
                            <span>●</span>
                            <span>BLACK HOLES ({classGroups.black_hole.length})</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {classGroups.black_hole.map((bh) => (
                              <div
                                key={bh.scanId}
                                className={`h-[36px] bg-[#010603] border rounded p-1 flex items-center gap-2 ${
                                  bh.scanId === currentKnown.scanId
                                    ? "border-[var(--term-green-text-bright)] bg-[#031809]"
                                    : "border-[var(--term-outline-green)]/40"
                                }`}
                              >
                                <span className="text-[9px] w-[50px] truncate text-[var(--term-green-text-dim)]">
                                  {bh.targetName}
                                </span>
                                <div className="flex-1 h-full">
                                  <MiniCurveSvg signal={bh.signal} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Planets */}
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] font-bold text-[var(--term-green-text-dim)] flex items-center gap-1.5">
                            <span>■</span>
                            <span>PLANETS ({classGroups.planet.length})</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {classGroups.planet.map((pl) => (
                              <div
                                key={pl.scanId}
                                className={`h-[36px] bg-[#010603] border rounded p-1 flex items-center gap-2 ${
                                  pl.scanId === currentKnown.scanId
                                    ? "border-[var(--term-green-text-bright)] bg-[#031809]"
                                    : "border-[var(--term-outline-green)]/40"
                                }`}
                              >
                                <span className="text-[9px] w-[50px] truncate text-[var(--term-green-text-dim)]">
                                  {pl.targetName}
                                </span>
                                <div className="flex-1 h-full">
                                  <MiniCurveSvg signal={pl.signal} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] font-bold text-[var(--term-green-text-dim)] flex items-center gap-1.5">
                            <span>▲</span>
                            <span>STARS ({classGroups.stars.length})</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {classGroups.stars.map((st) => (
                              <div
                                key={st.scanId}
                                className={`h-[36px] bg-[#010603] border rounded p-1 flex items-center gap-2 ${
                                  st.scanId === currentKnown.scanId
                                    ? "border-[var(--term-green-text-bright)] bg-[#031809]"
                                    : "border-[var(--term-outline-green)]/40"
                                }`}
                              >
                                <span className="text-[9px] w-[50px] truncate text-[var(--term-green-text-dim)]">
                                  {st.targetName}
                                </span>
                                <div className="flex-1 h-full">
                                  <MiniCurveSvg signal={st.signal} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── UNKNOWN SIGNALS PANE ────────────────────────────────── */
                  <div className="flex-1 flex gap-5 overflow-hidden">
                    {/* Left List of 6 Candidate Signals */}
                    <div className="w-[260px] flex flex-col bg-[#020b05] border border-[var(--term-outline-green)]/70 overflow-hidden">
                      <div className="p-2 border-b border-[var(--term-outline-green)]/40 text-[11px] font-bold text-[var(--term-green-text-dim)] tracking-wider">
                        ANTENNA BUFFER SIGNALS [↑ / ↓]
                      </div>
                      <div className="flex-1 overflow-y-auto divide-y divide-[var(--term-outline-green)]/20">
                        {candidates.map((cand, idx) => {
                          const isSel = idx === selectedUnknownIdx;
                          return (
                            <button
                              key={cand.id}
                              type="button"
                              onClick={() => {
                                terminalSound.playKeyTick();
                                setSelectedUnknownIdx(idx);
                              }}
                              className={`w-full text-left px-3 py-3 flex items-center justify-between text-[13px] font-bold transition-all cursor-pointer ${
                                isSel
                                  ? "bg-[#04240e] text-[var(--term-green-text-bright)] border-l-4 border-[var(--term-green-text-bright)] pl-2"
                                  : "text-[var(--term-green-text)] hover:bg-[#031509] hover:text-[var(--term-green-text-bright)]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full border-2 border-[var(--term-green-text)] flex items-center justify-center text-[10px] font-bold">
                                  {idx + 1}
                                </div>
                                <span>SIGNAL {idx + 1}</span>
                              </div>
                              <span className="text-[12px] text-[var(--term-green-text-dim)] font-mono">
                                ?
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Curve View of Selected Unknown Signal */}
                    <div className="flex-1 flex flex-col bg-[#020b05] border border-[var(--term-outline-green)] p-5 overflow-hidden">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--term-outline-green)]/40">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full border-2 border-[var(--term-green-text-bright)] flex items-center justify-center text-[12px] font-black text-[var(--term-green-text-bright)] shadow-[0_0_8px_rgba(46,232,92,0.4)]">
                            {selectedUnknownIdx + 1}
                          </div>
                          <span className="font-bold text-[var(--term-green-text-bright)] text-[16px] tracking-wider">
                            UNKNOWN SIGNAL {selectedUnknownIdx + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--term-green-text-dim)] border border-[var(--term-outline-green)]/50 px-2 py-0.5 rounded">
                            UNCLASSIFIED TRANSMISSION
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between text-[11px] text-[var(--term-green-text-dim)] mb-2">
                          <span>RAW PHOTOMETRIC TRACE // 64 SAMPLES</span>
                          <span>UNKNOWN SOURCE</span>
                        </div>
                        <div className="flex-1 w-full bg-[#010502] border border-[var(--term-outline-green)]/70 rounded p-4 flex items-center justify-center">
                          <CurveSvg signal={currentCandidate.signal} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer Key Hints Bar ───────────────────────────────── */}
              <div className="h-[36px] bg-[#010803] border-t border-[var(--term-outline-green)] px-6 flex items-center justify-between text-[11px] text-[var(--term-green-text-dim)]">
                <div className="flex items-center gap-6">
                  <span>
                    <strong className="text-[var(--term-green-text)]">[↑ / ↓]</strong> SELECT ENTRY
                  </span>
                  <span>
                    <strong className="text-[var(--term-green-text)]">[TAB]</strong> SWITCH FOLDER
                  </span>
                  <span>
                    <strong className="text-[var(--term-green-text)]">[Q / ESC]</strong> CLOSE
                  </span>
                </div>
                <div>SERVER ARCHIVE TOWER // CORE-A</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SVG Curve Rendering ───────────────────────────────────────────────────────
function CurveSvg({ signal }: { signal: number[] }) {
  if (!signal || signal.length === 0) return null;
  const w = 600;
  const h = 260;
  const pad = 20;

  const points = signal.map((v, i) => {
    const x = Number((pad + (i / (signal.length - 1)) * (w - 2 * pad)).toFixed(1));
    const y = Number((h - pad - Math.max(0, Math.min(1, v)) * (h - 2 * pad)).toFixed(1));
    return { x, y };
  });
  const pathData = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      {/* Light grid */}
      <line x1={pad} y1={pad} x2={w - pad} y2={pad} stroke="rgba(28,168,72,0.15)" strokeDasharray="3 3" />
      <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(28,168,72,0.2)" strokeDasharray="3 3" />
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(28,168,72,0.25)" />

      {/* Signal trace */}
      <path
        d={pathData}
        fill="none"
        stroke="var(--term-green-text-bright)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="filter drop-shadow-[0_0_6px_rgba(46,232,92,0.6)]"
      />

      {/* Points */}
      {points.map((pt, i) => (
        <circle
          key={i}
          cx={pt.x}
          cy={pt.y}
          r="1.8"
          fill="var(--term-green-text-bright)"
          opacity={0.8}
        />
      ))}
    </svg>
  );
}

function MiniCurveSvg({ signal }: { signal: number[] }) {
  if (!signal || signal.length === 0) return null;
  const w = 180;
  const h = 28;
  const pad = 3;

  const points = signal.map((v, i) => {
    const x = (pad + (i / (signal.length - 1)) * (w - 2 * pad)).toFixed(1);
    const y = (h - pad - Math.max(0, Math.min(1, v)) * (h - 2 * pad)).toFixed(1);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <path
        d={`M ${points.join(" L ")}`}
        fill="none"
        stroke="var(--term-green-text)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ── Celestial Thumbnail Renderer ──────────────────────────────────────────────
function renderArchiveThumbnail(
  record: SectionThreeRecord,
  reducedMotion = false
) {
  if (record.thumbnail) {
    return (
      <img
        src={record.thumbnail}
        alt={record.targetName}
        className="w-full h-full object-cover"
      />
    );
  }

  const pulse = reducedMotion ? "" : "animate-pulse";

  switch (record.category) {
    case "black_hole":
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#010703] overflow-hidden">
          <div className={`absolute w-24 h-24 rounded-full border border-amber-500/30 ${pulse}`} />
          <div className="absolute w-18 h-18 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-300 blur-[2px] opacity-80" />
          <div className="absolute w-12 h-12 rounded-full bg-black shadow-[inset_0_0_8px_rgba(0,0,0,1)]" />
        </div>
      );
    case "planet":
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#010603] overflow-hidden">
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-teal-700 to-slate-900 border border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.4),transparent_60%)]" />
          </div>
        </div>
      );
    case "stars":
    default:
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#010603] overflow-hidden">
          <div className={`relative w-8 h-8 rounded-full bg-yellow-100 shadow-[0_0_16px_rgba(250,204,21,0.8)] ${pulse}`} />
          <div className="absolute w-3 h-3 rounded-full bg-white blur-[1px]" />
        </div>
      );
  }
}

export default ArchiveTerminal;
