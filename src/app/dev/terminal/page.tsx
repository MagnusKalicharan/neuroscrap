"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import { PendriveTerminal } from "@/ui/terminal/PendriveTerminal";
import { usePendriveStore, pendriveStore } from "@/ui/terminal/pendriveStore";

export default function TerminalDevPage() {
  // Must return 404 in production environment
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [isOpen, setIsOpen] = useState(true);
  const [unlockedFolders, setUnlockedFolders] = useState<string[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0); // 0 to 1
  const [lastEvent, setLastEvent] = useState<string>("None");

  const { hasPendrive } = usePendriveStore();

  const handleClose = (reason: "back" | "eject" | "uploaded") => {
    setLastEvent(`Terminal Closed: [reason: ${reason}]`);
    setIsOpen(false);
  };

  const handleUpload = (batchId: string) => {
    setLastEvent(`Dataset Uploaded: [batchId: ${batchId}]`);
  };

  return (
    <div className="relative w-screen h-screen bg-[#020502] text-white font-mono overflow-hidden">
      {/* ── Developer Floating Control Bar ─────────────────────────── */}
      <div className="fixed top-3 left-4 right-4 z-[9999] bg-[#0c1c0f]/90 border border-[#22c55e]/50 backdrop-blur-md px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl">
        <div className="flex items-center gap-2 font-bold text-[#2ee85c]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2ee85c] animate-pulse" />
          <span>/dev/terminal DEV HARNESS</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsOpen((o) => !o)}
            className={`px-3 py-1 rounded border font-bold transition-all cursor-pointer ${
              isOpen
                ? "bg-red-950/80 border-red-500 text-red-300 hover:bg-red-900"
                : "bg-emerald-950/80 border-emerald-500 text-emerald-300 hover:bg-emerald-900"
            }`}
          >
            {isOpen ? "Close Terminal" : "Open Terminal"}
          </button>

          <button
            type="button"
            onClick={() => {
              setUnlockedFolders((prev) =>
                prev.includes("AUDIO") ? prev.filter((f) => f !== "AUDIO") : [...prev, "AUDIO"]
              );
            }}
            className="px-3 py-1 rounded bg-black/60 border border-[#22c55e]/60 text-[#2ee85c] hover:bg-[#12361a] transition-all cursor-pointer"
          >
            {unlockedFolders.includes("AUDIO") ? "Lock 'AUDIO'" : "Unlock 'AUDIO'"}
          </button>

          <button
            type="button"
            onClick={() => pendriveStore.setHasPendrive(!hasPendrive)}
            className="px-3 py-1 rounded bg-black/60 border border-[#22c55e]/60 text-[#2ee85c] hover:bg-[#12361a] transition-all cursor-pointer"
          >
            Pendrive: {hasPendrive ? "Connected (ON)" : "Disconnected (OFF)"}
          </button>

          <button
            type="button"
            onClick={() => setReducedMotion((r) => !r)}
            className={`px-3 py-1 rounded border transition-all cursor-pointer ${
              reducedMotion
                ? "bg-amber-950 border-amber-500 text-amber-300"
                : "bg-black/60 border-neutral-700 text-neutral-400"
            }`}
          >
            Reduce Motion: {reducedMotion ? "ON" : "OFF"}
          </button>

          {/* Reference Overlay Slider for Pixel-Exact Alignment */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#22c55e]/30">
            <span className="text-neutral-400">Ref Overlay:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-24 accent-[#2ee85c] cursor-pointer"
            />
            <span className="text-[#2ee85c] font-mono text-[11px] w-8">
              {Math.round(overlayOpacity * 100)}%
            </span>
          </div>
        </div>

        {/* Last Event Reporter */}
        <div className="text-[11px] text-neutral-400 truncate max-w-[260px]">
          Status: <span className="text-white font-bold">{lastEvent}</span>
        </div>
      </div>

      {/* ── The Terminal Component ─────────────────────────────────── */}
      <PendriveTerminal
        open={isOpen}
        onClose={handleClose}
        onUpload={handleUpload}
        unlocked={{ folders: unlockedFolders }}
        reducedMotion={reducedMotion}
      />

      {/* ── Reference Screenshot Overlay for Dev Alignment ─────────── */}
      {overlayOpacity > 0 && isOpen && (
        <div
          className="pointer-events-none fixed inset-0 z-[1500] flex items-center justify-center p-0"
          style={{ opacity: overlayOpacity }}
        >
          <img
            src="/terminal-reference.png"
            alt="Reference Overlay"
            className="w-[1280px] h-[720px] object-fill border border-red-500"
          />
        </div>
      )}
    </div>
  );
}
