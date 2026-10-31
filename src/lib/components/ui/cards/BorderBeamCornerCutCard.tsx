"use client";

import React, { useEffect, useRef, useState } from "react";

export type BeamVariant = "single" | "dual" | "gradient-sweep" | "rainbow";
export type GlowIntensity = "low" | "medium" | "high";
export type CornerType = "diagonal" | "all" | "top-right" | "bottom-left";

export interface BorderBeamCornerCutCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "onClick"> {
  variant?: BeamVariant;
  beamColor?: string;
  beamColorB?: string;
  glowIntensity?: GlowIntensity;
  corner?: CornerType;
  cornerSize?: number;
  borderWidth?: string;
  duration?: number;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  as?: "div" | "button" | "a";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

const COLOR_MAP: Record<string, string> = {
  cyan: "#00ffff",
  pink: "#ff007f",
  red: "#ff003c",
  green: "#00ff88",
  purple: "#a855f7",
  amber: "#f59e0b",
  blue: "#00bfff",
  white: "#ffffff",
};

function resolveColor(c?: string, fallback = "#00ffff"): string {
  if (!c) return fallback;
  return COLOR_MAP[c.toLowerCase()] || c;
}

export default function BorderBeamCornerCutCard({
  variant = "single",
  beamColor = "cyan",
  beamColorB = "pink",
  glowIntensity = "medium",
  corner = "diagonal",
  cornerSize = 14,
  borderWidth = "2px",
  duration = 3.5,
  title,
  description,
  icon,
  children,
  className = "",
  as = "div",
  onClick,
  disabled = false,
  ...props
}: BorderBeamCornerCutCardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 260, h: 56 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          w: Math.round(rect.width),
          h: Math.round(rect.height),
        });
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const colorA = resolveColor(beamColor, "#00ffff");
  const colorB = resolveColor(beamColorB, "#ff007f");

  const cs = Math.min(cornerSize, Math.floor(Math.min(size.w, size.h) / 2));
  const w = size.w;
  const h = size.h;

  // Generate SVG path & CSS clip-path for corner cuts
  let pathD = "";
  let clipPathCss = "";

  if (corner === "all") {
    pathD = `M ${cs} 0 L ${w - cs} 0 L ${w} ${cs} L ${w} ${h - cs} L ${w - cs} ${h} L ${cs} ${h} L 0 ${h - cs} L 0 ${cs} Z`;
    clipPathCss = `polygon(${cs}px 0, calc(100% - ${cs}px) 0, 100% ${cs}px, 100% calc(100% - ${cs}px), calc(100% - ${cs}px) 100%, ${cs}px 100%, 0 calc(100% - ${cs}px), 0 ${cs}px)`;
  } else if (corner === "top-right") {
    pathD = `M 0 0 L ${w - cs} 0 L ${w} ${cs} L ${w} ${h} L 0 ${h} Z`;
    clipPathCss = `polygon(0 0, calc(100% - ${cs}px) 0, 100% ${cs}px, 100% 100%, 0 100%)`;
  } else if (corner === "bottom-left") {
    pathD = `M 0 0 L ${w} 0 L ${w} ${h} L ${cs} ${h} L 0 ${h - cs} Z`;
    clipPathCss = `polygon(0 0, 100% 0, 100% 100%, ${cs}px 100%, 0 calc(100% - ${cs}px))`;
  } else {
    // Default "diagonal": top-right & bottom-left cut
    pathD = `M 0 0 L ${w - cs} 0 L ${w} ${cs} L ${w} ${h} L ${cs} ${h} L 0 ${h - cs} Z`;
    clipPathCss = `polygon(0 0, calc(100% - ${cs}px) 0, 100% ${cs}px, 100% 100%, ${cs}px 100%, 0 calc(100% - ${cs}px))`;
  }

  // Parse numeric border width for SVG strokeWidth
  const strokeW = parseFloat(borderWidth) || 2;

  // Glow filter presets
  const glowStyles: Record<GlowIntensity, React.CSSProperties> = {
    low: {
      filter: `drop-shadow(0 0 4px ${colorA})`,
    },
    medium: {
      filter: `drop-shadow(0 0 6px ${colorA}) drop-shadow(0 0 12px ${colorA}80)`,
    },
    high: {
      filter: `drop-shadow(0 0 8px ${colorA}) drop-shadow(0 0 16px ${colorA}) drop-shadow(0 0 24px ${colorA}99)`,
    },
  };

  const glowStylesB: Record<GlowIntensity, React.CSSProperties> = {
    low: {
      filter: `drop-shadow(0 0 4px ${colorB})`,
    },
    medium: {
      filter: `drop-shadow(0 0 6px ${colorB}) drop-shadow(0 0 12px ${colorB}80)`,
    },
    high: {
      filter: `drop-shadow(0 0 8px ${colorB}) drop-shadow(0 0 16px ${colorB}) drop-shadow(0 0 24px ${colorB}99)`,
    },
  };

  const isInteractive = Boolean(onClick) || as === "button";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp: any = as;

  return (
    <Comp
      ref={containerRef}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{ clipPath: clipPathCss }}
      suppressHydrationWarning
      className={`
        relative group overflow-hidden select-none
        bg-black/60 backdrop-blur-md
        transition-all duration-300
        ${isInteractive ? "cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400" : ""}
        ${className}
      `}
      {...props}
    >
      {/* ── Background Subtle Cyber Scan Grid ── */}
      <div
        aria-hidden="true"
        suppressHydrationWarning
        className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,rgba(0,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,255,255,0.06)_1px,transparent_1px)] bg-[size:16px_16px]"
      />

      {/* ── Ambient Radial Glow on Hover ── */}
      <div
        aria-hidden="true"
        suppressHydrationWarning
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${colorA}22 0%, transparent 70%)`,
        }}
      />

      {/* ── SVG Border & Animated Beam Layer ── */}
      {mounted && (
        <svg
          suppressHydrationWarning
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id={`beam-grad-sweep-${size.w}-${size.h}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={colorA} />
              <stop offset="50%" stopColor={colorB} />
              <stop offset="100%" stopColor={colorA} />
            </linearGradient>

            <linearGradient
              id={`beam-fade-a-${size.w}-${size.h}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={colorA} stopOpacity="0" />
              <stop offset="70%" stopColor={colorA} stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>

            <linearGradient
              id={`beam-fade-b-${size.w}-${size.h}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={colorB} stopOpacity="0" />
              <stop offset="70%" stopColor={colorB} stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Base Muted Trace Border */}
          <path
            d={pathD}
            fill="none"
            stroke="rgba(0, 255, 255, 0.18)"
            strokeWidth={strokeW}
          />

          {/* ── BEAM VARIANTS ── */}
          {variant === "single" && (
            <path
              d={pathD}
              fill="none"
              stroke={colorA}
              strokeWidth={strokeW + 0.5}
              strokeDasharray="22 78"
              pathLength="100"
              style={{
                ...glowStyles[glowIntensity],
                animation: `nb-border-beam ${duration}s linear infinite`,
              }}
            />
          )}

          {variant === "dual" && (
            <>
              {/* Clockwise Beam */}
              <path
                d={pathD}
                fill="none"
                stroke={colorA}
                strokeWidth={strokeW + 0.5}
                strokeDasharray="18 82"
                pathLength="100"
                style={{
                  ...glowStyles[glowIntensity],
                  animation: `nb-border-beam ${duration}s linear infinite`,
                }}
              />
              {/* Counter-Clockwise Beam */}
              <path
                d={pathD}
                fill="none"
                stroke={colorB}
                strokeWidth={strokeW + 0.5}
                strokeDasharray="18 82"
                pathLength="100"
                style={{
                  ...glowStylesB[glowIntensity],
                  animation: `nb-border-beam-reverse ${duration * 0.9}s linear infinite`,
                }}
              />
            </>
          )}

          {variant === "gradient-sweep" && (
            <path
              d={pathD}
              fill="none"
              stroke={`url(#beam-grad-sweep-${size.w}-${size.h})`}
              strokeWidth={strokeW + 1}
              strokeDasharray="45 55"
              pathLength="100"
              style={{
                ...glowStyles[glowIntensity],
                animation: `nb-border-beam ${duration * 1.1}s linear infinite`,
              }}
            />
          )}

          {variant === "rainbow" && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#beam-rainbow)"
              strokeWidth={strokeW + 1}
              strokeDasharray="30 70"
              pathLength="100"
              style={{
                stroke: "#00ffff",
                animation: `nb-border-beam ${duration}s linear infinite, nb-rainbow-hue ${duration * 2}s linear infinite`,
                ...glowStyles[glowIntensity],
              }}
            />
          )}
        </svg>
      )}

      {/* ── Content Container ── */}
      <div className="relative z-20 w-full h-full p-4 flex flex-col justify-center">
        {/* If standard card content props provided: */}
        {(icon || title || description) && (
          <div className="flex items-start gap-4">
            {icon && (
              <div
                className="w-10 h-10 p-2 shrink-0 rounded-none bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:text-cyan-300 transition-colors"
                style={{
                  clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                }}
              >
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h3
                  className="font-mono text-sm font-bold tracking-wider uppercase text-white group-hover:text-cyan-200 transition-colors"
                  style={{ textShadow: "0 0 10px rgba(0,255,255,0.4)" }}
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 font-mono text-xs text-cyan-100/60 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Children slot (for custom button content or custom children) */}
        {children}
      </div>

      {/* ── Keyframe Animations Embedded ── */}
      <style jsx global>{`
        @keyframes nb-border-beam {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -100;
          }
        }
        @keyframes nb-border-beam-reverse {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 100;
          }
        }
        @keyframes nb-rainbow-hue {
          0% {
            filter: hue-rotate(0deg) drop-shadow(0 0 8px #00ffff);
          }
          50% {
            filter: hue-rotate(180deg) drop-shadow(0 0 12px #ff00ff);
          }
          100% {
            filter: hue-rotate(360deg) drop-shadow(0 0 8px #00ffff);
          }
        }
      `}</style>
    </Comp>
  );
}
