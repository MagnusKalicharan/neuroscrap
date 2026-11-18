"use client";

import React, { useEffect, useRef } from "react";
import type { FeatureId } from "../nn/types";
import { FEATURES, FEATURE_ORDER } from "../nn/features";
import { renderGridToCanvas } from "./heatmapColors";
import { terminalSound } from "../../ui/terminal/sound";

export interface FeaturesColumnProps {
  selectedFeatures: FeatureId[];
  onToggleFeature: (id: FeatureId) => void;
  datasetId: string;
  mode: "watch" | "lab";
  datasetCategory: "beacon_signal" | "sandbox";
}

// Generates a static 16x16 thumbnail grid for a feature
function getFeatureThumbnail(featureId: FeatureId, res = 16): Float32Array {
  const grid = new Float32Array(res * res);
  const fn = FEATURES[featureId].compute;
  const step = 2.0 / (res - 1);
  let idx = 0;

  for (let r = 0; r < res; r++) {
    const y = 1.0 - r * step;
    for (let c = 0; c < res; c++) {
      const x = -1.0 + c * step;
      grid[idx++] = Math.max(-1, Math.min(1, fn(x, y)));
    }
  }
  return grid;
}

export function FeaturesColumn({
  selectedFeatures,
  onToggleFeature,
  datasetId,
  mode,
  datasetCategory,
}: FeaturesColumnProps) {
  const isLocked = mode === "watch";
  const lockTooltip = "Unlocks in the training lab";

  // Only X1 and X2 in Beacon mode; all 7 input features unlock in Playground mode
  const visibleFeatures =
    datasetCategory === "sandbox"
      ? FEATURE_ORDER
      : (["x1", "x2"] as FeatureId[]);

  return (
    <div
      className="w-[125px] h-full p-2 flex flex-col justify-start border-r border-[var(--term-outline-green)]/60 bg-[#020904] font-mono select-none shrink-0 text-xs gap-1.5 overflow-y-auto"
      role="region"
      aria-label="Features Selection Column"
    >
      {/* Title */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--term-outline-green)]/40">
        <span className="font-bold text-[11px] text-[var(--term-green-text-bright)] tracking-wider">
          FEATURES
        </span>
        {isLocked && (
          <span className="text-[10px] text-[#ffb700]" title={lockTooltip}>
            🔒
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[9px] text-[var(--term-green-text-dim)] uppercase tracking-tight">
        <span>Feed:</span>
        <span className="text-[8.5px] font-bold text-[#4BFF7B]">
          {selectedFeatures.length} active
        </span>
      </div>

      {/* Feature Buttons */}
      <div className="flex flex-col gap-1.5">
        {visibleFeatures.map((fId) => {
          const isSelected = selectedFeatures.includes(fId);
          const feat = FEATURES[fId];

          // Use Section 3 plain names for X1 and X2 if signal dataset
          let displayName = feat.mathLabel;
          let subLabel = "";
          if (fId === "x1") subLabel = "BRIGHTNESS";
          else if (fId === "x2") subLabel = "STEADY BEAT";
          else subLabel = feat.label.toUpperCase();

          return (
            <button
              key={fId}
              type="button"
              disabled={isLocked}
              onClick={() => {
                if (isLocked) return;
                terminalSound.playKeyTick();
                onToggleFeature(fId);
              }}
              title={isLocked ? lockTooltip : `${feat.label}: ${feat.mathLabel}`}
              className={`p-1.5 rounded border flex items-center justify-between gap-1.5 transition-all text-left ${
                isSelected
                  ? "border-[#2EE85C] bg-[#041c09] text-[#4BFF7B] shadow-[0_0_8px_rgba(46,232,92,0.3)] font-bold"
                  : isLocked
                  ? "border-[var(--term-outline-green)]/20 bg-[#020803] text-[var(--term-green-text-dim)] opacity-40 cursor-not-allowed"
                  : "border-[var(--term-outline-green)]/50 bg-[#031106] hover:border-[#4bff7b] text-[var(--term-green-text)] cursor-pointer"
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-black tracking-wide leading-tight">
                  {displayName}
                </span>
                {subLabel && (
                  <span className="text-[8px] text-[var(--term-green-text-dim)] uppercase tracking-tight truncate">
                    {subLabel}
                  </span>
                )}
              </div>

              {/* 24x24 Feature Thumbnail Canvas */}
              <FeatureCanvas featureId={fId} />
            </button>
          );
        })}
      </div>

      {/* Extra Inputs Locked Notice in Beacon Mode */}
      {datasetCategory === "beacon_signal" && (
        <div className="text-[8.5px] p-2 rounded bg-[#010803] border border-[var(--term-outline-green)]/30 text-[var(--term-green-text-dim)] leading-tight flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-1 text-[#FFB700] font-bold">
            <span>🔒</span>
            <span>EXTRA INPUTS</span>
          </div>
          <div>Higher-order inputs unlock in <span className="text-[#FFB700] font-bold">PLAYGROUND</span>.</div>
        </div>
      )}
    </div>
  );
}

function FeatureCanvas({ featureId }: { featureId: FeatureId }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const grid = getFeatureThumbnail(featureId, 16);
      renderGridToCanvas(grid, canvasRef.current, 16, false);
    }
  }, [featureId]);

  return (
    <canvas
      ref={canvasRef}
      width={24}
      height={24}
      className="w-6 h-6 rounded border border-[var(--term-outline-green)]/40 shrink-0 bg-black"
    />
  );
}
