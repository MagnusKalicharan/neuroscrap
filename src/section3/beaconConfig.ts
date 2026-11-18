/**
 * Section 3: Find the Rescue Beacon — Candidate Signal Configurations
 * ====================================================================
 * Configures the 6 unknown candidate signals in a FIXED display order
 * (SIGNAL 1 .. SIGNAL 6) where the rescue beacon is NOT first (it is SIGNAL 3).
 *
 * All sky directions are unit vectors pointing into the visible sky breach.
 *
 * Decoy notes (original wording from prompt):
 * pulsar: "keeps a beat, but is as bright as an ordinary star"
 * flare: "far brighter than anything natural"
 * dark rock: "faint, but has no beat"
 * storm: "far jumpier than anything natural"
 * blue glow: "bluer than anything natural"
 */

import type { CandidateConfig, CandidateId } from "./types.ts";

export const BEACON_ID: CandidateId = "candidate_beacon";

export const CANDIDATE_CONFIGS: CandidateConfig[] = [
  {
    id: "candidate_pulsar",
    label: "SIGNAL 1",
    skyDirection: [0.45, 0.65, -0.61],
    decoyNote: "keeps a beat, but is as bright as an ordinary star",
    isBeacon: false,
  },
  {
    id: "candidate_flare",
    label: "SIGNAL 2",
    skyDirection: [0.30, 0.80, -0.52],
    decoyNote: "far brighter than anything natural",
    isBeacon: false,
  },
  {
    id: "candidate_beacon",
    label: "SIGNAL 3",
    skyDirection: [-0.2008, 0.7027, -0.6826],
    decoyNote: "",
    isBeacon: true,
  },
  {
    id: "candidate_dark_rock",
    label: "SIGNAL 4",
    skyDirection: [0.10, 0.55, -0.83],
    decoyNote: "faint, but has no beat",
    isBeacon: false,
  },
  {
    id: "candidate_storm",
    label: "SIGNAL 5",
    skyDirection: [-0.60, 0.50, -0.62],
    decoyNote: "far jumpier than anything natural",
    isBeacon: false,
  },
  {
    id: "candidate_blue_glow",
    label: "SIGNAL 6",
    skyDirection: [-0.55, 0.45, -0.70],
    decoyNote: "bluer than anything natural",
    isBeacon: false,
  },
];

export function getCandidateConfig(id: CandidateId): CandidateConfig | undefined {
  return CANDIDATE_CONFIGS.find((c) => c.id === id);
}

export function getBeaconConfig(): CandidateConfig {
  return CANDIDATE_CONFIGS.find((c) => c.isBeacon)!;
}
