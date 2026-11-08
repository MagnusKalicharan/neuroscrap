"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useTelemetryStore,
  telemetryStore,
  type TelemetryScan,
} from "./telemetryStore";
import { OraclePortrait, ScrapPortrait } from "../../scenes/scene2/Dialogue";
import { shipAudio } from "../../audio/shipAudio";
import { CelestialSnapshot } from "./CelestialSnapshot";
import { SevastopolTerminal } from "../terminal/SevastopolTerminal";

interface CrewTerminalModalProps {
  onClose: () => void;
  onBeaconTransmitted?: () => void;
}

export function CrewTerminalModal({
  onClose,
  onBeaconTransmitted,
}: CrewTerminalModalProps) {
  const { scans, maxScans, analysisOutcome, activeDialogueKey, dialogueIndex } =
    useTelemetryStore();

  const [activeTab, setActiveTab] = useState<"pendrive" | "sevastopol">("pendrive");
  const [activeFolder, setActiveFolder] = useState<"system" | "pendrive">(
    "pendrive"
  );
  const [selectedScan, setSelectedScan] = useState<TelemetryScan | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [beaconSent, setBeaconSent] = useState(false);
  const [expandedSnapshot, setExpandedSnapshot] = useState(false);

  // Auto-select first scan if available
  useEffect(() => {
    if (scans.length > 0 && !selectedScan) {
      setSelectedScan(scans[0]);
    }
  }, [scans, selectedScan]);

  // Breakdown statistics
  const countHole = useMemo(
    () => scans.filter((s) => s.category === "black_hole").length,
    [scans]
  );
  const countPlanet = useMemo(
    () => scans.filter((s) => s.category === "planet").length,
    [scans]
  );
  const countStars = useMemo(
    () => scans.filter((s) => s.category === "stars").length,
    [scans]
  );

  // Dialogue lines configuration
  const DIALOGUES = {
    briefing: [
      {
        speaker: "ORACLE",
        isOracle: true,
        text: "Pendrive mounted. I need 10 diverse sky telemetry points to calculate a clean distress beacon corridor.",
      },
    ],
    bias_failure: [
      {
        speaker: "ORACLE",
        isOracle: true,
        text: "You have only taken these types of images more. The sample is biased.",
      },
    ],
    representative_success: [
      {
        speaker: "ORACLE",
        isOracle: true,
        text: "Sample verified! You have a balanced mix of Black Hole, Planet, and Star images.",
      },
    ],
  };

  const currentDialogueList = activeDialogueKey ? DIALOGUES[activeDialogueKey] : [];
  const currentDialogue =
    currentDialogueList.length > 0
      ? currentDialogueList[Math.min(dialogueIndex, currentDialogueList.length - 1)]
      : null;

  const handleRunSimulation = () => {
    shipAudio.playConsoleBeep();
    setIsSimulating(true);

    setTimeout(() => {
      setIsSimulating(false);
      telemetryStore.evaluatePendriveData();
    }, 1200);
  };

  const handleFormatPendrive = () => {
    shipAudio.playConsoleBeep();
    telemetryStore.formatPendrive();
    setSelectedScan(null);
  };

  const handleTransmitBeacon = () => {
    shipAudio.playConsoleBeep();
    setBeaconSent(true);
    onBeaconTransmitted?.();
  };

  // If user selected Sevastopol mode, render authentic retro green CRT
  if (activeTab === "sevastopol") {
    return (
      <div className="relative z-50">
        <SevastopolTerminal
          onClose={() => setActiveTab("pendrive")}
          onSelectFolder={(f) => {
            if (f === "UTILITY") {
              setActiveTab("pendrive");
            }
          }}
        />
        {/* Quick return button to Telemetry Pendrive */}
        <div className="fixed top-4 right-5 z-50">
          <button
            onClick={() => setActiveTab("pendrive")}
            className="px-3 py-1.5 bg-[#051005] hover:bg-[#0e2c0e] border-2 border-[#1de840] text-[#1de840] text-xs font-mono font-bold tracking-wider rounded transition-all cursor-pointer shadow-[0_0_15px_rgba(29,232,64,0.4)]"
          >
            ◀ BACK TO TELEMETRY PENDRIVE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none font-mono">
      {/* ── Main Terminal Shell ─────────────────────────────────── */}
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[850px] bg-[#070b12] border-2 border-cyan-500/50 rounded-xl shadow-[0_0_50px_rgba(25,240,255,0.2)] flex flex-col overflow-hidden">
        {/* Subtle scanline overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-40 z-10" />

        {/* ── Top Bar ───────────────────────────────────────────── */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#0d1624] border-b border-cyan-500/30 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#19f0ff]" />
            <span className="text-cyan-300 font-bold tracking-wider truncate">
              ORACLE OS // CREW QUARTERS TERMINAL (STATION-PC)
            </span>
            <span className="text-neutral-500 hidden sm:inline">|</span>
            <span className="text-neutral-400 hidden sm:inline text-[11px]">
              PORT: <span className="text-amber-400 font-bold">USB-01 [PENDRIVE DETECTED]</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab: Sevastopol Retro CRT */}
            <button
              onClick={() => {
                shipAudio.playConsoleBeep();
                setActiveTab("sevastopol");
              }}
              className="px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(34,197,94,0.25)]"
              title="Open Sevastopol Retro Phosphor CRT Terminal"
            >
              <span>📟</span> SEVASTOPOL TERMINAL
            </button>

            {/* Eject & Close button */}
            <button
              onClick={() => {
                shipAudio.playConsoleBeep();
                onClose();
              }}
              className="px-3 py-1 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 rounded text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            >
              <span>✕</span> EJECT & CLOSE
            </button>
          </div>
        </div>

        {/* ── Middle Split Pane (Drives, Files, Simulation, Snapshots) ── */}
        <div className="relative z-20 flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-0">
          
          {/* ── Left Column: Drives & Folders (3 Cols) ─────────── */}
          <div className="md:col-span-3 bg-[#0a101b] border-r border-cyan-500/20 p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold px-1 mb-1">
              Mounted Storage Units
            </div>

            {/* Pendrive Folder Button (Highlighted) */}
            <button
              onClick={() => {
                shipAudio.playConsoleBeep();
                setActiveFolder("pendrive");
              }}
              className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                activeFolder === "pendrive"
                  ? "bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(25,240,255,0.25)]"
                  : "bg-black/40 border-neutral-800 text-neutral-400 hover:border-cyan-500/40 hover:text-neutral-200"
              }`}
            >
              <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-base flex-shrink-0">
                🖴
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">D:\ TELEMETRY_DRIVE</div>
                <div className="text-[10px] text-cyan-400/80">
                  {scans.length} / {maxScans} SCANS STORED
                </div>
              </div>
            </button>

            {/* System Drive (Clickable: Opens Sevastopol Terminal) */}
            <button
              onClick={() => {
                shipAudio.playConsoleBeep();
                setActiveTab("sevastopol");
              }}
              className="w-full p-2.5 rounded-lg border border-neutral-800 bg-black/40 text-neutral-400 hover:border-emerald-500/50 hover:text-emerald-300 text-left transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-8 h-8 rounded bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base flex-shrink-0">
                📟
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">C:\ STARSHIP_CORE</div>
                <div className="text-[10px] text-emerald-400/80">SEVASTOPOL LOG ARCHIVE ▶</div>
              </div>
            </button>

            {/* Pendrive Hardware Health Card */}
            <div className="mt-auto p-3 bg-black/60 rounded-lg border border-neutral-800/80 text-[11px] space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>BUFFER CAPACITY</span>
                <span className="text-cyan-400 font-bold">{scans.length * 10}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_#19f0ff]"
                  style={{ width: `${(scans.length / maxScans) * 100}%` }}
                />
              </div>
              <div className="text-[10px] text-neutral-500 truncate">
                SERIAL: FLASH-NVME-SCRAP-04
              </div>
            </div>
          </div>

          {/* ── Center Column: Pendrive Folder Content (5 Cols) ─── */}
          <div className="md:col-span-5 bg-[#070b12] border-r border-cyan-500/20 p-3.5 flex flex-col overflow-hidden min-h-0">
            {/* Folder Header Breadcrumb */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <span className="text-amber-400 font-bold">D:\</span>
                <span>▶</span>
                <span className="text-cyan-300 font-bold">PENDRIVE_ROOT</span>
                <span>▶</span>
                <span className="text-white">SCANS\</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-bold">
                {scans.length} ITEMS
              </span>
            </div>

            {/* Dataset Breakdown Counters */}
            <div className="grid grid-cols-3 gap-2 mb-2.5 text-center text-xs">
              <div className="p-1.5 bg-red-950/30 border border-red-500/30 rounded">
                <div className="text-[10px] text-red-300">BLACK HOLE</div>
                <div className="text-sm font-bold text-red-400">{countHole}</div>
              </div>
              <div className="p-1.5 bg-cyan-950/30 border border-cyan-500/30 rounded">
                <div className="text-[10px] text-cyan-300">PLANETS</div>
                <div className="text-sm font-bold text-cyan-400">{countPlanet}</div>
              </div>
              <div className="p-1.5 bg-amber-950/30 border border-amber-500/30 rounded">
                <div className="text-[10px] text-amber-300">STARS</div>
                <div className="text-sm font-bold text-amber-400">{countStars}</div>
              </div>
            </div>

            {/* File List in Pendrive Folder */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-0">
              {scans.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-xs">
                  <span className="text-3xl mb-2">📁</span>
                  <p className="font-bold text-neutral-400">PENDRIVE IS EMPTY</p>
                  <p className="mt-1 text-[11px]">
                    Walk outside the breach, look at the sky, and press [E] to capture 10 telemetry points.
                  </p>
                </div>
              ) : (
                scans.map((scan, i) => {
                  const isSelected = selectedScan?.id === scan.id;
                  const badgeColor =
                    scan.category === "black_hole"
                      ? "text-red-400 bg-red-950/50 border-red-500/40"
                      : scan.category === "planet"
                      ? "text-cyan-300 bg-cyan-950/50 border-cyan-500/40"
                      : "text-amber-300 bg-amber-950/50 border-amber-500/40";

                  return (
                    <div
                      key={scan.id}
                      onClick={() => {
                        shipAudio.playConsoleBeep();
                        setSelectedScan(scan);
                      }}
                      className={`p-2 rounded border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_10px_rgba(25,240,255,0.2)]"
                          : "bg-black/40 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-neutral-500 text-[10px] font-mono">
                          #{String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-bold truncate">{scan.filename}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border font-mono tracking-wider ${badgeColor}`}
                      >
                        {scan.category === "black_hole"
                          ? "SINGULARITY"
                          : scan.category === "planet"
                          ? "PLANETARY"
                          : "DEEP_SPACE"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Action in Center Column */}
            <div className="pt-2.5 mt-2 border-t border-cyan-500/20">
              <button
                disabled={scans.length < maxScans || isSimulating}
                onClick={handleRunSimulation}
                className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                  scans.length >= maxScans
                    ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(25,240,255,0.4)]"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
                }`}
              >
                {isSimulating ? (
                  <>
                    <span className="animate-spin">⚙</span> RUNNING SIMULATION MODEL...
                  </>
                ) : (
                  <>
                    <span>⚡</span> RUN TRAJECTORY SIMULATION MODEL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Right Column: Photographic Telemetry Screenshot & Simulation (4 Cols) ── */}
          <div className="md:col-span-4 bg-[#0a101b] p-3.5 flex flex-col overflow-y-auto space-y-3 min-h-0">
            
            {/* 1. Celestial Visual Snapshot (The Photographic Capture requested by User) */}
            <div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold pb-1.5 flex items-center justify-between">
                <span>Celestial Optical Snapshot</span>
                <span className="text-cyan-400 text-[9px] font-mono">SENSOR ACTIVE</span>
              </div>
              <CelestialSnapshot
                scan={selectedScan}
                onExpand={() => setExpandedSnapshot(true)}
              />
            </div>

            {/* 2. Trajectory Simulation Engine & Graph */}
            <div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold pb-1.5 flex items-center justify-between">
                <span>Trajectory Simulation Engine</span>
                <span className="text-[9px] text-neutral-500">GRAV-VECTOR</span>
              </div>

              <div className="relative w-full h-36 bg-black rounded-lg border border-cyan-500/30 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(25,240,255,0.08)_0%,_transparent_75%)]" />

                {/* Wireframe Grid */}
                <svg className="w-full h-full opacity-60" viewBox="0 0 200 120">
                  <line x1="0" y1="60" x2="200" y2="60" stroke="#1a2733" strokeWidth="1" />
                  <line x1="100" y1="0" x2="100" y2="120" stroke="#1a2733" strokeWidth="1" />
                  <circle cx="100" cy="60" r="35" stroke="#1a2733" strokeWidth="0.8" fill="none" />

                  {/* Target Nodes based on Data */}
                  {/* Black hole node */}
                  <circle
                    cx="100"
                    cy="45"
                    r={10 + countHole}
                    fill="none"
                    stroke={analysisOutcome === "sampling_bias" ? "#ff2e88" : "#ff9a1f"}
                    strokeWidth="1.5"
                    className={analysisOutcome ? "animate-pulse" : ""}
                  />
                  <circle cx="100" cy="45" r="4" fill="#000000" stroke="#ff2e88" strokeWidth="1" />

                  {/* Planets node */}
                  <circle cx="150" cy="75" r="8" fill="none" stroke="#19f0ff" strokeWidth="1.2" />

                  {/* Stars nodes */}
                  <circle cx="35" cy="25" r="1.5" fill="#fff4e0" />
                  <circle cx="45" cy="85" r="1.5" fill="#fff4e0" />
                  <circle cx="165" cy="25" r="1.5" fill="#fff4e0" />

                  {/* Trajectory Vector Curve */}
                  {analysisOutcome === "sampling_bias" && (
                    <path
                      d="M 20 100 Q 70 85 96 48"
                      fill="none"
                      stroke="#ff2e88"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                    />
                  )}
                  {analysisOutcome === "representative_sample" && (
                    <path
                      d="M 20 100 Q 80 80 120 50 T 185 15"
                      fill="none"
                      stroke="#19f0ff"
                      strokeWidth="2.5"
                      strokeDasharray="100"
                      strokeDashoffset="0"
                    />
                  )}
                </svg>

                {/* Status overlay on simulation */}
                <div className="absolute bottom-1.5 left-2 right-2 text-[10px] flex justify-between px-2 py-0.5 bg-black/85 rounded border border-neutral-800">
                  <span className="text-neutral-400">STATUS:</span>
                  <span
                    className={
                      analysisOutcome === "representative_sample"
                        ? "text-cyan-400 font-bold"
                        : analysisOutcome === "sampling_bias"
                        ? "text-red-400 font-bold"
                        : "text-amber-400"
                    }
                  >
                    {analysisOutcome === "representative_sample"
                      ? "SLINGSHOT CORRIDOR OPEN"
                      : analysisOutcome === "sampling_bias"
                      ? "GRAVITATIONAL COLLAPSE"
                      : "AWAITING TELEMETRY EXECUTION"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Analysis Result Banner & Lesson */}
            {analysisOutcome === "sampling_bias" && (
              <div className="p-3 bg-red-950/40 border-2 border-red-500/70 rounded-lg text-xs space-y-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <div className="flex items-center gap-2 text-red-400 font-bold">
                  <span>⚠</span> SAMPLING BIAS DETECTED
                </div>
                <p className="text-red-200/90 text-[11px] leading-relaxed">
                  Your dataset is overwhelmingly skewed toward the high-gravity black hole (
                  {countHole}/10 scans). The routing algorithm assumed the entire sky is a black
                  hole and cannot calculate an exit window.
                </p>
                <div className="p-2 bg-black/60 rounded border border-red-500/30 text-[10px] text-neutral-300">
                  <span className="text-amber-400 font-bold">DATA SCIENCE LESSON:</span> When a
                  sample over-represents one extreme, the model develops severe bias and fails on the
                  real population.
                </div>
                <button
                  onClick={handleFormatPendrive}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,178,58,0.3)]"
                >
                  <span>↺</span> FORMAT PENDRIVE & RESCAN DIVERSE SKY
                </button>
              </div>
            )}

            {analysisOutcome === "representative_sample" && (
              <div className="p-3 bg-cyan-950/40 border-2 border-cyan-400/70 rounded-lg text-xs space-y-2 shadow-[0_0_20px_rgba(25,240,255,0.2)]">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <span>✔</span> REPRESENTATIVE SAMPLE VERIFIED
                </div>
                <p className="text-cyan-100 text-[11px] leading-relaxed">
                  Excellent work! Your sample captures the true distribution: high mass (
                  {countHole}), moderate planetary mass ({countPlanet}), and near-zero stellar voids
                  ({countStars}). The distress signal slingshot trajectory is 100% clear!
                </p>
                <div className="p-2 bg-black/60 rounded border border-cyan-400/30 text-[10px] text-neutral-200">
                  <span className="text-cyan-400 font-bold">DATA SCIENCE LESSON:</span> A
                  representative sample accurately reflects the true proportions and variety of the
                  target universe.
                </div>
                {!beaconSent ? (
                  <button
                    onClick={handleTransmitBeacon}
                    className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_20px_#19f0ff]"
                  >
                    <span>📡</span> TRANSMIT DISTRESS BEACON TO HOMEWORLD
                  </button>
                ) : (
                  <div className="p-2 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 rounded text-center font-bold text-xs animate-pulse">
                    BEACON TRANSMITTED ACROSS EVENT HORIZON!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Dedicated Dialogue Box (ZERO OVERLAP WITH CONTENT) ── */}
        <div className="relative z-20 bg-[#060a11] border-t-2 border-cyan-500/30 p-3 sm:p-4 flex items-center gap-3.5 min-h-[92px] max-h-[110px]">
          {currentDialogue ? (
            <>
              {currentDialogue.isOracle ? <OraclePortrait /> : <ScrapPortrait />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`font-bold text-xs tracking-wider ${
                      currentDialogue.isOracle ? "text-cyan-400" : "text-amber-400"
                    }`}
                  >
                    {currentDialogue.speaker}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-neutral-400">
                    COMMS CHANNEL 01
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-neutral-200 leading-snug line-clamp-2">
                  {currentDialogue.text}
                </p>
              </div>

              {currentDialogueList.length > 1 &&
                dialogueIndex < currentDialogueList.length - 1 && (
                  <button
                    onClick={() => {
                      shipAudio.playConsoleBeep();
                      telemetryStore.advanceDialogue();
                    }}
                    className="px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 text-xs rounded transition-all cursor-pointer flex-shrink-0"
                  >
                    NEXT ▶
                  </button>
                )}
            </>
          ) : (
            <div className="text-neutral-500 text-xs italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-600" />
              Terminal standby. Awaiting telemetry input from crew.
            </div>
          )}
        </div>
      </div>

      {/* ── High-Res Expanded Celestial Snapshot Modal ────────────────── */}
      {expandedSnapshot && selectedScan && (
        <div
          onClick={() => setExpandedSnapshot(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#070d17] border-2 border-cyan-400 rounded-xl p-4 shadow-[0_0_60px_rgba(25,240,255,0.4)]"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/40 text-xs">
              <span className="font-bold text-cyan-300">
                HIGH-RESOLUTION OPTICAL SENSOR CAPTURE // {selectedScan.filename}
              </span>
              <button
                onClick={() => setExpandedSnapshot(false)}
                className="px-2 py-0.5 bg-red-950 border border-red-500 text-red-300 rounded text-xs cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>
            <CelestialSnapshot scan={selectedScan} className="!h-80" />
          </div>
        </div>
      )}
    </div>
  );
}
