"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Users, Sparkles, BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import { landingConfig } from "./landing.config";
import { LandingButton } from "./LandingButton";
import { LandingModal, ModalRow } from "./LandingModal";
import { resetAllGameProgress } from "@/utils/resetProgress";

export interface LandingViewProps {
  onPlayClick?: () => void;
  className?: string;
  isDev?: boolean;
}

export function LandingView({ onPlayClick, className = "" }: LandingViewProps) {
  const router = useRouter();

  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [activePopup, setActivePopup] = useState<"about" | "visualisations" | "references" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check touch / coarse pointer
    if (typeof window !== "undefined") {
      const isCoarse = window.matchMedia("(pointer: coarse)").matches;
      setIsCoarsePointer(isCoarse);
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (onPlayClick) {
      onPlayClick();
      return;
    }
    // Always start fresh game
    resetAllGameProgress();
    router.push("/game");
  }, [onPlayClick, router]);

  const openPopup = (id: "about" | "visualisations" | "references") => {
    setActivePopup(id);
  };

  const closePopup = () => {
    setActivePopup(null);
  };

  return (
    <div className={`relative min-h-screen w-full flex flex-col justify-start select-none ${className}`}>
      {/* ── Dark Gradient Scrim Behind Column (No Blur Filter, No Backdrop Filter) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 z-10 w-full sm:w-[70vw] md:w-[60vw] max-w-[760px]"
        style={{
          background:
            "linear-gradient(to right, rgba(4,6,11,0.92) 0%, rgba(4,6,11,0.85) min(520px, 75%), rgba(4,6,11,0) 100%)",
        }}
      />

      {/* ── Main Content Column (Left Aligned, max-width 520px at 1920x1080) ── */}
      <div className="relative z-20 min-h-screen flex flex-col justify-center py-12 md:py-16 pl-[6vw] pr-6 max-w-[560px] w-full pointer-events-auto">
        <div className="w-full max-w-[480px] lg:max-w-[520px]">
          {/* ── Title: Very large condensed display font, soft glow ── */}
          <div className="landing-title-enter">
            <h1
              className="
                font-['Chakra_Petch',sans-serif] font-black uppercase tracking-tight leading-none text-white
                text-[clamp(56px,7vw,110px)]
              "
              style={{
                textShadow:
                  "0 0 25px rgba(25, 240, 255, 0.55), 0 0 70px rgba(25, 240, 255, 0.25)",
              }}
            >
              {landingConfig.title}
            </h1>
          </div>

          {/* ── Column of 4 Matching Buttons (16px spacing) ── */}
          <div className="mt-8 space-y-4 w-full">
            {/* 1. PLAY GAME (Primary, Height: 72px) */}
            {mounted && isCoarsePointer ? (
              /* Coarse-pointer notice for touch/mobile devices */
              <div
                role="note"
                className="w-full min-h-[72px] p-4 bg-[#04060B]/90 border border-[#19F0FF]/30 text-[#C9D6E2] font-mono text-[13px] md:text-[14px] leading-snug flex items-center gap-3"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[#FF9A1F] shrink-0 animate-pulse" />
                <span>
                  This game needs a keyboard and mouse. Please open it on a computer.
                </span>
              </div>
            ) : (
              <LandingButton
                id="btn-landing-play"
                primary
                height={72}
                showSweep
                onClick={handlePlay}
                icon={<Play className="w-6 h-6 fill-[#19F0FF] text-[#19F0FF]" />}
                label={landingConfig.buttons.play.label}
                staggerDelay={0.05}
              />
            )}

            {/* 2. ABOUT US & CREW (Height: 56px) */}
            <LandingButton
              id="btn-landing-about"
              height={56}
              onClick={() => openPopup("about")}
              icon={<Users className="w-5 h-5 text-[#19F0FF]" />}
              label={landingConfig.buttons.about.label}
              indicator={<ChevronRight className="w-4 h-4" />}
              staggerDelay={0.11}
            />

            {/* 3. MORE VISUALISATIONS (Height: 56px) */}
            <LandingButton
              id="btn-landing-visualisations"
              height={56}
              onClick={() => openPopup("visualisations")}
              icon={<Sparkles className="w-5 h-5 text-[#19F0FF]" />}
              label={landingConfig.buttons.visualisations.label}
              indicator={<ChevronRight className="w-4 h-4" />}
              staggerDelay={0.17}
            />

            {/* 4. REFERENCES & FOUNDATIONS (Height: 56px) */}
            <LandingButton
              id="btn-landing-references"
              height={56}
              onClick={() => openPopup("references")}
              icon={<BookOpen className="w-5 h-5 text-[#19F0FF]" />}
              label={landingConfig.buttons.references.label}
              indicator={<ChevronRight className="w-4 h-4" />}
              staggerDelay={0.23}
            />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* POPUP 1: ABOUT US & CREW                                         */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <LandingModal
        isOpen={activePopup === "about"}
        onClose={closePopup}
        title={landingConfig.popups.about.title}
        triggerId="btn-landing-about"
      >
        <p className="text-[14px] md:text-[15px] text-[#C9D6E2] font-sans leading-relaxed mb-4">
          {landingConfig.popups.about.description}
        </p>

        {/* Crew Rows */}
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#19F0FF] uppercase tracking-wider font-bold mb-2">
            CREW MEMBERS
          </div>
          {landingConfig.popups.about.crew.map((member) => (
            <ModalRow
              key={member.name}
              title={member.name}
              description={member.role || "LinkedIn Profile"}
              url={member.url}
              badge={
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#0B1F2A] border border-[#19F0FF]/30 text-[#19F0FF]">
                  LINKEDIN
                </span>
              }
            />
          ))}

          {/* Source Code Row */}
          <div className="pt-3">
            <div className="text-[11px] font-mono text-[#19F0FF] uppercase tracking-wider font-bold mb-2">
              SOURCE ARCHIVE
            </div>
            <ModalRow
              title={landingConfig.popups.about.source.platform}
              description={landingConfig.popups.about.source.repo}
              url={landingConfig.popups.about.source.url}
              badge={
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#0B1F2A] border border-[#19F0FF]/30 text-[#19F0FF]">
                  REPOSITORY
                </span>
              }
            />
          </div>
        </div>
      </LandingModal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* POPUP 2: MORE VISUALISATIONS (VIZMA)                             */}
      {/* NOTE: Vizma is USER'S OWN website, NOT a reference!               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <LandingModal
        isOpen={activePopup === "visualisations"}
        onClose={closePopup}
        title={landingConfig.popups.visualisations.title}
        triggerId="btn-landing-visualisations"
      >
        <div className="p-4 bg-[#0B1F2A]/40 border border-[#19F0FF]/30 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-white uppercase tracking-wider">
                {landingConfig.popups.visualisations.vizma.title}
              </span>
              {/* Amber LIVE status dot */}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-[#FF9A1F]/15 border border-[#FF9A1F]/50 text-[#FF9A1F] text-[11px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A1F] animate-ping" />
                LIVE
              </span>
            </div>
          </div>

          <p className="text-[13px] md:text-[14px] text-[#C9D6E2] font-sans leading-relaxed">
            {landingConfig.popups.visualisations.vizma.description}
          </p>

          <div className="pt-2">
            <a
              href={landingConfig.popups.visualisations.vizma.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${landingConfig.popups.visualisations.vizma.buttonText} (opens in a new tab)`}
              className="inline-flex items-center justify-between w-full sm:w-auto gap-4 px-6 py-2.5 bg-[#04060B] hover:bg-[#19F0FF]/15 border border-[#19F0FF] text-[#19F0FF] hover:text-white font-mono text-xs md:text-sm font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#19F0FF]"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
              }}
            >
              <span>{landingConfig.popups.visualisations.vizma.buttonText}</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          </div>
        </div>
      </LandingModal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* POPUP 3: REFERENCES & FOUNDATIONS                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <LandingModal
        isOpen={activePopup === "references"}
        onClose={closePopup}
        title={landingConfig.popups.references.title}
        triggerId="btn-landing-references"
      >
        <div className="space-y-1">
          {landingConfig.popups.references.items.map((ref) => (
            <ModalRow
              key={ref.title}
              title={ref.title}
              description={ref.description}
              url={ref.url}
            />
          ))}
        </div>
      </LandingModal>
    </div>
  );
}
