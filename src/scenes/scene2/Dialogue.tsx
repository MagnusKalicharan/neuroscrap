"use client";

import React, { useEffect, useState, useRef } from "react";
import dialogueData from "./dialogue.json";
import { scene2Sound } from "./sound";

interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  radio: boolean;
}

interface DialogueProps {
  currentLine?: DialogueLine | null;
  onAdvance?: () => void;
  onSkip?: () => void;
  isInteractive?: boolean; // True for D1-D3, false for wake W1-W3 subtitles
  showAdvancePrompt?: boolean;
}

export function OraclePortrait() {
  return (
    <div className="relative w-12 h-12 rounded-full border border-teal-400/60 bg-black/80 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(45,212,191,0.3)] flex-shrink-0">
      {/* Outer pulsing ring */}
      <div className="absolute inset-1 rounded-full border border-teal-300/40 animate-ping opacity-30" />
      {/* Inner glowing teal orb */}
      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-teal-500 via-cyan-400 to-teal-200 animate-pulse shadow-[0_0_12px_#2dd4bf]" />
      {/* Waveform scans */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-400/20 via-transparent to-transparent opacity-60" />
    </div>
  );
}

export function ScrapPortrait() {
  return (
    <div className="relative w-12 h-12 rounded-lg border border-amber-500/60 bg-black/80 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.25)] flex-shrink-0">
      {/* Robot Eye Sensor */}
      <div className="relative flex flex-col items-center justify-center gap-1">
        <div className="w-7 h-2.5 bg-neutral-900 border border-amber-400/80 rounded-sm flex items-center justify-center px-1">
          <div className="w-2.5 h-1.5 bg-amber-400 rounded-xs shadow-[0_0_8px_#f59e0b] animate-pulse" />
        </div>
        <div className="w-5 h-1 bg-amber-500/40 rounded-full" />
      </div>
      <div className="absolute top-1 right-1 text-[8px] font-mono text-amber-400/80">3%</div>
    </div>
  );
}

export default function DialogueBox({
  currentLine,
  onAdvance,
  onSkip,
  isInteractive = true,
  showAdvancePrompt = true,
}: DialogueProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textIndexRef = useRef(0);
  const typeTimerRef = useRef<number | null>(null);

  // Typewriter effect (~40 chars/sec = 25ms/char)
  useEffect(() => {
    if (!currentLine) {
      setDisplayedText("");
      return;
    }

    if (currentLine.radio) {
      scene2Sound.playRadioVoiceBurst();
    }

    setDisplayedText("");
    textIndexRef.current = 0;
    setIsTyping(true);

    const fullText = currentLine.text;

    const tick = () => {
      if (textIndexRef.current < fullText.length) {
        textIndexRef.current += 1;
        setDisplayedText(fullText.slice(0, textIndexRef.current));
        if (textIndexRef.current % 4 === 0) {
          scene2Sound.playTypeTick();
        }
        typeTimerRef.current = window.setTimeout(tick, 25);
      } else {
        setIsTyping(false);
      }
    };

    tick();

    return () => {
      if (typeTimerRef.current !== null) {
        clearTimeout(typeTimerRef.current);
      }
    };
  }, [currentLine?.id]);

  // Space / Enter keyboard advance
  useEffect(() => {
    if (!isInteractive || !onAdvance) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (isTyping && currentLine) {
          // Instant finish line if pressed during typing
          if (typeTimerRef.current !== null) clearTimeout(typeTimerRef.current);
          setDisplayedText(currentLine.text);
          setIsTyping(false);
        } else {
          onAdvance?.();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInteractive, isTyping, currentLine, onAdvance]);

  // Auto-advance after 6s of complete text if user doesn't interact
  useEffect(() => {
    if (!isInteractive || !onAdvance || isTyping || !currentLine) return;

    const timer = window.setTimeout(() => {
      onAdvance?.();
    }, 6000);

    return () => clearTimeout(timer);
  }, [isInteractive, isTyping, currentLine?.id, onAdvance]);

  // Click handler to instantly reveal full text or advance to next
  const handleCardClick = () => {
    if (!isInteractive) return;
    if (isTyping && currentLine) {
      if (typeTimerRef.current !== null) clearTimeout(typeTimerRef.current);
      setDisplayedText(currentLine.text);
      setIsTyping(false);
    } else {
      onAdvance?.();
    }
  };

  if (!currentLine) return null;

  const isOracle = currentLine.speaker === "ORACLE";

  return (
    <div
      role="region"
      aria-label="Dialogue"
      onClick={handleCardClick}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92vw] max-w-2xl bg-black/85 border border-cyan-500/40 rounded-xl p-4 md:p-5 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.18)] select-none animate-in fade-in slide-in-from-bottom-4 duration-300 ${
        isInteractive ? "cursor-pointer hover:border-cyan-400/80" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Speaker portrait */}
        {isOracle ? <OraclePortrait /> : <ScrapPortrait />}

        {/* Content body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`font-mono text-xs md:text-sm font-bold tracking-wider uppercase flex items-center gap-2 ${
                isOracle ? "text-teal-300" : "text-amber-400"
              }`}
            >
              {currentLine.speaker}
              {currentLine.radio && (
                <span className="text-[10px] text-cyan-400/80 border border-cyan-500/40 px-1 py-0.2 rounded font-mono normal-case flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  [radio static]
                </span>
              )}
            </span>

            {/* Skip button if interactive */}
            {isInteractive && onSkip && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip();
                }}
                className="font-mono text-[11px] text-cyan-400/70 hover:text-cyan-200 uppercase tracking-widest px-2 py-0.5 border border-cyan-500/30 hover:border-cyan-400/80 rounded transition-colors cursor-pointer"
              >
                Skip ▸
              </button>
            )}
          </div>

          {/* Subtitles text */}
          <p
            className="font-mono text-sm md:text-base text-cyan-100 tracking-wide leading-relaxed min-h-[44px]"
            aria-live="polite"
          >
            {displayedText}
            {isTyping && <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />}
          </p>
        </div>
      </div>

      {/* Advance hint */}
      {isInteractive && showAdvancePrompt && !isTyping && onAdvance && (
        <div className="mt-2 text-right">
          <span className="font-mono text-[11px] text-cyan-400/80 hover:text-cyan-200 tracking-widest uppercase transition-colors">
            Click or Press Space / Enter to continue ▾
          </span>
        </div>
      )}
    </div>
  );
}
