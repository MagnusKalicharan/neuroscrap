/**
 * Section 3: Measurement Glossary
 * =================================
 * Single source of truth for player-facing names, icons, and descriptions
 * of the 4 measurement tools: Brightness, Steady beat, Colour, Jumpiness.
 *
 * Rules:
 * - Measurement IDs: "brightness", "beat", "colour", "jumpiness".
 * - Zero banned words: feature, extraction, dimension, cluster, classifier, correlation,
 *   anomaly, outlier, novelty.
 * - Zero hint words: beacon, decoy, good, bad.
 * - Each hoverText is at most 24 words, reading level <= Grade 7.
 */

import type { MeasurementId } from "./types.ts";

export const SECTION3_BRIEFING =
  "The rescue ship is far away, so it is faint. And it is a machine, so it blinks on a steady beat.";

export interface MeasurementGlossaryEntry {
  id: MeasurementId;
  plainName: string;
  shortName: string;
  icon: string;
  oneLiner: string;
  hoverText: string;
  example: string;
  markHint: string;
}

export const MEASUREMENT_GLOSSARY: Record<MeasurementId, MeasurementGlossaryEntry> = {
  brightness: {
    id: "brightness",
    plainName: "Brightness",
    shortName: "BRIGHTNESS",
    icon: "━",
    oneLiner: "Average level across all steps.",
    hoverText: "Add up all readings in the scan and find the middle level. Dim signals score low.",
    example: "A bright glow reads high. A faint glow reads low.",
    markHint: "a line at the middle level",
  },
  beat: {
    id: "beat",
    plainName: "Steady beat",
    shortName: "BEAT",
    icon: "⏱",
    oneLiner: "How regular the blinking is.",
    hoverText: "Check if pulses repeat like a clock. Random flickers score near zero, while steady pulses score high.",
    example: "A ticking pulse reads high. Wild drifting reads low.",
    markHint: "arrows across the pulse gap",
  },
  colour: {
    id: "colour",
    plainName: "Colour",
    shortName: "COLOUR",
    icon: "◐",
    oneLiner: "Red versus green light balance.",
    hoverText: "Compare the warm red light to the cool green light. Redder light gives a higher reading.",
    example: "Red scans read near one. Green scans read near zero.",
    markHint: "bars showing the color balance",
  },
  jumpiness: {
    id: "jumpiness",
    plainName: "Jumpiness",
    shortName: "JUMPINESS",
    icon: "↯",
    oneLiner: "How much it jumps around.",
    hoverText: "Look at the step between each moment. Big rapid jumps give a high reading.",
    example: "A smooth line reads low. A jagged line reads high.",
    markHint: "ticks at each jump",
  },
};

export const GLOSSARY_ENTRIES: MeasurementGlossaryEntry[] = [
  MEASUREMENT_GLOSSARY.brightness,
  MEASUREMENT_GLOSSARY.beat,
  MEASUREMENT_GLOSSARY.colour,
  MEASUREMENT_GLOSSARY.jumpiness,
];

export function getGlossaryEntry(id: MeasurementId | string): MeasurementGlossaryEntry {
  const entry = MEASUREMENT_GLOSSARY[id as MeasurementId];
  if (!entry) {
    return {
      id: id as MeasurementId,
      plainName: id.toUpperCase(),
      shortName: id.toUpperCase(),
      icon: "•",
      oneLiner: "Measurement reading",
      hoverText: "Measurement tool applied to the scan recording.",
      example: "Outputs a single number.",
      markHint: "marks on the curve",
    };
  }
  return entry;
}

/**
 * Fixed demo data for the ToolHint preview diagram:
 * - One smooth curve (sine wave with subtle floor)
 * - One spiky curve (alternating high/low jumps)
 * - Fixed colors
 * These are completely fixed and do not leak player scan data.
 */
export const DEMO_SMOOTH_SIGNAL: number[] = Array.from({ length: 64 }, (_, i) => {
  const t = i / 63;
  return Number((0.20 + 0.65 * Math.sin(t * Math.PI)).toFixed(4));
});

export const DEMO_SPIKY_SIGNAL: number[] = Array.from({ length: 64 }, (_, i) => {
  const base = (i % 2 === 0) ? 0.85 : 0.15;
  const mod = ((i * 7) % 11) / 50;
  return Number(Math.max(0.05, Math.min(0.95, base + mod)).toFixed(4));
});

export const DEMO_SMOOTH_COLOR: [number, number] = [0.35, 0.65];
export const DEMO_SPIKY_COLOR: [number, number] = [0.75, 0.25];

/**
 * Returns plain-English name for a pair recap.
 */
export function getPairRecapName(modAId: MeasurementId, modBId: MeasurementId): string {
  const nameA = MEASUREMENT_GLOSSARY[modAId]?.plainName || modAId;
  const nameB = MEASUREMENT_GLOSSARY[modBId]?.plainName || modBId;
  return `${nameA} + ${nameB}`;
}
