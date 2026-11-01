/**
 * Pure Mathematical Kinematics for Crash Cinematic
 * Everything is a pure deterministic function of progress p (0..1).
 */

import * as THREE from "three";
import { CRASH_DURATION_MS, CRASH_CUTS, CameraPose } from "./types";

/**
 * 32-bit Seeded Random Generator (mulberry32)
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic continuous harmonic noise in [-1, 1]
 */
export function seededNoise(seed: number, t: number): number {
  const s1 = Math.sin(t * 19.34 + seed * 1.7);
  const s2 = Math.sin(t * 37.81 + seed * 4.3);
  const s3 = Math.sin(t * 71.19 + seed * 8.9);
  const s4 = Math.cos(t * 113.43 + seed * 13.1);
  return (s1 * 0.4 + s2 * 0.3 + s3 * 0.2 + s4 * 0.1);
}

/**
 * Damped spring oscillation: A * exp(-decay * t) * sin(freq * 2pi * t)
 */
export function dampedSpring(
  amplitude: number,
  frequency: number,
  decayRate: number,
  tSec: number
): number {
  if (tSec < 0) return 0;
  return amplitude * Math.exp(-decayRate * tSec) * Math.sin(frequency * Math.PI * 2 * tSec);
}

/** Preallocated calculation scratchpads */
const _pos = new THREE.Vector3();
const _rot = new THREE.Euler(0, 0, 0, "YXZ");
const _shake = new THREE.Vector3();

export interface EvaluatedFrame {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  fov: number;
  shakeOffset: THREE.Vector3;
  shakeMagnitude: number;
  crtSquashY: number;
  blackOpacity: number;
}

/**
 * Evaluates the full camera pose and screen state as a pure function of progress p (0..1).
 * Zero per-frame object allocation (reuses internal scratchpads).
 */
