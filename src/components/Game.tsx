"use client";

/**
 * NEURO-SCRAP — First-Person 3D Sci-Fi Spacecraft Crash Site
 * ============================================================
 * Environment: Crashed Interplanetary Starship on an Alien Planet
 * Sky:         Fullscreen General Relativity Raymarched Black Hole (Gargantua)
 *              with Keplerian shear, gravitational lensing, Doppler beaming,
 *              synced 1:1 to the 3D first-person camera in world coordinates!
 * Controls:    WASD (Move), Shift (Sprint), Mouse (Look), Esc (Unlock)
 * Tech:        React Three Fiber, Drei, Three.js, Custom WebGL Raymarcher
 * ============================================================
 */

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  Suspense,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  PointerLockControls,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import { useRouter } from "next/navigation";
import SpaceshipWreck, {
  PLAYER_SPAWN,
  resolveShipCollisions,
  type Aabb,
  type ShipModel,
} from "./SpaceshipWreck";
import { CABLE_CONFIGS } from "./ship/cableConfig";
import { getShipFloorHeight } from "./ship/collision";
import { shipAudio } from "../audio/shipAudio";
// @ts-ignore
import { ShipAudio, notifyFootstep, surfaceAt, playInteraction } from "../audio/ShipAudio";
import Scene1 from "../scenes/scene1/Scene1";
import CrashCinematic from "../scenes/scene1/crash/CrashCinematic";
import Scene2, { Scene2Canvas } from "../scenes/scene2/Scene2";

// ============================================================
// TUNABLE GAMEPLAY CONSTANTS
// ============================================================
export const EYE_HEIGHT = 1.5;
export const WALK_SPEED = 4.8;
export const RUN_SPEED = 9.0;
export const DAMPING = 11.5;
export const WORLD_BOUNDS = 52.0;
export const HEAD_BOB = true;
export const PLAYER_RADIUS = 0.68;

// Direction in Three.js world space where the Black Hole sits in the sky:
// High in the sky, slightly to the left, rising majestically over the wreck
const BLACK_HOLE_WORLD_DIR = new THREE.Vector3(-0.35, 0.55, -0.75).normalize();

// Default camera vector in the Black Hole shader's local frame:
// Camera sits at distance ~22.5 from the horizon, looking towards the singularity
const BH_SHADER_CAM_POS = new THREE.Vector3(0, -4.2, 22.0);
const BH_SHADER_TARGET_DIR = new THREE.Vector3().copy(BH_SHADER_CAM_POS).negate().normalize();

// Quaternion aligning Three.js world space with the Black Hole shader space
const Q_ALIGN_SKY = new THREE.Quaternion().setFromUnitVectors(
  BLACK_HOLE_WORLD_DIR,
  BH_SHADER_TARGET_DIR
);

// Scratch vectors for camera synchronization (allocated once to avoid GC pressure)
const _camFwd = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _sFwd = new THREE.Vector3();
const _sRight = new THREE.Vector3();
const _sUp = new THREE.Vector3();

