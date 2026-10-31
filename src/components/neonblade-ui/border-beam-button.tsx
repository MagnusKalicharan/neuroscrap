"use client";

import React from "react";
import BorderBeamCornerCutCard, {
  BeamVariant,
  GlowIntensity,
  CornerType,
} from "@/lib/components/ui/cards/BorderBeamCornerCutCard";

export interface BorderBeamButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: BeamVariant;
  beamColor?: string;
  beamColorB?: string;
  glowIntensity?: GlowIntensity;
  corner?: CornerType;
  cornerSize?: number;
  borderWidth?: string;
  duration?: number;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BorderBeamButton({
  children,
  variant = "dual",
  beamColor = "cyan",
  beamColorB = "pink",
  glowIntensity = "high",
  corner = "diagonal",
  cornerSize = 14,
  borderWidth = "2px",
  duration = 3.5,
  icon,
  size = "lg",
  className = "",
  onClick,
  disabled,
  ...props
}: BorderBeamButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-2 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-sm md:text-base",
  }[size];

  return (
    <BorderBeamCornerCutCard
      as="button"
      variant={variant}
      beamColor={beamColor}
      beamColorB={beamColorB}
      glowIntensity={glowIntensity}
      corner={corner}
      cornerSize={cornerSize}
      borderWidth={borderWidth}
      duration={duration}
      onClick={onClick as React.MouseEventHandler<HTMLElement>}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        font-mono font-bold tracking-[0.2em] uppercase
        cursor-pointer
        hover:brightness-125
        ${className}
      `}
      {...props}
    >
      <div className={`flex items-center justify-center gap-3 ${sizeClasses}`}>
        {icon && <span className="w-4 h-4 shrink-0">{icon}</span>}
        <span
          className="text-white drop-shadow-[0_0_10px_rgba(0,255,255,0.6)]"
        >
          {children}
        </span>
      </div>
    </BorderBeamCornerCutCard>
  );
}

export default BorderBeamButton;
