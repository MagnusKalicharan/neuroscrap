"use client";

import React, { useState, useEffect, useRef } from "react";
import { terminalSound } from "../../ui/terminal/sound";
import { section4Store, type PreviewRow } from "../section4Store";

export interface DataPortsScreenProps {
  inputMounted: boolean;
  outputMounted: boolean;
  inputFileName: string | null;
  outputFileName: string | null;
  previewRows: PreviewRow[];
  onProceedToLab: () => void;
  reducedMotion?: boolean;
}

interface PendriveFile {
  name: string;
  size: string;
  desc: string;
  type: "input_valid" | "output_valid" | "distractor";
  columns: number;
  rows: number;
}

const PENDRIVE_FILES: PendriveFile[] = [
  {
    name: "INPUT.DAT",
    size: "3.2 KB",
    desc: "CANONICAL SENSOR CAPTURE (200 ROWS x 2 PROPERTIES: BRIGHTNESS, STEADY BEAT)",
    type: "input_valid",
    columns: 2,
    rows: 200,
  },
  {
    name: "OUTPUT.DAT",
    size: "1.6 KB",
    desc: "CANONICAL LABELS (200 ROWS: NATURAL OR MACHINE)",
    type: "output_valid",
    columns: 1,
    rows: 200,
  },
  {
    name: "SKY_SCANS.DAT",
    size: "0.4 KB",
    desc: "SECTION 1 RAW SCANS (10 ROWS x 3 COLUMNS: VECTOR FORMAT)",
    type: "distractor",
    columns: 3,
    rows: 10,
  },
];

