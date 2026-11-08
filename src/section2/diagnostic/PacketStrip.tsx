"use client";

import React from "react";
import { RELAY_NODES } from "../nodeData";
import type { RelayConfig } from "../evaluateConfig";

interface PacketStripProps {
  config: RelayConfig;
  scannedNodeIds: string[];
}

export function PacketStrip({ config, scannedNodeIds }: PacketStripProps) {
  return (
    <div className="diag-packet-strip" aria-label="Transmission Packet Payload Preview">
      {/* Col 0: Label */}
      <div className="flex items-center justify-center text-[11px] text-[#5dfa87] font-black tracking-wider uppercase">
        <span>TX PACKET:</span>
      </div>

      {/* Cols 1 to 6: R1 through R6 values */}
      {RELAY_NODES.map((node) => {
        const isScanned = scannedNodeIds.includes(node.id);
        const nodeCfg = config[node.id] || { mode: "connect" };
        const mode = nodeCfg.mode;

        let display: React.ReactNode;

        if (!isScanned) {
          display = <span className="opacity-40 text-xs font-mono">-- V</span>;
        } else if (mode === "ignore") {
          display = (
            <span className="text-zinc-400 font-bold text-xs tracking-wider font-mono" title="Bypassed from packet">
              BYPASS
            </span>
          );
        } else if (mode === "patch") {
          const val = nodeCfg.patchValue ?? 120;
          const isOverRange = val > 150;
          display = (
            <span
              className={`font-black text-xs font-mono ${isOverRange ? "text-red-400" : "text-amber-400"}`}
              title={`Patched value: ${val} V`}
            >
              🔧 {val}V
            </span>
          );
        } else {
          // mode === "connect"
          if (node.kind === "missing") {
            display = (
              <span className="text-amber-400 font-bold text-xs font-mono" title="No component present">
                ⊘ GAP
              </span>
            );
          } else if (node.kind === "surge") {
            display = (
              <span className="text-red-400 font-black text-xs font-mono animate-pulse" title="Surge voltage">
                ⚡ 99kV
              </span>
            );
          } else {
            display = (
              <span className="text-[#5dfa87] font-bold text-xs font-mono" title={`${node.reading} V`}>
                {node.reading}V
              </span>
            );
          }
        }

        return (
          <div key={node.id} className="flex items-center justify-center gap-1 text-xs font-mono w-full text-center">
            <span className="text-[10px] text-zinc-500 font-bold">{node.label}:</span>
            {display}
          </div>
        );
      })}

      {/* Col 7: Destination */}
      <div className="flex items-center justify-center text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
        <span>📶 ROOF</span>
      </div>
    </div>
  );
}

export default PacketStrip;
