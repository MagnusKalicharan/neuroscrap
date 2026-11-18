"use client";

/**
 * Section 3: Evidence Map Component (Shared)
 * ============================================
 * Pure SVG 2D Measurement Projection Map:
 * - 1:1 aspect ratio, max-h-[60vh], responsive.
 * - Axes fitted to data with 10% margin and 12px minimum labels.
 * - Unknown signals: Hollow rings with high-contrast digits 1–6 (18px font), on top, no separate label.
 * - Known scans: Class-shaped dots without always-on labels; hover/focus reveals tooltip.
 * - Clustered known scans: Beeswarm spread (<= 14px) with count badge ("x3") and >= 14px clearance.
 * - Full keyboard accessibility: Arrow keys navigate dots in reading order; aria-labels announce neutral facts.
 * - Comprehensive shape legend underneath.
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import type { CandidateRecord, MeasurementModule, SectionThreeRecord } from "./types.ts";
import { computeMapLayout, type PlacedCandidate, type PlacedKnown } from "./layout.ts";
import { getCandidateConfig } from "./beaconConfig.ts";
import { getGlossaryEntry } from "./glossary.ts";

export interface EvidenceMapProps {
  records: SectionThreeRecord[];
  candidates: CandidateRecord[];
  modX: MeasurementModule;
  modY?: MeasurementModule | null;
  selectedRecordId?: string;
  selectedCandidateId?: string;
  onSelectRecord?: (recordId: string) => void;
  onSelectCandidate?: (candidateId: string) => void;
  className?: string;
}

type FocusTarget =
  | { type: "known"; item: PlacedKnown }
  | { type: "candidate"; item: PlacedCandidate }
  | null;

export function EvidenceMap({
  records,
  candidates,
  modX,
  modY = null,
  selectedRecordId,
  selectedCandidateId,
  onSelectRecord,
  onSelectCandidate,
  className = "",
}: EvidenceMapProps) {
  const [hoveredTarget, setHoveredTarget] = useState<FocusTarget>(null);
  const [keyboardTarget, setKeyboardTarget] = useState<FocusTarget>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTarget = hoveredTarget || keyboardTarget;
  const entryX = getGlossaryEntry(modX.id);
  const entryY = modY ? getGlossaryEntry(modY.id) : null;

  // Compute Layout with deterministic clearance & beeswarm
  const layout = useMemo(
    () => computeMapLayout(records, candidates, modX, modY),
    [records, candidates, modX, modY]
  );

  // Unified reading order for keyboard navigation: sort by cy ascending, then cx ascending
  const allFocusableDots = useMemo(() => {
    const list: Array<
      | { type: "known"; item: PlacedKnown; key: string }
      | { type: "candidate"; item: PlacedCandidate; key: string }
    > = [];

    for (const k of layout.placedKnown) {
      list.push({ type: "known", item: k, key: k.id });
    }
    for (const c of layout.placedCands) {
      list.push({ type: "candidate", item: c, key: c.id });
    }

    list.sort((a, b) => {
      const dy = a.item.cy - b.item.cy;
      if (Math.abs(dy) > 10) return dy;
      return a.item.cx - b.item.cx;
    });

    return list;
  }, [layout]);

  // Handle Arrow Key navigation across reading order
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key !== "ArrowRight" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp" &&
      e.key !== "Enter" &&
      e.key !== " "
    ) {
      return;
    }

    e.preventDefault();

    if (!keyboardTarget && allFocusableDots.length > 0) {
      const first = allFocusableDots[0];
      setKeyboardTarget(first.type === "known" ? { type: "known", item: first.item } : { type: "candidate", item: first.item });
      return;
    }

    const currentKey =
      keyboardTarget?.type === "known" ? keyboardTarget.item.id : keyboardTarget?.item.id;
    const currentIndex = allFocusableDots.findIndex((d) => d.key === currentKey);

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      const nextIdx = (currentIndex + 1) % allFocusableDots.length;
      const next = allFocusableDots[nextIdx];
      setKeyboardTarget(next.type === "known" ? { type: "known", item: next.item } : { type: "candidate", item: next.item });
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      const prevIdx = (currentIndex - 1 + allFocusableDots.length) % allFocusableDots.length;
      const prev = allFocusableDots[prevIdx];
      setKeyboardTarget(prev.type === "known" ? { type: "known", item: prev.item } : { type: "candidate", item: prev.item });
    } else if (e.key === "Enter" || e.key === " ") {
      if (keyboardTarget?.type === "known" && onSelectRecord) {
        onSelectRecord(keyboardTarget.item.id);
      } else if (keyboardTarget?.type === "candidate" && onSelectCandidate) {
        onSelectCandidate(keyboardTarget.item.id);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onBlur={() => setKeyboardTarget(null)}
      className={`relative flex flex-col items-center select-none outline-none focus:ring-1 focus:ring-[#19F0FF]/40 rounded ${className}`}
    >
      {/* SVG Canvas (1:1 aspect ratio, max-h-[60vh]) */}
      <div className="relative w-full aspect-square max-h-[60vh] flex items-center justify-center bg-[#04060B] border border-[#1A2733] rounded overflow-hidden">
        <svg viewBox="0 0 500 500" className="w-full h-full max-h-[60vh]">
          {/* Light Grid Lines */}
          <line x1="60" y1="60" x2="440" y2="60" stroke="#101820" strokeDasharray="3 3" />
          <line x1="60" y1="155" x2="440" y2="155" stroke="#101820" strokeDasharray="3 3" />
          <line x1="60" y1="250" x2="440" y2="250" stroke="#101820" strokeDasharray="3 3" />
          <line x1="60" y1="345" x2="440" y2="345" stroke="#101820" strokeDasharray="3 3" />
          <line x1="60" y1="440" x2="440" y2="440" stroke="#101820" strokeDasharray="3 3" />

          <line x1="60" y1="60" x2="60" y2="440" stroke="#101820" strokeDasharray="3 3" />
          <line x1="155" y1="60" x2="155" y2="440" stroke="#101820" strokeDasharray="3 3" />
          <line x1="250" y1="60" x2="250" y2="440" stroke="#101820" strokeDasharray="3 3" />
          <line x1="345" y1="60" x2="345" y2="440" stroke="#101820" strokeDasharray="3 3" />
          <line x1="440" y1="60" x2="440" y2="440" stroke="#101820" strokeDasharray="3 3" />

          {/* Solid Axes */}
          <line x1="60" y1="440" x2="440" y2="440" stroke="#34495A" strokeWidth="2" />
          <line x1="60" y1="440" x2="60" y2="60" stroke="#34495A" strokeWidth="2" />

          {/* Axis Titles (>= 12px font) with Plain English Glossary Names */}
          <text
            x="250"
            y="485"
            textAnchor="middle"
            fill="#8E9CA8"
            fontSize="12"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {entryX.plainName} ({entryX.shortName} {entryX.icon}) ➔
          </text>
          {entryY ? (
            <text
              x="20"
              y="250"
              textAnchor="middle"
              fill="#8E9CA8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              transform="rotate(-90 20 250)"
            >
              {entryY.plainName} ({entryY.shortName} {entryY.icon}) ➔
            </text>
          ) : (
            <text
              x="20"
              y="250"
              textAnchor="middle"
              fill="#8E9CA8"
              fontSize="12"
              fontFamily="monospace"
              fontWeight="bold"
              transform="rotate(-90 20 250)"
            >
              LEVEL ➔
            </text>
          )}

          {/* Group Brackets */}
          {layout.brackets.map((br, bIdx) => (
            <path
              key={`br-${bIdx}`}
              d={`M ${br.x1} ${br.y - 3} L ${br.x1} ${br.y} L ${br.x2} ${br.y} L ${br.x2} ${br.y - 3}`}
              fill="none"
              stroke="#FFD019"
              strokeWidth="1.2"
              opacity="0.85"
            />
          ))}

          {/* Co-located Count Badges (e.g. "x3") */}
          {layout.countBadges.map((badge) => (
            <g key={badge.id}>
              <rect
                x={badge.bbox.x}
                y={badge.bbox.y}
                width={badge.bbox.w}
                height={badge.bbox.h}
                rx="3"
                fill="#1A1C24"
                stroke="#FFD019"
                strokeWidth="1"
              />
              <text
                x={badge.cx}
                y={badge.cy + 3.5}
                textAnchor="middle"
                fill="#FFD019"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {badge.text}
              </text>
            </g>
          ))}

          {/* 1. Known Scans Layer (Class-shaped dots, NO text label) */}
          {layout.placedKnown.map((k) => {
            const isSelected = selectedRecordId === k.id;
            const isTargeted =
              (activeTarget?.type === "known" && activeTarget.item.id === k.id) || isSelected;

            const ariaText = `Known scan ${k.targetName} (${k.kind}). ${entryX.plainName} ${k.rawX.toFixed(2)}${
              entryY && k.rawY !== undefined ? `, ${entryY.plainName} ${k.rawY.toFixed(2)}` : ""
            }.`;

            return (
              <g
                key={k.id}
                role="button"
                tabIndex={0}
                aria-label={ariaText}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectRecord && onSelectRecord(k.id)}
                onMouseEnter={() => setHoveredTarget({ type: "known", item: k })}
                onMouseLeave={() => setHoveredTarget(null)}
                onFocus={() => setKeyboardTarget({ type: "known", item: k })}
              >
                {/* Target highlight ring */}
                {isTargeted && (
                  <circle
                    cx={k.cx}
                    cy={k.cy}
                    r={12}
                    fill="none"
                    stroke="#19F0FF"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}

                {/* Shape by celestial class */}
                {k.kind === "BH" ? (
                  <circle
                    cx={k.cx}
                    cy={k.cy}
                    r={6}
                    fill="#19F0FF"
                    stroke="#FFF4E0"
                    strokeWidth={isTargeted ? 2 : 1}
                  />
                ) : k.kind === "PLANET" ? (
                  <rect
                    x={k.cx - 5}
                    y={k.cy - 5}
                    width={10}
                    height={10}
                    fill="#FF9A1F"
                    stroke="#FFF4E0"
                    strokeWidth={isTargeted ? 2 : 1}
                  />
                ) : (
                  <polygon
                    points={`${k.cx},${k.cy - 7} ${k.cx - 6},${k.cy + 5} ${k.cx + 6},${k.cy + 5}`}
                    fill="#FFF4E0"
                    stroke="#FF2E88"
                    strokeWidth={isTargeted ? 2 : 1}
                  />
                )}
              </g>
            );
          })}

          {/* 2. Unknown Signals Layer (Rendered ON TOP: hollow rings with number 1..6) */}
          {layout.placedCands.map((u) => {
            const isSelected = selectedCandidateId === u.id;
            const isTargeted =
              (activeTarget?.type === "candidate" && activeTarget.item.id === u.id) || isSelected;

            const cfg = getCandidateConfig(u.id as any);
            const ariaText = `Unknown signal ${u.number}. ${entryX.plainName} ${u.rawX.toFixed(2)}${
              entryY && u.rawY !== undefined ? `, ${entryY.plainName} ${u.rawY.toFixed(2)}` : ""
            }.`;

            return (
              <g
                key={u.id}
                role="button"
                tabIndex={0}
                aria-label={ariaText}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectCandidate && onSelectCandidate(u.id)}
                onMouseEnter={() => setHoveredTarget({ type: "candidate", item: u })}
                onMouseLeave={() => setHoveredTarget(null)}
                onFocus={() => setKeyboardTarget({ type: "candidate", item: u })}
              >
                {/* Outer focus / selection ring */}
                {isTargeted && (
                  <circle
                    cx={u.cx}
                    cy={u.cy}
                    r={20}
                    fill="none"
                    stroke="#FF2E88"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Solid backing to ensure high contrast against grid or background elements */}
                <circle cx={u.cx} cy={u.cy} r={14} fill="#04060B" />

                {/* Outer colored ring */}
                <circle
                  cx={u.cx}
                  cy={u.cy}
                  r={14}
                  fill="none"
                  stroke="#FF2E88"
                  strokeWidth={isTargeted ? 2.5 : 2}
                />

                {/* High contrast number (18px font) inside ring */}
                <text
                  x={u.cx}
                  y={u.cy + 6}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="18"
                  fontWeight="bold"
                  fontFamily="monospace"
                  className="pointer-events-none select-none"
                >
                  {u.number}
                </text>
              </g>
            );
          })}

          {/* Active Hover / Focus Tooltip Overlay */}
          {activeTarget && (
            <g
              className="pointer-events-none transition-all duration-150"
              transform={`translate(${
                Math.max(70, Math.min(330, activeTarget.item.cx - 70))
              }, ${
                activeTarget.item.cy > 100
                  ? activeTarget.item.cy - 56
                  : activeTarget.item.cy + 24
              })`}
            >
              <rect
                width="140"
                height="46"
                rx="4"
                fill="#0B1F2A"
                stroke="#19F0FF"
                strokeWidth="1.2"
                filter="drop-shadow(0 2px 8px rgba(0,0,0,0.8))"
              />
              {activeTarget.type === "candidate" ? (
                <>
                  <text
                    x="70"
                    y="16"
                    textAnchor="middle"
                    fill="#FF2E88"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    SIGNAL {activeTarget.item.number} ({activeTarget.item.kind})
                  </text>
                  <text
                    x="70"
                    y="32"
                    textAnchor="middle"
                    fill="#E0E8F0"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {entryX.plainName}: {activeTarget.item.rawX.toFixed(2)}
                    {entryY && activeTarget.item.rawY !== undefined
                      ? ` | ${entryY.plainName}: ${activeTarget.item.rawY.toFixed(2)}`
                      : ""}
                  </text>
                </>
              ) : (
                <>
                  <text
                    x="70"
                    y="16"
                    textAnchor="middle"
                    fill="#19F0FF"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {activeTarget.item.targetName} ({activeTarget.item.kind})
                  </text>
                  <text
                    x="70"
                    y="32"
                    textAnchor="middle"
                    fill="#E0E8F0"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {entryX.plainName}: {activeTarget.item.rawX.toFixed(2)}
                    {entryY && activeTarget.item.rawY !== undefined
                      ? ` | ${entryY.plainName}: ${activeTarget.item.rawY.toFixed(2)}`
                      : ""}
                  </text>
                </>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Map Legend Underneath (Original wording, ZERO banned words) */}
      <div className="w-full mt-3 p-3 bg-[#0B1F2A]/60 border border-[#1A2733] rounded text-xs text-[#8E9CA8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-[#E0E8F0] tracking-wider uppercase">
            SYMBOLS:
          </span>

          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#19F0FF] border border-[#FFF4E0]" />
            <span>Black Hole</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-[#FF9A1F] border border-[#FFF4E0]" />
            <span>Planet</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="inline-block w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-[#FFF4E0]" />
            <span>Stars</span>
          </span>

          <span className="flex items-center gap-1.5 text-[#FF2E88] font-bold">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-[#FF2E88] bg-[#04060B] text-[10px] text-white flex items-center justify-center font-bold">
              3
            </span>
            <span>Unknown Signal (1 to 6)</span>
          </span>

          <span className="flex items-center gap-1.5 text-[#FFD019]">
            <span className="px-1 py-0.5 rounded border border-[#FFD019] text-[9px] bg-[#1A1C24] font-bold">
              x3
            </span>
            <span>Co-located Scans</span>
          </span>
        </div>

        <div className="text-[10px] opacity-70">
          Tip: Hover or use Arrow Keys to inspect scan details
        </div>
      </div>
    </div>
  );
}
