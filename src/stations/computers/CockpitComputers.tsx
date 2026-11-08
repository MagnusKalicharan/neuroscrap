"use client";

/**
 * CockpitComputers.tsx — The Three Cockpit Computers (Station Installation)
 * =========================================================================
 * Placed in the cockpit avionics flight deck in front of the smashed windscreen:
 * - CORE-A: The Server Monolith (left / port) - Cyan Neon Identity
 * - CORE-B: The Command Core (center / hero console) - Sodium Amber Neon Identity
 * - CORE-C: The Lattice Array (right / starboard honeycomb) - Magenta Neon Identity
 * - Two Restyled Pilot Seats (flanking catwalk, moved aside to outer edges)
 * 
 * Target Look: Rainy Cyberpunk Neon Noir (matching STYLE_GUIDE.md & neonNoir.css)
 * - 85%+ dark base material (void #04060B, gunmetal #141C24, steel #1A2733)
 * - Color lives ONLY in neon lights, thin trim, and soft ambient spill
 * - Neon tubes have white-hot core (#FFF4E0), saturated edge, and soft halo
 * - Powered-on screens with scanlines, vignette, and phosphor text bars
 * - Shaped directional floor spills & hull-contoured wall lighting (no round discs)
 * - Terraced hexagonal rims on CORE-C (solid hexagons, no barcode lines)
 * - Prominent white-hot core in CORE-B glass chamber (dominant 4.6m hero)
 * - Human-proportioned ergonomic pilot seats
 */

import React, { useMemo } from "react";
import * as THREE from "three";
import {
  COMPUTERS_CONFIG,
  PILOT_SEATS_CONFIG,
} from "./computers.config";
import { COMPUTERS_PALETTE } from "./computersPalette";
import { type CockpitComputersProps } from "./computers.types";

/**
 * Baked Vertex Color utility for dark industrial metal:
 * - Base is dark void #04060B / gunmetal #141C24 (>= 85% of surface)
 * - Upper bevels catch a cold rim light in the machine's neon color (~40% brightness)
 * - Ambient occlusion strictly in genuine downward overhangs and tight crevices
 * - Vertical panels feature subtle wet-look sheen streaks
 */
