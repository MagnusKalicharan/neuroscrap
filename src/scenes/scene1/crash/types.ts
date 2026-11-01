/**
 * Crash Cinematic Timing & Configuration Constants
 * All timings are in milliseconds, driven by CRASH_DURATION_MS = 6000.
 */

export const CRASH_DURATION_MS = 6000;

export const CRASH_CUTS = {
  warning: 1400,
  impact: 2000,
  second: 3700,
  aftermath: 4400,
  degrade: 5000,
  end: 6000,
} as const;

export interface CameraPose {
  x: number;
  y: number;
  z: number;
  pitch: number; // in radians
  yaw: number;   // in radians
  roll: number;  // in radians
  fov: number;
  shakeMagnitude: number;
}

export interface CrashCinematicProps {
  progress: number; // 0.0 to 1.0
  reduceMotion?: boolean;
  quality?: "low" | "medium" | "high";
  onDone?: () => void;
}
