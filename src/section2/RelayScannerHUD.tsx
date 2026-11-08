"use client";
/**
 * src/section2/RelayScannerHUD.tsx — Section 2 Relay Scanner HUD & Dialogue
 * =========================================================================
 * Displays:
 * 1. Target Proximity Scan card when aiming at a node within 4.0 units
 * 2. Circular hold progress indicator around crosshair (0.9s)
 * 3. Bottom 6-chip status strip (R1..R6)
 * 4. Story beat dialogue cards with radio audio chirps
 */
import React, { useEffect, useState, useSyncExternalStore } from "react";
import { relayStore } from "./relayStore";
import { SECTION2_NODES } from "./section2.config";
import { taskStore } from "../ui/tasks/taskStore";
import { pendriveStore } from "../ui/terminal/pendriveStore";
import { telemetryStore } from "../components/telemetry/telemetryStore";
import { isImagesValidated } from "./section2Dev";
import DialogueBox from "../scenes/scene2/Dialogue";

const ORACLE_TASK1_LINES = [
  {
    id: "task1_oracle_1",
    speaker: "ORACLE",
    text: "Task 1 completed! Celestial telemetry verified and committed to memory.",
    radio: true,
  },
  {
    id: "task1_oracle_2",
    speaker: "ORACLE",
    text: "WHAT TO DO NEXT: Walk down the cargo bay walkway and scan each of the 6 power relays (R1 to R6).",
    radio: true,
  },
  {
    id: "task1_oracle_3",
    speaker: "ORACLE",
    text: "WHY: The power line to our roof antenna is damaged. We need each relay's reading to find the fault, patch the circuit, and transmit our data.",
    radio: true,
  },
];

export function RelayScannerHUD() {
  const isImagesDone = useSyncExternalStore(
    (cb) => {
      const u1 = pendriveStore.subscribe(cb);
      const u2 = telemetryStore.subscribe(cb);
      return () => {
        u1();
        u2();
      };
    },
    () => isImagesValidated(),
    () => isImagesValidated()
  );

  const storeState = useSyncExternalStore(
    (cb) => relayStore.subscribe(cb),
    () => relayStore.getState(),
    () => relayStore.getState()
  );

  const [oracleDismissed, setOracleDismissed] = useState(false);
  const [oracleStep, setOracleStep] = useState(0);

  const handleDismissOracle = () => {
    setOracleDismissed(true);
    relayStore.markDialogue("oracleIntro");
  };

  // Prune floating AR tags timer
  useEffect(() => {
    const interval = setInterval(() => {
      relayStore.pruneExpiredTags();
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Update task in taskStore
  useEffect(() => {
    const scannedCount = storeState.scannedNodeIds.length;
    taskStore.registerTask({
      id: "relay-scan",
      title: "SCAN RELAY LINE",
      location: "CARGO BAY FLOOR",
      state: scannedCount >= 6 ? "done" : "available",
      progress: scannedCount,
      total: 6,
    });
  }, [storeState.scannedNodeIds.length]);

  // If Phase 1 images are not yet validated, do not activate HUD
  if (!isImagesDone) {
    return null;
  }

  const showOracleBriefing = !storeState.dialogueTriggered.oracleIntro && !oracleDismissed;

  const activeTargetNode = SECTION2_NODES.find(
    (n) => n.id === storeState.activeTargetNodeId
  );
  const isTargetScanned = storeState.activeTargetNodeId
    ? storeState.scannedNodeIds.includes(storeState.activeTargetNodeId)
    : false;

  return (
    <div className="pointer-events-none select-none font-mono text-xs">
      {/* ── 1. ORACLE BRIEFING DIALOGUE (Using Authentic Scene 1/2 DialogueBox Layout) ── */}
      {showOracleBriefing && (
        <div className="pointer-events-auto">
          <DialogueBox
            currentLine={ORACLE_TASK1_LINES[oracleStep]}
            onAdvance={() => {
              if (oracleStep < ORACLE_TASK1_LINES.length - 1) {
                setOracleStep((s) => s + 1);
              } else {
                handleDismissOracle();
              }
            }}
            onSkip={handleDismissOracle}
            isInteractive={true}
            showAdvancePrompt={true}
          />
        </div>
      )}

      {/* ── 2. ACTIVE TARGET SCAN PROMPT PILL (Hidden during dialogue to prevent overlap) ── */}
      {activeTargetNode && !isTargetScanned && !storeState.scanningNodeId && !showOracleBriefing && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-black/90 border-2 border-cyan-400 text-cyan-300 font-mono text-xs tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,255,255,0.45)] backdrop-blur-md flex items-center gap-2 pointer-events-none animate-in fade-in duration-150">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>PRESS [E / F] TO SCAN RELAY NODE {activeTargetNode.label}</span>
        </div>
      )}

      {/* ── 3. RADIAL SCAN RING PROGRESS (Around Crosshair) ─────── */}
      {storeState.scanningNodeId && storeState.scanProgress > 0 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center">
          <svg className="w-20 h-20 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="32"
              className="stroke-cyan-950/50"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              className="stroke-cyan-400"
              strokeWidth="4"
              strokeDasharray={201}
              strokeDashoffset={201 * (1 - storeState.scanProgress)}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div className="mt-2 px-2 py-0.5 bg-black/80 border border-cyan-400/50 rounded text-[10px] text-cyan-300">
            SCANNING {storeState.scanningNodeId}... {Math.round(storeState.scanProgress * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