// ============================================================
// PROCEDURAL SCI-FI SOUND SYNTHESIS ENGINE (Web Audio API)
// 100% self-contained, instant zero-latency audio feedback
// ============================================================
class SoundEngine {
  private ctx: AudioContext | null = null;
  private lastStepTime = 0;
  private lastCollisionTime = 0;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playStep() {
    const now = performance.now();
    if (now - this.lastStepTime < 240) return;
    this.lastStepTime = now;

    const ctx = this.init();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(140 + Math.random() * 50, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(55 + Math.random() * 20, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(24, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  }

  playCollision() {
    const now = performance.now();
    if (now - this.lastCollisionTime < 380) return;
    this.lastCollisionTime = now;

    const ctx = this.init();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(115, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch {}
  }

  playPing() {
    const ctx = this.init();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(780, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1560, ctx.currentTime + 0.14);
      osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.65);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.72);
    } catch {}
  }

  playFlashlight() {
    const ctx = this.init();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(2200, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();

// ============================================================
// SEEDED PSEUDO-RANDOM NUMBER GENERATOR
// ============================================================
function createPRNG(seed: number) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ============================================================
// CONTINUOUS 3D TERRAIN HEIGHTMAP
// Starship crash trench, lateral ejecta berms, alien dunes & 100% clean ship interior clearance
// ============================================================
export const TERRAIN_VERSION = 3;

export function getTerrainHeight(x: number, z: number): number {
  let height = 0;

  // 1. Exterior landscape dunes & rolling regolith swells
  height += Math.sin(x * 0.08) * Math.cos(z * 0.09) * 0.45;
  height += Math.sin(x * 0.18 + z * 0.22) * 0.18;
  height += Math.cos(x * 0.35 - z * 0.28) * 0.08;

  // 2. Starship Crash Furrow (deep trench along ship track)
  const inTrenchZ = z > -58 && z < 54;
  const trenchDistX = Math.abs(x);

  if (inTrenchZ && trenchDistX < 14.0) {
    const tf = 1.0 - trenchDistX / 14.0;
    height -= tf * tf * 1.25;
  }

  // 3. Lateral Ejecta Berms (shattered regolith piled strictly OUTSIDE the hull, |x| >= 13.2)
  if (inTrenchZ && trenchDistX >= 13.2 && trenchDistX <= 20.0) {
    const bf = Math.sin(((trenchDistX - 13.2) / 6.8) * Math.PI);
    height += bf * 0.75;
  }

  // 4. Impact Crater Ridge behind engine cluster (z ~ 45..60)
  const dCrater = Math.hypot(x, z - 48);
  if (dCrater > 14 && dCrater < 28) {
    const rf = Math.sin(((dCrater - 14) / 14) * Math.PI);
    height += rf * 0.55;
  }

  // 5. STARBOARD EGRESS RAMP (Walkable transition directly out onto the planet)
  // Metal gangway runs from x = 6.6 to x = 15.2, z in [2.0, 14.0]
  const isEgressZone = x >= 6.5 && x <= 16.5 && z >= 2.0 && z <= 14.0;
  if (isEgressZone) {
    if (x < 14.2) {
      return -2.5; // Underneath the heavy steel loading ramp
    } else {
      // Smoothly rises to meet the ramp end (-0.28m) and connects to planetary surface
      const t = Math.min(1, Math.max(0, (x - 14.2) / 2.3));
      return (1 - t) * -0.28 + t * height;
    }
  }

  // 6. TOTAL SHIP INTERIOR VOID MASK (Strictly clear the entire ship volume down to -3.5m)
  // Guarantees zero terrain polygons can ever touch or pierce the metal ship deck (y = 0.02)
  if (z >= -56 && z <= 52) {
    let halfW = 11.2;
    if (z < -40) {
      const normZ = (-40 - z) / 16.0;
      if (normZ <= 1.0) {
        halfW = 11.2 * Math.sqrt(Math.max(0, 1.0 - normZ * normZ));
      } else {
        halfW = 0;
      }
    }

    const distFromCenter = Math.abs(x);
    if (distFromCenter <= halfW) {
      // 100% inside the ship interior
      return -3.5;
    } else if (distFromCenter < halfW + 2.4) {
      // Steep crash furrow wall immediately outside the hull
      const blend = (distFromCenter - halfW) / 2.4;
      return (1 - blend) * -3.5 + blend * height;
    }
  }

  return height;
}

// Module-level shared ship colliders from SpaceshipWreck model
const sharedShipColliders: { current: Aabb[] } = { current: [] };
const sharedPlayerPos: { current: THREE.Vector3 } = { current: new THREE.Vector3(PLAYER_SPAWN[0], PLAYER_SPAWN[1], PLAYER_SPAWN[2]) };

/**
 * Returns player walking height across both the procedural ship floor
 * (including the raised cargo bay mezzanine ramp/platform) and the
 * exterior alien planetary terrain.
 */
export function getWalkHeight(x: number, z: number, currentY = 1.5): number {
  const terrain = getTerrainHeight(x, z);
  // Inside ship hull tunnel (z between -40 and 40, |x| <= 10.6)
  const inHull = z >= -40 && z <= 40 && Math.abs(x) <= 10.6;
  // Inside cockpit dome (z between -54 and -40)
  const inCockpit =
    z < -40 &&
    z >= -54 &&
    Math.pow(x / 11.0, 2) + Math.pow((-40 - z) / 14.0, 2) <= 1.0;
  // On Starboard Egress Gangway Ramp (x between 6.5 and 15.5, z between 1.8 and 14.2)
  const onEgressRamp = x >= 6.5 && x <= 15.5 && z >= 1.8 && z <= 14.2;

  if (inHull || inCockpit || onEgressRamp) {
    const shipFloor = getShipFloorHeight(x, z, currentY);
    return Math.max(shipFloor, terrain);
  }
  return terrain;
}

// ============================================================
// WORLD OBSTACLES & COLLISION REGISTRY
// High-precision physical colliders for Stones, Wreckage & Crates
// ============================================================
export interface WorldObstacle {
  id: string;
  type: "stone" | "wreck" | "crate" | "beacon";
  name: string;
  description: string;
  x: number;
  z: number;
  radius: number;
  scale?: [number, number, number];
  rot?: [number, number, number];
  stoneStyle?: "monolith" | "breccia" | "slag";
  hasCrystal?: boolean;
  crystalColor?: string;
}

function buildWorldObstacles(): WorldObstacle[] {
  const list: WorldObstacle[] = [];
  const rng = createPRNG(809);

  // 1. Basalt Boulders, Megacryst Monoliths & Impact Rocks (55 obstacles)
  for (let i = 0; i < 55; i++) {
    const x = (rng() - 0.5) * 96;
    const z = (rng() - 0.5) * 96;

    // Keep ship footprint and immediate perimeter clear of boulders
    if (Math.abs(x) < 14.0 && z > -56 && z < 52) continue;
    // Clear the starboard egress ramp exit path
    if (x >= 6.0 && x <= 24.0 && z >= 0 && z <= 16) continue;

    const scaleX = 0.8 + rng() * 2.5;
    const scaleY = 0.6 + rng() * 3.4;
    const scaleZ = 0.8 + rng() * 2.5;
    const radius = Math.max(scaleX, scaleZ) * 0.95;

    let stoneStyle: "monolith" | "breccia" | "slag" = "breccia";
    let name = "Impactite Breccia Boulder";
    let description = "Shock-fused silicate chondrite formed during violent hypervelocity meteoric impact.";

    if (scaleY > 2.5) {
      stoneStyle = "monolith";
      name = "Basaltic Megacryst Monolith";
      description = "Towering column of dense volcanic obsidian and titano-magnetite with vitreous fracture surfaces.";
    } else if (radius < 1.3) {
      stoneStyle = "slag";
      name = "Carbonaceous Tectonic Slag";
      description = "Vesicular alien crust chunk rich in pyroxene, troilite, and metallic chondrules.";
    }

    const hasCrystal = rng() > 0.82;
    const crystalColor = rng() > 0.5 ? "#00f0ff" : "#f59e0b";

    list.push({
      id: `stone-${i}`,
      type: "stone",
      name,
      description,
      x,
      z,
      radius,
      scale: [scaleX, scaleY, scaleZ],
      rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
      stoneStyle,
      hasCrystal,
      crystalColor,
    });
  }

  // 2. Starship Key Points of Interest (Tactical HUD Target Scanner)
  list.push({
    id: "wreck-cockpit",
    type: "wreck",
    name: "Avionics Flight Deck & Cockpit Dome",
    description: "Reinforced forward command pod with shattered polarized viewports and navigational telemetry consoles.",
    x: 0,
    z: -44,
    radius: 6.0,
  });
  list.push({
    id: "wreck-corridor",
    type: "wreck",
    name: "Central Access Corridor & Quarters",
    description: "Main thoroughfare linking bridge and cargo decks, with damaged bulkheads and flickering conduits.",
    x: 0,
    z: -24,
    radius: 5.0,
  });
  list.push({
    id: "wreck-starboard-egress",
    type: "wreck",
    name: "Starboard Surface Egress Ramp (Planetary Access)",
    description: "Heavy cargo loading ramp leading out through the ruptured hull directly onto the alien planet surface.",
    x: 10.5,
    z: 8.0,
    radius: 5.5,
  });
  list.push({
    id: "wreck-breach-left",
    type: "wreck",
    name: "Port Hull Breach (Surface Egress)",
    description: "Shattered composite hull plating opening a walkable egress directly onto the alien regolith.",
    x: -11.0,
    z: -6,
    radius: 4.5,
  });
  list.push({
    id: "wreck-open-roof",
    type: "wreck",
    name: "Main Cargo Hold & Open Roof Breach",
    description: "Catastrophic ceiling fracture revealing Gargantua and celestial planets directly overhead.",
    x: 0,
    z: 5,
    radius: 9.0,
  });
  list.push({
    id: "wreck-mezzanine",
    type: "wreck",
    name: "Cargo Mezzanine Walkway",
    description: "Elevated catwalk platform accessible via the access ramp, overlooking the open cargo hold.",
    x: -7.5,
    z: 10,
    radius: 5.0,
  });
  list.push({
    id: "wreck-engines",
    type: "wreck",
    name: "Auxiliary Reactor Core & Engine Bay",
    description: "Heavy nuclear propulsion containment chamber with manual emergency power restoration lever.",
    x: 0,
    z: 32,
    radius: 6.5,
  });
  list.push({
    id: "wreck-nozzles",
    type: "wreck",
    name: "Stern Sublight Thruster Nozzles",
    description: "Triple magnetic plasma nozzles scorched by atmospheric burnup.",
    x: 0,
    z: 46,
    radius: 6.0,
  });

  // 3. Aerospace Cargo Canisters scattered outside the ship
  const rngDebris = createPRNG(902);
  for (let i = 0; i < 22; i++) {
    const x = (rngDebris() - 0.5) * 80;
    const z = (rngDebris() - 0.5) * 80;
    if (Math.abs(x) < 8.5 && z > -40 && z < 36) continue;
    const sizeX = 0.6 + rngDebris() * 1.5;
    const sizeZ = 0.6 + rngDebris() * 1.5;
    list.push({
      id: `crate-scattered-${i}`,
      type: "crate",
      name: "Jettisoned Cargo Canister",
      description: "Hermetically sealed storage capsule containing titanium alloy scrap and spare actuators.",
      x,
      z,
      radius: Math.max(sizeX, sizeZ) * 0.65,
    });
  }

  // 4. Damaged hanging high-voltage power conduits
  CABLE_CONFIGS.filter((c) => c.live).forEach((c) => {
    list.push({
      id: c.id,
      type: "wreck",
      name: "Damaged Power Conduit",
      description: "480V high-voltage starship feedline severed in breach. Intermittently arcing discharge.",
      x: c.end[0],
      z: c.end[2],
      radius: 0.8,
    });
  });

  return list;
}

export const WORLD_OBSTACLES = buildWorldObstacles();

// ============================================================
// PROCEDURAL ALIEN REGOLITH / BASALT PLANET TEXTURE
// ============================================================
function generateRegolithTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#121418";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 4) {
    const wave = Math.sin((y / size) * Math.PI * 22) + Math.cos((y / size) * Math.PI * 11);
    const alpha = 0.06 + wave * 0.03;
    ctx.fillStyle = wave > 0 ? `rgba(40, 46, 56, ${alpha})` : `rgba(10, 12, 16, ${alpha})`;
    ctx.fillRect(0, y, size, 4);
  }

  for (let i = 0; i < 40000; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const brightness = Math.random();
    const v = Math.floor(22 + brightness * 36);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(px, py, 1.2, 1.2);
  }

  for (let i = 0; i < 180; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const radius = 2 + Math.random() * 8;
    ctx.strokeStyle = "rgba(75, 85, 100, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(12, 14, 18, 0.6)";
    ctx.beginPath();
    ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  return texture;
}

function generateHeatShieldTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#181a1e";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#0d0e11";
  ctx.lineWidth = 2;
  const tileSize = 32;

  for (let y = 0; y < size + tileSize; y += tileSize * 0.866) {
    for (let x = 0; x < size + tileSize; x += tileSize) {
      const offsetX = (Math.floor(y / (tileSize * 0.866)) % 2) * (tileSize / 2);
      ctx.strokeRect(x + offsetX, y, tileSize * 0.9, tileSize * 0.9);
    }
  }

  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(45, 30, 20, 0.5)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

// ============================================================
// STEP 1: usePlayerControls Hook
// ============================================================
interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

function usePlayerControls() {
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          keys.current.sprint = true;
          break;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          keys.current.sprint = false;
          break;
      }
    }

    function onBlur() {
      keys.current.forward = false;
      keys.current.backward = false;
      keys.current.left = false;
      keys.current.right = false;
      keys.current.sprint = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return keys;
}

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _velocity = new THREE.Vector3();
let _stepBobTime = 0;
let _prevStepBob = 0;
let _wasColliding = false;
let _scanFrameCount = 0;

// ============================================================
// STEP 2: <Player /> First-Person Movement Engine with Full Physics
// Realistic Collision Deflection (Cannot cross stones or wreck),
// Smooth 3D Terrain Height Following, Procedural Footsteps & Scanner
// ============================================================
export const playerInputLocked = { current: false };

interface PlayerProps {
  isLocked: boolean;
  inputLocked?: boolean;
  flashlight: boolean;
  setFlashlight: React.Dispatch<React.SetStateAction<boolean>>;
  triggerPing: () => void;
  setTargetInfo: React.Dispatch<React.SetStateAction<any>>;
}

function Player({
  isLocked,
  inputLocked = false,
  flashlight,
  setFlashlight,
  triggerPing,
  setTargetInfo,
}: PlayerProps) {
  const { camera } = useThree();
  const keys = usePlayerControls();
  const lastValidForward = useRef(new THREE.Vector3(0, 0, -1));
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const spotTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  // Spawn inside the crashed spaceship interior, looking toward the open roof breach
  useEffect(() => {
    camera.position.set(PLAYER_SPAWN[0], PLAYER_SPAWN[1], PLAYER_SPAWN[2]);
    camera.lookAt(0, 2.2, -18);
  }, [camera]);

  // Zero velocity on pause/unlock
  useEffect(() => {
    if (!isLocked) {
      _velocity.set(0, 0, 0);
      setTargetInfo(null);
    }
  }, [isLocked, setTargetInfo]);

  // Tactical Keybindings: Flashlight (T) & Planetary Sonar Ping (E/F)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isLocked) return;
      if (e.code === "KeyT" || e.code === "KeyL") {
        setFlashlight((f) => {
          playInteraction("flashlight");
          return !f;
        });
      }
      if (e.code === "KeyE" || e.code === "KeyF") {
        triggerPing();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLocked, triggerPing, setFlashlight]);

  useFrame((_, delta) => {
    if (!isLocked) return;

    const k = keys.current;

    camera.getWorldDirection(_forward);
    _forward.y = 0;

    if (_forward.lengthSq() < 0.0001) {
      _forward.copy(lastValidForward.current);
    } else {
      _forward.normalize();
      lastValidForward.current.copy(_forward);
    }

    const isInputBlocked = inputLocked || playerInputLocked.current;

    _right.crossVectors(_forward, camera.up).normalize();

    _direction.set(0, 0, 0);
    if (!isInputBlocked) {
      _direction.addScaledVector(_forward, (k.forward ? 1 : 0) - (k.backward ? 1 : 0));
      _direction.addScaledVector(_right, (k.right ? 1 : 0) - (k.left ? 1 : 0));

      if (_direction.lengthSq() > 0) {
        _direction.normalize();
      }
    }

    const currentSpeed = k.sprint ? RUN_SPEED : WALK_SPEED;
    const lerpRatio = 1 - Math.exp(-DAMPING * delta);
    _velocity.lerp(_direction.multiplyScalar(currentSpeed), lerpRatio);

    // 1. HORIZONTAL DISPLACEMENT INTEGRATION
    camera.position.x += _velocity.x * delta;
    camera.position.z += _velocity.z * delta;

    // 2. HARD PHYSICAL COLLISION RESOLUTION
    // A) Procedural Ship Collision (closed hull walls, open roof breaches, dome, and props)
    if (sharedShipColliders.current && sharedShipColliders.current.length > 0) {
      resolveShipCollisions(camera.position, sharedShipColliders.current, 0.4);
    }

    // B) Exterior Basalt Boulders & Monoliths (Cannot walk through stones)
    let collided = false;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < WORLD_OBSTACLES.length; i++) {
        const obs = WORLD_OBSTACLES[i];
        if (obs.type !== "stone") continue;
        const dx = camera.position.x - obs.x;
        const dz = camera.position.z - obs.z;
        const distSq = dx * dx + dz * dz;
        const minDist = obs.radius + PLAYER_RADIUS;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const overlap = minDist - dist;
            const normX = dx / dist;
            const normZ = dz / dist;

            // Push player out along contact normal
            camera.position.x += normX * overlap;
            camera.position.z += normZ * overlap;

            // Cancel inward velocity component along normal so player smoothly slides along perimeter
            const dot = _velocity.x * normX + _velocity.z * normZ;
            if (dot < 0) {
              _velocity.x -= dot * normX;
              _velocity.z -= dot * normZ;
              collided = true;
            }
          }
        }
      }
    }

    if (collided && !_wasColliding) {
      soundEngine.playCollision();
    }
    _wasColliding = collided;

    // 3. BOUNDARY CLAMPING
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -WORLD_BOUNDS, WORLD_BOUNDS);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -WORLD_BOUNDS, WORLD_BOUNDS);

    // 4. SMOOTH CONTINUOUS TERRAIN FOLLOWING & HEAD BOB
    const groundY = getWalkHeight(camera.position.x, camera.position.z, camera.position.y);
    const targetEyeY = groundY + EYE_HEIGHT;

    if (HEAD_BOB) {
      const horizontalSpeed = Math.hypot(_velocity.x, _velocity.z);
      if (horizontalSpeed > 0.15) {
        _stepBobTime += delta * horizontalSpeed * 1.85;
        const bobSin = Math.sin(_stepBobTime * 2.2);
        camera.position.y = targetEyeY + bobSin * 0.045;

        // Trigger step sound at footstep trough
        if (bobSin < -0.85 && _prevStepBob >= -0.85) {
          notifyFootstep({
            speed: horizontalSpeed,
            sprinting: k.sprint,
            surface: surfaceAt(camera.position),
          });
        }
        _prevStepBob = bobSin;
      } else {
        _stepBobTime *= Math.exp(-8 * delta);
        camera.position.y = targetEyeY + Math.sin(_stepBobTime * 2.2) * 0.045;
        _prevStepBob = 0;
      }
    } else {
      camera.position.y = targetEyeY;
    }

    sharedPlayerPos.current.copy(camera.position);

    // 5. UPDATE FLASHLIGHT SPOTLIGHT ORIENTATION
    if (spotLightRef.current && spotTargetRef.current) {
      spotLightRef.current.position.copy(camera.position);
      camera.getWorldDirection(_camFwd);
      spotTargetRef.current.position.copy(camera.position).addScaledVector(_camFwd, 16);
      spotLightRef.current.target = spotTargetRef.current;
    }

    // 6. TACTICAL TARGET SCANNER RAY (Updated every 6 frames for peak 120 FPS performance)
    _scanFrameCount++;
    if (_scanFrameCount % 6 === 0) {
      let closest: WorldObstacle | null = null;
      let closestDist = 14.0;

      for (let i = 0; i < WORLD_OBSTACLES.length; i++) {
        const obs = WORLD_OBSTACLES[i];
        const dx = obs.x - camera.position.x;
        const dz = obs.z - camera.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < closestDist) {
          const dirX = dx / dist;
          const dirZ = dz / dist;
          const dot = dirX * _forward.x + dirZ * _forward.z;
          if (dot > 0.62) {
            closestDist = dist;
            closest = obs;
          }
        }
      }

      if (closest) {
        setTargetInfo({
          name: closest.name,
          type: closest.type,
          distance: closestDist.toFixed(1),
          description: closest.description,
        });
      } else {
        setTargetInfo(null);
      }
    }
  });

  return (
    <>
      {/* Tactical Flashlight Spotlight */}
      {flashlight && (
        <>
          <spotLight
            ref={spotLightRef}
            color="#f8fafc"
            intensity={18}
            distance={55}
            angle={0.52}
            penumbra={0.55}
            castShadow
            shadow-mapSize={[512, 512]}
          />
          <primitive object={spotTargetRef.current} />
        </>
      )}
    </>
  );
}

