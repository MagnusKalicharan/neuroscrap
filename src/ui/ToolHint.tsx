"use client";

/**
 * ToolHint Component (Reusable)
 * ==============================
 * Player-facing hover and focus explanation component for measurement tools.
 *
 * Rules & Features:
 * - Reads from src/section3/glossary.ts as single source of truth.
 * - Mouse hover (150 ms delay), keyboard focus, and tap (small "i" button).
 * - Second tap or tap outside closes. Esc closes.
 * - Displays: plainName with shortName beside it, hoverText, example line,
 *   and a tiny preview diagram of smooth vs spiky sample curves with tool marks
 *   and side-by-side readings ("smooth 0.03, spiky 0.28").
 * - Fixed demo data only; NEVER uses or leaks player scan data.
 * - Never covers the trigger item; flips vertically to stay within the viewport.
 * - Max width 320 px, no layout shift (portal / fixed coords).
 * - 16 px text minimum; WCAG AA contrast; no backdrop-filter or animated filter.
 * - 120 ms fade (instant if prefers-reduced-motion).
 * - ARIA: trigger has aria-describedby pointing to role="tooltip".
 * - Variants: "terminal" (phosphor green CRT) or "dev" (cyan/slate dev bench).
 */

import React, { useState, useRef, useEffect, useId } from "react";
import {
  getGlossaryEntry,
  DEMO_SMOOTH_SIGNAL,
  DEMO_SPIKY_SIGNAL,
  DEMO_SMOOTH_COLOR,
  DEMO_SPIKY_COLOR,
  type MeasurementGlossaryEntry,
} from "../section3/glossary.ts";
import { getMeasurementById } from "../section3/measurements.ts";
import type { MeasurementId } from "../section3/types.ts";

export interface ToolHintProps {
  toolId: MeasurementId | string;
  variant?: "terminal" | "dev";
  children?: React.ReactNode;
  showInfoButton?: boolean;
  className?: string;
  forceOpen?: boolean;
}

