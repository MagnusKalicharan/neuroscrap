"use client";
/**
 * src/ending/EndingCinematicScene.tsx
 * ============================================================
 * High-Fidelity 3D Real-Time Cinematic Scene for "THE ENDING".
 * 
 * Timeline:
 * - 0s - 9s:  Act 1 — Antenna Transmission into Deep Space
 * - 9s - 16s: Act 2 — "2 Hours Later..." Time Lapse (managed by HUD, camera floats in starfield)
 * - 16s - 27s: Act 3 — Rescue Two Orbital Entry & Atmospheric Descent
 * - 27s - 37s: Act 4 — Touchdown on Planet Surface & Cargo Ramp Opening
 * - 37s - 48s: Act 5 — SCRAP Walks across Planet and Boards Rescue Two
 * - 48s - 56s: Act 6 — Liftoff, Retraction & Hyperspace Escape
 * - 56s+:     Act 7 — Fade to Black / Epilogue Card
 */
import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RescueShipMesh } from "./ship/RescueShipMesh";
import { ScrapModel } from "./ScrapModel";
import { AntennaMesh } from "../props/antenna/AntennaMesh";
import { ANTENNA_WORLD_POS } from "../props/antenna/antenna.config";

interface EndingCinematicSceneProps {
  elapsedTime: number; // in seconds
  reducedMotion?: boolean;
}

