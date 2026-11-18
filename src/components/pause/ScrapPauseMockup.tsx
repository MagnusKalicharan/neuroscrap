"use client";

import React, { useState, useEffect } from "react";
import "../../styles/systemCoreTokens.css";

export type MockupTab = "resume" | "log" | "codex" | "settings" | "controls" | "quit";

export interface ScrapPauseMockupProps {
  initialTab?: MockupTab;
  viewport?: "1280x720" | "1024x600";
  onTabChange?: (tab: MockupTab) => void;
  onResume?: () => void;
  onQuit?: () => void;
}

export function ScrapPauseMockup({
  initialTab = "resume",
  viewport = "1280x720",
  onTabChange,
  onResume,
  onQuit,
}: ScrapPauseMockupProps) {
  const [activeTab, setActiveTab] = useState<MockupTab>(initialTab);
  const [selectedCodexNode, setSelectedCodexNode] = useState<string>("collect");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectTab = (tab: MockupTab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const isCompact = viewport === "1024x600";

  // Menu items list
  const menuItems: { id: MockupTab; keyNum: string; label: string }[] = [
    { id: "resume", keyNum: "1", label: "RESUME" },
    { id: "log", keyNum: "2", label: "LOG" },
    { id: "codex", keyNum: "3", label: "CODEX" },
    { id: "settings", keyNum: "4", label: "SETTINGS" },
    { id: "controls", keyNum: "5", label: "CONTROLS" },
    { id: "quit", keyNum: "6", label: "QUIT TO TITLE" },
  ];

  // System rows for RESUME view
  const systemRows = [
    { name: "MOTOR", online: true, fill: 5, total: 5, note: "LOCOMOTION CALIBRATED" },
    { name: "SENSORS", online: true, fill: 5, total: 5, note: "CELESTIAL INTAKE VALIDATED" },
    { name: "POWER", online: true, fill: 5, total: 5, note: "RELAY LINE PATCHED" },
    { name: "SIGNAL", online: false, fill: 2, total: 5, note: "CARRIER DECODING INCOMPLETE" },
    { name: "NEURAL CORE", online: false, fill: 0, total: 5, note: "WEIGHTS UNTRAINED (3%)" },
  ];

  // Codex graph nodes for CODEX view
  const codexNodes = [
    {
      id: "collect",
      step: 1,
      name: "DATA COLLECTION",
      section: "SECTION 1",
      unlocked: true,
      desc: "Gathering balanced celestial observation samples across orbital bodies.",
      diagramType: "histogram",
      x: 40,
      y: 90,
    },
    {
      id: "outlier",
      step: 2,
      name: "REPAIRING READING",
      section: "SECTION 2",
      unlocked: true,
      desc: "Discarding anomalous surge nodes to prevent bus collapse.",
      diagramType: "cutoff",
      x: 180,
      y: 50,
    },
    {
      id: "impute",
      step: 3,
      name: "FILLING GAPS",
      section: "SECTION 2",
      unlocked: true,
      desc: "Imputing severed sensor telemetry from adjacent clean baseline measurements.",
      diagramType: "interpolate",
      x: 180,
      y: 130,
    },
    {
      id: "features",
      step: 4,
      name: "CHOOSING MEASUREMENTS",
      section: "SECTION 3",
      unlocked: true,
      desc: "Extracting carrier wave mean and step difference to separate signal from noise.",
      diagramType: "scatter",
      x: 320,
      y: 90,
    },
    {
      id: "learn",
      step: 5,
      name: "NETWORK LEARNING",
      section: "SECTION 4",
      unlocked: false,
      desc: "",
      diagramType: "neural",
      x: 460,
      y: 60,
    },
    {
      id: "deploy",
      step: 6,
      name: "DEPLOYED FILTER",
      section: "SECTION 4",
      unlocked: false,
      desc: "",
      diagramType: "filter",
      x: 460,
      y: 130,
    },
  ];

  const activeCodexData = codexNodes.find((n) => n.id === selectedCodexNode) || codexNodes[0];

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden font-mono text-[var(--sc-text)] sc-backdrop-gradient"
      style={{
        width: isCompact ? "1024px" : "1280px",
        height: isCompact ? "600px" : "720px",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="SCRAP Pause Menu"
    >
      {/* ── 4 Corner Brackets (The ONLY frame on screen) ───────────────── */}
      <div
        className="absolute top-4 left-4 w-4 h-4 pointer-events-none"
        style={{ borderTop: "1px solid var(--sc-line)", borderLeft: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />
      <div
        className="absolute top-4 right-4 w-4 h-4 pointer-events-none"
        style={{ borderTop: "1px solid var(--sc-line)", borderRight: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-4 left-4 w-4 h-4 pointer-events-none"
        style={{ borderBottom: "1px solid var(--sc-line)", borderLeft: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-4 right-4 w-4 h-4 pointer-events-none"
        style={{ borderBottom: "1px solid var(--sc-line)", borderRight: "1px solid var(--sc-line)" }}
        aria-hidden="true"
      />

      {/* ── TOP STRIP (28 px, Hairline Below) ─────────────────────────── */}
      <header
        className="relative z-20 w-full h-[28px] px-8 flex items-center justify-between text-xs font-mono uppercase tracking-widest"
        style={{ borderBottom: "1px solid var(--sc-line)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--sc-accent-cyan)", boxShadow: "0 0 6px var(--sc-accent-cyan)" }}
          />
          <span className="font-bold text-[var(--sc-accent-cyan)] sc-glow-cyan tracking-[0.2em]">
            SCRAP-07 // PAUSED
          </span>
        </div>

        <div className="flex items-center gap-4 text-[var(--sc-dim)]">
          <span>ELAPSED: 04:18</span>
          <span style={{ color: "var(--sc-line)" }}>|</span>
          <span className="text-[var(--sc-accent-cyan)] font-bold">SIGNAL // DECK 3</span>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────── */}
      {!isCompact ? (
        /* Standard 1280x720 Two-Column Layout */
        <div className="relative w-full h-[calc(720px-28px-32px)] flex">
          {/* LEFT COLUMN (x 64 to 420): 6 stacked menu words with 64 px spacing */}
          <nav
            className="w-[420px] pl-16 pr-8 flex flex-col justify-center gap-12 z-10"
            role="navigation"
            aria-label="Pause Menu Tabs"
          >
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => selectTab(item.id)}
                  className="group relative flex items-center gap-4 cursor-pointer transition-all duration-150"
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  {/* Left 4px accent bar for selected item */}
                  <div
                    className="absolute -left-6 top-1/2 -translate-y-1/2 w-[4px] h-[36px] transition-all duration-140"
                    style={{
                      backgroundColor: isSelected ? "var(--sc-accent-cyan)" : "transparent",
                      boxShadow: isSelected ? "0 0 10px var(--sc-accent-cyan)" : "none",
                    }}
                  />

                  {/* Tiny number key (1-6) */}
                  <span
                    className="text-xs font-mono select-none"
                    style={{ color: isSelected ? "var(--sc-accent-cyan)" : "var(--sc-dim)" }}
                  >
                    0{item.keyNum}
                  </span>

                  {/* Word: 44px unselected, 52px selected */}
                  <div className="relative">
                    <span
                      style={{
                        fontFamily: "var(--font-condensed)",
                        fontSize: isSelected ? "52px" : "44px",
                        lineHeight: "1.0",
                        color: isSelected ? "var(--sc-core-white)" : "var(--sc-dim)",
                        letterSpacing: "0.08em",
                        fontWeight: isSelected ? 700 : 500,
                      }}
                      className={isSelected ? "sc-glow-white uppercase" : "uppercase hover:text-[var(--sc-text)]"}
                    >
                      {item.label}
                    </span>

                    {/* Chamfered underline that slides under selected word */}
                    {isSelected && (
                      <div
                        className="absolute -bottom-2 left-0 right-0 h-[2px] sc-chamfer-8"
                        style={{
                          backgroundColor: "var(--sc-accent-cyan)",
                          boxShadow: "0 0 8px var(--sc-accent-cyan)",
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* RIGHT AREA (x 480 to 1216): Content Panel */}
          <main className="flex-1 pr-16 pl-6 flex flex-col justify-center z-10 overflow-hidden">
            {/* ── TAB 1: RESUME VIEW ────────────────────────────────────── */}
            {activeTab === "resume" && (
              <div className="relative w-full flex items-center justify-between gap-8 animate-in fade-in duration-150">
                {/* SCRAP 280px tall line drawing */}
                <div className="relative w-[280px] h-[320px] flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 280 320"
                    className="w-[280px] h-[320px] overflow-visible"
                    aria-label="SCRAP Unit Line Blueprint"
                  >
                    {/* Head Antenna */}
                    <line x1="140" y1="28" x2="140" y2="48" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" />
                    <circle cx="140" cy="24" r="3.5" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />

                    {/* Chamfered Cube Head */}
                    <polygon
                      points="105,48 175,48 180,54 180,102 175,108 105,108 100,102 100,54"
                      stroke="var(--sc-accent-cyan)"
                      strokeWidth="1.5"
                      fill="rgba(11, 31, 42, 0.4)"
                    />

                    {/* Cyclopean Optical Eye / Visor */}
                    <circle cx="140" cy="78" r="14" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />
                    <circle cx="140" cy="78" r="5" fill="var(--sc-accent-cyan)" />

                    {/* Neck Struts */}
                    <line x1="130" y1="108" x2="130" y2="120" stroke="var(--sc-line)" strokeWidth="1.5" />
                    <line x1="150" y1="108" x2="150" y2="120" stroke="var(--sc-line)" strokeWidth="1.5" />

                    {/* Torso Chassis */}
                    <polygon
                      points="92,120 188,120 196,130 196,195 188,205 92,205 84,195 84,130"
                      stroke="var(--sc-accent-cyan)"
                      strokeWidth="1.5"
                      fill="rgba(11, 31, 42, 0.3)"
                    />

                    {/* Core Reactor Chamber (Center Chest) */}
                    <polygon
                      points="120,140 160,140 166,146 166,176 160,182 120,182 114,176 114,146"
                      stroke="var(--sc-warm)"
                      strokeWidth="1.2"
                      fill="none"
                    />
                    <circle cx="140" cy="161" r="7" stroke="var(--sc-warm)" strokeWidth="1.2" fill="rgba(255,154,31,0.2)" />

                    {/* Articulated Arms */}
                    {/* Left Arm */}
                    <polyline points="84,132 58,150 58,195 50,210" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />
                    <polyline points="46,214 50,210 54,214" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />
                    {/* Right Arm */}
                    <polyline points="196,132 222,150 222,195 230,210" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />
                    <polyline points="226,214 230,210 234,214" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />

                    {/* Articulated Legs */}
                    {/* Left Leg */}
                    <polyline points="110,205 110,250 102,285 88,285" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />
                    {/* Right Leg */}
                    <polyline points="170,205 170,250 178,285 192,285" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />

                    {/* ── 5 Hotspot Markers & Leader Lines (All cleanly pointing Right towards System Rows) ── */}
                    {/* 1. SENSORS (Head/Eye) */}
                    <circle cx="140" cy="78" r="3" fill="var(--sc-accent-cyan)" />
                    <polyline points="140,78 210,78 280,78" stroke="var(--sc-accent-cyan)" strokeWidth="1" strokeDasharray="3 3" fill="none" />

                    {/* 2. NEURAL CORE (Head Top Brain Core) */}
                    <circle cx="155" cy="54" r="3" fill="none" stroke="var(--sc-dim)" />
                    <polyline points="155,54 220,54 280,54" stroke="var(--sc-dim)" strokeWidth="1" strokeDasharray="3 3" fill="none" />

                    {/* 3. POWER (Reactor Chest) */}
                    <circle cx="140" cy="161" r="3" fill="var(--sc-accent-cyan)" />
                    <polyline points="140,161 220,161 280,161" stroke="var(--sc-accent-cyan)" strokeWidth="1" strokeDasharray="3 3" fill="none" />

                    {/* 4. SIGNAL (Shoulder Comms) */}
                    <circle cx="196" cy="132" r="3" fill="none" stroke="var(--sc-dim)" />
                    <polyline points="196,132 240,132 280,132" stroke="var(--sc-dim)" strokeWidth="1" strokeDasharray="3 3" fill="none" />

                    {/* 5. MOTOR (Hip/Leg) */}
                    <circle cx="170" cy="215" r="3" fill="var(--sc-accent-cyan)" />
                    <polyline points="170,215 230,215 280,215" stroke="var(--sc-accent-cyan)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  </svg>
                </div>

                {/* 5 System Rows + Status Telemetry */}
                <div className="flex-1 flex flex-col gap-6 max-w-[440px]">
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] font-mono text-[var(--sc-dim)] tracking-[0.2em] uppercase">
                      SURVIVOR SUBSYSTEM MATRIX
                    </span>

                    {/* Five System Rows */}
                    <div className="flex flex-col gap-3">
                      {systemRows.map((sys) => (
                        <div key={sys.name} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              {/* Marker: filled if online, hollow if offline */}
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{
                                  backgroundColor: sys.online ? "var(--sc-accent-cyan)" : "transparent",
                                  border: sys.online ? "none" : "1px solid var(--sc-dim)",
                                  boxShadow: sys.online ? "0 0 6px var(--sc-accent-cyan)" : "none",
                                }}
                              />
                              <span
                                className="font-bold tracking-wider"
                                style={{ color: sys.online ? "var(--sc-core-white)" : "var(--sc-dim)" }}
                              >
                                {sys.name}
                              </span>
                            </div>

                            <span
                              className="text-[11px] tracking-widest font-mono"
                              style={{ color: sys.online ? "var(--sc-accent-cyan)" : "var(--sc-dim)" }}
                            >
                              {sys.online ? "ONLINE" : "OFFLINE"}
                            </span>
                          </div>

                          {/* Hairline 5-segment bar */}
                          <div className="flex items-center gap-1.5 w-full">
                            {Array.from({ length: sys.total }).map((_, i) => (
                              <div
                                key={i}
                                className="h-[3px] flex-1 transition-all"
                                style={{
                                  backgroundColor:
                                    i < sys.fill
                                      ? sys.online
                                        ? "var(--sc-accent-cyan)"
                                        : "var(--sc-warm)"
                                      : "var(--sc-line)",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* System Repair % derived metric + Active Objective */}
                  <div
                    className="p-4 sc-chamfer-8 flex flex-col gap-2"
                    style={{
                      backgroundColor: "var(--sc-haze)",
                      border: "1px solid var(--sc-line)",
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--sc-dim)] tracking-wider uppercase">SYSTEM INTEGRITY</span>
                      <span className="font-black text-sm text-[var(--sc-accent-cyan)] sc-glow-cyan">
                        SYSTEM REPAIR 60%
                      </span>
                    </div>

                    <div className="pt-2" style={{ borderTop: "1px solid var(--sc-line)" }}>
                      <span className="text-[10px] text-[var(--sc-warm)] tracking-widest uppercase block mb-1">
                        NOW:
                      </span>
                      <div className="text-xs text-[var(--sc-text)] font-mono leading-relaxed">
                        CARGO DECK SIGNAL BENCH // EXTRACT FEATURES & DECODE RESCUE BEACON
                      </div>
                    </div>
                  </div>

                  {/* RESUME Action Prompt */}
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--sc-dim)] pt-1">
                    <span>PRESS [E / ENTER] TO RESUME SYSTEM</span>
                    <button
                      type="button"
                      onClick={onResume}
                      className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase transition-all cursor-pointer"
                      style={{
                        backgroundColor: "var(--sc-accent-cyan)",
                        color: "var(--sc-void)",
                      }}
                    >
                      RESUME
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: CODEX VIEW ────────────────────────────────────── */}
            {activeTab === "codex" && (
              <div className="relative w-full h-[520px] flex gap-8 items-center animate-in fade-in duration-150">
                {/* Left: Interactive Web of Concept Nodes (Outer Wilds Ship Log style) */}
                <div
                  className="relative w-[520px] h-[480px] rounded shrink-0 p-4"
                  style={{
                    backgroundColor: "rgba(11, 31, 42, 0.35)",
                    border: "1px solid var(--sc-line)",
                  }}
                >
                  <span className="text-[10px] font-mono text-[var(--sc-dim)] uppercase tracking-widest block mb-2">
                    KNOWLEDGE PIPELINE GRAPH // RECONSTRUCTED
                  </span>

                  <svg
                    viewBox="0 0 520 220"
                    className="w-full h-[240px] overflow-visible"
                    aria-label="Codex Concept Web"
                  >
                    {/* Connecting hairlines */}
                    {/* 1 -> 2 */}
                    <line x1="80" y1="90" x2="180" y2="50" stroke="var(--sc-accent-cyan)" strokeWidth="1" />
                    {/* 1 -> 3 */}
                    <line x1="80" y1="90" x2="180" y2="130" stroke="var(--sc-accent-cyan)" strokeWidth="1" />
                    {/* 2 -> 4 */}
                    <line x1="220" y1="50" x2="320" y2="90" stroke="var(--sc-accent-cyan)" strokeWidth="1" />
                    {/* 3 -> 4 */}
                    <line x1="220" y1="130" x2="320" y2="90" stroke="var(--sc-accent-cyan)" strokeWidth="1" />
                    {/* 4 -> 5 (Dashed locked line) */}
                    <line x1="360" y1="90" x2="460" y2="60" stroke="var(--sc-line)" strokeWidth="1" strokeDasharray="4 4" />
                    {/* 4 -> 6 (Dashed locked line) */}
                    <line x1="360" y1="90" x2="460" y2="130" stroke="var(--sc-line)" strokeWidth="1" strokeDasharray="4 4" />

                    {/* Render Nodes */}
                    {codexNodes.map((node) => {
                      const isSelected = selectedCodexNode === node.id;
                      return (
                        <g
                          key={node.id}
                          onClick={() => setSelectedCodexNode(node.id)}
                          className="cursor-pointer"
                        >
                          {/* Node circle */}
                          <circle
                            cx={node.x + 20}
                            cy={node.y}
                            r={isSelected ? 18 : 14}
                            stroke={
                              isSelected
                                ? "var(--sc-core-white)"
                                : node.unlocked
                                ? "var(--sc-accent-cyan)"
                                : "var(--sc-line)"
                            }
                            strokeWidth={isSelected ? 2 : 1.2}
                            fill={
                              node.unlocked
                                ? isSelected
                                  ? "var(--sc-accent-cyan)"
                                  : "var(--sc-haze)"
                                : "var(--sc-void)"
                            }
                            style={{
                              filter: isSelected ? "drop-shadow(0 0 6px var(--sc-accent-cyan))" : "none",
                            }}
                          />

                          {/* Icon / Glyph */}
                          <text
                            x={node.x + 20}
                            y={node.y + 4}
                            textAnchor="middle"
                            fontSize="11"
                            fontFamily="var(--font-mono)"
                            fontWeight="bold"
                            fill={
                              isSelected
                                ? "var(--sc-void)"
                                : node.unlocked
                                ? "var(--sc-core-white)"
                                : "var(--sc-dim)"
                            }
                          >
                            {node.unlocked ? `0${node.step}` : "?"}
                          </text>

                          {/* Node label below circle */}
                          {node.unlocked ? (
                            <text
                              x={node.x + 20}
                              y={node.y + 28}
                              textAnchor="middle"
                              fontSize="9"
                              fontFamily="var(--font-condensed)"
                              letterSpacing="0.05em"
                              fontWeight="600"
                              fill={isSelected ? "var(--sc-core-white)" : "var(--sc-dim)"}
                            >
                              {node.name}
                            </text>
                          ) : (
                            <text
                              x={node.x + 20}
                              y={node.y + 28}
                              textAnchor="middle"
                              fontSize="9"
                              fontFamily="var(--font-mono)"
                              fill="var(--sc-line)"
                            >
                              [LOCKED]
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  <div className="mt-4 pt-3 text-[11px] font-mono text-[var(--sc-dim)]" style={{ borderTop: "1px solid var(--sc-line)" }}>
                    CLICK OR ARROW KEYS TO NAVIGATE NODES. UNLOCKED CONCEPTS DISPLAY CALIBRATION DIAGRAMS.
                  </div>
                </div>

                {/* Right: Selected Node Detail Card */}
                <div
                  className="flex-1 h-[480px] p-6 sc-chamfer-12 flex flex-col justify-between"
                  style={{
                    backgroundColor: "var(--sc-haze)",
                    border: "1px solid var(--sc-line)",
                  }}
                >
                  {activeCodexData.unlocked ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[var(--sc-accent-cyan)] tracking-widest uppercase">
                          LEARNED IN: {activeCodexData.section}
                        </span>
                        <span
                          className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold"
                          style={{
                            border: "1px solid var(--sc-accent-cyan)",
                            color: "var(--sc-accent-cyan)",
                          }}
                        >
                          DISCOVERY VERIFIED
                        </span>
                      </div>

                      <h2
                        className="text-xl font-bold uppercase tracking-wider text-[var(--sc-core-white)] sc-glow-white"
                        style={{ fontFamily: "var(--font-condensed)" }}
                      >
                        {activeCodexData.name}
                      </h2>

                      <p className="text-sm font-mono text-[var(--sc-text)] leading-relaxed">
                        {activeCodexData.desc}
                      </p>

                      {/* Technical Diagram */}
                      <div
                        className="w-full h-[190px] mt-2 rounded p-3 flex flex-col justify-center items-center"
                        style={{
                          backgroundColor: "var(--sc-void)",
                          border: "1px solid var(--sc-line)",
                        }}
                      >
                        <span className="text-[9px] font-mono text-[var(--sc-dim)] uppercase tracking-wider mb-2">
                          SCHEMATIC REPRESENTATION
                        </span>

                        {activeCodexData.diagramType === "histogram" && (
                          <svg viewBox="0 0 200 80" className="w-[180px] h-[70px]">
                            <line x1="10" y1="70" x2="190" y2="70" stroke="var(--sc-line)" strokeWidth="1" />
                            <rect x="25" y="30" width="18" height="40" fill="var(--sc-accent-cyan)" />
                            <rect x="55" y="15" width="18" height="55" fill="var(--sc-accent-cyan)" />
                            <rect x="85" y="45" width="18" height="25" fill="var(--sc-accent-cyan)" />
                            <rect x="115" y="20" width="18" height="50" fill="var(--sc-accent-cyan)" />
                            <rect x="145" y="35" width="18" height="35" fill="var(--sc-accent-cyan)" />
                          </svg>
                        )}

                        {activeCodexData.diagramType === "cutoff" && (
                          <svg viewBox="0 0 200 80" className="w-[180px] h-[70px]">
                            <polyline points="10,60 40,55 70,20 100,58 130,55 160,52" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" />
                            <line x1="70" y1="10" x2="70" y2="70" stroke="var(--sc-warm)" strokeWidth="1" strokeDasharray="3 3" />
                            <circle cx="70" cy="20" r="4" stroke="var(--sc-warm)" fill="none" strokeWidth="1.5" />
                            <text x="75" y="22" fontSize="9" fill="var(--sc-warm)" fontFamily="var(--font-mono)">CUTOFF</text>
                          </svg>
                        )}

                        {activeCodexData.diagramType === "interpolate" && (
                          <svg viewBox="0 0 200 80" className="w-[180px] h-[70px]">
                            <line x1="20" y1="50" x2="180" y2="50" stroke="var(--sc-line)" strokeWidth="1" />
                            <circle cx="40" cy="50" r="4" fill="var(--sc-accent-cyan)" />
                            <circle cx="160" cy="50" r="4" fill="var(--sc-accent-cyan)" />
                            <circle cx="100" cy="50" r="4" stroke="var(--sc-accent-cyan)" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
                            <path d="M 40 50 Q 100 25 160 50" fill="none" stroke="var(--sc-accent-cyan)" strokeWidth="1" strokeDasharray="3 3" />
                            <text x="100" y="70" fontSize="9" textAnchor="middle" fill="var(--sc-accent-cyan)" fontFamily="var(--font-mono)">NEIGHBOR AVERAGE</text>
                          </svg>
                        )}

                        {activeCodexData.diagramType === "scatter" && (
                          <svg viewBox="0 0 200 80" className="w-[180px] h-[70px]">
                            <line x1="20" y1="70" x2="180" y2="70" stroke="var(--sc-line)" strokeWidth="1" />
                            <line x1="20" y1="70" x2="20" y2="10" stroke="var(--sc-line)" strokeWidth="1" />
                            <circle cx="50" cy="40" r="3" fill="var(--sc-accent-cyan)" />
                            <circle cx="60" cy="35" r="3" fill="var(--sc-accent-cyan)" />
                            <circle cx="70" cy="48" r="3" fill="var(--sc-accent-cyan)" />
                            <circle cx="140" cy="25" r="3" fill="var(--sc-warm)" />
                            <circle cx="150" cy="20" r="3" fill="var(--sc-warm)" />
                            <line x1="100" y1="10" x2="100" y2="70" stroke="var(--sc-line)" strokeWidth="1" strokeDasharray="2 2" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Locked Concept (Zero Spoilers) */
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                      <span className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--sc-line)] text-[var(--sc-dim)]">
                        ?
                      </span>
                      <span className="text-sm font-bold uppercase tracking-widest text-[var(--sc-dim)]">
                        CLASSIFIED CONFLICT RECOVERY DATA
                      </span>
                      <p className="text-xs text-[var(--sc-line)] font-mono max-w-xs">
                        Complete preceding mission directives and antenna calibrations to decrypt.
                      </p>
                    </div>
                  )}

                  <div className="text-[10px] font-mono text-[var(--sc-dim)] uppercase tracking-widest">
                    ARCHIVE RECORD: SCRAP-KNOWLEDGE-V4
                  </div>
                </div>
              </div>
            )}

            {/* Other Mockup Tabs */}
            {activeTab !== "resume" && activeTab !== "codex" && (
              <div className="flex flex-col gap-4 p-8 sc-chamfer-8" style={{ border: "1px solid var(--sc-line)", backgroundColor: "var(--sc-haze)" }}>
                <span className="text-xs font-mono text-[var(--sc-accent-cyan)] tracking-widest uppercase">
                  MOCKUP VIEW // {activeTab.toUpperCase()}
                </span>
                <h3 className="text-2xl font-bold uppercase text-[var(--sc-core-white)]" style={{ fontFamily: "var(--font-condensed)" }}>
                  TAB CONTENT DESIGN READY
                </h3>
                <p className="text-sm font-mono text-[var(--sc-dim)]">
                  Full data wiring for LOG, SETTINGS, CONTROLS and QUIT TO TITLE will render here in Stage 1.
                </p>
              </div>
            )}
          </main>
        </div>
      ) : (
        /* ── Compact Single-Column Layout (< 1024x600) ─────────────────── */
        <div className="relative w-full h-[calc(600px-28px-32px)] flex flex-col p-4 gap-3 select-none">
          {/* Top Row Menu Words */}
          <div
            className="flex items-center gap-3 overflow-x-auto pb-2 shrink-0"
            style={{ borderBottom: "1px solid var(--sc-line)" }}
          >
            {menuItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className="px-3 py-1 sc-chamfer-8 text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? "var(--sc-accent-cyan)" : "transparent",
                    color: isSelected ? "var(--sc-void)" : "var(--sc-dim)",
                    border: isSelected ? "1px solid var(--sc-accent-cyan)" : "1px solid var(--sc-line)",
                    fontFamily: "var(--font-condensed)",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Compact View Body */}
          <div className="flex-1 overflow-y-auto p-4 sc-chamfer-8 flex flex-col gap-4" style={{ backgroundColor: "var(--sc-haze)", border: "1px solid var(--sc-line)" }}>
            {activeTab === "resume" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--sc-accent-cyan)] font-bold">SYSTEM REPAIR 60%</span>
                  <span className="text-[var(--sc-dim)]">ELAPSED: 04:18</span>
                </div>
                <div className="flex flex-col gap-2">
                  {systemRows.map((sys) => (
                    <div key={sys.name} className="flex justify-between items-center text-xs font-mono">
                      <span style={{ color: sys.online ? "var(--sc-core-white)" : "var(--sc-dim)" }}>{sys.name}</span>
                      <span style={{ color: sys.online ? "var(--sc-accent-cyan)" : "var(--sc-dim)" }}>
                        {sys.online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 text-xs font-mono" style={{ borderTop: "1px solid var(--sc-line)" }}>
                  <span className="text-[var(--sc-warm)] block mb-1">NOW:</span>
                  <span>CARGO DECK SIGNAL BENCH // EXTRACT FEATURES & DECODE RESCUE BEACON</span>
                </div>
                <button
                  type="button"
                  onClick={onResume}
                  className="w-full py-2.5 sc-chamfer-8 text-xs font-bold uppercase cursor-pointer"
                  style={{
                    backgroundColor: "var(--sc-accent-cyan)",
                    color: "var(--sc-void)",
                  }}
                >
                  RESUME MISSION [ENTER / SPACE]
                </button>
              </div>
            )}

            {activeTab === "codex" && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono text-[var(--sc-accent-cyan)] uppercase">
                  KNOWLEDGE PIPELINE NODES
                </span>
                <div className="flex flex-col gap-2">
                  {codexNodes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedCodexNode(n.id)}
                      className="p-2.5 rounded border text-xs font-mono flex justify-between cursor-pointer"
                      style={{
                        borderColor: selectedCodexNode === n.id ? "var(--sc-accent-cyan)" : "var(--sc-line)",
                        backgroundColor: "var(--sc-void)",
                      }}
                    >
                      <span style={{ color: n.unlocked ? "var(--sc-core-white)" : "var(--sc-dim)" }}>
                        {n.unlocked ? n.name : "[LOCKED CLASSIFIED]"}
                      </span>
                      <span style={{ color: n.unlocked ? "var(--sc-accent-cyan)" : "var(--sc-dim)" }}>
                        {n.unlocked ? "DECRYPTED" : "LOCKED"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab !== "resume" && activeTab !== "codex" && (
              <div className="text-xs font-mono text-[var(--sc-dim)]">
                TAB {activeTab.toUpperCase()} PREVIEW READY FOR STAGE 1.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER HINTS (32 px) ──────────────────────────────────────── */}
      <footer
        className="relative z-20 w-full h-[32px] px-8 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[var(--sc-dim)]"
        style={{ borderTop: "1px solid var(--sc-line)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span>UP / DOWN HIGHLIGHT</span>
          <span style={{ color: "var(--sc-line)" }}>.....</span>
          <span>E SELECT</span>
          <span style={{ color: "var(--sc-line)" }}>.....</span>
          <span>1-6 JUMP</span>
          <span style={{ color: "var(--sc-line)" }}>.....</span>
          <span>Q / ESC RESUME</span>
        </div>
        <span className="hidden sm:inline" style={{ color: "var(--sc-line)" }}>
          UNIT SCRAP-07 // STANDBY
        </span>
      </footer>
    </div>
  );
}

export default ScrapPauseMockup;
