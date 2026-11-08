"use client";

import React from "react";
import type { EvaluationResult, RelayConfig } from "../evaluateConfig";

interface ResultBarProps {
  isTesting: boolean;
  result: EvaluationResult | null;
  config?: RelayConfig;
  onContinue?: () => void;
  onReset?: () => void;
}

export function ResultBar({ isTesting, result, config, onContinue, onReset }: ResultBarProps) {
  if (isTesting) {
    return (
      <div className="diag-result-container" role="status" aria-live="polite">
        <div className="diag-result-status-line ready">
          <span className="animate-spin">◌</span>
          <span>TRANSMITTING TEST PACKET...</span>
        </div>
        <div className="diag-result-reason text-xs text-[#84b890]">
          Routing high-voltage signal across relay line to roof antenna.
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="diag-result-container" role="status" aria-live="polite">
        <div className="diag-result-status-line ready">
          <span>●</span>
          <span>READY TO TEST</span>
        </div>
        <div className="diag-result-reason text-xs text-[#84b890]">
          Pull the lever or click PULL to transmit test packet along the line.
        </div>
        <div className="text-[10px] text-[#528a60] border-t border-[#0f3818] pt-1">
          Target circuit specification: ~120V nominal baseline.
        </div>
      </div>
    );
  }

  const isPass = result.ok;

  // Format failure headline and actionable single-line guidance
  let failHeadline = "FAIL // TRANSMISSION ABORTED";
  let failGuidance = "";

  if (result.failure === "surge") {
    failHeadline = "FAIL // SURGE OUTLIER IN LINE";
    failGuidance = "Data has an extreme outlier (99,999 V at R3) — set switch to IGNORE (⦸) to filter it out.";
  } else if (result.failure === "gap") {
    failHeadline = "FAIL // MISSING COMPONENT GAP";
    failGuidance = "Data has a missing node gap at R4 — set switch to PATCH (🔧) to bridge the line.";
  } else if (result.failure === "chain") {
    failHeadline = "FAIL // OPEN CIRCUIT GAP";
    failGuidance = "Signal cannot cross the R4 gap — set switch to PATCH (🔧) to bridge the line.";
  } else if (result.failure === "estimate") {
    const patchVal = config?.["R4"]?.patchValue ?? 0;
    const isOutlierSkewed = patchVal > 150 || patchVal >= 20000;
    failHeadline = "FAIL // CALIBRATION OUT OF SPEC";
    failGuidance = isOutlierSkewed
      ? "Input data has outliers (99,999 V included) — recalculate excluding the R3 outlier: (118+121+120+122)/4 = 120 V."
      : "Voltage out of spec — calculate average of clean nodes: (118 + 121 + 120 + 122) / 4 = 120 V.";
  }

  return (
    <div
      className={`diag-result-container ${isPass ? "border-emerald-600 bg-[#041207]" : "border-red-900 bg-[#140606]"}`}
      role="status"
      aria-live="assertive"
    >
      <div className={`diag-result-status-line ${isPass ? "pass text-emerald-400" : "fail text-red-400"}`}>
        <span>{isPass ? "✔" : "✕"}</span>
        <span className="font-bold text-xs">{isPass ? "PASS // TRANSMISSION VERIFIED" : failHeadline}</span>
      </div>

      <div className="diag-result-reason text-xs">
        {isPass ? (
          <span className="text-emerald-300 font-semibold">
            Signal successfully routed to roof antenna. Line stabilized at 120V nominal.
          </span>
        ) : (
          <span className="text-amber-300 font-semibold">{failGuidance}</span>
        )}
      </div>

      {/* Warnings lines */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="diag-result-warnings">
          {result.warnings.map((warn, i) => (
            <div key={i} className="diag-warning-line text-[10px] text-amber-400">
              <span>⚠</span>
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {isPass && (
        <div className="flex items-center gap-2 mt-1">
          {onContinue && (
            <button
              type="button"
              className="diag-continue-btn flex-1 py-1 px-3 bg-[#174822] hover:bg-[#20602f] text-[#5dfa87] font-bold border border-[#22d952] rounded cursor-pointer active:scale-95 text-xs shadow-[0_0_10px_rgba(34,217,82,0.3)]"
              onClick={onContinue}
              title="Close console and proceed"
            >
              <span>CONTINUE [ENTER] ►</span>
            </button>
          )}
          {onReset && (
            <button
              type="button"
              className="py-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 font-bold border border-neutral-700 hover:border-amber-500 rounded cursor-pointer active:scale-95 text-xs transition-all"
              onClick={onReset}
              title="Reset test result to configure and pull lever again"
            >
              <span>↺ RETEST</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ResultBar;
