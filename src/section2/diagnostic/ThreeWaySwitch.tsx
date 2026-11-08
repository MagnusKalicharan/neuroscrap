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

  const currentIdx = MODES.indexOf(mode);
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;

  const setModeByIndex = useCallback(
    (idx: number) => {
      if (!isScanned) return;
      const clamped = Math.max(0, Math.min(2, idx));
      if (clamped !== safeIdx) {
        const nextMode = MODES[clamped];
        diagnosticSound.playSwitchClack();
        onChangeMode(nextMode);

        const valText = nextMode === "patch" ? `, value ${patchValue} volts` : "";
        onAnnounce?.(`${label} set to ${nextMode}${valText}`);
      }
    },
    [isScanned, safeIdx, label, patchValue, onChangeMode, onAnnounce]
  );

  // Keyboard navigation: Left/Right, A/D, 1/2/3
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isScanned) return;

    if (e.key === "ArrowLeft" || e.key === "KeyA" || e.code === "KeyA") {
      e.preventDefault();
      setModeByIndex(safeIdx - 1);
    } else if (e.key === "ArrowRight" || e.key === "KeyD" || e.code === "KeyD") {
      e.preventDefault();
      setModeByIndex(safeIdx + 1);
    } else if (e.key === "1") {
      e.preventDefault();
      setModeByIndex(0);
    } else if (e.key === "2") {
      e.preventDefault();
      setModeByIndex(1);
    } else if (e.key === "3") {
      e.preventDefault();
      setModeByIndex(2);
    }
  };

  // Pointer drag to detent with setPointerCapture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScanned) return;
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
      setModeByIndex(targetIdx);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !bayRef.current || !isScanned) return;
    const rect = bayRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const detentWidth = rect.width / 3;
    const targetIdx = Math.floor(relX / detentWidth);
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
          className={`diag-switch-detent ${safeIdx === 0 ? "active" : ""}`}
          role="radio"
          aria-checked={safeIdx === 0}
          aria-label={`${label} Connect`}
          onClick={(e) => {
            e.stopPropagation();
            setModeByIndex(0);
          }}
        >
          <span className="diag-detent-icon">🔌</span>
          <span className="diag-detent-word">CONN</span>
        </div>

        {/* Detent 1: IGNORE */}
        <div
          className={`diag-switch-detent ${safeIdx === 1 ? "active" : ""}`}
          role="radio"
          aria-checked={safeIdx === 1}
          aria-label={`${label} Ignore`}
          onClick={(e) => {
            e.stopPropagation();
            setModeByIndex(1);
          }}
        >
          <span className="diag-detent-icon">⦸</span>
          <span className="diag-detent-word">IGN</span>
        </div>

        {/* Detent 2: PATCH */}
        <div
          className={`diag-switch-detent ${safeIdx === 2 ? "active" : ""}`}
          role="radio"
          aria-checked={safeIdx === 2}
          aria-label={`${label} Patch`}
          onClick={(e) => {
            e.stopPropagation();
            setModeByIndex(2);
          }}
        >
          <span className="diag-detent-icon">🔧</span>
          <span className="diag-detent-word">PATCH</span>
        </div>
      </div>
    </div>
  );
}
