"use client";

import React, { useRef, useState, useEffect } from "react";

interface LandingButtonProps {
  id?: string;
  onClick?: () => void;
  primary?: boolean;
  height?: number; // 72 for primary, 56 for secondary
  icon?: React.ReactNode;
  label: string;
  indicator?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  showSweep?: boolean;
  staggerDelay?: number; // seconds
}

export function LandingButton({
  id,
  onClick,
  primary = false,
  height = 56,
  icon,
  label,
  indicator,
  className = "",
  disabled = false,
  showSweep = false,
  staggerDelay = 0,
}: LandingButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState({ w: 420, h: height });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = buttonRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cs = primary ? 14 : 10;
  const pad = primary ? 1.5 : 1;
  const w = size.w;
  const h = size.h;

  // Inset path slightly so stroke is never clipped by the container clipPath
  const pathD = `M ${pad} ${pad} L ${w - cs} ${pad} L ${w - pad} ${cs} L ${w - pad} ${h - pad} L ${cs} ${h - pad} L ${pad} ${h - cs} Z`;
  const clipPathCss = `polygon(0 0, calc(100% - ${cs}px) 0, 100% ${cs}px, 100% 100%, ${cs}px 100%, 0 calc(100% - ${cs}px))`;

  return (
    <button
      ref={buttonRef}
      id={id}
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        clipPath: clipPathCss,
        height: `${height}px`,
        animationDelay: `${staggerDelay}s`,
      }}
      className={`
        relative group w-full flex items-center justify-between select-none
        transition-all duration-200 cursor-pointer
        bg-[#04060B]/90 hover:bg-[#0B1F2A]/90 focus:bg-[#0B1F2A]/90
        focus:outline-none focus-visible:ring-1 focus-visible:ring-[#19F0FF]
        landing-btn-enter
        ${primary ? "landing-btn-primary" : "landing-btn-secondary"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.985]"}
        ${className}
      `}
    >
      {/* ── Left 2px Hover Accent Bar ── */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent group-hover:bg-[#19F0FF] group-focus:bg-[#19F0FF] transition-colors duration-200 z-30"
      />

      {/* ── SVG Hairline Border & Sweep Overlay ── */}
      {mounted && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${w} ${h}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base Cyan Hairline Border */}
          <path
            d={pathD}
            stroke="#19F0FF"
            strokeWidth={primary ? 1.5 : 1}
            strokeOpacity={primary ? 0.8 : 0.6}
            className="group-hover:stroke-opacity-100 group-focus:stroke-opacity-100 transition-opacity duration-200"
            style={{
              filter: primary
                ? "drop-shadow(0 0 4px rgba(25, 240, 255, 0.4))"
                : "drop-shadow(0 0 2px rgba(25, 240, 255, 0.25))",
            }}
          />

          {/* 0.5 Hz (2s) Light Sweep on PLAY ONLY */}
          {showSweep && !disabled && (
            <path
              d={pathD}
              stroke="#19F0FF"
              strokeWidth={primary ? 2 : 1.5}
              strokeDasharray="25 75"
              pathLength="100"
              className="landing-sweep-beam"
              style={{
                filter: "drop-shadow(0 0 6px #19F0FF) drop-shadow(0 0 12px rgba(25, 240, 255, 0.6))",
              }}
            />
          )}
        </svg>
      )}

      {/* ── Button Inner Content ── */}
      <div className="relative z-20 w-full h-full px-5 flex items-center justify-between pointer-events-none">
        {/* Left: Icon + Label */}
        <div className="flex items-center gap-3.5 min-w-0">
          {icon && (
            <span
              className="text-[#19F0FF] group-hover:text-white transition-all duration-200 transform group-hover:translate-x-[2px] group-focus:translate-x-[2px] shrink-0"
              style={{
                filter: primary
                  ? "drop-shadow(0 0 8px rgba(25, 240, 255, 0.7))"
                  : "drop-shadow(0 0 4px rgba(25, 240, 255, 0.4))",
              }}
            >
              {icon}
            </span>
          )}
          <span
            className={`
              font-mono font-bold uppercase tracking-[0.2em] truncate transition-colors duration-200
              ${primary ? "text-base md:text-lg text-white group-hover:text-[#FFF4E0]" : "text-sm md:text-[15px] text-[#C9D6E2] group-hover:text-white"}
            `}
            style={{
              textShadow: primary
                ? "0 0 12px rgba(25, 240, 255, 0.65)"
                : "0 0 8px rgba(25, 240, 255, 0.3)",
            }}
          >
            {label}
          </span>
        </div>

        {/* Right: Indicator (+) or Chevron */}
        {indicator && (
          <div className="shrink-0 text-[#19F0FF]/60 group-hover:text-[#19F0FF] transition-colors duration-200 ml-2">
            {indicator}
          </div>
        )}
      </div>
    </button>
  );
}