// ============================================================
// GENERAL RELATIVITY BLACK HOLE SHADER ENGINE
// Fullscreen raymarching with Keplerian turbulence, relativistic
// Doppler beaming, gravitational lensing of stars, bloom & tone mapping
// ============================================================

const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const SCENE_FRAG_SRC = `
precision highp float;

#define MAX_STEPS 300
#define WIND_CYCLE 46.0

varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uRight;
uniform vec3  uUp;
uniform vec3  uFwd;
uniform float uTanHalf;
uniform float uSteps;
uniform float uSkyR;
uniform float uDiskIn;
uniform float uDiskOut;
uniform float uThick;
uniform float uDensity;
uniform float uSpin;
uniform float uGrain;
uniform float uBright;
uniform float uDoppler;
uniform vec3  uHot;
uniform vec3  uMid;
uniform vec3  uCool;
uniform float uStars;
uniform float uEncode;
uniform vec2  uJitter;
uniform float uSeed;

float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

float fbm(vec3 p, float lod) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    s += (i == 3 ? a * lod : a) * vnoise(p);
    p = p * 2.03 + vec3(11.3, 7.1, 3.7);
    a *= 0.5;
  }
  return s;
}

void gasAt(vec3 p, float rd, float dt, out float dens, out vec3 tint, out float heat) {
  float rn = clamp((rd - uDiskIn) / max(0.001, uDiskOut - uDiskIn), 0.0, 1.0);
  float tk = uThick * (0.35 + 1.25 * rn);
  float v = p.y / tk;
  float sheet = exp(-v * v);

  float lod = clamp(1.0 - dt * uGrain * 14.0, 0.0, 1.0);
  float phi = atan(p.z, p.x);
  float omega = uSpin * pow(uDiskIn / rd, 1.5);
  float lr = log(rd) * 1.1 + uSpin * uTime * 0.05;

  float u = uTime / WIND_CYCLE;
  float fA = fract(u);
  float fB = fract(u + 0.5);
  float w = abs(2.0 * fA - 1.0);

  float cloudsA = fbm(vec3(vec2(cos(phi + omega * fA * WIND_CYCLE),
                                sin(phi + omega * fA * WIND_CYCLE)) * (rd * uGrain), lr), lod);
  float cloudsB = fbm(vec3(vec2(cos(phi + omega * fB * WIND_CYCLE),
                                sin(phi + omega * fB * WIND_CYCLE)) * (rd * uGrain), lr + 40.0), lod);
  float clouds = mix(cloudsA, cloudsB, w);
  float filaments = clouds * clouds * 1.75;

  float inner = smoothstep(0.0, 0.07, rn);
  float outer = 1.0 - smoothstep(0.45, 1.0, rn);
  float prof = inner * outer * pow(uDiskIn / rd, 2.0);

  dens = max(0.0, filaments * 1.5 - 0.30) * sheet * prof * uDensity * 4.6;
  heat = pow(uDiskIn / rd, 0.8) * (0.72 + 0.55 * clouds);
  tint = mix(uCool, uMid, smoothstep(0.10, 0.52, heat));
  tint = mix(tint, uHot, smoothstep(0.52, 1.05, heat));
}

vec3 starField(vec3 d) {
  vec3 a = abs(d);
  vec2 uv;
  float face;
  if (a.x >= a.y && a.x >= a.z)      { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
  else if (a.y >= a.z)               { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
  else                               { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }

  vec3 col = vec3(0.0);

  // 1. VERY SMALL, FAINT, REALISTIC RED INTERSTELLAR DUST WISPS (95%+ pure pitch black)
  // Deep space hydrogen-alpha emission wisps — subtle and localized
  float n1 = fbm(d * 2.2 + vec3(3.4, 1.2, 5.8), 1.0);
  float n2 = fbm(d * 4.4 + vec3(8.1, 4.3, 2.7), 1.0);
  float wisp = smoothstep(0.72, 0.88, n1) * smoothstep(0.42, 0.85, n2);
  vec3 hAlphaRed = vec3(0.42, 0.04, 0.07); // Realistic deep H-alpha astronomical red
  col += hAlphaRed * wisp * 0.28;

  // 2. MULTI-COLORED REALISTIC STARFIELD (Mostly White, Some Very Bright with Glints)
  for (int k = 0; k < 4; k++) {
    float sc = 70.0 * pow(2.15, float(k));
    vec2 p = uv * sc;
    vec2 id = floor(p);
    vec2 f = fract(p) - 0.5;
    float h = hash13(vec3(id, face * 19.0));

    if (h > 0.950) {
      vec2 off = vec2(hash13(vec3(id, face + 11.0)), hash13(vec3(id, face + 23.0)));
      vec2 dxy = f - (off - 0.5) * 0.72;
      float dd = length(dxy);

      // Star nucleus core
      float s = smoothstep(0.060, 0.0, dd);
      // Soft glowing corona
      float glow = smoothstep(0.32, 0.0, dd) * 0.35;

      // Color distribution: Mostly brilliant white (~70%), with warm gold, electric cyan, ruby red
      float colH = hash13(vec3(id, face + 47.0));
      vec3 starColor = vec3(1.0, 1.0, 1.0); // Pure white default

      if (colH < 0.70) {
        // ~70%: Pure brilliant white & diamond silver
        starColor = mix(vec3(0.94, 0.97, 1.0), vec3(1.0, 1.0, 1.0), colH / 0.70);
      } else if (colH < 0.82) {
        // ~12%: Warm solar gold & amber (G-type stars)
        starColor = mix(vec3(1.0, 0.90, 0.68), vec3(1.0, 0.72, 0.35), (colH - 0.70) / 0.12);
      } else if (colH < 0.92) {
        // ~10%: Hot electric azure / cyan blue giants (O/B-type stars)
        starColor = mix(vec3(0.68, 0.85, 1.0), vec3(0.48, 0.75, 1.0), (colH - 0.82) / 0.10);
      } else if (colH < 0.97) {
        // ~5%: Deep ruby / red supergiant embers (M-type stars)
        starColor = mix(vec3(1.0, 0.45, 0.35), vec3(1.0, 0.28, 0.20), (colH - 0.92) / 0.05);
      } else {
        // ~3%: Exotic jewel star
        starColor = vec3(0.78, 0.68, 1.0);
      }

      // Brightness: mostly natural field stars, with top stars being VERY BRIGHT!
      float crossSpike = 0.0;
      float brightMult = 0.8 + 3.2 * fract(h * 67.0);

      // Top 1.5% landmark stars are dazzlingly bright with 4-point cross diffraction spikes
      if (h > 0.985 && k <= 1) {
        brightMult = 7.0 + 8.5 * fract(h * 93.0); // Very bright!
        vec2 ad = abs(dxy);
        float horiz = smoothstep(0.42, 0.0, ad.x) * smoothstep(0.014, 0.0, ad.y);
        float vert = smoothstep(0.42, 0.0, ad.y) * smoothstep(0.014, 0.0, ad.x);
        float longStreak = smoothstep(0.80, 0.0, ad.x) * smoothstep(0.007, 0.0, ad.y) * 1.6;
        crossSpike = (horiz + vert + longStreak) * 3.2;
      }

      col += (s * brightMult + glow * (brightMult * 0.25) + crossSpike) * starColor / pow(2.0, float(k));
    }
  }

  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy + uJitter - 0.5 * uRes) / uRes.y;
  vec3 dir = normalize(uFwd + (uv.x * uRight + uv.y * uUp) * 2.0 * uTanHalf);

  vec3 pos = uCamPos;
  vec3 vel = dir;

  vec3 hv = cross(pos, vel);
  float h2 = dot(hv, hv);
  float h = sqrt(h2);
  float swept = 0.0;

  vec3 col = vec3(0.0);
  float transmit = 1.0;
  bool captured = false;
  bool escaped = false;

  // Exact General Relativity critical impact parameter for Schwarzschild shadow:
  // b_c^2 = 27/4 = 6.75. Any ray with h2 <= 6.75 aimed towards the hole plunges into the singularity.
  float dirDotHole = dot(dir, normalize(-uCamPos));
  bool inShadowCone = (h2 <= 6.85 && dirDotHole > 0.0);

  float jitter = fract(sin(dot(gl_FragCoord.xy + uSeed, vec2(12.9898, 78.233))) * 43758.5453);

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= uSteps) break;

    float r2 = dot(pos, pos);
    float r = sqrt(r2);

    // Event horizon threshold: captured by the singularity
    if (r <= 1.05) { captured = true; break; }
    // Escaped to celestial infinity
    if (r > uSkyR && dot(pos, vel) > 0.0) { escaped = true; break; }
    if (transmit < 0.004) break;

    float dt = clamp(0.14 * (r - 1.0), 0.025, 1.1);

    if (r < uDiskOut * 1.25) {
      float rn = clamp((r - uDiskIn) / max(0.001, uDiskOut - uDiskIn), 0.0, 1.0);
      float tk = uThick * (0.35 + 1.25 * rn);
      dt = min(dt, max(tk * 0.38, abs(pos.y) * 0.5));
    }

    swept += h * dt / r2;
    float deep = exp(-1.3 * max(0.0, swept - 4.6));

    jitter = fract(jitter + 0.6180339887);
    vec3 mid = pos + vel * (dt * jitter);
    float rd = length(mid.xz);

    if (rd > uDiskIn && rd < uDiskOut && abs(mid.y) < uThick * 5.0) {
      float dens;
      float heat;
      vec3 tint;
      gasAt(mid, rd, dt, dens, tint, heat);

      if (dens > 0.001) {
        vec3 tang = normalize(cross(vec3(0.0, 1.0, 0.0), vec3(mid.x, 0.0, mid.z)));
        float beta = min(0.85, sqrt(0.5 / max(rd, 1.5)));
        float gam = inversesqrt(max(1e-4, 1.0 - beta * beta));
        vec3 toObs = -normalize(vel);
        float g = 1.0 / (gam * (1.0 - beta * dot(tang, toObs)));
        g *= sqrt(max(0.05, 1.0 - 1.0 / rd));
        float boost = pow(max(g, 0.02), 3.0 * uDoppler);

        vec3 shift = mix(
          vec3(1.0),
          g > 1.0 ? vec3(0.86, 0.94, 1.14) : vec3(1.15, 0.82, 0.62),
          clamp(abs(g - 1.0) * 1.6, 0.0, 1.0) * uDoppler
        );

        float emit = uBright * (0.26 + 2.0 * heat * heat);
        col += tint * shift * (emit * boost * dens * transmit * dt * deep);
        transmit *= exp(-dens * 0.30 * dt);
      }
    }

    vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
    vel += acc * dt;
    pos += vel * dt;
  }

  // Pure Event Horizon Shadow:
  // If the ray did not cleanly escape to outer space, it was captured by the hole.
  // Absolutely NO stars or haze can ever appear inside or behind the black hole!
  if (!escaped || inShadowCone) {
    captured = true;
  }

  if (escaped && !captured && uStars > 0.001) {
    vec3 toHole = normalize(-uCamPos);
    float sI = length(cross(normalize(dir), toHole));
    float sS = length(cross(normalize(vel), toHole));
    float stretch = clamp(sI / max(1e-3, sS), 1.0, 40.0);
    col += starField(normalize(vel)) * uStars * transmit / stretch;
  }

  if (uEncode > 0.5) col = col / (1.0 + col);
  gl_FragColor = vec4(col, 1.0);
}
`;

