"use client";

import React from "react";
import type { RelayNodeData } from "../nodeData";
import type { NodeConfig } from "../evaluateConfig";

interface NodeBlockProps {
  node?: RelayNodeData;
  config?: NodeConfig;
  isScanned?: boolean;
  type?: "source" | "node" | "antenna";
  reduceMotion?: boolean;
}

export function NodeBlock({
  node,
  config,
  isScanned = true,
  type = "node",
  reduceMotion = false,
}: NodeBlockProps) {
  if (type === "source") {
    return (
      <div className="diag-node-block source-block relative" aria-label="Data Source">
        <div className="diag-node-header">
          <span>SRC</span>
          <span className="text-[10px] text-cyan-400 font-bold">DATA</span>
        </div>
        <div className="diag-node-value text-cyan-300 text-[15px] font-black">
          PACKET
        </div>
        <div className="diag-node-footer">
          <span className="text-[9px] text-cyan-500 uppercase tracking-wider font-bold">
            TX BUS ►
          </span>
        </div>
        {/* Output Conductor Pin */}
        <span
          className="absolute -right-[4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black bg-[#22d952] shadow-[0_0_6px_#22d952]"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (type === "antenna") {
    return (
      <div className="diag-node-block antenna-block relative" aria-label="Roof Antenna Destination">
        {/* Input Conductor Pin */}
        <span
          className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black bg-[#22d952] shadow-[0_0_6px_#22d952]"
          aria-hidden="true"
        />
        <div className="diag-node-header">
          <span>DEST</span>
          <span className="text-[10px] text-emerald-400 font-bold">ROOF</span>
        </div>
        <div className="diag-node-value text-emerald-400 text-[15px] font-black">
          ANTENNA
        </div>
        <div className="diag-node-footer">
          <span className="text-[9px] text-emerald-500 uppercase tracking-wider font-bold">
            ▲ UPLINK
          </span>
        </div>
      </div>
    );
  }

  if (!node) return null;

  const mode = config?.mode || "connect";
  const isPatched = mode === "patch";
  const isIgnored = mode === "ignore";
  const isSurge = node.kind === "surge";
  const isMissing = node.kind === "missing";

  // Determine display value
  let displayValue: string;
  let valClass = "healthy";

  if (!isScanned) {
    displayValue = "-- V";
    valClass = "unscanned";
  } else if (isPatched) {
    displayValue = `${config?.patchValue ?? 120} V`;
    valClass = "patched";
  } else if (isMissing) {
    displayValue = "GAP";
    valClass = "missing";
  } else if (isSurge) {
    displayValue = "99,999 V";
    valClass = "surge";
  } else {
    displayValue = `${node.reading} V`;
    valClass = "healthy";
  }

  return (
    <div
      className={`diag-node-block relative ${
        isMissing ? "kind-missing" : isSurge ? "kind-surge" : ""
      } ${isIgnored ? "mode-ignore" : isPatched ? "mode-patch" : ""}`}
      aria-label={`Relay Node ${node.label}, status: ${mode}, reading: ${displayValue}`}
    >
      {/* Left Input Terminal Pin */}
      <span
        className={`absolute -left-[4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black transition-colors ${
          isMissing && !isPatched ? "bg-amber-600 shadow-[0_0_4px_#d97706]" : "bg-[#22d952] shadow-[0_0_6px_#22d952]"
        }`}
        aria-hidden="true"
      />

      {/* Right Output Terminal Pin */}
      <span
        className={`absolute -right-[4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black transition-colors ${
          isMissing && !isPatched ? "bg-amber-600 shadow-[0_0_4px_#d97706]" : "bg-[#22d952] shadow-[0_0_6px_#22d952]"
        }`}
        aria-hidden="true"
      />

      {/* Top Header: Label + Status */}
      <div className="diag-node-header">
        <span className="text-xs font-bold text-white tracking-wider">{node.label}</span>
        {isSurge ? (
          <span className="text-[10px] text-red-400 font-bold tracking-tight">⚡ SURGE</span>
        ) : isMissing ? (
          <span className="text-[10px] text-amber-400 font-bold tracking-tight">⊘ GAP</span>
        ) : (
          <span className="text-[10px] text-emerald-400 font-bold tracking-tight">● OK</span>
        )}
      </div>

      {/* Middle: Big Voltage Readout */}
      <div
        className={`diag-node-value ${valClass} ${isIgnored ? "line-through opacity-50" : ""}`}
      >
        {displayValue}
      </div>

      {/* Bottom Footer: Single Clean Mode Badge */}
      <div className="diag-node-footer">
        {isIgnored ? (
          <span className="w-full text-center text-[9px] text-zinc-400 font-bold uppercase tracking-wider bg-zinc-900/90 py-0.5 rounded border border-zinc-700">
            IGNORED
          </span>
        ) : isPatched ? (
          <span className="w-full text-center text-[9px] text-amber-300 font-bold uppercase tracking-wider bg-amber-950/90 py-0.5 rounded border border-amber-600">
            PATCHED
          </span>
        ) : (
          <span className="w-full text-center text-[9px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/90 py-0.5 rounded border border-emerald-700">
            CONNECT
          </span>
        )}
      </div>
    </div>
  );
}

export default NodeBlock;
