"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { diagnosticSound } from "./sound";

interface RotaryDialProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  reduceMotion?: boolean;
}

export function RotaryDial({
  value,
  onChange,
  min = 0,
  max = 150,
  reduceMotion = false,
}: RotaryDialProps) {
  const plateRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editInputVal, setEditInputVal] = useState(String(value));

  const dragStartYRef = useRef<number>(0);
  const dragStartXRef = useRef<number>(0);
  const dragStartValRef = useRef<number>(value);
  const valueRef = useRef<number>(value);
  valueRef.current = value;

  // Clamp angle calculation: 0 V corresponds to -135 deg, 150 V corresponds to +135 deg (270 deg total sweep)
  const isOverRange = value > max;
  const clampedVal = Math.min(Math.max(value, min), max);
  const fraction = (clampedVal - min) / (max - min);
  const angle = -135 + fraction * 270;

  const updateVal = useCallback(
    (newVal: number) => {
      const rounded = Math.max(min, Math.min(max, Math.round(newVal)));
      if (rounded !== valueRef.current) {
        diagnosticSound.playDialTick();
        onChange(rounded);
      }
    },
    [min, max, onChange]
  );

  // Calculate value from a click / pointer event based on angle from center
  const calcAngleValue = useCallback(
    (clientX: number, clientY: number): number | null => {
      if (!plateRef.current) return null;
      const rect = plateRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;

      // Angle from center: 0 is 3 o'clock, 90 is 6 o'clock, -90 is 12 o'clock, 180/-180 is 9 o'clock
      const deg = Math.atan2(dy, dx) * (180 / Math.PI);
      // Map to needle degree (0 is 12 o'clock)
      let needleDeg = deg + 90;
      if (needleDeg > 180) needleDeg -= 360;
      if (needleDeg < -180) needleDeg += 360;

      // Bottom dead zone check (between 135 deg and -135 deg through 180)
      if (needleDeg > 135) needleDeg = 135;
      if (needleDeg < -135) needleDeg = -135;

      const frac = (needleDeg - (-135)) / 270;
      return Math.round(min + frac * (max - min));
    },
    [min, max]
  );

  // Pointer Down: Start Drag and immediately register position
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartXRef.current = e.clientX;
    dragStartValRef.current = valueRef.current;

    // If clicked on plate, also evaluate direct angle snap
    const clickedVal = calcAngleValue(e.clientX, e.clientY);
    if (clickedVal !== null) {
      dragStartValRef.current = clickedVal;
      updateVal(clickedVal);
    }
  };

  // Window-level listeners for bulletproof dragging across the entire screen
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      // 1. Check direct circular angle
      const angleVal = calcAngleValue(e.clientX, e.clientY);

      // 2. Also check linear delta (up/right = increase, down/left = decrease)
      const dy = dragStartYRef.current - e.clientY;
      const dx = e.clientX - dragStartXRef.current;
      const linearDelta = (dy * 0.75) + (dx * 0.75);
      const linearVal = Math.round(dragStartValRef.current + linearDelta);

      // Prefer angle if pointer is sufficiently far from center, else linear
      if (angleVal !== null && Math.abs(angleVal - valueRef.current) < 40) {
        updateVal(angleVal);
      } else {
        updateVal(linearVal);
      }
    };

    const handleWindowPointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [isDragging, calcAngleValue, updateVal]);

  // Wheel adjustment
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const dir = e.deltaY < 0 ? 1 : -1;
    const next = Math.max(min, Math.min(max, value + dir * step));
    updateVal(next);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      updateVal(Math.min(max, value + step));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      updateVal(Math.max(min, value - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      updateVal(min);
    } else if (e.key === "End") {
      e.preventDefault();
      updateVal(max);
    }
  };

  return (
    <div className="diag-dial-control">
      <div
        ref={plateRef}
        className="diag-dial-plate cursor-grab active:cursor-grabbing"
        tabIndex={0}
        role="slider"
        aria-label="Voltage Calibration Rotary Dial"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} volts`}
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        {/* Tick marks around perimeter */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 140 140"
        >
          {Array.from({ length: 16 }).map((_, i) => {
            const tickVal = i * 10;
            const tickFrac = i / 15;
            const tickAngle = -135 + tickFrac * 270;
            const rad = (tickAngle - 90) * (Math.PI / 180);
            const isMajor = tickVal % 50 === 0;
            const rOuter = 65;
            const rInner = isMajor ? 52 : 57;

            const x1 = 70 + rOuter * Math.cos(rad);
            const y1 = 70 + rOuter * Math.sin(rad);
            const x2 = 70 + rInner * Math.cos(rad);
            const y2 = 70 + rInner * Math.sin(rad);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? "#ffbe4a" : "#43586d"}
                strokeWidth={isMajor ? 2.5 : 1.2}
              />
            );
          })}
        </svg>

        {/* Central Rotating Knob with Needle */}
        <div
          className="diag-dial-knob pointer-events-none"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: reduceMotion || isDragging ? "none" : "transform 0.12s cubic-bezier(0.18, 0.9, 0.3, 1.2)",
          }}
        >
          <div className="diag-dial-needle" />
        </div>
      </div>

      {/* Digital Readout & Quick Direct Input */}
      <div className="diag-dial-readout" onWheel={handleWheel}>
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = parseInt(editInputVal, 10);
              if (!isNaN(parsed)) {
                updateVal(parsed);
              }
              setIsEditing(false);
            }}
            className="flex items-center"
          >
            <input
              type="number"
              autoFocus
              min={min}
              max={max}
              value={editInputVal}
              onChange={(e) => setEditInputVal(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(editInputVal, 10);
                if (!isNaN(parsed)) {
                  updateVal(parsed);
                }
                setIsEditing(false);
              }}
              className="w-24 text-center py-0.5 font-black text-2xl font-mono bg-black border-2 border-[#22d952] rounded text-[#5dfa87] focus:outline-none shadow-[0_0_12px_rgba(34,217,82,0.5)]"
            />
          </form>
        ) : (
          <div
            onClick={() => {
              setEditInputVal(String(value));
              setIsEditing(true);
            }}
            className={`diag-digital-display cursor-pointer hover:border-[#22d952] transition-colors ${
              isOverRange ? "over-range" : ""
            }`}
            title="Click to type exact voltage, or scroll to adjust"
          >
            {value} V
          </div>
        )}
        {isOverRange && (
          <div className="diag-over-range-badge" role="alert">
            <span>⚠</span>
            <span>OVER RANGE</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default RotaryDial;
