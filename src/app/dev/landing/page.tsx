"use client";

import React, { Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { SylvaLivingWorld } from "@/components/threeui/sylva-living-world";
import { LandingView } from "@/landing/LandingView";

const BackgroundMusic = dynamic(
  () => import("@/components/audio/background-music").then((m) => m.BackgroundMusic),
  { ssr: false }
);

function DevLandingContent() {
  const searchParams = useSearchParams();
  const initialPopup = searchParams.get("popup") as
    | "about"
    | "visualisations"
    | "references"
    | null;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050806] select-none">
      {/* ═══ Top-Right Global Audio Controller ═══ */}
      <div className="fixed top-6 right-6 z-50 pointer-events-auto">
        <BackgroundMusic />
      </div>

      {/* ═══ 3D Living World Background Scene ═══ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SylvaLivingWorld />
        {/* Soft edge vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-vignette"
        />
      </div>

      {/* ═══ Landing Content View ═══ */}
      <LandingView isDev={true} />
    </main>
  );
}

export default function DevLandingPage() {
  // Test page /dev/landing must call notFound() in production via process.env.NODE_ENV
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-[#050806] flex items-center justify-center text-cyan-400 font-mono">
          LOADING LANDING DEV TEST...
        </div>
      }
    >
      <DevLandingContent />
    </Suspense>
  );
}
