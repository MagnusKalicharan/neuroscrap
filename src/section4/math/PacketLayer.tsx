"use client";

import React, { useState } from "react";
import type { Network } from "../nn/types";
import { getBezierPoint, type Point2D } from "./bezier";
import type { TravelingPacket } from "./packetSimulation";

export interface PacketLayerProps {
  packets: TravelingPacket[];
  nodePositions: Map<string, Point2D>;
  network: Network;
  /** Normalized progress within the current stage: 0.0 to 1.0 */
  animProgress: number;
  onInspectPacket?: (pkt: TravelingPacket) => void;
}

// Smooth quadratic ease-in-out for slow, steady physical travel
function easeProgress(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function PacketLayer({
  packets,
  nodePositions,
  network,
  animProgress,
  onInspectPacket,
}: PacketLayerProps) {
  const [hoveredPacketId, setHoveredPacketId] = useState<string | null>(null);

  if (!packets || packets.length === 0) return null;

  // Normalized progress: 0.0 to 1.0 (never clamped to a dead zone)
  const progressClamped = Math.max(0, Math.min(1, animProgress));
  const baseT = easeProgress(progressClamped);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="glow-green-sm" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-magenta-sm" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {packets.map((pkt) => {
        const link = network.allLinks.find((l) => l.id === pkt.linkId);
        if (!link) return null;

        const p1 = nodePositions.get(link.sourceNodeId);
        const p2 = nodePositions.get(link.targetNodeId);
        if (!p1 || !p2) return null;

        // Continuous physical transit along Bezier wire with clean boundary margins:
        // Forward: glides smoothly from source neuron boundary (0.12) towards target neuron (0.78)
        // Backward: glides smoothly from target neuron boundary (0.78) back towards source (0.12)
        const t =
          pkt.direction === "forward"
            ? 0.12 + 0.66 * baseT
            : 0.78 - 0.66 * baseT;

        const pt = getBezierPoint(p1, p2, t);

        // Vertical collision clearance for crossing diagonal wires:
        // When multiple synapses cross at the center, separate their badges vertically
        const dy = p2.y - p1.y;
        let yOffset = 0;
        if (dy > 30) {
          yOffset = -10;
        } else if (dy < -30) {
          yOffset = 10;
        }

        const x = pt.x;
        const y = pt.y + yOffset;

        const isMagenta = pkt.color === "magenta";
        const strokeColor = isMagenta ? "#E82EA5" : "#2EE85C";
        const textColor = isMagenta ? "#FF80DF" : "#4BFF7B";
        const filterId = isMagenta ? "url(#glow-magenta-sm)" : "url(#glow-green-sm)";
        const isHovered = hoveredPacketId === pkt.id;

        // In backward pass, show live weight update: w: 0.36➔0.35
        // In forward pass, show compact numerical value: +0.09
        const displayText =
          pkt.type === "backward_error" && pkt.updateText
            ? `${pkt.updateText}`
            : pkt.badgeText;

        const pillWidth = Math.max(38, displayText.length * 6.5 + 10);
        // Smoothly fade out as packet is absorbed into target neuron (forward) or source (backward)
        const packetOpacity =
          baseT > 0.60
            ? Math.max(0, 1 - (baseT - 0.60) / 0.28)
            : 0.96;

        return (
          <g
            key={pkt.id}
            className="pointer-events-auto cursor-pointer transition-opacity duration-150"
            style={{ opacity: packetOpacity }}
            transform={`translate(${x}, ${y})`}
            onMouseEnter={() => setHoveredPacketId(pkt.id)}
            onMouseLeave={() => setHoveredPacketId(null)}
            onClick={() => onInspectPacket?.(pkt)}
          >
            {/* Small glowing bead on the wire */}
            <circle r="3.5" fill={strokeColor} filter={filterId} />

            {/* Compact glowing pill badge centered on the wire (NO ENVELOPE) */}
            <rect
              x={-pillWidth / 2}
              y="-9"
              width={pillWidth}
              height="18"
              rx="9"
              fill="#010803"
              stroke={strokeColor}
              strokeWidth={isHovered ? "2.0" : "1.4"}
              opacity="0.96"
              filter={filterId}
            />

            {/* Clear, readable font (10px bold monospace) */}
            <text
              x="0"
              y="3.5"
              textAnchor="middle"
              fill={textColor}
              fontSize="10"
              fontFamily="Share Tech Mono, monospace"
              fontWeight="bold"
              letterSpacing="0.3"
            >
              {displayText}
            </text>

            {/* Detailed hover tooltip */}
            {isHovered && (
              <g transform="translate(0, 22)">
                <rect
                  x="-90"
                  y="-10"
                  width="180"
                  height="20"
                  rx="3"
                  fill="#020e05"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                  opacity="0.98"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="9.5"
                  fontFamily="Share Tech Mono, monospace"
                  fontWeight="bold"
                >
                  {pkt.detailFormula}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