export function ToolHint({
  toolId,
  variant = "dev",
  children,
  showInfoButton = false,
  className = "",
  forceOpen = false,
}: ToolHintProps) {
  const [isOpen, setIsOpen] = useState(forceOpen);
  const [isTapped, setIsTapped] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(
    null
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tooltipId = useId();
  const entry: MeasurementGlossaryEntry = getGlossaryEntry(toolId);
  const mod = getMeasurementById(toolId as MeasurementId);

  // Compute fixed demo data readings & marks
  const smoothRecord = { signal: DEMO_SMOOTH_SIGNAL, color: DEMO_SMOOTH_COLOR };
  const spikyRecord = { signal: DEMO_SPIKY_SIGNAL, color: DEMO_SPIKY_COLOR };

  const smoothVal = mod.compute(smoothRecord);
  const spikyVal = mod.compute(spikyRecord);
  const smoothMarks = mod.previewMarks(smoothRecord);
  const spikyMarks = mod.previewMarks(spikyRecord);

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

  // Update fixed position on open or window resize
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tWidth = tooltipRect ? tooltipRect.width : 320;
    const tHeight = tooltipRect ? tooltipRect.height : 260;
    const margin = 10;

    // Horizontal alignment clamped between 8px and window.innerWidth - 328px
    let left = rect.left + rect.width / 2 - tWidth / 2;
    if (left < 8) left = 8;
    if (left + tWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - tWidth - 8);
    }

    // Vertical placement: flip above if not enough space below
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < tHeight + margin && rect.top > tHeight + margin;

    let top = placeAbove ? rect.top - tHeight - margin : rect.bottom + margin;
    if (top < 8) top = 8;

    setCoords({ top, left, placeAbove });
  };

  useEffect(() => {
    if (isOpen || forceOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener("resize", handleResize);
      window.addEventListener("scroll", handleResize, true);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleResize, true);
      };
    }
  }, [isOpen, forceOpen]);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen && !forceOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsTapped(false);
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsTapped(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, forceOpen]);

  // Hover triggers with 150 ms delay
  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!isTapped && !forceOpen) {
      setIsOpen(false);
    }
  };

  // Keyboard focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    if (!isTapped && !forceOpen) {
      setIsOpen(false);
    }
  };

  // Touch / Info button toggle
  const handleInfoClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((prev) => !prev);
    setIsTapped((prev) => !prev);
  };

  // Color tokens
  const isTerminal = variant === "terminal";
  const bgCard = isTerminal ? "bg-[#041608]" : "bg-[#0B1F2A]";
  const borderCard = isTerminal ? "border-[#00FF66]" : "border-[#19F0FF]";
  const textHeader = isTerminal ? "text-[#00FF66]" : "text-[#19F0FF]";
  const textBody = isTerminal ? "text-[#D0FFD8]" : "text-[#E0E8F0]";
  const textExample = isTerminal ? "text-[#55AA77]" : "text-[#8E9CA8]";
  const textSubtitle = isTerminal ? "text-[#00AA44]" : "text-[#8E9CA8]";
  const shadowCard = isTerminal
    ? "shadow-[0_0_16px_rgba(0,255,102,0.35)]"
    : "shadow-[0_8px_24px_rgba(0,0,0,0.85)]";

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center gap-1.5 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={isOpen ? tooltipId : undefined}
    >
      {/* Trigger Children */}
      {children}

      {/* Touch / Tap Companion "i" Button */}
      {showInfoButton && (
        <button
          type="button"
          onClick={handleInfoClick}
          aria-label={`${entry.plainName} (${entry.shortName}) information`}
          aria-expanded={isOpen}
          className={`w-4 h-4 rounded-full border text-[10px] font-bold flex items-center justify-center transition-colors ${
            isTerminal
              ? "border-[#00FF66] text-[#00FF66] hover:bg-[#00FF66] hover:text-[#041608]"
              : "border-[#19F0FF] text-[#19F0FF] hover:bg-[#19F0FF] hover:text-[#04060B]"
          }`}
        >
          i
        </button>
      )}

      {/* Floating Tooltip */}
      {(isOpen || forceOpen) && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={{
            position: "fixed",
            top: coords ? `${coords.top}px` : "-9999px",
            left: coords ? `${coords.left}px` : "-9999px",
            zIndex: 9999,
          }}
          className={`w-[320px] max-w-[320px] p-4 rounded border font-mono ${bgCard} ${borderCard} ${shadowCard} ${
            prefersReducedMotion ? "" : "transition-opacity duration-120"
          } pointer-events-auto`}
        >
          {/* Header Row: plainName (large), shortName (subtitle), icon */}
          <div className="flex items-start justify-between gap-2 border-b border-[#1A2733] pb-2 mb-2.5">
            <div className="flex flex-col">
              <span className={`text-[17px] font-bold tracking-tight leading-tight ${textHeader}`}>
                {entry.plainName}
              </span>
              <span className={`text-[13px] uppercase tracking-wider font-semibold ${textSubtitle}`}>
                {entry.shortName}
              </span>
            </div>
            <span className={`text-[20px] font-bold ${textHeader}`}>{entry.icon}</span>
          </div>

          {/* One-Liner / Hover Text (>= 16px font) */}
          <p className={`text-[16px] leading-relaxed mb-2.5 ${textBody}`}>{entry.hoverText}</p>

          {/* Example in a quieter line (>= 16px font) */}
          <p className={`text-[16px] italic leading-normal mb-3 ${textExample}`}>
            {entry.example}
          </p>

          {/* Tiny Preview Diagram: Smooth vs Spiky Sample Curves with Marks */}
          <div className="pt-2 border-t border-[#1A2733]/80">
            <div className="text-[11px] uppercase tracking-wider opacity-60 mb-1 flex justify-between">
              <span>Sample Curves (Demo Data)</span>
              <span>{entry.markHint}</span>
            </div>

            <div className="bg-[#04060B] border border-[#1A2733] rounded p-1.5">
              <svg viewBox="0 0 280 60" className="w-full h-[55px] select-none" role="img">
                {/* Center Divider */}
                <line
                  x1="140"
                  y1="2"
                  x2="140"
                  y2="58"
                  stroke={isTerminal ? "#00FF66" : "#1A2733"}
                  strokeDasharray="2,2"
                  opacity="0.4"
                />

                {/* Subplot 1: SMOOTH (x: 5 to 135) */}
                <g transform="translate(5, 4)">
                  <text
                    x="2"
                    y="10"
                    fill={isTerminal ? "#00FF66" : "#8E9CA8"}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    SMOOTH
                  </text>
                  {/* Path */}
                  <path
                    d={pointsToPath(DEMO_SMOOTH_SIGNAL, 125, 34, 12)}
                    fill="none"
                    stroke={isTerminal ? "#00FF66" : "#19F0FF"}
                    strokeWidth="1.5"
                  />
                  {/* Marks */}
                  {renderMiniMark(entry.id, smoothMarks, 125, 34, 12, isTerminal)}
                </g>

                {/* Subplot 2: SPIKY (x: 145 to 275) */}
                <g transform="translate(145, 4)">
                  <text
                    x="2"
                    y="10"
                    fill={isTerminal ? "#00FF66" : "#8E9CA8"}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    SPIKY
                  </text>
                  {/* Path */}
                  <path
                    d={pointsToPath(DEMO_SPIKY_SIGNAL, 125, 34, 12)}
                    fill="none"
                    stroke={isTerminal ? "#00FF66" : "#19F0FF"}
                    strokeWidth="1.5"
                  />
                  {/* Marks */}
                  {renderMiniMark(entry.id, spikyMarks, 125, 34, 12, isTerminal)}
                </g>
              </svg>

              {/* Side-by-side Readings */}
              <div
                className={`flex justify-between items-center text-[12px] font-bold px-1 mt-1 ${
                  isTerminal ? "text-[#00FF66]" : "text-[#19F0FF]"
                }`}
              >
                <span>smooth {formatReading(entry.id, smoothVal)}</span>
                <span>spiky {formatReading(entry.id, spikyVal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Convert 64 signal values into an SVG path string.
 */
function pointsToPath(
  signal: number[],
  width: number,
  height: number,
  yOffset: number
): string {
  const n = signal.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * width;
    const y = yOffset + height * (1 - Math.max(0, Math.min(1, signal[i])));
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/**
 * Helper: Render tool marks on the tiny demo curve preview.
 */
function renderMiniMark(
  toolId: string,
  marks: any[],
  width: number,
  height: number,
  yOffset: number,
  isTerminal: boolean
): React.ReactNode {
  const accent = isTerminal ? "#00FF66" : "#FF9A1F";
  const mark = marks[0];
  if (!mark) return null;

  switch (toolId) {
    case "peak": {
      const px = mark.x !== undefined ? (mark.x / 63) * width : width / 2;
      const py = yOffset + height * (1 - (mark.y ?? 0.8));
      return (
        <g>
          <line x1={px} y1={py} x2={px} y2={yOffset + height} stroke={accent} strokeWidth="1.2" strokeDasharray="1,1" />
          <circle cx={px} cy={py} r="2.5" fill={accent} stroke="#04060B" strokeWidth="1" />
        </g>
      );
    }
    case "average": {
      const my = yOffset + height * (1 - (mark.y ?? 0.5));
      return (
        <line x1="0" y1={my} x2={width} y2={my} stroke={accent} strokeWidth="1.5" strokeDasharray="3,2" />
      );
    }
    case "width": {
      const x1 = mark.x !== undefined ? (mark.x / 63) * width : 0;
      const x2 = mark.x2 !== undefined ? (mark.x2 / 63) * width : width;
      const wy = yOffset + height * (1 - (mark.y ?? 0.5));
      return (
        <g>
          <line x1={x1} y1={wy} x2={x2} y2={wy} stroke={accent} strokeWidth="2" />
          <line x1={x1} y1={wy - 3} x2={x1} y2={wy + 3} stroke={accent} strokeWidth="1.5" />
          <line x1={x2} y1={wy - 3} x2={x2} y2={wy + 3} stroke={accent} strokeWidth="1.5" />
        </g>
      );
    }
    case "flicker": {
      return (
        <g>
          <line x1={width * 0.3} y1={yOffset + 5} x2={width * 0.3} y2={yOffset + height - 5} stroke={accent} strokeWidth="1.2" />
          <line x1={width * 0.6} y1={yOffset + 2} x2={width * 0.6} y2={yOffset + height - 8} stroke={accent} strokeWidth="1.2" />
          <line x1={width * 0.8} y1={yOffset + 8} x2={width * 0.8} y2={yOffset + height - 2} stroke={accent} strokeWidth="1.2" />
        </g>
      );
    }
    case "period": {
      const p = mark.value || 0;
      if (p <= 0) {
        return (
          <text x={width / 2} y={yOffset + height / 2 + 3} fill={accent} fontSize="8" textAnchor="middle" fontFamily="monospace">
            NO REPEAT
          </text>
        );
      }
      const gapX = (p / 63) * width;
      return (
        <g>
          <line x1={width * 0.2} y1={yOffset + 6} x2={width * 0.2 + gapX} y2={yOffset + 6} stroke={accent} strokeWidth="1.5" />
          <circle cx={width * 0.2} cy={yOffset + 6} r="1.5" fill={accent} />
          <circle cx={width * 0.2 + gapX} cy={yOffset + 6} r="1.5" fill={accent} />
        </g>
      );
    }
    case "color": {
      return (
        <g>
          <rect x={width - 24} y={yOffset + 4} width="8" height="18" fill="#FF2E88" opacity="0.8" />
          <rect x={width - 14} y={yOffset + 10} width="8" height="12" fill="#19F0FF" opacity="0.8" />
        </g>
      );
    }
    case "noise": {
      const y1 = yOffset + height * (1 - (mark.y ?? 0.5));
      const y2 = yOffset + height * (1 - (mark.y2 ?? 0.5));
      return (
        <g>
          <circle cx="2" cy={y1} r="2" fill={accent} />
          <circle cx={width - 2} cy={y2} r="2" fill={accent} />
          <line x1="2" y1={y1} x2={width - 2} y2={y2} stroke={accent} strokeWidth="1" strokeDasharray="2,2" />
        </g>
      );
    }
    default:
      return null;
  }
}

/**
 * Format reading value concisely for demo box.
 */
function formatReading(toolId: string, val: number): string {
  if (toolId === "width" || toolId === "period") {
    return `${Math.round(val)}`;
  }
  return val.toFixed(2);
}
