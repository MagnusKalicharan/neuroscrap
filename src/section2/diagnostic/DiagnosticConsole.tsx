"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import "./diagnostic.css";
import { RELAY_NODES } from "../nodeData";
import { evaluateConfig, type RelayConfig, type RelayMode, type EvaluationResult } from "../evaluateConfig";
import { relayStore, useRelayStore } from "../relayStore";
import { section2Events } from "../section2Events";
import { diagnosticSound } from "./sound";
import { SchematicRow } from "./SchematicRow";
import { ThreeWaySwitch } from "./ThreeWaySwitch";
import { PacketStrip } from "./PacketStrip";
import { PatchPanel } from "./PatchPanel";
import { TestLever } from "./TestLever";
import { ResultBar } from "./ResultBar";

export interface DiagnosticConsoleProps {
  open: boolean;
  onClose: (reason?: "back" | "pass") => void;
  onSwitchToIntake?: () => void;
  reducedMotion?: boolean;
  greyscale?: boolean;
}

export function DiagnosticConsole({
  open,
  onClose,
  onSwitchToIntake,
  reducedMotion = false,
  greyscale = false,
}: DiagnosticConsoleProps) {
  const store = useRelayStore();
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Testing animation states
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const testAnimRef = useRef<number | null>(null);
  const testStartTimeRef = useRef<number>(0);
  const hasEmittedPassedRef = useRef(false);

  // Responsive scaling to fit window
  const updateScale = useCallback(() => {
    if (typeof window === "undefined") return;
    const paddingX = 40;
    const paddingY = 40;
    const availW = window.innerWidth - paddingX;
    const availH = window.innerHeight - paddingY;
    const s = Math.min(availW / 1280, availH / 720, 1.25);
    setScale(Math.max(0.45, s));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  // Audio power-on effect on open
  useEffect(() => {
    if (open) {
      diagnosticSound.playCrtPowerOn();
    }
    return () => {
      if (testAnimRef.current) {
        cancelAnimationFrame(testAnimRef.current);
      }
      diagnosticSound.fadeOutAndClose();
    };
  }, [open]);

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

    const currentCfg = relayStore.getState().diagnosticConfig;
    const evalResult = evaluateConfig(currentCfg);

    setIsTesting(true);
    setTestProgress(0);
    diagnosticSound.startTestHum();
    testStartTimeRef.current = performance.now();

    const DURATION = 1400; // 1.4 seconds

    const animate = (now: number) => {
      const elapsed = now - testStartTimeRef.current;
      const p = Math.min(1, elapsed / DURATION);
      setTestProgress(p);

      if (p < 1) {
        testAnimRef.current = requestAnimationFrame(animate);
      } else {
        // Test run concluded!
        diagnosticSound.stopTestHum();
        relayStore.recordAttempt(currentCfg, evalResult);

        if (evalResult.ok) {
          diagnosticSound.playPassChime();
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
          diagnosticSound.playFailBuzzer();
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
      // Instant execution under Reduce Motion
      diagnosticSound.stopTestHum();
      relayStore.recordAttempt(currentCfg, evalResult);

      if (evalResult.ok) {
        diagnosticSound.playPassChime();
        relayStore.setDiagnosticPassed(true);
        if (!hasEmittedPassedRef.current) {
          hasEmittedPassedRef.current = true;
          section2Events.emit("diagnostic-passed", {
            config: currentCfg,
            attempts: relayStore.getState().attempts,
          });
        }
      } else {
        diagnosticSound.playFailBuzzer();
      }
      setIsTesting(false);
    } else {
      testAnimRef.current = requestAnimationFrame(animate);
    }
  }, [isTesting, reducedMotion]);

  // Global Keybindings: Esc / Q to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
        e.preventDefault();
        diagnosticSound.fadeOutAndClose();
        onClose("back");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!open) return null;

  const failingNodeId = store.lastResult && !store.lastResult.ok
    ? store.lastResult.failure === "surge"
      ? "R3"
      : "R4"
    : null;

  return (
    <>
      {/* ── Small Viewport Warning (< 1024x600) ────────────────── */}
      <div className="diag-enlarge-warning" role="alert">
        <div className="diag-warning-box">
          <div className="text-2xl font-bold text-amber-400 font-mono">
            ⚠ DISPLAY VIEWPORT TOO COMPACT
          </div>
          <p className="text-sm">
            The Transmission Diagnostic hardware console requires at least
            1024x600 screen space. Please enlarge your browser window.
          </p>
        </div>
      </div>

      {/* ── Fullscreen Overlay Wrapper ─────────────────────────── */}
      <div
        className="diag-overlay-wrapper"
        data-greyscale={greyscale}
        data-reduce-motion={reducedMotion}
        role="dialog"
        aria-modal="true"
        aria-label="Transmission Diagnostic System"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Screen Reader Live Announcements */}
        <div className="sr-only" aria-live="assertive">
          {announcement}
        </div>

        {/* ── 1280x720 Uniform Scaled CRT Stage ────────────────── */}
        <div
          ref={stageRef}
          className="diag-stage"
          style={{ transform: `scale(${scale})` }}
        >
          {/* Hex Corner Bolts */}
          <div className="diag-bolt diag-bolt-tl" aria-hidden="true" />
          <div className="diag-bolt diag-bolt-tr" aria-hidden="true" />
          <div className="diag-bolt diag-bolt-bl" aria-hidden="true" />
          <div className="diag-bolt diag-bolt-br" aria-hidden="true" />

          {/* CRT Effects */}
          <div className="diag-scanlines" aria-hidden="true" />
          <div className="diag-vignette" aria-hidden="true" />

          {/* ── Top Tabs: Data Intake | Transmission Diagnostic ── */}
          <div className="diag-tab-strip">
            <button
              type="button"
              className={`diag-tab ${store.activeStationTab === "intake" ? "active" : ""}`}
              onClick={() => {
                diagnosticSound.playSwitchClack();
                relayStore.setActiveStationTab("intake");
                onSwitchToIntake?.();
              }}
            >
              <span>📁</span>
              <span>DATA INTAKE</span>
            </button>

            <button
              type="button"
              className={`diag-tab ${store.activeStationTab === "diagnostic" ? "active" : ""}`}
              disabled={!store.consoleUnlocked}
              onClick={() => {
                diagnosticSound.playSwitchClack();
                relayStore.setActiveStationTab("diagnostic");
              }}
            >
              <span>{store.consoleUnlocked ? "⚡" : "🔒"}</span>
              <span>TRANSMISSION DIAGNOSTIC</span>
            </button>
          </div>

          {/* ── Header Bar ───────────────────────────────────────── */}
          <header className="diag-header">
            <div className="diag-header-title">
              <span>TRANSMISSION DIAGNOSTIC</span>
              <span className="diag-header-serial">SERIAL: TX-DIAG</span>
            </div>

            <div
              className={`diag-header-status ${
                store.diagnosticPassed ? "ready" : "damaged"
              }`}
            >
              <span>{store.diagnosticPassed ? "📶" : "⚡"}</span>
              <span>
                {store.diagnosticPassed ? "LINE: STABILIZED" : "LINE: DAMAGED"}
              </span>
            </div>
          </header>

          {/* ── Main Interactive Schematic & Controls ────────────── */}
          <main className="diag-main">
            {/* 1. Circuit Schematic Row */}
            <SchematicRow
              config={store.diagnosticConfig}
              scannedNodeIds={store.scannedNodeIds}
              testActive={isTesting}
              testProgress={testProgress}
              failingNodeId={failingNodeId}
              reduceMotion={reducedMotion}
            />

            {/* 2. Switch Row (Directly beneath node blocks) */}
            <div className="diag-switch-row">
              <div className="diag-switch-spacer" /> {/* Aligns with Source */}

              {RELAY_NODES.map((node) => {
                const isScanned = store.scannedNodeIds.includes(node.id);
                const nodeCfg = store.diagnosticConfig[node.id] || { mode: "connect" };
                return (
                  <ThreeWaySwitch
                    key={node.id}
                    nodeId={node.id}
                    label={node.label}
                    mode={nodeCfg.mode}
                    patchValue={nodeCfg.patchValue}
                    isScanned={isScanned}
                    onChangeMode={(m) => handleModeChange(node.id, m)}
                    onAnnounce={setAnnouncement}
                    reduceMotion={reducedMotion}
                  />
                );
              })}

              <div className="diag-switch-spacer" /> {/* Aligns with Antenna */}
            </div>

            {/* 3. Transmission Packet Payload Strip */}
            <PacketStrip
              config={store.diagnosticConfig}
              scannedNodeIds={store.scannedNodeIds}
            />

            {/* 4. Bottom Deck: Patch Panel + Result Bar + Test Lever */}
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
                onContinue={() => {
                  diagnosticSound.fadeOutAndClose();
                  onClose("pass");
                }}
              />

              <TestLever
                isTesting={isTesting}
                onPull={handleRunTest}
                reduceMotion={reducedMotion}
              />
            </div>
          </main>

          {/* ── Footer ───────────────────────────────────────────── */}
          <footer className="diag-footer">
            <span className="diag-footer-hints font-mono">
              ◄ ► CHANGE SWITCH ..... ▲▼ DIAL ..... ENTER PULL LEVER ..... Q BACK
            </span>

            <button
              type="button"
              className="diag-footer-close-btn"
              onClick={() => {
                diagnosticSound.fadeOutAndClose();
                onClose("back");
              }}
              title="Close Diagnostic Console"
            >
              <span>✕</span>
              <span>EXIT [Q]</span>
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}

export default DiagnosticConsole;