export function evaluateCameraPose(
  p: number,
  reduceMotion: boolean = false,
  aspectRatio: number = 16 / 9
): EvaluatedFrame {
  const clampedP = Math.min(1, Math.max(0, p));
  const t = clampedP * CRASH_DURATION_MS; // milliseconds (0..6000)

  // FOV: 78 default, raised to 95 in portrait
  const baseFov = aspectRatio < 1.0 ? 95 : 78;

  // Base starting position: inside ship near cockpit end: (0, 1.5, -18)
  let posX = 0;
  let posY = 1.5;
  let posZ = -18.0;

  let pitch = 0; // pitch (radians)
  let yaw = 0;   // yaw (radians)
  let roll = 0;  // roll (radians)

  let shakeAmp = 0;
  let crtSquashY = 1.0;
  let blackOpacity = 0.0;

  const DEG2RAD = Math.PI / 180;

  if (reduceMotion) {
    // ─────────────────────────────────────────────────────────────
    // REDUCE MOTION: Gentle smooth dolly, zero shake, zero roll swings
    // ─────────────────────────────────────────────────────────────
    const dollyProgress = Math.min(1, t / 4500);
    posZ = -18.0 + dollyProgress * 2.5; // dolly from -18 to -15.5
    posY = 1.5 - dollyProgress * 0.08;

    if (t >= 5800) {
      const offP = (t - 5800) / 200;
      blackOpacity = Math.min(1, offP);
      crtSquashY = Math.max(0.01, 1 - offP);
    }

    _pos.set(posX, posY, posZ);
    _rot.set(0, 0, 0, "YXZ");
    _shake.set(0, 0, 0);

    return {
      position: _pos,
      rotation: _rot,
      fov: baseFov,
      shakeOffset: _shake,
      shakeMagnitude: 0,
      crtSquashY,
      blackOpacity,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // FULL MOTION KINEMATICS (PURE FUNCTION OF t)
  // ─────────────────────────────────────────────────────────────

  if (t < CRASH_CUTS.warning) {
    // ── 0 to 1400 ms: CALM BEFORE ──────────────────────────────
    const phaseP = t / CRASH_CUTS.warning;
    // Slow dolly forward 1.5 units (-18.0 -> -16.5)
    posZ = -18.0 + phaseP * 1.5;
    // Subtle head-bob
    posY = 1.5 + Math.sin(phaseP * Math.PI * 4) * 0.025;
    posX = Math.cos(phaseP * Math.PI * 2) * 0.015;
    // Slight dutch angle (1.5 deg)
    roll = 1.5 * DEG2RAD;
    shakeAmp = 0;
  } else if (t < CRASH_CUTS.impact) {
    // ── 1400 to 2000 ms: WARNING ───────────────────────────────
    const phaseP = (t - CRASH_CUTS.warning) / (CRASH_CUTS.impact - CRASH_CUTS.warning);
    posZ = -16.5 + phaseP * 0.6; // continues dolly to -15.9
    posY = 1.5 + Math.sin((phaseP + 1) * Math.PI * 4) * 0.025;
    posX = Math.cos((phaseP + 1) * Math.PI * 2) * 0.015;
    roll = 1.5 * DEG2RAD;

    // Tremor shake amplitude 0.01 -> 0.04
    shakeAmp = 0.01 + phaseP * 0.03;
  } else if (t < CRASH_CUTS.second) {
    // ── 2000 to 3700 ms: IMPACT & CHAOS ────────────────────────
    const dt = (t - CRASH_CUTS.impact) / 1000; // seconds since impact (0..1.7s)

    // Camera thrown forward and to the right
    const throwX = dampedSpring(0.32, 2.2, 2.5, dt);
    const throwZ = dampedSpring(0.45, 1.8, 2.2, dt);
    posX = throwX;
    posZ = -15.9 + throwZ + dt * 0.25;
    posY = 1.5 - dampedSpring(0.18, 3.0, 2.8, dt);

    // Damped spring angles: pitch -8 deg, yaw +6 deg
    pitch = dampedSpring(-8 * DEG2RAD, 2.4, 2.6, dt);
    yaw = dampedSpring(6 * DEG2RAD, 2.1, 2.4, dt);

    // Ship rolls: camera roll swings +11 -> -8 -> +5 deg with decaying oscillation
    // We compose an explicit decaying oscillating waveform matching the exact swing targets
    const rollDecay = Math.exp(-dt * 1.6);
    const rollOsc = Math.cos(dt * Math.PI * 2.2); // oscillates over ~0.9s half-period
    roll = (11 * DEG2RAD * rollOsc + 2 * DEG2RAD) * rollDecay;

    // Shake burst (max 0.12 units, exponential decay)
    shakeAmp = 0.12 * Math.exp(-dt * 3.2) + 0.035 * Math.exp(-dt * 0.9);
  } else if (t < CRASH_CUTS.aftermath) {
    // ── 3700 to 4400 ms: SECOND HIT & SLIDE ────────────────────
    const dt2 = (t - CRASH_CUTS.second) / 1000; // seconds since 2nd hit (0..0.7s)
    const slideP = (t - CRASH_CUTS.second) / (CRASH_CUTS.aftermath - CRASH_CUTS.second);

    // Beam strike toward camera: roll kick & pitch kick
    pitch = (-5 * DEG2RAD + dampedSpring(-3 * DEG2RAD, 3.2, 4.0, dt2)) * (1 - slideP * 0.4);
    yaw = (3 * DEG2RAD + dampedSpring(4 * DEG2RAD, 2.8, 4.0, dt2)) * (1 - slideP * 0.4);

    // Roll kick settles from -6 deg toward +4 deg rested tilt
    const rollKick = dampedSpring(-6 * DEG2RAD, 2.6, 3.5, dt2);
    roll = rollKick + (4 * DEG2RAD) * slideP;

    // Camera slides along floor: posX moves to 0.35, posZ to -15.2
    posX = 0.2 + slideP * 0.15;
    posY = 1.45 - slideP * 0.08;
    posZ = -15.45 + slideP * 0.25;

    // Shake decaying from 0.08 burst down to 0.01
    shakeAmp = 0.08 * Math.exp(-dt2 * 5.0) + 0.045 * (1 - slideP);
  } else if (t < CRASH_CUTS.degrade) {
    // ── 4400 to 5000 ms: AFTERMATH ─────────────────────────────
    const settleP = (t - CRASH_CUTS.aftermath) / (CRASH_CUTS.degrade - CRASH_CUTS.aftermath);

    // Rested tilt: roll +4 deg, pitch -3 deg
    roll = 4 * DEG2RAD;
    pitch = -3 * DEG2RAD;
    yaw = 1.2 * DEG2RAD;

    posX = 0.35;
    posY = 1.37;
    posZ = -15.2;

    // Residual settling tremor fading to 0
    shakeAmp = 0.015 * (1 - settleP);
  } else if (t < 5800) {
    // ── 5000 to 5800 ms: DEGRADE ───────────────────────────────
    roll = 4 * DEG2RAD;
    pitch = -3 * DEG2RAD;
    yaw = 1.2 * DEG2RAD;

    posX = 0.35;
    posY = 1.37;
    posZ = -15.2;

    shakeAmp = 0.003; // faint micro-tremor
  } else {
    // ── 5800 to 6000 ms: OFF ───────────────────────────────────
    roll = 4 * DEG2RAD;
    pitch = -3 * DEG2RAD;
    yaw = 1.2 * DEG2RAD;

    posX = 0.35;
    posY = 1.37;
    posZ = -15.2;
    shakeAmp = 0;

    // CRT squash scaleY 1 -> 0.01
    const offP = (t - 5800) / 200;
    crtSquashY = Math.max(0.01, 1 - offP * 0.99);
    blackOpacity = offP >= 0.85 ? 1.0 : offP * 0.5;
  }

  // ─────────────────────────────────────────────────────────────
  // COMPUTE HIGH-FREQUENCY CONTINUOUS SEEDED SHAKE
  // ─────────────────────────────────────────────────────────────
  if (shakeAmp > 0) {
    const timeSec = t / 1000;
    const sx = seededNoise(101, timeSec * 28.0) * shakeAmp;
    const sy = seededNoise(202, timeSec * 32.0) * shakeAmp;
    const sz = seededNoise(303, timeSec * 24.0) * (shakeAmp * 0.5);
    _shake.set(sx, sy, sz);

    // Apply slight angular rotational jitter from shake
    pitch += seededNoise(404, timeSec * 22.0) * (shakeAmp * 0.6);
    roll += seededNoise(505, timeSec * 26.0) * (shakeAmp * 0.8);
  } else {
    _shake.set(0, 0, 0);
  }

  _pos.set(posX + _shake.x, posY + _shake.y, posZ + _shake.z);
  _rot.set(pitch, yaw, roll, "YXZ");

  return {
    position: _pos,
    rotation: _rot,
    fov: baseFov,
    shakeOffset: _shake,
    shakeMagnitude: shakeAmp,
    crtSquashY,
    blackOpacity,
  };
}