const BLEND_FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uCur;
uniform sampler2D uPrev;
uniform float uAlpha;

void main() {
  vec3 c = texture2D(uCur, vUv).rgb;
  vec3 p = texture2D(uPrev, vUv).rgb;
  gl_FragColor = vec4(mix(p, c, uAlpha), 1.0);
}
`;

const COMPOSITE_FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform float uDecode;
uniform float uExposure;

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 scene = texture2D(uScene, vUv).rgb;
  if (uDecode > 0.5) scene = scene / max(vec3(0.002), 1.0 - scene);
  vec3 c = aces(scene * uExposure);
  c = pow(max(c, 0.0), vec3(0.4545));
  gl_FragColor = vec4(c, 1.0);
}
`;

// Shared reference to camera direction data (written by R3F each frame, read by the BlackHole renderer)
const sharedSkyCamera = {
  fwd: new THREE.Vector3(0, 0, -1),
  right: new THREE.Vector3(1, 0, 0),
  up: new THREE.Vector3(0, 1, 0),
  tanHalf: 0.65,
  hasChanged: true,
};

// Component inside R3F that updates the shared camera orientation every frame
function CameraSync() {
  const { camera } = useThree();

  useFrame(() => {
    // 1. Get current Three.js first-person camera orientation
    camera.getWorldDirection(_camFwd);
    _camRight.crossVectors(_camFwd, camera.up).normalize();
    _camUp.crossVectors(_camRight, _camFwd).normalize();

    // 2. Rotate into the Black Hole's celestial frame
    _sFwd.copy(_camFwd).applyQuaternion(Q_ALIGN_SKY);
    _sRight.copy(_camRight).applyQuaternion(Q_ALIGN_SKY);
    _sUp.copy(_camUp).applyQuaternion(Q_ALIGN_SKY);

    // Track if camera view orientation changed significantly
    if (
      Math.abs(sharedSkyCamera.fwd.x - _sFwd.x) > 0.0003 ||
      Math.abs(sharedSkyCamera.fwd.y - _sFwd.y) > 0.0003 ||
      Math.abs(sharedSkyCamera.fwd.z - _sFwd.z) > 0.0003
    ) {
      sharedSkyCamera.hasChanged = true;
    }

    // 3. Write to shared object
    sharedSkyCamera.fwd.copy(_sFwd);
    sharedSkyCamera.right.copy(_sRight);
    sharedSkyCamera.up.copy(_sUp);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 75;
    sharedSkyCamera.tanHalf = Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
  });

  return null;
}

// Fullscreen WebGL General Relativity Black Hole Sky Hook
function useFullscreenBlackHoleSky() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" }) ||
      canvas.getContext("webgl", { alpha: false, antialias: false })) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null;

    if (!gl) return;

    function compile(type: number, src: string) {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        console.error("BlackHole shader compile error:", gl!.getShaderInfoLog(sh));
      }
      return sh;
    }

    function link(fragSrc: string) {
      const vs = compile(gl!.VERTEX_SHADER, VERT_SRC);
      const fs = compile(gl!.FRAGMENT_SHADER, fragSrc);
      const prog = gl!.createProgram()!;
      gl!.attachShader(prog, vs);
      gl!.attachShader(prog, fs);
      gl!.bindAttribLocation(prog, 0, "aPos");
      gl!.linkProgram(prog);
      gl!.deleteShader(vs);
      gl!.deleteShader(fs);
      const u: Record<string, WebGLUniformLocation | null> = {};
      const n = gl!.getProgramParameter(prog, gl!.ACTIVE_UNIFORMS) as number;
      for (let i = 0; i < n; i++) {
        const info = gl!.getActiveUniform(prog, i);
        if (info) u[info.name] = gl!.getUniformLocation(prog, info.name);
      }
      return { prog, u };
    }

    const sceneProg = link(SCENE_FRAG_SRC);
    const blendProg = link(BLEND_FRAG_SRC);
    const compProg = link(COMPOSITE_FRAG_SRC);

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    // Render targets for temporal accumulation
    interface Target { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number; }

    function makeTarget(w: number, h: number): Target | null {
      const tex = gl!.createTexture()!;
      const fb = gl!.createFramebuffer()!;
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fb);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      return { fb, tex, w, h };
    }

    let targetA: Target | null = null;
    let targetB: Target | null = null;
    let sceneTarget: Target | null = null;

    let width = 0;
    let height = 0;
    let sceneW = 0;
    let sceneH = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const scale = 0.82; // High-definition render scale for razor-sharp accretion disk filaments
      const w = Math.round(cssW * dpr);
      const h = Math.round(cssH * dpr);
      const sw = Math.round(w * scale);
      const sh = Math.round(h * scale);

      if (w === width && h === height) return;
      width = w; height = h; sceneW = sw; sceneH = sh;
      canvas!.width = w; canvas!.height = h;

      if (targetA) { gl!.deleteTexture(targetA.tex); gl!.deleteFramebuffer(targetA.fb); }
      if (targetB) { gl!.deleteTexture(targetB.tex); gl!.deleteFramebuffer(targetB.fb); }
      if (sceneTarget) { gl!.deleteTexture(sceneTarget.tex); gl!.deleteFramebuffer(sceneTarget.fb); }

      sceneTarget = makeTarget(sw, sh);
      targetA = makeTarget(sw, sh);
      targetB = makeTarget(sw, sh);
    }

    resize();
    window.addEventListener("resize", resize);

    let rafId = 0;
    let clock = 0;
    let lastTime = performance.now();
    let settled = 0;

    const HALTON: Array<[number, number]> = [
      [0.5, 0.333], [0.25, 0.667], [0.75, 0.111], [0.125, 0.444],
      [0.625, 0.778], [0.375, 0.222], [0.875, 0.556], [0.0625, 0.889],
    ];

    function loop(now: number) {
      rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      clock += dt;

      if (!sceneTarget || !targetA || !targetB) return;

      // 1. SCENE RAYMARCH PASS
      gl!.useProgram(sceneProg.prog);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, sceneTarget.fb);
      gl!.viewport(0, 0, sceneW, sceneH);

      const u = sceneProg.u;
      gl!.uniform2f(u.uRes!, sceneW, sceneH);
      gl!.uniform1f(u.uTime!, clock);
      gl!.uniform3f(u.uCamPos!, BH_SHADER_CAM_POS.x, BH_SHADER_CAM_POS.y, BH_SHADER_CAM_POS.z);

      // Driven in real-time by the Three.js first-person camera!
      gl!.uniform3f(u.uFwd!, sharedSkyCamera.fwd.x, sharedSkyCamera.fwd.y, sharedSkyCamera.fwd.z);
      gl!.uniform3f(u.uRight!, sharedSkyCamera.right.x, sharedSkyCamera.right.y, sharedSkyCamera.right.z);
      gl!.uniform3f(u.uUp!, sharedSkyCamera.up.x, sharedSkyCamera.up.y, sharedSkyCamera.up.z);
      gl!.uniform1f(u.uTanHalf!, sharedSkyCamera.tanHalf);

      gl!.uniform1f(u.uSteps!, 240.0);
      gl!.uniform1f(u.uSkyR!, 45.0);
      gl!.uniform1f(u.uDiskIn!, 3.0);
      gl!.uniform1f(u.uDiskOut!, 15.0);
      gl!.uniform1f(u.uThick!, 0.28);
      gl!.uniform1f(u.uDensity!, 1.15);
      gl!.uniform1f(u.uSpin!, 0.075 * Math.PI * 2);
      gl!.uniform1f(u.uGrain!, 0.52);
      gl!.uniform1f(u.uBright!, 1.45);
      gl!.uniform1f(u.uDoppler!, 0.38);
      gl!.uniform3f(u.uHot!, 1.0, 0.98, 0.92); // Blinding white-hot inner rim
      gl!.uniform3f(u.uMid!, 1.0, 0.65, 0.22); // Majestic warm solar gold / amber accretion disk
      gl!.uniform3f(u.uCool!, 0.55, 0.22, 0.04); // Deep warm fiery orange outer gas
      gl!.uniform1f(u.uStars!, 1.0); // 3D gravitationally lensed stars
      gl!.uniform1f(u.uEncode!, 1.0);

      const h = HALTON[settled % HALTON.length];
      gl!.uniform2f(u.uJitter!, h[0] - 0.5, h[1] - 0.5);
      gl!.uniform1f(u.uSeed!, (settled % 64) * 17.13);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      // 2. TEMPORAL ACCUMULATION PASS
      // Uses 0.90 during active camera look to prevent ghosting, 0.40 when stationary for silky AA
      const alpha = sharedSkyCamera.hasChanged ? 0.90 : 0.40;
      sharedSkyCamera.hasChanged = false;

      gl!.useProgram(blendProg.prog);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, targetB.fb);
      gl!.viewport(0, 0, sceneW, sceneH);

      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, sceneTarget.tex);
      gl!.uniform1i(blendProg.u.uCur!, 0);

      gl!.activeTexture(gl!.TEXTURE1);
      gl!.bindTexture(gl!.TEXTURE_2D, targetA.tex);
      gl!.uniform1i(blendProg.u.uPrev!, 1);

      gl!.uniform1f(blendProg.u.uAlpha!, alpha);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      // Swap history targets
      const tmp = targetA;
      targetA = targetB;
      targetB = tmp;
      settled++;

      // 3. FULLSCREEN COMPOSITE PASS
      gl!.useProgram(compProg.prog);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, width, height);

      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, targetA.tex);
      gl!.uniform1i(compProg.u.uScene!, 0);
      gl!.uniform1f(compProg.u.uDecode!, 1.0);
      gl!.uniform1f(compProg.u.uExposure!, 1.05);

      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      if (vbo) gl.deleteBuffer(vbo);
      if (sceneTarget) { gl.deleteTexture(sceneTarget.tex); gl.deleteFramebuffer(sceneTarget.fb); }
      if (targetA) { gl.deleteTexture(targetA.tex); gl.deleteFramebuffer(targetA.fb); }
      if (targetB) { gl.deleteTexture(targetB.tex); gl.deleteFramebuffer(targetB.fb); }
      gl.deleteProgram(sceneProg.prog);
      gl.deleteProgram(blendProg.prog);
      gl.deleteProgram(compProg.prog);
    };
  }, []);

  return canvasRef;
}

