"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Network, Node, Link } from "../nn/types";
import { neuronGrid } from "../nn/network";
import { renderGridToCanvas, getHeatmapColor } from "./heatmapColors";
import { terminalSound } from "../../ui/terminal/sound";
import type { MathStep, GradientSummaryEntry } from "../math/types";
import { FloatingMathPanel } from "../math/FloatingMathPanel";
import { PacketLayer } from "../math/PacketLayer";
import { NeuronArrivalBadge, NeuronDeltaBadge } from "../math/NeuronArrivalBadge";
import {
  type SimulationFrame,
  type TravelingPacket,
  getNodeVariable,
} from "../math/packetSimulation";

export interface NetworkColumnProps {
  network: Network;
  renderTick?: number;
  hiddenLayers: number[];
  onChangeHiddenLayers: (layers: number[]) => void;
  mode: "watch" | "lab";
  reducedMotion?: boolean;
  isPlaying?: boolean;
  onEditWeight?: (linkId: string, newWeight: number) => void;

  // Cisco Packet Tracer simulation integration
  simulationActive?: boolean;
  currentFrame?: SimulationFrame | null;
  animProgress?: number;
  onInspectPacket?: (pkt: TravelingPacket) => void;

  // Mathematical Walkthrough integration
  mathWalkthroughActive?: boolean;
  currentMathStep?: MathStep | null;
  gradientSummary?: GradientSummaryEntry[];
  onNextMathStep?: () => void;
  onPrevMathStep?: () => void;
}

