"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTaskStore } from "./taskStore";
import { taskAudio } from "./taskAudio";

export interface TaskListProps {
  className?: string;
  reduceMotion?: boolean;
}

export default function TaskList({ className = "", reduceMotion = false }: TaskListProps) {
  const { tasks } = useTaskStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevCompletedRef = useRef<Set<string>>(new Set());

  // Detect newly completed tasks to trigger sound & neon strike
  useEffect(() => {
    const currentCompleted = new Set(
      tasks.filter((t) => t.state === "done").map((t) => t.id)
    );

    currentCompleted.forEach((id) => {
      if (!prevCompletedRef.current.has(id)) {
        taskAudio.playStrikeTick();
      }
    });

    prevCompletedRef.current = currentCompleted;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div
        className={`bg-[#0E161E]/90 border border-[#1A2733] rounded-lg p-3 text-xs font-mono text-[#7F93A6] shadow-[0_4px_16px_rgba(0,0,0,0.6)] ${className}`}
        style={{ fontFamily: "var(--font-noir-mono)" }}
      >
        <span className="tracking-widest uppercase">NO ACTIVE OBJECTIVES</span>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.state === "done").length;

  return (
    <div
      className={`bg-[#0C131A]/95 border border-[#1A2733] rounded-lg shadow-[0_6px_24px_rgba(0,0,0,0.7)] text-xs select-none backdrop-blur-sm transition-all overflow-hidden ${className}`}
      style={{
        boxShadow: "0 0 1px #34495A, 0 4px 20px rgba(0,0,0,0.8)",
      }}
    >
      {/* ── Title Header / Collapse Toggle Bar ── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#121B24] border-b border-[#1A2733] hover:bg-[#182330] transition-colors cursor-pointer text-left"
        aria-expanded={!isCollapsed}
        aria-label="Toggle Tasks List"
      >
        <div className="flex items-center gap-2">
          {/* Header Status Indicator */}
          <span className="w-2 h-2 rounded-full bg-[#19F0FF] shadow-[0_0_6px_#19F0FF]" />
          <span
            className="font-bold tracking-[0.16em] uppercase text-[#FFF4E0] text-[13px]"
            style={{ fontFamily: "var(--font-noir-condensed)" }}
          >
            OBJECTIVES [{completedCount}/{tasks.length}]
          </span>
        </div>

        {/* Chevron Icon (CSS/SVG, purely transform animated) */}
        <svg
          viewBox="0 0 20 20"
          className="w-4 h-4 text-[#7F93A6] transition-transform duration-200"
          style={{
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
          }}
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* ── Tasks Body Rows ── */}
      {!isCollapsed && (
        <div className="p-2 space-y-1.5 flex flex-col">
          {tasks.map((task) => {
            const isDone = task.state === "done";
            const isLocked = task.state === "locked";

            return (
              <div
                key={task.id}
                className={`relative px-3 py-2 rounded flex items-center justify-between gap-3 transition-colors ${
                  isLocked
                    ? "bg-[#080D12]/70 text-[#7F93A6]/60 border border-transparent"
                    : isDone
                    ? "bg-[#091017]/80 text-[#7F93A6] border border-[#1A2733]/50"
                    : "bg-[#0E161E] text-[#C9D6E2] border border-[#223344] hover:border-[#19F0FF]/60"
                }`}
              >
                {/* Left: Icon + Location + Title */}
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {/* Status Glyph */}
                  <span className="flex-shrink-0">
                    {isLocked ? (
                      // Padlock glyph
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[#7F93A6]" fill="currentColor">
                        <path d="M4 6V4a4 4 0 118 0v2h1a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V7a1 1 0 011-1h2zm2-2a2 2 0 114 0v2H6V4zm-2 4v5h8V8H4z" />
                      </svg>
                    ) : isDone ? (
                      // Neon checkmark glyph
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[#19F0FF]" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                    ) : (
                      // Glowing neon diamond bullet
                      <span className="w-2 h-2 rotate-45 inline-block bg-[#FF9A1F] shadow-[0_0_5px_#FF9A1F]" />
                    )}
                  </span>

                  {/* Task Location Tag + Title */}
                  <div className="truncate">
                    <span
                      className="font-bold tracking-wider text-[12px] uppercase mr-1.5"
                      style={{
                        fontFamily: "var(--font-noir-condensed)",
                        color: isLocked ? "#7F93A6" : isDone ? "#7F93A6" : "#19F0FF",
                      }}
                    >
                      {task.location}:
                    </span>
                    <span
                      className="text-[12px] font-medium"
                      style={{
                        fontFamily: "var(--font-noir-condensed)",
                        color: isLocked ? "#7F93A6" : isDone ? "#7F93A6" : "#C9D6E2",
                      }}
                    >
                      {task.title}
                    </span>
                  </div>
                </div>

                {/* Right: Step Counter */}
                <div
                  className="flex-shrink-0 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border border-[#1A2733] bg-[#070B0F]"
                  style={{
                    color: isDone ? "#19F0FF" : isLocked ? "#7F93A6" : "#FFF4E0",
                  }}
                >
                  ({task.progress}/{task.total})
                </div>

                {/* ── Neon Strike-Through Line (Animates when completed) ── */}
                {isDone && (
                  <div
                    className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[2px] bg-[#19F0FF] pointer-events-none"
                    style={{
                      transformOrigin: "left center",
                      transform: "scaleX(1)",
                      transition: reduceMotion ? "none" : "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow: "0 0 4px #FFF4E0, 0 0 8px #19F0FF",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
