"use client";

import React, { useRef, useEffect } from "react";
import { terminalSound } from "./sound";

export interface FolderSlotDef {
  id: string;
  label: string | null; // null = empty outlined box
}

interface FolderColumnProps {
  slots: FolderSlotDef[];
  activeId: string;
  isFocused: boolean;
  onSelectFolder: (id: string) => void;
  onReportAnchor?: (anchor: { x: number; y: number }) => void;
}

export function FolderColumn({
  slots,
  activeId,
  isFocused,
  onSelectFolder,
  onReportAnchor,
}: FolderColumnProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  const isCompact = slots.length > 4;

  // Measure and report the right-center anchor of the active folder slot for the connector line
  useEffect(() => {
    if (activeRef.current && onReportAnchor) {
      const rect = activeRef.current.getBoundingClientRect();
      // Parent stage offset
      const stage = activeRef.current.closest(".terminal-stage");
      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        // Scale ratio calculation
        const scale = stageRect.width / 1280;
        const x = (rect.right - stageRect.left) / scale;
        const y = (rect.top + rect.height / 2 - stageRect.top) / scale;
        onReportAnchor({ x: Math.round(x), y: Math.round(y) });
      }
    }
  }, [activeId, slots, onReportAnchor]);

  return (
    <div className="flex flex-col w-[270px] select-none" role="region" aria-label="Folders Sidebar">
      {/* ── Left Column Heading: "FOLDERS" ────────────────────────── */}
      <div
        className="text-[16px] font-bold tracking-[0.18em] text-[var(--term-green-text)] term-glow uppercase mb-3 pl-1"
        id="term-folders-heading"
      >
        FOLDERS
      </div>

      {/* ── Stacked Slots ────────────────────────────────────────── */}
      <div
        className={`flex flex-col ${isCompact ? "gap-2" : "gap-[var(--term-folder-slot-gap)]"}`}
        role="listbox"
        aria-labelledby="term-folders-heading"
      >
        {slots.map((slot, idx) => {
          const isEmpty = slot.label === null;
          const isActive = !isEmpty && slot.id === activeId;

          if (isEmpty) {
            return (
              <div
                key={`empty-folder-${idx}`}
                className={`w-full ${isCompact ? "h-[68px]" : "h-[var(--term-folder-slot-height)]"} border border-[var(--term-outline-green)] term-slot-empty opacity-90 cursor-not-allowed`}
                onClick={() => {
                  terminalSound.playErrorBuzz();
                }}
                role="option"
                aria-disabled="true"
                aria-label={`Empty Folder Slot ${idx + 1}`}
              />
            );
          }

          return (
            <div
              key={slot.id}
              data-folder={slot.id}
              ref={isActive ? activeRef : null}
              tabIndex={0}
              role="option"
              aria-selected={isActive}
              onClick={() => {
                terminalSound.playSelectBlip();
                onSelectFolder(slot.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.code === "KeyE") {
                  e.preventDefault();
                  terminalSound.playSelectBlip();
                  onSelectFolder(slot.id);
                }
              }}
              className={`relative w-full ${isCompact ? "h-[68px] text-[16px]" : "h-[var(--term-folder-slot-height)] text-[18px]"} px-5 flex items-center justify-start font-bold tracking-[0.16em] uppercase cursor-pointer transition-all duration-100 ${
                isActive
                  ? "bg-[var(--term-dark-bg)] text-[var(--term-green-text-bright)] border-t border-b border-[var(--term-outline-green)] shadow-[0_0_15px_rgba(38,214,73,0.25)] font-black term-glow"
                  : "bg-transparent text-[var(--term-green-text)] border border-[var(--term-outline-green)] hover:border-[var(--term-green-text-bright)] hover:text-[var(--term-green-text-bright)] hover:bg-[rgba(28,168,72,0.06)]"
              } ${isFocused && isActive ? "ring-2 ring-[var(--term-green-text)] ring-offset-2 ring-offset-[var(--term-dark-bg)]" : ""}`}
            >
              {/* Screen reader prefix indicator */}
              <span className="sr-only">{isActive ? "> Selected: " : ""}</span>

              {/* In the reference, active slot has solid white vertical tabs on left AND right edges */}
              {isActive && (
                <>
                  <div
                    aria-hidden="true"
                    className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#ffffff] shadow-[0_0_8px_#ffffff]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute right-0 top-0 bottom-0 w-[6px] bg-[#ffffff] shadow-[0_0_8px_#ffffff]"
                  />
                </>
              )}

              <span>{slot.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FolderColumn;
