"use client";

import React from "react";
import type { Point2D } from "./bezier";

export interface NeuronAccumulationData {
  variableName: string;
  inputs: Array<{ sourceId: string; sourceVar: string; weight: number; activation: number; product: number }>;
  bias: number;
  z: number;
  a: number;
}

export interface NeuronArrivalBadgeProps {
  nodeId: string;
  data: NeuronAccumulationData;
  pos: Point2D;
  isOutput?: boolean;
}

export function NeuronArrivalBadge({
  nodeId,
  data,
  pos,
  isOutput = false,
}: NeuronArrivalBadgeProps) {
  return (
    <div
      style={{
        left: pos.x,
        top: pos.y + 24,
        transform: "translateX(-50%)",
      }}
      className="absolute pointer-events-none z-30 flex flex-col items-center select-none"
    >
      {/* Sleek, ultra-compact pill under the neuron (NO clumping) */}
      <div className="px-2.5 py-0.5 rounded-full bg-[#020e05]/95 border border-[#2EE85C] shadow-[0_0_12px_rgba(46,232,92,0.4)] flex items-center gap-1.5 text-[10px] font-mono whitespace-nowrap">
        <span className="text-gray-300 font-semibold">
          z={data.z >= 0 ? "+" : ""}{data.z.toFixed(2)}
        </span>
        <span className="text-[#2EE85C] font-bold">➔</span>
        <span className="text-[#4BFF7B] font-black">
          a={data.a >= 0 ? "+" : ""}{data.a.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function NeuronDeltaBadge({
  nodeId,
  delta,
  pos,
}: {
  nodeId: string;
  delta: number;
  pos: Point2D;
}) {
  return (
    <div
      style={{
        left: pos.x,
        top: pos.y + 22,
        transform: "translateX(-50%)",
      }}
      className="absolute pointer-events-none z-30 flex flex-col items-center select-none animate-fade-in"
    >
      <div className="px-2.5 py-0.5 rounded-full bg-[#200213]/95 border border-[#E82EA5] shadow-[0_0_12px_rgba(232,46,165,0.4)] flex items-center gap-1.5 text-[10px] font-mono text-[#FF80DF] whitespace-nowrap font-bold">
        <span className="text-[#FF80DF] font-bold">δ:</span>
        <span className="font-black text-white">
          {delta >= 0 ? "+" : ""}{delta.toFixed(3)}
        </span>
      </div>
    </div>
  );
}
