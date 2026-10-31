"use client";

import { motion, type Variants, type Easing } from "framer-motion";
import { GlitchText } from "@/components/neonblade-ui/glitch-text";
import { Play } from "lucide-react";
import { SylvaLivingWorld } from "@/components/threeui/sylva-living-world";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const BorderBeamCornerCutCard = dynamic(
  () => import("@/lib/components/ui/cards/BorderBeamCornerCutCard"),
  { ssr: false }
);

const BackgroundMusic = dynamic(
  () => import("@/components/audio/background-music").then((m) => m.BackgroundMusic),
  { ssr: false }
);

// ── Animation Variants ────────────────────────────────────────────────────────
const EASE: Easing = "easeOut";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.9, ease: EASE, delay },
  }),
};

// ═════════════════════════════════════════════════════════════════════════════
export default function NeuroScrapLanding() {
  const router = useRouter();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050806]">

      {/* ═══ Top-Right Global Audio Controller (Z-50) ═══════════════════════ */}
      <motion.div
        className="fixed top-6 right-6 z-50 pointer-events-auto"
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        custom={0.4}
      >
        <BackgroundMusic />
      </motion.div>

      {/* ═══ LAYER 0 — 3D Background (Full-Screen & Open) ═══════════════════ */}
      <div className="fixed inset-0 z-0">
        <SylvaLivingWorld />

        {/* Soft edge vignette (leaves bottom-left moss hills completely open and visible) */}
        <div
          aria-hidden="true"
          suppressHydrationWarning
          className="absolute inset-0 pointer-events-none bg-vignette"
        />
      </div>

      {/* ═══ LAYER 1 — Subtle Ambient Scanlines & Accents (non-interactive) ═══ */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div
          aria-hidden="true"
          suppressHydrationWarning
          className="absolute inset-0 mix-blend-overlay opacity-[0.05] bg-scanlines"
        />
        {/* Subtle corner brackets */}
        <div aria-hidden="true" className="absolute top-5 right-5 w-14 h-14 border-t-2 border-r-2 border-cyan-500/20" />
        <div aria-hidden="true" className="absolute bottom-5 right-5 w-14 h-14 border-b-2 border-r-2 border-cyan-500/20" />
        <div aria-hidden="true" className="absolute bottom-5 left-5 w-14 h-14 border-b-2 border-l-2 border-cyan-500/10" />
      </div>

      {/* ═══ LAYER 2 — Title & Play Game Button (Positioned at Top-Left) ═════ */}
      <div className="absolute inset-0 z-20 flex flex-col justify-start pt-10 md:pt-14 lg:pt-16 px-8 md:px-14 lg:px-20 pointer-events-none">
        <div className="max-w-2xl">

          {/* ── GAME TITLE (Top-Left) ── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0.2}
          >
            <GlitchText
              as="h1"
              text="NEURO SCRAP"
              intensity="high"
              speed="medium"
              className="
                font-black uppercase leading-none tracking-tight
                text-[clamp(2.8rem,7vw,5.6rem)]
                text-white
                [text-shadow:0_0_35px_rgba(0,255,255,0.65),0_0_90px_rgba(0,255,255,0.25)]
              "
            />
          </motion.div>

          {/* ── PLAY GAME BUTTON (Just below Title) ── */}
          <motion.div
            className="mt-6 flex items-center pointer-events-auto"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0.4}
          >
            <BorderBeamCornerCutCard
              as="button"
              variant="dual"
              beamColor="cyan"
              beamColorB="#00e5ff"
              glowIntensity="high"
              corner="diagonal"
              cornerSize={16}
              borderWidth="2px"
              duration={3.0}
              onClick={() => router.push('/game')}
              className="bg-black/60 hover:bg-cyan-950/40 cursor-pointer shadow-[0_0_25px_rgba(0,255,255,0.25)] hover:shadow-[0_0_45px_rgba(0,255,255,0.5)] transition-all duration-300"
            >
              <div className="px-9 py-3.5 flex items-center gap-3.5">
                <Play className="w-5 h-5 text-cyan-400 fill-cyan-400 animate-pulse" />
                <span className="font-mono text-base md:text-lg font-bold tracking-[0.25em] uppercase text-white drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                  PLAY GAME
                </span>
              </div>
            </BorderBeamCornerCutCard>
          </motion.div>

        </div>
      </div>

    </main>
  );
}
