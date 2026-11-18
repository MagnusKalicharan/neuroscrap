/**
 * src/ending/ship/shipGeometry.ts
 * ============================================================
 * Procedural geometries with baked vertex colors (fake AO, pale rim light, grime)
 * for the 70m flattened-disc Rescue Two saucer.
 * 
 * Round 2 Corrections:
 * - Up to 14 draw calls and 40k triangles.
 * - Rebuilt Landing Gear (3 legs at 120°): recessed pods, doors, hip pivot,
 *   hexagonal upper strut (1.2m section), knee cylinder along hinge axis,
 *   lower strut, flat 4m wide footpad disc (normal up, level), and hydraulic piston.
 *   Joints overlap struts by >= 10 cm.
 * - Rebuilt Belly Cargo Ramp: outer-edge hinge at r=24m, length clearance/sin(22°),
 *   swings down to y = -14.0m, side rails, grip stripes, warm lit interior (core #FFE2A8).
 * - Searchlight Volumetric Cone (tapered mesh with smooth width & length falloff)
 *   and Ground Light Pools (searchlight pool & ramp spill pool, additive, polygon offset).
 */
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LEG_ANGLES, FOOTPAD_RADIUS, FOOTPAD_THICKNESS } from "./landingGearKinematics.ts";
import { RAMP_LENGTH, RAMP_WIDTH, RAMP_ANGLE_RAD, RAMP_HINGE_Y, RAMP_HINGE_Z } from "./cargoRampKinematics.ts";

export function bakeVertexColors(
  geometry: THREE.BufferGeometry,
  colorEvaluator: (pos: THREE.Vector3, norm: THREE.Vector3, uv?: THREE.Vector2) => THREE.Color
): THREE.BufferGeometry {
  const pos = geometry.attributes.position;
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  const norm = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const u = new THREE.Vector2();

  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos as THREE.BufferAttribute, i);
    n.fromBufferAttribute(norm as THREE.BufferAttribute, i);
    if (uv) {
      u.fromBufferAttribute(uv as THREE.BufferAttribute, i);
    }

    const c = colorEvaluator(p, n, u);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export interface RescueShipGeometries {
  hullGeom: THREE.BufferGeometry;               // Main Saucer Hull (Draw Call 1)
  canopyDomeGeom: THREE.BufferGeometry;         // 14m x 6m Glass Dome (Draw Call 2)
  canopyFrameGeom: THREE.BufferGeometry;        // Metal Frame Ring & Arch Ribs
  windowsGeom: THREE.BufferGeometry;            // 24 Recessed Amber Rim Windows (Draw Call 3)
  windowHalosGeom: THREE.BufferGeometry;        // 24 Additive Halo Quads (Draw Call 4)
  engineBellGeom: THREE.BufferGeometry;         // 13m Engine Bell & Stepped Nozzle (Draw Call 5)
  thrusterPodsGeom: THREE.BufferGeometry;       // 4 Rim Thrusters with Dual Nozzles (Draw Call 6)
  searchlightHousingGeom: THREE.BufferGeometry; // Underside Searchlight Housing & Lens (Draw Call 7)
  legPodUpperGeom: THREE.BufferGeometry;        // Landing Gear: Pods & Upper Struts (Draw Call 8)
  legLowerFootGeom: THREE.BufferGeometry;       // Landing Gear: Lower Struts & 4m Footpads (Draw Call 9)
  cargoRampGeom: THREE.BufferGeometry;          // Belly Cargo Ramp Hatch & Rails (Draw Call 10)
  cargoInteriorBayGeom: THREE.BufferGeometry;   // Lit Cargo Bay Interior Panel (Draw Call 11)
  searchlightConeGeom: THREE.BufferGeometry;    // Soft Volumetric Searchlight Cone (Draw Call 12)
  groundPoolsGeom: THREE.BufferGeometry;        // Searchlight & Ramp Ground Light Pools (Draw Call 13)
  totalTriangles: number;
}

