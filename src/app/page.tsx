"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SylvaLivingWorld } from "@/components/threeui/sylva-living-world";
import { LandingView } from "@/landing/LandingView";

const BackgroundMusic = dynamic(
  () => import("@/components/audio/background-music").then((m) => m.BackgroundMusic),
  { ssr: false }
);

export default function NeuroScrapLanding() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("section") || params.get("scene")) {
        router.push(`/game?${params.toString()}`);
      }
    }
  }, [router]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050806] select-none">
      {/* ═══ Top-Right Global Audio Controller (Z-50) ═══ */}
      <div className="fixed top-6 right-6 z-50 pointer-events-auto">
        <BackgroundMusic />
      </div>

      {/* ═══ LAYER 0 — 3D Background (Full-Screen & Fixed) ═══ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SylvaLivingWorld />
        {/* Soft edge vignette leaving right-hand mossy robot landscape clearly visible */}
        <div
          aria-hidden="true"
          suppressHydrationWarning
          className="absolute inset-0 pointer-events-none bg-vignette"
        />
      </div>

      {/* ═══ LAYER 1 — Subtle Ambient Scanlines (non-interactive) ═══ */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div
          aria-hidden="true"
          suppressHydrationWarning
          className="absolute inset-0 mix-blend-overlay opacity-[0.05] bg-scanlines"
        />
      </div>

      {/* ═══ LAYER 2 — Landing Content: Buttons Column & Popups ═══ */}
      <LandingView />
    </main>
  );
}
