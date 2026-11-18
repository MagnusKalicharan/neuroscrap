/**
 * src/ending/types.ts
 * ============================================================
 * Cinematic Constants, Timing Definitions & Pure Functional Types
 * for "THE ENDING" (Rescue Two Arrival & Planetary Escape).
 */

export const ENDING_DURATION_MS = 58000;

export const ENDING_CUTS = {
  send: 0,          // 0-6s: First-person at antenna terminal, SEND clicked, cable pulse
  antenna: 6000,    // 6-16s: Exterior low angle, antenna wakes, aligns to beacon, fires beam
  listen: 16000,    // 16-26s: Wide angle along beam, distant steady beat (0.8Hz), answers at 21.5s
  approach: 26000,  // 26-38s: Rescue Two saucer sweeps in across black hole accretion disc
  searchlight: 38000, // 38-50s: Ship hovers at 60m, searchlight sweeps wreck & locks antenna, ramp opens
  hold: 50000,      // 50-58s: Wide pull-back, letters box, fade to black at 56s
  end: 58000,       // 58s+: Terminal recap card (Collect, Clean, Choose, Learn)
} as const;

export type EndingCutName = keyof typeof ENDING_CUTS;

export type EndingQuality = "low" | "medium" | "high";

export interface RescueShipPose {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  engineThrust: number;     // 0..1 (engine plume length & intensity)
  chasePhase: number;       // 0..1 (rim chase light travel)
  navBlink: boolean;        // 0.8 Hz beacon state
  gearDeploy: number;       // 0 (folded) .. 1 (fully extended)
  rampDeploy: number;       // 0 (closed) .. 1 (fully lowered)
  searchlightActive: number;// 0..1 (cone intensity)
  searchlightTarget?: [number, number, number];
}

export interface EndingSubtitles {
  speaker: "ORACLE" | "RESCUE" | "SCRAP" | "";
  text: string;
  active: boolean;
  radio: boolean;
}