export function buildRescueShipGeometries(): RescueShipGeometries {
  const R_MAX = 35.0; // 70m diameter

  // ── 1. MAIN SAUCER HULL (70m diameter, 14m height) ─────────────────────────
  // Lathe profile ordered from bottom to top so face normals point OUTWARD
  const profilePts: THREE.Vector2[] = [
    new THREE.Vector2(0.1, -6.9),  // Central thrust mount (ventral)
    new THREE.Vector2(6.8, -6.9),  // Engine socket recess
    new THREE.Vector2(12.0, -6.3), // Engine socket outer collar
    new THREE.Vector2(18.0, -5.3), // Ventral inner slope
    new THREE.Vector2(25.0, -3.8), // Ventral mid slope
    new THREE.Vector2(31.5, -2.0), // Ventral rim bevel
    new THREE.Vector2(34.2, -1.0), // Ventral rim edge
    new THREE.Vector2(R_MAX, -0.8),// Outer equator bottom
    new THREE.Vector2(R_MAX, 0.8), // Outer equator top
    new THREE.Vector2(34.2, 0.9),  // Upper rim edge
    new THREE.Vector2(31.5, 1.8),  // Upper rim bevel
    new THREE.Vector2(25.0, 3.4),  // Dorsal outer slope
    new THREE.Vector2(18.0, 4.9),  // Dorsal mid slope
    new THREE.Vector2(12.0, 5.9),  // Dorsal inner deck
    new THREE.Vector2(7.8, 6.2),   // Bevel lip
    new THREE.Vector2(7.0, 5.8),   // Canopy base collar (14m wide)
    new THREE.Vector2(0.1, 5.8),   // Top canopy seat (dorsal)
  ];

  const rawHullGeom = new THREE.LatheGeometry(profilePts, 56);
  rawHullGeom.computeVertexNormals();

  const hullGeom = bakeVertexColors(rawHullGeom, (pos, norm) => {
    const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const y = pos.y;

    const baseCol = new THREE.Color(0.812, 0.784, 0.737); // Warm light grey #CFC8BC

    // Gradient towards underside
    if (y < 1.0) {
      const underFactor = Math.min(1.0, Math.max(0.0, (1.0 - y) / 7.5));
      baseCol.lerp(new THREE.Color(0.20, 0.18, 0.17), underFactor * 0.85);
    }

    // Pale rim light along outer equator (#FFF4E0)
    if (r > 30.5 && y > -0.2) {
      const rimFactor = Math.min(1.0, (r - 30.5) / 4.5);
      baseCol.lerp(new THREE.Color(1.0, 0.957, 0.878), rimFactor * 0.45);
    }

    // Fake AO
    let ao = 1.0;
    if (r > 6.8 && r < 8.5 && y > 5.5) ao *= 0.52; // Canopy collar shadow
    if (y < -5.8 && r < 11.0) ao *= 0.35 + (r / 11.0) * 0.35; // Engine cavity shadow
    if (r > 30.0 && y < 0.0) ao *= 0.55; // Underside rim recess shadow

    const lightDot = Math.max(0.0, norm.y * 0.4 + 0.6);
    baseCol.multiplyScalar(lightDot);
    baseCol.multiplyScalar(ao);

    return baseCol;
  });

  // ── 2. CANOPY (14m wide x 6m tall raised glass dome & metal frame) ─────────
  const canopyPts: THREE.Vector2[] = [];
  const cRadius = 7.0;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const rad = Math.sqrt(Math.max(0, 1.0 - t * t)) * cRadius;
    const h = 5.8 + t * 6.0;
    canopyPts.push(new THREE.Vector2(Math.max(0.05, rad), h));
  }
  const rawCanopyDomeGeom = new THREE.LatheGeometry(canopyPts, 40);
  rawCanopyDomeGeom.computeVertexNormals();

  const canopyDomeGeom = bakeVertexColors(rawCanopyDomeGeom, (pos, norm) => {
    const c = new THREE.Color(0.04, 0.07, 0.11);
    const grazing = Math.pow(1.0 - Math.max(0.0, norm.y), 2.4);
    c.lerp(new THREE.Color(0.42, 0.88, 0.94), grazing * 0.65);
    if (pos.y < 8.0) {
      c.lerp(new THREE.Color(0.85, 0.55, 0.12), (1.0 - (pos.y - 5.8) / 2.2) * 0.22);
    }
    return c;
  });

  const frameParts: THREE.BufferGeometry[] = [];
  const baseRing = new THREE.CylinderGeometry(7.15, 7.45, 0.6, 40, 1, true);
  baseRing.translate(0, 6.05, 0);
  frameParts.push(baseRing);

  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const ribPts: THREE.Vector3[] = [];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12;
      const rad = Math.sqrt(Math.max(0, 1.0 - t * t)) * 7.12;
      const h = 5.8 + t * 6.05;
      ribPts.push(new THREE.Vector3(rad * Math.cos(ang), h, rad * Math.sin(ang)));
    }
    const ribCurve = new THREE.CatmullRomCurve3(ribPts);
    const ribGeom = new THREE.TubeGeometry(ribCurve, 12, 0.18, 6, false);
    frameParts.push(ribGeom);
  }
  const rawCanopyFrameGeom = BufferGeometryUtils.mergeGeometries(frameParts, false)!;
  rawCanopyFrameGeom.computeVertexNormals();
  const canopyFrameGeom = bakeVertexColors(rawCanopyFrameGeom, () => new THREE.Color(0.35, 0.33, 0.30));

  // ── 3. 24 RECESSED AMBER RIM WINDOWS ───────────────────────────────────────
  const windowParts: THREE.BufferGeometry[] = [];
  const haloParts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const wGeom = new THREE.BoxGeometry(0.5, 0.72, 1.45);
    wGeom.translate(34.82, 0.0, 0);
    wGeom.rotateY(-angle);
    windowParts.push(wGeom);

    const haloGeom = new THREE.PlaneGeometry(2.4, 1.6);
    haloGeom.rotateY(Math.PI / 2);
    haloGeom.translate(35.05, 0.0, 0);
    haloGeom.rotateY(-angle);
    haloParts.push(haloGeom);
  }

  const rawWindowsGeom = BufferGeometryUtils.mergeGeometries(windowParts, false)!;
  rawWindowsGeom.computeVertexNormals();
  const windowsGeom = bakeVertexColors(rawWindowsGeom, (pos) => {
    const isCore = Math.abs(pos.y) < 0.22;
    return isCore
      ? new THREE.Color(1.0, 0.886, 0.659) // #FFE2A8
      : new THREE.Color(1.0, 0.604, 0.122); // #FF9A1F
  });

  const rawHalosGeom = BufferGeometryUtils.mergeGeometries(haloParts, false)!;
  const windowHalosGeom = rawHalosGeom;

  // ── 4. 13m ENGINE BELL (Stepped titanium nozzle ring & hot core) ───────────
  const enginePts: THREE.Vector2[] = [
    new THREE.Vector2(0.2, -6.9),
    new THREE.Vector2(2.8, -7.0),
    new THREE.Vector2(4.2, -7.6),
    new THREE.Vector2(5.4, -8.6),
    new THREE.Vector2(6.2, -9.6),
    new THREE.Vector2(6.5, -9.8),
    new THREE.Vector2(6.5, -10.2),
    new THREE.Vector2(5.9, -10.2),
    new THREE.Vector2(4.8, -8.8),
    new THREE.Vector2(2.5, -7.3),
    new THREE.Vector2(0.2, -7.2),
  ];
  const rawEngineGeom = new THREE.LatheGeometry(enginePts, 36);
  rawEngineGeom.computeVertexNormals();

  const engineBellGeom = bakeVertexColors(rawEngineGeom, (pos) => {
    if (pos.y > -7.8) return new THREE.Color(0.96, 0.99, 1.0); // Hot core
    const t = (-pos.y - 7.8) / 2.4;
    const c = new THREE.Color(0.24, 0.23, 0.22);
    c.lerp(new THREE.Color(0.75, 0.42, 0.14), (1.0 - t) * 0.55);
    return c;
  });

  // ── 5. 4 RIM THRUSTER PODS WITH DUAL NOZZLES ───────────────────────────────
  const thrusterParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const bodyGeom = new THREE.BoxGeometry(3.6, 1.6, 2.6);
    bodyGeom.translate(24.5, -4.6, 0);
    bodyGeom.rotateY(-ang);
    thrusterParts.push(bodyGeom);

    for (const offsetZ of [-0.75, 0.75]) {
      const nozzle = new THREE.CylinderGeometry(0.45, 0.75, 1.2, 14);
      nozzle.rotateZ(Math.PI / 2 + 0.2);
      nozzle.translate(26.2, -4.8, offsetZ);
      nozzle.rotateY(-ang);
      thrusterParts.push(nozzle);
    }
  }
  const rawThrusterPodsGeom = BufferGeometryUtils.mergeGeometries(thrusterParts, false)!;
  rawThrusterPodsGeom.computeVertexNormals();
  const thrusterPodsGeom = bakeVertexColors(rawThrusterPodsGeom, () => new THREE.Color(0.38, 0.36, 0.34));

  // ── 6. UNDERSIDE SEARCHLIGHT HOUSING POD WITH LENS ─────────────────────────
  const slParts: THREE.BufferGeometry[] = [];
  const slHousing = new THREE.CylinderGeometry(1.5, 1.8, 1.8, 20);
  slHousing.rotateX(Math.PI / 2);
  slParts.push(slHousing);

  const slLensRing = new THREE.TorusGeometry(1.4, 0.15, 12, 24);
  slLensRing.translate(0, 0, 0.92);
  slParts.push(slLensRing);

  const slLens = new THREE.CircleGeometry(1.35, 20);
  slLens.translate(0, 0, 0.95);
  slParts.push(slLens);

  const rawSearchlightHousingGeom = BufferGeometryUtils.mergeGeometries(slParts, false)!;
  rawSearchlightHousingGeom.computeVertexNormals();
  const searchlightHousingGeom = bakeVertexColors(rawSearchlightHousingGeom, (pos) => {
    if (pos.z > 0.90) return new THREE.Color(1.0, 0.96, 0.88); // Lens face
    return new THREE.Color(0.42, 0.40, 0.38);
  });

  // Helper: create an oriented cylindrical/hexagonal strut between two points with exact overlap
  function createOrientedStrut(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    radius: number,
    segments: number = 6,
    overlap: number = 0.25
  ): THREE.BufferGeometry {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const dirNorm = dir.clone().normalize();
    const geom = new THREE.CylinderGeometry(radius, radius, len + overlap * 2, segments);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
    geom.applyQuaternion(quat);
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    geom.translate(mid.x, mid.y, mid.z);
    return geom;
  }

  // ── 7 & 8. REBUILT LANDING GEAR (3 Legs at 120°): Pods, Struts, Footpads ───
  // Rebuilt as full gap-free physical assemblies:
  // - Recessed pod housing inside hull cavity
  // - Pod door panel
  // - Hip pivot knuckle H (r = 19.5, y = -4.4)
  // - Upper strut: 1.2m hexagonal section connecting H -> K
  // - Knee joint knuckle K (r = 25.2, y = -8.8) along tangential hinge axis
  // - Lower strut: 1.0m hexagonal section connecting K -> A
  // - Ankle knuckle A (r = 24.5, y = -13.7)
  // - Flat foot pad disc (radius 2.0m = 4m wide, height 0.3m, bottom at y = -14.000m)
  // - Hydraulic piston: barrel on pod, chrome rod on lower strut, overlapping coaxially
  const podUpperParts: THREE.BufferGeometry[] = [];
  const lowerFootParts: THREE.BufferGeometry[] = [];

  for (let i = 0; i < 3; i++) {
    const ang = LEG_ANGLES[i];

    // 1. Recessed Pod Housing inside hull cavity (r = 20.0m, y = -4.3m)
    const podHousing = new THREE.BoxGeometry(3.8, 1.4, 5.2);
    podHousing.translate(20.0, -4.3, 0);
    podHousing.rotateY(-ang);
    podUpperParts.push(podHousing);

    // 2. Pod Door Panel (flush with hull skin when closed)
    const podDoor = new THREE.BoxGeometry(3.5, 0.25, 4.8);
    podDoor.translate(20.0, -4.95, 0);
    podDoor.rotateY(-ang);
    podUpperParts.push(podDoor);

    // 3. Hip Pivot Knuckle at H (r = 19.5, y = -4.4) - cylinder along tangential axis
    const hipKnuckle = new THREE.CylinderGeometry(0.85, 0.85, 1.6, 16);
    hipKnuckle.rotateX(Math.PI / 2);
    hipKnuckle.translate(19.5, -4.4, 0);
    hipKnuckle.rotateY(-ang);
    podUpperParts.push(hipKnuckle);

    // 4. Upper Strut: Hexagonal Section (1.2m diameter = 0.6m radius)
    // Connects H (19.5, -4.4, 0) -> K (25.2, -8.8, 0) with 0.25m overlap at both ends
    const H = new THREE.Vector3(19.5, -4.4, 0);
    const K = new THREE.Vector3(25.2, -8.8, 0);
    const upperStrut = createOrientedStrut(H, K, 0.60, 6, 0.25);
    upperStrut.rotateY(-ang);
    podUpperParts.push(upperStrut);

    // 5. Knee Knuckle at K (r = 25.2, y = -8.8) - cylinder along tangential hinge axis
    const kneeHinge = new THREE.CylinderGeometry(0.85, 0.85, 1.6, 18);
    kneeHinge.rotateX(Math.PI / 2);
    kneeHinge.translate(25.2, -8.8, 0);
    kneeHinge.rotateY(-ang);
    podUpperParts.push(kneeHinge);

    // 6. Hydraulic Piston Clevis Mount on Pod (r = 18.6, y = -4.55)
    const upperClevis = new THREE.CylinderGeometry(0.42, 0.42, 0.9, 12);
    upperClevis.rotateX(Math.PI / 2);
    upperClevis.translate(18.6, -4.55, 0);
    upperClevis.rotateY(-ang);
    podUpperParts.push(upperClevis);

    // 7. Hydraulic Piston Upper Barrel (Cylinder)
    // Coaxial with lower rod; spans from upper clevis down towards lower strut
    const P_pod = new THREE.Vector3(18.6, -4.55, 0);
    const P_strut = new THREE.Vector3(24.95, -10.5, 0);
    const pDir = new THREE.Vector3().subVectors(P_strut, P_pod).normalize();
    const P_barrel_end = P_pod.clone().addScaledVector(pDir, 5.3);
    const pistonBarrel = createOrientedStrut(P_pod, P_barrel_end, 0.35, 12, 0.10);
    pistonBarrel.rotateY(-ang);
    podUpperParts.push(pistonBarrel);

    // 8. Lower Strut: Hexagonal Section (1.0m diameter = 0.5m radius)
    // Connects K (25.2, -8.8, 0) -> A (24.5, -13.7, 0) with 0.25m overlap at both ends
    const A = new THREE.Vector3(24.5, -13.7, 0);
    const lowerStrut = createOrientedStrut(K, A, 0.50, 6, 0.25);
    lowerStrut.rotateY(-ang);
    lowerFootParts.push(lowerStrut);

    // 9. Hydraulic Piston Clevis Mount on Lower Strut (r = 24.95, y = -10.5)
    const lowerClevis = new THREE.CylinderGeometry(0.38, 0.38, 0.8, 12);
    lowerClevis.rotateX(Math.PI / 2);
    lowerClevis.translate(24.95, -10.5, 0);
    lowerClevis.rotateY(-ang);
    lowerFootParts.push(lowerClevis);

    // 10. Hydraulic Piston Lower Chrome Rod
    // Slides coaxially inside upper barrel with 1.7m overlap
    const P_rod_end = P_strut.clone().addScaledVector(pDir, -5.1);
    const pistonRod = createOrientedStrut(P_rod_end, P_strut, 0.22, 12, 0.10);
    pistonRod.rotateY(-ang);
    lowerFootParts.push(pistonRod);

    // 11. Ankle Knuckle at A (r = 24.5, y = -13.7) - cylinder along tangential axis
    const ankleKnuckle = new THREE.CylinderGeometry(0.70, 0.70, 1.4, 16);
    ankleKnuckle.rotateX(Math.PI / 2);
    ankleKnuckle.translate(24.5, -13.7, 0);
    ankleKnuckle.rotateY(-ang);
    lowerFootParts.push(ankleKnuckle);

    // 12. Footpad Ankle Socket Collar (conical reinforced collar)
    const footpadSocket = new THREE.CylinderGeometry(0.80, 1.30, 0.3, 16);
    footpadSocket.translate(24.5, -13.75, 0);
    footpadSocket.rotateY(-ang);
    lowerFootParts.push(footpadSocket);

    // 13. Flat Foot Pad: Disc 4.0m wide (radius 2.0m, height 0.3m), normal UP (flat level)
    // Bottom sits at y = -14.000m exactly!
    const footpadDisc = new THREE.CylinderGeometry(FOOTPAD_RADIUS, FOOTPAD_RADIUS, FOOTPAD_THICKNESS, 24);
    footpadDisc.translate(24.5, -13.85, 0);
    footpadDisc.rotateY(-ang);
    lowerFootParts.push(footpadDisc);
  }

  const rawLegPodUpperGeom = BufferGeometryUtils.mergeGeometries(podUpperParts, false)!;
  rawLegPodUpperGeom.computeVertexNormals();
  const legPodUpperGeom = bakeVertexColors(rawLegPodUpperGeom, (pos) => {
    if (pos.y > -5.0 && Math.abs(pos.y - (-4.3)) < 0.8) return new THREE.Color(0.38, 0.36, 0.34); // Pod housing
    return new THREE.Color(0.72, 0.70, 0.67); // Strut / knuckle alloy
  });

  const rawLegLowerFootGeom = BufferGeometryUtils.mergeGeometries(lowerFootParts, false)!;
  rawLegLowerFootGeom.computeVertexNormals();
  const legLowerFootGeom = bakeVertexColors(rawLegLowerFootGeom, (pos) => {
    if (pos.y < -13.6) return new THREE.Color(0.30, 0.28, 0.26); // Heavy footpad disc
    if (pos.y > -10.0 && pos.y < -5.5 && Math.abs(pos.y - (-7.5)) < 2.0) return new THREE.Color(0.92, 0.92, 0.94); // Polished chrome rod
    return new THREE.Color(0.68, 0.66, 0.64); // Strut alloy
  });

  // ── 9. REBUILT BELLY CARGO RAMP HATCH (Compact Doorway Ramp, 48° Slope, Rails, Stripes)
  // Outer edge hinge at Z = 18.0m, Y = -5.30m. Length = 11.707m (1.64m world dropship scale).
  const rampParts: THREE.BufferGeometry[] = [];

  // Main Ramp Bed (Length = RAMP_LENGTH, Width = RAMP_WIDTH, Thickness = 0.35m)
  const rampBed = new THREE.BoxGeometry(RAMP_WIDTH, 0.35, RAMP_LENGTH);
  rampBed.translate(0, -0.175, RAMP_LENGTH / 2); // Pivot at Z = 0 (hinge)
  rampParts.push(rampBed);

  // Left & Right Safety Rails (0.5m high along ramp sides)
  for (const railX of [-RAMP_WIDTH / 2 + 0.12, RAMP_WIDTH / 2 - 0.12]) {
    const railGeom = new THREE.BoxGeometry(0.18, 0.5, RAMP_LENGTH);
    railGeom.translate(railX, 0.25, RAMP_LENGTH / 2);
    rampParts.push(railGeom);
  }

  const rawCargoRampGeom = BufferGeometryUtils.mergeGeometries(rampParts, false)!;
  rawCargoRampGeom.computeVertexNormals();
  const cargoRampGeom = bakeVertexColors(rawCargoRampGeom, (pos) => {
    // Grip traction stripes along ramp bed
    const tread = Math.sin(pos.z * 4.0) > 0 ? 0.08 : -0.06;
    return new THREE.Color(0.52 + tread, 0.49 + tread, 0.44);
  });

  // ── 10. CARGO BAY INTERIOR LIT OPENING PANEL (Core #FFE2A8) ────────────────
  const interiorBay = new THREE.PlaneGeometry(RAMP_WIDTH - 0.3, 5.0);
  interiorBay.rotateX(Math.PI / 2);
  interiorBay.translate(0, RAMP_HINGE_Y + 0.2, RAMP_HINGE_Z - 2.5);
  interiorBay.computeVertexNormals();
  const cargoInteriorBayGeom = bakeVertexColors(interiorBay, (pos) => {
    const distCenter = Math.abs(pos.x) / (RAMP_WIDTH / 2);
    const col = new THREE.Color(1.0, 0.886, 0.659); // Core #FFE2A8
    col.lerp(new THREE.Color(0.85, 0.50, 0.12), distCenter * 0.7);
    return col;
  });

  // ── 11. SOFT SEARCHLIGHT VOLUMETRIC CONE (Aligned strictly along +Z) ──────
  // Tapered cone extending 14m along +Z from lens (r=1.35m) to ground (r=6.5m)
  const coneLength = 14.0;
  const coneGeom = new THREE.CylinderGeometry(1.35, 6.5, coneLength, 32, 12, true);
  // Shift top to origin z=0, bottom to z=14.0
  coneGeom.translate(0, -coneLength / 2, 0);
  coneGeom.rotateX(-Math.PI / 2); // Aligns cylinder axis from -Y to +Z
  coneGeom.computeVertexNormals();
  const searchlightConeGeom = coneGeom;

  // ── 12. GROUND LIGHT POOLS (Searchlight Pool & Ramp Spill Pool on Ground) ────
  // Positioned at y = -13.98m with polygon offset so grid doesn't cut through
  const poolParts: THREE.BufferGeometry[] = [];

  // Searchlight Pool (16m diameter under searchlight beam, flat on ground)
  const slPool = new THREE.PlaneGeometry(16.0, 16.0);
  slPool.rotateX(-Math.PI / 2);
  slPool.translate(0, -13.98, 28.5);
  poolParts.push(slPool);

  // Ramp Spill Pool (10m diameter at foot of ramp)
  const rampSpill = new THREE.PlaneGeometry(10.0, 10.0);
  rampSpill.rotateX(-Math.PI / 2);
  rampSpill.translate(0, -13.98, RAMP_HINGE_Z + RAMP_LENGTH * Math.cos(RAMP_ANGLE_RAD));
  poolParts.push(rampSpill);

  const rawGroundPoolsGeom = BufferGeometryUtils.mergeGeometries(poolParts, false)!;
  rawGroundPoolsGeom.computeVertexNormals();
  const groundPoolsGeom = rawGroundPoolsGeom;

  // Exact Triangle Count
  const countTriangles = (g: THREE.BufferGeometry) =>
    g.index ? g.index.count / 3 : g.attributes.position.count / 3;

  const totalTriangles = Math.round(
    countTriangles(hullGeom) +
    countTriangles(canopyDomeGeom) +
    countTriangles(canopyFrameGeom) +
    countTriangles(windowsGeom) +
    countTriangles(windowHalosGeom) +
    countTriangles(engineBellGeom) +
    countTriangles(thrusterPodsGeom) +
    countTriangles(searchlightHousingGeom) +
    countTriangles(legPodUpperGeom) +
    countTriangles(legLowerFootGeom) +
    countTriangles(cargoRampGeom) +
    countTriangles(cargoInteriorBayGeom) +
    countTriangles(searchlightConeGeom) +
    countTriangles(groundPoolsGeom)
  );

  return {
    hullGeom,
    canopyDomeGeom,
    canopyFrameGeom,
    windowsGeom,
    windowHalosGeom,
    engineBellGeom,
    thrusterPodsGeom,
    searchlightHousingGeom,
    legPodUpperGeom,
    legLowerFootGeom,
    cargoRampGeom,
    cargoInteriorBayGeom,
    searchlightConeGeom,
    groundPoolsGeom,
    totalTriangles,
  };
}
