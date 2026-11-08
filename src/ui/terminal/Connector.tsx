"use client";

import React, { useEffect, useState } from "react";

interface ConnectorProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  reducedMotion?: boolean;
}

export function Connector({
  startX,
  startY,
  endX,
  endY,
  reducedMotion = false,
}: ConnectorProps) {
  const [animating, setAnimating] = useState(false);

  // Compute elbow path coordinates
  // Start from right edge of active folder, go right horizontally, go vertical to target Y, then go right to file slot
  const midX = Math.round(startX + (endX - startX) * 0.45);
  const pathD = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;

  // Elbow dot coordinates
  const elbow1 = { x: midX, y: startY };
  const elbow2 = { x: midX, y: endY };

  useEffect(() => {
    if (!reducedMotion) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [startX, startY, endX, endY, reducedMotion]);

  if (startX <= 0 || endX <= 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full z-20 overflow-visible"
      aria-hidden="true"
    >
      {/* Glow shadow line */}
      <path
        d={pathD}
        fill="none"
        stroke="var(--term-connector-green)"
        strokeWidth="4"
        strokeOpacity="0.25"
        strokeLinecap="square"
      />

      {/* Main Crisp 2px Phosphor Line */}
      <path
        d={pathD}
        className="term-connector-path"
        fill="none"
        stroke="var(--term-connector-green)"
        strokeWidth="2"
        strokeLinecap="square"
        style={{
          strokeDasharray: reducedMotion ? "none" : 1000,
          strokeDashoffset: reducedMotion ? 0 : animating ? 1000 : 0,
          transition: reducedMotion ? "none" : "stroke-dashoffset 180ms ease-out",
        }}
      />

      {/* Small dot at the first elbow */}
      <circle
        cx={elbow1.x}
        cy={elbow1.y}
        r="2.5"
        fill="var(--term-connector-green)"
        className="drop-shadow-[0_0_4px_#26d649]"
      />

      {/* Small dot at the second elbow */}
      <circle
        cx={elbow2.x}
        cy={elbow2.y}
        r="2.5"
        fill="var(--term-connector-green)"
        className="drop-shadow-[0_0_4px_#26d649]"
      />
    </svg>
  );
}

export default Connector;
