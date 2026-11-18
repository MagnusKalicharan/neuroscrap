"use client";
/**
 * src/ending/EndingCinematicInWorld.tsx
 * ============================================================
 * In-World Real-Time Cinematic Controller for "THE ENDING".
 * 
 * Flow:
 * - Act 1 (0s - 9s): Antenna emits distress signal beam through roof breach into space
 * - Act 2 (9s - 16s): "2 Hours Later..." Time Lapse with sub-space response
 * - Act 3 (16s - 26s): Rescue Two saucer descends from space across the black hole disk
 * - Act 4 (26s - 33s): Rescue Two touches down on rock-free left dunes, gear down, doorway opens
 * - Act 5 (Manual Egress): Control returns to the player! Player manually walks out through the
 *   crashed starship breach onto the dunes to Rescue Two and presses [E] to board!
 * - Act 6 (48s - 56s): Rescue Two airlock seals, thrusters ignite, liftoff past black hole
 * - Act 7 (56s+): Victory debrief debrief card
 */
import React, { useState, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RescueShipMesh } from "./ship/RescueShipMesh";
import {
  setAntennaState,
  setAntennaTarget,
  setCablePulse,
} from "../props/antenna/antenna.types";
import { DEFAULT_SKY_TARGET, ANTENNA_WORLD_POS } from "../props/antenna/antenna.config";
import { getTerrainHeight } from "../components/Game";
import { endingClock } from "./endingClock";
import { endingState } from "./endingState";

interface EndingCinematicInWorldProps {
  elapsedTime?: number; // in seconds (0..32)
  reducedMotion?: boolean;
  onTouchdownComplete?: () => void;
}