export function NetworkColumn({
  network,
  renderTick = 0,
  hiddenLayers,
  onChangeHiddenLayers,
  mode,
  reducedMotion = false,
  isPlaying = false,
  onEditWeight,
  simulationActive = true,
  currentFrame = null,
  animProgress = 0.5,
  onInspectPacket,
  mathWalkthroughActive = false,
  currentMathStep = null,
  gradientSummary = [],
  onNextMathStep,
  onPrevMathStep,
}: NetworkColumnProps) {
  const isLocked = mode === "watch";
  const lockTooltip = "Unlocks in the training lab";

  const [hoveredLink, setHoveredLink] = useState<{
    link: Link;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredNode, setHoveredNode] = useState<{
    node: Node;
    x: number;
    y: number;
  } | null>(null);

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editWeightInput, setEditWeightInput] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 500, height: 490 });

  const updateDims = useCallback(() => {
    const el = stageRef.current || containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDims({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateDims();
    const el = stageRef.current || containerRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        updateDims();
      });
      ro.observe(el);
    }

    window.addEventListener("resize", updateDims);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", updateDims);
    };
  }, [updateDims, hiddenLayers]);

  // Adjust layer count
  const handleAddLayer = () => {
    if (hiddenLayers.length >= 6 || isLocked) return;
    terminalSound.playKeyTick();
    onChangeHiddenLayers([...hiddenLayers, 2]);
  };

  const handleRemoveLayer = () => {
    if (hiddenLayers.length <= 0 || isLocked) return;
    terminalSound.playKeyTick();
    onChangeHiddenLayers(hiddenLayers.slice(0, -1));
  };

  // Adjust neuron count in layer
  const handleAddNeuron = (lIdx: number) => {
    if (hiddenLayers[lIdx] >= 8 || isLocked) return;
    terminalSound.playKeyTick();
    const updated = [...hiddenLayers];
    updated[lIdx]++;
    onChangeHiddenLayers(updated);
  };

  const handleRemoveNeuron = (lIdx: number) => {
    if (hiddenLayers[lIdx] <= 1 || isLocked) return;
    terminalSound.playKeyTick();
    const updated = [...hiddenLayers];
    updated[lIdx]--;
    onChangeHiddenLayers(updated);
  };

  // Calculate Node Coordinates in stage space with generous vertical & horizontal separation
  const totalCols = hiddenLayers.length + 2; // Input, Hiddens..., Output

  const nodePositions = new Map<string, { x: number; y: number }>();

  function layoutColumn(nodes: Node[], colIdx: number) {
    const stageW = stageRef.current?.clientWidth || dims.width;
    const stageH = stageRef.current?.clientHeight || dims.height;

    // Generous margins: 45px on left, 70px on right
    // Guarantees output neuron ŷ is 100% visible with 54px clearance from the right border!
    const leftMargin = 45;
    const rightMargin = 70;
    const availableW = Math.max(180, stageW - leftMargin - rightMargin);
    const colStep = totalCols > 1 ? availableW / (totalCols - 1) : availableW;
    const x = leftMargin + colIdx * colStep;

    const n = nodes.length;
    const topMargin = 50;
    const bottomMargin = 50;
    const availableH = Math.max(180, stageH - topMargin - bottomMargin);

    let spacing = 120;
    let startY = topMargin + availableH / 2;

    if (n === 1) {
      startY = topMargin + availableH / 2;
      spacing = 0;
    } else if (n === 2) {
      // Generous vertical spread for 2 neurons: 175px separation (zero overlap!)
      spacing = Math.min(185, availableH * 0.58);
      startY = topMargin + (availableH - spacing) / 2;
    } else {
      spacing = Math.min(95, availableH / (n - 0.2));
      startY = topMargin + (availableH - spacing * (n - 1)) / 2;
    }

    nodes.forEach((node, i) => {
      const y = n === 1 ? startY : startY + i * spacing;
      nodePositions.set(node.id, { x, y });
    });
  }

  // 1. Input nodes
  layoutColumn(network.inputNodes, 0);

  // 2. Hidden nodes
  network.hiddenLayers.forEach((layer, lIdx) => {
    layoutColumn(layer, lIdx + 1);
  });

  // 3. Output node
  layoutColumn([network.outputNode], totalCols - 1);

  // ── Compute Anchor & Positioning for Floating Math Panel (if active) ───────
  let anchorPos: { x: number; y: number } | null = null;
  if (mathWalkthroughActive && currentMathStep) {
    if (currentMathStep.targetNodeId && nodePositions.has(currentMathStep.targetNodeId)) {
      anchorPos = nodePositions.get(currentMathStep.targetNodeId)!;
    } else if (currentMathStep.targetLinkId) {
      const l = network.allLinks.find((lnk) => lnk.id === currentMathStep.targetLinkId);
      if (l) {
        const p1 = nodePositions.get(l.sourceNodeId);
        const p2 = nodePositions.get(l.targetNodeId);
        if (p1 && p2) {
          anchorPos = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        }
      }
    } else if (currentMathStep.targetType === "loss") {
      const pOut = nodePositions.get(network.outputNode.id);
      if (pOut) {
        anchorPos = { x: pOut.x + 20, y: pOut.y };
      }
    }
  }

  let panelPos = { x: 40, y: 30 };
  let connectorLine = null;

  if (anchorPos) {
    if (anchorPos.x < dims.width * 0.45) {
      panelPos = {
        x: Math.min(dims.width - 390, anchorPos.x + 40),
        y: Math.max(15, Math.min(dims.height - 350, anchorPos.y - 70)),
      };
    } else {
      panelPos = {
        x: Math.max(10, anchorPos.x - 395),
        y: Math.max(15, Math.min(dims.height - 350, anchorPos.y - 70)),
      };
    }

    const panelTargetEdgeX = anchorPos.x < dims.width * 0.45 ? panelPos.x : panelPos.x + 380;
    const panelTargetEdgeY = panelPos.y + 35;

    const strokeColor =
      currentMathStep?.glowColor === "magenta"
        ? "#E82EA5"
        : currentMathStep?.glowColor === "amber"
        ? "#FFB700"
        : "#2EE85C";

    connectorLine = {
      x1: anchorPos.x,
      y1: anchorPos.y,
      x2: panelTargetEdgeX,
      y2: panelTargetEdgeY,
      color: strokeColor,
    };
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full p-2.5 flex flex-col justify-between border-r border-[var(--term-outline-green)]/60 bg-[#020a04] font-mono select-none relative overflow-hidden min-w-[340px]"
      role="region"
      aria-label="Neural Network Architecture Column"
    >
      {/* ── Top Architecture Bar ───────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--term-outline-green)]/40 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[12px] text-[var(--term-green-text-bright)] tracking-wider">
            HIDDEN LAYERS: {hiddenLayers.length}
          </span>
          <div className="flex items-center rounded border border-[var(--term-outline-green)] bg-[#031106]">
            <button
              type="button"
              disabled={hiddenLayers.length <= 0 || isLocked}
              onClick={handleRemoveLayer}
              title={isLocked ? lockTooltip : "Remove Hidden Layer"}
              className={`w-5 h-5 flex items-center justify-center font-bold text-xs ${
                hiddenLayers.length <= 0 || isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-[#07240f] text-[var(--term-green-text-bright)] cursor-pointer"
              }`}
            >
              -
            </button>
            <button
              type="button"
              disabled={hiddenLayers.length >= 6 || isLocked}
              onClick={handleAddLayer}
              title={isLocked ? lockTooltip : "Add Hidden Layer"}
              className={`w-5 h-5 flex items-center justify-center font-bold text-xs border-l border-[var(--term-outline-green)] ${
                hiddenLayers.length >= 6 || isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-[#07240f] text-[var(--term-green-text-bright)] cursor-pointer"
              }`}
            >
              +
            </button>
          </div>
          {isLocked && (
            <span className="text-[11px] text-[#ffb700]" title={lockTooltip}>
              🔒
            </span>
          )}
        </div>

        {/* Per-layer neuron count badges */}
        <div className="flex items-center gap-2">
          {hiddenLayers.map((count, lIdx) => (
            <div
              key={`h-ctrl-${lIdx}`}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--term-outline-green)]/60 bg-[#031106] text-[10px]"
            >
              <span className="text-[var(--term-green-text-dim)]">L{lIdx + 1}:</span>
              <span className="text-[var(--term-green-text-bright)] font-bold">{count}</span>
              <button
                type="button"
                disabled={count <= 1 || isLocked}
                onClick={() => handleRemoveNeuron(lIdx)}
                className="w-3.5 h-3.5 leading-none hover:text-[#ffb700] disabled:opacity-30"
              >
                -
              </button>
              <button
                type="button"
                disabled={count >= 8 || isLocked}
                onClick={() => handleAddNeuron(lIdx)}
                className="w-3.5 h-3.5 leading-none hover:text-[#ffb700] disabled:opacity-30"
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Interactive Network SVG, Synapses, Neurons & Packet Simulation ─ */}
      <div
        ref={stageRef}
        className="relative flex-1 w-full h-full min-h-0 overflow-hidden"
      >
        {/* SVG Connections Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-auto"
          style={{ overflow: "visible" }}
        >
          <defs>
            <style>{`
              @keyframes flowDash {
                to { stroke-dashoffset: -20; }
              }
              @keyframes backflowDash {
                to { stroke-dashoffset: 20; }
              }
              .flowing-link {
                stroke-dasharray: 4, 3;
                animation: flowDash 0.8s linear infinite;
              }
              .backflowing-link {
                stroke-dasharray: 4, 3;
                animation: backflowDash 0.8s linear infinite;
              }
            `}</style>
          </defs>

          {network.allLinks.map((link) => {
            const p1 = nodePositions.get(link.sourceNodeId);
            const p2 = nodePositions.get(link.targetNodeId);
            if (!p1 || !p2) return null;

            // Live real-time weight value (updates as backprop wave passes!)
            const liveWeight = simulationActive && currentFrame?.liveWeights
              ? currentFrame.liveWeights.get(link.id) ?? link.weight
              : link.weight;

            const isPositive = liveWeight >= 0;
            const strokeColor = isPositive ? "#2EE85C" : "#FFB700";
            const strokeW = Math.max(0.6, Math.min(6.0, Math.abs(liveWeight) * 2.5));
            const isHovered = hoveredLink?.link.id === link.id;

            // Check if link is active in simulation
            const isSimActiveLink =
              simulationActive &&
              currentFrame?.activeLinkIds?.includes(link.id);

            const isSimBackward =
              simulationActive && currentFrame?.event.phase === "backward";

            // Mathematical walkthrough highlight (fallback)
            const isMathActiveLink =
              mathWalkthroughActive &&
              currentMathStep?.activeLinkIds?.includes(link.id);

            const isBackpropPhase =
              currentMathStep?.phase.includes("delta") ||
              currentMathStep?.phase.includes("grad");

            const activeColor =
              isSimActiveLink
                ? isSimBackward
                  ? "#E82EA5"
                  : "#2EE85C"
                : isMathActiveLink
                ? isBackpropPhase
                  ? "#E82EA5"
                  : "#2EE85C"
                : strokeColor;

            const isLinkActive = isSimActiveLink || isMathActiveLink;

            // Cubic Bezier curve
            const dx = (p2.x - p1.x) * 0.45;
            const d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;

            return (
              <g
                key={link.id}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  const rx = e.clientX - (rect?.left || 0);
                  const ry = e.clientY - (rect?.top || 0);
                  setHoveredLink({ link, x: rx, y: ry });
                }}
                onMouseOver={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  const rx = e.clientX - (rect?.left || 0);
                  const ry = e.clientY - (rect?.top || 0);
                  setHoveredLink({ link, x: rx, y: ry });
                }}
                onMouseLeave={() => setHoveredLink(null)}
              >
                {/* Thick invisible stroke for mouse hovering */}
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(0,0,0,0.001)"
                  strokeWidth="16"
                  style={{ pointerEvents: "stroke" }}
                  onClick={() => {
                    if (isLocked) return;
                    setEditingLinkId(link.id);
                    setEditWeightInput(liveWeight.toFixed(3));
                  }}
                />

                {/* Visible colored connection */}
                <path
                  d={d}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth={
                    isLinkActive
                      ? Math.max(3.8, strokeW + 2)
                      : isHovered
                      ? strokeW + 2
                      : strokeW
                  }
                  opacity={
                    isLinkActive
                      ? 1.0
                      : simulationActive || mathWalkthroughActive
                      ? 0.35
                      : isHovered
                      ? 1.0
                      : 0.82
                  }
                  className={
                    isSimActiveLink
                      ? isSimBackward
                        ? "backflowing-link"
                        : "flowing-link"
                      : isMathActiveLink
                      ? isBackpropPhase
                        ? "backflowing-link"
                        : "flowing-link"
                      : isPlaying && !reducedMotion
                      ? "flowing-link"
                      : ""
                  }
                  style={{
                    pointerEvents: "stroke",
                    filter: isLinkActive
                      ? `drop-shadow(0 0 8px ${activeColor})`
                      : isHovered
                      ? `drop-shadow(0 0 6px ${strokeColor})`
                      : undefined,
                  }}
                />
              </g>
            );
          })}

          {/* Glowing connector line (for walkthrough mode) */}
          {connectorLine && (
            <g className="pointer-events-none">
              <line
                x1={connectorLine.x1}
                y1={connectorLine.y1}
                x2={connectorLine.x2}
                y2={connectorLine.y2}
                stroke={connectorLine.color}
                strokeWidth="2"
                strokeDasharray="4 3"
                opacity="0.9"
                style={{
                  filter: `drop-shadow(0 0 6px ${connectorLine.color})`,
                }}
              />
              <circle
                cx={connectorLine.x1}
                cy={connectorLine.y1}
                r="4.5"
                fill={connectorLine.color}
                style={{
                  filter: `drop-shadow(0 0 8px ${connectorLine.color})`,
                }}
              />
              <circle
                cx={connectorLine.x2}
                cy={connectorLine.y2}
                r="3"
                fill={connectorLine.color}
              />
            </g>
          )}
        </svg>

        {/* ── Traveling Values Layer (NO ENVELOPE ICONS, COMPACT PILLS) ─ */}
        {simulationActive && currentFrame && (
          <PacketLayer
            packets={currentFrame.packets}
            nodePositions={nodePositions}
            network={network}
            animProgress={animProgress}
            onInspectPacket={onInspectPacket}
          />
        )}

        {/* ── Compact Neuron Arrival & Activation Badges (Seamless Handoff as Packets Absorb) ── */}
        {simulationActive &&
          currentFrame?.neuronAccumulations &&
          animProgress >= 0.52 &&
          Array.from(currentFrame.neuronAccumulations.entries()).map(
            ([nodeId, data]) => {
              const pos = nodePositions.get(nodeId);
              if (!pos) return null;
              return (
                <NeuronArrivalBadge
                  key={`arrival-${nodeId}`}
                  nodeId={nodeId}
                  data={data}
                  pos={pos}
                  isOutput={nodeId === network.outputNode.id}
                />
              );
            }
          )}

        {/* ── Layer-by-Layer Backward Error Delta Badges (Live δ signals) ── */}
        {simulationActive &&
          currentFrame?.neuronDeltas &&
          Array.from(currentFrame.neuronDeltas.entries()).map(
            ([nodeId, data]) => {
              const pos = nodePositions.get(nodeId);
              if (!pos) return null;
              return (
                <NeuronDeltaBadge
                  key={`delta-${nodeId}`}
                  nodeId={nodeId}
                  delta={data.delta}
                  pos={pos}
                />
              );
            }
          )}

        {/* ── Output Prediction & Loss Synthesis Badge (positioned in clean bottom corner) ── */}
        {simulationActive && currentFrame?.lossData && currentFrame.stageIndex >= 6 && (
          <div
            style={{
              right: 12,
              bottom: 12,
            }}
            className="absolute pointer-events-none z-30 bg-[#020e05]/95 border border-[#2EE85C] p-2 rounded text-[9.5px] font-mono shadow-[0_0_16px_rgba(46,232,92,0.4)] backdrop-blur-md flex flex-col gap-0.5 min-w-[145px] animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-[#2EE85C]/40 pb-0.5">
              <span className="font-black text-[#4BFF7B] uppercase tracking-wider text-[9px]">
                {currentFrame.stageIndex >= 9 ? "LEARNING VERIFIED" : "LOSS SYNTHESIS"}
              </span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-[#041d08] text-[#FFB700] font-bold">
                L=½(ŷ-y)²
              </span>
            </div>

            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[var(--term-green-text-dim)]">PRED (ŷ):</span>
              <span className="font-bold text-white">
                {currentFrame.lossData.prediction >= 0 ? "+" : ""}
                {currentFrame.lossData.prediction.toFixed(3)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[9px]">
              <span className="text-[var(--term-green-text-dim)]">TARGET (y):</span>
              <span
                className={`font-bold ${
                  currentFrame.lossData.target > 0 ? "text-[#FFB700]" : "text-[#2EE85C]"
                }`}
              >
                {currentFrame.lossData.target > 0 ? "+1 (MACHINE)" : "-1 (NATURAL)"}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--term-outline-green)]/30 pt-0.5 text-[9px]">
              <span className="text-[#4BFF7B] font-bold">LOSS:</span>
              <span className="font-black text-[#4BFF7B]">
                {currentFrame.lossData.loss.toFixed(4)}
              </span>
            </div>

            {currentFrame.lossData.lossReduction !== undefined && (
              <div className="flex items-center justify-between border-t border-[#2EE85C] pt-0.5 text-[#4BFF7B] text-[8.5px]">
                <span className="font-bold">ΔL:</span>
                <span className="font-black">
                  {currentFrame.lossData.lossReduction.toFixed(5)} ✓
                </span>
              </div>
            )}
          </div>
        )}

        {/* HTML/Canvas Neuron Nodes Overlay with Clean Variable Names */}
        {network.allNodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isInput = node.layerIdx === 0;
          const isOutput = node.id === network.outputNode.id;

          const isSimActiveNode =
            simulationActive &&
            currentFrame?.activeNodeIds?.includes(node.id);

          const isSimBackward =
            simulationActive && currentFrame?.event.phase === "backward";

          const isMathActiveNode =
            mathWalkthroughActive &&
            currentMathStep?.activeNodeIds?.includes(node.id);

          const isNodeActive = isSimActiveNode || isMathActiveNode;
          const isBackprop = isSimBackward || currentMathStep?.phase.includes("delta");

          const activeBorder = isBackprop
            ? "border-[#E82EA5] shadow-[0_0_18px_#E82EA5]"
            : "border-[#2EE85C] shadow-[0_0_18px_#2EE85C]";

          // Live real-time bias value
          const liveBias = simulationActive && currentFrame?.liveBiases
            ? currentFrame.liveBiases.get(node.id) ?? node.bias
            : node.bias;

          // Assigned human-readable variable (e.g. x₁, h₁⁽¹⁾, ŷ)
          const nodeVar = getNodeVariable(node.id, network);

          // Whether this node has an arrival or delta badge showing
          const hasArrivalBadge =
            simulationActive &&
            ((currentFrame?.neuronAccumulations?.has(node.id)) ||
             (currentFrame?.neuronDeltas?.has(node.id)));

          return (
            <div
              key={node.id}
              style={{
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, -50%)",
              }}
              className="absolute z-10 flex flex-col items-center justify-center cursor-pointer select-none"
              onMouseEnter={(e) => {
                const rect = containerRef.current?.getBoundingClientRect();
                setHoveredNode({
                  node,
                  x: e.clientX - (rect?.left || 0),
                  y: e.clientY - (rect?.top || 0),
                });
              }}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* ── Assigned Variable Label Above Neuron (e.g. x₁, h₁⁽¹⁾, ŷ) ── */}
              <span className="absolute -top-4 text-[9.5px] font-mono font-bold text-[#4BFF7B] tracking-wider pointer-events-none whitespace-nowrap">
                {nodeVar}
              </span>

              {/* Neuron Card (Small square showing heatmap) */}
              <div
                className={`relative w-8 h-8 rounded border bg-[#020a04] flex items-center justify-center transition-all ${
                  isNodeActive
                    ? `${activeBorder} ring-2 ring-white/50 scale-110 z-20`
                    : isOutput
                    ? "border-[#2EE85C] shadow-[0_0_10px_rgba(46,232,92,0.5)]"
                    : isInput
                    ? "border-[var(--term-outline-green)]/80"
                    : "border-[var(--term-outline-green)] hover:border-[#ffb700]"
                }`}
              >
                {/* 10x10 Heatmap Canvas */}
                <NeuronCanvas
                  network={network}
                  layerIdx={node.layerIdx}
                  nodeIdx={node.nodeIdx}
                  renderTick={renderTick}
                />

                {/* Bias indicator square at bottom-left with live color */}
                {node.inputLinks.length > 0 && (
                  <div
                    style={{
                      backgroundColor: `rgb(${getHeatmapColor(liveBias).slice(0, 3).join(",")})`,
                    }}
                    title={`Bias: ${liveBias.toFixed(3)}`}
                    className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-sm border border-black shadow-xs transition-colors duration-300"
                  />
                )}

                {/* Star badge showing active receiving node in simulation */}
                {isNodeActive && (
                  <span
                    className="absolute -top-2 -right-2 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black text-black"
                    style={{
                      backgroundColor: isBackprop ? "#E82EA5" : "#2EE85C",
                    }}
                  >
                    ★
                  </span>
                )}
              </div>

              {/* ── Clean Output Value Below Neuron (when no arrival badge) ── */}
              {!hasArrivalBadge && (
                <span
                  suppressHydrationWarning
                  className="absolute -bottom-4 text-[8px] font-mono text-[var(--term-green-text-dim)] pointer-events-none whitespace-nowrap"
                >
                  {isInput
                    ? `${node.output.toFixed(2)}`
                    : `a:${node.output >= 0 ? "+" : ""}${node.output.toFixed(2)}`}
                </span>
              )}
            </div>
          );
        })}

        {/* Floating Mathematical Calculation Panel (Walkthrough Mode) */}
        {mathWalkthroughActive && currentMathStep && (
          <FloatingMathPanel
            step={currentMathStep}
            gradientSummary={gradientSummary}
            position={panelPos}
            onNextStep={onNextMathStep}
            onPrevStep={onPrevMathStep}
          />
        )}

        {/* Hover Tooltip for Link / Weight */}
        {hoveredLink && !simulationActive && (
          <div
            style={{
              left: Math.min(dims.width - 150, hoveredLink.x + 12),
              top: Math.max(10, hoveredLink.y - 16),
            }}
            className="absolute pointer-events-none z-30 bg-[#020e04] border border-[#ffb700] px-2.5 py-1.5 rounded text-[11px] font-mono text-[#ffb700] shadow-xl flex flex-col gap-0.5"
          >
            <div className="text-[10px] text-[var(--term-green-text-dim)]">
              {hoveredLink.link.sourceNodeId} ➔ {hoveredLink.link.targetNodeId}
            </div>
            <div className="font-bold flex items-center gap-1.5">
              <span>WEIGHT:</span>
              <span
                style={{
                  color: hoveredLink.link.weight >= 0 ? "#4BFF7B" : "#FFB700",
                }}
              >
                {hoveredLink.link.weight >= 0 ? "+" : ""}
                {hoveredLink.link.weight.toFixed(3)}
              </span>
            </div>
          </div>
        )}

        {/* Enlarged Hover Card for Neuron */}
        {hoveredNode && !simulationActive && (
          <div
            style={{
              left: Math.min(dims.width - 190, hoveredNode.x + 16),
              top: Math.max(10, hoveredNode.y - 60),
            }}
            className="absolute pointer-events-none z-30 bg-[#020e04] border-2 border-[var(--term-outline-green)] p-2.5 rounded text-[11px] font-mono text-[var(--term-green-text-bright)] shadow-2xl flex flex-col gap-1.5 min-w-[170px]"
          >
            <div className="flex items-center justify-between border-b border-[var(--term-outline-green)]/50 pb-1">
              <span className="font-black text-[#ffb700] tracking-wider">
                {getNodeVariable(hoveredNode.node.id, network)} ({hoveredNode.node.id.toUpperCase()})
              </span>
              <span className="text-[9px] text-[var(--term-green-text-dim)] uppercase">
                {hoveredNode.node.activation}
              </span>
            </div>

            {/* Enlarged 10x10 Heatmap Canvas */}
            <div className="flex items-center gap-2.5 py-1">
              <div className="w-[50px] h-[50px] rounded border border-[var(--term-outline-green)]/80 overflow-hidden shrink-0 bg-black">
                <NeuronCanvasEnlarged
                  network={network}
                  layerIdx={hoveredNode.node.layerIdx}
                  nodeIdx={hoveredNode.node.nodeIdx}
                  renderTick={renderTick}
                />
              </div>

              <div className="flex flex-col text-[10.5px] leading-tight">
                <div>
                  <span className="text-[var(--term-green-text-dim)]">OUT: </span>
                  <span className="font-bold text-[#4BFF7B]">
                    {hoveredNode.node.output >= 0 ? "+" : ""}
                    {hoveredNode.node.output.toFixed(3)}
                  </span>
                </div>
                {hoveredNode.node.inputLinks.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[var(--term-green-text-dim)]">BIAS: </span>
                    <span
                      className="font-bold"
                      style={{
                        color:
                          hoveredNode.node.bias >= 0 ? "#4BFF7B" : "#FFB700",
                      }}
                    >
                      {hoveredNode.node.bias >= 0 ? "+" : ""}
                      {hoveredNode.node.bias.toFixed(3)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal / Dialog for Editing Weight in Lab Mode */}
        {editingLinkId && (
          <div
            className="absolute z-40 bg-[#020e04] border-2 border-[#2EE85C] p-2.5 rounded shadow-2xl flex flex-col gap-1.5"
            style={{ left: "35%", top: "40%" }}
          >
            <div className="text-[11px] text-[#4BFF7B] font-bold">
              EDIT WEIGHT:
            </div>
            <input
              type="number"
              step="0.05"
              value={editWeightInput}
              onChange={(e) => setEditWeightInput(e.target.value)}
              className="bg-[#031106] border border-[#2EE85C] text-white px-2 py-0.5 text-xs rounded outline-none"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(editWeightInput);
                  if (!isNaN(val) && onEditWeight) {
                    onEditWeight(editingLinkId, val);
                  }
                  setEditingLinkId(null);
                }}
                className="px-2 py-0.5 rounded bg-[#2EE85C]/20 border border-[#2EE85C] text-[10px] text-[#4BFF7B] font-bold"
              >
                APPLY
              </button>
              <button
                type="button"
                onClick={() => setEditingLinkId(null)}
                className="px-2 py-0.5 rounded border border-[var(--term-outline-green)] text-[10px] text-[var(--term-green-text-dim)]"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NeuronCanvas({
  network,
  layerIdx,
  nodeIdx,
  renderTick,
}: {
  network: Network;
  layerIdx: number;
  nodeIdx: number;
  renderTick: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      const grid = neuronGrid(network, layerIdx, nodeIdx, 10);
      renderGridToCanvas(grid, canvasRef.current, 10, false);
    }
  }, [network, layerIdx, nodeIdx, renderTick]);

  return (
    <canvas
      ref={canvasRef}
      width={10}
      height={10}
      className="w-full h-full rounded-sm object-cover"
    />
  );
}

function NeuronCanvasEnlarged({
  network,
  layerIdx,
  nodeIdx,
  renderTick,
}: {
  network: Network;
  layerIdx: number;
  nodeIdx: number;
  renderTick: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const grid = neuronGrid(network, layerIdx, nodeIdx, 10);
      renderGridToCanvas(grid, canvasRef.current, 10, false);
    }
  }, [network, layerIdx, nodeIdx, renderTick]);

  return (
    <canvas
      ref={canvasRef}
      width={10}
      height={10}
      className="w-full h-full block image-rendering-pixelated"
    />
  );
}
