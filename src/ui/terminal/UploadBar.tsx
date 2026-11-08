"use client";

import React, { useEffect, useState, useRef } from "react";
import { terminalSound } from "./sound";

interface UploadBarProps {
  onComplete: () => void;
  onCancel: () => void;
  reducedMotion?: boolean;
  isBiased?: boolean;
}

const TOTAL_SEGMENTS = 16;
const STATUS_STAGES = [
  { progress: 0.2, text: "READING SENSOR CACHE..." },
  { progress: 0.5, text: "VERIFYING CRYPTOGRAPHIC CHECKSUMS..." },
  { progress: 0.85, text: "TRANSFERRING TELEMETRY DATASTREAM..." },
  { progress: 1.0, text: "VALIDATING DATA DISTRIBUTION..." },
];

export function UploadBar({ onComplete, onCancel, reducedMotion = false, isBiased = false }: UploadBarProps) {
  const [filledSegments, setFilledSegments] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING BUFFER PIPELINE...");
  const [isDone, setIsDone] = useState(false);
  const cancelRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const isBiasedRef = useRef(isBiased);
  isBiasedRef.current = isBiased;

  useEffect(() => {
    // 1.6 seconds total upload time across 16 segments (100ms per segment)
    const stepMs = reducedMotion ? 40 : 100;
    let currentStep = 0;

    const interval = setInterval(() => {
      if (cancelRef.current) {
        clearInterval(interval);
        return;
      }

      currentStep++;
      setFilledSegments(currentStep);
      terminalSound.playUploadTick();

      const progress = currentStep / TOTAL_SEGMENTS;
      const stage = STATUS_STAGES.find((s) => progress <= s.progress) || STATUS_STAGES[STATUS_STAGES.length - 1];
      setStatusText(stage.text);

      if (currentStep >= TOTAL_SEGMENTS) {
        clearInterval(interval);
        setIsDone(true);
        if (isBiasedRef.current) {
          setStatusText("VALIDATION REJECTED // SAMPLING BIAS");
          terminalSound.playErrorBuzz();
        } else {
          setStatusText("TRAJECTORY VERIFIED // UPLOAD COMPLETE");
          terminalSound.playSuccessChime();
        }

        // 700ms after upload complete, trigger onComplete
        setTimeout(() => {
          if (!cancelRef.current) {
            onCompleteRef.current();
          }
        }, 700);
      }
    }, stepMs);

    return () => {
      clearInterval(interval);
    };
  }, [reducedMotion]);

  // Handle ESC cancel cleanly
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" || e.code === "KeyQ") {
        e.preventDefault();
        cancelRef.current = true;
        terminalSound.playBackBlip();
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className={`w-full p-4 border-2 rounded-sm flex flex-col gap-2.5 my-3 select-none transition-colors ${
        isBiased && isDone
          ? "border-red-500 bg-[#160404]"
          : "border-[var(--term-outline-green)] bg-[#020d04]"
      }`}
    >
      <div
        className={`flex items-center justify-between text-[14px] font-bold tracking-wider ${
          isBiased && isDone ? "text-red-400" : "text-[var(--term-green-text)]"
        }`}
      >
        <span className="truncate">{statusText}</span>
        <span className="font-mono text-xs">
          {Math.round((filledSegments / TOTAL_SEGMENTS) * 100)}%
        </span>
      </div>

      {/* Segmented Progress Blocks */}
      <div
        className={`grid grid-cols-16 gap-1 h-5 w-full border p-0.5 ${
          isBiased && isDone
            ? "bg-[#250808] border-red-500/50"
            : "bg-[var(--term-dark-panel)] border-[var(--term-outline-green)]"
        }`}
      >
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
          const isFilled = i < filledSegments;
          return (
            <div
              key={i}
              className={`h-full transition-colors duration-75 ${
                isFilled
                  ? isDone
                    ? isBiased
                      ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                      : "bg-[#34ff6e] shadow-[0_0_8px_#34ff6e]"
                    : "bg-[var(--term-strip-green)]"
                  : "bg-transparent"
              }`}
            />
          );
        })}
      </div>

      <div
        className={`flex justify-between items-center text-[12px] pt-0.5 ${
          isBiased && isDone ? "text-red-400/80" : "text-[var(--term-green-text-dim)]"
        }`}
      >
        <span>{isBiased && isDone ? "STATUS: REJECTED BY ORACLE" : "ENCRYPTION: HARDWARE SHA-256"}</span>
        <span>PRESS [ESC] TO ABORT</span>
      </div>
    </div>
  );
}

export default UploadBar;
