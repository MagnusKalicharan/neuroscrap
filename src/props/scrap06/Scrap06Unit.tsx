"use client";
/**
 * Scrap06Unit.tsx — Abandoned Maintenance Robot (SCRAP-06)
 * ========================================================
 * Environmental storytelling discovery slumped against the cockpit's
 * port (left-hand) metallic hull wall.
 *
 * Design & Systems:
 * - Older sister model to the player's SCRAP-07 unit (compact cube-headed
 *   maintenance robot silhouette with rounded corners, cream-yellow weathered
 *   painted casing, twin circular optics, bent broken antenna, thin articulated
 *   mechanical limbs).
 * - Full damaged industrial torso chassis with front chest armor plate, faded
 *   hazard striping, breached maintenance bay with exposed internal circuitry,
 *   lower tech grille, and rear power canister backpack resting against the hull.
 * - Completely stationary, lifeless pose: slumped against the left cockpit wall,
 *   head tilted slightly downward, one arm missing with exposed wiring & loose
 *   hanging cable resting on the floor, remaining arm limp at an unnatural angle,
 *   legs awkwardly collapsed.
 * - Subtle irregular cyan-white electrical sparks from the damaged wiring/cable
 *   with brief local flash, tiny smoke wisps, and distance-attenuated 3D spatial
 *   audio via existing `shipAudio`.
 * - Scannable via the existing Ping Scanner ([F]) to reveal:
 *     SCRAP-06 — POWER: NONE
 */