// ============================================================
// CELESTIAL SKY: SHOOTING STARS (CRIMSON DRIFT SKY)
// Fast, elegant, incandescent shooting stars darting across
// the deep crimson/ruby night sky
// ============================================================

const SHOOTING_STAR_COUNT = 4;
const SHOOTING_STAR_POINTS = 16;
const _headPos = new THREE.Vector3();

interface ShootingStarSim {
  active: boolean;
  progress: number;
  duration: number;
  delayTimer: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  geo: THREE.BufferGeometry;
  line: THREE.Line;
  headMesh: THREE.Mesh;
}

function ShootingStars() {
  const rng = useMemo(() => createPRNG(431), []);
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<ShootingStarSim[]>([]);

  // Function to randomize a shooting star trajectory high in the sky dome
  const resetStar = useCallback((s: ShootingStarSim, initialDelay = false) => {
    // Pick a point on the upper celestial sphere (radius ~90 - 110, high Y)
    const az = rng() * Math.PI * 2.0;
    const el = 0.38 + rng() * 0.45; // 22 to 48 degrees elevation
    const dist = 95.0 + rng() * 18.0;

    const sx = Math.cos(az) * Math.cos(el) * dist;
    const sy = Math.sin(el) * dist;
    const sz = Math.sin(az) * Math.cos(el) * dist;

    // Streaking direction: tangential across the sky with slight downward tilt
    const streakLength = 22.0 + rng() * 16.0;
    const streakAngle = rng() * Math.PI * 2.0;

    const normStart = new THREE.Vector3(sx, sy, sz).normalize();
    const up = Math.abs(normStart.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(normStart, up).normalize();
    const forward = new THREE.Vector3().crossVectors(right, normStart).normalize();

    const streakDir = new THREE.Vector3()
      .addScaledVector(right, Math.cos(streakAngle))
      .addScaledVector(forward, Math.sin(streakAngle))
      .addScaledVector(normStart, -0.18) // Gentle inward tilt
      .normalize();

    s.startPos.set(sx, sy, sz);
    s.endPos.copy(s.startPos).addScaledVector(streakDir, streakLength);
    s.dir.copy(streakDir);
    s.length = streakLength;

    s.duration = 0.55 + rng() * 0.35; // 0.55 to 0.90 seconds streak
    s.progress = 0;
    s.active = !initialDelay;
    s.delayTimer = initialDelay ? 0.4 + rng() * 3.8 : 0;

    if (s.line) s.line.visible = s.active;
    if (s.headMesh) s.headMesh.visible = s.active;
  }, [rng]);

  useEffect(() => {
    const parentGroup = groupRef.current;
    if (!parentGroup) return;

    const list: ShootingStarSim[] = [];

    for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
      const positions = new Float32Array(SHOOTING_STAR_POINTS * 3);
      const colors = new Float32Array(SHOOTING_STAR_POINTS * 3);

      // Color gradient along shooting star:
      // Head (index 0): White hot -> bright solar gold -> warm amber -> transparent
      for (let j = 0; j < SHOOTING_STAR_POINTS; j++) {
        const t = j / (SHOOTING_STAR_POINTS - 1);
        let r = 1.0, g = 1.0, b = 1.0;
        if (t < 0.15) {
          r = 1.0; g = 1.0; b = 1.0; // Incandescent white
        } else if (t < 0.5) {
          const f = (t - 0.15) / 0.35;
          r = 1.0; g = 0.95 - f * 0.25; b = 0.85 - f * 0.55; // White to solar gold
        } else {
          const f = (t - 0.5) / 0.5;
          const a = Math.max(0, 1.0 - f);
          r = (1.0 - f * 0.25) * a;
          g = (0.7 - f * 0.55) * a;
          b = (0.3 - f * 0.28) * a; // Fading warm amber
        }
        colors[j * 3 + 0] = r;
        colors[j * 3 + 1] = g;
        colors[j * 3 + 2] = b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const line = new THREE.Line(geo, mat);
      line.visible = false;
      parentGroup.add(line);

      // Incandescent glowing star head
      const headMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 10, 10),
        new THREE.MeshBasicMaterial({ color: "#ffffff" })
      );
      headMesh.visible = false;
      parentGroup.add(headMesh);

      const sim: ShootingStarSim = {
        active: false,
        progress: 0,
        duration: 0.7,
        delayTimer: 0,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        dir: new THREE.Vector3(),
        length: 22,
        geo,
        line,
        headMesh,
      };

      resetStar(sim, true); // Stagger initial starts
      list.push(sim);
    }

    starsRef.current = list;

    return () => {
      list.forEach((s) => {
        s.geo.dispose();
        parentGroup.remove(s.line);
        parentGroup.remove(s.headMesh);
      });
      starsRef.current = [];
    };
  }, [resetStar]);

  useFrame((_, delta) => {
    const list = starsRef.current;
    if (!list || list.length === 0) return;

    for (let i = 0; i < list.length; i++) {
      const s = list[i];

      if (!s.active) {
        s.delayTimer -= delta;
        if (s.delayTimer <= 0) {
          resetStar(s, false);
          s.line.visible = true;
          s.headMesh.visible = true;
        }
        continue;
      }

      s.progress += delta / s.duration;

      if (s.progress >= 1.0) {
        s.active = false;
        s.line.visible = false;
        s.headMesh.visible = false;
        s.delayTimer = 1.0 + rng() * 3.0; // Delay before this shooting star triggers again
        continue;
      }

      // Smooth opacity envelope: quick fade-in, peak blaze, smooth fade-out
      const p = s.progress;
      let alpha = 1.0;
      if (p < 0.18) {
        alpha = p / 0.18;
      } else if (p > 0.65) {
        alpha = Math.max(0, 1.0 - (p - 0.65) / 0.35);
      }
      (s.line.material as THREE.LineBasicMaterial).opacity = alpha * 0.95;

      // Update positions along streak
      const posAttr = s.geo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      // Current head position along startPos -> endPos
      _headPos.lerpVectors(s.startPos, s.endPos, p);
      s.headMesh.position.copy(_headPos);
      s.headMesh.scale.setScalar(alpha);

      const tailLength = s.length * 0.42;

      for (let j = 0; j < SHOOTING_STAR_POINTS; j++) {
        const segDist = (j / (SHOOTING_STAR_POINTS - 1)) * tailLength;
        const px = _headPos.x - s.dir.x * segDist;
        const py = _headPos.y - s.dir.y * segDist;
        const pz = _headPos.z - s.dir.z * segDist;

        arr[j * 3 + 0] = px;
        arr[j * 3 + 1] = py;
        arr[j * 3 + 2] = pz;
      }
      posAttr.needsUpdate = true;
    }
  });

  return <group ref={groupRef} />;
}

// ============================================================
// HIGH-FIDELITY CELESTIAL PLANETARY SYSTEM (Opposite Sky)
// 1. Kronos Prime: Massive Ringed Gas Giant with rotating Great Storm Spot
// 2. Ignis-IV: Shattered Tectonic Magma Moon with glowing volcanic lava fissures
// 3. Glacies: Crystalline Ocean & Ice World with rotating storm cyclones
// Pinned to camera position so player movement on ground never alters size!
// ============================================================

function generateGasGiantTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Base deep indigo/azure background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  // Smooth harmonic cloud bands across latitude (Y) with longitudinal turbulence (X)
  for (let y = 0; y < height; y += 2) {
    const lat = (y / height) * Math.PI; // 0 (North Pole) to PI (South Pole)
    const bandFreq = Math.sin(lat * 14.0) + Math.cos(lat * 26.0) * 0.45;

    // Palette: cream, warm ochre, amber, terracotta, cobalt, deep navy
    let r = 30, g = 58, b = 138;
    if (bandFreq > 0.7) {
      // Warm amber / terracotta storm belt
      r = 217; g = 119; b = 30;
    } else if (bandFreq > 0.2) {
      // Golden ochre
      r = 180; g = 140; b = 75;
    } else if (bandFreq > -0.3) {
      // Pearlescent cream / cyan haze
      r = 200; g = 220; b = 240;
    } else if (bandFreq > -0.7) {
      // Azure belt
      r = 2; g = 132; b = 199;
    } else {
      // Deep polar navy
      r = 15; g = 23; b = 42;
    }

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, y, width, 2);
  }

  // Turbulent cloud eddies & longitudinal wave disturbances
  for (let i = 0; i < 45; i++) {
    const cx = (i * 23.7) % width;
    const cy = 80 + ((i * 37.3) % (height - 160));
    const radX = 35 + ((i * 17) % 55);
    const radY = 6 + ((i * 7) % 12);
    ctx.fillStyle = i % 2 === 0 ? "rgba(254, 243, 199, 0.45)" : "rgba(180, 83, 9, 0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, radX, radY, Math.sin(i) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Great Oval Storm Spot at latitude ~65% (visible landmark for rotation!)
  const spotX = width * 0.42;
  const spotY = height * 0.65;
  const spotGrad = ctx.createRadialGradient(spotX, spotY, 2, spotX, spotY, 48);
  spotGrad.addColorStop(0, "#f59e0b");
  spotGrad.addColorStop(0.35, "#dc2626");
  spotGrad.addColorStop(0.75, "#b45309");
  spotGrad.addColorStop(1, "transparent");
  ctx.fillStyle = spotGrad;
  ctx.beginPath();
  ctx.ellipse(spotX, spotY, 56, 26, -0.08, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function generateHighResRingTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;

  ctx.clearRect(0, 0, size, size);

  const innerR = size * 0.27;
  const outerR = size * 0.485;

  for (let r = innerR; r <= outerR; r += 0.5) {
    const t = (r - innerR) / (outerR - innerR);
    let alpha = 0.85;

    // Cassini Division gap between t=0.52 and t=0.60
    if (t >= 0.52 && t <= 0.60) {
      alpha = 0.03; // Dark gap
    } else if (t < 0.12) {
      alpha = (t / 0.12) * 0.45; // Soft translucent inner C-ring
    } else if (t > 0.88) {
      alpha = (1.0 - (t - 0.88) / 0.12) * 0.55; // Soft outer A-ring falloff
    } else {
      // Fine orbital dust ringlets
      alpha = 0.70 + 0.28 * Math.sin(t * Math.PI * 64);
    }

    ctx.strokeStyle = `rgba(224, 242, 254, ${alpha * 0.85})`;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function generateMagmaTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Dark volcanic obsidian crust
  ctx.fillStyle = "#121214";
  ctx.fillRect(0, 0, width, height);

  // Basalt tectonic plates
  ctx.fillStyle = "#1c1917";
  for (let i = 0; i < 28; i++) {
    const cx = (i * 38.3) % width;
    const cy = 40 + ((i * 29.1) % (height - 80));
    const r = 35 + ((i * 13) % 45);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing volcanic lava chasms & rifts (visibly rotating across longitude!)
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 3.2;
  ctx.shadowColor = "#ffedd5";
  ctx.shadowBlur = 8;

  for (let i = 0; i < 36; i++) {
    let x = (i * 29.5) % width;
    let y = 50 + ((i * 21.7) % (height - 100));
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      x += (Math.sin(j * 4.3 + i) * 0.5 + 0.3) * 45;
      y += (Math.cos(j * 2.7 + i) * 0.5) * 35;
      ctx.lineTo(x % width, y);
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Molten volcanic hotspots / calderas
  for (let i = 0; i < 22; i++) {
    const x = (i * 47.1) % width;
    const y = 60 + ((i * 31.3) % (height - 120));
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 22);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.3, "#fef08a");
    grad.addColorStop(0.65, "#ea580c");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function generateOceanTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Deep sapphire / azure ocean
  ctx.fillStyle = "#0c284e";
  ctx.fillRect(0, 0, width, height);

  // Emerald landmasses & island archipelagos
  ctx.fillStyle = "#047857";
  for (let i = 0; i < 26; i++) {
    const cx = (i * 41.7) % width;
    const cy = 60 + ((i * 27.3) % (height - 120));
    const r = 28 + ((i * 15) % 46);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar Ice Caps
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fillRect(0, 0, width, 42); // North Pole
  ctx.fillRect(0, height - 42, width, 42); // South Pole

  // Cyclonic hurricane spirals & atmospheric cloud bands (visibly rotating!)
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  for (let i = 0; i < 24; i++) {
    const cx = (i * 43.1) % width;
    const cy = 70 + ((i * 23.5) % (height - 140));
    ctx.beginPath();
    ctx.ellipse(cx, cy, 65, 16, Math.sin(i * 1.5) * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function CelestialPlanetarySystem() {
  const { camera } = useThree();

  const systemGroupRef = useRef<THREE.Group>(null);
  const gasGiantRef = useRef<THREE.Group>(null);
  const magmaRef = useRef<THREE.Group>(null);
  const oceanRef = useRef<THREE.Group>(null);

  const gasGiantTex = useMemo(() => generateGasGiantTexture(), []);
  const ringTex = useMemo(() => generateHighResRingTexture(), []);
  const magmaTex = useMemo(() => generateMagmaTexture(), []);
  const oceanTex = useMemo(() => generateOceanTexture(), []);

  useEffect(() => {
    return () => {
      gasGiantTex.dispose();
      ringTex.dispose();
      magmaTex.dispose();
      oceanTex.dispose();
    };
  }, [gasGiantTex, ringTex, magmaTex, oceanTex]);

  useFrame((_, delta) => {
    // 1. PIN TO CAMERA POSITION: The planetary system follows camera translation,
    // so walking towards them NEVER changes their distance or size! (Celestial infinite distance)
    if (systemGroupRef.current) {
      systemGroupRef.current.position.copy(camera.position);
    }

    // 2. CLEAR VISIBLE ROTATION: Clouds, Great Storm Spot, lava rifts, and ocean spirals turn!
    if (gasGiantRef.current) gasGiantRef.current.rotation.y += delta * 0.045;
    if (magmaRef.current) magmaRef.current.rotation.y += delta * 0.065;
    if (oceanRef.current) oceanRef.current.rotation.y += delta * 0.055;
  });

  return (
    <group ref={systemGroupRef}>
      {/* ── 1. KRONOS PRIME: Massive Ringed Gas Giant (Centerpiece) ── */}
      <group position={[38, 54, 94]}>
        <group ref={gasGiantRef}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[11.0, 48, 48]} />
            <meshStandardMaterial map={gasGiantTex} roughness={0.75} metalness={0.06} />
          </mesh>
        </group>

        {/* Tilted High-Res Planetary Rings (Oblique angle, not flat!) */}
        <mesh rotation={[1.15, -0.45, 0.6]}>
          <ringGeometry args={[14.5, 26.0, 96]} />
          <meshStandardMaterial
            map={ringTex}
            transparent
            opacity={0.92}
            side={THREE.DoubleSide}
            roughness={0.65}
            depthWrite={false}
          />
        </mesh>

        {/* Atmospheric Cyan Rim Halo */}
        <mesh>
          <sphereGeometry args={[11.8, 36, 36]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ── 2. IGNIS-IV: Shattered Tectonic Molten Magma Moon (Lower Eastern Sky) ── */}
      <group position={[82, 16, 52]}>
        <group ref={magmaRef}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[5.2, 40, 40]} />
            <meshStandardMaterial
              map={magmaTex}
              emissive="#f97316"
              emissiveMap={magmaTex}
              emissiveIntensity={0.65}
              roughness={0.85}
            />
          </mesh>
        </group>

        {/* Volcanic Magma Atmospheric Halo */}
        <mesh>
          <sphereGeometry args={[5.6, 28, 28]} />
          <meshBasicMaterial
            color="#ea580c"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* ── 3. GLACIES: Crystalline Ocean & Ice World (High Western Sky) ── */}
      <group position={[-48, 62, 70]}>
        <group ref={oceanRef}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[4.6, 40, 40]} />
            <meshStandardMaterial map={oceanTex} roughness={0.42} metalness={0.15} />
          </mesh>
        </group>

        {/* Turquoise Atmospheric Glow */}
        <mesh>
          <sphereGeometry args={[5.0, 28, 28]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================
// PLANETARY SURFACE: SCULPTED 3D ALIEN TERRAIN
// Impact Skid Furrow, Raised Ejecta Berms, Crater Rim & Rolling Dunes
// ============================================================
function SonarPingWave({ pingTimestamp }: { pingTimestamp: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ringRef.current) return;
    const now = Date.now() / 1000;
    const elapsed = now - pingTimestamp;
    if (elapsed > 0 && elapsed < 2.0) {
      ringRef.current.visible = true;
      const progress = elapsed / 2.0;
      const radius = progress * 62;
      ringRef.current.scale.set(radius, radius, 1);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.85;
    } else {
      ringRef.current.visible = false;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.22, 16]} visible={false}>
      <ringGeometry args={[0.94, 1.0, 96]} />
      <meshBasicMaterial
        color="#00f0ff"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function PlanetSurface({ pingTimestamp }: { pingTimestamp: number }) {
  const regolithTex = useMemo(() => generateRegolithTexture(), []);

  // Sculpted 3D Terrain Plane Geometry matching getTerrainHeight()
  const terrainGeom = useMemo(() => {
    const geom = new THREE.PlaneGeometry(160, 160, 128, 128);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // Local Y becomes World -Z when rotated [-PI/2, 0, 0]
      const worldZ = -y;
      const h = getTerrainHeight(x, worldZ);
      pos.setZ(i, h);
    }
    geom.computeVertexNormals();
    return geom;
  }, [TERRAIN_VERSION]);

  useEffect(() => {
    return () => {
      regolithTex.dispose();
      terrainGeom.dispose();
    };
  }, [regolithTex, terrainGeom]);

  return (
    <group>
      {/* Sculpted 3D Alien Regolith Mesh */}
      <mesh
        geometry={terrainGeom}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          map={regolithTex}
          roughness={0.92}
          metalness={0.15}
          color="#383d47"
        />
      </mesh>

      {/* Holographic Sonar Ping Wave */}
      <SonarPingWave pingTimestamp={pingTimestamp} />
    </group>
  );
}

// ============================================================
// HIGH-FIDELITY BASALT BOULDERS & ALIEN XENOLITH CRYSTALS
// Every stone has a physical collider and natural terrain elevation
// ============================================================
function BasaltBoulders() {
  const stones = useMemo(() => {
    return WORLD_OBSTACLES.filter((o) => o.type === "stone");
  }, []);

  return (
    <group>
      {stones.map((b) => {
        const scale = b.scale || [1.5, 1.5, 1.5];
        const rot = b.rot || [0, 0, 0];
        const groundY = getTerrainHeight(b.x, b.z);
        const stoneY = groundY + scale[1] * 0.42;

        return (
          <group key={b.id} position={[b.x, stoneY, b.z]}>
            {/* 1. Main Faceted Stone Geometry */}
            {b.stoneStyle === "monolith" ? (
              <mesh scale={scale} rotation={rot} castShadow receiveShadow>
                <dodecahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                  color="#151821"
                  roughness={0.68}
                  metalness={0.32}
                />
              </mesh>
            ) : b.stoneStyle === "slag" ? (
              <mesh scale={scale} rotation={rot} castShadow receiveShadow>
                <dodecahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                  color="#1f2026"
                  roughness={0.92}
                  metalness={0.18}
                />
              </mesh>
            ) : (
              <mesh scale={scale} rotation={rot} castShadow receiveShadow>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                  color="#262b36"
                  roughness={0.88}
                  metalness={0.22}
                />
              </mesh>
            )}

            {/* 2. Embedded Alien Bioluminescent Xenolith Crystals */}
            {b.hasCrystal && (
              <group position={[0, scale[1] * 0.25, 0]}>
                {[0, 1.3, 2.7].map((angle, cIdx) => (
                  <mesh
                    key={cIdx}
                    position={[
                      Math.cos(angle) * (scale[0] * 0.65),
                      cIdx * 0.2,
                      Math.sin(angle) * (scale[2] * 0.65),
                    ]}
                    rotation={[0.3 * cIdx, angle, 0.4]}
                    castShadow
                  >
                    <coneGeometry args={[0.22, 0.95, 5]} />
                    <meshStandardMaterial
                      color={b.crystalColor || "#00f0ff"}
                      emissive={b.crystalColor || "#00f0ff"}
                      emissiveIntensity={3.2}
                      roughness={0.1}
                      metalness={0.9}
                    />
                  </mesh>
                ))}
                <pointLight
                  color={b.crystalColor || "#00f0ff"}
                  intensity={2.8}
                  distance={6}
                  decay={2}
                />
              </group>
            )}

            {/* 3. Ground Pebble Skirt (Natural terrain blending) */}
            {scale[0] > 2.0 && (
              <>
                <mesh position={[scale[0] * 0.85, -scale[1] * 0.35, scale[2] * 0.4]} castShadow>
                  <dodecahedronGeometry args={[0.35, 0]} />
                  <meshStandardMaterial color="#1a1c22" roughness={0.95} />
                </mesh>
                <mesh position={[-scale[0] * 0.75, -scale[1] * 0.35, -scale[2] * 0.5]} castShadow>
                  <dodecahedronGeometry args={[0.28, 0]} />
                  <meshStandardMaterial color="#222630" roughness={0.95} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ============================================================
// HIGH-FIDELITY MODERN SPACESHIP / ROCKET WRECKAGE
// ============================================================

// Cryo-coolant vapor plume rising from ruptured manifold
function EngineCoolantVentPlume() {
  return (
    <group position={[0, 2.8, 27]}>
      <Sparkles
        count={50}
        scale={[4.2, 3.6, 4.2]}
        size={3.8}
        speed={0.4}
        color="#a5f3fc"
        opacity={0.45}
      />
    </group>
  );
}

// Severed high-voltage conduits with electrical arcing sparks
function CableSparkHarness() {
  const sparkLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (sparkLightRef.current) {
      const t = clock.elapsedTime;
      const isSpark = Math.sin(t * 26.3) > 0.82;
      sparkLightRef.current.intensity = isSpark ? 8.5 : 0.0;
    }
  });

  return (
    <group position={[0, 4.6, -18]}>
      {/* Severed hanging power cables */}
      <mesh position={[-1.9, -1.2, 0]} rotation={[0, 0, 0.32]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.6, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[2.0, -1.3, 1.1]} rotation={[0.2, 0, -0.38]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.8, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Spark Emitter */}
      <pointLight ref={sparkLightRef} position={[-2.3, -2.4, 0]} color="#38bdf8" distance={14} decay={2} />
      <Sparkles
        count={28}
        scale={[1.6, 1.6, 1.6]}
        position={[-2.3, -2.4, 0]}
        size={3.6}
        speed={1.6}
        color="#38bdf8"
      />
    </group>
  );
}

// Interactive EVA Holographic Telemetry Console
function HolographicTerminal() {
  const [pulseTime, setPulseTime] = useState(0);

  useFrame(({ clock }) => {
    setPulseTime(clock.elapsedTime);
  });

  const termY = getTerrainHeight(2.8, -9.5);

  return (
    <group position={[2.8, termY, -9.5]} rotation={[0, -0.65, 0]}>
      {/* Pedestal Stand */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.32, 1.2, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Screen Frame */}
      <mesh position={[0, 1.25, 0]} rotation={[0.42, 0, 0]} castShadow>
        <boxGeometry args={[0.95, 0.58, 0.07]} />
        <meshStandardMaterial color="#090d16" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Holographic Projection Plane */}
      <mesh position={[0, 1.58, 0.08]} rotation={[0.22, 0, 0]}>
        <planeGeometry args={[1.25, 0.72]} />
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.38 + Math.sin(pulseTime * 5) * 0.08}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Console Glow Light */}
      <pointLight position={[0, 1.45, 0.22]} color="#00e5ff" intensity={3.5} distance={6} decay={2} />
    </group>
  );
}

// Automated Survival Distress Transponder Mast
function EmergencyBeacon() {
  const strobeRef = useRef<THREE.PointLight>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (strobeRef.current) {
      strobeRef.current.intensity = Math.sin(t * 7) > 0.65 ? 7.5 : 0.3;
    }
    if (pulseRingRef.current) {
      const s = 1.0 + (t % 1.4) * 2.8;
      pulseRingRef.current.scale.set(s, s, s);
      (pulseRingRef.current.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0, 1 - (t % 1.4) / 1.4) * 0.65;
    }
  });

  const beaconY = getTerrainHeight(-5.5, -3);

  return (
    <group position={[-5.5, beaconY, -3]}>
      {/* Structural Mast */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.15, 3.6, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.92} roughness={0.2} />
      </mesh>

      {/* Top Beacon Emitter */}
      <mesh position={[0, 3.65, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#ff2200" emissive="#ff1100" emissiveIntensity={3.5} />
      </mesh>
      <pointLight ref={strobeRef} position={[0, 3.7, 0]} color="#ff3300" distance={20} decay={2} />

      {/* Concentric Expanding Holographic Radar Rings */}
      <mesh ref={pulseRingRef} position={[0, 3.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.46, 32]} />
        <meshBasicMaterial
          color="#ff4422"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function RocketEngineCluster() {
  return (
    <group position={[0, 2.2, -6]} rotation={[0.42, 0, 0]}>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[4.2, 4.4, 1.8, 24]} />
        <meshStandardMaterial color="#1f2229" metalness={0.85} roughness={0.35} />
      </mesh>

      <group position={[0, 0, 3.2]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.1, 2.4, 4.8, 20, 1, true]} />
          <meshStandardMaterial
            color="#2a2e38"
            metalness={0.9}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, -1.8]}>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial
            color="#00f0ff"
            emissive="#00f0ff"
            emissiveIntensity={3.5}
          />
        </mesh>
        <pointLight color="#00e5ff" intensity={8} distance={20} decay={2} castShadow />
      </group>

      <group position={[-2.6, -0.6, 2.4]} rotation={[0.1, 0.15, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.9, 2.0, 4.2, 18, 1, true]} />
          <meshStandardMaterial
            color="#242832"
            metalness={0.92}
            roughness={0.28}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, 1.9]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.95, 0.1, 8, 24]} />
          <meshStandardMaterial color="#3355aa" metalness={0.95} roughness={0.2} />
        </mesh>
      </group>

      <group position={[2.6, -0.6, 2.4]} rotation={[-0.1, -0.15, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.9, 2.0, 4.2, 18, 1, true]} />
          <meshStandardMaterial
            color="#242832"
            metalness={0.92}
            roughness={0.28}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <mesh position={[0, 1.8, 1.2]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 5.2, 12]} />
        <meshStandardMaterial color="#445566" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

function StarshipFuselage() {
  const heatShieldTex = useMemo(() => generateHeatShieldTexture(), []);

  useEffect(() => {
    return () => heatShieldTex.dispose();
  }, [heatShieldTex]);

  return (
    <group position={[0, 3.8, -22]} rotation={[0.22, 0.08, -0.15]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[3.8, 4.2, 22, 28, 1, true, 0, Math.PI * 1.55]} />
        <meshStandardMaterial
          map={heatShieldTex}
          metalness={0.82}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {[ -8, -4, 0, 4, 8 ].map((zOffset, idx) => (
        <group key={idx} position={[0, 0, zOffset]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[3.7, 0.16, 8, 32]} />
            <meshStandardMaterial color="#4a5568" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[4.2, 0.25, 0.4]} />
            <meshStandardMaterial color="#2d3748" metalness={0.7} />
          </mesh>
        </group>
      ))}

      <mesh position={[2.8, 1.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.2, 21]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
      </mesh>
      <mesh position={[-2.8, 1.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.2, 21]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
      </mesh>

      <mesh position={[0, 0, -2]} castShadow>
        <sphereGeometry args={[2.8, 24, 24]} />
        <meshStandardMaterial
          color="#a0aec0"
          metalness={0.95}
          roughness={0.15}
        />
      </mesh>
    </group>
  );
}

function SolarArrayWing() {
  return (
    <group position={[-7.5, 2.5, -16]} rotation={[0.3, 0.6, 0.75]}>
      <mesh castShadow>
        <boxGeometry args={[0.35, 16, 0.35]} />
        <meshStandardMaterial color="#1a202c" metalness={0.5} roughness={0.6} />
      </mesh>

      {[ -5, -2, 1, 4 ].map((yOffset, idx) => (
        <mesh key={idx} position={[1.4, yOffset, 0]} rotation={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[2.5, 2.2, 0.08]} />
          <meshStandardMaterial
            color="#0d2847"
            emissive="#001833"
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

function CommandCapsule() {
  const strobeRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (strobeRef.current) {
      const t = clock.elapsedTime;
      const flash = (Math.sin(t * 5) > 0.8 || Math.sin(t * 5 + 0.6) > 0.8) ? 8 : 0.4;
      strobeRef.current.intensity = flash;
    }
  });

  return (
    <group position={[9.5, 2.8, -26]} rotation={[-0.3, -0.6, 0.2]}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[2.6, 6.2, 18]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.88}
          roughness={0.25}
        />
      </mesh>

      <mesh position={[0, 0.8, 1.4]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[2.0, 1.2, 0.2]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.98}
          roughness={0.05}
        />
      </mesh>

      <mesh position={[0, 2.9, 0]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={3} />
      </mesh>
      <pointLight ref={strobeRef} position={[0, 3.2, 0]} color="#ff3300" distance={24} decay={2} />
    </group>
  );
}

function ReactorCore() {
  const coreRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (coreRef.current) {
      const t = clock.elapsedTime;
      coreRef.current.emissiveIntensity = 2.5 + Math.sin(t * 3.5) * 1.5;
    }
  });

  return (
    <group position={[0.5, 1.2, -16]}>
      <mesh castShadow>
        <cylinderGeometry args={[1.1, 1.1, 2.4, 16]} />
        <meshStandardMaterial
          ref={coreRef}
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={3.0}
          roughness={0.2}
          wireframe
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.85, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight color="#00e5ff" intensity={12} distance={26} decay={2} castShadow />
    </group>
  );
}

function AerospaceDebris() {
  const crates = useMemo(() => {
    return WORLD_OBSTACLES.filter((o) => o.type === "crate");
  }, []);

  return (
    <group>
      {crates.map((c, i) => {
        const groundY = getTerrainHeight(c.x, c.z);
        return (
          <mesh
            key={c.id || i}
            position={[c.x, groundY + 0.45, c.z]}
            rotation={[0, (i * 0.42) % Math.PI, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[c.radius * 1.4, 0.9, c.radius * 1.4]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#475569" : "#1e293b"}
              metalness={0.82}
              roughness={0.28}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CosmicDust() {
  return (
    <group position={[0, 1.2, -14]}>
      {/* Ion plasma motes strictly at ground level around the crash */}
      <Sparkles
        count={60}
        scale={[36, 2.4, 36]}
        size={2.6}
        speed={0.25}
        color="#00ffff"
        opacity={0.65}
      />
      {/* Warm embers near the engine thrusters */}
      <Sparkles
        count={40}
        scale={[28, 2.0, 28]}
        size={2.0}
        speed={0.18}
        color="#ffaa44"
        opacity={0.55}
      />
    </group>
  );
}

// Master 3D Starship Crash Site Scene
function SpaceshipWreckScene({ pingTimestamp }: { pingTimestamp: number }) {
  return (
    <>
      {/* ── Lighting (Realistic Deep Space) ───────────────────────── */}
      <ambientLight color="#141824" intensity={2.6} />

      {/* Main Directional Light (Matches Golden Black Hole's position in the sky) */}
      <directionalLight
        position={[-35, 55, -75]}
        color="#ffd8a8"
        intensity={3.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={140}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
      />

      <directionalLight position={[35, 25, 40]} color="#4477aa" intensity={1.2} />

      {/* Synchronizes the Three.js camera with the background Black Hole shader */}
      <CameraSync />

      {/* Unique Celestial Planetary System (Opposite side of the sky from the black hole) */}
      <CelestialPlanetarySystem />

      {/* Fast, luminous shooting stars darting across the realistic night sky */}
      <ShootingStars />

      {/* ── Planetary Surface & Terrain ──────────────────────────── */}
      <PlanetSurface pingTimestamp={pingTimestamp} />
      <BasaltBoulders />

      {/* ── Procedural Crashed Spaceship Wreck (5 draw calls, baked vertex lighting, open roof) ── */}
      <SpaceshipWreck
        playerPositionRef={sharedPlayerPos as any}
        onReady={(model) => {
          sharedShipColliders.current = model.colliders;
        }}
      />
      <EngineCoolantVentPlume />
      <CosmicDust />
    </>
  );
}

// ============================================================
// POINTER LOCK CONTROLS WRAPPER
// ============================================================
interface GameEngineControlsProps {
  isLocked: boolean;
  inputLocked?: boolean;
  setIsLocked: (locked: boolean) => void;
  flashlight: boolean;
  setFlashlight: React.Dispatch<React.SetStateAction<boolean>>;
  triggerPing: () => void;
  setTargetInfo: React.Dispatch<React.SetStateAction<any>>;
}

function GameEngineControls({
  isLocked,
  inputLocked = false,
  setIsLocked,
  flashlight,
  setFlashlight,
  triggerPing,
  setTargetInfo,
}: GameEngineControlsProps) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    const handleLock = () => {
      setIsLocked(true);
      shipAudio.resume();
    };
    const handleUnlock = () => setIsLocked(false);

    // Suppress console error noise on browser pointer lock cooldown rejection
    const handlePointerLockError = (e: Event) => {
      e.stopImmediatePropagation?.();
    };
    document.addEventListener("pointerlockerror", handlePointerLockError, true);

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || "");
      const name = String(event.reason?.name || "");
      if (
        name === "NotAllowedError" ||
        name === "SecurityError" ||
        msg.includes("Pointer Lock") ||
        msg.includes("pointer lock") ||
        msg.includes("user gesture")
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    ctrl.addEventListener("lock", handleLock);
    ctrl.addEventListener("unlock", handleUnlock);

    return () => {
      document.removeEventListener("pointerlockerror", handlePointerLockError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      ctrl.removeEventListener("lock", handleLock);
      ctrl.removeEventListener("unlock", handleUnlock);
    };
  }, [setIsLocked]);

  return (
    <>
      <PointerLockControls ref={controlsRef} enabled={!inputLocked} />
      <Player
        isLocked={isLocked}
        inputLocked={inputLocked}
        flashlight={flashlight}
        setFlashlight={setFlashlight}
        triggerPing={triggerPing}
        setTargetInfo={setTargetInfo}
      />
    </>
  );
}

// Transparent background on Three.js so the full-screen Black Hole shows through!
function CanvasEnvironmentSetup() {
  const { scene, gl } = useThree();

  useEffect(() => {
    scene.background = null;
    gl.setClearColor(0x000000, 0); // Transparent clear
    scene.fog = new THREE.FogExp2("#060810", 0.008);
  }, [scene, gl]);

  return null;
}

// ============================================================
// DEBUG TELEMETRY HUD (Toggled with `)
// ============================================================
function TelemetryHUD() {
  const [visible, setVisible] = useState(false);
  const [telemetry, setTelemetry] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Backquote") {
        setVisible((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      const spd = _velocity.length().toFixed(2);
      setTelemetry(`SPEED: ${spd} u/s  |  [ \` ] to close`);
    }, 120);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-black/80 border border-cyan-500/40 rounded font-mono text-xs text-cyan-400 pointer-events-none tracking-widest backdrop-blur-md">
      {telemetry}
    </div>
  );
}

// ============================================================
// MAIN FIRST-PERSON 3D GAME EXPORT
// ============================================================
export default function Game() {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);
  const [flashlight, setFlashlight] = useState(false);
  const [pingTimestamp, setPingTimestamp] = useState(0);
  const [targetInfo, setTargetInfo] = useState<{
    name: string;
    type: string;
    distance: string;
    description: string;
  } | null>(null);

  const [scene1Complete, setScene1Complete] = useState(false);
  const [scene2Complete, setScene2Complete] = useState(false);
  const [scene2InputLocked, setScene2InputLocked] = useState(true);

  // Direct scene testing support (?scene=2)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("scene") === "2") {
        setScene1Complete(true);
      }
    }
  }, []);
  const [crashProgress, setCrashProgress] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = canvasContainerRef.current?.querySelector("canvas");
    if (cvs) canvasRef.current = cvs;
  }, []);

  // Full-bleed raymarched general relativity black hole canvas
  const blackHoleCanvasRef = useFullscreenBlackHoleSky();

  const triggerPing = useCallback(() => {
    playInteraction("scanner");
    setPingTimestamp(Date.now() / 1000);
  }, []);

  const lastLockAttemptRef = useRef(0);
  const requestGameLock = useCallback(() => {
    shipAudio.resume();
    const now = Date.now();
    // Guard against browser pointer lock cooldown rejection (~1.2s between unlocks)
    if (now - lastLockAttemptRef.current < 1200) return;
    if (typeof document !== "undefined" && document.pointerLockElement) return;
    lastLockAttemptRef.current = now;

    const canvas = canvasContainerRef.current?.querySelector("canvas");
    if (canvas) {
      try {
        const promise = canvas.requestPointerLock?.() as any;
        if (promise && typeof promise.catch === "function") {
          promise.catch(() => {
            // Silently ignore standard browser pointer lock cooldown rejection
          });
        }
      } catch {
        // Silently ignore
      }
    }
  }, []);

  const isPingActive = (Date.now() / 1000 - pingTimestamp) < 2.0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* ── LAYER 0: Fullscreen Ray-Marched General Relativity Black Hole Sky ── */}
      <canvas
        ref={blackHoleCanvasRef}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      />

      {/* ── LAYER 1: 3D Planetary World (Transparent Canvas) ─────── */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 z-10 cursor-crosshair"
        onClick={!isLocked ? requestGameLock : undefined}
      >
        <Canvas
          dpr={[1, 1.5]}
          shadows
          camera={{ fov: 75, near: 0.1, far: 280 }}
          gl={{
            antialias: true,
            alpha: true, // Transparent clear so the Black Hole Sky shines through
          }}
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            <CanvasEnvironmentSetup />
            <SpaceshipWreckScene pingTimestamp={pingTimestamp} />
            <GameEngineControls
              isLocked={isLocked}
              inputLocked={scene1Complete && !scene2Complete && scene2InputLocked}
              setIsLocked={setIsLocked}
              flashlight={flashlight}
              setFlashlight={setFlashlight}
              triggerPing={triggerPing}
              setTargetInfo={setTargetInfo}
            />
            <ShipAudio playerPositionRef={sharedPlayerPos as any} />
            {crashProgress !== null && (
              <CrashCinematic
                progress={crashProgress}
                reduceMotion={reduceMotion}
              />
            )}
            {scene1Complete && !scene2Complete && (
              <Scene2Canvas reduceMotion={reduceMotion} />
            )}
          </Suspense>
        </Canvas>
      </div>

      {/* ── Navigation / Return Button ─────────────────────────── */}
      <div className="fixed top-6 right-6 z-40 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-black/70 hover:bg-black/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-mono text-xs tracking-widest uppercase rounded transition-all backdrop-blur-md cursor-pointer shadow-[0_0_15px_rgba(0,255,255,0.15)] flex items-center gap-2"
        >
          <span>←</span> Base Camp
        </button>
      </div>

      {/* ── SCENE 1: Title, Play, and Boot Sequence ───────────── */}
      {!scene1Complete && (
        <Scene1
          onSceneComplete={() => {
            setScene1Complete(true);
          }}
          canvasRef={canvasRef}
          canvasContainerRef={canvasContainerRef}
          onCrashProgress={(p) => setCrashProgress(p)}
        />
      )}

      {/* ── SCENE 2: Eyes Open and First Controls ─────────────── */}
      {scene1Complete && !scene2Complete && (
        <Scene2
          onSceneComplete={() => {
            setScene2Complete(true);
            setScene2InputLocked(false);
          }}
          canvasWrapperRef={canvasContainerRef}
          canvasRef={canvasRef}
          isLocked={isLocked}
          requestLock={requestGameLock}
          reduceMotion={reduceMotion}
          onSetInputLocked={(locked) => setScene2InputLocked(locked)}
        />
      )}

      {/* ── Start / Click-to-Play Overlay (Only active after Scene 1 & 2 complete and if unlocked) ── */}
      {scene1Complete && scene2Complete && !isLocked && (
        <div
          onClick={requestGameLock}
          className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] cursor-pointer"
        >
          <div className="text-center p-8 border border-cyan-500/40 bg-black/80 rounded-lg shadow-[0_0_40px_rgba(0,255,255,0.25)] max-w-lg mx-4">
            <h2 className="font-mono text-2xl md:text-3xl font-black text-white tracking-widest mb-2 [text-shadow:0_0_20px_rgba(0,255,255,0.8)]">
              CLICK TO TAKE CONTROL
            </h2>
            <p className="font-sans text-xs md:text-sm text-cyan-200/80 mb-6 tracking-wide">
              Explore the crashed starship under the general relativity black hole.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left font-mono text-xs text-cyan-300/90 border-t border-cyan-500/20 pt-4">
              <div><span className="text-white font-bold">W A S D</span> — Move</div>
              <div><span className="text-white font-bold">SHIFT</span> — Sprint</div>
              <div><span className="text-white font-bold">MOUSE</span> — Look (360°)</div>
              <div><span className="text-white font-bold">T</span> — Flashlight</div>
              <div><span className="text-white font-bold">E / F</span> — Sonar Ping</div>
              <div><span className="text-white font-bold">ESC</span> — Unlock Cursor</div>
            </div>
            <div className="mt-4 text-[11px] text-amber-300/90 font-mono tracking-wider">
              ✦ Physical Obstacle Collisions Enabled — Boulders & Wreckage cannot be passed through
            </div>
          </div>
        </div>
      )}

      {/* ── Crosshair (Only visible after Scene 1 & 2 complete when pointer-locked) ────────── */}
      {scene1Complete && scene2Complete && isLocked && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/90 shadow-[0_0_8px_rgba(0,255,255,0.9)] pointer-events-none z-30" />
      )}

      {/* ── Tactical AR Object Target Scanner HUD (Only after Scene 1 & 2 complete) ──────────────── */}
      {scene1Complete && scene2Complete && isLocked && targetInfo && (
        <div className="fixed top-6 right-6 z-30 max-w-sm p-3.5 bg-black/85 border border-cyan-400/50 rounded-lg backdrop-blur-md shadow-[0_0_25px_rgba(0,255,255,0.2)] font-mono text-xs pointer-events-none transition-all">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1.5 mb-2">
            <span className="text-cyan-400 font-bold tracking-wider flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              TARGET PROXIMITY SCAN
            </span>
            <span className="text-cyan-200/80 font-bold">{targetInfo.distance}m</span>
          </div>
          <div className="text-white font-bold text-sm tracking-wide mb-1">
            {targetInfo.name}
          </div>
          <div className="text-cyan-200/75 text-[11px] leading-relaxed mb-2">
            {targetInfo.description}
          </div>
          <div className="flex items-center justify-between text-[10px] text-cyan-400/80 pt-1 border-t border-cyan-500/20">
            <span>COLLISION: ACTIVE</span>
            <span className="text-amber-400 font-bold">NON-PASSABLE OBSTACLE</span>
          </div>
        </div>
      )}

      {/* ── Active Sonar Ping Banner (Only after Scene 1 & 2 complete) ────────────────────────────── */}
      {scene1Complete && scene2Complete && isLocked && isPingActive && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-mono text-xs tracking-widest rounded shadow-[0_0_20px_rgba(0,255,255,0.4)] pointer-events-none backdrop-blur-md animate-pulse">
          TERRAIN SONAR PING ACTIVE — MAPPING OBSTACLE COLLIDERS
        </div>
      )}

      {/* ── Tactical Suit Equipment HUD (Bottom Bar: Only visible after Scene 1 & 2 complete) ───── */}
      {scene1Complete && scene2Complete && isLocked && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-5 py-2 bg-black/80 border border-cyan-500/30 rounded-full font-mono text-xs backdrop-blur-md pointer-events-none shadow-[0_0_20px_rgba(0,255,255,0.15)]">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              flashlight
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            [T] LIGHT: {flashlight ? "ON" : "OFF"}
          </span>
          <span className="text-cyan-500/40">•</span>
          <span className="text-cyan-300/80 text-[11px]">
            [E / F] PING SCANNER
          </span>
          <span className="text-cyan-500/40">•</span>
          <span className="text-cyan-300/80 text-[11px]">
            [SHIFT] SPRINT
          </span>
        </div>
      )}

      {/* ── Telemetry HUD ──────────────────────────────────────── */}
      <TelemetryHUD />
    </div>
  );
}
