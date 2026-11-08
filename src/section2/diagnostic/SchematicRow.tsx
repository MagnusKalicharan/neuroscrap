"use client";

import React, { useMemo } from "react";
import { RELAY_NODES } from "../nodeData";
import type { RelayConfig } from "../evaluateConfig";
import { NodeBlock } from "./NodeBlock";

interface SchematicRowProps {
  config: RelayConfig;
  scannedNodeIds: string[];
  testActive?: boolean;
  testProgress?: number; // 0 to 1
  failingNodeId?: string | null;
  reduceMotion?: boolean;
}

export function SchematicRow({
  config,
  scannedNodeIds,
  testActive = false,
  testProgress = 0,
  failingNodeId = null,
  reduceMotion = false,
}: SchematicRowProps) {
  const r3Mode = config["R3"]?.mode || "connect";
  const r4Mode = config["R4"]?.mode || "connect";

  // Coordinates for the 8 equidistant centers in a 1000x100 SVG space:
  // Col 0: 62.5, Col 1: 187.5, Col 2: 312.5, Col 3: 437.5, Col 4: 562.5, Col 5: 687.5, Col 6: 812.5, Col 7: 937.5
  const coords = useMemo(
    () => [
      { id: "source", x: 62.5, y: 50 },
      { id: "R1", x: 187.5, y: 50 },
      { id: "R2", x: 312.5, y: 50 },
      { id: "R3", x: 437.5, y: 50 },
      { id: "R4", x: 562.5, y: 50 },
      { id: "R5", x: 687.5, y: 50 },
      { id: "R6", x: 812.5, y: 50 },
      { id: "antenna", x: 937.5, y: 50 },
    ],
    []
  );

  // Compute test packet dot position
  const dotPos = useMemo(() => {
    if (!testActive) return null;

    if (reduceMotion) {
      if (failingNodeId === "R3") return { x: coords[3].x, y: coords[3].y };
      if (failingNodeId === "R4") return { x: coords[4].x, y: coords[4].y };
      return { x: coords[7].x, y: coords[7].y };
    }

    let maxIdx = 7;
    if (failingNodeId === "R3") maxIdx = 3;
    if (failingNodeId === "R4") maxIdx = 4;

    const p = Number.isFinite(testProgress) ? Math.max(0, Math.min(1, testProgress)) : 0;
    const targetFraction = maxIdx / 7;
    const effectiveP = Math.min(p, targetFraction);
    const globalIdx = effectiveP * 7;
    const rawIdx = Math.floor(globalIdx);
    const baseIdx = Math.max(0, Math.min(6, Number.isFinite(rawIdx) ? rawIdx : 0));
    const t = Math.max(0, Math.min(1, globalIdx - baseIdx));

    const pA = coords[baseIdx] || coords[0];
    const pB = coords[baseIdx + 1] || coords[baseIdx] || pA;

    let curX = pA.x + (pB.x - pA.x) * t;
    let curY = 50;

    // If R3 is ignored, packet loops through bypass arch over R3
    if (r3Mode === "ignore" && curX >= coords[3].x - 42 && curX <= coords[3].x + 42) {
      const archRatio = (curX - (coords[3].x - 42)) / 84;
      curY = 50 - Math.sin(archRatio * Math.PI) * 40;
    }

    return { x: curX, y: curY };
  }, [testActive, testProgress, failingNodeId, reduceMotion, coords, r3Mode]);

  return (
    <div className="diag-schematic-row" aria-label="Transmission Line Circuit Schematic">
      {/* ── Background SVG Circuit Conductor Traces ─────────── */}
      <svg className="diag-schematic-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
        <defs>
          <filter id="wireGlowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="wireGlowAmber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Unbroken Main Line from Left Wall through SRC, R1 and R2 up to R3 */}
        {r3Mode === "ignore" ? (
          <>
            {/* Wire from panel left edge through SRC, R1 and R2 to left edge of R3 */}
            <line
              x1={0}
              y1={50}
              x2={coords[3].x - 42}
              y2={50}
              stroke="#22d952"
              strokeWidth="4"
              filter="url(#wireGlowGreen)"
            />
            {/* Bypass Arch looping cleanly over R3 directly from input to output */}
            <path
              d={`M ${coords[3].x - 42} 50 C ${coords[3].x - 20} 10, ${coords[3].x + 20} 10, ${coords[3].x + 42} 50`}
              fill="none"
              stroke="#22d952"
              strokeWidth="3.5"
              strokeDasharray="6 3"
              filter="url(#wireGlowGreen)"
            />
            {/* Wire from right edge of R3 goes DIRECTLY to R4 */}
            <line
              x1={coords[3].x + 40}
              y1={50}
              x2={coords[4].x - 42}
              y2={50}
              stroke="#22d952"
              strokeWidth="4"
              filter="url(#wireGlowGreen)"
            />
          </>
        ) : (
          /* When R3 is connected: continuous line from left wall through R1, R2, R3 directly to R4 */
          <line
            x1={0}
            y1={50}
            x2={coords[4].x - 42}
            y2={50}
            stroke="#22d952"
            strokeWidth="4"
            filter="url(#wireGlowGreen)"
          />
        )}

        {/* 2. R4 Conductor: Severed Gap vs Patched Bridge */}
        {r4Mode === "patch" ? (
          /* Patched: unbroken bridge through R4 with gold calibration accent */
          <g>
            <line
              x1={coords[4].x - 44}
              y1={50}
              x2={coords[4].x + 44}
              y2={50}
              stroke="#22d952"
              strokeWidth="4"
              filter="url(#wireGlowGreen)"
            />
            <line
              x1={coords[4].x - 36}
              y1={50}
              x2={coords[4].x + 36}
              y2={50}
              stroke="#ffbe4a"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              filter="url(#wireGlowAmber)"
            />
          </g>
        ) : (
          <g>
            {/* Left frayed stub */}
            <line
              x1={coords[4].x - 42}
              y1={50}
              x2={coords[4].x - 18}
              y2={50}
              stroke="#22d952"
              strokeWidth="3.5"
            />
            <line
              x1={coords[4].x - 18}
              y1={50}
              x2={coords[4].x - 12}
              y2={46}
              stroke="#e07a38"
              strokeWidth="2"
            />
            <line
              x1={coords[4].x - 18}
              y1={50}
              x2={coords[4].x - 13}
              y2={54}
              stroke="#e07a38"
              strokeWidth="2"
            />

            {/* Right frayed stub */}
            <line
              x1={coords[4].x + 18}
              y1={50}
              x2={coords[4].x + 42}
              y2={50}
              stroke="#22d952"
              strokeWidth="3.5"
            />
            <line
              x1={coords[4].x + 12}
              y1={47}
              x2={coords[4].x + 18}
              y2={50}
              stroke="#e07a38"
              strokeWidth="2"
            />
            <line
              x1={coords[4].x + 13}
              y1={53}
              x2={coords[4].x + 18}
              y2={50}
              stroke="#e07a38"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 3. Unbroken Line from R4 through R5 and R6 to ANTENNA and right wall */}
        <line
          x1={coords[4].x + 42}
          y1={50}
          x2={1000}
          y2={50}
          stroke="#22d952"
          strokeWidth="4"
          filter="url(#wireGlowGreen)"
        />
      </svg>

      {/* ── 8 Equidistant HTML Node Blocks across CSS Grid ── */}
      <div className="diag-schematic-grid">
        <NodeBlock type="source" />

        {RELAY_NODES.map((node) => {
          const isScanned = scannedNodeIds.includes(node.id);
          const nodeCfg = config[node.id] || { mode: "connect" };
          return (
            <NodeBlock
              key={node.id}
              node={node}
              config={nodeCfg}
              isScanned={isScanned}
              reduceMotion={reduceMotion}
            />
          );
        })}

        <NodeBlock type="antenna" />
      </div>

      {/* ── Overlay SVG for Moving Test Packet (travels visibly over all blocks) ── */}
      {dotPos && (
        <svg
          className="diag-schematic-overlay-svg"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <circle
            cx={dotPos.x}
            cy={dotPos.y}
            r="7"
            fill="#ffffff"
            stroke="#5dfa87"
            strokeWidth="3"
            filter="drop-shadow(0 0 6px #5dfa87)"
          />
        </svg>
      )}
    </div>
  );
}

export default SchematicRow;
