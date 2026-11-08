"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import "./diagnostic.css";
import { RELAY_NODES } from "../nodeData";
import { evaluateConfig, type RelayMode } from "../evaluateConfig";
import { relayStore, useRelayStore } from "../relayStore";
import { section2Events } from "../section2Events";
import { diagnosticSound } from "./sound";
import { SchematicRow } from "./SchematicRow";
import { ThreeWaySwitch } from "./ThreeWaySwitch";
import { PacketStrip } from "./PacketStrip";
import { PatchPanel } from "./PatchPanel";
import { TestLever } from "./TestLever";
import { ResultBar } from "./ResultBar";

export interface TransmissionTerminalSectionProps {
  onReportAnchor?: (anchor: { x: number; y: number }) => void;
  reducedMotion?: boolean;
  onClose?: () => void;
}

export function TransmissionTerminalSection({
  onReportAnchor,
  reducedMotion = false,
  onClose,
}: TransmissionTerminalSectionProps) {
  const store = useRelayStore();
  const headerAnchorRef = useRef<HTMLDivElement>(null);

  // Testing animation states
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const testAnimRef = useRef<number | null>(null);
  const testStartTimeRef = useRef<number>(0);
  const hasEmittedPassedRef = useRef(false);

  // Measure and report the left-center anchor of the top header for the CRT dynamic SVG connector
  useEffect(() => {
    if (headerAnchorRef.current && onReportAnchor) {
      const rect = headerAnchorRef.current.getBoundingClientRect();
      const stage = headerAnchorRef.current.closest(".terminal-stage");
      if (stage) {
        const stageRect = stage.getBoundingClientRect();
        const scale = stageRect.width / 1280;
        const x = (rect.left - stageRect.left) / scale;
        const y = (rect.top + rect.height / 2 - stageRect.top) / scale;
        onReportAnchor({ x: Math.round(x), y: Math.round(y) });
      }
    }
  }, [onReportAnchor]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (testAnimRef.current) {
        cancelAnimationFrame(testAnimRef.current);
      }
      try {
        diagnosticSound.fadeOutAndClose();
      } catch {}
    };
  }, []);

  // Handle Switch Mode changes
  const handleModeChange = useCallback((nodeId: string, mode: RelayMode) => {
    relayStore.setNodeMode(nodeId, mode);
  }, []);

  // Handle Patch Value changes
  const handlePatchValueChange = useCallback((nodeId: string, val: number) => {
    relayStore.setNodePatchValue(nodeId, val);
  }, []);

  // Run Transmission Test
  const handleRunTest = useCallback(() => {
    if (isTesting) return;

    try {
      const currentCfg = relayStore.getState().diagnosticConfig;
      const evalResult = evaluateConfig(currentCfg);

      setIsTesting(true);
      setTestProgress(0);
      try {
        diagnosticSound.startTestHum();
      } catch {}
      testStartTimeRef.current = performance.now();

      const DURATION = 1400; // 1.4 seconds

      const animate = (now: number) => {
        const elapsed = now - testStartTimeRef.current;
        const p = Math.min(1, elapsed / DURATION);
        setTestProgress(p);

        if (p < 1) {
          testAnimRef.current = requestAnimationFrame(animate);
        } else {
          // Test run concluded
          try {
            diagnosticSound.stopTestHum();
          } catch {}
          relayStore.recordAttempt(currentCfg, evalResult);

          if (evalResult.ok) {
            try {
              diagnosticSound.playPassChime();
            } catch {}
            relayStore.setDiagnosticPassed(true);
            setAnnouncement("Transmission test passed. Signal reached antenna.");

            if (!hasEmittedPassedRef.current) {
              hasEmittedPassedRef.current = true;
              section2Events.emit("diagnostic-passed", {
                config: currentCfg,
                attempts: relayStore.getState().attempts,
              });
            }
          } else {
            try {
              diagnosticSound.playFailBuzzer();
            } catch {}
            setAnnouncement(`Transmission test failed. ${evalResult.reason || ""}`);
          }

          // Reset lever latch after 600ms
          setTimeout(() => {
            setIsTesting(false);
            setTestProgress(0);
          }, 600);
        }
      };

      if (reducedMotion) {
        try {
          diagnosticSound.stopTestHum();
        } catch {}
        relayStore.recordAttempt(currentCfg, evalResult);

        if (evalResult.ok) {
          try {
            diagnosticSound.playPassChime();
          } catch {}
          relayStore.setDiagnosticPassed(true);
          if (!hasEmittedPassedRef.current) {
            hasEmittedPassedRef.current = true;
            section2Events.emit("diagnostic-passed", {
              config: currentCfg,
              attempts: relayStore.getState().attempts,
            });
          }
        } else {
          try {
            diagnosticSound.playFailBuzzer();
          } catch {}
        }
        setIsTesting(false);
      } else {
        testAnimRef.current = requestAnimationFrame(animate);
      }
    } catch (err) {
      console.error("Test execution error:", err);
      setIsTesting(false);
    }
  }, [isTesting, reducedMotion]);

  const failingNodeId =
    store.lastResult && !store.lastResult.ok
      ? store.lastResult.failure === "surge"
        ? "R3"
        : "R4"
      : null;

  return (
    <div className="w-full h-full flex flex-col gap-2 min-h-0 select-none font-mono">
      {/* Screen Reader Live Announcements */}
      <div className="sr-only" aria-live="assertive">
        {announcement}
      </div>

      {/* ── 1. Top File / Diagnostic Header Slot ──────────────────── */}
      <div
        ref={headerAnchorRef}
        tabIndex={0}
        role="region"
        aria-label="Transmission Diagnostic Control Channel"
        className="w-full h-[52px] px-5 flex items-center justify-between text-[17px] font-bold tracking-[0.15em] uppercase bg-[var(--term-dark-bg)] text-[var(--term-green-text-bright)] border-2 border-[var(--term-outline-green)] shadow-[0_0_15px_rgba(38,214,73,0.3)] font-black term-glow transition-all shrink-0"
      >
        <div className="flex items-center gap-3 truncate">
          <span>TRANSMISSION.DIAG</span>
          <span className="text-[12px] opacity-75 font-mono text-[var(--term-green-text)] hidden sm:inline">
            // CIRCUIT SPEC: 120V
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-mono shrink-0">
          <span className={store.diagnosticPassed ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
            {store.diagnosticPassed ? "● LINE: STABILIZED" : "▲ LINE: DAMAGED"}
          </span>
        </div>
      </div>

      {/* ── 2. Locked Warning or Full Interactive Diagnostic Hardware ── */}
      {!store.consoleUnlocked ? (
        <div className="flex-1 border-2 border-[var(--term-outline-green)] bg-[#040e07] p-8 flex flex-col justify-between font-mono">
          <div>
            <div className="text-[20px] font-bold text-[var(--term-green-text-bright)] tracking-wider mb-2">
              TRANSMISSION LINE TELEMETRY // LOCKED
            </div>
            <div className="text-[13px] text-amber-400 mb-6 flex items-center gap-2">
              <span>🔒</span>
              <span>
                AWAITING WALKWAY RELAY SCANS ({store.scannedNodeIds.length} / 6 NODES SCANNED)
              </span>
            </div>
            <div className="text-[15px] text-[var(--term-green-text)] leading-relaxed space-y-4">
              <p>
                The transmission diagnostic subroutines require current sensor calibration from all
                6 physical relay nodes along the power conduit line.
              </p>
              <p>
                Exit the terminal, navigate down the starboard walkway, and use the ping scanner
                [E / F] to inspect each node (R1 through R6).
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--term-outline-green)]/40 pt-4 flex-wrap gap-2">
            <span className="text-xs text-[var(--term-green-text)] opacity-70">
              PRESS [Q] OR ESC TO EXIT TERMINAL
            </span>
            {process.env.NODE_ENV !== "production" && (
              <button
                type="button"
                onClick={() => {
                  diagnosticSound.playSwitchClack();
                  relayStore.markAllScannedForTesting();
                }}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#0f2e18] text-[#5dfa87] border border-[#178a38] hover:bg-[#1a4a27] hover:border-[#5dfa87] transition-all cursor-pointer shadow-sm active:scale-95"
                title="Dev test shortcut: scan all 6 nodes and unlock console"
              >
                ⚡ [DEV] UNLOCK ALL 6 NODES
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="diag-terminal-container" data-reduce-motion={reducedMotion}>
          {/* A. Circuit Schematic Row (8-Column Grid) */}
          <SchematicRow
            config={store.diagnosticConfig}
            scannedNodeIds={store.scannedNodeIds}
            testActive={isTesting}
            testProgress={testProgress}
            failingNodeId={failingNodeId}
            reduceMotion={reducedMotion}
          />

          {/* B. Switch Row (8-Column Grid strictly aligned with Schematic) */}
          <div className="diag-switch-grid">
            <div className="diag-grid-spacer" /> {/* Col 0 under SRC */}

            {RELAY_NODES.map((node) => {
              const isScanned = store.scannedNodeIds.includes(node.id);
              const nodeCfg = store.diagnosticConfig[node.id] || { mode: "connect" };
              return (
                <div key={node.id} className="flex justify-center items-center">
                  <ThreeWaySwitch
                    nodeId={node.id}
                    label={node.label}
                    mode={nodeCfg.mode}
                    patchValue={nodeCfg.patchValue}
                    isScanned={isScanned}
                    onChangeMode={(m) => handleModeChange(node.id, m)}
                    onAnnounce={setAnnouncement}
                    reduceMotion={reducedMotion}
                  />
                </div>
              );
            })}

            <div className="diag-grid-spacer" /> {/* Col 7 under ANTENNA */}
          </div>

          {/* C. Transmission Packet Payload Strip (8-Column Grid strictly aligned) */}
          <PacketStrip
            config={store.diagnosticConfig}
            scannedNodeIds={store.scannedNodeIds}
          />

          {/* D. Bottom Deck: Patch Panel + Result Bar + Test Lever */}
          <div className="diag-bottom-deck">
            <PatchPanel
              config={store.diagnosticConfig}
              onUpdatePatchValue={handlePatchValueChange}
              reduceMotion={reducedMotion}
            />

            <ResultBar
              isTesting={isTesting}
              result={store.lastResult}
              config={store.diagnosticConfig}
              onContinue={onClose}
              onReset={() => relayStore.resetTransmissionTest()}
            />

            <TestLever
              isTesting={isTesting}
              onPull={handleRunTest}
              reduceMotion={reducedMotion}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TransmissionTerminalSection;
