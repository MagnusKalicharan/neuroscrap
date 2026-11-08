"use client";

import React, { useState, useEffect, useRef } from "react";

export interface SevastopolTerminalProps {
  onClose?: () => void;
  onSelectFolder?: (folder: string) => void;
  initialFolder?: string;
}

export const FOLDERS = [
  { id: "PERSONAL", label: "PERSONAL" },
  { id: "SHARED", label: "SHARED" },
  { id: "AUDIO", label: "AUDIO" },
  { id: "UTILITY", label: "UTILITY" },
];

export function SevastopolTerminal({
  onClose,
  onSelectFolder,
  initialFolder = "SHARED",
}: SevastopolTerminalProps) {
  const [activeFolder, setActiveFolder] = useState<string>(initialFolder);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(() =>
    Math.max(0, FOLDERS.findIndex((f) => f.id === initialFolder))
  );
  const textScrollRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation matching retro terminal keybindings
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : FOLDERS.length - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < FOLDERS.length - 1 ? prev + 1 : 0));
      } else if (e.code === "KeyE" || e.key === "Enter") {
        e.preventDefault();
        const selected = FOLDERS[highlightedIndex].id;
        setActiveFolder(selected);
        onSelectFolder?.(selected);
      } else if (e.code === "KeyQ" || e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      } else if (e.key === "PageDown") {
        e.preventDefault();
        if (textScrollRef.current) {
          textScrollRef.current.scrollBy({ top: 120, behavior: "smooth" });
        }
      } else if (e.key === "PageUp") {
        e.preventDefault();
        if (textScrollRef.current) {
          textScrollRef.current.scrollBy({ top: -120, behavior: "smooth" });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [highlightedIndex, onClose, onSelectFolder]);

  // Keep highlighted index in sync when activeFolder changes
  useEffect(() => {
    const idx = FOLDERS.findIndex((f) => f.id === activeFolder);
    if (idx !== -1) setHighlightedIndex(idx);
  }, [activeFolder]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 select-none font-mono">
      {/* ── Outer CRT Monitor Frame ─────────────────────────────────── */}
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[740px] bg-[#051005] border-[3px] border-[#18a032] rounded-2xl shadow-[0_0_60px_rgba(34,197,94,0.3),inset_0_0_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
        
        {/* ── Authentic CRT Scanlines Overlay (repeating linear gradient) ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 opacity-40 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.5)_0px,rgba(0,0,0,0.5)_1.5px,transparent_1.5px,transparent_3px)]"
        />

        {/* ── Phosphor Screen Vignette & Glass Curvature ────────────── */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_90px_rgba(0,0,0,0.9),inset_0_0_25px_rgba(34,197,94,0.15)]"
        />

        {/* ── 1. Top Header Bar (Solid bright green with cutout dark text) ── */}
        <div className="relative z-30 w-full bg-[#1de840] h-9 sm:h-10 px-4 flex items-center justify-between shadow-[0_0_20px_rgba(29,232,64,0.4)]">
          <span className="text-[#051005] font-black text-sm sm:text-base tracking-[0.22em] uppercase">
            PERSONAL TERMINAL
          </span>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="text-[10px] font-bold text-[#051005] hover:bg-[#051005] hover:text-[#1de840] px-1.5 py-0.5 border border-[#051005] transition-all cursor-pointer"
              >
                [Q] EXIT
              </button>
            )}
            <div className="w-3.5 h-3.5 bg-[#051005]" />
          </div>
        </div>

        {/* ── Middle Split Pane (Folders Sidebar & Article Content) ───── */}
        <div className="relative z-10 flex-1 grid grid-cols-12 p-4 sm:p-7 gap-5 sm:gap-8 overflow-hidden min-h-0 bg-[#061206]">
          
          {/* ── 2. Left Column: Folders Sidebar (4 Columns) ─────────── */}
          <div className="col-span-4 flex flex-col">
            <div className="text-xs sm:text-sm font-bold text-[#22c55e] tracking-widest uppercase mb-4 [text-shadow:0_0_8px_#22c55e]">
              FOLDERS
            </div>

            <div className="space-y-3 relative">
              {FOLDERS.map((folder, idx) => {
                const isActive = activeFolder === folder.id;
                const isHighlighted = highlightedIndex === idx;

                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      setHighlightedIndex(idx);
                      setActiveFolder(folder.id);
                      onSelectFolder?.(folder.id);
                    }}
                    className={`relative w-full py-2.5 sm:py-3.5 px-4 text-xs sm:text-sm font-bold tracking-wider uppercase cursor-pointer transition-all ${
                      isActive
                        ? "bg-[#061206] text-[#2ee85c] border-t border-b border-[#189634] shadow-[0_0_15px_rgba(34,197,94,0.25)] font-black"
                        : isHighlighted
                        ? "bg-[#0b240b] text-[#2ef064] border border-[#2ef064] shadow-[0_0_12px_rgba(46,240,100,0.3)]"
                        : "bg-transparent text-[#1cb842] border border-[#189634] hover:border-[#2ef064] hover:text-[#2ef064]"
                    }`}
                  >
                    {/* Screen reader prefix indicator */}
                    {isActive && (
                      <>
                        <div
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#ffffff] shadow-[0_0_8px_#ffffff]"
                        />
                        <div
                          aria-hidden="true"
                          className="absolute right-0 top-0 bottom-0 w-[5px] bg-[#ffffff] shadow-[0_0_8px_#ffffff]"
                        />
                      </>
                    )}
                    <span>{folder.label}</span>

                    {/* Angular Connector Line routing from right edge of active folder up to content header */}
                    {isActive && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 hidden md:block"
                        style={{ width: "48px", height: "160px" }}
                      >
                        <svg
                          className="w-full h-full overflow-visible"
                          viewBox="0 0 48 160"
                          fill="none"
                        >
                          {/* Horizontal branch from folder, angle up, and branch to top title box */}
                          <path
                            d={
                              idx === 1 // "SHARED" folder at index 1
                                ? "M 0 80 H 22 V 12 H 48"
                                : idx === 0
                                ? "M 0 35 H 32 V 12 H 48"
                                : idx === 2
                                ? "M 0 125 H 22 V 12 H 48"
                                : "M 0 155 H 28 V 12 H 48"
                            }
                            stroke="#1de840"
                            strokeWidth="2"
                            strokeLinecap="square"
                            fill="none"
                            className="drop-shadow-[0_0_6px_#1de840]"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 3. Right Column: Main Content (8 Columns) ──────────── */}
          <div className="col-span-8 flex flex-col min-h-0 pl-2">
            
            {/* Top Title Box */}
            <div className="w-full p-2.5 sm:p-3 border border-[#1cb842] bg-[#051005] mb-4 shadow-[0_0_15px_rgba(28,184,66,0.15)] flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-[#2ef064] tracking-widest uppercase [text-shadow:0_0_8px_#2ef064]">
                AN OUTPOST OF PROGRESS? #1
              </span>
            </div>

            {/* Main Text Area (Julia Jones Article) */}
            <div
              ref={textScrollRef}
              className="flex-1 w-full p-4 sm:p-6 border border-[#1cb842] bg-[#040c04] overflow-y-auto space-y-4 text-xs sm:text-[13px] leading-relaxed text-[#2ef064] font-mono [text-shadow:0_0_5px_rgba(46,240,100,0.4)] min-h-0"
            >
              <div className="border-b border-[#189634]/40 pb-2">
                <h1 className="text-sm sm:text-base font-bold text-[#34ff6e] tracking-wide uppercase [text-shadow:0_0_10px_#34ff6e]">
                  Sevastopol: An Outpost of Progress?
                </h1>
                <p className="text-[11px] sm:text-xs text-[#1cb842] tracking-wider uppercase mt-0.5">
                  By Julia Jones
                </p>
              </div>

              <div className="text-xs sm:text-sm font-bold tracking-widest text-[#e2fce2] uppercase pt-1 [text-shadow:0_0_6px_#e2fce2]">
                DESOLATION THROUGH ISOLATION
              </div>

              <p className="text-justify text-[#2ef064]/95">
                The space station that nobody needed, run by a company we all forgot.
                Sevastopol is now a backwater. The population is a tenth of the station's
                optimal capacity. Docking bays are empty and the shutters are down on local
                stores and businesses. The orders for Seegson's cheaply manufactured androids
                have long since dried up, and the antiquated APOLLO governing AI system
                frequently malfunctions.
              </p>

              <p className="text-justify text-[#2ef064]/95">
                How did we get here and, more importantly, where have billions of dollars
                of investment gone? My name is Julia Jones. I have lived on Sevastopol for
                two months compiling this report for The Colonial Times, discovering the
                price our second-tier corporations pay for failing to keep up with the corporate
                giants like Weyland-Yutani.
              </p>

              <div className="p-2.5 bg-[#071907] border border-[#189634] text-[11px] text-[#1de840]">
                ARCHIVE ENTRY #4402 // TERMINAL ENCRYPTION: LOW // AUTHORIZED PERSONNEL ONLY
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Bottom Footer Bar (Terminal Keybindings & Dot Leaders) ── */}
        <div className="relative z-30 w-full py-2 px-4 border-t border-[#189634]/60 bg-[#040c04] flex items-center justify-center text-[10px] sm:text-xs text-[#22c55e] tracking-widest uppercase [text-shadow:0_0_6px_#22c55e]">
          <span className="truncate">
            UP / DOWN HIGHLIGHT ..... E SELECT ..... PAGE UP / PAGE DOWN SCROLL ..... Q BACK
          </span>
        </div>
      </div>
    </div>
  );
}

export default SevastopolTerminal;
