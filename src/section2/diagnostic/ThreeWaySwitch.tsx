"use client";

import React, { useRef, useCallback } from "react";
import type { RelayMode } from "../evaluateConfig";
import { diagnosticSound } from "./sound";

interface ThreeWaySwitchProps {
  nodeId: string;
  label: string;
  mode: RelayMode;
  patchValue?: number;
  isScanned?: boolean;
  onChangeMode: (mode: RelayMode) => void;
  onAnnounce?: (msg: string) => void;
  reduceMotion?: boolean;
}

const MODES: RelayMode[] = ["connect", "ignore", "patch"];

export function ThreeWaySwitch({
  nodeId,
  label,
  mode,
  patchValue = 0,
  isScanned = true,
  onChangeMode,
  onAnnounce,
  reduceMotion = false,
}: ThreeWaySwitchProps) {
  const bayRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const isR3 = nodeId === "R3";
  const isR4 = nodeId === "R4";

  const currentIdx = MODES.indexOf(mode);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;
  const isR4Wedged = isR4 && safeIdx === 2;

  const setModeByIndex = useCallback(
    (idx: number) => {
      if (!isScanned) return;

      // Rule 1: In R3, the screwdriver was destroyed by the 99,999V surge — cannot patch
      if (isR3 && idx === 2) {
        diagnosticSound.playSwitchClack();
        onAnnounce?.("R3 SCREWDRIVER DAMAGED: Screwdriver melted into slag by 99,999V surge arc! Cannot bridge.");
        return;
      }

      // Rule 2: In R4, once patched, the screwdriver is wedged in to bridge the gap — cannot be removed
      if (isR4 && safeIdx === 2 && idx !== 2) {
        diagnosticSound.playSwitchClack();
        onAnnounce?.("R4 SCREWDRIVER WEDGED: Screwdriver is jammed tight bridging the circuit gap. It cannot be removed!");
        return;
      }

      const clamped = Math.max(0, Math.min(2, idx));
      if (clamped !== safeIdx) {
        const nextMode = MODES[clamped];
        diagnosticSound.playSwitchClack();
        onChangeMode(nextMode);

        const valText = nextMode === "patch" ? `, value ${patchValue} volts` : "";
        onAnnounce?.(`${label} set to ${nextMode}${valText}`);
      }
    },
    [isScanned, isR3, isR4, safeIdx, label, patchValue, onChangeMode, onAnnounce]
  );

  // Keyboard navigation: Left/Right, A/D, 1/2/3
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isScanned) return;

    if (e.key === "ArrowLeft" || e.key === "KeyA" || e.code === "KeyA") {
      e.preventDefault();
      if (isR4Wedged) {
        diagnosticSound.playSwitchClack();
        onAnnounce?.("R4 SCREWDRIVER WEDGED: Screwdriver cannot be removed.");
        return;
      }
      setModeByIndex(safeIdx - 1);
    } else if (e.key === "ArrowRight" || e.key === "KeyD" || e.code === "KeyD") {
      e.preventDefault();
      if (isR3 && safeIdx === 1) {
        diagnosticSound.playSwitchClack();
        onAnnounce?.("R3 SCREWDRIVER DAMAGED: Screwdriver melted by surge arc!");
        return;
      }
      setModeByIndex(safeIdx + 1);
    } else if (e.key === "1") {
      e.preventDefault();
      if (isR4Wedged) {
        diagnosticSound.playSwitchClack();
        onAnnounce?.("R4 SCREWDRIVER WEDGED: Screwdriver cannot be removed.");
        return;
      }
      setModeByIndex(0);
    } else if (e.key === "2") {
      e.preventDefault();
      if (isR4Wedged) {
        diagnosticSound.playSwitchClack();
        onAnnounce?.("R4 SCREWDRIVER WEDGED: Screwdriver cannot be removed.");
        return;
      }
      setModeByIndex(1);
    } else if (e.key === "3") {
      e.preventDefault();
      if (isR3) {
        diagnosticSound.playSwitchClack();
        onAnnounce?.("R3 SCREWDRIVER DAMAGED: Screwdriver melted by surge arc!");
        return;
      }
      setModeByIndex(2);
    }
  };

  // Pointer drag to detent with setPointerCapture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScanned) return;
    if (isR4Wedged) return; // Cannot drag away when wedged
    draggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    // Calculate nearest detent directly from click position
    if (bayRef.current) {
      const rect = bayRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const detentWidth = rect.width / 3;
      const targetIdx = Math.floor(relX / detentWidth);
      if (isR3 && targetIdx === 2) return;
      setModeByIndex(targetIdx);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !bayRef.current || !isScanned || isR4Wedged) return;
    const rect = bayRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const detentWidth = rect.width / 3;
    const targetIdx = Math.floor(relX / detentWidth);
    if (isR3 && targetIdx === 2) return;
    setModeByIndex(targetIdx);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      draggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  if (!isScanned) {
    return (
      <div className="diag-switch-container">
        <span className="diag-switch-label">{label}</span>
        <div className="diag-switch-bay locked" title="Scan relay node first">
          <div className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-amber-500 font-mono">
            <span>🔒</span>
            <span>SCAN FIRST</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diag-switch-container">
      <span className="diag-switch-label">{label}</span>

      <div
        ref={bayRef}
        className="diag-switch-bay"
        data-pos={safeIdx}
        role="radiogroup"
        aria-label={`${label} transmission switch`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Sliding mechanical knob */}
        <div className="diag-switch-knob" aria-hidden="true" />

        {/* Detent 0: CONNECT */}
        <div
          className={`diag-switch-detent ${safeIdx === 0 ? "active" : ""} ${
            isR4Wedged ? "opacity-25 cursor-not-allowed select-none" : ""
          }`}
          role="radio"
          aria-checked={safeIdx === 0}
          aria-label={`${label} Connect`}
          title={isR4Wedged ? "SCREWDRIVER WEDGED: Cannot remove while bridging R4 gap" : `${label} Connect`}
          onClick={(e) => {
            e.stopPropagation();
            if (isR4Wedged) {
              diagnosticSound.playSwitchClack();
              onAnnounce?.("R4 SCREWDRIVER WEDGED: Screwdriver is jammed tight bridging the circuit gap. It cannot be removed!");
              return;
            }
            setModeByIndex(0);
          }}
        >
          <span className="diag-detent-icon">🔌</span>
          <span className="diag-detent-word">CONN</span>
        </div>

        {/* Detent 1: IGNORE */}
        <div
          className={`diag-switch-detent ${safeIdx === 1 ? "active" : ""} ${
            isR4Wedged ? "opacity-25 cursor-not-allowed select-none" : ""
          }`}
          role="radio"
          aria-checked={safeIdx === 1}
          aria-label={`${label} Ignore`}
          title={isR4Wedged ? "SCREWDRIVER WEDGED: Cannot remove while bridging R4 gap" : `${label} Ignore`}
          onClick={(e) => {
            e.stopPropagation();
            if (isR4Wedged) {
              diagnosticSound.playSwitchClack();
              onAnnounce?.("R4 SCREWDRIVER WEDGED: Screwdriver is jammed tight bridging the circuit gap. It cannot be removed!");
              return;
            }
            setModeByIndex(1);
          }}
        >
          <span className="diag-detent-icon">⦸</span>
          <span className="diag-detent-word">IGN</span>
        </div>

        {/* Detent 2: PATCH (Damaged on R3, Wedged on R4) */}
        {isR3 ? (
          /* R3 Damaged Screwdriver: Melted into slag by 99,999V surge arc */
          <div
            className="diag-switch-detent cursor-not-allowed select-none opacity-40 hover:opacity-50 transition-opacity"
            role="radio"
            aria-checked={false}
            aria-disabled="true"
            aria-label={`${label} Screwdriver Damaged (Melted by Surge)`}
            title="DAMAGED: Screwdriver melted into slag by 99,999V surge arc. Cannot bridge surge!"
            onClick={(e) => {
              e.stopPropagation();
              diagnosticSound.playSwitchClack();
              onAnnounce?.("R3 SCREWDRIVER DAMAGED: Screwdriver melted into slag by 99,999V surge arc!");
            }}
          >
            <span className="diag-detent-icon relative inline-flex items-center justify-center">
              <span className="filter grayscale brightness-50 contrast-150 text-red-500">🔧</span>
              <span className="absolute -top-1 -right-1 text-[8px] filter drop-shadow-[0_0_2px_#ef4444]">💥</span>
            </span>
            <span className="diag-detent-word text-red-400 font-bold line-through">DAMAGED</span>
          </div>
        ) : (
          /* Normal or Wedged Screwdriver */
          <div
            className={`diag-switch-detent ${safeIdx === 2 ? "active" : ""}`}
            role="radio"
            aria-checked={safeIdx === 2}
            aria-label={`${label} Patch`}
            title={isR4Wedged ? "SCREWDRIVER WEDGED: Jammed in place bridging R4 gap" : `${label} Patch`}
            onClick={(e) => {
              e.stopPropagation();
              setModeByIndex(2);
            }}
          >
            <span className="diag-detent-icon relative inline-flex items-center justify-center">
              <span>🔧</span>
              {isR4Wedged && (
                <span className="absolute -top-1.5 -right-1.5 text-[8px]" title="Wedged in place">🔒</span>
              )}
            </span>
            <span className="diag-detent-word">
              {isR4Wedged ? "WEDGED" : "PATCH"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
