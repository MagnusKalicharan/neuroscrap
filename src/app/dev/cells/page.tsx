"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import PowerCell from "@/components/PowerCell";
import { POWER_CELLS } from "@/data/powerCells";

export default function CellsDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isGreyscale, setIsGreyscale] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // Retrieve test cells
  const cell04 = POWER_CELLS.find((c) => c.id === 4) || { id: 4, charge: 0.9, damage: 0.8, good: false };
  const cell01 = POWER_CELLS.find((c) => c.id === 1) || { id: 1, charge: 0.9, damage: 0.1, good: true };
  const cell05 = POWER_CELLS.find((c) => c.id === 5) || { id: 5, charge: 0.2, damage: 0.1, good: false };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("greyscale") === "1" || params.get("g") === "1") {
        setIsGreyscale(true);
      }
      if (params.get("dev") === "1" || params.get("d") === "1") {
        setDevMode(true);
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "d") setDevMode((prev) => !prev);
      else if (e.key.toLowerCase() === "g") setIsGreyscale((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#04060B] flex items-center justify-center font-mono text-[#7F93A6]">
        INITIALIZING NEON NOIR TESTBENCH...
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#04060B] text-[#C9D6E2] p-6 md:p-12 flex flex-col items-center select-none transition-colors duration-300 relative overflow-x-hidden ${
        isGreyscale ? "noir-greyscale-mode" : ""
      } ${reduceMotion ? "noir-reduced-motion" : ""}`}
      suppressHydrationWarning
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 88% 12%, rgba(255, 154, 31, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 0%, #0B1F2A 0%, #04060B 75%)
          `,
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-6xl z-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-[#1A2733] pb-6 mb-12">
        <div className="flex flex-col items-center sm:items-start">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl sm:text-3xl font-black uppercase tracking-[0.25em] text-[#FFF4E0] drop-shadow-[0_0_12px_rgba(25,240,255,0.85)] font-sans"
              style={{
                fontFamily: "var(--font-noir-condensed)",
                animation: reduceMotion ? "none" : "neon-sign-dip 8s infinite ease-in-out",
              }}
            >
              SALVAGE
            </span>
            <span className="text-[10px] tracking-widest px-2 py-0.5 rounded border border-[#34495A] bg-[#0E161E] text-[#7F93A6] uppercase font-mono">
              DEV TESTBENCH
            </span>
          </div>
          <p className="text-sm font-semibold text-[#19F0FF] tracking-wider uppercase mt-2 font-mono">
            Bright = charge. Cracks = damage.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#0E161E]/90 border border-[#1A2733] px-4 py-2.5 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => setIsGreyscale(!isGreyscale)}
            className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-all border ${
              isGreyscale
                ? "bg-[#FFF4E0] text-[#04060B] border-[#FFF4E0]"
                : "bg-transparent text-[#7F93A6] border-[#34495A] hover:border-[#19F0FF] hover:text-[#19F0FF]"
            }`}
            title="Toggle Greyscale Mode (Key: G)"
          >
            [G] GREYSCALE: {isGreyscale ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setDevMode(!devMode)}
            className={`px-3 py-1 rounded text-xs font-mono font-bold tracking-wider transition-all border ${
              devMode
                ? "bg-[#FF9A1F] text-[#04060B] border-[#FF9A1F]"
                : "bg-transparent text-[#7F93A6] border-[#34495A] hover:border-[#FF9A1F] hover:text-[#FF9A1F]"
            }`}
            title="Toggle Dev Truth Overlay (Key: D)"
          >
            [D] DEV: {devMode ? "REVEALED" : "OFF"}
          </button>

          <label className="flex items-center gap-2 text-xs font-mono text-[#C9D6E2] cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="accent-[#19F0FF] w-4 h-4 rounded cursor-pointer"
            />
            <span>REDUCE MOTION</span>
          </label>
        </div>
      </div>

      {/* SECTION 1: CELL #04 */}
      <div className="w-full max-w-6xl z-10 flex flex-col mb-16">
        <div className="mb-4">
          <h2
            className="text-xs uppercase tracking-[0.2em] text-[#7F93A6] font-bold"
            style={{ fontFamily: "var(--font-noir-condensed)" }}
          >
            CELL #04 — SCALED SIZES
          </h2>
        </div>

        <div className="w-full flex items-end justify-around gap-8 md:gap-16 border-b-2 border-[#1A2733] pb-1 pt-8 relative">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#19F0FF]/30 to-transparent pointer-events-none" />

          <div className="flex flex-col items-center">
            <PowerCell
              charge={cell04.charge}
              damage={cell04.damage}
              size={110}
              id={cell04.id}
              reduceMotion={reduceMotion}
            />
            <div className="flex flex-col items-center mt-3">
              <span className="text-[11px] font-mono tracking-wider text-[#7F93A6] uppercase">COMPACT</span>
              <span className="text-xs font-mono font-bold tracking-widest text-[#7F93A6]">#04</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <PowerCell
              charge={cell04.charge}
              damage={cell04.damage}
              size={170}
              id={cell04.id}
              reduceMotion={reduceMotion}
            />
            <div className="flex flex-col items-center mt-3">
              <span className="text-xs font-mono tracking-wider text-[#19F0FF] uppercase font-semibold">STANDARD</span>
              <span className="text-sm font-mono font-bold tracking-widest text-[#FFF4E0]">#04</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <PowerCell
              charge={cell04.charge}
              damage={cell04.damage}
              size={260}
              id={cell04.id}
              reduceMotion={reduceMotion}
            />
            <div className="flex flex-col items-center mt-3">
              <span className="text-xs font-mono tracking-wider text-[#FF9A1F] uppercase font-semibold">ZOOM</span>
              <span className="text-base font-mono font-bold tracking-widest text-[#FF9A1F]">#04</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CELLS #01 & #05 */}
      <div className="w-full max-w-6xl z-10 flex flex-col mb-12">
        <div className="mb-4">
          <h2
            className="text-xs uppercase tracking-[0.2em] text-[#7F93A6] font-bold"
            style={{ fontFamily: "var(--font-noir-condensed)" }}
          >
            DISCERNIBILITY COMPARISON — #01 (BRIGHT, INTACT) VS #05 (DIM, INTACT)
          </h2>
        </div>

        <div className="w-full flex items-end justify-center gap-16 md:gap-28 border-b-2 border-[#1A2733] pb-1 pt-8 relative">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#19F0FF]/30 to-transparent pointer-events-none" />

          <div className="flex flex-col items-center">
            <PowerCell
              charge={cell01.charge}
              damage={cell01.damage}
              size={170}
              id={cell01.id}
              reduceMotion={reduceMotion}
            />
            <div className="flex flex-col items-center mt-3">
              <span className="text-xs font-mono tracking-wider text-[#19F0FF] uppercase font-semibold">STANDARD (170px)</span>
              <span className="text-sm font-mono font-bold tracking-widest text-[#FFF4E0]">#01</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <PowerCell
              charge={cell05.charge}
              damage={cell05.damage}
              size={170}
              id={cell05.id}
              reduceMotion={reduceMotion}
            />
            <div className="flex flex-col items-center mt-3">
              <span className="text-xs font-mono tracking-wider text-[#7F93A6] uppercase font-semibold">STANDARD (170px)</span>
              <span className="text-sm font-mono font-bold tracking-widest text-[#7F93A6]">#05</span>
            </div>
          </div>
        </div>
      </div>

      {devMode && (
        <div className="w-full max-w-6xl z-10 mt-2 p-5 bg-[#0E161E]/95 border border-[#FF9A1F]/60 rounded-lg text-xs font-mono shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#FF9A1F]/30 pb-2 mb-3">
            <span className="text-[#FF9A1F] font-bold uppercase tracking-wider">
              [DEV TELEMETRY INSPECTOR — GROUND TRUTH VALUES]
            </span>
            <span className="text-[#7F93A6] text-[11px]">PRESS [D] TO HIDE TRUTH VALUES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[#C9D6E2]">
            <div className="p-3 bg-[#04060B]/70 rounded border border-[#1A2733]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-[#FF9A1F]">CELL #04</span>
                <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 font-bold border border-red-800 text-[10px]">
                  BAD (DAMAGED)
                </span>
              </div>
              <div>Charge: <span className="text-[#19F0FF]">{(cell04.charge * 100).toFixed(0)}% (4.5 Segments)</span></div>
              <div>Damage: <span className="text-[#FF9A1F]">{(cell04.damage * 100).toFixed(0)}% (Severe Fracture)</span></div>
            </div>

            <div className="p-3 bg-[#04060B]/70 rounded border border-[#1A2733]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-[#19F0FF]">CELL #01</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-[#19F0FF] font-bold border border-cyan-800 text-[10px]">
                  GOOD (INTACT)
                </span>
              </div>
              <div>Charge: <span className="text-[#19F0FF]">{(cell01.charge * 100).toFixed(0)}% (4.5 Segments)</span></div>
              <div>Damage: <span className="text-[#7F93A6]">{(cell01.damage * 100).toFixed(0)}% (Intact Shell)</span></div>
            </div>

            <div className="p-3 bg-[#04060B]/70 rounded border border-[#1A2733]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-bold text-[#7F93A6]">CELL #05</span>
                <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 font-bold border border-red-800 text-[10px]">
                  BAD (DEPLETED)
                </span>
              </div>
              <div>Charge: <span className="text-[#7F93A6]">{(cell05.charge * 100).toFixed(0)}% (1 Segment)</span></div>
              <div>Damage: <span className="text-[#7F93A6]">{(cell05.damage * 100).toFixed(0)}% (Intact Shell)</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
