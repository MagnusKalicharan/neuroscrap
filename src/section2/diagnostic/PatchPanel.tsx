"use client";

import React, { useState } from "react";
import type { RelayConfig } from "../evaluateConfig";
import { RotaryDial } from "./RotaryDial";
import { StationCalculator } from "./StationCalculator";
import { diagnosticSound } from "./sound";

interface PatchPanelProps {
  config: RelayConfig;
  onUpdatePatchValue: (nodeId: string, val: number) => void;
  reduceMotion?: boolean;
}

export function PatchPanel({
  config,
  onUpdatePatchValue,
  reduceMotion = false,
}: PatchPanelProps) {
  const activeNodeId = "R4";
  const currentPatchValue = config[activeNodeId]?.patchValue ?? 120;
  const isPatched = config[activeNodeId]?.mode === "patch";

  const [activeTab, setActiveTab] = useState<"calc" | "dial">("calc");

  const handleNudge = (delta: number) => {
    diagnosticSound.playSwitchClack();
    const nextVal = Math.max(0, Math.min(150, currentPatchValue + delta));
    onUpdatePatchValue(activeNodeId, nextVal);
  };

  return (
    <div
      className="diag-patch-panel-container"
      aria-label="Node Patch Calibration Panel"
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="diag-patch-header">
        <div className="diag-patch-title">
          <span>🔧</span>
          <span>CALIBRATE: {activeNodeId}</span>
        </div>

        {/* Tab switch between Calculator and Dial */}
        <div className="diag-patch-tabs">
          <button
            type="button"
            className={`diag-patch-tab-btn ${activeTab === "calc" ? "active" : ""}`}
            onClick={() => {
              diagnosticSound.playSwitchClack();
              setActiveTab("calc");
            }}
          >
            🧮 CALCULATOR
          </button>
          <button
            type="button"
            className={`diag-patch-tab-btn ${activeTab === "dial" ? "active" : ""}`}
            onClick={() => {
              diagnosticSound.playSwitchClack();
              setActiveTab("dial");
            }}
          >
            🎛 DIAL
          </button>
        </div>
      </div>

      {/* ── Body: Calculator or Dial View ─────────────────────── */}
      <div className="flex-1 flex flex-col p-1 overflow-hidden min-h-0">
        {activeTab === "calc" ? (
          <StationCalculator
            targetNodeId={activeNodeId}
            onApplyValue={(val) => {
              onUpdatePatchValue(activeNodeId, val);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-around h-full gap-1.5 p-1 select-none">
            <RotaryDial
              value={currentPatchValue}
              onChange={(val) => onUpdatePatchValue(activeNodeId, val)}
              min={0}
              max={150}
              reduceMotion={reduceMotion}
            />

            {/* Quick Real-Time Nudge & Snap Buttons */}
            <div className="flex items-center gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => handleNudge(-10)}
                className="px-2 py-1 bg-[#142817] hover:bg-[#1d3d22] text-[#8bffab] border border-[#228b3f] rounded text-[11px] font-bold cursor-pointer active:scale-95"
                title="-10 Volts"
              >
                -10V
              </button>
              <button
                type="button"
                onClick={() => handleNudge(-1)}
                className="px-2 py-1 bg-[#142817] hover:bg-[#1d3d22] text-[#8bffab] border border-[#228b3f] rounded text-[11px] font-bold cursor-pointer active:scale-95"
                title="-1 Volt"
              >
                -1V
              </button>
              <button
                type="button"
                onClick={() => {
                  diagnosticSound.playSwitchClack();
                  onUpdatePatchValue(activeNodeId, 120);
                }}
                className="px-2.5 py-1 bg-[#051408] hover:bg-[#0c2e14] border border-[#22d952] rounded text-[#5dfa87] font-black text-xs font-mono cursor-pointer active:scale-95"
                title="Set to 120V nominal"
              >
                120V SET
              </button>
              <button
                type="button"
                onClick={() => handleNudge(1)}
                className="px-2 py-1 bg-[#142817] hover:bg-[#1d3d22] text-[#8bffab] border border-[#228b3f] rounded text-[11px] font-bold cursor-pointer active:scale-95"
                title="+1 Volt"
              >
                +1V
              </button>
              <button
                type="button"
                onClick={() => handleNudge(10)}
                className="px-2 py-1 bg-[#142817] hover:bg-[#1d3d22] text-[#8bffab] border border-[#228b3f] rounded text-[11px] font-bold cursor-pointer active:scale-95"
                title="+10 Volts"
              >
                +10V
              </button>
            </div>

            <div className="text-[10px] font-mono text-[#84b890] text-center">
              DRAG DIAL VERTICALLY / HORIZONTALLY OR SCROLL
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatchPanel;
