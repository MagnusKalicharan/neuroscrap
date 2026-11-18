"use client";
/**
 * AlienLandscape.tsx — Dramatic Jagged Canyon Horizon, Atmospheric Airglow & Rocky Scree Field
 * ============================================================================================
 * Transforms the alien planet exterior from a flat square plane into a cinematic, rugged
 * volcanic/desert canyon world silhouetted against a luminous teal-silver horizon airglow
 * and deep cobalt Milky Way night sky.
 *
 * Components:
 * - HorizonAirglowDome: Subtle luminous pale teal-cyan & slate-silver horizon glow band
 *   fading seamlessly into deep space so the ray-marched Black Hole & Milky Way shine above.
 * - HorizonCanyonRing: 360° dual-layered silhouetted jagged crags, stratified mesas, and
 *   towering distant canyon spires ringing the outer perimeter (r = 76..185m), eliminating
 *   any visible terrain plane edge.
 * - AlienRockField: 2 lightweight InstancedMesh draw calls scattering ~340 angular basalt
 *   rocks, jagged slabs, and scree pebbles across the exterior regolith (strictly clear of
 *   the starship hull, egress ramps, and rescue saucer landing zone).
 */
import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Deterministic PRNG for consistent landscape generation
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

// ── 1. High-Detail Procedural Regolith Albedo & Bump Maps ──────────────────
export function generateRegolithMaps(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext("2d")!;

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext("2d")!;

  const rand = mulberry32(84219);

  // Dark weathered volcanic basalt / dusty alien desert soil base
  cCtx.fillStyle = "#1d1f26";
  cCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = "#7c7c7c";
  bCtx.fillRect(0, 0, size, size);

  // Large mottled dusty regolith & dark basalt mineral strata patches
  for (let i = 0; i < 180; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 28 + rand() * 115;
    const warm = rand() > 0.58;
    const dark = rand() > 0.48;

    const cg = cCtx.createRadialGradient(x, y, 0, x, y, r);
    if (dark) {
      cg.addColorStop(0, "rgba(12, 13, 18, 0.55)");
      cg.addColorStop(1, "rgba(12, 13, 18, 0)");
    } else if (warm) {
      cg.addColorStop(0, "rgba(62, 52, 44, 0.38)");
      cg.addColorStop(1, "rgba(62, 52, 44, 0)");
    } else {
      cg.addColorStop(0, "rgba(52, 60, 74, 0.35)");
      cg.addColorStop(1, "rgba(52, 60, 74, 0)");
    }
    cCtx.fillStyle = cg;
    cCtx.beginPath();
    cCtx.arc(x, y, r, 0, Math.PI * 2);
    cCtx.fill();

    // Matching low-frequency rocky undulation in bump map
    const bg = bCtx.createRadialGradient(x, y, 0, x, y, r);
    const bv = dark ? 52 : 178;
    bg.addColorStop(0, `rgba(${bv}, ${bv}, ${bv}, 0.32)`);
    bg.addColorStop(1, `rgba(${bv}, ${bv}, ${bv}, 0)`);
    bCtx.fillStyle = bg;
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Subtle wind-carved dust & regolith ripple streaks
  for (let i = 0; i < 160; i++) {
    const y = rand() * size;
    const x = rand() * size;
    const len = 60 + rand() * 200;
    const thick = 2 + rand() * 7;
    cCtx.fillStyle = rand() > 0.5 ? "rgba(74, 70, 64, 0.14)" : "rgba(10, 12, 16, 0.18)";
    cCtx.fillRect(x, y, len, thick);

    bCtx.fillStyle = rand() > 0.5 ? "rgba(210, 210, 210, 0.14)" : "rgba(45, 45, 45, 0.16)";
    bCtx.fillRect(x, y, len, thick);
  }

  // Scattered small rocky crevices & fracture veins
  for (let i = 0; i < 90; i++) {
    let x = rand() * size;
    let y = rand() * size;
    cCtx.strokeStyle = "rgba(8, 9, 12, 0.58)";
    cCtx.lineWidth = 1.0 + rand() * 2.2;
    bCtx.strokeStyle = "rgba(22, 22, 22, 0.65)";
    bCtx.lineWidth = 1.4 + rand() * 2.5;
    cCtx.beginPath();
    bCtx.beginPath();
    cCtx.moveTo(x, y);
    bCtx.moveTo(x, y);
    const segs = 3 + Math.floor(rand() * 4);
    for (let s = 0; s < segs; s++) {
      x += (rand() - 0.5) * 44;
      y += (rand() - 0.5) * 44;
      cCtx.lineTo(x, y);
      bCtx.lineTo(x, y);
    }
    cCtx.stroke();
    bCtx.stroke();
  }

  // Micro-impact pits & embedded pebbles (gives crisp close-up rocky texture)
  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.5 + rand() * 6.5;
    const isPebble = rand() > 0.42;

    if (isPebble) {
      const shade = 36 + Math.floor(rand() * 52);
      cCtx.fillStyle = `rgb(${shade + 4}, ${shade + 2}, ${shade + 6})`;
      cCtx.beginPath();
      cCtx.ellipse(x, y, r, r * (0.6 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2);
      cCtx.fill();

      bCtx.fillStyle = "rgba(235, 235, 235, 0.68)";
      bCtx.beginPath();
      bCtx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
      bCtx.fill();
    } else {
      // Micro crater pit
      cCtx.fillStyle = "rgba(9, 10, 14, 0.62)";
      cCtx.beginPath();
      cCtx.arc(x, y, r, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.strokeStyle = "rgba(86, 82, 76, 0.35)";
      cCtx.lineWidth = 1.2;
      cCtx.stroke();

      bCtx.fillStyle = "rgba(28, 28, 28, 0.72)";
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.strokeStyle = "rgba(215, 215, 215, 0.45)";
      bCtx.lineWidth = 1.4;
      bCtx.stroke();
    }
  }

  // Fine mineral grain speckles
  for (let i = 0; i < 4500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const bright = rand() > 0.55;
    cCtx.fillStyle = bright ? "rgba(135, 140, 150, 0.16)" : "rgba(6, 7, 10, 0.25)";
    cCtx.fillRect(x, y, 2, 2);
    bCtx.fillStyle = bright ? "rgba(210, 210, 210, 0.25)" : "rgba(40, 40, 40, 0.25)";
    bCtx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(20, 20);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(20, 20);
  bumpMap.anisotropy = 4;

  return { map, bumpMap };
}

// ── 2. Procedural Stratified Rock Texture (Shared by Boulders & Scree) ─────
export function generateBasaltRockTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(314159);

  ctx.fillStyle = "#1c1f27";
  ctx.fillRect(0, 0, size, size);

  // Horizontal sedimentary / volcanic strata bands
  for (let y = 0; y < size; y += 6) {
    const h = 3 + rand() * 8;
    const v = 20 + Math.floor(rand() * 28);
    ctx.fillStyle = `rgb(${v + 4}, ${v + 2}, ${v + 5})`;
    ctx.fillRect(0, y, size, h);
  }

  // Dark crevices & weathered mineral mottling
  for (let i = 0; i < 220; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 16;
    ctx.fillStyle = rand() > 0.5 ? "rgba(10, 11, 15, 0.48)" : "rgba(78, 72, 66, 0.24)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── 3. Noise-Displaced Craggy Rock Geometry Helper ─────────────────────────
export function createCraggyRockGeometry(
  seed: number,
  detail = 1,
  flattenTop = false
): THREE.BufferGeometry {
  const geom = new THREE.IcosahedronGeometry(1, detail);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Deterministic 3D trigonometric ridge noise (creates sharp rocky facets & strata ledges)
    const n1 =
      Math.sin(v.x * 3.1 + seed) *
      Math.cos(v.y * 2.7 - seed * 0.7) *
      Math.sin(v.z * 3.4 + seed * 1.3);
    const n2 =
      Math.cos(v.x * 6.5 - v.z * 5.2 + seed * 2.1) *
      Math.sin(v.y * 7.8 + seed * 0.4);
    // Layered strata step effect along Y
    const strata = Math.sin(v.y * 11.0 + seed) * 0.06;
    let disp = 1.0 + n1 * 0.28 + n2 * 0.1 + strata;
    v.multiplyScalar(disp);

    // Optional flat mesa-like shoulder / top
    if (flattenTop && v.y > 0.45) {
      v.y = 0.45 + (v.y - 0.45) * 0.28;
    }
    // Flatten bottom slightly so rock sits firmly embedded in the ground
    if (v.y < -0.55) {
      v.y = -0.55 + (v.y + 0.55) * 0.35;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geom.computeVertexNormals();
  return geom;
}

// ── 4. Luminous Horizon Airglow Dome (Teal-Silver Rim Glow Behind Mesas) ──
const HORIZON_GLOW_VERT = `
varying vec3 vWorldDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const HORIZON_GLOW_FRAG = `
precision mediump float;
varying vec3 vWorldDir;

void main() {
  // Elevation angle above/below horizon
  float elev = vWorldDir.y;

  // Tight luminous pale teal-silver airglow hugging the horizon behind the jagged crags
  float lowBand = exp(-pow(max(0.0, elev - 0.015) / 0.115, 1.55)) * smoothstep(-0.08, 0.01, elev);
  // Broader midnight-teal / indigo atmospheric lift extending softly into lower sky
  float highBand = exp(-pow(max(0.0, elev) / 0.30, 1.35)) * smoothstep(-0.04, 0.02, elev);

  // Subtle natural azimuthal brightness variation (brighter near galactic/black-hole quadrant)
  float azVar = 0.78 + 0.22 * sin(atan(vWorldDir.z, vWorldDir.x) * 2.0 + 1.1);

  vec3 paleRim = vec3(0.42, 0.64, 0.68);     // Soft luminous silver-teal horizon rim
  vec3 deepTeal = vec3(0.07, 0.22, 0.34);    // Deep atmospheric teal-indigo lift

  vec3 col = (paleRim * lowBand * 0.48 + deepTeal * highBand * 0.36) * azVar;
  float alpha = clamp(lowBand * 0.55 + highBand * 0.32, 0.0, 0.72);

  gl_FragColor = vec4(col, alpha);
}
`;

export function HorizonAirglowDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: HORIZON_GLOW_VERT,
        fragmentShader: HORIZON_GLOW_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    []
  );

  useEffect(() => {
    return () => mat.dispose();
  }, [mat]);

  return (
    <mesh position={[0, -4, 0]} renderOrder={-10} material={mat}>
      <sphereGeometry args={[225, 48, 24]} />
    </mesh>
  );
}

// ── 5. 360° Jagged Canyon Mesa, Butte & Crag Silhouette Ring ──────────────
function buildCanyonRingGeometry(
  innerR: number,
  outerR: number,
  baseHeight: number,
  peakHeight: number,
  seed: number,
  angularSteps: number,
  isOuter: boolean
): THREE.BufferGeometry {
  const rand = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];

  // Continuous sculpted jagged ridge curtain so there are ZERO gaps along the 360° horizon
  const ringGeom = new THREE.CylinderGeometry(innerR, outerR, 1, angularSteps, 4, true);
  const pos = ringGeom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  // Compute jagged silhouette profile height at each angle around 360°
  const profileAtAngle = (ang: number) => {
    // Keep a dramatic canyon pass slightly lower in the Black Hole azimuth (atan2(-0.75, -0.35) ≈ -2.01 rad)
    // so the massive Black Hole looms directly above the jagged canyon rim!
    const bhAz = Math.atan2(-0.75, -0.35);
    const dBh = Math.atan2(Math.sin(ang - bhAz), Math.cos(ang - bhAz));
    const bhPassDip = 1.0 - 0.42 * Math.exp(-(dBh * dBh) / 0.35);

    // Multi-frequency jagged crags + terraced canyon mesa profile
    const wave1 = Math.sin(ang * 5.0 + seed * 0.1) * 0.5 + 0.5;
    const wave2 = Math.abs(Math.sin(ang * 13.0 - seed * 0.3));
    const crag = Math.pow(Math.abs(Math.cos(ang * 23.0 + seed * 0.7)), 1.6);
    const spire = Math.pow(Math.max(0, Math.sin(ang * 37.0 + seed * 1.1)), 3.0);
    // Stepped mesa quantization for authentic stratified buttes
    const rawH = wave1 * 0.42 + wave2 * 0.28 + crag * 0.2 + spire * 0.24;
    const stepped = Math.floor(rawH * 6.0) / 6.0;
    const blended = rawH * 0.65 + stepped * 0.35;

    return (baseHeight + blended * (peakHeight - baseHeight)) * bhPassDip;
  };

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // in [-0.5, +0.5]
    const z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const t = y + 0.5; // 0 = base buried below ground, 1 = ridge crest
    const h = profileAtAngle(ang);

    // Organic radial undulation so canyon wall isn't a smooth cylinder
    const radJitter =
      1.0 +
      Math.sin(ang * 11.0 + seed) * 0.06 +
      Math.cos(ang * 19.0 - t * 3.0) * 0.04;
    // Slight inward/outward terraced cliff overhang near top
    const terraceScale = (1.0 - t * 0.08) * radJitter;

    const worldY = -5.5 + t * (h + 5.5);
    pos.setXYZ(i, x * terraceScale, worldY, z * terraceScale);

    // Deep dark silhouette coloring with ultra-subtle cool atmospheric rim at very top
    if (isOuter) {
      // Distant outer mountain spires: deep obsidian-slate silhouette against teal airglow
      c.setRGB(
        0.025 + t * 0.028,
        0.032 + t * 0.042,
        0.048 + t * 0.062
      );
    } else {
      // Closer canyon mesas: rich dark basalt-umber catching faint starlight on upper ledges
      c.setRGB(
        0.048 + t * 0.052,
        0.046 + t * 0.054,
        0.058 + t * 0.068
      );
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  ringGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  ringGeom.computeVertexNormals();
  parts.push(ringGeom);

  // Add distinct sculpted jagged crag spires & stepped mesas jutting out along the skyline
  const spireCount = isOuter ? 38 : 34;
  for (let i = 0; i < spireCount; i++) {
    const ang = (i / spireCount) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    const h = profileAtAngle(ang) * (0.95 + rand() * 0.42);
    const r = innerR + (rand() - 0.3) * (outerR - innerR) * 0.6;
    const isMesa = rand() > 0.48;

    const g = createCraggyRockGeometry(seed + i * 17.3, 1, isMesa);
    const sx = (isOuter ? 7.5 : 5.2) + rand() * (isOuter ? 9.5 : 6.2);
    const sy = h * (0.58 + rand() * 0.45);
    const sz = (isOuter ? 6.0 : 4.2) + rand() * (isOuter ? 8.0 : 5.0);

    g.scale(sx, sy, sz);
    g.rotateY(ang + rand() * 1.4);
    g.rotateZ((rand() - 0.5) * 0.14);
    g.translate(Math.cos(ang) * r, sy * 0.35 - 2.5, Math.sin(ang) * r);

    // Strip UVs & add matching dark silhouette vertex colors for single merged draw call
    const nonIdx = g.index ? g.toNonIndexed() : g;
    const pAttr = nonIdx.attributes.position;
    const colArr = new Float32Array(pAttr.count * 3);
    for (let v = 0; v < pAttr.count; v++) {
      const py = pAttr.getY(v);
      const nt = THREE.MathUtils.clamp((py + 2.0) / Math.max(4.0, h), 0, 1);
      if (isOuter) {
        colArr[v * 3] = 0.022 + nt * 0.026;
        colArr[v * 3 + 1] = 0.028 + nt * 0.04;
        colArr[v * 3 + 2] = 0.042 + nt * 0.06;
      } else {
        colArr[v * 3] = 0.044 + nt * 0.056;
        colArr[v * 3 + 1] = 0.042 + nt * 0.055;
        colArr[v * 3 + 2] = 0.054 + nt * 0.068;
      }
    }
    nonIdx.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    nonIdx.deleteAttribute("uv");
    if (g !== nonIdx) g.dispose();
    parts.push(nonIdx);
  }

  // Normalize all parts to non-indexed without UV before merging
  const cleanParts = parts.map((p) => {
    const ni = p.index ? p.toNonIndexed() : p;
    ni.deleteAttribute("uv");
    if (!ni.attributes.normal) ni.computeVertexNormals();
    if (ni !== p) p.dispose();
    return ni;
  });

  const merged = mergeGeometries(cleanParts, false)!;
  cleanParts.forEach((p) => p.dispose());
  return merged;
}

export function HorizonCanyonRing() {
  const { innerGeo, outerGeo } = useMemo(() => {
    const inner = buildCanyonRingGeometry(82, 108, 6.5, 19.0, 1024, 144, false);
    const outer = buildCanyonRingGeometry(132, 178, 13.0, 38.0, 2048, 160, true);
    return { innerGeo: inner, outerGeo: outer };
  }, []);

  useEffect(() => {
    return () => {
      innerGeo.dispose();
      outerGeo.dispose();
    };
  }, [innerGeo, outerGeo]);

  return (
    <group name="horizon-canyon-silhouettes">
      {/* Inner Rugged Canyon Mesas & Stratified Crags (catches subtle black-hole & blue starlight) */}
      <mesh geometry={innerGeo} frustumCulled={false}>
        <meshStandardMaterial
          vertexColors
          roughness={0.94}
          metalness={0.08}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>

      {/* Outer Towering Jagged Mountain Spires Silhouetted Against Horizon Airglow */}
      <mesh geometry={outerGeo} frustumCulled={false}>
        <meshBasicMaterial
          vertexColors
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
    </group>
  );
}

// ── 6. Exterior Scattered Rocky Scree, Slabs & Pebbles (2 InstancedMeshes) ─
export interface AlienRockFieldProps {
  getTerrainHeight: (x: number, z: number) => number;
}

export function AlienRockField({ getTerrainHeight }: AlienRockFieldProps) {
  const rockTex = useMemo(() => generateBasaltRockTexture(), []);

  const { screeGeo, slabGeo, screeTransforms, slabTransforms } = useMemo(() => {
    const rand = mulberry32(99012);
    const sGeo = createCraggyRockGeometry(41.2, 0, false);
    const lGeo = createCraggyRockGeometry(73.8, 1, true);

    const screeList: THREE.Matrix4[] = [];
    const slabList: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    const isClearZone = (x: number, z: number) => {
      // Strictly exclude starship interior, hull perimeter & egress ramps
      if (Math.abs(x) < 16.5 && z > -58 && z < 56) return true;
      // Exclude port wing ground footprint
      if (x < -10 && x > -37 && z > -12 && z < 24) return true;
      // Exclude starboard egress ramp & walkway
      if (x > 6 && x < 22 && z > 0 && z < 16) return true;
      // Exclude Rescue Saucer landing pad at [-23, -18] (radius 10m)
      if (Math.hypot(x - -23.0, z - -18.0) < 10.5) return true;
      return false;
    };

    // 1. ~220 Angular Scree Rocks & Pebbles scattered across the desert regolith
    let attempts = 0;
    while (screeList.length < 220 && attempts < 1400) {
      attempts++;
      const ang = rand() * Math.PI * 2;
      const dist = 16 + Math.pow(rand(), 0.75) * 62;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      if (isClearZone(x, z)) continue;

      const y = getTerrainHeight(x, z);
      const sx = 0.18 + rand() * 0.55;
      const sy = 0.1 + rand() * 0.34;
      const sz = 0.18 + rand() * 0.55;
      dummy.position.set(x, y + sy * 0.22, z);
      dummy.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      screeList.push(dummy.matrix.clone());
    }

    // 2. ~120 Larger Stratified Flat-Topped Rocky Outcrops & Ledges (especially framing mid-distance)
    attempts = 0;
    while (slabList.length < 120 && attempts < 1200) {
      attempts++;
      const ang = rand() * Math.PI * 2;
      const dist = 24 + Math.pow(rand(), 0.85) * 58;
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      if (isClearZone(x, z)) continue;

      const y = getTerrainHeight(x, z);
      const sx = 0.9 + rand() * 2.6;
      const sy = 0.35 + rand() * 1.45;
      const sz = 0.8 + rand() * 2.4;
      dummy.position.set(x, y + sy * 0.18, z);
      dummy.rotation.set((rand() - 0.5) * 0.22, rand() * Math.PI * 2, (rand() - 0.5) * 0.22);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      slabList.push(dummy.matrix.clone());
    }

    return {
      screeGeo: sGeo,
      slabGeo: lGeo,
      screeTransforms: screeList,
      slabTransforms: slabList,
    };
  }, [getTerrainHeight]);

  const screeRef = React.useRef<THREE.InstancedMesh>(null);
  const slabRef = React.useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (screeRef.current) {
      screeTransforms.forEach((m, i) => screeRef.current!.setMatrixAt(i, m));
      screeRef.current.instanceMatrix.needsUpdate = true;
    }
    if (slabRef.current) {
      slabTransforms.forEach((m, i) => slabRef.current!.setMatrixAt(i, m));
      slabRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [screeTransforms, slabTransforms]);

  useEffect(() => {
    return () => {
      rockTex.dispose();
      screeGeo.dispose();
      slabGeo.dispose();
    };
  }, [rockTex, screeGeo, slabGeo]);

  return (
    <group name="alien-rock-scree-field">
      <instancedMesh
        ref={screeRef}
        args={[screeGeo, undefined, screeTransforms.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={rockTex}
          color="#3c404b"
          roughness={0.92}
          metalness={0.14}
        />
      </instancedMesh>

      <instancedMesh
        ref={slabRef}
        args={[slabGeo, undefined, slabTransforms.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={rockTex}
          color="#2a2e38"
          roughness={0.9}
          metalness={0.18}
        />
      </instancedMesh>
    </group>
  );
}
