/**
 * Scene 2: Configuration Constants & Thresholds
 * All values are deterministic constants.
 */

import { PLAYER_SPAWN } from "@/components/ship/layout";

export const WAKE_DURATION_MS = 9000;

export const SCENE2_CONFIG = {
  // Player & Camera poses
  playerSpawn: PLAYER_SPAWN as [number, number, number], // [0, 1.5, 6]
  wakeStartPos: [PLAYER_SPAWN[0], 0.35, PLAYER_SPAWN[2]] as [number, number, number],
  wakeEndPos: [PLAYER_SPAWN[0], 1.5, PLAYER_SPAWN[2]] as [number, number, number],
  wakeStartPitchDeg: 70,
  wakeStartRollDeg: 7,
  wakeStartYawDeg: 0,

  // Beacon configuration
  beaconPos: [0, 0.02, -8] as [number, number, number],
  beaconArrivalRadius: 1.4,

  // Learning thresholds
  lookAccumAngleDeg: 90,
  moveAccumDistUnits: 5.0,

  // Durations
  wakeDurationMs: WAKE_DURATION_MS,
  arriveHoldMs: 1200,

  // Nudge intervals
  nudgeShortMs: 10000,
  nudgeMediumMs: 25000,
  nudgeShowMeMs: 45000,
} as const;
