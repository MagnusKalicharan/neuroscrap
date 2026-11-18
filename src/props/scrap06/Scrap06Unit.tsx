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
export const SCRAP06_SCAN_TARGET = new THREE.Vector3(-10.58, FLOOR_Y + 0.36, -38.7);

/** Solid AABB collider registered in shipModel.ts so the player cannot walk through SCRAP-06 */
export const SCRAP06_COLLIDER = {
  id: "scrap-06",
  minX: -11.0,
  maxX: -10.18,
  minZ: -39.18,
  maxZ: -38.22,
  minY: 0.0,
  maxY: 1.0,
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

// ── 2. Damaged Serial-Number Label Plate ("SCRAP-06") ─────────────────────
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

// ── 3. Cracked Cyan-Greenish Eye Display Texture ──────────────────────────
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

// ── 4. Subtle Floor Grime / Oil Reflection Patch Texture ──────────────────
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

// ── 5. Soft Smoke Wisp Texture ────────────────────────────────────────────
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

// ── Rounded Cube Geometry Builder (matches reference robot's soft boxy head) ──
function createRoundedHeadGeometry(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
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

  // Normalize planar/box UVs so the weathered canvas texture maps cleanly across all faces
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
      uv.setXY(i, (px / w) + 0.5, (py / h) + 0.5);
    } else if (nx >= ny) {
      uv.setXY(i, (pz / d) + 0.5, (py / h) + 0.5);
    } else {
      uv.setXY(i, (px / w) + 0.5, (pz / d) + 0.5);
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
    const serialTex = createSerialPlateTexture();
    const crackedEyeTex = createCrackedEyeTexture();
    const oilTex = createFloorReflectionTexture();
    const smokeTex = createSmokeTexture();

    const headGeo = createRoundedHeadGeometry(0.45, 0.34, 0.37, 0.042);
    const sparkGeo = new THREE.BoxGeometry(0.014, 0.014, 0.065);

    // Loose dangling cable from damaged left shoulder down to the floor
    const danglingCableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, 0.31, 0.02),
      new THREE.Vector3(-0.34, 0.22, 0.09),
      new THREE.Vector3(-0.39, 0.09, 0.17),
      new THREE.Vector3(-0.46, 0.022, 0.25),
      new THREE.Vector3(-0.54, 0.018, 0.31),
    ]);
    const danglingCableGeo = new THREE.TubeGeometry(danglingCableCurve, 18, 0.014, 6, false);

    // Exposed frayed wires at the torn left shoulder socket
    const wireCurves = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.22, 0.33, 0.04),
        new THREE.Vector3(-0.31, 0.31, 0.08),
        new THREE.Vector3(-0.35, 0.25, 0.11),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.22, 0.31, -0.02),
        new THREE.Vector3(-0.30, 0.26, -0.04),
        new THREE.Vector3(-0.33, 0.19, 0.0),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.22, 0.35, 0.01),
        new THREE.Vector3(-0.28, 0.38, 0.06),
        new THREE.Vector3(-0.32, 0.34, 0.09),
      ]),
    ];
    const exposedWireGeos = wireCurves.map(
      (c) => new THREE.TubeGeometry(c, 8, 0.0055, 5, false)
    );

    // Exposed wire loop at remaining right arm elbow joint
    const elbowWireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, -0.09, 0.02),
      new THREE.Vector3(0.055, -0.14, 0.045),
      new THREE.Vector3(0.02, -0.19, 0.02),
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

    const serialMat = new THREE.MeshStandardMaterial({
      map: serialTex,
      roughness: 0.62,
      metalness: 0.28,
    });

    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x262d35,
      roughness: 0.68,
      metalness: 0.58,
    });

    const rustedJointMat = new THREE.MeshStandardMaterial({
      color: 0x5c3622,
      roughness: 0.82,
      metalness: 0.45,
    });

    const brassTrimMat = new THREE.MeshStandardMaterial({
      color: 0x8f7946,
      roughness: 0.58,
      metalness: 0.55,
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
      color: 0x0b1215,
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
      color: 0x171a1f,
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
      serialTex,
      crackedEyeTex,
      oilTex,
      smokeTex,
      headGeo,
      sparkGeo,
      danglingCableGeo,
      exposedWireGeos,
      elbowWireGeo,
      floorWire1,
      floorWire2,
      casingMat,
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
      assets.serialTex.dispose();
      assets.crackedEyeTex.dispose();
      assets.oilTex.dispose();
      assets.smokeTex.dispose();
      assets.headGeo.dispose();
      assets.sparkGeo.dispose();
      assets.danglingCableGeo.dispose();
      assets.exposedWireGeos.forEach((g) => g.dispose());
      assets.elbowWireGeo.dispose();
      assets.floorWire1.dispose();
      assets.floorWire2.dispose();
      assets.casingMat.dispose();
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
    const ox = -0.32;
    const oy = 0.24;
    const oz = 0.10;

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
        sparkLightRef.current.intensity = t * t * 2.2;
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

        // Bounce cleanly off local floor deck (y = 0.01)
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
      { p: [-0.46, 0.012, 0.36] as [number, number, number], r: 0.4, s: 1.0 },
      { p: [-0.34, 0.012, 0.48] as [number, number, number], r: 1.2, s: 0.85 },
      { p: [-0.62, 0.012, 0.18] as [number, number, number], r: 2.1, s: 1.1 },
      { p: [0.22, 0.012, 0.52] as [number, number, number], r: 0.9, s: 0.9 },
      { p: [0.36, 0.012, 0.26] as [number, number, number], r: 1.7, s: 0.8 },
      { p: [-0.14, 0.012, 0.58] as [number, number, number], r: 2.8, s: 0.95 },
      { p: [0.05, 0.012, 0.44] as [number, number, number], r: 0.3, s: 0.75 },
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
      {/* ── Subtle Floor Reflection / Oil & Grime Pool Underneath ── */}
      <mesh
        position={[-0.08, 0.004, 0.16]}
        rotation={[-Math.PI / 2, 0, 0.35]}
        material={assets.floorOilMat}
        receiveShadow
      >
        <planeGeometry args={[1.45, 1.25]} />
      </mesh>

      {/* ══════════════════════════════════════════════════════════════════
          SLUMPED BODY & HEAD ASSEMBLY (Leaning against wall, tilted sideways)
          ══════════════════════════════════════════════════════════════════ */}
      <group position={[0, 0.17, -0.02]} rotation={[0.16, 0.08, -0.22]}>
        {/* ── Compact Lower Pelvis / Chassis Block ── */}
        <mesh position={[0, 0, 0]} material={assets.darkFrameMat} castShadow receiveShadow>
          <boxGeometry args={[0.27, 0.15, 0.23]} />
        </mesh>

        {/* Rusted lower joint trim collar */}
        <mesh position={[0, 0.075, 0]} material={assets.rustedJointMat}>
          <cylinderGeometry args={[0.11, 0.125, 0.045, 12]} />
        </mesh>

        {/* Tiny Indicator Light on lower front chassis (occasionally flickers faintly) */}
        <mesh position={[0.085, 0.02, 0.118]} material={assets.indicatorLedMat}>
          <sphereGeometry args={[0.013, 8, 8]} />
        </mesh>

        {/* ── Cube-Shaped Rounded-Corner Head (Tilted Slightly Downward, Lifeless) ── */}
        <group position={[0, 0.26, 0.02]} rotation={[0.24, -0.06, -0.08]}>
          {/* Main Rounded Cream-Yellow Metal Head Casing */}
          <mesh geometry={assets.headGeo} material={assets.casingMat} castShadow receiveShadow />

          {/* Corner Dent / Battered Scuff Plates on Top-Left & Bottom-Right Corners */}
          <mesh position={[-0.205, 0.145, 0.13]} rotation={[0.22, -0.3, 0.4]} material={assets.darkFrameMat}>
            <boxGeometry args={[0.065, 0.032, 0.08]} />
          </mesh>
          <mesh position={[0.20, -0.145, 0.14]} rotation={[-0.2, 0.25, -0.35]} material={assets.rustedJointMat}>
            <boxGeometry args={[0.055, 0.028, 0.065]} />
          </mesh>

          {/* Top Reinforcement Cap + Accumulated Dust Layer */}
          <mesh position={[0, 0.178, -0.01]} material={assets.brassTrimMat}>
            <boxGeometry args={[0.32, 0.024, 0.27]} />
          </mesh>
          <mesh position={[0, 0.193, -0.01]} material={assets.dustMat}>
            <boxGeometry args={[0.30, 0.008, 0.25]} />
          </mesh>

          {/* Damaged Serial-Number Label Plate ("SCRAP-06") on Right Side & Lower Cheek */}
          <mesh position={[0.227, -0.01, 0.01]} rotation={[0, Math.PI / 2, 0]} material={assets.serialMat}>
            <planeGeometry args={[0.18, 0.068]} />
          </mesh>
          <mesh position={[0, -0.128, 0.188]} material={assets.serialMat}>
            <planeGeometry args={[0.16, 0.052]} />
          </mesh>

          {/* ── Recessed Dark Faceplate (Lifeless, NO Smile / Mouth) ── */}
          <mesh position={[0, 0.015, 0.175]} material={assets.darkFrameMat}>
            <boxGeometry args={[0.35, 0.185, 0.035]} />
          </mesh>

          {/* ── Left Eye: Cracked & Barely Functional (Occasional Faint Cyan Flicker) ── */}
          <group position={[-0.088, 0.02, 0.192]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={assets.brassTrimMat}>
              <cylinderGeometry args={[0.066, 0.072, 0.028, 18]} />
            </mesh>
            <mesh position={[0, 0, 0.013]} rotation={[Math.PI / 2, 0, 0]} material={assets.crackedEyeMat}>
              <cylinderGeometry args={[0.054, 0.054, 0.012, 18]} />
            </mesh>
          </group>

          {/* ── Right Eye: Completely Dark / Unpowered ── */}
          <group position={[0.088, 0.014, 0.192]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={assets.rustedJointMat}>
              <cylinderGeometry args={[0.062, 0.068, 0.028, 18]} />
            </mesh>
            <mesh position={[0, 0, 0.013]} rotation={[Math.PI / 2, 0, 0]} material={assets.deadEyeMat}>
              <cylinderGeometry args={[0.050, 0.050, 0.012, 18]} />
            </mesh>
          </group>

          {/* ── Bent & Partially Broken Top Antenna ── */}
          <group position={[0.13, 0.185, -0.05]}>
            {/* Rusted Base Mount */}
            <mesh material={assets.rustedJointMat}>
              <cylinderGeometry args={[0.022, 0.028, 0.03, 8]} />
            </mesh>
            {/* Lower Bent Segment */}
            <mesh position={[-0.022, 0.062, 0.012]} rotation={[0.18, 0, 0.34]} material={assets.darkFrameMat}>
              <cylinderGeometry args={[0.007, 0.009, 0.13, 6]} />
            </mesh>
            {/* Sharp Kinked Upper Broken Stub (missing top tip) */}
            <mesh position={[-0.072, 0.118, 0.036]} rotation={[0.35, 0, 1.18]} material={assets.rustedJointMat}>
              <cylinderGeometry args={[0.0055, 0.007, 0.085, 6]} />
            </mesh>
            {/* Tiny frayed snapped wire at broken tip */}
            <mesh position={[-0.115, 0.125, 0.05]} rotation={[0.2, 0.4, 1.5]} material={assets.copperWireMat}>
              <cylinderGeometry args={[0.0022, 0.0022, 0.032, 4]} />
            </mesh>
          </group>
        </group>

        {/* ── Damaged Left Shoulder Socket (Arm Completely Missing) ── */}
        <group position={[-0.145, 0.05, 0.01]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={assets.rustedJointMat}>
            <cylinderGeometry args={[0.048, 0.056, 0.045, 10]} />
          </mesh>
          <mesh position={[-0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={assets.darkFrameMat}>
            <cylinderGeometry args={[0.034, 0.034, 0.02, 10]} />
          </mesh>
        </group>

        {/* ── Remaining Right Arm (Hanging Loosely at Unnatural Angle onto Floor) ── */}
        <group position={[0.155, 0.045, 0.02]} rotation={[0.32, -0.18, 0.62]}>
          {/* Rusted Shoulder Ball Joint */}
          <mesh material={assets.rustedJointMat}>
            <sphereGeometry args={[0.042, 10, 10]} />
          </mesh>
          {/* Thin Upper Arm Strut */}
          <mesh position={[0, -0.105, 0]} material={assets.casingMat}>
            <cylinderGeometry args={[0.022, 0.018, 0.21, 8]} />
          </mesh>
          {/* Exposed Wire Loop Near Damaged Elbow Joint */}
          <mesh geometry={assets.elbowWireGeo} material={assets.copperWireMat} />
          {/* Limp Articulated Elbow & Forearm Resting on Floor */}
          <group position={[0, -0.21, 0]} rotation={[0.78, 0.25, -0.45]}>
            <mesh material={assets.darkFrameMat}>
              <sphereGeometry args={[0.03, 8, 8]} />
            </mesh>
            <mesh position={[0, -0.095, 0]} material={assets.brassTrimMat}>
              <cylinderGeometry args={[0.017, 0.014, 0.19, 8]} />
            </mesh>
            {/* Small Maintenance Clamp Hand */}
            <group position={[0, -0.20, 0]}>
              <mesh material={assets.darkFrameMat}>
                <boxGeometry args={[0.044, 0.032, 0.04]} />
              </mesh>
              <mesh position={[-0.016, -0.032, 0.008]} rotation={[0.15, 0, 0.22]} material={assets.rustedJointMat}>
                <boxGeometry args={[0.01, 0.042, 0.016]} />
              </mesh>
              <mesh position={[0.016, -0.032, 0.008]} rotation={[0.15, 0, -0.22]} material={assets.rustedJointMat}>
                <boxGeometry args={[0.01, 0.042, 0.016]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ══════════════════════════════════════════════════════════════════
          COLLAPSED THIN ARTICULATED MECHANICAL LEGS
          ══════════════════════════════════════════════════════════════════ */}
      {/* ── Left Leg: Bent Awkwardly as Though Collapsed Mid-Step ── */}
      <group position={[-0.11, 0.12, 0.03]} rotation={[0.92, -0.48, 0.35]}>
        <mesh material={assets.rustedJointMat}>
          <sphereGeometry args={[0.038, 10, 10]} />
        </mesh>
        <mesh position={[0, -0.105, 0]} material={assets.casingMat}>
          <cylinderGeometry args={[0.022, 0.018, 0.21, 8]} />
        </mesh>
        <group position={[0, -0.21, 0]} rotation={[-1.48, 0.12, -0.22]}>
          <mesh material={assets.darkFrameMat}>
            <sphereGeometry args={[0.028, 8, 8]} />
          </mesh>
          <mesh position={[0, -0.105, 0]} material={assets.brassTrimMat}>
            <cylinderGeometry args={[0.017, 0.014, 0.21, 8]} />
          </mesh>
          <mesh position={[0, -0.215, 0.02]} rotation={[0.35, 0, 0]} material={assets.darkFrameMat}>
            <boxGeometry args={[0.068, 0.024, 0.11]} />
          </mesh>
        </group>
      </group>

      {/* ── Right Leg: Slumped Outstretched Resting Against Floor ── */}
      <group position={[0.10, 0.11, 0.04]} rotation={[1.28, 0.32, -0.18]}>
        <mesh material={assets.rustedJointMat}>
          <sphereGeometry args={[0.038, 10, 10]} />
        </mesh>
        <mesh position={[0, -0.11, 0]} material={assets.casingMat}>
          <cylinderGeometry args={[0.022, 0.018, 0.22, 8]} />
        </mesh>
        <group position={[0, -0.22, 0]} rotation={[-0.42, -0.15, 0.1]}>
          <mesh material={assets.darkFrameMat}>
            <sphereGeometry args={[0.028, 8, 8]} />
          </mesh>
          <mesh position={[0, -0.105, 0]} material={assets.brassTrimMat}>
            <cylinderGeometry args={[0.017, 0.014, 0.21, 8]} />
          </mesh>
          <mesh position={[0, -0.215, 0.025]} rotation={[-0.82, 0, 0.15]} material={assets.darkFrameMat}>
            <boxGeometry args={[0.068, 0.024, 0.11]} />
          </mesh>
        </group>
      </group>

      {/* ══════════════════════════════════════════════════════════════════
          EXPOSED WIRING & LOOSE HANGING CABLE ON DAMAGED SIDE
          ══════════════════════════════════════════════════════════════════ */}
      <mesh geometry={assets.danglingCableGeo} material={assets.cableRubberMat} />
      <mesh geometry={assets.exposedWireGeos[0]} material={assets.copperWireMat} />
      <mesh geometry={assets.exposedWireGeos[1]} material={assets.cyanWireMat} />
      <mesh geometry={assets.exposedWireGeos[2]} material={assets.copperWireMat} />

      {/* Spark Emission Anchor & Brief Local Cyan-White Flash Light */}
      <object3D ref={sparkOriginRef} position={[-0.32, 0.24, 0.10]} />
      <pointLight
        ref={sparkLightRef}
        position={[-0.30, 0.26, 0.14]}
        color="#84f5ff"
        intensity={0}
        distance={3.8}
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
