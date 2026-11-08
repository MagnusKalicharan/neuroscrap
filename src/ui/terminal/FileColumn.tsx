"use client";

import React, { useRef, useEffect } from "react";
import type { TerminalFile } from "./terminalContent";
import { terminalSound } from "./sound";

interface FileColumnProps {
  files: TerminalFile[];
  selectedFileId: string;
  isFocused: boolean;
  onSelectFile: (id: string) => void;
  onReportAnchor?: (anchor: { x: number; y: number }) => void;
}

export function FileColumn({
  files,
  selectedFileId,
  isFocused,
  onSelectFile,
  onReportAnchor,
}: FileColumnProps) {
  const selectedRef = useRef<HTMLDivElement>(null);
  const activeIdx = Math.max(0, files.findIndex((f) => f.id === selectedFileId));
  const activeFile = files[activeIdx] || files[0];
  const nextFile = files.length > 1 ? files[(activeIdx + 1) % files.length] : null;

  // Measure and report the left-center anchor of the selected file slot for the connector line
  useEffect(() => {
    if (selectedRef.current && onReportAnchor) {
      const rect = selectedRef.current.getBoundingClientRect();
      const stage = selectedRef.current.closest(".terminal-stage");
      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        const scale = stageRect.width / 1280;
        const x = (rect.left - stageRect.left) / scale;
        const y = (rect.top + rect.height / 2 - stageRect.top) / scale;
        onReportAnchor({ x: Math.round(x), y: Math.round(y) });
      }
    }
  }, [selectedFileId, activeFile, onReportAnchor]);

  return (
    <div className="w-full flex flex-col gap-[10px] select-none" role="region" aria-label="File Selection">
      {/* ── 1. Selected File Slot (Pale Fill, Dark Caps Title) ─────── */}
      {activeFile ? (
        <div
          ref={selectedRef}
          tabIndex={0}
          role="option"
          aria-selected="true"
          onClick={() => {
            terminalSound.playSelectBlip();
            onSelectFile(activeFile.id);
          }}
          className={`w-full h-[52px] px-5 flex items-center justify-between text-[18px] font-bold tracking-[0.15em] uppercase cursor-pointer bg-[var(--term-dark-bg)] text-[var(--term-green-text-bright)] border-2 border-[var(--term-outline-green)] shadow-[0_0_15px_rgba(38,214,73,0.3)] font-black term-glow transition-all duration-100 ${
            isFocused ? "ring-2 ring-[var(--term-green-text)] ring-offset-2 ring-offset-[var(--term-dark-bg)]" : ""
          }`}
        >
          <span className="sr-only">&gt; Active File: </span>
          <span className="truncate">{activeFile.filename}</span>
          <span className="text-[12px] text-[var(--term-green-text)] opacity-85 ml-3 font-mono">
            {files.length > 1 ? `[${activeIdx + 1}/${files.length}]` : "SELECTED"}
          </span>
        </div>
      ) : (
        <div className="w-full h-[52px] border border-[var(--term-outline-green)] term-slot-empty" />
      )}

      {/* ── 2. Secondary / Next Slot Directly Underneath (Matches Reference) ──── */}
      <div
        className={`w-full h-[46px] border border-[var(--term-outline-green)] px-5 flex items-center justify-between text-[14px] tracking-wider uppercase font-mono transition-all ${
          nextFile && files.length > 1
            ? "cursor-pointer hover:bg-[#071b0c] text-[var(--term-green-text)]/80"
            : "term-slot-empty opacity-90 cursor-not-allowed"
        }`}
        onClick={() => {
          if (nextFile && files.length > 1) {
            terminalSound.playSelectBlip();
            onSelectFile(nextFile.id);
          } else {
            terminalSound.playErrorBuzz();
          }
        }}
        role="option"
        aria-disabled={!nextFile || files.length <= 1}
        aria-label={nextFile && files.length > 1 ? `Next File: ${nextFile.filename}` : "Empty File Slot"}
      >
        {nextFile && files.length > 1 ? (
          <>
            <span className="truncate">▼ {nextFile.filename}</span>
            <span className="text-[11px] opacity-70">CYCLE [▼ / S]</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default FileColumn;
