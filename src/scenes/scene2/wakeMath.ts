/**
 * Pure Mathematical Kinematics for Scene 2 Wake Animation
 * Everything is a pure deterministic function of progress p (0..1).
 */

import * as THREE from "three";
import { SCENE2_CONFIG, WAKE_DURATION_MS } from "./scene2.config";

export interface EvaluatedWakePose {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  fov: number;
  eyelidOpenPercent: number; // 0.0 (closed) to 1.0 (open)
  blackLayerOpacity: number; // 1.0 (black) to 0.0 (transparent)
  isUpright: boolean;
}

const _pos = new THREE.Vector3();
const _rot = new THREE.Euler(0, 0, 0, "YXZ");

const DEG2RAD = Math.PI / 180;

/**
 * Evaluates the camera pose, eyelid aperture, and black fade as a pure function of p.
 */
export function evaluateWakePose(
  p: number,
  reduceMotion: boolean = false,
  aspectRatio: number = 16 / 9
): EvaluatedWakePose {
  const clampedP = Math.min(1, Math.max(0, p));
  const timeMs = clampedP * WAKE_DURATION_MS;

  const baseFov = aspectRatio < 1.0 ? 95 : 78;

  // ─────────────────────────────────────────────────────────────
  // 1. EYELIDS & BLACK LAYER (0.00 - 0.12)
  // Two distinct flutters: open 35%, close, open 100%
  // ─────────────────────────────────────────────────────────────
  let eyelidOpen = 0.0;
  let blackOpacity = 1.0;

  if (reduceMotion) {
    if (clampedP < 0.12) {
      eyelidOpen = clampedP / 0.12;
      blackOpacity = 1 - eyelidOpen;
    } else {
      eyelidOpen = 1.0;
      blackOpacity = 0.0;
    }
  } else {
    if (clampedP < 0.05) {
      // Flutter 1: opens to 35% then closes
      const u = clampedP / 0.05;
      eyelidOpen = Math.sin(u * Math.PI) * 0.35;
      blackOpacity = Math.max(0, 1 - eyelidOpen * 1.5);
    } else if (clampedP < 0.07) {
      // Closed pause between blinks (interval >= 600ms equivalent)
      eyelidOpen = 0.0;
      blackOpacity = 0.8;
    } else if (clampedP < 0.12) {
      // Flutter 2: opens fully from 0% to 100%
      const u = (clampedP - 0.07) / 0.05;
      eyelidOpen = Math.min(1, u);
      blackOpacity = Math.max(0, 1 - u);
    } else {
      eyelidOpen = 1.0;
      blackOpacity = 0.0;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CAMERA POSE (LYING -> RISING)
  // Start: pos [0, 0.35, 6], pitch +70 deg, roll +7 deg
  // Final: pos [0, 1.50, 6], pitch 0 deg, roll 0 deg, yaw 0 deg
  // ─────────────────────────────────────────────────────────────
  const spawn = SCENE2_CONFIG.playerSpawn;
  let px = spawn[0];
  let py = 0.35;
  let pz = spawn[2];

  let pitchDeg = 70;
  let rollDeg = 7;
  let yawDeg = 0;

  if (clampedP < 0.55) {
    // Phase 1: Lying on floor (0.00 - 0.55)
    py = 0.35;
    pitchDeg = 70;
    rollDeg = 7;

    // Subtle breathing motion between 0.12 and 0.55 (0.5 deg pitch oscillation at 0.2 Hz)
    if (!reduceMotion && clampedP >= 0.12) {
      const breathPhase = ((timeMs - 1080) / 1000) * 0.2 * Math.PI * 2;
      pitchDeg += Math.sin(breathPhase) * 0.5;
    }
  } else if (clampedP < 0.80) {
    // Phase 2: Head & body rise (0.55 - 0.80)
    const u = (clampedP - 0.55) / 0.25; // 0..1 over 2.25s

    if (reduceMotion) {
      // Smooth linear/cubic ease-in without overshoot
      const ease = u * u * (3 - 2 * u);
      py = 0.35 + (1.5 - 0.35) * ease;
      pitchDeg = 70 * (1 - ease);
      rollDeg = 7 * (1 - ease);
    } else {
      // Ease-out with small realistic overshoot to 1.54, then settles to 1.50
      const overshootEase = Math.sin((u * Math.PI) / 2);
      const overshootBump = Math.sin(u * Math.PI) * 0.04;
      py = 0.35 + (1.5 - 0.35) * overshootEase + overshootBump;

      // Smooth damped pitch ease down to horizon (70 -> 0)
      pitchDeg = 70 * Math.cos((u * Math.PI) / 2);
      // Roll eases smoothly to 0 (7 -> 0)
      rollDeg = 7 * (1 - u);
    }
  } else {
    // Phase 3: Calibrated upright pose (0.80 - 1.00)
    // Matches EXACT Player starting pose
    py = 1.5;
    pitchDeg = 0;
    rollDeg = 0;
    yawDeg = 0;
  }

  _pos.set(px, py, pz);
  _rot.set(pitchDeg * DEG2RAD, yawDeg * DEG2RAD, rollDeg * DEG2RAD, "YXZ");

  return {
    position: _pos,
    rotation: _rot,
    fov: baseFov,
    eyelidOpenPercent: eyelidOpen,
    blackLayerOpacity: blackOpacity,
    isUpright: clampedP >= 0.80,
  };
}
