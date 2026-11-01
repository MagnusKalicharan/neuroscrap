"use client";

import React from "react";

export interface PowerCellProps {
  charge: number; // 0.0 to 1.0
  damage: number; // 0.0 to 1.0
  size?: number; // Base pixel width
  state?: "idle" | "dragging" | "scanning" | "plugged" | "empty";
  id?: number;
  reduceMotion?: boolean;
  className?: string;
  showId?: boolean;
}

export default function PowerCell({
  charge,
  damage,
  size = 110,
  state = "idle",
  id = 1,
  reduceMotion = false,
  className = "",
  showId = false,
}: PowerCellProps) {
  const seed = Math.abs(id || 1);
  const cellSerial = `PC-${String(seed).padStart(4, "0")}`;

  if (state === "empty") {
    return (
      <div
        style={{ width: size, height: size * 1.55 }}
        className={`rounded-lg border border-dashed border-[#1A2733] bg-[#04060B]/70 flex items-center justify-center ${className}`}
        suppressHydrationWarning
      >
        <span className="font-mono text-[10px] tracking-widest text-[#7F93A6]/40 uppercase">
          VACANT
        </span>
      </div>
    );
  }

  const clampedCharge = Math.max(0, Math.min(1, charge));
  const clampedDamage = Math.max(0, Math.min(1, damage));
  const width = size;
  const height = size * 1.55;

  // Damage thresholds
  const isChipped = clampedDamage >= 0.5;
  const isSeverelyDamaged = clampedDamage >= 0.75;

  // Calculate fill for each of the 5 segments (0 = bottom, 4 = top)
  // Each segment covers a 0.2 span.
  const segmentFills = [0, 1, 2, 3, 4].map((i) => {
    const min = i * 0.2;
    const max = (i + 1) * 0.2;
    if (clampedCharge >= max) return 1.0;
    if (clampedCharge <= min) return 0.0;
    return (clampedCharge - min) / 0.2;
  });

  // Unique filter & gradient IDs scoped by seed to prevent collisions
  const tubeGlowId = `tube-glow-${seed}`;
  const crackGlowId = `crack-glow-${seed}`;
  const shadowBlurId = `shadow-blur-${seed}`;
  const steelGradId = `steel-body-${seed}`;

  return (
    <div
      style={{ width, height }}
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
      suppressHydrationWarning
    >
      <svg
        viewBox="0 0 100 155"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
        suppressHydrationWarning
      >
        <defs>
          {/* Static halation glow for cyan neon segments */}
          <filter id={tubeGlowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Diffuse soft under-leak glow for cracks (never a sharp wire) */}
          <filter id={crackGlowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.8" result="leak" />
            <feMerge>
              <feMergeNode in="leak" />
            </feMerge>
          </filter>

          {/* Contact shadow blur */}
          <filter id={shadowBlurId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          {/* Cold industrial steel gradient with upper-right warm rim highlight */}
          <linearGradient id={steelGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#151F2A" />
            <stop offset="20%" stopColor="#1A2733" />
            <stop offset="70%" stopColor="#223342" />
            <stop offset="90%" stopColor="#3A4D5F" />
            <stop offset="100%" stopColor="#455B6E" />
          </linearGradient>

          {/* Active cyan segment core gradient: hot white center + electric cyan edge */}
          <linearGradient id={`active-seg-grad-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#19F0FF" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#19F0FF" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* ── 0. CONTACT SHADOW ON THE LEDGE ── */}
        <ellipse
          cx="50"
          cy="151"
          rx="36"
          ry="3.5"
          fill="#020306"
          opacity="0.85"
          filter={`url(#${shadowBlurId})`}
        />

        {/* ── 1. SCREW-ON TERMINAL CAP (Top Industrial Lug Head) ── */}
        <g id="terminal-cap">
          {/* Contact lugs */}
          <rect x="28" y="4" width="8" height="6" rx="1.2" fill="#2B3D4F" stroke="#04060B" strokeWidth="1" />
          <rect x="64" y="4" width="8" height="6" rx="1.2" fill="#3D5164" stroke="#04060B" strokeWidth="1" />

          {/* Main knurled cap base */}
          <path
            d="M 22 10 L 78 10 L 74 20 L 26 20 Z"
            fill="#1E2C3A"
            stroke="#34495A"
            strokeWidth="1.2"
          />
          {/* Knurling notches */}
          <line x1="36" y1="11" x2="35" y2="19" stroke="#0B131B" strokeWidth="1.2" />
          <line x1="44" y1="11" x2="43.5" y2="19" stroke="#0B131B" strokeWidth="1.2" />
          <line x1="56" y1="11" x2="56.5" y2="19" stroke="#0B131B" strokeWidth="1.2" />
          <line x1="64" y1="11" x2="65" y2="19" stroke="#0B131B" strokeWidth="1.2" />

          {/* Small electric arc between terminals (Stage 4, damage >= 0.75) */}
          {isSeverelyDamaged && (
            <path
              d="M 34 6 Q 50 1 66 6"
              fill="none"
              stroke="#FF9A1F"
              strokeWidth="1.2"
              opacity={reduceMotion ? 0.7 : 0.9}
              style={{
                animation: reduceMotion ? "none" : "arc-flicker 3s infinite ease-in-out",
              }}
            />
          )}
        </g>

        {/* ── 2. CASING SILHOUETTE (Visibly chipped & asymmetric when damaged) ── */}
        <g id="main-casing">
          {isSeverelyDamaged ? (
            // Severely damaged silhouette: chipped top-left, torn rim, gap on left wall
            <path
              d="M 26 26 L 22 20 L 82 20 Q 86 20 86 24 L 86 142 Q 86 148 80 148 L 20 148 Q 14 148 14 142 L 14 82 L 18 78 L 14 74 L 14 62 L 19 56 L 14 50 L 14 36 Z"
              fill={`url(#${steelGradId})`}
              stroke="#34495A"
              strokeWidth="1.5"
            />
          ) : isChipped ? (
            // Chipped silhouette: chipped top corner & dented side
            <path
              d="M 22 24 L 26 20 L 82 20 Q 86 20 86 24 L 86 142 Q 86 148 80 148 L 20 148 Q 14 148 14 142 L 14 78 L 17 73 L 14 68 L 14 28 Z"
              fill={`url(#${steelGradId})`}
              stroke="#34495A"
              strokeWidth="1.5"
            />
          ) : (
            // Intact symmetrical shell
            <rect
              x="14"
              y="20"
              width="72"
              height="128"
              rx="7"
              fill={`url(#${steelGradId})`}
              stroke="#34495A"
              strokeWidth="1.5"
            />
          )}

          {/* Upper-right warm rim highlight line (Blade Runner lighting) */}
          <path
            d="M 68 20 L 82 20 Q 86 20 86 24 L 86 70"
            fill="none"
            stroke="#FFB23A"
            strokeWidth="0.9"
            strokeOpacity="0.45"
          />

          {/* Industrial Screws */}
          {[
            { cx: 20, cy: 26, r: ((seed * 37) % 90) },
            { cx: 80, cy: 26, r: ((seed * 43) % 90) },
            { cx: 20, cy: 142, r: ((seed * 53) % 90) },
            { cx: 80, cy: 142, r: ((seed * 71) % 90) },
          ].map((screw, idx) => (
            <g key={idx} transform={`rotate(${screw.r} ${screw.cx} ${screw.cy})`}>
              <circle cx={screw.cx} cy={screw.cy} r="2.2" fill="#0C131A" stroke="#34495A" strokeWidth="0.8" />
              <line x1={screw.cx - 1.4} y1={screw.cy} x2={screw.cx + 1.4} y2={screw.cy} stroke="#34495A" strokeWidth="0.8" />
            </g>
          ))}
        </g>

        {/* ── 3. RECESSED GLASS WINDOW (The Energy Chamber) ── */}
        <g id="energy-chamber">
          {/* Window cavity background (pure dark grey void, never brown/amber inside) */}
          <rect
            x="24"
            y="32"
            width="52"
            height="86"
            rx="3"
            fill="#06090D"
            stroke="#04060B"
            strokeWidth="1.8"
          />

          {/* 5 Stacked Physical Energy Segments (Bottom to Top) */}
          {[0, 1, 2, 3, 4].map((index) => {
            const fill = segmentFills[index]; // 0.0 to 1.0
            const segY = 98 - index * 15; // 98, 83, 68, 53, 38
            const isEnergized = fill > 0;

            return (
              <g key={index}>
                {/* Dark grey glass segment trench (empty state, absolutely no amber or brown) */}
                <rect
                  x="28"
                  y={segY}
                  width="44"
                  height="11"
                  rx="2"
                  fill="#0B1015"
                  stroke="#16202A"
                  strokeWidth="0.8"
                />

                {/* Lit plasma state: hot white core, saturated cyan halo edge */}
                {isEnergized && (
                  <g
                    style={{
                      animation:
                        !reduceMotion
                          ? `neon-tube-breathe ${2.4 + (index % 2) * 0.4}s infinite ease-in-out`
                          : "none",
                    }}
                  >
                    {/* Cyan outer halo bloom */}
                    <rect
                      x="29"
                      y={segY + 1}
                      width={42 * fill}
                      height="9"
                      rx="2"
                      fill="#19F0FF"
                      opacity="0.9"
                      filter={`url(#${tubeGlowId})`}
                    />

                    {/* Saturated cyan body */}
                    <rect
                      x="30"
                      y={segY + 1.5}
                      width={40 * fill}
                      height="8"
                      rx="1.5"
                      fill="#19F0FF"
                    />

                    {/* Hot white incandescent plasma core */}
                    <rect
                      x="33"
                      y={segY + 3}
                      width={Math.max(0, 34 * fill - 2)}
                      height="5"
                      rx="1"
                      fill="#FFFFFF"
                    />

                    {/* Top glass reflection highlight */}
                    <line
                      x1="34"
                      y1={segY + 2.5}
                      x2={34 + Math.max(0, 32 * fill)}
                      y2={segY + 2.5}
                      stroke="#FFFFFF"
                      strokeWidth="0.7"
                      strokeOpacity="0.8"
                    />
                  </g>
                )}

                {/* Segment physical index indicator notch (for greyscale countability) */}
                <circle
                  cx="26"
                  cy={segY + 5.5}
                  r="0.8"
                  fill={isEnergized ? "#19F0FF" : "#22313F"}
                />
              </g>
            );
          })}

          {/* Broken glass shards at window edge if severely damaged */}
          {isSeverelyDamaged && (
            <g id="glass-shards">
              {/* Jagged glass fissure cutout */}
              <polygon
                points="24,68 30,73 24,78"
                fill="#04060B"
                stroke="#1A2733"
                strokeWidth="0.8"
              />
              <polygon
                points="76,46 70,51 76,55"
                fill="#04060B"
                stroke="#1A2733"
                strokeWidth="0.8"
              />
            </g>
          )}
        </g>

        {/* ── 4. CRACKS AS DEEP FRACTURES (Not bright surface wires!) ── */}
        {isChipped && (
          <g id="fracture-cracks">
            {/* UNDERNEATH: Soft warm sodium light bleeding out from deep inside the breach */}
            <path
              d="M 24 55 Q 36 62 48 58 T 72 65 M 48 58 L 54 78 Q 62 84 70 88 M 38 58 L 34 68"
              fill="none"
              stroke="#FF9A1F"
              strokeWidth="2.8"
              strokeOpacity="0.32"
              filter={`url(#${crackGlowId})`}
            />

            {/* ON TOP: Sharp, dark near-black physical fracture hairline cuts */}
            {/* Main fracture trunk cut into glass */}
            <path
              d="M 24 55 L 34 60 L 40 57 L 48 58 L 58 64 L 72 65"
              fill="none"
              stroke="#04060B"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {/* Primary branching fissure */}
            <path
              d="M 48 58 L 51 68 L 54 78 L 62 82 L 70 88"
              fill="none"
              stroke="#04060B"
              strokeWidth="1.0"
              strokeLinecap="round"
            />
            {/* Secondary micro-branch */}
            <path
              d="M 38 58 L 36 65 L 33 69"
              fill="none"
              stroke="#04060B"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
            {/* Hairline stress micro-crack */}
            <path
              d="M 54 78 L 57 84"
              fill="none"
              stroke="#04060B"
              strokeWidth="0.5"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* ── 5. SMOKE WISPS (Stage 4, damage >= 0.75) ── */}
        {isSeverelyDamaged && (
          <g id="smoke-wisps" opacity="0.35">
            <path
              d="M 16 60 Q 10 46 16 34 Q 22 22 17 12"
              fill="none"
              stroke="#7F93A6"
              strokeWidth="0.9"
              strokeDasharray="2 3"
            />
          </g>
        )}

        {/* ── 6. RIVETED SERIAL NAMEPLATE (Industrial Stamped Metal) ── */}
        <g id="stamped-nameplate">
          {/* Metal plate */}
          <rect
            x="24"
            y="124"
            width="52"
            height="16"
            rx="2.5"
            fill="#0C131A"
            stroke="#2B3D4F"
            strokeWidth="1"
          />
          {/* Rivets */}
          <circle cx="27.5" cy="132" r="1.2" fill="#3D5164" />
          <circle cx="72.5" cy="132" r="1.2" fill="#3D5164" />

          {/* Stamped Serial Monospace Readout */}
          <text
            x="50"
            y="135"
            textAnchor="middle"
            fill="#7F93A6"
            fontSize="8.5"
            fontFamily="var(--font-noir-mono)"
            fontWeight="bold"
            letterSpacing="0.08em"
          >
            {cellSerial}
          </text>
        </g>
      </svg>
    </div>
  );
}