export function EndingCinematicScene({
  elapsedTime,
  reducedMotion = false,
}: EndingCinematicSceneProps) {
  const { camera } = useThree();

  // References
  const beamRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);

  // Procedural Stars in deep space
  const starGeo = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 250 + Math.random() * 50;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10; // Upper sky hemisphere
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  // ── PURE FUNCTIONAL CINEMATIC KINEMATICS ──────────────────────────────────
  const t = elapsedTime;

  // 1. Saucer State
  let shipPos: [number, number, number] = [0, 400, -200];
  let shipRot: [number, number, number] = [0, 0, 0];
  let shipScale = 1.0;
  let shipVisible = false;
  let gearDeploy = 0.0;
  let rampDeploy = 0.0;
  let retroThrust = 0.0;
  let searchlightPitch = 0.0;

  // 2. SCRAP Robot State
  let scrapPos: [number, number, number] = [-18, -14.0, 22];
  let scrapRot: [number, number, number] = [0, Math.PI / 2, 0];
  let scrapVisible = false;
  let scrapWalkPhase = 0.0;
  let scrapIsWalking = false;

  // 3. Antenna Beam State
  let beamOpacity = 0.0;

  // 4. Camera Trajectory Vectors
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  // ── ACT 1: Antenna Uplink Transmission (0s - 9s) ──────────────────────────
  if (t < 9.0) {
    const p = t / 9.0;
    // Camera worm's-eye looking up at the antenna dish through the wreck roof
    camPos.set(
      THREE.MathUtils.lerp(1.2, 0.5, p),
      THREE.MathUtils.lerp(1.0, 2.5, p),
      THREE.MathUtils.lerp(10.5, 8.5, p)
    );
    camTarget.set(ANTENNA_WORLD_POS.x, 11.0, ANTENNA_WORLD_POS.z);

    // Beam erupts at 3.0s
    if (t > 2.5 && t < 8.5) {
      beamOpacity = Math.min(1.0, (t - 2.5) * 2.0);
    }
  }

  // ── ACT 2: "2 Hours Later..." Deep Space Time-Lapse (9s - 16s) ───────────
  else if (t < 16.0) {
    const p = (t - 9.0) / 7.0;
    // Deep starry sky panoramic drift
    camPos.set(Math.sin(p * 0.5) * 30, 40 + p * 10, -50 + p * 20);
    camTarget.set(0, 80, -100);
    shipVisible = false;
  }

  // ── ACT 3: Rescue Two Saucer Orbital Descent (16s - 27s) ──────────────────
  else if (t < 27.0) {
    const p = (t - 16.0) / 11.0;
    shipVisible = true;

    // Smooth ease-in-out descent from high orbit to hover altitude
    const ease = p * p * (3 - 2 * p);
    const startX = -80, startY = 180, startZ = -140;
    const endX = 0, endY = 10, endZ = 0;

    shipPos = [
      THREE.MathUtils.lerp(startX, endX, ease),
      THREE.MathUtils.lerp(startY, endY, ease),
      THREE.MathUtils.lerp(startZ, endZ, ease),
    ];

    // Banking turn during atmospheric entry
    shipRot = [
      (1.0 - p) * 0.25, // Nose pitch down
      p * Math.PI * 0.8, // Slow yaw rotation
      Math.sin(p * Math.PI) * 0.2, // Bank roll
    ];

    retroThrust = 0.4 + Math.sin(p * 20) * 0.15; // Engine retro burn
    gearDeploy = p > 0.6 ? (p - 0.6) / 0.4 : 0.0; // Gear starts deploying in mid-descent

    // Wide sweeping camera following saucer descent
    camPos.set(45 - p * 20, 15 + p * 10, 75 - p * 15);
    camTarget.set(shipPos[0], shipPos[1], shipPos[2]);
  }

  // ── ACT 4: Touchdown & Belly Ramp Opening (27s - 37s) ─────────────────────
  else if (t < 37.0) {
    const p = (t - 27.0) / 10.0;
    shipVisible = true;

    // Settle smoothly from y = 10m to y = 0m (touchdown)
    const settle = Math.min(1.0, p / 0.45);
    const settleEase = settle * settle * (3 - 2 * settle);
    shipPos = [0, (1.0 - settleEase) * 10, 0];
    shipRot = [0, 0, 0];
    gearDeploy = 1.0; // Fully deployed
    retroThrust = (1.0 - settle) * 0.35; // Thrusters throttle down upon contact

    // Ramp swings open once touchdown is complete (p >= 0.45)
    if (p > 0.45) {
      rampDeploy = Math.min(1.0, (p - 0.45) / 0.40);
    }

    // Low heroic angle framing the landed saucer and the cargo ramp opening
    camPos.set(-28 + p * 6, -10 + p * 2, 42 - p * 4);
    camTarget.set(0, -9.0, 18);
  }

  // ── ACT 5: SCRAP Walks to the UFO & Gets Rescued (37s - 48s) ──────────────
  else if (t < 48.0) {
    const p = (t - 37.0) / 11.0;
    shipVisible = true;
    shipPos = [0, 0, 0];
    shipRot = [0, 0, 0];
    gearDeploy = 1.0;
    rampDeploy = p < 0.85 ? 1.0 : 1.0 - (p - 0.85) / 0.15; // Closes after Scrap enters

    scrapVisible = p < 0.88; // Disappears inside saucer once boarded
    scrapIsWalking = p < 0.82;
    scrapWalkPhase = p * 18.0;

    // Scrap walks from wreck exit [-18, -14.0, 20] toward the ramp foot [0, -14.0, 24]
    // and ascends up the ramp to the cargo bay [0, -4.0, 16]
    if (p < 0.55) {
      // Phase A: Walking across ground to ramp
      const walkP = p / 0.55;
      scrapPos = [
        THREE.MathUtils.lerp(-18, 0, walkP),
        -14.0,
        THREE.MathUtils.lerp(20, 24.5, walkP),
      ];
      scrapRot = [0, Math.PI * 0.35, 0];
    } else {
      // Phase B: Climbing up the ramp into the bay
      const climbP = Math.min(1.0, (p - 0.55) / 0.28);
      scrapPos = [
        0,
        THREE.MathUtils.lerp(-14.0, -4.2, climbP),
        THREE.MathUtils.lerp(24.5, 15.0, climbP),
      ];
      scrapRot = [0, 0, 0];
    }

    // Tracking camera moving with Scrap towards the warm lit ramp
    camPos.set(-16 + p * 12, -10 + p * 4, 34 - p * 6);
    camTarget.set(scrapPos[0], scrapPos[1] + 1.2, scrapPos[2]);
  }

  // ── ACT 6: Liftoff & Hyperspace Escape (48s - 56s) ─────────────────────────
  else if (t < 56.0) {
    const p = (t - 48.0) / 8.0;
    shipVisible = true;
    rampDeploy = 0.0; // Securely closed
    gearDeploy = Math.max(0.0, 1.0 - p * 2.5); // Gear retracts cleanly

    // Exponential acceleration up into deep space
    const climb = p * p * p;
    shipPos = [
      p * 40,
      climb * 350,
      -climb * 280,
    ];
    shipRot = [-p * 0.6, p * 0.4, 0];
    retroThrust = 0.5 + p * 0.5; // Maximum thrust burn

    // Camera tilts up following the saucer's streak into deep space
    camPos.set(-20, -8, 40);
    camTarget.set(shipPos[0], shipPos[1], shipPos[2]);
  }

  // ── ACT 7: Mission Complete Hold (56s+) ────────────────────────────────────
  else {
    shipVisible = false;
    camPos.set(0, 40, 80);
    camTarget.set(0, 80, -100);
  }

  // Update camera smoothly
  useFrame(() => {
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    if (starsRef.current) {
      starsRef.current.rotation.y = t * 0.005;
    }
  });

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight color="#182234" intensity={2.2} />
      <directionalLight
        position={[-35, 55, -75]}
        color="#ffd8a8"
        intensity={3.0}
      />
      <directionalLight position={[35, 20, 45]} color="#38bdf8" intensity={1.2} />

      {/* ── Deep Space Stars Sphere ── */}
      <points ref={starsRef} geometry={starGeo}>
        <pointsMaterial
          size={1.6}
          color="#ffffff"
          transparent
          opacity={0.85}
          sizeAttenuation
        />
      </points>

      {/* ── Planet Terrain Surface ── */}
      <mesh position={[0, -14.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600, 32, 32]} />
        <meshBasicMaterial color="#0A0E17" />
      </mesh>

      {/* ── Crashed Spaceship Wreckage Silhouette ── */}
      <group position={[-18, -14.0, 8]} rotation={[0, 0.4, 0]}>
        {/* Main broken hull cylinder section */}
        <mesh position={[0, 5.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[7.0, 7.5, 45, 16, 1, true, 0, Math.PI]} />
          <meshBasicMaterial color="#111827" side={THREE.DoubleSide} />
        </mesh>
        {/* Roof breach frame ribs */}
        <mesh position={[0, 6.0, 0]}>
          <boxGeometry args={[14, 0.8, 1.2]} />
          <meshBasicMaterial color="#1F2937" />
        </mesh>
      </group>

      {/* ── Roof Antenna Array & High-Voltage Transmission Beam ── */}
      <group position={[ANTENNA_WORLD_POS.x, -14.0 + ANTENNA_WORLD_POS.y, ANTENNA_WORLD_POS.z]}>
        <AntennaMesh />
        {/* High-Energy Beam firing up into the deep space sky during Act 1 */}
        {beamOpacity > 0.01 && (
          <group position={[0, 11.5, 0]}>
            {/* White-Hot Core Beam */}
            <mesh position={[0, 120, 0]}>
              <cylinderGeometry args={[0.3, 0.2, 240, 12]} />
              <meshBasicMaterial
                color="#FFFFFF"
                transparent
                opacity={beamOpacity * 0.95}
              />
            </mesh>
            {/* Emerald-Cyan Radiant Halo */}
            <mesh position={[0, 120, 0]}>
              <cylinderGeometry args={[1.6, 0.8, 240, 12]} />
              <meshBasicMaterial
                color="#10B981"
                transparent
                opacity={beamOpacity * 0.55}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        )}
      </group>

      {/* ── SCRAP Robot Hero ── */}
      {scrapVisible && (
        <ScrapModel
          position={scrapPos}
          rotation={scrapRot}
          scale={1.2}
          walkPhase={scrapWalkPhase}
          isWalking={scrapIsWalking}
        />
      )}

      {/* ── The 3D Rescue Two Saucer ── */}
      {shipVisible && (
        <RescueShipMesh
          position={shipPos}
          rotation={shipRot}
          scale={shipScale}
          gearDeploy={gearDeploy}
          rampDeploy={rampDeploy}
          engineThrust={retroThrust}
          searchlightPitch={searchlightPitch}
          searchlightYaw={0}
        />
      )}
    </>
  );
}
