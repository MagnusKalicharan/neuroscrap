"use client";

import React, { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { taskStore, useTaskStore, TaskItem } from "@/ui/tasks/taskStore";
import TaskList from "@/ui/tasks/TaskList";
import TaskProgressBar from "@/ui/tasks/TaskProgressBar";

export default function DevTasksPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isGreyscale, setIsGreyscale] = useState(false);
  const { tasks } = useTaskStore();

  // Standard sample tasks
  const registerSampleTasks = () => {
    taskStore.reset();
    const task1: TaskItem = {
      id: "salvage_power",
      title: "Plug in 3 power cells",
      location: "SALVAGE RACK",
      state: "available",
      progress: 1,
      total: 3,
    };
    const task2: TaskItem = {
      id: "scanner_align",
      title: "Calibrate frequency sensor",
      location: "SCANNER BAY",
      state: "available",
      progress: 0,
      total: 2,
    };
    const task3: TaskItem = {
      id: "console_boot",
      title: "Power up Decision Core",
      location: "DECISION CONSOLE",
      state: "locked",
      progress: 0,
      total: 1,
      unlockedBy: "salvage_power",
    };

    taskStore.registerTask(task1);
    taskStore.registerTask(task2);
    taskStore.registerTask(task3);
  };

  const completeOneTaskForStrike = () => {
    registerSampleTasks();
    // Complete task 1
    taskStore.completeTask("salvage_power");
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("greyscale") === "1" || params.get("g") === "1") {
        setIsGreyscale(true);
      }
      if (params.get("motion") === "reduced") {
        setReduceMotion(true);
      }
      const stateParam = params.get("state");
      if (stateParam === "none") {
        taskStore.reset();
      } else if (stateParam === "3") {
        registerSampleTasks();
      } else if (stateParam === "strike") {
        completeOneTaskForStrike();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "g") setIsGreyscale((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#04060B] flex items-center justify-center font-mono text-[#7F93A6]">
        INITIALIZING TASK PANEL DEV ENVIRONMENT...
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-[#04060B] text-[#C9D6E2] flex flex-col select-none relative overflow-x-hidden ${
        isGreyscale ? "noir-greyscale-mode" : ""
      } ${reduceMotion ? "noir-reduced-motion" : ""}`}
      suppressHydrationWarning
    >
      {/* ── Background: Cold teal haze & warm upper-right key light ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 85% 15%, rgba(255, 154, 31, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 0%, #0B1F2A 0%, #04060B 75%)
          `,
        }}
        aria-hidden="true"
      />

      {/* ── TOP: Task Progress Bar Across Full Width ── */}
      <TaskProgressBar reduceMotion={reduceMotion} />

      {/* ── MAIN VIEWPORT HUD ── */}
      <div className="flex-1 p-6 md:p-10 flex flex-col justify-between z-10">
        {/* Top-Left: Collapsible Task List */}
        <div className="w-full max-w-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] tracking-widest uppercase font-mono px-2 py-0.5 rounded border border-[#34495A] bg-[#0E161E] text-[#7F93A6]">
              STEP A: TASK STORE &amp; HUD
            </span>
          </div>
          <TaskList reduceMotion={reduceMotion} />
        </div>

        {/* Center: Test Station Mockup Area */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="p-6 bg-[#0E161E]/70 border border-[#1A2733] rounded-xl text-center max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <h3
              className="text-base font-bold uppercase tracking-[0.2em] text-[#FFF4E0] mb-2"
              style={{ fontFamily: "var(--font-noir-condensed)" }}
            >
              TASK SYSTEM TESTBENCH
            </h3>
            <p className="text-xs font-mono text-[#7F93A6]">
              Real-time synchronization between taskStore, TaskProgressBar, and collapsible TaskList with animated neon strike-through.
            </p>
          </div>
        </div>

        {/* ── BOTTOM DEV CONTROLS BAR ── */}
        <div className="w-full bg-[#0C131A]/95 border border-[#1A2733] rounded-lg p-4 shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between border-b border-[#1A2733] pb-2 mb-3">
            <span
              className="text-xs font-bold uppercase tracking-[0.16em] text-[#19F0FF]"
              style={{ fontFamily: "var(--font-noir-condensed)" }}
            >
              TEST CONTROLS (STEP A)
            </span>
            <div className="flex items-center gap-4">
              {/* Greyscale Toggle */}
              <button
                onClick={() => setIsGreyscale(!isGreyscale)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider transition-all border ${
                  isGreyscale
                    ? "bg-[#FFF4E0] text-[#04060B] border-[#FFF4E0]"
                    : "bg-transparent text-[#7F93A6] border-[#34495A] hover:border-[#19F0FF] hover:text-[#19F0FF]"
                }`}
              >
                [G] GREYSCALE: {isGreyscale ? "ON" : "OFF"}
              </button>

              {/* Reduce Motion */}
              <label className="flex items-center gap-2 text-xs font-mono text-[#C9D6E2] cursor-pointer">
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

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <button
              onClick={() => taskStore.reset()}
              className="px-3 py-1.5 rounded bg-[#151F2A] hover:bg-[#1E2B38] text-[#C9D6E2] border border-[#2B3E52] transition-colors"
            >
              Reset (0 Tasks)
            </button>
            <button
              onClick={registerSampleTasks}
              className="px-3 py-1.5 rounded bg-[#102432] hover:bg-[#163044] text-[#19F0FF] border border-[#19F0FF]/40 transition-colors"
            >
              Register 3 Tasks
            </button>
            <button
              onClick={() => taskStore.completeStep("salvage_power")}
              disabled={tasks.length === 0}
              className="px-3 py-1.5 rounded bg-[#151F2A] hover:bg-[#1E2B38] text-[#FF9A1F] border border-[#FF9A1F]/40 transition-colors disabled:opacity-40"
            >
              Complete Step (Task 1)
            </button>
            <button
              onClick={() => taskStore.completeTask("salvage_power")}
              disabled={tasks.length === 0}
              className="px-3 py-1.5 rounded bg-[#2A180E] hover:bg-[#3D2214] text-[#FF9A1F] border border-[#FF9A1F] transition-colors disabled:opacity-40"
            >
              Complete Task 1 (Strike-through)
            </button>
            <button
              onClick={() => {
                const t3 = tasks.find((t) => t.id === "console_boot");
                if (t3) {
                  if (t3.state === "locked") taskStore.unlockTask("console_boot");
                  else taskStore.lockTask("console_boot");
                }
              }}
              disabled={tasks.length === 0}
              className="px-3 py-1.5 rounded bg-[#151F2A] hover:bg-[#1E2B38] text-[#7F93A6] border border-[#34495A] transition-colors disabled:opacity-40"
            >
              Toggle Lock (Task 3)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
