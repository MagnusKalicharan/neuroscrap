"use client";

import React, { useState, useEffect } from "react";
import { DiagnosticConsole } from "@/section2/diagnostic/DiagnosticConsole";
import { relayStore, useRelayStore, createDefaultDiagnosticConfig } from "@/section2/relayStore";
import { autoFillAverage } from "@/section2/evaluateConfig";

export default function DevDiagnosticClient() {
  const store = useRelayStore();
  const [isOpen, setIsOpen] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [greyscale, setGreyscale] = useState(false);

  // Keyboard shortcut [G] for greyscale toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "g" || e.key === "G") {
        setGreyscale((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Presets
  const applyPresetAllConnect = () => {
    relayStore.setDiagnosticConfig(createDefaultDiagnosticConfig());
  };

  const applyPresetR3IgnoreR4Ignore = () => {
    relayStore.setDiagnosticConfig({
      ...createDefaultDiagnosticConfig(),
      R3: { mode: "ignore" },
      R4: { mode: "ignore" },
    });
  };

  const applyPresetPassSolution = () => {
    relayStore.setDiagnosticConfig({
      ...createDefaultDiagnosticConfig(),
      R3: { mode: "ignore" },
      R4: { mode: "patch", patchValue: 120 },
    });
  };

  const applyPresetAutoFillTrap = () => {
    const cfg = createDefaultDiagnosticConfig();
    const trapVal = Math.round(autoFillAverage(cfg)); // ~20096
    relayStore.setDiagnosticConfig({
      ...cfg,
      R4: { mode: "patch", patchValue: trapVal },
    });
  };

  return (
    <div className="w-screen h-screen bg-[#040806] text-white font-mono flex flex-col overflow-hidden">
      {/* ── Top Dev Control Bar ────────────────────────────── */}
      <header className="z-50 bg-[#091510] border-b border-[#178a38] px-4 py-2.5 flex items-center justify-between text-xs select-none flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#4bff7b] tracking-wider text-sm">
            DEV // TRANSMISSION DIAGNOSTIC
          </span>
          <span className="text-zinc-400">
            SCANNED: {store.scannedNodeIds.length}/6
          </span>
          <span className="text-zinc-400">
            ATTEMPTS: {store.attempts.length}
          </span>
          <span className={store.diagnosticPassed ? "text-emerald-400 font-bold" : "text-amber-400"}>
            STATUS: {store.diagnosticPassed ? "PASSED (ANTENNA ONLINE)" : "UNRESOLVED"}
          </span>
        </div>

        {/* Action Buttons & Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-600 font-bold"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? "CLOSE [ESC]" : "OPEN CONSOLE"}
          </button>

          <button
            type="button"
            className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-700 font-bold"
            onClick={() => relayStore.markAllScannedForTesting()}
          >
            MARK ALL SCANNED
          </button>

          <button
            type="button"
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-600"
            onClick={() => relayStore.resetDiagnosticConfig()}
          >
            RESET CONFIG
          </button>

          {/* Presets */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-bold mr-1">PRESETS:</span>
            <button
              type="button"
              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px]"
              onClick={applyPresetAllConnect}
              title="All nodes set to connect"
            >
              1. CONNECT ALL
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px]"
              onClick={applyPresetR3IgnoreR4Ignore}
              title="R3 ignore + R4 ignore (Chain failure)"
            >
              2. CHAIN FAIL
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px]"
              onClick={applyPresetPassSolution}
              title="R3 ignore + R4 patch 120 (PASS)"
            >
              3. PASS (120V)
            </button>
            <button
              type="button"
              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px]"
              onClick={applyPresetAutoFillTrap}
              title="R3 connect + R4 patch auto-fill (20096V Trap)"
            >
              4. 20096V TRAP
            </button>
          </div>

          {/* Toggles */}
          <label className="flex items-center gap-1 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
            />
            <span>REDUCE MOTION</span>
          </label>

          <label className="flex items-center gap-1 text-[11px] cursor-pointer" title="Press [G] to toggle">
            <input
              type="checkbox"
              checked={greyscale}
              onChange={(e) => setGreyscale(e.target.checked)}
            />
            <span>GREYSCALE [G]</span>
          </label>
        </div>
      </header>

      {/* ── Main Stage / Background View ───────────────────── */}
      <main className="flex-1 flex items-center justify-center relative p-4">
        {!isOpen && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-xl font-bold text-emerald-400">
              TRANSMISSION DIAGNOSTIC HARDWARE READY
            </div>
            <p className="text-zinc-400 max-w-md text-sm">
              Console is closed. Click below or press [E] in the Data Station to
              dock and operate the diagnostic switches, dial, and lever.
            </p>
            <button
              type="button"
              className="px-6 py-2.5 bg-[#18d248] hover:bg-[#2ee85c] text-black font-black text-sm tracking-wider rounded border-2 border-white shadow-[0_0_20px_rgba(24,210,72,0.5)] cursor-pointer"
              onClick={() => setIsOpen(true)}
            >
              OPEN DIAGNOSTIC CONSOLE [E]
            </button>
          </div>
        )}

        {/* The Diagnostic Console Overlay */}
        <DiagnosticConsole
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onSwitchToIntake={() => {
            // Dev callback
          }}
          reducedMotion={reduceMotion}
          greyscale={greyscale}
        />
      </main>
    </div>
  );
}