function applyNeonNoirVertexColors(
  geo: THREE.BufferGeometry,
  baseColor: THREE.Color,
  rimColor: THREE.Color,
  aoColor: THREE.Color,
  lightBleedColor?: THREE.Color
): THREE.BufferGeometry {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const count = norm.count;
  const colors = new Float32Array(count * 3);

  const vNorm = new THREE.Vector3();
  const vPos = new THREE.Vector3();
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    vNorm.fromBufferAttribute(norm, i);
    vPos.fromBufferAttribute(pos, i);

    // Rim lighting: cold colored highlight strictly on upward / top bevels
    const upDot = Math.max(0, vNorm.y);
    const rimFactor = Math.pow(upDot, 2.0) * 0.35;

    // Ambient occlusion strictly under downward-facing overhangs
    const downDot = Math.max(0, -vNorm.y);
    const aoFactor = Math.pow(downDot, 2.2) * 0.65;

    // Fake wet sheen: subtle vertical banding on vertical walls
    const isWall = Math.abs(vNorm.y) < 0.3;
    const wetSheen = isWall ? (Math.sin(vPos.x * 10.0 + vPos.z * 7.0) * 0.5 + 0.5) * 0.04 : 0.0;

    // Subtle local light bleed on metal near lights
    const bleedFactor = lightBleedColor && vPos.z > 0.3 ? 0.12 : 0.0;

    c.copy(baseColor)
      .lerp(rimColor, rimFactor)
      .lerp(aoColor, aoFactor);

    if (wetSheen > 0) {
      c.addScalar(wetSheen);
    }
    if (lightBleedColor && bleedFactor > 0) {
      c.lerp(lightBleedColor, bleedFactor);
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * Creates procedural CanvasTexture for powered-on phosphor screens:
 * - Near-black teal base (#031017)
 * - Faint horizontal scanlines
 * - Radial vignette
 * - Inset glowing border
 * - Dim telemetry text bars
 */
function createScreenTexture(
  width: number,
  height: number,
  accentHex: string,
  screenTitle: string,
  sublines: string[]
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return new THREE.CanvasTexture({} as any);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Near-black teal base
  ctx.fillStyle = COMPUTERS_PALETTE.screen.baseDarkTeal;
  ctx.fillRect(0, 0, width, height);

  // 2. Scanline banding
  ctx.fillStyle = COMPUTERS_PALETTE.screen.scanline;
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1.5);
  }

  // 3. Radial vignette
  const radial = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.15,
    width / 2,
    height / 2,
    width * 0.65
  );
  radial.addColorStop(0, "rgba(0,0,0,0)");
  radial.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  // 4. Glowing bezel frame
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  // Corner tick brackets
  const tickLen = 22;
  ctx.lineWidth = 3;
  ctx.beginPath();
  // TL
  ctx.moveTo(14, 14 + tickLen);
  ctx.lineTo(14, 14);
  ctx.lineTo(14 + tickLen, 14);
  // TR
  ctx.moveTo(width - 14 - tickLen, 14);
  ctx.lineTo(width - 14, 14);
  ctx.lineTo(width - 14, 14 + tickLen);
  // BL
  ctx.moveTo(14, height - 14 - tickLen);
  ctx.lineTo(14, height - 14);
  ctx.lineTo(14 + tickLen, height - 14);
  // BR
  ctx.moveTo(width - 14 - tickLen, height - 14);
  ctx.lineTo(width - 14, height - 14);
  ctx.lineTo(width - 14, height - 14 - tickLen);
  ctx.stroke();

  // 5. Header Bar
  ctx.fillStyle = "rgba(25, 240, 255, 0.15)";
  ctx.fillRect(18, 18, width - 36, 32);
  ctx.fillStyle = accentHex;
  ctx.font = "bold 15px monospace";
  ctx.fillText(screenTitle, 26, 40);

  // 6. Phosphor text telemetry lines
  ctx.fillStyle = COMPUTERS_PALETTE.screen.textDim;
  ctx.font = "12px monospace";
  let curY = 70;
  sublines.forEach((line) => {
    ctx.fillText(line, 26, curY);
    curY += 20;
  });

  // Data blocks
  for (let r = 0; r < 7; r++) {
    const barW = (Math.sin(r * 4.3) * 0.5 + 0.5) * (width - 180) + 60;
    ctx.fillStyle =
      r % 2 === 0
        ? "rgba(25, 240, 255, 0.28)"
        : "rgba(25, 240, 255, 0.14)";
    ctx.fillRect(26, curY, barW, 9);
    curY += 15;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates an elliptical, directional floor spill decal:
 * - Stretched forward along `rotationY` toward the walkway
 * - Alpha peaks near the machine base (0,0) and fades quadratically to 0.0 at perimeter
 * - Strict elliptical geometry, completely avoiding round disc glows
 */
function createDirectionalSpillDecal(
  majorAxis: number,
  minorAxis: number,
  rotationY: number,
  color: THREE.Color,
  peakAlpha = 0.45
): THREE.BufferGeometry {
  const segments = 28;
  const positions: number[] = [0, 0, 0];
  const colors: number[] = [color.r * peakAlpha, color.g * peakAlpha, color.b * peakAlpha];
  const indices: number[] = [];

  const cosR = Math.cos(rotationY);
  const sinR = Math.sin(rotationY);

  for (let i = 0; i <= segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    const lx = majorAxis * Math.cos(angle);
    const lz = minorAxis * Math.sin(angle);
    const wx = lx * cosR - lz * sinR;
    const wz = lx * sinR + lz * cosR;
    positions.push(wx, 0, wz);
    colors.push(0, 0, 0); // Fades completely to black at perimeter
  }

  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

/**
 * Creates a hull-contoured wall spill geometry:
 * - Follows the curvature and bulkhead angle of the ship hull
 * - Replaces any round disc glow with shaped wash along the frame
 */
function createHullWallSpill(
  width: number,
  height: number,
  color: THREE.Color,
  peakAlpha = 0.30
): THREE.BufferGeometry {
  const segmentsX = 8;
  const segmentsY = 6;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const halfW = width / 2;

  for (let iy = 0; iy <= segmentsY; iy++) {
    const v = iy / segmentsY;
    const y = (v - 0.5) * height;
    for (let ix = 0; ix <= segmentsX; ix++) {
      const u = ix / segmentsX;
      const x = (u - 0.5) * width;
      const z = -Math.pow(x / halfW, 2) * 0.18;

      positions.push(x, y, z);

      const distNorm = Math.sqrt(Math.pow((u - 0.5) * 2, 2) + Math.pow((v - 0.3) * 2, 2));
      const alpha = Math.max(0, 1.0 - Math.min(1.0, distNorm)) * peakAlpha;
      colors.push(color.r * alpha, color.g * alpha, color.b * alpha);
    }
  }

  for (let iy = 0; iy < segmentsY; iy++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = iy * (segmentsX + 1) + ix;
      const b = a + 1;
      const c = a + (segmentsX + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

export function CockpitComputers({
  isMassingPass = false,
  greyscale = false,
  reduceMotion = false,
  lowQuality = false,
  onInteractionPrompt,
  onInteract,
}: CockpitComputersProps) {
  const cfg = COMPUTERS_CONFIG;
  const pal = COMPUTERS_PALETTE;

  // ── Procedural Canvas Screen Textures ──────────────────────────
  const screenTextures = useMemo(() => {
    const coreBMainTex = createScreenTexture(
      1024,
      640,
      pal.screen.bezelLine,
      "AURELIA // TACTICAL COMMAND CORE",
      [
        "PRIMARY FUSION RELAY: [STANDBY]  BUS: 480V-AC",
        "WARP RING DRIFT: +0.0034 DEG    EVENT HORIZON DIST: 1.4 AU",
        "NAV CO-PROCESSOR: RESTRICTED     SYS ID: CORE-B-HERO",
      ]
    );

    const coreBLeftTex = createScreenTexture(
      512,
      512,
      pal.screen.bezelLine,
      "AUXILIARY TELEMETRY",
      ["GRAV SHEAR: NORMAL", "HULL STRESS: 44.2%"]
    );

    const coreAMainTex = createScreenTexture(
      512,
      768,
      pal.coreA.lightColor,
      "CORE-A // SERVER MONOLITH",
      [
        "BLADE CLUSTER: 14/14 MOUNTED",
        "OPTICAL BUS: [SYNC OK]",
        "COOLANT FEED: 4.2 BAR (CHILLED)",
      ]
    );

    const coreCMainTex = createScreenTexture(
      512,
      512,
      pal.coreC.lightColor,
      "CORE-C // LATTICE ARRAY",
      ["HEX NODES: 7 ACTIVE", "LATTICE COHERENCE: 98.4%"]
    );

    return { coreBMainTex, coreBLeftTex, coreAMainTex, coreCMainTex };
  }, [pal]);

  // ── Materials (Neon Noir Token System) ─────────────────────────
  const mats = useMemo(() => {
    // Vertex-colored material for dark metal chassis
    const vMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    // Dark Base Materials (>= 85% of surface)
    const voidMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#060606" : pal.base.void,
      side: THREE.DoubleSide,
    });
    const gunmetalMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#121212" : pal.base.gunmetal,
      side: THREE.DoubleSide,
    });
    const steelMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#181818" : pal.base.steel,
      side: THREE.DoubleSide,
    });
    const steelLitMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#2c2c2c" : pal.base.steelLit,
      side: THREE.DoubleSide,
    });
    const sootMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#080808" : pal.base.soot,
      side: THREE.DoubleSide,
    });

    // Neon Incandescent Core (White-hot center of all neon tubes)
    const whiteCoreMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#ffffff" : pal.neon.coreWhite,
      side: THREE.DoubleSide,
    });

    // Saturated Neon Jackets
    const cyanNeonMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#888888" : pal.neon.cyan,
      side: THREE.DoubleSide,
    });
    const sodiumNeonMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#888888" : pal.neon.sodium,
      side: THREE.DoubleSide,
    });
    const magentaNeonMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#888888" : pal.neon.magenta,
      side: THREE.DoubleSide,
    });

    // Soft Additive Neon Halos
    const cyanHaloMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#444444" : pal.neon.cyan,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sodiumHaloMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#444444" : pal.neon.sodium,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const magentaHaloMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#444444" : pal.neon.magenta,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Additive Spill Decals (Floor & Wall)
    const spillDecalMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Wet Deck Sheen (Subtle flipped gradient quad, 12% opacity)
    const wetSheenMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#1a1a1a" : "#0d202b",
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Glass & Smoked Panels
    const glassMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#0a0a0a" : "#050b10",
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });

    // Screen Materials
    const screenBMainMat = new THREE.MeshBasicMaterial({
      map: screenTextures.coreBMainTex,
      side: THREE.DoubleSide,
    });
    const screenBLeftMat = new THREE.MeshBasicMaterial({
      map: screenTextures.coreBLeftTex,
      side: THREE.DoubleSide,
    });
    const screenBRightShatteredMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#080808" : "#04090d",
      side: THREE.DoubleSide,
    });
    const screenAMainMat = new THREE.MeshBasicMaterial({
      map: screenTextures.coreAMainTex,
      side: THREE.DoubleSide,
    });
    const screenCMainMat = new THREE.MeshBasicMaterial({
      map: screenTextures.coreCMainTex,
      side: THREE.DoubleSide,
    });

    // Indicator Lamps
    const lampLimeMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#aaaaaa" : pal.coreA.lampLime,
    });
    const lampAmberMat = new THREE.MeshBasicMaterial({
      color: greyscale ? "#666666" : pal.coreA.lampAmber,
    });

    return {
      vMat,
      voidMat,
      gunmetalMat,
      steelMat,
      steelLitMat,
      sootMat,
      whiteCoreMat,
      cyanNeonMat,
      sodiumNeonMat,
      magentaNeonMat,
      cyanHaloMat,
      sodiumHaloMat,
      magentaHaloMat,
      spillDecalMat,
      wetSheenMat,
      glassMat,
      screenBMainMat,
      screenBLeftMat,
      screenBRightShatteredMat,
      screenAMainMat,
      screenCMainMat,
      lampLimeMat,
      lampAmberMat,
    };
  }, [pal, greyscale, screenTextures]);

  // ── Procedural Meshes & Geometries ────────────────────────────
  const geos = useMemo(() => {
    const darkVoid = new THREE.Color(greyscale ? "#060606" : pal.base.void);
    const darkGunmetal = new THREE.Color(greyscale ? "#101010" : pal.base.gunmetal);
    const darkSteel = new THREE.Color(greyscale ? "#141414" : pal.base.steel);
    const darkSoot = new THREE.Color(greyscale ? "#080808" : pal.base.soot);

    // ══════════════════════════════════════════════════════════════
    // ── A) CORE-A: SERVER MONOLITH (Cyan Neon Identity) ───────────
    // ══════════════════════════════════════════════════════════════
    const aRimCol = new THREE.Color(greyscale ? "#444444" : pal.coreA.rimLight);
    const aBleedCol = new THREE.Color(greyscale ? "#181818" : pal.coreA.lightBleed);

    // Main dark gunmetal body with recessed front cavity
    const aChassis = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(1.6, 2.7, 0.95),
      darkGunmetal,
      aRimCol,
      darkVoid,
      aBleedCol
    );
    aChassis.translate(0, 1.35, -0.05);

    // Left & Right front architectural pillars
    const aPillarL = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(0.18, 2.7, 0.22),
      darkVoid,
      aRimCol,
      darkGunmetal
    );
    aPillarL.translate(-0.71, 1.35, 0.44);

    const aPillarR = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(0.18, 2.7, 0.22),
      darkVoid,
      aRimCol,
      darkGunmetal
    );
    aPillarR.translate(0.71, 1.35, 0.44);

    // Stepped exhaust cowl in dark gunmetal
    const aExhaust = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(1.15, 0.25, 0.75),
      darkGunmetal,
      aRimCol,
      darkSoot
    );
    aExhaust.translate(0, 2.825, 0);

    // Recessed dark smoked glass in the bay
    const aGlass = new THREE.PlaneGeometry(1.24, 2.3);
    aGlass.translate(0, 1.45, 0.44);

    // 14 Dark side heat-sink fins per side with cyan neon tips
    const aFinGeoms: THREE.BufferGeometry[] = [];
    const aFinNeonTips: THREE.BufferGeometry[] = [];
    for (let f = 0; f < 14; f++) {
      const yFin = 0.40 + f * 0.16;
      const finL = new THREE.BoxGeometry(0.12, 0.028, 0.82);
      finL.translate(-0.86, yFin, 0);
      aFinGeoms.push(finL);
      const tipL = new THREE.BoxGeometry(0.015, 0.026, 0.80);
      tipL.translate(-0.925, yFin, 0);
      aFinNeonTips.push(tipL);

      const finR = new THREE.BoxGeometry(0.12, 0.028, 0.82);
      finR.translate(0.86, yFin, 0);
      aFinGeoms.push(finR);
      const tipR = new THREE.BoxGeometry(0.015, 0.026, 0.80);
      tipR.translate(0.925, yFin, 0);
      aFinNeonTips.push(tipR);
    }

    // Front Vertical Cyan Edge Strips along the front pillar creases
    const aEdgeStripL = new THREE.BoxGeometry(0.022, 2.68, 0.022);
    aEdgeStripL.translate(-0.79, 1.35, 0.54);
    const aEdgeStripR = new THREE.BoxGeometry(0.022, 2.68, 0.022);
    aEdgeStripR.translate(0.79, 1.35, 0.54);

    // Top horizontal cyan edge strip along front header
    const aTopEdgeStrip = new THREE.BoxGeometry(1.58, 0.022, 0.022);
    aTopEdgeStrip.translate(0, 2.69, 0.54);

    // Two Dual Vertical Cyan Light Pipes (White-hot core + Saturated Cyan edge + Soft halo)
    const aPipeCoreL = new THREE.CylinderGeometry(0.015, 0.015, 2.2, 8);
    aPipeCoreL.translate(-0.48, 1.45, 0.50);
    const aPipeEdgeL = new THREE.CylinderGeometry(0.030, 0.030, 2.2, 8);
    aPipeEdgeL.translate(-0.48, 1.45, 0.50);
    const aPipeHaloL = new THREE.CylinderGeometry(0.055, 0.055, 2.2, 8);
    aPipeHaloL.translate(-0.48, 1.45, 0.50);

    const aPipeCoreR = new THREE.CylinderGeometry(0.015, 0.015, 2.2, 8);
    aPipeCoreR.translate(0.48, 1.45, 0.50);
    const aPipeEdgeR = new THREE.CylinderGeometry(0.030, 0.030, 2.2, 8);
    aPipeEdgeR.translate(0.48, 1.45, 0.50);
    const aPipeHaloR = new THREE.CylinderGeometry(0.055, 0.055, 2.2, 8);
    aPipeHaloR.translate(0.48, 1.45, 0.50);

    // Blade 07: pulled halfway out with cyan front lip
    const aDrawer = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(1.15, 0.16, 0.85),
      darkGunmetal,
      aRimCol,
      darkSoot
    );
    aDrawer.rotateX(0.09);
    aDrawer.translate(0, 1.38, 0.70);

    const aDrawerLip = new THREE.BoxGeometry(1.14, 0.02, 0.02);
    aDrawerLip.rotateX(0.09);
    aDrawerLip.translate(0, 1.38, 1.12);

    // Screen Quad (0.85m x 0.55m at 1.75m height in upper bay)
    const aScreenQuad = new THREE.PlaneGeometry(0.85, 0.55);
    aScreenQuad.translate(0, 1.80, 0.46);

    // Base Underglow Glow Strip for CORE-A
    const aBaseGlowStrip = new THREE.BoxGeometry(1.58, 0.025, 0.025);
    aBaseGlowStrip.translate(0, 0.02, 0.52);

    // Elliptical Floor Spill Decal (Stretched forward-inward toward catwalk, no circles)
    const aFloorSpill = createDirectionalSpillDecal(
      1.7,
      0.9,
      0.45,
      new THREE.Color(greyscale ? "#333333" : pal.coreA.lightColor),
      0.42
    );
    aFloorSpill.translate(0.35, 0.005, 0.45);

    // Hull-contoured Wall Spill on port bulkhead (No circles)
    const aWallSpill = createHullWallSpill(
      1.8,
      2.6,
      new THREE.Color(greyscale ? "#222222" : pal.coreA.lightColor),
      0.30
    );
    aWallSpill.rotateY(0.25);
    aWallSpill.translate(-0.1, 1.6, -0.65);

    // Wet Deck Mirror Sheen under CORE-A
    const aWetSheen = new THREE.PlaneGeometry(1.6, 1.1);
    aWetSheen.rotateX(-Math.PI / 2);
    aWetSheen.translate(0, 0.003, 0.4);

    // ══════════════════════════════════════════════════════════════
    // ── B) CORE-B: COMMAND CORE (Sodium Amber Hero, DOMINANT) ─────
    // ══════════════════════════════════════════════════════════════
    const bRimCol = new THREE.Color(greyscale ? "#444444" : pal.coreB.rimLight);
    const bBleedCol = new THREE.Color(greyscale ? "#221104" : pal.coreB.lightBleed);

    // Center Console Deck Chassis
    const bCenterChassis = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(2.35, 0.90, 1.15),
      darkSteel,
      bRimCol,
      darkVoid,
      bBleedCol
    );
    bCenterChassis.translate(0, 0.45, 0.20);

    // Angled Side Wings
    const bWingL = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(1.20, 0.88, 1.10),
      darkSteel,
      bRimCol,
      darkVoid
    );
    bWingL.rotateY(0.48);
    bWingL.translate(-1.70, 0.44, -0.05);

    const bWingR = applyNeonNoirVertexColors(
      new THREE.BoxGeometry(1.20, 0.88, 1.10),
      darkSteel,
      bRimCol,
      darkVoid
    );
    bWingR.rotateY(-0.48);
    bWingR.translate(1.70, 0.44, -0.05);

    // Continuous Sodium Amber Edge Strip along the entire 4.6m deck rim
    // Rendered via direct array of meshes (100% reliable)
    const bDeckNeonEdges: THREE.BufferGeometry[] = [];
    const bDeckNeonCores: THREE.BufferGeometry[] = [];
    const bDeckNeonHalos: THREE.BufferGeometry[] = [];

    // Center desk rim (2.36m long)
    const cEdge = new THREE.BoxGeometry(2.36, 0.032, 0.032);
    cEdge.translate(0, 0.92, 0.78);
    bDeckNeonEdges.push(cEdge);
    const cCore = new THREE.BoxGeometry(2.36, 0.014, 0.014);
    cCore.translate(0, 0.92, 0.78);
    bDeckNeonCores.push(cCore);
    const cHalo = new THREE.BoxGeometry(2.38, 0.08, 0.08);
    cHalo.translate(0, 0.92, 0.78);
    bDeckNeonHalos.push(cHalo);

    // Left wing rim
    const lEdge = new THREE.BoxGeometry(1.22, 0.032, 0.032);
    lEdge.rotateY(0.48);
    lEdge.translate(-1.70, 0.90, 0.50);
    bDeckNeonEdges.push(lEdge);
    const lCore = new THREE.BoxGeometry(1.22, 0.014, 0.014);
    lCore.rotateY(0.48);
    lCore.translate(-1.70, 0.90, 0.50);
    bDeckNeonCores.push(lCore);
    const lHalo = new THREE.BoxGeometry(1.24, 0.08, 0.08);
    lHalo.rotateY(0.48);
    lHalo.translate(-1.70, 0.90, 0.50);
    bDeckNeonHalos.push(lHalo);

    // Right wing rim
    const rEdge = new THREE.BoxGeometry(1.22, 0.032, 0.032);
    rEdge.rotateY(-0.48);
    rEdge.translate(1.70, 0.90, 0.50);
    bDeckNeonEdges.push(rEdge);
    const rCore = new THREE.BoxGeometry(1.22, 0.014, 0.014);
    rCore.rotateY(-0.48);
    rCore.translate(1.70, 0.90, 0.50);
    bDeckNeonCores.push(rCore);
    const rHalo = new THREE.BoxGeometry(1.24, 0.08, 0.08);
    rHalo.rotateY(-0.48);
    rHalo.translate(1.70, 0.90, 0.50);
    bDeckNeonHalos.push(rHalo);

    // Screen Housing Frame in dark void (recessed behind main screen at z = -0.24)
    const bScreenFrame = new THREE.BoxGeometry(2.36, 1.46, 0.12);
    bScreenFrame.rotateX(-0.10);
    bScreenFrame.translate(0, 1.50, -0.24);

    // MAIN HERO SCREEN: 2.20m x 1.30m centered at eye level y = 1.50m (in front at z = -0.10)
    const bMainScreen = new THREE.PlaneGeometry(2.20, 1.30);
    bMainScreen.rotateX(-0.10);
    bMainScreen.translate(0, 1.50, -0.10);

    // Angled Side Screens
    const bScreenL = new THREE.PlaneGeometry(1.00, 0.88);
    bScreenL.rotateY(0.48);
    bScreenL.rotateX(-0.08);
    bScreenL.translate(-1.70, 1.40, -0.10);

    const bScreenR = new THREE.PlaneGeometry(1.00, 0.88);
    bScreenR.rotateY(-0.48);
    bScreenR.rotateX(-0.08);
    bScreenR.translate(1.70, 1.40, -0.10);

    // ── Superstructure: Processor Chamber Elevated Above Main Screen ──
    const bChamberCollar = new THREE.CylinderGeometry(0.48, 0.52, 0.08, 20);
    bChamberCollar.translate(0, 2.18, -0.38);

    const bChamberCollarNeon = new THREE.TorusGeometry(0.49, 0.025, 8, 24);
    bChamberCollarNeon.rotateX(Math.PI / 2);
    bChamberCollarNeon.translate(0, 2.18, -0.38);

    const bChamber = new THREE.CylinderGeometry(0.44, 0.44, 0.52, 24);
    bChamber.translate(0, 2.44, -0.38);

    const bChamberCap = new THREE.CylinderGeometry(0.48, 0.44, 0.08, 20);
    bChamberCap.translate(0, 2.70, -0.38);

    const bChamberCapNeon = new THREE.TorusGeometry(0.49, 0.025, 8, 24);
    bChamberCapNeon.rotateX(Math.PI / 2);
    bChamberCapNeon.translate(0, 2.70, -0.38);

    // Glowing Hex Core inside the glass chamber:
    // White-hot incandescent center + Saturated amber jacket + Soft halo
    const bHexCoreWhite = new THREE.CylinderGeometry(0.14, 0.14, 0.38, 6);
    bHexCoreWhite.translate(0, 2.44, -0.38);

    const bHexCoreAmber = new THREE.CylinderGeometry(0.20, 0.20, 0.38, 6);
    bHexCoreAmber.translate(0, 2.44, -0.38);

    const bHexCoreHalo = new THREE.CylinderGeometry(0.30, 0.30, 0.42, 6);
    bHexCoreHalo.translate(0, 2.44, -0.38);

    // Floating Halo Ring above the chamber cap (attached via 3 struts)
    const bHaloRing = new THREE.TorusGeometry(0.56, 0.038, 12, 32);
    bHaloRing.rotateX(Math.PI / 2);
    bHaloRing.translate(0, 2.86, -0.38);

    const bHaloRingCore = new THREE.TorusGeometry(0.56, 0.016, 12, 32);
    bHaloRingCore.rotateX(Math.PI / 2);
    bHaloRingCore.translate(0, 2.86, -0.38);

    const bStruts: THREE.BufferGeometry[] = [];
    for (let s = 0; s < 3; s++) {
      const ang = (s * 2 * Math.PI) / 3;
      const strut = new THREE.CylinderGeometry(0.016, 0.016, 0.16, 6);
      strut.translate(0.46 * Math.cos(ang), 2.78, -0.38 + 0.46 * Math.sin(ang));
      bStruts.push(strut);
    }

    // Top superstructure antenna spire reaching y = 3.35m
    const bSpire = new THREE.CylinderGeometry(0.02, 0.04, 0.48, 8);
    bSpire.translate(0, 3.10, -0.38);

    // Elliptical Floor Spill Decal (No circles)
    const bFloorSpill = createDirectionalSpillDecal(
      2.4,
      1.1,
      0,
      new THREE.Color(greyscale ? "#333333" : pal.coreB.lightColor),
      0.45
    );
    bFloorSpill.translate(0, 0.005, 0.55);

    // Hull-contoured Wall Spill on windscreen bulkhead (No circles)
    const bWallSpill = createHullWallSpill(
      4.8,
      1.6,
      new THREE.Color(greyscale ? "#222222" : pal.coreB.lightColor),
      0.35
    );
    bWallSpill.translate(0, 1.8, -0.85);

    // Wet Deck Mirror Sheen under CORE-B
    const bWetSheen = new THREE.PlaneGeometry(3.8, 1.4);
    bWetSheen.rotateX(-Math.PI / 2);
    bWetSheen.translate(0, 0.003, 0.45);

    // ══════════════════════════════════════════════════════════════
    // ── C) CORE-C: LATTICE ARRAY (Magenta Honeycomb) ──────────────
    // ══════════════════════════════════════════════════════════════
    const cRimCol = new THREE.Color(greyscale ? "#444444" : pal.coreC.rimLight);
    const cBleedCol = new THREE.Color(greyscale ? "#200412" : pal.coreC.lightBleed);
    const rHex = 0.44;
    const rf = rHex * (Math.sqrt(3) / 2); // 0.381m

    // 7 Standing Hexagonal Prisms with steep stepped skyline
    const honeycombPrisms = [
      { x: -1.5 * rHex, z: -rf, height: 1.15 }, // Front-left plateau: 1.15m
      { x: -1.5 * rHex, z: rf, height: 1.45 },  // Front-right plateau: 1.45m
      { x: 0.0, z: -2 * rf, height: 1.80 },    // Mid-left: 1.80m
      { x: 0.0, z: 0.0, height: 2.25 },         // Center hero tower: 2.25m
      { x: 0.0, z: 2 * rf, height: 2.60 },     // Mid-right: 2.60m
      { x: 1.5 * rHex, z: -rf, height: 2.95 },  // Tallest rear-left: 2.95m
      { x: 1.5 * rHex, z: rf, height: 2.85 },   // Tallest rear-right: 2.85m
    ];

    const cPrismGeoms: THREE.BufferGeometry[] = [];
    const cHexTopRims: THREE.BufferGeometry[] = [];
    const cHexTopRimsCore: THREE.BufferGeometry[] = [];
    const cHexCapPlates: THREE.BufferGeometry[] = [];
    const cVerticalNeonStrips: THREE.BufferGeometry[] = [];
    const cVerticalNeonCores: THREE.BufferGeometry[] = [];

    honeycombPrisms.forEach((p) => {
      // Cylinder with 6 radial segments
      const hexGeo = new THREE.CylinderGeometry(rHex, rHex, p.height, 6);
      hexGeo.translate(p.x, p.height / 2, p.z);
      applyNeonNoirVertexColors(hexGeo, darkSteel, cRimCol, darkVoid, cBleedCol);
      cPrismGeoms.push(hexGeo);

      // Continuous 6-sided open hexagonal collar rim around the top cap
      const topRim = new THREE.CylinderGeometry(rHex + 0.012, rHex + 0.012, 0.045, 6, 1, true);
      topRim.translate(p.x, p.height - 0.01, p.z);
      cHexTopRims.push(topRim);

      // Inner white-hot incandescent core strip around top cap
      const topRimCore = new THREE.CylinderGeometry(rHex + 0.014, rHex + 0.014, 0.018, 6, 1, true);
      topRimCore.translate(p.x, p.height - 0.01, p.z);
      cHexTopRimsCore.push(topRimCore);

      // Dark top cap face plate
      const capPlate = new THREE.CylinderGeometry(rHex - 0.01, rHex - 0.01, 0.02, 6);
      capPlate.translate(p.x, p.height, p.z);
      cHexCapPlates.push(capPlate);

      // Single prominent vertical neon strip along the front crease facing catwalk (-X)
      const vStrip = new THREE.BoxGeometry(0.024, p.height, 0.024);
      vStrip.translate(p.x - rHex, p.height / 2, p.z);
      cVerticalNeonStrips.push(vStrip);

      const vCore = new THREE.BoxGeometry(0.010, p.height, 0.010);
      vCore.translate(p.x - rHex, p.height / 2, p.z);
      cVerticalNeonCores.push(vCore);
    });

    // Prominent Magenta Status Eyes on front facets of lower plateaus
    const cStatusEyes: THREE.BufferGeometry[] = [];
    const cStatusEyeLenses: THREE.BufferGeometry[] = [];
    const cStatusEyeCores: THREE.BufferGeometry[] = [];

    // Eye 1 on 1.15m plateau at y = 0.88m
    const eyeBezel1 = new THREE.BoxGeometry(0.04, 0.16, 0.24);
    eyeBezel1.translate(-1.5 * rHex - 0.38, 0.88, -rf);
    cStatusEyes.push(eyeBezel1);
    const eyeLens1 = new THREE.BoxGeometry(0.045, 0.10, 0.18);
    eyeLens1.translate(-1.5 * rHex - 0.38, 0.88, -rf);
    cStatusEyeLenses.push(eyeLens1);
    const eyeCore1 = new THREE.BoxGeometry(0.048, 0.04, 0.08);
    eyeCore1.translate(-1.5 * rHex - 0.38, 0.88, -rf);
    cStatusEyeCores.push(eyeCore1);

    // Eye 2 on 1.45m plateau at y = 1.18m
    const eyeBezel2 = new THREE.BoxGeometry(0.04, 0.16, 0.24);
    eyeBezel2.translate(-1.5 * rHex - 0.38, 1.18, rf);
    cStatusEyes.push(eyeBezel2);
    const eyeLens2 = new THREE.BoxGeometry(0.045, 0.10, 0.18);
    eyeLens2.translate(-1.5 * rHex - 0.38, 1.18, rf);
    cStatusEyeLenses.push(eyeLens2);
    const eyeCore2 = new THREE.BoxGeometry(0.048, 0.04, 0.08);
    eyeCore2.translate(-1.5 * rHex - 0.38, 1.18, rf);
    cStatusEyeCores.push(eyeCore2);

    // Floor Base Collar Ring around honeycomb cluster
    const cFloorRing = new THREE.CylinderGeometry(1.68, 1.72, 0.08, 24);
    cFloorRing.translate(0, 0.04, 0);

    const cFloorRingNeon = new THREE.TorusGeometry(1.70, 0.025, 8, 32);
    cFloorRingNeon.rotateX(Math.PI / 2);
    cFloorRingNeon.translate(0, 0.08, 0);

    // Two Fallen Prisms tilted on the deck with internal magenta core exposed
    const cFallen1 = new THREE.CylinderGeometry(rHex, rHex, 1.20, 6);
    cFallen1.rotateZ(1.22);
    cFallen1.rotateY(0.4);
    cFallen1.translate(-0.85, 0.38, 1.25);
    applyNeonNoirVertexColors(cFallen1, darkSteel, cRimCol, darkVoid);

    const cFallen1Rim = new THREE.CylinderGeometry(rHex + 0.012, rHex + 0.012, 0.045, 6, 1, true);
    cFallen1Rim.rotateZ(1.22);
    cFallen1Rim.rotateY(0.4);
    cFallen1Rim.translate(-0.85, 0.38, 1.25);

    const cFallen1Glow = new THREE.CylinderGeometry(0.24, 0.24, 0.10, 6);
    cFallen1Glow.rotateZ(1.22);
    cFallen1Glow.rotateY(0.4);
    cFallen1Glow.translate(-1.32, 0.62, 1.25);

    const cFallen2 = new THREE.CylinderGeometry(rHex, rHex, 1.10, 6);
    cFallen2.rotateX(1.30);
    cFallen2.rotateY(-0.3);
    cFallen2.translate(0.95, 0.36, 1.45);
    applyNeonNoirVertexColors(cFallen2, darkSteel, cRimCol, darkVoid);

    const cFallen2Glow = new THREE.CylinderGeometry(0.24, 0.24, 0.10, 6);
    cFallen2Glow.rotateX(1.30);
    cFallen2Glow.rotateY(-0.3);
    cFallen2Glow.translate(0.95, 0.36, 1.95);

    // Elliptical Floor Spill Decal (No circles)
    const cFloorSpill = createDirectionalSpillDecal(
      1.7,
      0.9,
      -0.45,
      new THREE.Color(greyscale ? "#333333" : pal.coreC.lightColor),
      0.42
    );
    cFloorSpill.translate(-0.35, 0.005, 0.45);

    // Hull-contoured Wall Spill behind CORE-C (No circles)
    const cWallSpill = createHullWallSpill(
      2.4,
      2.6,
      new THREE.Color(greyscale ? "#222222" : pal.coreC.lightColor),
      0.30
    );
    cWallSpill.rotateY(-0.25);
    cWallSpill.translate(0.1, 1.6, -0.65);

    // Wet Deck Mirror Sheen under CORE-C
    const cWetSheen = new THREE.PlaneGeometry(1.6, 1.3);
    cWetSheen.rotateX(-Math.PI / 2);
    cWetSheen.translate(0, 0.003, 0.4);

    // ══════════════════════════════════════════════════════════════
    // ── Restyled Pilot Seats (Human-Proportioned Ergonomic Scale) ─
    // ══════════════════════════════════════════════════════════════
    const makeSeatGeom = () => {
      const parts: THREE.BufferGeometry[] = [];

      // Heavy alloy pedestal in dark gunmetal
      const ped = new THREE.CylinderGeometry(0.24, 0.32, 0.32, 16);
      ped.translate(0, 0.16, 0);
      parts.push(ped);

      // Seat cushion pan in dark soot
      const pan = new THREE.BoxGeometry(0.76, 0.14, 0.74);
      pan.translate(0, 0.44, 0.04);
      parts.push(pan);

      // Sleek side armrests / bolsters
      const armL = new THREE.BoxGeometry(0.08, 0.22, 0.52);
      armL.translate(-0.40, 0.58, 0.02);
      parts.push(armL);

      const armR = new THREE.BoxGeometry(0.08, 0.22, 0.52);
      armR.translate(0.40, 0.58, 0.02);
      parts.push(armR);

      // Ergonomic contoured backrest
      const back = new THREE.BoxGeometry(0.72, 0.68, 0.14);
      back.rotateX(-0.14);
      back.translate(0, 0.82, -0.28);
      parts.push(back);

      // Headrest module
      const head = new THREE.BoxGeometry(0.48, 0.24, 0.12);
      head.rotateX(-0.14);
      head.translate(0, 1.24, -0.36);
      parts.push(head);

      // Sleek sodium amber edge strip across headrest top crest
      const sodiumTrim = new THREE.BoxGeometry(0.46, 0.016, 0.020);
      sodiumTrim.rotateX(-0.14);
      sodiumTrim.translate(0, 1.36, -0.38);
      parts.push(sodiumTrim);

      return parts;
    };

    const seatGeoms = makeSeatGeom();

    return {
      aChassis,
      aPillarL,
      aPillarR,
      aExhaust,
      aGlass,
      aFinGeoms,
      aFinNeonTips,
      aEdgeStripL,
      aEdgeStripR,
      aTopEdgeStrip,
      aDrawer,
      aDrawerLip,
      aPipeCoreL,
      aPipeEdgeL,
      aPipeHaloL,
      aPipeCoreR,
      aPipeEdgeR,
      aPipeHaloR,
      aScreenQuad,
      aBaseGlowStrip,
      aFloorSpill,
      aWallSpill,
      aWetSheen,

      bCenterChassis,
      bWingL,
      bWingR,
      bDeckNeonEdges,
      bDeckNeonCores,
      bDeckNeonHalos,
      bMainScreen,
      bScreenL,
      bScreenR,
      bScreenFrame,
      bChamberCollar,
      bChamberCollarNeon,
      bChamber,
      bChamberCap,
      bChamberCapNeon,
      bHexCoreAmber,
      bHexCoreWhite,
      bHexCoreHalo,
      bHaloRing,
      bHaloRingCore,
      bStruts,
      bSpire,
      bFloorSpill,
      bWallSpill,
      bWetSheen,

      cPrismGeoms,
      cHexTopRims,
      cHexTopRimsCore,
      cHexCapPlates,
      cVerticalNeonStrips,
      cVerticalNeonCores,
      cStatusEyes,
      cStatusEyeLenses,
      cStatusEyeCores,
      cFloorRing,
      cFloorRingNeon,
      cFallen1,
      cFallen1Rim,
      cFallen1Glow,
      cFallen2,
      cFallen2Glow,
      cFloorSpill,
      cWallSpill,
      cWetSheen,

      seatGeoms,
    };
  }, [pal, greyscale]);

  return (
    <group name="cockpit-three-computers-installation">
      {/* ── A) CORE-A: SERVER MONOLITH (Cyan Neon Identity) ────────── */}
      <group
        position={cfg.coreA.position}
        rotation={cfg.coreA.rotation}
        name="computer-core-a-monolith"
      >
        <mesh geometry={geos.aChassis} material={mats.vMat} />
        <mesh geometry={geos.aPillarL} material={mats.vMat} />
        <mesh geometry={geos.aPillarR} material={mats.vMat} />
        <mesh geometry={geos.aExhaust} material={mats.gunmetalMat} />
        <mesh geometry={geos.aGlass} material={mats.glassMat} />

        {/* 14 Cooling fins + Cyan glowing tips */}
        {geos.aFinGeoms.map((fg, idx) => (
          <mesh key={`core-a-fin-${idx}`} geometry={fg} material={mats.gunmetalMat} />
        ))}
        {geos.aFinNeonTips.map((tg, idx) => (
          <mesh key={`core-a-fintip-${idx}`} geometry={tg} material={mats.cyanNeonMat} />
        ))}

        <mesh geometry={geos.aDrawer} material={mats.gunmetalMat} />
        <mesh geometry={geos.aDrawerLip} material={mats.cyanNeonMat} />

        {/* Front Vertical & Top Cyan Edge Strips */}
        <mesh geometry={geos.aEdgeStripL} material={mats.cyanNeonMat} />
        <mesh geometry={geos.aEdgeStripR} material={mats.cyanNeonMat} />
        <mesh geometry={geos.aTopEdgeStrip} material={mats.cyanNeonMat} />

        {/* Dual Vertical Cyan Light Pipes (White Core + Saturated Edge + Soft Halo) */}
        <mesh geometry={geos.aPipeEdgeL} material={mats.cyanNeonMat} />
        <mesh geometry={geos.aPipeCoreL} material={mats.whiteCoreMat} />
        <mesh geometry={geos.aPipeHaloL} material={mats.cyanHaloMat} />

        <mesh geometry={geos.aPipeEdgeR} material={mats.cyanNeonMat} />
        <mesh geometry={geos.aPipeCoreR} material={mats.whiteCoreMat} />
        <mesh geometry={geos.aPipeHaloR} material={mats.cyanHaloMat} />

        {/* Powered-On Phosphor Screen */}
        <mesh geometry={geos.aScreenQuad} material={mats.screenAMainMat} />

        {/* Base Glow Strip */}
        <mesh geometry={geos.aBaseGlowStrip} material={mats.cyanNeonMat} />

        {/* Status Indicator Lamps: Lime (OK) and Amber (Fault) */}
        <mesh position={[-0.42, 1.58, 0.54]}>
          <boxGeometry args={[0.04, 0.02, 0.02]} />
          <meshBasicMaterial color={mats.lampLimeMat.color} />
        </mesh>
        <mesh position={[0.42, 1.58, 0.54]}>
          <boxGeometry args={[0.04, 0.02, 0.02]} />
          <meshBasicMaterial color={mats.lampAmberMat.color} />
        </mesh>

        {/* Directional Floor Spill & Hull-Contoured Wall Wash (No discs) */}
        <mesh geometry={geos.aFloorSpill} material={mats.spillDecalMat} />
        <mesh geometry={geos.aWallSpill} material={mats.spillDecalMat} />
        <mesh geometry={geos.aWetSheen} material={mats.wetSheenMat} />
      </group>

      {/* ── B) CORE-B: COMMAND CORE (Sodium Amber Neon Identity, DOMINANT) ── */}
      <group
        position={cfg.coreB.position}
        rotation={cfg.coreB.rotation}
        name="computer-core-b-command"
      >
        <mesh geometry={geos.bCenterChassis} material={mats.vMat} />
        <mesh geometry={geos.bWingL} material={mats.vMat} />
        <mesh geometry={geos.bWingR} material={mats.vMat} />

        {/* Sodium Amber Deck Edge Neon Strip (White Core + Saturated Edge + Soft Halo) */}
        {geos.bDeckNeonEdges.map((eg, idx) => (
          <mesh key={`b-edge-${idx}`} geometry={eg} material={mats.sodiumNeonMat} />
        ))}
        {geos.bDeckNeonCores.map((cg, idx) => (
          <mesh key={`b-core-${idx}`} geometry={cg} material={mats.whiteCoreMat} />
        ))}
        {geos.bDeckNeonHalos.map((hg, idx) => (
          <mesh key={`b-halo-${idx}`} geometry={hg} material={mats.sodiumHaloMat} />
        ))}

        {/* Main Hero Screen (2.20m x 1.30m centered at eye level y = 1.50m) */}
        <mesh geometry={geos.bScreenFrame} material={mats.voidMat} />
        <mesh geometry={geos.bMainScreen} material={mats.screenBMainMat} />

        {/* Angled Side Console Screens */}
        <mesh geometry={geos.bScreenL} material={mats.screenBLeftMat} />
        <mesh geometry={geos.bScreenR} material={mats.screenBRightShatteredMat} />

        {/* Processor Chamber superstructure above main screen */}
        <mesh geometry={geos.bChamberCollar} material={mats.steelLitMat} />
        <mesh geometry={geos.bChamberCollarNeon} material={mats.sodiumNeonMat} />
        <mesh geometry={geos.bChamber} material={mats.glassMat} />
        <mesh geometry={geos.bChamberCap} material={mats.steelLitMat} />
        <mesh geometry={geos.bChamberCapNeon} material={mats.sodiumNeonMat} />

        {/* Glowing Hex Core: White-hot incandescent core with saturated amber jacket & halo */}
        <mesh geometry={geos.bHexCoreWhite} material={mats.whiteCoreMat} />
        <mesh geometry={geos.bHexCoreAmber} material={mats.sodiumNeonMat} />
        <mesh geometry={geos.bHexCoreHalo} material={mats.sodiumHaloMat} />

        {/* Floating Halo Ring above chamber cap */}
        <mesh geometry={geos.bHaloRing} material={mats.cyanNeonMat} />
        <mesh geometry={geos.bHaloRingCore} material={mats.whiteCoreMat} />
        {geos.bStruts.map((sg, idx) => (
          <mesh key={`b-strut-${idx}`} geometry={sg} material={mats.steelLitMat} />
        ))}

        {/* Superstructure Spire (Reaching y = 3.35m) */}
        <mesh geometry={geos.bSpire} material={mats.steelLitMat} />

        {/* Directional Floor Spill & Windscreen Bulkhead Wash (No discs) */}
        <mesh geometry={geos.bFloorSpill} material={mats.spillDecalMat} />
        <mesh geometry={geos.bWallSpill} material={mats.spillDecalMat} />
        <mesh geometry={geos.bWetSheen} material={mats.wetSheenMat} />
      </group>

      {/* ── C) CORE-C: LATTICE ARRAY (Magenta Honeycomb) ───────────── */}
      <group
        position={cfg.coreC.position}
        rotation={cfg.coreC.rotation}
        name="computer-core-c-lattice"
      >
        {/* Floor Base Ring */}
        <mesh geometry={geos.cFloorRing} material={mats.steelLitMat} />
        <mesh geometry={geos.cFloorRingNeon} material={mats.magentaNeonMat} />

        {/* 7 Standing Hexagonal Prisms (Dark Steel with Cold Magenta Rim) */}
        {geos.cPrismGeoms.map((hg, idx) => (
          <mesh key={`hex-mod-${idx}`} geometry={hg} material={mats.vMat} />
        ))}

        {/* Dark Top Cap Plates */}
        {geos.cHexCapPlates.map((cp, idx) => (
          <mesh key={`hex-cap-${idx}`} geometry={cp} material={mats.steelLitMat} />
        ))}

        {/* Continuous 6-Sided Glowing Hexagonal Upper Rim Loops on Prism Tops */}
        {geos.cHexTopRims.map((rg, idx) => (
          <mesh key={`hex-top-rim-${idx}`} geometry={rg} material={mats.magentaNeonMat} />
        ))}
        {geos.cHexTopRimsCore.map((rcg, idx) => (
          <mesh key={`hex-top-rimcore-${idx}`} geometry={rcg} material={mats.whiteCoreMat} />
        ))}

        {/* Clean Vertical Neon Creases on Front Faces (No barcode artifact) */}
        {geos.cVerticalNeonStrips.map((vg, idx) => (
          <mesh key={`hex-vert-strip-${idx}`} geometry={vg} material={mats.magentaNeonMat} />
        ))}
        {geos.cVerticalNeonCores.map((vcg, idx) => (
          <mesh key={`hex-vert-core-${idx}`} geometry={vcg} material={mats.whiteCoreMat} />
        ))}

        {/* Prominent Magenta Status Eyes on front plateaus */}
        {geos.cStatusEyes.map((eg, idx) => (
          <mesh key={`c-status-eye-${idx}`} geometry={eg} material={mats.gunmetalMat} />
        ))}
        {geos.cStatusEyeLenses.map((lg, idx) => (
          <mesh key={`c-status-lens-${idx}`} geometry={lg} material={mats.magentaNeonMat} />
        ))}
        {geos.cStatusEyeCores.map((cg, idx) => (
          <mesh key={`c-status-core-${idx}`} geometry={cg} material={mats.whiteCoreMat} />
        ))}

        {/* Two Knocked-Off Fallen Prisms on Floor Deck */}
        <mesh geometry={geos.cFallen1} material={mats.vMat} />
        <mesh geometry={geos.cFallen1Rim} material={mats.magentaNeonMat} />
        <mesh geometry={geos.cFallen1Glow} material={mats.magentaHaloMat} />

        <mesh geometry={geos.cFallen2} material={mats.vMat} />
        <mesh geometry={geos.cFallen2Glow} material={mats.magentaHaloMat} />

        {/* Directional Floor Spill & Starboard Bulkhead Wash (No discs) */}
        <mesh geometry={geos.cFloorSpill} material={mats.spillDecalMat} />
        <mesh geometry={geos.cWallSpill} material={mats.spillDecalMat} />
        <mesh geometry={geos.cWetSheen} material={mats.wetSheenMat} />
      </group>

      {/* ── Restyled Pilot Seats (Human-Proportioned Ergonomic Scale) ─ */}
      {PILOT_SEATS_CONFIG.map((seat) => (
        <group
          key={seat.id}
          position={seat.position}
          rotation={seat.rotation}
          name={`cockpit-seat-${seat.id}`}
        >
          {geos.seatGeoms.map((sg, idx) => {
            const isSodiumTrim = idx === geos.seatGeoms.length - 1;
            const isCushion = idx === 1;
            return (
              <mesh
                key={`seat-part-${idx}`}
                geometry={sg}
                material={
                  isSodiumTrim
                    ? mats.sodiumNeonMat
                    : isCushion
                    ? mats.sootMat
                    : mats.gunmetalMat
                }
              />
            );
          })}
        </group>
      ))}
    </group>
  );
}

export default CockpitComputers;
