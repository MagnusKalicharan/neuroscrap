"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { ScrapPauseMenu, SystemMenuTab } from "../../../components/pause/ScrapPauseMenu";
import { PauseMenu } from "../../../components/PauseMenu";
import { CommsTransceiverModal } from "../../../section3/CommsTransceiverModal";
import { BenchTerminal } from "../../../section3/BenchTerminal";

export default function DevPauseTestPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [activeTab, setActiveTab] = useState<SystemMenuTab>("resume");
  const [viewport, setViewport] = useState<"1280x720" | "1024x600">("1280x720");
  const [showOldComparison, setShowOldComparison] = useState(false);
  const [showCoreB, setShowCoreB] = useState(false);
  const [coreBFolder, setCoreBFolder] = useState<"examples" | "tools" | "notebook" | "channels">("examples");
  const [coreBView, setCoreBView] = useState<"table" | "compare">("table");
  const [showCoreC, setShowCoreC] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [initialFocus, setInitialFocus] = useState<number>(0);
  const [initialChoice, setInitialChoice] = useState<0 | 1>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab") as SystemMenuTab;
      if (p && ["resume", "settings", "controls", "quit"].includes(p)) {
        setActiveTab(p);
      }
      const v = new URLSearchParams(window.location.search).get("viewport");
      if (v === "1024x600") {
        setViewport("1024x600");
      }
      if (new URLSearchParams(window.location.search).get("compare") === "1") {
        setShowOldComparison(true);
      }
      if (new URLSearchParams(window.location.search).get("view") === "core-b") {
        setShowCoreB(true);
      }
      const bFolder = new URLSearchParams(window.location.search).get("folder");
      if (bFolder && ["examples", "tools", "notebook", "channels"].includes(bFolder)) {
        setCoreBFolder(bFolder as any);
      }
      const bView = new URLSearchParams(window.location.search).get("nview");
      if (bView && ["table", "compare"].includes(bView)) {
        setCoreBView(bView as any);
      }
      if (new URLSearchParams(window.location.search).get("view") === "core-c") {
        setShowCoreC(true);
      }
      const f = new URLSearchParams(window.location.search).get("focus");
      if (f !== null) {
        setInitialFocus(parseInt(f, 10));
      }
      const c = new URLSearchParams(window.location.search).get("choice");
      if (c === "1") {
        setInitialChoice(1);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#04060B] text-[#C9D6E2] font-mono p-4 flex flex-col items-center select-none">
      {/* ── Review Toolbar ──────────────────────────────────── */}
      <div
        className="w-full max-w-6xl mb-4 p-3 rounded flex flex-wrap items-center justify-between gap-4 z-50 text-xs"
        style={{
          backgroundColor: "#0B1F2A",
          border: "1px solid #2A3B4A",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#19F0FF] animate-ping" />
          <span className="font-bold tracking-wider uppercase text-[#19F0FF]">
            MINIMAL TERMINAL MENU
          </span>
          <span className="px-2 py-0.5 rounded border border-[#2A3B4A] bg-[#04060B] text-[#6F8394]">
            KINETIC TEXT MOTION & 4 TABS
          </span>
        </div>

        {/* 4 Tabs Switch */}
        <div className="flex items-center gap-1 p-1 rounded flex-wrap" style={{ backgroundColor: "#04060B", border: "1px solid #2A3B4A" }}>
          <span className="text-[#6F8394] font-bold px-1 uppercase">TAB:</span>
          {(["resume", "settings", "controls", "quit"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className="px-2.5 py-1 rounded font-bold cursor-pointer transition-all uppercase"
              style={{
                backgroundColor: activeTab === t ? "#19F0FF" : "transparent",
                color: activeTab === t ? "#04060B" : "#C9D6E2",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Viewport Switch & Old Menu Comparison */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded" style={{ backgroundColor: "#04060B", border: "1px solid #2A3B4A" }}>
            <button
              type="button"
              onClick={() => setViewport("1280x720")}
              className="px-2.5 py-1 rounded font-bold cursor-pointer"
              style={{
                backgroundColor: viewport === "1280x720" ? "#FFF4E0" : "transparent",
                color: viewport === "1280x720" ? "#04060B" : "#C9D6E2",
              }}
            >
              1280x720
            </button>
            <button
              type="button"
              onClick={() => setViewport("1024x600")}
              className="px-2.5 py-1 rounded font-bold cursor-pointer"
              style={{
                backgroundColor: viewport === "1024x600" ? "#FFF4E0" : "transparent",
                color: viewport === "1024x600" ? "#04060B" : "#C9D6E2",
              }}
            >
              1024x600
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowOldComparison((prev) => !prev)}
            className="px-3 py-1.5 rounded font-bold uppercase cursor-pointer"
            style={{
              backgroundColor: showOldComparison ? "#FF9A1F" : "#04060B",
              color: showOldComparison ? "#04060B" : "#FF9A1F",
              border: "1px solid #FF9A1F",
            }}
          >
            {showOldComparison ? "HIDE OLD MENU" : "COMPARE OLD MENU"}
          </button>

          <button
            type="button"
            onClick={() => setShowCoreB((prev) => !prev)}
            className="px-3 py-1.5 rounded font-bold uppercase cursor-pointer"
            style={{
              backgroundColor: showCoreB ? "#2EE85C" : "#04060B",
              color: showCoreB ? "#04060B" : "#2EE85C",
              border: "1px solid #2EE85C",
            }}
          >
            {showCoreB ? "CLOSE CORE B" : "VIEW CORE B"}
          </button>

          <button
            type="button"
            onClick={() => setShowCoreC((prev) => !prev)}
            className="px-3 py-1.5 rounded font-bold uppercase cursor-pointer"
            style={{
              backgroundColor: showCoreC ? "#2EE85C" : "#04060B",
              color: showCoreC ? "#04060B" : "#2EE85C",
              border: "1px solid #2EE85C",
            }}
          >
            {showCoreC ? "CLOSE CORE C" : "VIEW CORE C"}
          </button>
        </div>
      </div>

      {showCoreB && (
        <BenchTerminal
          open={true}
          onClose={() => setShowCoreB(false)}
          reducedMotion={reduceMotion}
          initialFolder={coreBFolder}
          initialNotebookView={coreBView}
        />
      )}

      {showCoreC && (
        <CommsTransceiverModal
          open={true}
          onClose={() => setShowCoreC(false)}
          reducedMotion={reduceMotion}
        />
      )}

      {/* ── Mockup Display Canvas ───────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center overflow-hidden transition-all shadow-[0_0_60px_rgba(0,0,0,0.95)] shrink-0"
        style={{
          width: viewport === "1280x720" ? (showOldComparison ? "1440px" : "1280px") : "1024px",
          height: viewport === "1280x720" ? "720px" : "600px",
          border: "1px solid #2A3B4A",
          backgroundColor: "#04060B",
        }}
      >
        <div className={showOldComparison ? "w-1/2 h-full border-r border-[#2A3B4A] relative" : "w-full h-full relative"}>
          <ScrapPauseMenu
            open={true}
            isEmbedded={true}
            initialTab={activeTab}
            initialFocusedControl={initialFocus}
            initialQuitChoice={initialChoice}
            viewport={viewport}
            onTabChange={setActiveTab}
            onResume={() => alert("Resume Action Dispatched")}
            onQuitToTitle={() => alert("Quit to Title Dispatched")}
            reducedMotion={reduceMotion}
            onToggleReduceMotion={() => setReduceMotion((p) => !p)}
          />
        </div>

        {showOldComparison && (
          <div className="w-1/2 h-full relative overflow-hidden flex items-center justify-center p-4 bg-black/60">
            <div className="scale-90 transform-origin-center">
              <PauseMenu
                onResume={() => alert("Old Resume Dispatched")}
                mouseSensitivity={1.0}
                onSensitivityChange={() => {}}
                masterVolume={80}
                onVolumeChange={() => {}}
                isMuted={false}
                onToggleMute={() => {}}
                reducedMotion={reduceMotion}
                onToggleReduceMotion={() => setReduceMotion((p) => !p)}
                onReturnToBaseCamp={() => alert("Old Quit Dispatched")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