export function DataPortsScreen({
  inputMounted,
  outputMounted,
  inputFileName,
  outputFileName,
  previewRows,
  onProceedToLab,
  reducedMotion = false,
}: DataPortsScreenProps) {
  const [selectedPort, setSelectedPort] = useState<"input" | "output">("input");
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  // Transfer animation state
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0); // 0 to 100
  const [transferRow, setTransferRow] = useState(1);
  const [transferTargetPort, setTransferTargetPort] = useState<"input" | "output">("input");

  // Error banner
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const transferTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (transferTimerRef.current) clearInterval(transferTimerRef.current);
    };
  }, []);

  const handleMountFile = (file: PendriveFile, port: "input" | "output") => {
    if (isTransferring) return;
    setErrorBanner(null);

    // Validation checks
    if (port === "input") {
      if (file.name === "SKY_SCANS.DAT") {
        terminalSound.playErrorBuzz();
        setErrorBanner("FORMAT MISMATCH: expected 2 columns, found 3");
        return;
      }
      if (file.name === "OUTPUT.DAT") {
        terminalSound.playErrorBuzz();
        setErrorBanner("FORMAT MISMATCH: expected 2 numerical columns, found labels");
        return;
      }
    } else {
      // output port
      if (file.name === "SKY_SCANS.DAT") {
        terminalSound.playErrorBuzz();
        setErrorBanner("FORMAT MISMATCH: expected labels, found vectors");
        return;
      }
      if (file.name === "INPUT.DAT") {
        terminalSound.playErrorBuzz();
        setErrorBanner("FORMAT MISMATCH: expected 1 column labels, found 2 columns");
        return;
      }
    }

    // Start 1.2s transfer progress bar
    setIsTransferring(true);
    setTransferTargetPort(port);
    setTransferProgress(0);
    setTransferRow(1);
    terminalSound.playSelectBlip();

    const startTime = performance.now();
    const duration = 1200; // 1.2 seconds

    transferTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      const row = Math.min(200, Math.max(1, Math.round((progress / 100) * 200)));

      setTransferProgress(progress);
      setTransferRow(row);

      if (progress >= 100) {
        if (transferTimerRef.current) clearInterval(transferTimerRef.current);
        setIsTransferring(false);
        terminalSound.playSuccessChime();

        if (port === "input") {
          section4Store.mountInputPort(file.name);
        } else {
          section4Store.mountOutputPort(file.name);
        }
      }
    }, 40);
  };

  // Keyboard navigation: Arrows, E to insert, Enter to proceed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransferring) return;

      switch (e.code) {
        case "ArrowUp":
          e.preventDefault();
          terminalSound.playKeyTick();
          setSelectedFileIdx((i) => (i <= 0 ? PENDRIVE_FILES.length - 1 : i - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          terminalSound.playKeyTick();
          setSelectedFileIdx((i) => (i >= PENDRIVE_FILES.length - 1 ? 0 : i + 1));
          break;
        case "ArrowLeft":
        case "KeyA":
          e.preventDefault();
          terminalSound.playKeyTick();
          setSelectedPort("input");
          break;
        case "ArrowRight":
        case "KeyD":
          e.preventDefault();
          terminalSound.playKeyTick();
          setSelectedPort("output");
          break;
        case "KeyE":
          e.preventDefault();
          handleMountFile(PENDRIVE_FILES[selectedFileIdx], selectedPort);
          break;
        case "Enter":
          if (inputMounted && outputMounted) {
            e.preventDefault();
            terminalSound.playSelectBlip();
            onProceedToLab();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFileIdx, selectedPort, isTransferring, inputMounted, outputMounted, onProceedToLab]);

  const bothMounted = inputMounted && outputMounted;

  return (
    <div className="flex-1 w-full h-full flex flex-col min-h-0 bg-[#04060B] font-mono select-none p-4 justify-between">
      {/* ── Top Header & Subtitle ───────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--term-outline-green)]/60">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2EE85C] shadow-[0_0_8px_#2ee85c]" />
            <span className="font-black text-sm text-[var(--term-green-text-bright)] tracking-wider">
              ANTENNA DATA PORTS // FILE SYSTEM
            </span>
          </div>
          <span className="text-[11px] text-[var(--term-green-text-dim)] pl-4">
            MOUNT TRAINING DATA VECTORS INTO HARDWARE BUSES BEFORE COMMENCING SYNAPSE TRAINING
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`px-2.5 py-1 rounded border text-[11px] font-bold tracking-wider ${
              bothMounted
                ? "border-[#2EE85C] bg-[#041c09] text-[#4BFF7B] shadow-[0_0_10px_rgba(46,232,92,0.4)]"
                : "border-[#ffb700]/70 bg-[#1e1302] text-[#ffb700]"
            }`}
          >
            {bothMounted ? "✓ PORTS SYNCHRONIZED" : "AWAITING MOUNT"}
          </div>
        </div>
      </div>

      {/* ── Error Banner (Format Mismatch) ─────────────────────────── */}
      {errorBanner && (
        <div className="my-2 p-2.5 rounded border border-[#ff4444] bg-[#2a0606] text-[#ff7777] flex items-center justify-between shadow-xl animate-bounce">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-sm">⚠</span>
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-[10px] uppercase underline hover:text-white"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* ── Main Ports & Pendrive Area ─────────────────────────────── */}
      <div className="flex-1 w-full flex gap-4 min-h-0 my-3">
        {/* Left: Input & Output Hardware Ports */}
        <div className="flex-1 flex flex-col gap-4 justify-between">
          {/* Top Port: INPUT PORT */}
          <div
            data-port-id="input"
            onClick={() => setSelectedPort("input")}
            className={`flex-1 p-3.5 rounded border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
              selectedPort === "input"
                ? "border-[#2EE85C] bg-[#031407] shadow-[0_0_15px_rgba(46,232,92,0.2)]"
                : "border-[var(--term-outline-green)]/60 bg-[#020a04] hover:border-[var(--term-outline-green)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[#07250e] border border-[var(--term-outline-green)] text-[10px] text-[#4bff7b] font-bold">
                  BUS A
                </span>
                <span className="font-black text-sm text-[var(--term-green-text-bright)]">
                  INPUT PORT
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {inputMounted ? (
                  <span className="text-[#4BFF7B] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2EE85C]" />
                    MOUNTED: {inputFileName}
                  </span>
                ) : (
                  <span className="text-[#ffb700] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ffb700]" />
                    EMPTY
                  </span>
                )}
              </div>
            </div>

            {/* Readouts & Slot */}
            <div className="flex items-center justify-between my-2 p-2 rounded bg-[#010703] border border-[var(--term-outline-green)]/40 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--term-green-text-dim)] uppercase">
                  EXPECTED FORMAT
                </span>
                <span className="text-[var(--term-green-text-bright)] font-bold">
                  200 ROWS × 2 PROPERTIES (BRIGHTNESS, STEADY BEAT)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--term-green-text-dim)] uppercase">
                  STATUS
                </span>
                <div className="font-bold text-[#4BFF7B]">
                  {inputMounted ? "200 ROWS LOADED" : "NO CARRIER"}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--term-outline-green)]/30">
              <span className="text-[var(--term-green-text-dim)]">
                {selectedPort === "input" ? "▶ TARGET PORT FOCUSED" : "CLICK OR PRESS [A] TO SELECT"}
              </span>
              {inputMounted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    section4Store.unmountPort("input");
                    terminalSound.playKeyTick();
                  }}
                  className="text-[10px] text-[#ff7777] hover:underline"
                >
                  EJECT FILE
                </button>
              )}
            </div>
          </div>

          {/* Bottom Port: OUTPUT PORT */}
          <div
            data-port-id="output"
            onClick={() => setSelectedPort("output")}
            className={`flex-1 p-3.5 rounded border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
              selectedPort === "output"
                ? "border-[#2EE85C] bg-[#031407] shadow-[0_0_15px_rgba(46,232,92,0.2)]"
                : "border-[var(--term-outline-green)]/60 bg-[#020a04] hover:border-[var(--term-outline-green)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[#07250e] border border-[var(--term-outline-green)] text-[10px] text-[#4bff7b] font-bold">
                  BUS B
                </span>
                <span className="font-black text-sm text-[var(--term-green-text-bright)]">
                  OUTPUT PORT
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {outputMounted ? (
                  <span className="text-[#4BFF7B] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2EE85C]" />
                    MOUNTED: {outputFileName}
                  </span>
                ) : (
                  <span className="text-[#ffb700] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ffb700]" />
                    EMPTY
                  </span>
                )}
              </div>
            </div>

            {/* Readouts & Slot */}
            <div className="flex items-center justify-between my-2 p-2 rounded bg-[#010703] border border-[var(--term-outline-green)]/40 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--term-green-text-dim)] uppercase">
                  EXPECTED FORMAT
                </span>
                <span className="text-[var(--term-green-text-bright)] font-bold">
                  200 LABELS (NATURAL OR MACHINE)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--term-green-text-dim)] uppercase">
                  STATUS
                </span>
                <div className="font-bold text-[#4BFF7B]">
                  {outputMounted ? "200 LABELS LOADED" : "NO CARRIER"}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--term-outline-green)]/30">
              <span className="text-[var(--term-green-text-dim)]">
                {selectedPort === "output" ? "▶ TARGET PORT FOCUSED" : "CLICK OR PRESS [D] TO SELECT"}
              </span>
              {outputMounted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    section4Store.unmountPort("output");
                    terminalSound.playKeyTick();
                  }}
                  className="text-[10px] text-[#ff7777] hover:underline"
                >
                  EJECT FILE
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Pendrive File Explorer */}
        <div className="w-[480px] p-3.5 rounded border border-[var(--term-outline-green)] bg-[#020a04] flex flex-col justify-between shrink-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--term-outline-green)]/40">
              <div className="flex items-center gap-2">
                <span className="text-sm">💾</span>
                <span className="font-black text-xs text-[var(--term-green-text-bright)] tracking-wider">
                  PENDRIVE FILE SYSTEM
                </span>
              </div>
              <span className="text-[10px] text-[var(--term-green-text-dim)]">
                USE ↑/↓ OR CLICK • [E] INSERT
              </span>
            </div>

            {/* Files List */}
            <div className="flex flex-col gap-2 my-1">
              {PENDRIVE_FILES.map((f, idx) => {
                const isSelected = selectedFileIdx === idx;
                const isMountedInInput = inputFileName === f.name;
                const isMountedInOutput = outputFileName === f.name;

                return (
                  <div
                    key={f.name}
                    data-file-name={f.name}
                    onClick={() => {
                      terminalSound.playKeyTick();
                      setSelectedFileIdx(idx);
                    }}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? "border-[#2EE85C] bg-[#051c0b] shadow-[0_0_10px_rgba(46,232,92,0.25)]"
                        : "border-[var(--term-outline-green)]/50 bg-[#010803] hover:border-[var(--term-outline-green)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[var(--term-green-text-bright)]">
                          {isSelected ? "▶ " : "  "}
                          {f.name}
                        </span>
                        {(isMountedInInput || isMountedInOutput) && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#041c09] border border-[#2EE85C] text-[#4BFF7B] font-bold">
                            MOUNTED ({isMountedInInput ? "PORT A" : "PORT B"})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--term-green-text-dim)] font-mono">
                        {f.size}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--term-green-text-dim)] leading-tight pl-3">
                      {f.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transfer Bar Area or Insert Button */}
          <div className="pt-2 border-t border-[var(--term-outline-green)]/40 flex flex-col gap-2">
            {isTransferring ? (
              <div className="flex flex-col gap-1.5 p-2 rounded bg-[#031407] border border-[#2EE85C]">
                <div className="flex items-center justify-between text-xs font-bold text-[#4BFF7B]">
                  <span>READING ROW {String(transferRow).padStart(3, "0")}..200</span>
                  <span>{transferProgress}%</span>
                </div>
                {/* Progress bar container */}
                <div className="w-full h-3 rounded bg-[#010803] border border-[var(--term-outline-green)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2EE85C] to-[#4BFF7B] transition-all"
                    style={{ width: `${transferProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                data-action="insert-file"
                onClick={() =>
                  handleMountFile(PENDRIVE_FILES[selectedFileIdx], selectedPort)
                }
                className="w-full py-2.5 rounded border border-[#2EE85C] bg-[#041c09] hover:bg-[#072c10] text-[#4BFF7B] font-black text-xs tracking-wider transition-all shadow-[0_0_12px_rgba(46,232,92,0.25)] flex items-center justify-center gap-2"
              >
                <span>INSERT {PENDRIVE_FILES[selectedFileIdx].name} INTO {selectedPort.toUpperCase()} PORT</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#020a04] border border-[#2EE85C]/60 text-white font-mono">
                  [E]
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Preview Table & Proceed (when both mounted) ─────── */}
      {bothMounted ? (
        <div className="p-3 rounded border border-[#2EE85C] bg-[#021005] flex flex-col gap-2 shrink-0 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--term-outline-green)]/40 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#4BFF7B] tracking-wider">
                6-ROW SIDE-BY-SIDE VERIFICATION PREVIEW
              </span>
              <span className="text-[10px] text-[var(--term-green-text-dim)]">
                (FIRST 6 OBSERVATIONS JOINED)
              </span>
            </div>
            {/* SCRAP Pedagogical Caption */}
            <div className="text-[11px] text-[#ffb700] italic font-semibold">
              &quot;Inputs are what we measure. Outputs are the answer we want.&quot;
            </div>
          </div>

          {/* 6-Row Table */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono py-0.5">
            <div className="text-[var(--term-green-text-dim)] font-bold text-[10.5px]">ROW</div>
            <div className="text-[var(--term-green-text-bright)] font-bold text-[10.5px]">BRIGHTNESS (X₁)</div>
            <div className="text-[var(--term-green-text-bright)] font-bold text-[10.5px]">STEADY BEAT (X₂)</div>
            <div className="text-[#ffb700] font-bold text-[10.5px]">TARGET OUTPUT</div>
          </div>

          <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
            {previewRows.map((r) => (
              <div
                key={`preview-r-${r.row}`}
                className="grid grid-cols-4 gap-2 text-center text-xs font-mono py-1 rounded bg-[#010803] border border-[var(--term-outline-green)]/30 items-center"
              >
                <div className="text-[var(--term-green-text-dim)] font-bold">
                  {String(r.row).padStart(3, "0")}
                </div>
                <div className="text-[#4BFF7B] font-bold">{r.brightness.toFixed(4)}</div>
                <div className="text-[#4BFF7B] font-bold">{r.steadyBeat.toFixed(4)}</div>
                <div className="font-black">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      r.label === "MACHINE"
                        ? "bg-[#041c09] border border-[#2EE85C] text-[#4BFF7B]"
                        : "bg-[#1e1302] border border-[#ffb700] text-[#ffb700]"
                    }`}
                  >
                    {r.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Big Glowing Button: PROCEED TO NEURAL LAB */}
          <button
            type="button"
            onClick={onProceedToLab}
            className="w-full mt-1 py-3 rounded border-2 border-[#2EE85C] bg-[#062e0f] hover:bg-[#0a4217] text-[#4BFF7B] font-black text-sm tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(46,232,92,0.4)] flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>PROCEED TO NEURAL LAB</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#020a04] border border-[#2EE85C] text-white">
              [ENTER]
            </span>
          </button>
        </div>
      ) : (
        /* Bottom hints when not yet mounted */
        <div className="p-2.5 rounded border border-[var(--term-outline-green)]/40 bg-[#010803] flex items-center justify-between text-xs text-[var(--term-green-text-dim)]">
          <div className="flex items-center gap-2">
            <span>ℹ</span>
            <span>MOUNT BOTH INPUT.DAT AND OUTPUT.DAT TO UNLOCK THE 6-ROW VERIFICATION PREVIEW</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>[A] SELECT INPUT</span>
            <span>[D] SELECT OUTPUT</span>
            <span>[↑/↓] CHOOSE FILE</span>
            <span>[E] INSERT</span>
          </div>
        </div>
      )}
    </div>
  );
}
