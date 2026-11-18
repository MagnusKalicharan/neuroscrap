"use client";

import React, { useState } from "react";
import type { MathStep, GradientSummaryEntry } from "./types";
import { KaTeXBlock } from "./KaTeXBlock";

export interface FloatingMathPanelProps {
  step: MathStep;
  gradientSummary?: GradientSummaryEntry[];
  position: { x: number; y: number };
  onClose?: () => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
}

export function FloatingMathPanel({
  step,
  gradientSummary = [],
  position,
  onClose,
  onNextStep,
  onPrevStep,
}: FloatingMathPanelProps) {
  // Tab for sub-stages: "all" displays all A-E stacked; "A".."E" displays individual
  const [activeTab, setActiveTab] = useState<"all" | "A" | "B" | "C" | "D" | "E">("all");

  const isBackprop =
    step.phase.includes("delta") ||
    step.phase.includes("grad") ||
    step.phase === "loss";

  const accentColor = isBackprop ? "#E82EA5" : step.glowColor === "amber" ? "#FFB700" : "#2EE85C";
  const accentBorder = isBackprop ? "border-[#E82EA5]" : step.glowColor === "amber" ? "border-[#FFB700]" : "border-[#2EE85C]";
  const accentText = isBackprop ? "text-[#FF66CC]" : step.glowColor === "amber" ? "text-[#FFB700]" : "text-[#4BFF7B]";
  const accentBg = isBackprop ? "bg-[#250017]" : step.glowColor === "amber" ? "bg-[#1f1500]" : "bg-[#031508]";

  return (
    <div
      className={`absolute z-30 w-[380px] max-w-[92vw] max-h-[460px] flex flex-col rounded-md border ${accentBorder} bg-[#020904]/95 shadow-[0_0_24px_rgba(0,0,0,0.85)] font-mono select-none backdrop-blur-md overflow-hidden text-xs transition-all duration-200`}
      style={{
        left: Math.max(10, Math.min(window.innerWidth > 900 ? 520 : 300, position.x)),
        top: Math.max(10, Math.min(220, position.y)),
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={`px-2.5 py-1.5 flex items-center justify-between border-b ${accentBorder}/50 ${accentBg}`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
          />
          <span className={`text-[10px] font-black tracking-wider uppercase truncate ${accentText}`}>
            {step.phaseLabel}
          </span>
          <span className="text-[9px] text-[var(--term-green-text-dim)] shrink-0">
            [{step.stepIndex + 1}/{step.totalSteps}]
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onPrevStep && (
            <button
              type="button"
              onClick={onPrevStep}
              className="px-1.5 py-0.5 text-[10px] rounded hover:bg-white/10 text-white/80"
              title="Previous Step"
            >
              ◀
            </button>
          )}
          {onNextStep && (
            <button
              type="button"
              onClick={onNextStep}
              className="px-1.5 py-0.5 text-[10px] rounded hover:bg-white/10 text-white/80"
              title="Next Step"
            >
              ▶
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-1.5 py-0.5 text-[10px] rounded hover:bg-red-900/60 text-red-400 font-bold ml-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Title & Explanation ─────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1.5 border-b border-[var(--term-outline-green)]/30">
        <div className="text-[11px] font-bold text-white tracking-wide">{step.title}</div>
        <div className="text-[10px] text-[var(--term-green-text-dim)] mt-0.5 leading-relaxed">
          {step.explanation}
        </div>
      </div>

      {/* ── Sub-Stage Tab Buttons ───────────────────────────────────────── */}
      {step.phase !== "gradient_summary" && step.phase !== "loss_comparison" && (
        <div className="flex items-center gap-0.5 px-2 py-1 bg-[#010602] border-b border-[var(--term-outline-green)]/30 text-[9px] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              activeTab === "all"
                ? "bg-[#2EE85C]/20 text-[#4BFF7B] font-bold border border-[#2EE85C]/60"
                : "text-[var(--term-green-text-dim)] hover:text-white"
            }`}
          >
            ★ ALL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("A")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              activeTab === "A"
                ? "bg-[#2EE85C]/20 text-[#4BFF7B] font-bold border border-[#2EE85C]/60"
                : "text-[var(--term-green-text-dim)] hover:text-white"
            }`}
          >
            A. Formula
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("B")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              activeTab === "B"
                ? "bg-[#2EE85C]/20 text-[#4BFF7B] font-bold border border-[#2EE85C]/60"
                : "text-[var(--term-green-text-dim)] hover:text-white"
            }`}
          >
            B. Values
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("C")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              activeTab === "C"
                ? "bg-[#2EE85C]/20 text-[#4BFF7B] font-bold border border-[#2EE85C]/60"
                : "text-[var(--term-green-text-dim)] hover:text-white"
            }`}
          >
            C. Mult
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("D")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              activeTab === "D"
                ? "bg-[#2EE85C]/20 text-[#4BFF7B] font-bold border border-[#2EE85C]/60"
                : "text-[var(--term-green-text-dim)] hover:text-white"
            }`}
          >
            D. Add
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("E")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              activeTab === "E"
                ? "bg-[#2EE85C]/20 text-[#4BFF7B] font-bold border border-[#2EE85C]/60"
                : "text-[var(--term-green-text-dim)] hover:text-white"
            }`}
          >
            E. Result
          </button>
        </div>
      )}

      {/* ── Scrollable Body Content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs text-white max-h-[300px]">
        {/* Render Gradient Summary Table */}
        {step.phase === "gradient_summary" && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-[9px] border-collapse font-mono">
              <thead>
                <tr className="border-b border-[#2EE85C]/40 text-[#4BFF7B] bg-[#041607]">
                  <th className="py-1 px-1 text-left">PARAM</th>
                  <th className="py-1 px-1 text-right">OLD</th>
                  <th className="py-1 px-1 text-right">GRADIENT</th>
                  <th className="py-1 px-1 text-right">UPDATE</th>
                  <th className="py-1 px-1 text-right text-[#FFB700]">NEW</th>
                </tr>
              </thead>
              <tbody>
                {gradientSummary.map((item, idx) => (
                  <tr
                    key={item.parameterId}
                    className={`border-b border-[var(--term-outline-green)]/20 ${
                      idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-0.5 px-1 text-[var(--term-green-text-bright)] font-bold">
                      {item.parameterId}
                    </td>
                    <td className="py-0.5 px-1 text-right text-gray-300">
                      {item.oldValue.toFixed(4)}
                    </td>
                    <td className="py-0.5 px-1 text-right text-[#E82EA5]">
                      {item.gradient.toFixed(4)}
                    </td>
                    <td className="py-0.5 px-1 text-right text-[#00FFFF]">
                      {(-item.updateStep).toFixed(4)}
                    </td>
                    <td className="py-0.5 px-1 text-right text-[#FFB700] font-bold">
                      {item.newValue.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Render Loss Comparison Table */}
        {step.phase === "loss_comparison" && step.comparisonData && (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded bg-[#010803] border border-[var(--term-outline-green)]/40">
                <div className="text-[var(--term-green-text-dim)] uppercase">PRE-UPDATE LOSS</div>
                <div className="text-base font-bold text-gray-300 mt-1">
                  {step.comparisonData.oldLoss.toFixed(6)}
                </div>
                <div className="text-[9px] text-gray-400">
                  ŷ = {step.comparisonData.oldPrediction.toFixed(4)}
                </div>
              </div>

              <div className="p-2 rounded bg-[#031508] border border-[#2EE85C]">
                <div className="text-[#4BFF7B] uppercase font-bold">POST-UPDATE LOSS</div>
                <div className="text-base font-bold text-[#4BFF7B] mt-1">
                  {step.comparisonData.newLoss.toFixed(6)}
                </div>
                <div className="text-[9px] text-[#4BFF7B]">
                  ŷ = {step.comparisonData.newPrediction.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="p-2 rounded border border-[#2EE85C] bg-[#021d0a] flex items-center justify-between">
              <span className="text-[10px] text-[#4BFF7B] font-bold">LOSS REDUCTION (ΔL):</span>
              <span className="text-sm font-black text-[#4BFF7B]">
                {step.comparisonData.lossDelta.toFixed(6)} ✓
              </span>
            </div>

            <div className="text-[10px] text-[var(--term-green-text-bright)] leading-relaxed italic">
              Gradient descent has proven to decrease the prediction error on this data sample.
            </div>
          </div>
        )}

        {/* Standard 5-Stage Mathematical Derivation */}
        {step.phase !== "gradient_summary" && step.phase !== "loss_comparison" && (
          <div className="space-y-2">
            {/* Stage A: General Formula */}
            {(activeTab === "all" || activeTab === "A") && (
              <div className="p-2 rounded bg-[#010803] border border-[var(--term-outline-green)]/40">
                <div className="text-[9px] text-[var(--term-green-text-dim)] uppercase font-bold mb-1">
                  [A] General Formula
                </div>
                <div className="overflow-x-auto py-1">
                  <KaTeXBlock math={step.generalFormulaLatex} displayMode={true} />
                </div>
              </div>
            )}

            {/* Stage B: Numerical Substitution */}
            {(activeTab === "all" || activeTab === "B") && (
              <div className="p-2 rounded bg-[#010803] border border-[var(--term-outline-green)]/40">
                <div className="text-[9px] text-[var(--term-green-text-dim)] uppercase font-bold mb-1">
                  [B] Numerical Substitution
                </div>
                <div className="overflow-x-auto py-1 text-[#FFB700]">
                  <KaTeXBlock math={step.substitutionLatex} displayMode={true} />
                </div>
              </div>
            )}

            {/* Stage C: Intermediate Calculations */}
            {(activeTab === "all" || activeTab === "C") && step.intermediateLatex && (
              <div className="p-2 rounded bg-[#010803] border border-[var(--term-outline-green)]/40">
                <div className="text-[9px] text-[var(--term-green-text-dim)] uppercase font-bold mb-1">
                  [C] Intermediate Calculations
                </div>
                <div className="overflow-x-auto py-1 text-cyan-300">
                  <KaTeXBlock math={step.intermediateLatex} displayMode={true} />
                </div>
              </div>
            )}

            {/* Stage D: Final Calculation */}
            {(activeTab === "all" || activeTab === "D") && step.finalCalculationLatex && (
              <div className="p-2 rounded bg-[#010803] border border-[var(--term-outline-green)]/40">
                <div className="text-[9px] text-[var(--term-green-text-dim)] uppercase font-bold mb-1">
                  [D] Final Calculation
                </div>
                <div className="overflow-x-auto py-1 text-emerald-300">
                  <KaTeXBlock math={step.finalCalculationLatex} displayMode={true} />
                </div>
              </div>
            )}

            {/* Stage E: Final Value */}
            {(activeTab === "all" || activeTab === "E") && (
              <div className={`p-2 rounded border ${accentBorder} ${accentBg}`}>
                <div className="text-[9px] uppercase font-bold text-white/80 mb-1">
                  [E] Computed Result
                </div>
                <div className={`overflow-x-auto py-1 text-sm font-bold ${accentText}`}>
                  <KaTeXBlock math={step.finalValueLatex} displayMode={true} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-1.5 border-t border-[var(--term-outline-green)]/40 bg-[#010602] flex items-center justify-between text-[10px]">
        <span className="text-[var(--term-green-text-dim)]">
          TARGET: <span className="text-white font-bold">{step.targetNodeId || step.targetLinkId || "GLOBAL"}</span>
        </span>
        <span className={`font-mono font-bold ${accentText}`}>
          VALUE: {step.numericValue.toFixed(6)}
        </span>
      </div>
    </div>
  );
}
