"use client";

import React, { useRef, useState, useCallback } from "react";
import { diagnosticSound } from "./sound";

interface TestLeverProps {
  isTesting: boolean;
  onPull: () => void;
  reduceMotion?: boolean;
}

export function TestLever({ isTesting, onPull, reduceMotion = false }: TestLeverProps) {
  const [dragY, setDragY] = useState(0);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const socketRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 68; // ~70px

  const triggerPull = useCallback(() => {
    if (isTesting) return;
    diagnosticSound.playLeverClunk();
    setDragY(PULL_THRESHOLD);
    onPull();
  }, [isTesting, onPull]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTesting) return;
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isTesting) return;
    const dy = e.clientY - startYRef.current;
    const clampedY = Math.max(0, Math.min(PULL_THRESHOLD, dy));
    setDragY(clampedY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (dragY >= PULL_THRESHOLD - 6) {
      triggerPull();
    } else {
      // Early release: spring back smoothly
      setDragY(0);
    }
  };

  // Keyboard pull with Enter or Space
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerPull();
    }
  };

  // Reset visual lever state when not testing
  React.useEffect(() => {
    if (!isTesting) {
      setDragY(0);
    }
  }, [isTesting]);

  return (
    <div className="diag-lever-container" aria-label="Transmission Test Hardware Lever">
      <div className="diag-lever-header">
        <span>TEST TRANSMISSION</span>
      </div>

      <div
        className={`diag-lever-status-lamp ${isTesting ? "testing" : "standby"}`}
        role="status"
        aria-live="polite"
      >
        <span>{isTesting ? "● TESTING" : "● STANDBY"}</span>
      </div>

      {/* Recessed Lever Socket with Hazard Stripes */}
      <div
        ref={socketRef}
        className="diag-lever-socket"
        tabIndex={0}
        role="button"
        aria-label="Pull lever to test transmission line"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <div className="diag-lever-hazard" />

        {/* Sliding mechanical arm and knurled pull handle */}
        <div
          className="diag-lever-arm"
          style={{
            transform: `translateY(${dragY}px)`,
            transition: reduceMotion || isDraggingRef.current ? "none" : "transform 0.16s cubic-bezier(0.18, 0.9, 0.3, 1.2)",
          }}
        >
          <div className="diag-lever-handle" />
        </div>
      </div>

      {/* Auxiliary Accessible Button */}
      <button
        type="button"
        className="diag-lever-btn"
        disabled={isTesting}
        onClick={triggerPull}
        title="Trigger transmission test (Press Enter)"
      >
        <span>PULL [ENTER]</span>
      </button>
    </div>
  );
}
