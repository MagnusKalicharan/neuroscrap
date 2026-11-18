"use client";

import React, { useRef, useEffect } from "react";
import type { TerminalFile } from "./terminalContent";
import { UploadBar } from "./UploadBar";
import { terminalSound } from "./sound";

interface MessageBodyProps {
  file: TerminalFile | null;
  isFocused: boolean;
  uploading: boolean;
  onStartUpload: () => void;
  onCancelUpload: () => void;
  onUploadComplete: () => void;
  onDeleteImage?: (id: string) => void;
  reducedMotion?: boolean;
  analysisOutcome?: "sampling_bias" | "representative_sample" | null;
  biasMessage?: string | null;
  onFormatPendrive?: () => void;
  totalScans?: number;
  maxScans?: number;
}

export function MessageBody({
  file,
  isFocused,
  uploading,
  onStartUpload,
  onCancelUpload,
  onUploadComplete,
  onDeleteImage,
  reducedMotion = false,
  analysisOutcome = null,
  biasMessage = null,
  onFormatPendrive,
  totalScans,
  maxScans = 10,
}: MessageBodyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);

  // Focus upload button when body gets focused
  useEffect(() => {
    if (isFocused && uploadButtonRef.current && !uploading) {
      uploadButtonRef.current.focus();
    }
  }, [isFocused, uploading]);

  if (!file) {
    return (
      <div className="w-full flex-1 flex flex-col min-h-0 bg-[var(--term-dark-bg)] text-[var(--term-green-text)] border border-[var(--term-outline-green)] overflow-hidden">
        <div className="w-full h-[22px] bg-[var(--term-strip-green)] flex-shrink-0" />
        <div className="p-6 text-[18px] text-[var(--term-green-text)]/70 italic">
          No file selected. Select a valid telemetry file to inspect payload.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex-1 flex flex-col min-h-0 bg-[var(--term-dark-bg)] text-[var(--term-green-text)] border border-[var(--term-outline-green)] shadow-[0_0_20px_rgba(28,168,72,0.2)] overflow-hidden select-text ${
        isFocused ? "ring-2 ring-[var(--term-green-text)] ring-offset-2 ring-offset-[var(--term-dark-bg)]" : ""
      }`}
      role="region"
      aria-label="Message Document Body"
    >
      {/* ── 1. Thick Bright-Green Strip along Top Edge (Matches Reference) ─ */}
      <div
        className="w-full h-[22px] bg-[var(--term-strip-green)] flex-shrink-0 shadow-[0_0_8px_rgba(28,229,66,0.6)]"
        aria-hidden="true"
      />

      {/* ── 2. Scrollable Body Content Panel (Dark CRT Background, Bright Green Text) ─── */}
      <div
        ref={scrollRef}
        tabIndex={0}
        className="flex-1 w-full p-6 sm:p-8 overflow-y-auto term-scrollbar space-y-5 text-[18px] sm:text-[19px] leading-[1.65] font-mono min-h-0 outline-none text-[var(--term-green-text)]"
      >
        {/* Document Title Header */}
        <div className="border-b border-[var(--term-outline-green)]/50 pb-3 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-[22px] sm:text-[24px] font-bold text-[var(--term-green-text-bright)] tracking-wide uppercase font-black term-glow">
              {file.title}
            </h1>
            <p className="text-[14px] text-[var(--term-green-text)]/80 tracking-wider uppercase mt-1 font-semibold">
              {file.author} • {file.date}
            </p>
          </div>
          {onDeleteImage && file.id !== "empty_pendrive" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                terminalSound.playErrorBuzz();
                onDeleteImage(file.id);
              }}
              className="px-3 py-1 bg-red-950/90 hover:bg-red-900 border-2 border-red-500 text-red-300 hover:text-white rounded text-xs font-mono font-bold tracking-wider cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 flex-shrink-0 shadow-sm"
              title="Delete this scan file from pendrive (or press Delete)"
            >
              <span>✕</span>
              <span>DELETE SCAN</span>
            </button>
          )}
        </div>

        {/* Subhead (Bold Caps) */}
        <div className="text-[17px] font-black tracking-[0.14em] text-[var(--term-green-text-bright)] uppercase pt-1 term-glow">
          {file.subhead}
        </div>

        {/* Body Paragraphs in Sentence Case */}
        {file.bodyParagraphs.map((para, i) => (
          <p key={i} className="text-justify text-[var(--term-green-text)] font-medium">
            {para}
          </p>
        ))}

        {/* Optical Sensor Image Preview for Photos */}
        {file.category === "image" && (file.imageTarget || file.imageDataUrl) && (
          <div className="my-4 p-3 bg-[#051408] border-2 border-[var(--term-outline-green)] rounded text-[var(--term-green-text)] text-xs flex flex-col gap-2">
            <div className="flex justify-between items-center text-[13px] font-bold tracking-wider">
              <span>OPTICAL SENSOR SNAPSHOT // {file.imageTarget ? file.imageTarget.toUpperCase() : "TELEMETRY CAPTURE"}</span>
              {onDeleteImage && file.id !== "empty_pendrive" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    terminalSound.playErrorBuzz();
                    onDeleteImage(file.id);
                  }}
                  className="px-2.5 py-1 bg-red-950/90 hover:bg-red-900 border border-red-500 text-red-300 hover:text-white rounded text-[11px] font-bold tracking-wider cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                >
                  <span>✕</span>
                  <span>DELETE SCAN FILE</span>
                </button>
              )}
            </div>
            <div className="h-44 w-full bg-black/90 border border-[var(--term-outline-green)]/40 flex items-center justify-center relative overflow-hidden">
              {/* Scanlines overlay on image */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 opacity-25 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.6)_0px,rgba(0,0,0,0.6)_1px,transparent_1px,transparent_2px)]"
              />

              {/* Viewfinder Target Brackets (Camera HUD Overlay) */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-2.5 z-20 border border-[var(--term-outline-green)]/30 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="w-2.5 h-2.5 border-t-2 border-l-2 border-[var(--term-outline-green)]" />
                  <span className="text-[9px] text-[var(--term-green-text)] tracking-widest pt-0.5 font-mono">
                    REC ● RAW 14-BIT
                  </span>
                  <span className="w-2.5 h-2.5 border-t-2 border-r-2 border-[var(--term-outline-green)]" />
                </div>
                {/* Center Reticle */}
                <div className="self-center flex items-center justify-center">
                  <div className="w-6 h-6 border border-[var(--term-outline-green)]/50 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[var(--term-outline-green)] rounded-full" />
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <span className="w-2.5 h-2.5 border-b-2 border-l-2 border-[var(--term-outline-green)]" />
                  <span className="text-[8px] text-[var(--term-green-text)]/70 tracking-wider pb-0.5 font-mono">
                    OPTICAL CAM-03 // ISO 3200 // 1/8000s
                  </span>
                  <span className="w-2.5 h-2.5 border-b-2 border-r-2 border-[var(--term-outline-green)]" />
                </div>
              </div>

              {/* Render actual captured photo if available */}
              {file.imageDataUrl ? (
                <img
                  src={file.imageDataUrl}
                  alt={file.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Procedural Fallback */
                <div className="relative flex items-center justify-center">
                  {file.imageTarget === "black_hole" && (
                    <div className="relative flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-300 blur-[2px]" />
                      <div className="absolute w-24 h-6 rounded-[100%] bg-amber-400 opacity-90 transform -rotate-12" />
                      <div className="absolute w-10 h-10 rounded-full bg-black border border-neutral-800" />
                      <span className="absolute text-[8px] text-red-400 font-mono">SINGULARITY</span>
                    </div>
                  )}
                  {file.imageTarget === "planet" && (
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-28 h-8 rounded-[100%] border-2 border-amber-300 transform -rotate-[22deg]" />
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-sky-600 to-slate-900" />
                    </div>
                  )}
                  {file.imageTarget === "stars" && (
                    <div className="relative w-full h-full flex items-center justify-center bg-[#020508]">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <div className="absolute top-4 left-10 w-1 h-1 rounded-full bg-yellow-200" />
                      <div className="absolute bottom-6 right-14 w-1 h-1 rounded-full bg-cyan-200" />
                      <div className="absolute top-8 right-20 w-1.5 h-1.5 rounded-full bg-amber-200" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Simulation Outcome */}
        {analysisOutcome === "sampling_bias" && (
          <div className="my-4 p-4 border-2 border-red-500 bg-red-950/60 text-red-200 rounded text-sm space-y-2.5 font-mono">
            <div className="flex items-center gap-2 text-base font-bold text-red-400 uppercase">
              <span>⚠</span>
              <span>SAMPLE IS BIASED</span>
            </div>
            <p className="text-base font-bold text-white leading-relaxed">
              {biasMessage || "You have taken this type of image more. The sample is biased."}
            </p>
            {onFormatPendrive && (
              <button
                type="button"
                onClick={onFormatPendrive}
                className="mt-2 w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-black font-black uppercase tracking-wider text-xs rounded transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>↺</span>
                <span>DELETE ALL SCANS & TRY AGAIN</span>
              </button>
            )}
          </div>
        )}

        {analysisOutcome === "representative_sample" && (
          <div className="my-4 p-4 border-2 border-emerald-400 bg-emerald-950/60 text-emerald-200 rounded text-sm space-y-2 font-mono">
            <div className="flex items-center gap-2 text-base font-bold text-emerald-400 uppercase">
              <span>✔</span>
              <span>SAMPLE VERIFIED</span>
            </div>
            <p className="text-base font-bold text-white">
              {biasMessage || "Sample verified! You have a balanced mix of Black Hole, Planet, and Star images."}
            </p>
          </div>
        )}

        {/* Upload Segmented Progress Bar (when active) */}
        {uploading && (
          <UploadBar
            onComplete={onUploadComplete}
            onCancel={onCancelUpload}
            reducedMotion={reducedMotion}
            isBiased={analysisOutcome === "sampling_bias"}
          />
        )}

        {/* Scans buffer counter or run trajectory simulation */}
        {totalScans !== undefined && totalScans < maxScans && (
          <div className="p-3 bg-[#051408] border border-[var(--term-outline-green)]/40 text-xs text-[var(--term-green-text)] tracking-wider">
            PENDRIVE BUFFER: {totalScans} / {maxScans} SCANS RECORDED. (COLLECT 10 SCANS OF THE SKY TO UNLOCK TRAJECTORY SIMULATION)
          </div>
        )}

        {/* Bottom Upload Action Row */}
        {file.canUpload && !uploading && (
          <div className="pt-4 border-t-2 border-[var(--term-outline-green)]/30">
            <button
              ref={uploadButtonRef}
              type="button"
              onClick={() => {
                terminalSound.playSelectBlip();
                onStartUpload();
              }}
              className="w-full py-3.5 px-6 bg-[var(--term-outline-green)] hover:bg-[#1db94c] text-black text-[16px] font-black tracking-[0.18em] uppercase rounded-sm transition-all duration-100 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_20px_rgba(28,210,72,0.4)] outline-none focus:ring-4 focus:ring-[var(--term-green-text)]"
            >
              <span>⚡</span> RUN TRAJECTORY SIMULATION MODEL [E / ENTER]
            </button>
          </div>
        )}

        {/* Archive Metadata Footnote */}
        <div className="p-3 bg-[rgba(3,18,6,0.08)] border border-[var(--term-outline-green)]/30 text-[12px] text-[var(--term-green-text)]/85 tracking-wider uppercase font-semibold">
          SYSTEM BUFFER: PENDRIVE-EXT-01 // ENCRYPTION: SHA-256 // INTEGRITY: 100%
        </div>
      </div>
    </div>
  );
}

export default MessageBody;
