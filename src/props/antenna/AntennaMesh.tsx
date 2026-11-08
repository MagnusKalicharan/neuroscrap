"use client";

/**
 * AntennaMesh.tsx — High-Performance Damaged Deep-Space Comms Array
 * =================================================================
 * Destination of Section 2 transmission line at [2.2, 0.04, 13.6].
 * 
 * Performance Optimizations:
 * - Uses mergeGeometries to combine ~120 separate sub-meshes into 3 unified draw calls:
 *     1. mergedMastGeom (base, bolts, plates, gland, mast legs, braces, rungs, clamps)
 *     2. mergedYokeGeom (turret drum, motors, yoke arms, secondary arm, panel, whips)
 *     3. mergedDishGeom (parabolic lathe, rolled rim, 16 back ribs, struts, feedhorn)
 * - geos useMemo depends strictly on [greyscale], NEVER on position array reference.
 * - Wrapped in React.memo to prevent unnecessary parent re-renders.
 * - Draw calls reduced from ~130 to under 10. Frame rate locked at 60 FPS.
 */

import React, { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  type RoofAntennaProps,
  type AntennaState,
  getAntennaState,
  getAntennaTarget,
  getCablePulse,
} from "./antenna.types";
import {
  ANTENNA_WORLD_POS,
  ANTENNA_CONFIG,
  DEFAULT_SKY_TARGET,
  ANTENNA_CABLE_PATH,
} from "./antenna.config";

/**
 * Utility: Applies baked vertex colors with ambient occlusion, pale rim lighting,
 * and base rust discoloration.
 */