export function EndingCinematicInWorld({
  elapsedTime,
  reducedMotion = false,
  onTouchdownComplete,
}: EndingCinematicInWorldProps) {
  const { camera } = useThree();
  const [internalTime, setInternalTime] = useState(() => endingClock.getElapsedSec());
  const [isBoarded, setIsBoarded] = useState(() => endingState.getIsBoarded());

  useEffect(() => {
    const unsubClock = endingClock.subscribe((ms) => {
      setInternalTime(ms / 1000);
    });
    const unsubState = endingState.subscribe(() => {
      setIsBoarded(endingState.getIsBoarded());
    });
    return () => {
      unsubClock();
      unsubState();
    };
  }, []);

  const t = elapsedTime !== undefined && elapsedTime > 0 ? elapsedTime : internalTime;

  // ── Landing Site on Left Dunes (Strictly rock-free, clear of starship hull & wing) ──
  // Scale = 0.14 yields optimal 9.8m tactical dropship (radius 4.90m).
  // Positioned at [-23.0, -18.0]:
  // - >10.4m from closest basalt boulder (Stone 15 at [-29.63, -29.28]) -> ZERO rock contact!
  // - >12.0m from starship hull wall (x = -11.0) -> ZERO hull contact!
  // - >8.0m from starship port wing (wing begins at z >= -10.0) -> ZERO wing contact!
  // - Direct line of sight from starship port breach (x = -11.0, z in [-15, -2]) onto open sand dunes!
  const UFO_SCALE = 0.14;
  const LAND_X = -23.0;
  const LAND_Z = -18.0;
  const groundY = getTerrainHeight(LAND_X, LAND_Z); // ~ -0.233m
  const TOUCHDOWN_Y = groundY + 14.0 * UFO_SCALE; // ~ 1.727m

  // Heading faces directly toward the starship port breach (yaw = 1.107 rad ~ 63.4°)
  const SHIP_YAW = 1.107;

  // Ramp tip in world coordinates (48° compact doorway ramp, horizontal reach 1.10m world)
  const RAMP_TIP_REACH = 1.10;
  const rampTipX = LAND_X + RAMP_TIP_REACH * Math.sin(SHIP_YAW); // -22.02m
  const rampTipZ = LAND_Z + RAMP_TIP_REACH * Math.cos(SHIP_YAW); // -17.51m

  // Trigger antenna transmission in Act 1
  useEffect(() => {
    if (t < 9.0) {
      setAntennaState("transmitting");
      setAntennaTarget(DEFAULT_SKY_TARGET);
      setCablePulse(1.0);
    } else {
      setAntennaState("powering");
    }

    return () => {
      setAntennaState("dead");
    };
  }, [t < 9.0]);

  // Handle transition to normal gameplay once UFO has landed on the dunes at t = 32s
  useEffect(() => {
    if (t >= 32.0 && onTouchdownComplete) {
      onTouchdownComplete();
    } else if (t >= 32.8 && !isBoarded && endingState.getPhase() !== "manual_egress") {
      endingState.setPhase("manual_egress");
      endingClock.pause();
    }
  }, [t, isBoarded, onTouchdownComplete]);

  // Saucer Kinematics
  let shipPos: [number, number, number] = [LAND_X, 300, LAND_Z - 60];
  let shipRot: [number, number, number] = [0, SHIP_YAW, 0];
  let shipVisible = false;
  let gearDeploy = 0.0;
  let rampDeploy = 0.0;
  let engineThrust = 0.0;

  // Camera Trajectory
  const camPos = useRef(new THREE.Vector3()).current;
  const camTarget = useRef(new THREE.Vector3()).current;
  let isCinematicCamera = true;

  // ── ACT 1: Inside Cargo Bay — Comms Antenna Emits Beam (0s – 9s) ──────────
  if (t < 9.0) {
    const p = t / 9.0;
    camPos.set(
      THREE.MathUtils.lerp(2.1, 2.0, p),
      THREE.MathUtils.lerp(1.3, 2.4, p),
      THREE.MathUtils.lerp(9.8, 8.2, p)
    );
    camTarget.set(ANTENNA_WORLD_POS.x, 10.8, ANTENNA_WORLD_POS.z);
    shipVisible = false;
    isCinematicCamera = true;
  }

  // ── ACT 2: "2 Hours Later..." Time Lapse on Left Dunes (9s – 16s) ─────────
  else if (t < 16.0) {
    const p = (t - 9.0) / 7.0;
    camPos.set(
      THREE.MathUtils.lerp(-16.0, -17.0, p),
      THREE.MathUtils.lerp(2.8, 2.5, p),
      THREE.MathUtils.lerp(-6.0, -8.0, p)
    );
    camTarget.set(LAND_X, groundY + 2.0, LAND_Z);
    shipVisible = false;
    isCinematicCamera = true;
  }

  // ── ACT 3: Rescue Two Atmospheric Descent (16s – 26s) ────────────────────
  else if (t < 26.0) {
    const p = (t - 16.0) / 10.0;
    shipVisible = true;

    const ease = p * p * (3 - 2 * p);
    const startY = 120.0;
    const endY = TOUCHDOWN_Y + 2.5;

    shipPos = [
      THREE.MathUtils.lerp(LAND_X - 10.0, LAND_X, ease),
      THREE.MathUtils.lerp(startY, endY, ease),
      THREE.MathUtils.lerp(LAND_Z - 18.0, LAND_Z, ease),
    ];

    shipRot = [
      (1.0 - p) * 0.15,
      THREE.MathUtils.lerp(0.0, SHIP_YAW, ease),
      Math.sin(p * Math.PI) * 0.12,
    ];

    engineThrust = 0.5 + Math.sin(p * 25) * 0.15;
    gearDeploy = p > 0.5 ? (p - 0.5) / 0.5 : 0.0;
    rampDeploy = 0.0; // Strictly closed in flight

    camPos.set(-15.5, 2.8, -6.5);
    camTarget.set(shipPos[0], shipPos[1] + 0.8, shipPos[2]);
    isCinematicCamera = true;
  }

  // ── ACT 4: Touchdown on Planet Surface & Doorway Opens (26s – 33s) ────────
  else if (t < 33.0 && !isBoarded) {
    const p = (t - 26.0) / 7.0;
    shipVisible = true;

    // Smooth settle onto rock-free planet terrain
    const settle = Math.min(1.0, p / 0.45);
    const settleEase = settle * settle * (3 - 2 * settle);
    shipPos = [LAND_X, TOUCHDOWN_Y + (1.0 - settleEase) * 2.5, LAND_Z];
    shipRot = [0, SHIP_YAW, 0];
    gearDeploy = 1.0;
    engineThrust = (1.0 - settle) * 0.35;

    // Doorway ramp ONLY opens once landed on the ground (settle >= 0.95)
    if (settle >= 0.95 && p > 0.5) {
      rampDeploy = Math.min(1.0, (p - 0.5) / 0.45);
    } else {
      rampDeploy = 0.0;
    }

    camPos.set(
      THREE.MathUtils.lerp(-15.5, -16.0, p),
      THREE.MathUtils.lerp(2.8, 2.6, p),
      THREE.MathUtils.lerp(-6.5, -8.0, p)
    );
    camTarget.set(LAND_X, groundY + 1.2, LAND_Z);
    isCinematicCamera = true;
  }

  // ── ACT 5: PLAYER MANUAL EGRESS & BOARDING (t >= 33s and not boarded) ─────
  else if (!isBoarded) {
    // Saucer sits patiently on the sand dunes with doorway open and ramp extended
    shipVisible = true;
    shipPos = [LAND_X, TOUCHDOWN_Y, LAND_Z];
    shipRot = [0, SHIP_YAW, 0];
    gearDeploy = 1.0;
    rampDeploy = 1.0;
    engineThrust = 0.0;

    // Camera control belongs to the PLAYER in first-person view!
    isCinematicCamera = false;
  }

  // ── ACT 6: Liftoff & Planetary Escape (48s – 56s) ─────────────────────────
  else if (t < 56.0) {
    const p = Math.max(0.0, Math.min(1.0, (t - 48.0) / 8.0));
    shipVisible = true;
    rampDeploy = 0.0; // Airlock sealed shut!
    gearDeploy = Math.max(0.0, 1.0 - p * 3.0); // Gear retracts into pods

    // Climb into deep space toward the black hole
    const climb = p * p * p;
    shipPos = [
      LAND_X - p * 16.0,
      TOUCHDOWN_Y + climb * 240.0,
      LAND_Z - climb * 180.0,
    ];
    shipRot = [-p * 0.4, SHIP_YAW + p * 0.2, 0];
    engineThrust = 0.6 + p * 0.4;

    // Cinematic camera tracking liftoff across the black hole accretion disk
    camPos.set(-17.0, 2.6, -7.0);
    camTarget.set(shipPos[0], shipPos[1], shipPos[2]);
    isCinematicCamera = true;
  }

  // ── ACT 7: Mission Complete Hold (56s+) ───────────────────────────────────
  else {
    shipVisible = false;
    camPos.set(-17.0, 2.6, -7.0);
    camTarget.set(LAND_X - 50.0, groundY + 80.0, LAND_Z - 80.0);
    isCinematicCamera = true;
  }

  // Frame update
  useFrame(() => {
    if (isCinematicCamera) {
      camera.position.copy(camPos);
      camera.lookAt(camTarget);
    } else {
      // During player manual egress, check player distance to Rescue Two doorway ramp
      const playerDist = Math.hypot(camera.position.x - rampTipX, camera.position.z - rampTipZ);
      endingState.setNearRescueShip(playerDist < 4.8);
    }
  });

  return (
    <>
      {/* ── Rescue Two Saucer ── */}
      {shipVisible && (
        <RescueShipMesh
          position={shipPos}
          rotation={shipRot}
          scale={UFO_SCALE}
          gearDeploy={gearDeploy}
          rampDeploy={rampDeploy}
          engineThrust={engineThrust}
          searchlightPitch={0.0}
          searchlightYaw={0}
        />
      )}
    </>
  );
}
