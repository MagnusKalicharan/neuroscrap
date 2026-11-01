"use client";

import React from "react";
import { useTaskStore } from "./taskStore";

export interface TaskProgressBarProps {
  className?: string;
  reduceMotion?: boolean;
}

export default function TaskProgressBar({ className = "", reduceMotion = false }: TaskProgressBarProps) {
  const { tasks } = useTaskStore();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.state === "done").length;
  const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div
      className={`w-full flex items-center gap-3 px-4 py-2 bg-[#080D12]/95 border-b border-[#1A2733] select-none ${className}`}
      style={{
        boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
      }}
    >
      {/* Label Tag */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="w-1.5 h-1.5 bg-[#19F0FF] rounded-full shadow-[0_0_5px_#19F0FF]" />
        <span
          className="text-xs font-bold uppercase tracking-[0.18em] text-[#C9D6E2]"
          style={{ fontFamily: "var(--font-noir-condensed)" }}
        >
          TASKS {completedTasks}/{totalTasks}
        </span>
      </div>

      {/* Progress Track Steel Channel */}
      <div className="flex-1 h-2 bg-[#04060B] rounded-full border border-[#1A2733] relative overflow-hidden flex items-center">
        {/* Fill Tube */}
        <div
          className="h-full bg-[#19F0FF] relative"
          style={{
            width: `${percentage}%`,
            transition: reduceMotion ? "none" : "width 500ms cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "0 0 8px rgba(25, 240, 255, 0.8)",
          }}
        >
          {/* Small bright incandescent leading head */}
          {percentage > 0 && (
            <div
              className="absolute right-0 top-0 bottom-0 w-2 bg-[#FFF4E0] rounded-r-full shadow-[0_0_6px_#FFF4E0]"
            />
          )}
        </div>
      </div>

      {/* Percentage Readout */}
      <span
        className="font-mono text-[11px] font-bold text-[#7F93A6] flex-shrink-0 w-10 text-right"
        style={{ fontFamily: "var(--font-noir-mono)" }}
      >
        {Math.round(percentage)}%
      </span>
    </div>
  );
}