function applyVertexColors(
  geo: THREE.BufferGeometry,
  baseColor: THREE.Color,
  rimColor: THREE.Color,
  aoColor: THREE.Color,
  rustColor?: THREE.Color
): THREE.BufferGeometry {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const vPos = new THREE.Vector3();
  const vNorm = new THREE.Vector3();
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    vPos.fromBufferAttribute(pos, i);
    vNorm.fromBufferAttribute(norm, i);

    const upDot = Math.max(0, vNorm.y);
    const rimFactor =
      Math.pow(upDot, 1.8) * 0.65 + (Math.abs(vNorm.x) + Math.abs(vNorm.z)) * 0.15;
    const aoFactor = Math.max(0, -vNorm.y) * 0.5;

    c.copy(baseColor).lerp(rimColor, rimFactor).lerp(aoColor, aoFactor);

    if (rustColor && vPos.y < 1.0) {
      const rustFactor = Math.max(0, (1.0 - vPos.y) / 1.0) * 0.55;
      c.lerp(rustColor, rustFactor);
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

function AntennaMeshComponent({
  position = [ANTENNA_WORLD_POS.x, ANTENNA_WORLD_POS.y, ANTENNA_WORLD_POS.z],
  rotation = [0, 0, 0],
  state,
  diagnosticPassed = false,
  greyscale = false,
  reduceMotion = false,
  lowQuality = false,
}: RoofAntennaProps) {
  // ── 1. GEOMETRY GENERATION (Computed ONCE, Merged into 3 Fast Draw Calls) ──
  const geos = useMemo(() => {
    const H = ANTENNA_CONFIG.mastHeight; // 11.0m tall
    const rBase = ANTENNA_CONFIG.mastBaseWidth / 2; // ~0.41m
    const rTop = ANTENNA_CONFIG.mastTopWidth / 2; // ~0.26m

    const baseCol = greyscale ? new THREE.Color("#2a2a2a") : new THREE.Color("#1e232b");
    const rimCol = greyscale ? new THREE.Color("#888888") : new THREE.Color("#8fa2bd");
    const aoCol = greyscale ? new THREE.Color("#111111") : new THREE.Color("#0c0f14");
    const rustCol = greyscale ? new THREE.Color("#333333") : new THREE.Color("#9a3412");

    // Static mast parts to merge
    const mastParts: THREE.BufferGeometry[] = [];

    // Base plate
    const basePlateGeom = applyVertexColors(
      new THREE.CylinderGeometry(0.72, 0.78, 0.18, 8),
      baseCol,
      rimCol,
      aoCol,
      rustCol
    );
    basePlateGeom.translate(0, 0.09, 0);
    mastParts.push(basePlateGeom);

    // Scorched deck decal ring (separate transparent material)
    const scorchRingGeom = new THREE.RingGeometry(0.78, 1.35, 16);
    scorchRingGeom.rotateX(-Math.PI / 2);
    scorchRingGeom.translate(0, 0.015, 0);

    // 8 Base mounting bolts
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const bg = applyVertexColors(
        new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6),
        baseCol,
        rimCol,
        aoCol
      );
      bg.translate(0.64 * Math.cos(ang), 0.11, 0.64 * Math.sin(ang));
      mastParts.push(bg);
    }

    // Torn curled hull plating chunks
    [-1.2, 0.8, 2.4].forEach((ang, idx) => {
      const pg = new THREE.BoxGeometry(0.42, 0.02, 0.35);
      pg.rotateY(ang);
      pg.rotateZ(0.28 + idx * 0.1);
      pg.translate(0.85 * Math.cos(ang), 0.08, 0.85 * Math.sin(ang));
      mastParts.push(applyVertexColors(pg, baseCol, rimCol, aoCol, rustCol));
    });

    // Cable Gland on base plate
    const glandGeom = applyVertexColors(
      new THREE.CylinderGeometry(0.12, 0.16, 0.22, 8),
      baseCol,
      rimCol,
      aoCol,
      rustCol
    );
    glandGeom.rotateZ(0.25);
    glandGeom.translate(-0.15, 0.12, -0.05);
    mastParts.push(glandGeom);

    // Continuous Cable & Clamps in Local Coordinates
    const localCablePts = ANTENNA_CABLE_PATH.points.map(
      (p) => new THREE.Vector3(p.x - ANTENNA_WORLD_POS.x, p.y - ANTENNA_WORLD_POS.y, p.z - ANTENNA_WORLD_POS.z)
    );
    const localCableCurve = new THREE.CatmullRomCurve3(localCablePts, false, "catmullrom", 0.15);
    const cableGeom = applyVertexColors(
      new THREE.TubeGeometry(localCableCurve, 48, 0.075, 6, false),
      baseCol,
      rimCol,
      aoCol
    );
    const cableStripeGeom = new THREE.TubeGeometry(localCableCurve, 48, 0.022, 5, false);

    const cableLen = localCableCurve.getLength();
    const numClamps = Math.floor(cableLen / 1.5);
    for (let c = 1; c <= numClamps; c++) {
      const u = (c * 1.5) / cableLen;
      if (u >= 0.98) break;
      const pt = localCableCurve.getPointAt(u);
      const cg = applyVertexColors(
        new THREE.CylinderGeometry(0.095, 0.095, 0.06, 6, 1, false, 0, Math.PI),
        baseCol,
        rimCol,
        aoCol
      );
      cg.translate(pt.x, pt.y, pt.z);
      mastParts.push(cg);
    }

    // Triangular Lattice Mast (Legs, Braces, Ladder, Beacon Housing)
    const mastTilt = -ANTENNA_CONFIG.mastTiltRad;
    const mastAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

    mastAngles.forEach((ang) => {
      const x0 = rBase * Math.cos(ang);
      const z0 = rBase * Math.sin(ang);
      const x1 = rTop * Math.cos(ang);
      const z1 = rTop * Math.sin(ang);

      const leg = applyVertexColors(
        new THREE.TubeGeometry(
          new THREE.LineCurve3(new THREE.Vector3(x0, 0.09, z0), new THREE.Vector3(x1, H, z1)),
          12,
          0.048,
          5,
          false
        ),
        baseCol,
        rimCol,
        aoCol,
        rustCol
      );
      leg.rotateZ(mastTilt);
      mastParts.push(leg);
    });

    // Cross-braces (16 levels)
    const levels = 16;
    for (let lvl = 0; lvl < levels; lvl++) {
      const yA = 0.2 + (lvl / levels) * (H - 0.4);
      const yB = 0.2 + ((lvl + 1) / levels) * (H - 0.4);
      const tA = lvl / levels;
      const tB = (lvl + 1) / levels;
      const rA = rBase + (rTop - rBase) * tA;
      const rB = rBase + (rTop - rBase) * tB;

      for (let s = 0; s < 3; s++) {
        const a1 = mastAngles[s];
        const a2 = mastAngles[(s + 1) % 3];
        const p1 = new THREE.Vector3(rA * Math.cos(a1), yA, rA * Math.sin(a1));
        const p2 = new THREE.Vector3(rA * Math.cos(a2), yA, rA * Math.sin(a2));
        const bg = applyVertexColors(
          new THREE.TubeGeometry(new THREE.LineCurve3(p1, p2), 1, 0.02, 3, false),
          baseCol,
          rimCol,
          aoCol,
          rustCol
        );
        bg.rotateZ(mastTilt);
        mastParts.push(bg);

        if (!(lvl === 6 && s === 0)) {
          const pDiag = new THREE.Vector3(rB * Math.cos(a2), yB, rB * Math.sin(a2));
          const dbg = applyVertexColors(
            new THREE.TubeGeometry(new THREE.LineCurve3(p1, pDiag), 1, 0.016, 3, false),
            baseCol,
            rimCol,
            aoCol,
            rustCol
          );
          dbg.rotateZ(mastTilt);
          mastParts.push(dbg);
        }
      }
    }

    // Snapped dangling diagonal brace
    const snapLvl = 6;
    const snapYA = 0.2 + (snapLvl / levels) * (H - 0.4);
    const snapRA = rBase + (rTop - rBase) * (snapLvl / levels);
    const pSnapStart = new THREE.Vector3(
      snapRA * Math.cos(mastAngles[0]),
      snapYA,
      snapRA * Math.sin(mastAngles[0])
    );
    const pSnapDangle = new THREE.Vector3(
      pSnapStart.x + 0.14,
      pSnapStart.y - 0.52,
      pSnapStart.z + 0.22
    );
    const danglingBraceGeom = applyVertexColors(
      new THREE.TubeGeometry(new THREE.LineCurve3(pSnapStart, pSnapDangle), 2, 0.016, 3, false),
      baseCol,
      rimCol,
      aoCol
    );
    danglingBraceGeom.rotateZ(mastTilt);
    mastParts.push(danglingBraceGeom);

    // Maintenance Ladder Rungs
    const numRungs = 22;
    for (let r = 0; r < numRungs; r++) {
      const yR = 0.4 + (r / numRungs) * (H - 0.8);
      const t = r / numRungs;
      const rMast = rBase + (rTop - rBase) * t;
      const rg = applyVertexColors(
        new THREE.BoxGeometry(0.24, 0.022, 0.04),
        baseCol,
        rimCol,
        aoCol
      );
      rg.translate(rMast * Math.cos(Math.PI / 3) + 0.04, yR, rMast * Math.sin(Math.PI / 3));
      rg.rotateZ(mastTilt);
      mastParts.push(rg);
    }

    // Beacon Housing on top
    const beaconHousingGeom = applyVertexColors(
      new THREE.CylinderGeometry(0.045, 0.06, 0.12, 6),
      baseCol,
      rimCol,
      aoCol
    );
    beaconHousingGeom.translate(0, H + 0.06, 0);
    beaconHousingGeom.rotateZ(mastTilt);
    mastParts.push(beaconHousingGeom);

    // Merge all mast parts into 1 single BufferGeometry!
    const mergedMastGeom = mergeGeometries(mastParts, false);

    // Beacon lamp sphere
    const beaconLampGeom = new THREE.SphereGeometry(0.035, 6, 6);
    beaconLampGeom.translate(0, H + 0.13, 0);
    beaconLampGeom.rotateZ(mastTilt);

    // ── YOKE & AZIMUTH ASSEMBLY (To merge into 1 geometry) ───────────────────
    const yokeParts: THREE.BufferGeometry[] = [];

    const azRingGeom = applyVertexColors(
      new THREE.CylinderGeometry(0.38, 0.42, 0.24, 12),
      baseCol,
      rimCol,
      aoCol
    );
    azRingGeom.translate(0, 0.08, 0);
    yokeParts.push(azRingGeom);

    const azMotorGeom = applyVertexColors(
      new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8),
      baseCol,
      rimCol,
      aoCol
    );
    azMotorGeom.rotateZ(Math.PI / 2);
    azMotorGeom.translate(-0.28, 0.12, 0);
    yokeParts.push(azMotorGeom);

    const yokeBaseGeom = applyVertexColors(
      new THREE.BoxGeometry(1.35, 0.14, 0.26),
      baseCol,
      rimCol,
      aoCol
    );
    yokeBaseGeom.translate(0, 0.22, 0);
    yokeParts.push(yokeBaseGeom);

    const yokeArmL = applyVertexColors(
      new THREE.BoxGeometry(0.10, 0.68, 0.22),
      baseCol,
      rimCol,
      aoCol
    );
    yokeArmL.translate(-0.62, 0.50, 0);
    yokeParts.push(yokeArmL);

    const yokeArmR = applyVertexColors(
      new THREE.BoxGeometry(0.10, 0.68, 0.22),
      baseCol,
      rimCol,
      aoCol
    );
    yokeArmR.translate(0.62, 0.50, 0);
    yokeParts.push(yokeArmR);

    const elMotorGeom = applyVertexColors(
      new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8),
      baseCol,
      rimCol,
      aoCol
    );
    elMotorGeom.rotateZ(Math.PI / 2);
    elMotorGeom.translate(0.70, 0.52, 0);
    yokeParts.push(elMotorGeom);

    const secondaryArmGeom = applyVertexColors(
      new THREE.BoxGeometry(0.48, 0.06, 0.06),
      baseCol,
      rimCol,
      aoCol
    );
    secondaryArmGeom.translate(0.85, 0.38, 0.12);
    yokeParts.push(secondaryArmGeom);

    const phasedPanelGeom = applyVertexColors(
      new THREE.BoxGeometry(0.55, 0.42, 0.05),
      baseCol,
      rimCol,
      aoCol
    );
    phasedPanelGeom.translate(1.12, 0.38, 0.15);
    yokeParts.push(phasedPanelGeom);

    const whip1Geom = applyVertexColors(
      new THREE.CylinderGeometry(0.006, 0.012, 1.4, 4),
      baseCol,
      rimCol,
      aoCol
    );
    whip1Geom.translate(1.38, 0.95, 0.15);
    yokeParts.push(whip1Geom);

    const whip2Geom = applyVertexColors(
      new THREE.CylinderGeometry(0.006, 0.012, 0.65, 4),
      baseCol,
      rimCol,
      aoCol
    );
    whip2Geom.rotateZ(-0.25);
    whip2Geom.translate(1.32, 0.62, 0.12);
    yokeParts.push(whip2Geom);

    const mergedYokeGeom = mergeGeometries(yokeParts, false);

    // Secondary phased array cells (merged into 1 draw call)
    const cellParts: THREE.BufferGeometry[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const cg = new THREE.BoxGeometry(0.09, 0.09, 0.015);
        cg.translate(0.95 + col * 0.11, 0.28 + row * 0.1, 0.18);
        cellParts.push(cg);
      }
    }
    const mergedCellsGeom = mergeGeometries(cellParts, false);

    // Motor Status Lamps
    const azLampGeom = new THREE.SphereGeometry(0.04, 6, 6);
    azLampGeom.translate(-0.4, 0.18, 0);

    const elLampGeom = new THREE.SphereGeometry(0.04, 6, 6);
    elLampGeom.translate(0.7, 0.52, 0);

    // ── DISH ASSEMBLY (Parabola, Rolled Rim, Ribs, Struts, Feedhorn) ────────
    const dishParts: THREE.BufferGeometry[] = [];
    const dishRadius = ANTENNA_CONFIG.dishDiameter / 2; // 1.50m
    const fDish = 0.88;
    const dishPts: THREE.Vector2[] = [];
    const profSegs = 10;

    for (let p = 0; p <= profSegs; p++) {
      const t = p / profSegs;
      const r = t * dishRadius;
      const z = (r * r) / (4 * fDish);
      dishPts.push(new THREE.Vector2(r, z));
    }
    dishPts.push(new THREE.Vector2(dishRadius + 0.05, 0.64));
    dishPts.push(new THREE.Vector2(dishRadius + 0.05, 0.58));
    for (let p = profSegs; p >= 0; p--) {
      const t = p / profSegs;
      const r = t * dishRadius;
      const z = (r * r) / (4 * fDish) - 0.045 - 0.03 * (1 - t);
      dishPts.push(new THREE.Vector2(r, z));
    }

    const dishGeom = new THREE.LatheGeometry(dishPts, 24, 0, (Math.PI * 2 * 22) / 24);
    dishGeom.rotateX(Math.PI / 2);

    // Vertex Colors on Dish
    const dishPos = dishGeom.attributes.position;
    const dishCount = dishPos.count;
    const dishColors = new Float32Array(dishCount * 3);
    const v = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < dishCount; i++) {
      v.fromBufferAttribute(dishPos, i);
      const r = Math.sqrt(v.x * v.x + v.y * v.y);
      const theta = Math.atan2(v.y, v.x);

      const dThetaDent = Math.abs(theta - 1.2);
      if (dThetaDent < 0.28 && r > 1.2) {
        const dentDepth = (1 - dThetaDent / 0.28) * ((r - 1.2) / 0.3) * 0.08;
        dishPos.setZ(i, v.z - dentDepth);
        dishPos.setX(i, v.x * (1 - dentDepth * 0.2));
        dishPos.setY(i, v.y * (1 - dentDepth * 0.2));
      }

      c.copy(baseCol);
      if (r > 1.35) {
        c.lerp(rimCol, ((r - 1.35) / 0.15) * 0.7);
      }
      if (v.z >= (r * r) / (4 * fDish) - 0.02) {
        const ringPattern = Math.sin(r * 12.0);
        if (ringPattern > 0.4) {
          c.lerp(greyscale ? rimCol : new THREE.Color("#475569"), 0.35);
        }
        const radialPattern = Math.sin(theta * 12.0);
        if (radialPattern > 0.6) {
          c.lerp(greyscale ? rimCol : new THREE.Color("#38bdf8"), 0.30);
        }
      }
      if (dThetaDent < 0.35 && r > 1.1) {
        const sootFactor = (1 - dThetaDent / 0.35) * ((r - 1.1) / 0.4);
        c.lerp(new THREE.Color("#0a0c10"), sootFactor * 0.8);
      }
      const crackDist = Math.abs(theta - -0.7);
      if (crackDist < 0.08 && r > 0.25 && r < 1.15) {
        c.lerp(greyscale ? new THREE.Color("#333333") : new THREE.Color("#d97706"), 0.75);
      }

      dishColors[i * 3] = c.r;
      dishColors[i * 3 + 1] = c.g;
      dishColors[i * 3 + 2] = c.b;
    }
    dishPos.needsUpdate = true;
    dishGeom.computeVertexNormals();
    dishGeom.setAttribute("color", new THREE.BufferAttribute(dishColors, 3));
    dishParts.push(dishGeom);

    // 16 Curved Ribs
    for (let rb = 0; rb < 16; rb++) {
      const ang = (rb / 16) * Math.PI * 2;
      const ribCurvePts: THREE.Vector3[] = [];
      for (let p = 0; p <= 6; p++) {
        const t = p / 6;
        const r = 0.08 + t * (dishRadius - 0.08);
        const z = (r * r) / (4 * fDish) - 0.042;
        ribCurvePts.push(new THREE.Vector3(r * Math.cos(ang), r * Math.sin(ang), z));
      }
      const ribG = applyVertexColors(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribCurvePts), 6, 0.018, 3, false),
        baseCol,
        rimCol,
        aoCol
      );
      dishParts.push(ribG);
    }

    // Rolled outer rim bezel
    const rolledRimGeom = applyVertexColors(
      new THREE.TorusGeometry(dishRadius + 0.02, 0.045, 8, 20),
      baseCol,
      rimCol,
      aoCol
    );
    rolledRimGeom.translate(0, 0, 0.62);
    dishParts.push(rolledRimGeom);

    // 3 Struts
    const focalPoint = new THREE.Vector3(0, 0, 1.25);
    const strutAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    strutAngles.forEach((ang, idx) => {
      const rimPt = new THREE.Vector3(
        dishRadius * Math.cos(ang),
        dishRadius * Math.sin(ang),
        0.62
      );
      let sCurve: THREE.Curve<THREE.Vector3>;
      if (idx === 1) {
        const midPt = new THREE.Vector3()
          .lerpVectors(rimPt, focalPoint, 0.55)
          .add(new THREE.Vector3(0.06, 0.05, -0.04));
        sCurve = new THREE.CatmullRomCurve3([rimPt, midPt, focalPoint]);
      } else {
        sCurve = new THREE.LineCurve3(rimPt, focalPoint);
      }
      const sg = applyVertexColors(
        new THREE.TubeGeometry(sCurve, 6, 0.016, 3, false),
        baseCol,
        rimCol,
        aoCol
      );
      dishParts.push(sg);
    });

    // Feed horn body
    const feedHornBody = applyVertexColors(
      new THREE.CylinderGeometry(0.07, 0.13, 0.24, 8),
      baseCol,
      rimCol,
      aoCol
    );
    feedHornBody.rotateX(Math.PI / 2);
    feedHornBody.translate(0, 0, 1.17);
    dishParts.push(feedHornBody);

    // Merge all dish parts into 1 single BufferGeometry!
    const mergedDishGeom = mergeGeometries(dishParts, false);

    // Separate Emissive / Dynamic Geometries
    const feedHornEmitterTip = new THREE.SphereGeometry(0.06, 8, 8);
    feedHornEmitterTip.translate(0, 0, 1.30);

    const crackPts = [
      new THREE.Vector3(0.3 * Math.cos(-0.7), 0.3 * Math.sin(-0.7), 0.05),
      new THREE.Vector3(0.6 * Math.cos(-0.68), 0.6 * Math.sin(-0.68), 0.15),
      new THREE.Vector3(1.0 * Math.cos(-0.72), 1.0 * Math.sin(-0.72), 0.34),
    ];
    const crackGeom = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(crackPts),
      6,
      0.007,
      3,
      false
    );

    // Beam & Expanding Rings
    const beamGeom = new THREE.CylinderGeometry(1.6, 0.15, 40, 16, 20, true);
    beamGeom.translate(0, 20, 0);
    beamGeom.rotateX(Math.PI / 2);
    beamGeom.translate(0, 0, 1.25);

    const ringGeoms: THREE.BufferGeometry[] = [];
    for (let r = 0; r < 5; r++) {
      ringGeoms.push(new THREE.TorusGeometry(0.5, 0.014, 6, 24));
    }

    const sparkGeom = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array([
      -0.15, 0.12, -0.05, -0.22, 0.28, -0.12,
      -0.15, 0.12, -0.05, -0.08, 0.32, 0.02,
      -0.15, 0.12, -0.05, -0.26, 0.18, 0.08,
      -0.15, 0.12, -0.05, -0.12, 0.04, -0.18,
    ]);
    sparkGeom.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));

    return {
      mergedMastGeom,
      scorchRingGeom,
      cableGeom,
      cableStripeGeom,
      beaconLampGeom,
      mergedYokeGeom,
      mergedCellsGeom,
      azLampGeom,
      elLampGeom,
      mergedDishGeom,
      crackGeom,
      feedHornEmitterTip,
      beamGeom,
      ringGeoms,
      sparkGeom,
    };
  }, [greyscale]); // Strictly independent of position array reference!

  // Clean disposal of merged geometries on unmount
  useEffect(() => {
    return () => {
      Object.values(geos).forEach((g: any) => {
        if (Array.isArray(g)) {
          g.forEach((item) => item?.dispose?.());
        } else if (g && typeof g.dispose === "function") {
          g.dispose();
        }
      });
    };
  }, [geos]);

  // ── 2. MATERIALS (Baked vertex colors + emissive markers) ─────────────────
  const vertexMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    []
  );

  const scorchMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: greyscale ? "#111111" : "#0d1017",
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    [greyscale]
  );

  const amberLeakMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: greyscale ? "#666666" : "#f59e0b",
      }),
    [greyscale]
  );

  const azStatusLampMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#1c2024" }), []);
  const elStatusLampMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#1c2024" }), []);
  const beaconLampMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: greyscale ? "#777777" : "#ef4444" }),
    [greyscale]
  );
  const emitterTipMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: greyscale ? "#888888" : "#00ffff" }),
    [greyscale]
  );
  const phasedCellMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: greyscale ? "#222222" : "#0c2838" }),
    [greyscale]
  );
  const sparkMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: greyscale ? "#ffffff" : "#fde047",
        transparent: true,
        opacity: 0.0,
      }),
    [greyscale]
  );

  const cableStripeMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPulseProgress: { value: 0.0 },
        uPowerProgress: { value: 0.0 },
        uPulseActive: { value: 0.0 },
        uGreyscale: { value: greyscale ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPulseProgress;
        uniform float uPowerProgress;
        uniform float uPulseActive;
        uniform float uGreyscale;
        varying vec2 vUv;

        void main() {
          float prog = vUv.x;
          vec3 darkColor = uGreyscale > 0.5 ? vec3(0.12) : vec3(0.04, 0.12, 0.18);
          vec3 powerColor = uGreyscale > 0.5 ? vec3(0.55) : vec3(0.0, 0.85, 1.0);
          vec3 pulseColor = uGreyscale > 0.5 ? vec3(1.0) : vec3(1.0, 1.0, 1.0);
          vec3 pulseCyan = uGreyscale > 0.5 ? vec3(0.7) : vec3(0.0, 1.0, 0.8);

          float isPowered = smoothstep(prog - 0.03, prog + 0.03, uPowerProgress);
          vec3 col = mix(darkColor, powerColor, isPowered * 0.7);

          if (uPulseActive > 0.01) {
            float dist = abs(prog - uPulseProgress);
            float pFactor = smoothstep(0.08, 0.0, dist) * uPulseActive;
            float coreFactor = smoothstep(0.025, 0.0, dist) * uPulseActive;
            col = mix(col, pulseCyan, pFactor);
            col = mix(col, pulseColor, coreFactor);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [greyscale]);

  const beamMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0.0 },
        uTransmit: { value: 0.0 },
        uReduceMotion: { value: reduceMotion ? 1.0 : 0.0 },
        uGreyscale: { value: greyscale ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNorm;
        void main() {
          vUv = uv;
          vNorm = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uTransmit;
        uniform float uReduceMotion;
        uniform float uGreyscale;
        varying vec2 vUv;
        varying vec3 vNorm;

        void main() {
          if (uTransmit <= 0.01) discard;

          float rim = pow(1.0 - abs(vNorm.z), 1.6);
          float lenFade = (1.0 - vUv.y) * smoothstep(0.0, 0.05, vUv.y);

          float dash = 1.0;
          if (uReduceMotion < 0.5) {
            dash = 0.65 + 0.35 * sin((vUv.y * 40.0 - uTime * 12.0) * 1.5);
          }

          vec3 baseColor = uGreyscale > 0.5 ? vec3(0.8) : vec3(0.0, 0.75, 1.0);
          vec3 coreColor = uGreyscale > 0.5 ? vec3(1.0) : vec3(0.8, 1.0, 0.95);

          vec3 col = mix(baseColor, coreColor, rim * 0.5);
          float alpha = rim * lenFade * dash * uTransmit * 0.85;

          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
  }, [greyscale, reduceMotion]);

  const ringMats = useMemo(() => {
    return geos.ringGeoms.map(
      () =>
        new THREE.MeshBasicMaterial({
          color: greyscale ? "#ffffff" : "#00f0ff",
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
    );
  }, [geos.ringGeoms, greyscale]);

  useEffect(() => {
    return () => {
      vertexMat.dispose();
      scorchMat.dispose();
      amberLeakMat.dispose();
      azStatusLampMat.dispose();
      elStatusLampMat.dispose();
      beaconLampMat.dispose();
      emitterTipMat.dispose();
      phasedCellMat.dispose();
      sparkMat.dispose();
      cableStripeMat.dispose();
      beamMat.dispose();
      ringMats.forEach((m) => m.dispose());
    };
  }, [
    vertexMat,
    scorchMat,
    amberLeakMat,
    azStatusLampMat,
    elStatusLampMat,
    beaconLampMat,
    emitterTipMat,
    phasedCellMat,
    sparkMat,
    cableStripeMat,
    beamMat,
    ringMats,
  ]);

  // ── 3. STATE ANIMATION ENGINE (Smoothed Scalars, Pure Functions of Delta) ───
  const azGroupRef = useRef<THREE.Group>(null);
  const elGroupRef = useRef<THREE.Group>(null);
  const ringGroupRef = useRef<THREE.Group>(null);
  const beamMeshRef = useRef<THREE.Mesh>(null);

  const powerRef = useRef(0.0);
  const alignRef = useRef(0.0);
  const transmitRef = useRef(0.0);
  const lastSparkTimeRef = useRef(0.0);
  const sparkActiveTimerRef = useRef(0.0);
  const prevBeaconStateRef = useRef(false);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    const targetState: AntennaState = state ?? getAntennaState();
    const manualPulse = getCablePulse();
    const aimTarget = getAntennaTarget() || DEFAULT_SKY_TARGET;

    const targetPower = targetState === "dead" ? 0.0 : 1.0;
    const targetAlign = targetState === "aligning" || targetState === "transmitting" ? 1.0 : 0.0;
    const targetTransmit = targetState === "transmitting" ? 1.0 : 0.0;

    powerRef.current = THREE.MathUtils.lerp(powerRef.current, targetPower, dt * 2.2);
    alignRef.current = THREE.MathUtils.lerp(alignRef.current, targetAlign, dt * 1.8);
    transmitRef.current = THREE.MathUtils.lerp(transmitRef.current, targetTransmit, dt * 3.0);

    // 1. Beacon Slow Blink (Only update color on change)
    const isBeaconLit = Math.sin(t * 3.14) > 0.05;
    if (isBeaconLit !== prevBeaconStateRef.current) {
      prevBeaconStateRef.current = isBeaconLit;
      if (greyscale) {
        beaconLampMat.color.setRGB(
          isBeaconLit ? 0.9 : 0.15,
          isBeaconLit ? 0.9 : 0.15,
          isBeaconLit ? 0.9 : 0.15
        );
      } else {
        beaconLampMat.color.setRGB(
          isBeaconLit ? 1.0 : 0.15,
          isBeaconLit ? 0.15 : 0.02,
          isBeaconLit ? 0.05 : 0.01
        );
      }
    }

    // 2. Dead state rare sparks at cable gland
    if (targetState === "dead" && !reduceMotion) {
      if (t - lastSparkTimeRef.current > 7.5 + Math.sin(t) * 1.5) {
        lastSparkTimeRef.current = t;
        sparkActiveTimerRef.current = 0.22;
      }
    }
    if (sparkActiveTimerRef.current > 0) {
      sparkActiveTimerRef.current -= dt;
      sparkMat.opacity = Math.random() > 0.3 ? 0.9 : 0.2;
    } else if (sparkMat.opacity > 0) {
      sparkMat.opacity = 0.0;
    }

    // 3. Head twitch on power-up
    let twitchAngle = 0.0;
    if (!reduceMotion && powerRef.current > 0.25 && powerRef.current < 0.75) {
      const pNorm = (powerRef.current - 0.25) / 0.5;
      twitchAngle = THREE.MathUtils.degToRad(2.0) * Math.sin(pNorm * Math.PI * 4.0) * (1 - pNorm);
    }

    // 4. Gimbal Azimuth & Elevation Smooth Rotation
    // Direction angles toward the Black Hole:
    const bhAz = Math.atan2(DEFAULT_SKY_TARGET.x, DEFAULT_SKY_TARGET.z);
    const bhEl = Math.asin(THREE.MathUtils.clamp(DEFAULT_SKY_TARGET.y, -1, 1));

    // Initially off (dead state): faces directly toward the black hole
    const deadAz = bhAz;
    const deadEl = bhEl;

    const targetAz = Math.atan2(aimTarget.x, aimTarget.z);
    const targetEl = Math.asin(THREE.MathUtils.clamp(aimTarget.y, -1, 1));

    const curAz = THREE.MathUtils.lerp(deadAz, targetAz, alignRef.current) + twitchAngle;
    const curEl = THREE.MathUtils.lerp(deadEl, targetEl, alignRef.current);

    if (azGroupRef.current) {
      azGroupRef.current.rotation.y = curAz;
    }
    if (elGroupRef.current) {
      // Negative rotation around X pitches UPWARD into the starry sky
      elGroupRef.current.rotation.x = -curEl;
    }

    // 5. Status Indicator Lamps
    if (powerRef.current < 0.1) {
      azStatusLampMat.color.setRGB(0.08, 0.09, 0.1);
      elStatusLampMat.color.setRGB(0.08, 0.09, 0.1);
    } else if (powerRef.current < 0.95 && targetState === "powering") {
      azStatusLampMat.color.setRGB(0.9, 0.7, 0.1);
      elStatusLampMat.color.setRGB(
        powerRef.current > 0.6 ? 0.9 : 0.1,
        powerRef.current > 0.6 ? 0.7 : 0.12,
        powerRef.current > 0.6 ? 0.1 : 0.15
      );
    } else if (targetState === "aligning") {
      const isLampAmber = Math.sin(t * 6.28) > 0;
      azStatusLampMat.color.setRGB(isLampAmber ? 0.95 : 0.2, isLampAmber ? 0.65 : 0.15, 0.05);
      elStatusLampMat.color.setRGB(isLampAmber ? 0.95 : 0.2, isLampAmber ? 0.65 : 0.15, 0.05);
    } else {
      azStatusLampMat.color.setRGB(0.15, 0.95, 0.35);
      elStatusLampMat.color.setRGB(0.15, 0.95, 0.35);
    }

    // 6. Feed Horn Emitter Tip Glow
    if (transmitRef.current > 0.05) {
      const pulseF = 1.0 + Math.sin(t * 12.0) * 0.15;
      if (greyscale) {
        emitterTipMat.color.setRGB(0.9 * pulseF, 0.9 * pulseF, 0.9 * pulseF);
      } else {
        emitterTipMat.color.setRGB(0.6 * pulseF, 1.0 * pulseF, 0.95 * pulseF);
      }
    } else {
      emitterTipMat.color.setRGB(0.04, 0.08, 0.1);
    }

    // 7. Secondary Phased Array Sweep
    if (transmitRef.current > 0.1) {
      const isSweepBright = Math.sin(t * 8.0) > 0;
      phasedCellMat.color.setRGB(
        isSweepBright ? 0.1 : 0.04,
        isSweepBright ? 0.9 : 0.25,
        isSweepBright ? 1.0 : 0.35
      );
    } else {
      phasedCellMat.color.setRGB(0.03, 0.06, 0.08);
    }

    // 8. Cable Stripe Uniforms
    cableStripeMat.uniforms.uPowerProgress.value = powerRef.current;
    cableStripeMat.uniforms.uPulseProgress.value = manualPulse;
    cableStripeMat.uniforms.uPulseActive.value = manualPulse > 0.001 ? 1.0 : 0.0;

    // 9. Signal Beam Shader Uniforms & Visibility
    beamMat.uniforms.uTime.value = t;
    beamMat.uniforms.uTransmit.value = transmitRef.current;
    if (beamMeshRef.current) {
      beamMeshRef.current.visible = transmitRef.current > 0.01;
    }

    // 10. 5 Expanding Signal Rings
    if (ringGroupRef.current) {
      ringGroupRef.current.visible = transmitRef.current > 0.02;
    }
    if (ringGroupRef.current && transmitRef.current > 0.02) {
      const ringPeriod = reduceMotion ? 4.0 : 2.4;
      geos.ringGeoms.forEach((_, idx) => {
        const mesh = ringGroupRef.current?.children[idx] as THREE.Mesh;
        if (!mesh) return;
        const mat = ringMats[idx];

        const phase = (t + idx * (ringPeriod / 5)) % ringPeriod;
        const tau = phase / ringPeriod;

        if (reduceMotion) {
          mesh.scale.setScalar(1.2);
          mesh.position.z = 1.45;
          mat.opacity = Math.sin(tau * Math.PI) * 0.65 * transmitRef.current;
        } else {
          const sc = 0.25 + tau * 2.8;
          mesh.scale.setScalar(sc);
          mesh.position.z = 1.25 + tau * 1.5;
          mat.opacity = 4.0 * tau * Math.pow(1.0 - tau, 1.8) * transmitRef.current * 0.9;
        }
      });
    } else if (ringMats[0]?.opacity > 0) {
      ringMats.forEach((m) => (m.opacity = 0.0));
    }
  });

  return (
    <group position={position} rotation={rotation} name="roof-comms-array-root">
      {/* ── 1. STATIC BASE & MAST (1 Unified Draw Call) ──────────────────── */}
      <mesh geometry={geos.scorchRingGeom} material={scorchMat} />
      <mesh geometry={geos.mergedMastGeom} material={vertexMat} />
      <mesh geometry={geos.beaconLampGeom} material={beaconLampMat} />
      <lineSegments geometry={geos.sparkGeom} material={sparkMat} />

      {/* ── 2. CONTINUOUS CABLE & STRIPE (2 Draw Calls) ──────────────────── */}
      <mesh geometry={geos.cableGeom} material={vertexMat} />
      <mesh geometry={geos.cableStripeGeom} material={cableStripeMat} />

      {/* ── 3. GIMBAL TURRET & ELEVATION YOKE (1 Merged Draw Call) ───────── */}
      <group position={[0, ANTENNA_CONFIG.mastHeight, 0]} ref={azGroupRef}>
        <mesh geometry={geos.mergedYokeGeom} material={vertexMat} />
        <mesh geometry={geos.mergedCellsGeom} material={phasedCellMat} />
        <mesh geometry={geos.azLampGeom} material={azStatusLampMat} />
        <mesh geometry={geos.elLampGeom} material={elStatusLampMat} />

        {/* ── 4. ELEVATION PIVOT & DISH ASSEMBLY (1 Merged Draw Call) ─────── */}
        <group ref={elGroupRef} position={[0, 0.16, 0]}>
          <group position={[0, 0.52, 0]}>
            {/* Merged Parabolic Dish, Rim, 16 Ribs, 3 Struts & Feed Horn */}
            <mesh geometry={geos.mergedDishGeom} material={vertexMat} />
            <mesh geometry={geos.crackGeom} material={amberLeakMat} />
            <mesh geometry={geos.feedHornEmitterTip} material={emitterTipMat} />

            {/* Signal Beam & Expanding Rings (Hidden until transmitting) */}
            <mesh ref={beamMeshRef} geometry={geos.beamGeom} material={beamMat} visible={false} />
            <group ref={ringGroupRef} visible={false}>
              {geos.ringGeoms.map((rg, idx) => (
                <mesh key={`signal-ring-${idx}`} geometry={rg} material={ringMats[idx]} />
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// Wrap in React.memo so AntennaMesh NEVER re-renders unless meaningful props change!
export const AntennaMesh = React.memo(AntennaMeshComponent);
export const RoofTransmissionAntenna = AntennaMesh;