import React, { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { shipAudio } from "../../audio/shipAudio";
import { FLOOR_Y } from "../../components/ship/layout";

/** World-space anchor: slumped against the cockpit left-hand (-X) metallic wall */
export const SCRAP06_POSITION: [number, number, number] = [-10.58, FLOOR_Y, -38.7];

/** World-space rotation: angled facing inward-forward toward the cockpit walkway */
export const SCRAP06_ROTATION_Y = 1.28;

/** Target point used by the ping scanner in Game.tsx */
export const SCRAP06_SCAN_TARGET = new THREE.Vector3(-10.58, FLOOR_Y + 0.62, -38.7);

/** Solid AABB collider registered in shipModel.ts so the player cannot walk through SCRAP-06 */
export const SCRAP06_COLLIDER = {
  id: "scrap-06",
  minX: -11.08,
  maxX: -10.05,
  minZ: -39.25,
  maxZ: -38.15,
  minY: 0.0,
  maxY: 1.15,
};

// Deterministic pseudo-random helper so weathering textures look consistent across sessions
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 1. Weathered Cream-Yellow Painted Metal Casing Texture ────────────────
function createScrap06CasingTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(60606);

  // Aged cream-yellow painted metal base (matches reference robot palette, faded with time)
  ctx.fillStyle = "#cfc08f";
  ctx.fillRect(0, 0, size, size);

  // Vertical patina & dust accumulation (dustier near top, grimier near bottom)
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "rgba(218, 210, 185, 0.35)"); // Pale dust along upper edge
  grad.addColorStop(0.22, "rgba(210, 194, 145, 0.08)");
  grad.addColorStop(0.75, "rgba(82, 72, 48, 0.22)");
  grad.addColorStop(1, "rgba(38, 34, 26, 0.58)"); // Heavy floor grime at bottom
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle brushed & oxidized mottling
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 14 + rand() * 48;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.4;
    g.addColorStop(0, dark ? "rgba(55, 48, 36, 0.22)" : "rgba(225, 215, 185, 0.16)");
    g.addColorStop(1, "rgba(55, 48, 36, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Patches of dark soot / electrical scorch
  for (let i = 0; i < 18; i++) {
    const x = rand() * size;
    const y = size * 0.35 + rand() * size * 0.65;
    const r = 18 + rand() * 52;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, "rgba(18, 20, 22, 0.58)");
    sg.addColorStop(0.55, "rgba(26, 26, 28, 0.28)");
    sg.addColorStop(1, "rgba(20, 20, 22, 0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rust blooms around edges & joints
  const rustPalette = ["#7d3c1c", "#5e2a12", "#8f4924", "#4d2310"];
  for (let i = 0; i < 36; i++) {
    const nearEdge = rand() > 0.35;
    const x = nearEdge
      ? rand() > 0.5
        ? rand() * 65
        : size - rand() * 65
      : rand() * size;
    const y = rand() * size;
    const rx = 6 + rand() * 24;
    const ry = 4 + rand() * 16;
    ctx.fillStyle = rustPalette[Math.floor(rand() * rustPalette.length)];
    ctx.globalAlpha = 0.45 + rand() * 0.35;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Chipped paint patches revealing dark bare metal underneath
  for (let i = 0; i < 42; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 4 + rand() * 22;
    const h = 3 + rand() * 14;
    ctx.fillStyle = rand() > 0.5 ? "#353c45" : "#22272e";
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.5, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    // Tiny light paint-edge chip rim
    ctx.strokeStyle = "rgba(235, 224, 185, 0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Fine metallic scratches across casing
  for (let i = 0; i < 65; i++) {
    const x1 = rand() * size;
    const y1 = rand() * size;
    const len = 10 + rand() * 48;
    const ang = rand() * Math.PI * 2;
    ctx.strokeStyle = rand() > 0.45 ? "rgba(38, 44, 52, 0.72)" : "rgba(235, 232, 220, 0.48)";
    ctx.lineWidth = 0.8 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(ang) * len, y1 + Math.sin(ang) * len);
    ctx.stroke();
  }

  // Dark recessed panel seams & tiny rivets
  ctx.strokeStyle = "rgba(32, 30, 26, 0.65)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.beginPath();
  ctx.moveTo(18, 130);
  ctx.lineTo(size - 18, 130);
  ctx.moveTo(18, size - 95);
  ctx.lineTo(size - 18, size - 95);
  ctx.stroke();

  // Faded technical stripe & worn identification marking
  ctx.fillStyle = "rgba(48, 44, 34, 0.42)";
  ctx.fillRect(36, 48, 92, 10);
  ctx.fillStyle = "rgba(180, 118, 32, 0.45)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(size - 125 + i * 22, 42, 12, 18);
  }

  // Faded identification text on casing
  ctx.font = "bold 28px monospace";
  ctx.fillStyle = "rgba(42, 38, 30, 0.62)";
  ctx.fillText("UNIT // 06", 38, 98);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

// ── 2. Chest Armor Plate Texture (Hazard Stripes & Stencil Marking) ───────
function createChestHazardTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(60688);

  // Faded cream-yellow base matching casing
  ctx.fillStyle = "#cfc08f";
  ctx.fillRect(0, 0, w, h);

  // Upper industrial hazard stripe band (matching SCRAP family safety markings)
  const stripeY = 28;
  const stripeH = 110;
  ctx.save();
  ctx.beginPath();
  ctx.rect(18, stripeY, w - 36, stripeH);
  ctx.clip();

  // Amber base for hazard stripes
  ctx.fillStyle = "#c88a2a";
  ctx.fillRect(18, stripeY, w - 36, stripeH);

  // Dark slate/charcoal diagonal hazard stripes
  ctx.fillStyle = "#262b32";
  const stripeWidth = 42;
  for (let x = -stripeH * 2; x < w + stripeH * 2; x += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(x, stripeY);
    ctx.lineTo(x + stripeWidth, stripeY);
    ctx.lineTo(x + stripeWidth - stripeH * 0.8, stripeY + stripeH);
    ctx.lineTo(x - stripeH * 0.8, stripeY + stripeH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Weathering grime wash
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(220, 210, 180, 0.2)");
  grad.addColorStop(0.5, "rgba(60, 52, 38, 0.15)");
  grad.addColorStop(1, "rgba(25, 22, 18, 0.65)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Border and rivet seams
  ctx.strokeStyle = "rgba(35, 32, 28, 0.75)";
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  // Stencil markings: SCRAP-06 // HEAVY MAINT.
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "rgba(28, 25, 20, 0.85)";
  ctx.fillText("SCRAP-06 // HEAVY MAINT.", 34, 195);
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "rgba(45, 40, 32, 0.65)";
  ctx.fillText("SYSTEM FAILURE // AUX POWER DEPLETED", 34, 225);

  // Rust and chipped paint patches across stripes
  for (let i = 0; i < 30; i++) {
    const rx = rand() * w;
    const ry = rand() * h;
    ctx.fillStyle = rand() > 0.4 ? "#633218" : "#242930";
    ctx.beginPath();
    ctx.ellipse(rx, ry, 3 + rand() * 12, 2 + rand() * 8, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scratches across the hazard paint
  for (let i = 0; i < 45; i++) {
    const sx = rand() * w;
    const sy = rand() * h;
    const slen = 8 + rand() * 38;
    const sang = rand() * Math.PI * 2;
    ctx.strokeStyle = rand() > 0.4 ? "rgba(30, 34, 40, 0.75)" : "rgba(235, 230, 215, 0.45)";
    ctx.lineWidth = 1 + rand() * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(sang) * slen, sy + Math.sin(sang) * slen);
    ctx.stroke();
  }

  // Heavy soot smudge across the damaged left side
  const soot = ctx.createRadialGradient(80, 160, 10, 80, 160, 140);
  soot.addColorStop(0, "rgba(14, 16, 18, 0.75)");
  soot.addColorStop(0.6, "rgba(20, 22, 24, 0.35)");
  soot.addColorStop(1, "rgba(20, 22, 24, 0)");
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

// ── 3. Damaged Serial-Number Label Plate ("SCRAP-06") ─────────────────────
function createSerialPlateTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 96;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(60699);

  // Tarnished faded cream/steel plate
  ctx.fillStyle = "#b8aa80";
  ctx.fillRect(0, 0, w, h);

  // Border & grime vignette
  ctx.strokeStyle = "#36332a";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  // Corner rust rivets
  ctx.fillStyle = "#4d2814";
  for (const [rx, ry] of [
    [14, 14],
    [w - 14, 14],
    [14, h - 14],
    [w - 14, h - 14],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Serial text: SCRAP-06
  ctx.font = "bold 38px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(26, 28, 30, 0.85)";
  ctx.fillText("SCRAP-06", w * 0.5, h * 0.54);

  // Small sub-marking
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "rgba(45, 42, 34, 0.68)";
  ctx.fillText("MAINT. SERIES // MK-I", w * 0.5, 22);

  // Damage scratches & paint chips cutting across the serial number
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = rand() > 0.5 ? "rgba(32, 36, 40, 0.85)" : "rgba(195, 184, 148, 0.7)";
    ctx.lineWidth = 1.5 + rand() * 2.5;
    const x1 = rand() * w;
    const y1 = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (rand() - 0.5) * 55, y1 + (rand() - 0.5) * 32);
    ctx.stroke();
  }

  // Soot smudge on right edge
  const soot = ctx.createRadialGradient(w * 0.85, h * 0.6, 4, w * 0.85, h * 0.6, 56);
  soot.addColorStop(0, "rgba(16, 18, 20, 0.68)");
  soot.addColorStop(1, "rgba(16, 18, 20, 0)");
  ctx.fillStyle = soot;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── 4. Cracked Cyan-Greenish Eye Display Texture ──────────────────────────
function createCrackedEyeTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const cx = size * 0.5;
  const cy = size * 0.5;

  // Muted cyan-greenish phosphor base (no expressive pupil/smile)
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.5);
  g.addColorStop(0, "#66e8dc");
  g.addColorStop(0.55, "#248f8c");
  g.addColorStop(0.88, "#0e3b3e");
  g.addColorStop(1, "#06191b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Subtle scanlines on dead CRT lens
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  for (let y = 0; y < size; y += 6) {
    ctx.fillRect(0, y, size, 2);
  }

  // Impact point & jagged spiderweb cracks across the glass
  const ix = size * 0.38;
  const iy = size * 0.44;
  ctx.strokeStyle = "rgba(6, 10, 12, 0.95)";
  ctx.lineWidth = 2.6;
  const crackAngles = [0.2, 1.15, 2.05, 3.1, 4.25, 5.4];
  for (const ang of crackAngles) {
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    const midR = 24;
    const endR = 72;
    ctx.lineTo(
      ix + Math.cos(ang + 0.14) * midR,
      iy + Math.sin(ang + 0.14) * midR
    );
    ctx.lineTo(
      ix + Math.cos(ang - 0.08) * endR,
      iy + Math.sin(ang - 0.08) * endR
    );
    ctx.stroke();
  }

  // Secondary pale glass fracture glint
  ctx.strokeStyle = "rgba(185, 252, 248, 0.55)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(ix, iy);
  ctx.lineTo(ix + 38, iy - 16);
  ctx.moveTo(ix, iy);
  ctx.lineTo(ix - 24, iy + 32);
  ctx.stroke();

  // Dark chipped glass spot at impact center
  ctx.fillStyle = "#060b0d";
  ctx.beginPath();
  ctx.arc(ix, iy, 6, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── 5. Subtle Floor Grime / Oil Reflection Patch Texture ──────────────────
function createFloorReflectionTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createRadialGradient(size * 0.5, size * 0.5, 10, size * 0.5, size * 0.5, size * 0.48);
  g.addColorStop(0, "rgba(14, 18, 22, 0.78)");
  g.addColorStop(0.55, "rgba(18, 22, 26, 0.42)");
  g.addColorStop(1, "rgba(18, 22, 26, 0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// ── 6. Soft Smoke Wisp Texture ────────────────────────────────────────────
function createSmokeTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createRadialGradient(size * 0.5, size * 0.5, 2, size * 0.5, size * 0.5, size * 0.48);
  g.addColorStop(0, "rgba(180, 210, 220, 0.55)");
  g.addColorStop(0.5, "rgba(110, 128, 138, 0.25)");
  g.addColorStop(1, "rgba(80, 95, 105, 0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// ── Rounded Box Geometry Builder (smooth beveled industrial robot casing) ──
function createRoundedBoxGeometry(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = w * 0.5 - r;
  const hh = h * 0.5 - r;
  shape.moveTo(-hw, -hh - r);
  shape.lineTo(hw, -hh - r);
  shape.quadraticCurveTo(hw + r, -hh - r, hw + r, -hh);
  shape.lineTo(hw + r, hh);
  shape.quadraticCurveTo(hw + r, hh + r, hw, hh + r);
  shape.lineTo(-hw, hh + r);
  shape.quadraticCurveTo(-hw - r, hh + r, -hw - r, hh);
  shape.lineTo(-hw - r, -hh);
  shape.quadraticCurveTo(-hw - r, -hh - r, -hw, -hh - r);

  const extrudeDepth = Math.max(0.04, d - r * 2);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geom.center();

  // Normalize planar/box UVs so textures wrap cleanly across all 6 faces
  const pos = geom.attributes.position;
  const norm = geom.attributes.normal;
  const uv = geom.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));
    if (nz >= nx && nz >= ny) {
      uv.setXY(i, px / w + 0.5, py / h + 0.5);
    } else if (nx >= ny) {
      uv.setXY(i, pz / d + 0.5, py / h + 0.5);
    } else {
      uv.setXY(i, px / w + 0.5, pz / d + 0.5);
    }
  }
  uv.needsUpdate = true;
  return geom;
}

// ── Spark & Smoke Particle Pools (zero per-frame allocations) ─────────────
const MAX_LOCAL_SPARKS = 18;
const MAX_SMOKE_PUFFS = 5;

interface LocalSpark {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface LocalSmoke {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseScale: number;
}

const _mat4 = new THREE.Matrix4();
const _vPos = new THREE.Vector3();
const _vScale = new THREE.Vector3();
const _vDir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _fwd = new THREE.Vector3(0, 0, 1);
const _sparkOriginWorld = new THREE.Vector3();

export interface Scrap06UnitProps {
  playerPositionRef?: React.RefObject<THREE.Vector3>;
  reducedMotion?: boolean;
}

export function Scrap06Unit({
  playerPositionRef,
  reducedMotion = false,
}: Scrap06UnitProps) {
  const { camera } = useThree();

  const rootRef = useRef<THREE.Group>(null);
  const sparkOriginRef = useRef<THREE.Object3D>(null);
  const sparkLightRef = useRef<THREE.PointLight>(null);
  const sparkInstRef = useRef<THREE.InstancedMesh>(null);
  const smokeMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Timers for irregular, unpredictable malfunction flickers & sparks
  const nextSparkTimer = useRef(2.8 + Math.random() * 3.5);
  const doublePopTimer = useRef<number | null>(null);
  const flashLife = useRef(0);
  const flashDuration = useRef(0.16);

  const nextEyeFlickerTimer = useRef(1.8 + Math.random() * 4.2);
  const eyeFlickerLife = useRef(0);

  const nextLedFlickerTimer = useRef(3.0 + Math.random() * 5.0);
  const ledFlickerLife = useRef(0);

  // Pre-allocated particle pools
  const sparksRef = useRef<LocalSpark[]>([]);
  if (sparksRef.current.length === 0) {
    for (let i = 0; i < MAX_LOCAL_SPARKS; i++) {
      sparksRef.current.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.25,
        scale: 0.015,
      });
    }
  }

  const smokeRef = useRef<LocalSmoke[]>([]);
  if (smokeRef.current.length === 0) {
    for (let i = 0; i < MAX_SMOKE_PUFFS; i++) {
      smokeRef.current.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.85,
        baseScale: 0.14,
      });
    }
  }

  // ── Procedural Textures, Geometries & Materials ──────────────────────────
  const assets = useMemo(() => {
    const casingTex = createScrap06CasingTexture();
    const chestTex = createChestHazardTexture();
    const serialTex = createSerialPlateTexture();
    const crackedEyeTex = createCrackedEyeTexture();
    const oilTex = createFloorReflectionTexture();
    const smokeTex = createSmokeTexture();

    // Robot Anatomical Geometries
    const torsoGeo = createRoundedBoxGeometry(0.54, 0.58, 0.42, 0.045);
    const headGeo = createRoundedBoxGeometry(0.44, 0.32, 0.36, 0.040);
    const chestPlateGeo = createRoundedBoxGeometry(0.46, 0.28, 0.035, 0.018);
    const sparkGeo = new THREE.BoxGeometry(0.014, 0.014, 0.065);

    // Loose dangling cable from damaged left shoulder down to the floor deck
    const danglingCableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.26, 0.50, 0.12),
      new THREE.Vector3(-0.35, 0.38, 0.18),
      new THREE.Vector3(-0.41, 0.22, 0.24),
      new THREE.Vector3(-0.47, 0.10, 0.30),
      new THREE.Vector3(-0.53, 0.022, 0.36),
      new THREE.Vector3(-0.61, 0.016, 0.42),
    ]);
    const danglingCableGeo = new THREE.TubeGeometry(danglingCableCurve, 20, 0.014, 6, false);

    // Exposed frayed wires at the torn left shoulder socket
    const wireCurves = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.02, 0.02, 0.0),
        new THREE.Vector3(-0.08, 0.05, 0.03),
        new THREE.Vector3(-0.13, 0.02, 0.06),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.02, -0.01, -0.01),
        new THREE.Vector3(-0.07, -0.03, -0.02),
        new THREE.Vector3(-0.11, -0.05, 0.01),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.02, 0.03, 0.01),
        new THREE.Vector3(-0.06, 0.07, 0.03),
        new THREE.Vector3(-0.10, 0.06, 0.06),
      ]),
    ];
    const exposedWireGeos = wireCurves.map(
      (c) => new THREE.TubeGeometry(c, 8, 0.0055, 5, false)
    );

    // Internal exposed wire loops inside the breached chest maintenance bay
    const internalWireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, -0.03, -0.01),
      new THREE.Vector3(-0.01, 0.02, 0.02),
      new THREE.Vector3(0.04, -0.01, 0.01),
      new THREE.Vector3(0.02, -0.04, -0.01),
    ]);
    const internalWiresGeo = new THREE.TubeGeometry(internalWireCurve, 12, 0.004, 5, false);

    // Exposed wire loop at remaining right arm elbow joint
    const elbowWireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, -0.11, 0.02),
      new THREE.Vector3(0.055, -0.16, 0.045),
      new THREE.Vector3(0.02, -0.21, 0.02),
    ]);
    const elbowWireGeo = new THREE.TubeGeometry(elbowWireCurve, 8, 0.0045, 5, false);

    // Scattered broken wire scraps on floor
    const floorWire1 = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.56, 0.012, 0.14),
        new THREE.Vector3(-0.48, 0.015, 0.06),
        new THREE.Vector3(-0.52, 0.012, -0.04),
      ]),
      8,
      0.006,
      5,
      false
    );
    const floorWire2 = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.26, 0.012, 0.42),
        new THREE.Vector3(0.35, 0.014, 0.38),
        new THREE.Vector3(0.41, 0.012, 0.45),
      ]),
      8,
      0.005,
      5,
      false
    );

    // Materials
    const casingMat = new THREE.MeshStandardMaterial({
      map: casingTex,
      roughness: 0.72,
      metalness: 0.22,
    });

    const chestMat = new THREE.MeshStandardMaterial({
      map: chestTex,
      roughness: 0.68,
      metalness: 0.26,
    });

    const serialMat = new THREE.MeshStandardMaterial({
      map: serialTex,
      roughness: 0.62,
      metalness: 0.28,
    });

    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x242a30,
      roughness: 0.70,
      metalness: 0.58,
    });

    const rustedJointMat = new THREE.MeshStandardMaterial({
      color: 0x583420,
      roughness: 0.82,
      metalness: 0.42,
    });

    const brassTrimMat = new THREE.MeshStandardMaterial({
      color: 0x8b7542,
      roughness: 0.58,
      metalness: 0.52,
    });

    const dustMat = new THREE.MeshStandardMaterial({
      color: 0x7a7668,
      roughness: 0.96,
      metalness: 0.02,
      transparent: true,
      opacity: 0.52,
    });

    const crackedEyeMat = new THREE.MeshStandardMaterial({
      map: crackedEyeTex,
      color: 0x7ddcd6,
      emissive: new THREE.Color(0x28e5ea),
      emissiveMap: crackedEyeTex,
      emissiveIntensity: 0.05, // Almost dead; briefly flickers in useFrame
      roughness: 0.22,
      metalness: 0.15,
    });

    const deadEyeMat = new THREE.MeshStandardMaterial({
      color: 0x0a1012,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      roughness: 0.28,
      metalness: 0.35,
    });

    const indicatorLedMat = new THREE.MeshStandardMaterial({
      color: 0x162426,
      emissive: new THREE.Color(0x38e8f5),
      emissiveIntensity: 0.0,
      roughness: 0.3,
    });

    const cableRubberMat = new THREE.MeshStandardMaterial({
      color: 0x16181c,
      roughness: 0.88,
      metalness: 0.12,
    });

    const copperWireMat = new THREE.MeshStandardMaterial({
      color: 0xb86435,
      roughness: 0.42,
      metalness: 0.82,
    });

    const cyanWireMat = new THREE.MeshStandardMaterial({
      color: 0x2a6c75,
      roughness: 0.7,
      metalness: 0.15,
    });

    const floorOilMat = new THREE.MeshStandardMaterial({
      map: oilTex,
      transparent: true,
      opacity: 0.82,
      roughness: 0.18, // Subtle dark floor reflection
      metalness: 0.65,
      depthWrite: false,
    });

    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xaef8ff,
      toneMapped: false,
    });

    const smokeMaterials = Array.from(
      { length: MAX_SMOKE_PUFFS },
      () =>
        new THREE.MeshBasicMaterial({
          map: smokeTex,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
        })
    );

    return {
      casingTex,
      chestTex,
      serialTex,
      crackedEyeTex,
      oilTex,
      smokeTex,
      torsoGeo,
      headGeo,
      chestPlateGeo,
      sparkGeo,
      danglingCableGeo,
      exposedWireGeos,
      internalWiresGeo,
      elbowWireGeo,
      floorWire1,
      floorWire2,
      casingMat,
      chestMat,
      serialMat,
      darkFrameMat,
      rustedJointMat,
      brassTrimMat,
      dustMat,
      crackedEyeMat,
      deadEyeMat,
      indicatorLedMat,
      cableRubberMat,
      copperWireMat,
      cyanWireMat,
      floorOilMat,
      sparkMat,
      smokeMaterials,
    };
  }, []);

  // Dispose procedural GPU resources cleanly on unmount
  useEffect(() => {
    return () => {
      assets.casingTex.dispose();
      assets.chestTex.dispose();
      assets.serialTex.dispose();
      assets.crackedEyeTex.dispose();
      assets.oilTex.dispose();
      assets.smokeTex.dispose();
      assets.torsoGeo.dispose();
      assets.headGeo.dispose();
      assets.chestPlateGeo.dispose();
      assets.sparkGeo.dispose();
      assets.danglingCableGeo.dispose();
      assets.exposedWireGeos.forEach((g) => g.dispose());
      assets.internalWiresGeo.dispose();
      assets.elbowWireGeo.dispose();
      assets.floorWire1.dispose();
      assets.floorWire2.dispose();
      assets.casingMat.dispose();
      assets.chestMat.dispose();
      assets.serialMat.dispose();
      assets.darkFrameMat.dispose();
      assets.rustedJointMat.dispose();
      assets.brassTrimMat.dispose();
      assets.dustMat.dispose();
      assets.crackedEyeMat.dispose();
      assets.deadEyeMat.dispose();
      assets.indicatorLedMat.dispose();
      assets.cableRubberMat.dispose();
      assets.copperWireMat.dispose();
      assets.cyanWireMat.dispose();
      assets.floorOilMat.dispose();
      assets.sparkMat.dispose();
      assets.smokeMaterials.forEach((m) => m.dispose());
    };
  }, [assets]);

  // Spawn a subtle localized cyan-white electrical spark + tiny smoke wisp + spatial audio
  const emitSubtleSpark = () => {
    if (!sparkOriginRef.current) return;
    sparkOriginRef.current.getWorldPosition(_sparkOriginWorld);

    const pPos = playerPositionRef?.current || camera.position;
    const dist = _sparkOriginWorld.distanceTo(pPos);
    if (dist > 22) return; // Lightweight culling when player is far away in ship

    // Local coordinates of spark emission inside root group (near torn shoulder / loose cable)
    const ox = -0.26;
    const oy = 0.48;
    const oz = 0.14;

    // 1. Spawn 10–14 tiny fast cyan-white spark shards
    const count = 10 + Math.floor(Math.random() * 5);
    let spawned = 0;
    for (let i = 0; i < MAX_LOCAL_SPARKS && spawned < count; i++) {
      const sp = sparksRef.current[i];
      if (!sp.active) {
        sp.active = true;
        sp.x = ox + (Math.random() - 0.5) * 0.05;
        sp.y = oy + (Math.random() - 0.5) * 0.04;
        sp.z = oz + (Math.random() - 0.5) * 0.05;
        sp.vx = -0.35 - Math.random() * 0.95;
        sp.vy = 0.35 + Math.random() * 1.15;
        sp.vz = (Math.random() - 0.35) * 1.1;
        sp.life = 0;
        sp.maxLife = 0.14 + Math.random() * 0.18;
        sp.scale = 0.55 + Math.random() * 0.65;
        spawned++;
      }
    }

    // 2. Spawn 2–3 tiny faint smoke wisps
    let smokeSpawned = 0;
    for (let i = 0; i < MAX_SMOKE_PUFFS && smokeSpawned < 2; i++) {
      const sm = smokeRef.current[i];
      if (!sm.active) {
        sm.active = true;
        sm.x = ox + (Math.random() - 0.5) * 0.04;
        sm.y = oy + 0.02;
        sm.z = oz + (Math.random() - 0.5) * 0.04;
        sm.vx = (Math.random() - 0.5) * 0.08;
        sm.vy = 0.18 + Math.random() * 0.12;
        sm.vz = (Math.random() - 0.5) * 0.08;
        sm.life = 0;
        sm.maxLife = 0.65 + Math.random() * 0.45;
        sm.baseScale = 0.09 + Math.random() * 0.07;
        smokeSpawned++;
      }
    }

    // 3. Brief cyan-white local illumination flash (fraction of a second)
    flashDuration.current = 0.11 + Math.random() * 0.1;
    flashLife.current = flashDuration.current;

    // 4. Quiet spatial electrical crackle using existing shipAudio (louder as player approaches)
    if (dist < 15.0) {
      const atten = Math.max(0, 1.0 - dist / 15.0);
      const volume = 0.04 + atten * atten * 0.24;
      shipAudio.play("zap", {
        position: [_sparkOriginWorld.x, _sparkOriginWorld.y, _sparkOriginWorld.z],
        volume,
        pitch: 1.2 + Math.random() * 0.3,
        priority: "low",
      });
    }
  };

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    if (reducedMotion) {
      assets.crackedEyeMat.emissiveIntensity = 0.08;
      assets.indicatorLedMat.emissiveIntensity = 0.05;
      if (sparkLightRef.current) sparkLightRef.current.intensity = 0;
      return;
    }

    // ── A. Cracked Left Eye Occasional Faint Cyan Flicker ──
    nextEyeFlickerTimer.current -= dt;
    if (nextEyeFlickerTimer.current <= 0) {
      eyeFlickerLife.current = 0.18 + Math.random() * 0.28;
      nextEyeFlickerTimer.current = 2.6 + Math.random() * 5.8;
    }
    if (eyeFlickerLife.current > 0) {
      eyeFlickerLife.current = Math.max(0, eyeFlickerLife.current - dt);
      const jitter = Math.random() > 0.35 ? 0.32 + Math.random() * 0.42 : 0.04;
      assets.crackedEyeMat.emissiveIntensity = jitter;
    } else {
      assets.crackedEyeMat.emissiveIntensity = 0.04;
    }

    // ── B. Tiny Indicator Light Occasional Dying Flicker ──
    nextLedFlickerTimer.current -= dt;
    if (nextLedFlickerTimer.current <= 0) {
      ledFlickerLife.current = 0.1 + Math.random() * 0.18;
      nextLedFlickerTimer.current = 3.8 + Math.random() * 6.5;
    }
    if (ledFlickerLife.current > 0) {
      ledFlickerLife.current = Math.max(0, ledFlickerLife.current - dt);
      assets.indicatorLedMat.emissiveIntensity = Math.random() > 0.3 ? 0.9 : 0.05;
    } else {
      assets.indicatorLedMat.emissiveIntensity = 0.0;
    }

    // ── C. Irregular Electrical Spark Scheduler ──
    nextSparkTimer.current -= dt;
    if (nextSparkTimer.current <= 0) {
      emitSubtleSpark();
      // Occasional tiny secondary stutter pop (~28% chance)
      if (Math.random() < 0.28) {
        doublePopTimer.current = 0.11 + Math.random() * 0.12;
      }
      nextSparkTimer.current = 3.2 + Math.random() * 5.4;
    }

    if (doublePopTimer.current !== null) {
      doublePopTimer.current -= dt;
      if (doublePopTimer.current <= 0) {
        emitSubtleSpark();
        doublePopTimer.current = null;
      }
    }

    // ── D. Brief Cyan-White Flash Light Decay ──
    if (sparkLightRef.current) {
      if (flashLife.current > 0) {
        flashLife.current = Math.max(0, flashLife.current - dt);
        const t = flashLife.current / Math.max(0.01, flashDuration.current);
        sparkLightRef.current.intensity = t * t * 2.4;
      } else {
        sparkLightRef.current.intensity = 0;
      }
    }

    // ── E. Update Spark Instanced Particles ──
    if (sparkInstRef.current) {
      let anyUpdated = false;
      for (let i = 0; i < MAX_LOCAL_SPARKS; i++) {
        const sp = sparksRef.current[i];
        if (!sp.active) {
          _vPos.set(0, -100, 0);
          _vScale.set(0.0001, 0.0001, 0.0001);
          _mat4.compose(_vPos, _quat.identity(), _vScale);
          sparkInstRef.current.setMatrixAt(i, _mat4);
          continue;
        }
        anyUpdated = true;
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          sp.active = false;
          _vPos.set(0, -100, 0);
          _vScale.set(0.0001, 0.0001, 0.0001);
          _mat4.compose(_vPos, _quat.identity(), _vScale);
          sparkInstRef.current.setMatrixAt(i, _mat4);
          continue;
        }

        sp.vy -= 5.8 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.z += sp.vz * dt;

        // Bounce cleanly off local floor deck (y = 0.012)
        if (sp.y < 0.012) {
          sp.y = 0.012;
          sp.vy = Math.abs(sp.vy) * 0.35;
          sp.vx *= 0.68;
          sp.vz *= 0.68;
        }

        const fade = 1.0 - sp.life / sp.maxLife;
        _vPos.set(sp.x, sp.y, sp.z);
        _vDir.set(sp.vx, sp.vy, sp.vz);
        if (_vDir.lengthSq() > 0.0001) {
          _vDir.normalize();
          _quat.setFromUnitVectors(_fwd, _vDir);
        } else {
          _quat.identity();
        }
        _vScale.set(sp.scale * fade, sp.scale * fade, sp.scale * (0.8 + fade * 1.1));
        _mat4.compose(_vPos, _quat, _vScale);
        sparkInstRef.current.setMatrixAt(i, _mat4);
      }
      if (anyUpdated || flashLife.current > 0) {
        sparkInstRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // ── F. Update Subtle Rising Smoke Wisps ──
    for (let i = 0; i < MAX_SMOKE_PUFFS; i++) {
      const sm = smokeRef.current[i];
      const mesh = smokeMeshRefs.current[i];
      const mat = assets.smokeMaterials[i];
      if (!mesh) continue;

      if (!sm.active) {
        mesh.visible = false;
        mat.opacity = 0;
        continue;
      }

      sm.life += dt;
      if (sm.life >= sm.maxLife) {
        sm.active = false;
        mesh.visible = false;
        mat.opacity = 0;
        continue;
      }

      sm.x += sm.vx * dt;
      sm.y += sm.vy * dt;
      sm.z += sm.vz * dt;
      const p = sm.life / sm.maxLife;
      const grow = sm.baseScale * (1.0 + p * 1.8);
      mesh.visible = true;
      mesh.position.set(sm.x, sm.y, sm.z);
      mesh.scale.set(grow, grow, grow);
      mesh.lookAt(camera.position);
      mat.opacity = Math.sin(p * Math.PI) * 0.24;
    }
  });

  // Static scattered bolts/screws around the abandoned unit
  const scatteredBolts = useMemo(
    () => [
      { p: [-0.48, 0.012, 0.36] as [number, number, number], r: 0.4, s: 1.0 },
      { p: [-0.34, 0.012, 0.48] as [number, number, number], r: 1.2, s: 0.85 },
      { p: [-0.64, 0.012, 0.18] as [number, number, number], r: 2.1, s: 1.1 },
      { p: [0.24, 0.012, 0.52] as [number, number, number], r: 0.9, s: 0.9 },
      { p: [0.38, 0.012, 0.26] as [number, number, number], r: 1.7, s: 0.8 },
      { p: [-0.14, 0.012, 0.60] as [number, number, number], r: 2.8, s: 0.95 },
      { p: [0.08, 0.012, 0.46] as [number, number, number], r: 0.3, s: 0.75 },
    ],
    []
  );

  return (
    <group
      ref={rootRef}
      name="scrap-06-abandoned-unit"
      position={SCRAP06_POSITION}
      rotation={[0, SCRAP06_ROTATION_Y, 0]}
    >
      {/* ── Floor Oil & Grime Reflection Pool Underneath ── */}
      <mesh
        position={[-0.05, 0.004, 0.20]}
        rotation={[-Math.PI / 2, 0, 0.32]}
        material={assets.floorOilMat}
        receiveShadow
      >
        <planeGeometry args={[1.70, 1.45]} />
      </mesh>

      {/* ══════════════════════════════════════════════════════════════════
          SLUMPED TORSO, BACKPACK & HEAD ASSEMBLY (Tilted back against wall/pillar)
          ══════════════════════════════════════════════════════════════════ */}
      <group position={[0, 0, 0]} rotation={[0.14, 0.06, -0.18]}>
        {/* ── Main Damaged Torso Chassis ── */}
        <group position={[0, 0.32, -0.02]}>
          {/* Rounded Weathered Cream-Yellow Torso Body */}
          <mesh geometry={assets.torsoGeo} material={assets.casingMat} castShadow receiveShadow />

          {/* Dented / Crushed Corner Reinforcement on Upper Left Shoulder */}
          <mesh position={[-0.25, 0.26, 0.14]} rotation={[0.2, -0.25, 0.35]} material={assets.darkFrameMat}>
            <boxGeometry args={[0.09, 0.045, 0.12]} />
          </mesh>
          <mesh position={[0.25, -0.26, 0.16]} rotation={[-0.15, 0.2, -0.28]} material={assets.rustedJointMat}>
            <boxGeometry args={[0.08, 0.04, 0.10]} />
          </mesh>

          {/* Front Chest Armor Plate with Industrial Hazard Stripes */}
          <mesh
            position={[0, 0.07, 0.215]}
            geometry={assets.chestPlateGeo}
            material={assets.chestMat}
            castShadow
            receiveShadow
          />

          {/* Breached Maintenance Bay (Left Chest: Jagged Pried-Open Hatch with Exposed Circuitry) */}
          <group position={[-0.11, 0.05, 0.22]}>
            {/* Recessed dark interior cavity */}
            <mesh position={[0, 0, -0.03]} material={assets.darkFrameMat}>
              <boxGeometry args={[0.18, 0.15, 0.06]} />
            </mesh>
            {/* Burnt internal components */}
            <mesh position={[-0.04, 0.02, -0.015]} material={assets.darkFrameMat}>
              <cylinderGeometry args={[0.02, 0.02, 0.07, 8]} />
            </mesh>
            <mesh position={[0.04, -0.02, -0.015]} material={assets.copperWireMat}>
              <cylinderGeometry args={[0.016, 0.016, 0.06, 8]} />
            </mesh>
            {/* Internal exposed wire loops inside cavity */}
            <mesh geometry={assets.internalWiresGeo} material={assets.copperWireMat} />
            {/* Pried-open bent metal hatch cover hanging ajar */}
            <mesh position={[-0.06, 0, 0.025]} rotation={[0.15, 0.45, -0.32]} material={assets.casingMat}>
              <boxGeometry args={[0.15, 0.14, 0.012]} />
            </mesh>
          </group>

          {/* Lower Tech Grille (Ventilation slats & filter screen) */}
          <group position={[0.07, -0.16, 0.215]}>
            <mesh material={assets.darkFrameMat}>
              <boxGeometry args={[0.30, 0.13, 0.028]} />
            </mesh>
            {/* Slotted horizontal slats */}
            {[-0.04, -0.012, 0.016, 0.044].map((yOff, idx) => (
              <mesh key={`slat-${idx}`} position={[0, yOff, 0.016]} material={assets.brassTrimMat}>
                <boxGeometry args={[0.26, 0.012, 0.01]} />
              </mesh>
            ))}
            {/* Tiny dying indicator LED */}
            <mesh position={[0.11, 0.03, 0.02]} material={assets.indicatorLedMat}>
              <sphereGeometry args={[0.012, 8, 8]} />
            </mesh>
          </group>

          {/* Rear Power Backpack / Energy Core Canister (Resting against cockpit wall/pillar) */}
          <group position={[0, 0.04, -0.24]}>
            {/* Main Power Cylinder */}
            <mesh material={assets.darkFrameMat} castShadow>
              <cylinderGeometry args={[0.14, 0.14, 0.46, 14]} />
            </mesh>
            {/* Upper and lower mounting brackets */}
            <mesh position={[0, 0.18, 0.02]} material={assets.rustedJointMat}>
              <boxGeometry args={[0.34, 0.045, 0.12]} />
            </mesh>
            <mesh position={[0, -0.18, 0.02]} material={assets.rustedJointMat}>
              <boxGeometry args={[0.34, 0.045, 0.12]} />
            </mesh>
            {/* Heat-sink cooling fins */}
            {[-0.10, -0.03, 0.04, 0.11].map((fy, i) => (
              <mesh key={`fin-${i}`} position={[0, fy, 0]} material={assets.casingMat}>
                <cylinderGeometry args={[0.158, 0.158, 0.012, 14]} />
              </mesh>
            ))}
            {/* Charred unpowered power core ring */}
            <mesh position={[0, 0.04, 0]} material={assets.deadEyeMat}>
              <cylinderGeometry args={[0.145, 0.145, 0.10, 14]} />
            </mesh>
          </group>

          {/* ── Heavy Neck Collar & Universal Pivot ── */}
          <group position={[0, 0.31, 0.02]}>
            {/* Rusted outer collar ring */}
            <mesh material={assets.rustedJointMat}>
              <cylinderGeometry args={[0.13, 0.15, 0.08, 14]} />
            </mesh>
            {/* Ribbed rubber flexible sleeve */}
            <mesh position={[0, 0.04, 0]} material={assets.cableRubberMat}>
              <cylinderGeometry args={[0.10, 0.10, 0.06, 12]} />
            </mesh>

            {/* ── Cube-Shaped Head (Tilted Downward, Drooping Lifelessly) ── */}
            <group position={[0, 0.20, 0.02]} rotation={[0.26, -0.08, -0.12]}>
              {/* Main Rounded Cream-Yellow Head Casing */}
              <mesh geometry={assets.headGeo} material={assets.casingMat} castShadow receiveShadow />

              {/* Head Scuff / Dented Corner Brackets */}
              <mesh position={[-0.20, 0.14, 0.12]} rotation={[0.22, -0.3, 0.4]} material={assets.darkFrameMat}>
                <boxGeometry args={[0.065, 0.032, 0.08]} />
              </mesh>
              <mesh position={[0.20, -0.14, 0.13]} rotation={[-0.2, 0.25, -0.35]} material={assets.rustedJointMat}>
                <boxGeometry args={[0.055, 0.028, 0.065]} />
              </mesh>

              {/* Top Reinforcement Cap + Accumulated Dust Layer */}
              <mesh position={[0, 0.168, -0.01]} material={assets.brassTrimMat}>
                <boxGeometry args={[0.32, 0.024, 0.27]} />
              </mesh>
              <mesh position={[0, 0.182, -0.01]} material={assets.dustMat}>
                <boxGeometry args={[0.30, 0.008, 0.25]} />
              </mesh>

              {/* Serial Label Plate ("SCRAP-06") on Side & Cheek */}
              <mesh position={[0.222, -0.01, 0.01]} rotation={[0, Math.PI / 2, 0]} material={assets.serialMat}>
                <planeGeometry args={[0.18, 0.068]} />
              </mesh>
              <mesh position={[0, -0.122, 0.182]} material={assets.serialMat}>
                <planeGeometry args={[0.16, 0.052]} />
              </mesh>

              {/* Recessed Dark Faceplate (Lifeless, No Smile) */}
              <mesh position={[0, 0.015, 0.17]} material={assets.darkFrameMat}>
                <boxGeometry args={[0.34, 0.18, 0.035]} />
              </mesh>

              {/* Left Eye: Cracked & Barely Functional (Faint Cyan Flicker) */}
              <group position={[-0.088, 0.02, 0.188]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={assets.brassTrimMat}>
                  <cylinderGeometry args={[0.066, 0.072, 0.028, 18]} />
                </mesh>
                <mesh position={[0, 0, 0.013]} rotation={[Math.PI / 2, 0, 0]} material={assets.crackedEyeMat}>
                  <cylinderGeometry args={[0.054, 0.054, 0.012, 18]} />
                </mesh>
              </group>

              {/* Right Eye: Completely Dark / Unpowered */}
              <group position={[0.088, 0.014, 0.188]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={assets.rustedJointMat}>
                  <cylinderGeometry args={[0.062, 0.068, 0.028, 18]} />
                </mesh>
                <mesh position={[0, 0, 0.013]} rotation={[Math.PI / 2, 0, 0]} material={assets.deadEyeMat}>
                  <cylinderGeometry args={[0.050, 0.050, 0.012, 18]} />
                </mesh>
              </group>

              {/* Bent & Partially Broken Top Antenna */}
              <group position={[0.13, 0.175, -0.05]}>
                <mesh material={assets.rustedJointMat}>
                  <cylinderGeometry args={[0.022, 0.028, 0.03, 8]} />
                </mesh>
                <mesh position={[-0.022, 0.062, 0.012]} rotation={[0.18, 0, 0.34]} material={assets.darkFrameMat}>
                  <cylinderGeometry args={[0.007, 0.009, 0.13, 6]} />
                </mesh>
                <mesh position={[-0.072, 0.118, 0.036]} rotation={[0.35, 0, 1.18]} material={assets.rustedJointMat}>
                  <cylinderGeometry args={[0.0055, 0.007, 0.085, 6]} />
                </mesh>
                <mesh position={[-0.115, 0.125, 0.05]} rotation={[0.2, 0.4, 1.5]} material={assets.copperWireMat}>
                  <cylinderGeometry args={[0.0022, 0.0022, 0.032, 4]} />
                </mesh>
              </group>
            </group>
          </group>

          {/* ── Damaged Left Shoulder Socket (Arm Completely Missing) ── */}
          <group position={[-0.27, 0.18, 0.03]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={assets.rustedJointMat}>
              <cylinderGeometry args={[0.056, 0.068, 0.055, 12]} />
            </mesh>
            <mesh position={[-0.025, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={assets.darkFrameMat}>
              <cylinderGeometry args={[0.040, 0.040, 0.025, 12]} />
            </mesh>
            {/* Exposed jagged sheared bolts */}
            {[-0.03, 0.03].map((by, i) => (
              <mesh key={`bolt-sh-${i}`} position={[-0.03, by, 0.02]} rotation={[0, 0, Math.PI / 2]} material={assets.copperWireMat}>
                <cylinderGeometry args={[0.006, 0.006, 0.025, 6]} />
              </mesh>
            ))}
            {/* Exposed wire stubs spilling directly out of the torn socket */}
            <mesh geometry={assets.exposedWireGeos[0]} material={assets.copperWireMat} />
            <mesh geometry={assets.exposedWireGeos[1]} material={assets.cyanWireMat} />
            <mesh geometry={assets.exposedWireGeos[2]} material={assets.copperWireMat} />
          </group>

          {/* ── Remaining Right Arm (Hanging Limp at Unnatural Angle to Deck) ── */}
          <group position={[0.27, 0.18, 0.03]} rotation={[0.35, -0.15, 0.58]}>
            {/* Shoulder Ball Joint */}
            <mesh material={assets.rustedJointMat}>
              <sphereGeometry args={[0.052, 10, 10]} />
            </mesh>
            {/* Upper Arm Cylinder */}
            <mesh position={[0, -0.13, 0]} material={assets.casingMat}>
              <cylinderGeometry args={[0.026, 0.022, 0.26, 8]} />
            </mesh>
            {/* Exposed Wire Loop at Damaged Elbow */}
            <mesh geometry={assets.elbowWireGeo} material={assets.copperWireMat} />
            {/* Forearm & Hand Resting on Floor Deck */}
            <group position={[0, -0.26, 0]} rotation={[0.72, 0.22, -0.42]}>
              <mesh material={assets.darkFrameMat}>
                <sphereGeometry args={[0.035, 8, 8]} />
              </mesh>
              <mesh position={[0, -0.12, 0]} material={assets.brassTrimMat}>
                <cylinderGeometry args={[0.020, 0.016, 0.24, 8]} />
              </mesh>
              {/* Maintenance Clamp Hand */}
              <group position={[0, -0.25, 0]}>
                <mesh material={assets.darkFrameMat}>
                  <boxGeometry args={[0.052, 0.038, 0.048]} />
                </mesh>
                <mesh position={[-0.018, -0.036, 0.01]} rotation={[0.15, 0, 0.22]} material={assets.rustedJointMat}>
                  <boxGeometry args={[0.012, 0.048, 0.020]} />
                </mesh>
                <mesh position={[0.018, -0.036, 0.01]} rotation={[0.15, 0, -0.22]} material={assets.rustedJointMat}>
                  <boxGeometry args={[0.012, 0.048, 0.020]} />
                </mesh>
              </group>
            </group>
          </group>

          {/* ── Collapsed Legs (Articulated, Buckled Under the Torso) ── */}
          {/* Left Leg: Buckled awkwardly mid-stride */}
          <group position={[-0.16, -0.26, 0.05]} rotation={[0.95, -0.42, 0.38]}>
            <mesh material={assets.rustedJointMat}>
              <sphereGeometry args={[0.046, 10, 10]} />
            </mesh>
            <mesh position={[0, -0.13, 0]} material={assets.casingMat}>
              <cylinderGeometry args={[0.026, 0.022, 0.26, 8]} />
            </mesh>
            <group position={[0, -0.26, 0]} rotation={[-1.42, 0.15, -0.25]}>
              <mesh material={assets.darkFrameMat}>
                <sphereGeometry args={[0.034, 8, 8]} />
              </mesh>
              <mesh position={[0, -0.12, 0]} material={assets.brassTrimMat}>
                <cylinderGeometry args={[0.020, 0.016, 0.24, 8]} />
              </mesh>
              <mesh position={[0, -0.24, 0.025]} rotation={[0.35, 0, 0]} material={assets.darkFrameMat}>
                <boxGeometry args={[0.08, 0.03, 0.13]} />
              </mesh>
            </group>
          </group>

          {/* Right Leg: Stretched flat along the cockpit floor deck */}
          <group position={[0.16, -0.26, 0.05]} rotation={[1.32, 0.28, -0.15]}>
            <mesh material={assets.rustedJointMat}>
              <sphereGeometry args={[0.046, 10, 10]} />
            </mesh>
            <mesh position={[0, -0.14, 0]} material={assets.casingMat}>
              <cylinderGeometry args={[0.026, 0.022, 0.28, 8]} />
            </mesh>
            <group position={[0, -0.28, 0]} rotation={[-0.45, -0.12, 0.08]}>
              <mesh material={assets.darkFrameMat}>
                <sphereGeometry args={[0.034, 8, 8]} />
              </mesh>
              <mesh position={[0, -0.12, 0]} material={assets.brassTrimMat}>
                <cylinderGeometry args={[0.020, 0.016, 0.24, 8]} />
              </mesh>
              <mesh position={[0, -0.24, 0.03]} rotation={[-0.78, 0, 0.15]} material={assets.darkFrameMat}>
                <boxGeometry args={[0.08, 0.03, 0.13]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ── Dangling Heavy Power Cable (from torn shoulder to floor deck) ── */}
      <mesh geometry={assets.danglingCableGeo} material={assets.cableRubberMat} />

      {/* ── Subtle Spark Emission Point & Local Flash Light ── */}
      <object3D ref={sparkOriginRef} position={[-0.26, 0.48, 0.14]} />
      <pointLight
        ref={sparkLightRef}
        position={[-0.25, 0.50, 0.16]}
        color="#84f5ff"
        intensity={0}
        distance={4.2}
        decay={2}
      />

      {/* Lightweight Spark Shards Instanced Pool */}
      <instancedMesh
        ref={sparkInstRef}
        args={[assets.sparkGeo, assets.sparkMat, MAX_LOCAL_SPARKS]}
        frustumCulled={false}
      />

      {/* Tiny Post-Spark Smoke Wisps */}
      {assets.smokeMaterials.map((mat, i) => (
        <mesh
          key={`smoke-${i}`}
          ref={(el) => {
            smokeMeshRefs.current[i] = el;
          }}
          visible={false}
          material={mat}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}

      {/* ══════════════════════════════════════════════════════════════════
          SCATTERED MECHANICAL DEBRIS (Screws, Broken Wires, Casing Scraps)
          ══════════════════════════════════════════════════════════════════ */}
      <mesh geometry={assets.floorWire1} material={assets.cableRubberMat} />
      <mesh geometry={assets.floorWire2} material={assets.copperWireMat} />

      {/* Small Detached Broken Arm / Machinery Fragment Lying Nearby */}
      <group position={[-0.48, 0.024, 0.44]} rotation={[0.12, 0.85, 1.48]}>
        <mesh material={assets.casingMat}>
          <cylinderGeometry args={[0.02, 0.016, 0.18, 7]} />
        </mesh>
        <mesh position={[0, -0.095, 0]} material={assets.rustedJointMat}>
          <boxGeometry args={[0.042, 0.036, 0.038]} />
        </mesh>
      </group>

      {/* Chipped Yellow Casing Shard & Dented Plate on Deck */}
      <mesh position={[0.28, 0.01, 0.34]} rotation={[0, 0.65, 0]} material={assets.casingMat}>
        <boxGeometry args={[0.095, 0.012, 0.068]} />
      </mesh>
      <mesh position={[-0.26, 0.012, 0.48]} rotation={[0.08, -0.5, 0.04]} material={assets.darkFrameMat}>
        <boxGeometry args={[0.075, 0.015, 0.055]} />
      </mesh>

      {/* Scattered Hex Bolts & Screws */}
      {scatteredBolts.map((b, i) => (
        <mesh
          key={`bolt-${i}`}
          position={b.p}
          rotation={[Math.PI / 2, b.r, 0]}
          scale={b.s}
          material={i % 2 === 0 ? assets.darkFrameMat : assets.rustedJointMat}
        >
          <cylinderGeometry args={[0.009, 0.009, 0.024, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export default Scrap06Unit;
