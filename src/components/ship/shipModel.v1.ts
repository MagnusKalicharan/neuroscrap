/**
 * shipModel.ts — Procedural crashed-spaceship generator (no GLB needed)
 * =====================================================================
 * Same idea as the parametric Cologne Cathedral viewer: the whole model is
 * generated from code. Every part is merged into a handful of meshes and
 * "baked" lighting is written into vertex colors, so at runtime the ship
 * costs ~5 draw calls and ZERO real-time lights.
 *
 * Coordinates (ship-local, +Y up):
 *   - Ship axis runs along Z.  Nose points to -Z, engines to +Z.
 *   - Floor top is y = 0.02  (put your ground plane at y = 0).
 *   - Hull is a tunnel of radius HULL_RADIUS (6.5), 52 long, + cockpit dome.
 *   - The ROOF IS OPEN between z = -14 and z = +14.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ───────────────────────── Constants you can tweak ─────────────────────────
export const HULL_RADIUS = 6.5;
export const HULL_HALF_LEN = 26;
export const SEG_LEN = 2;
export const SEG_COUNT = (HULL_HALF_LEN * 2) / SEG_LEN; // 26
export const SECTORS = 16; // angular panels over the upper half-tunnel
export const NOSE_LEN = 10; // cockpit dome length
export const STERN_BLOCK_DEPTH = 8; // solid engine block behind the stern wall
export const SHIP_POSITION: [number, number, number] = [0, 0, 0];
export const PLAYER_SPAWN: [number, number, number] = [0, 1.5, 6];
const FLOOR_Y = 0.02;
const SECTOR_ANGLE = Math.PI / SECTORS;

// ───────────────────────────── Small utilities ─────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ───────────────── Damage map: which hull panels still exist ───────────────
// grid[segment along Z][sector around the upper tunnel]
// sector 0 = right-side floor edge ... 7|8 = top centre ... 15 = left floor edge
function makePanelGrid(): boolean[][] {
  const rng = mulberry32(1337);
  const g: boolean[][] = [];
  for (let s = 0; s < SEG_COUNT; s++) {
    g.push([]);
    for (let k = 0; k < SECTORS; k++) {
      let keep = true;
      const inRoof = s >= 6 && s <= 19 && k >= 4 && k <= 11;
      if (inRoof) {
        const edge = k === 4 || k === 11 || s <= 7 || s >= 18;
        keep = edge ? rng() < 0.3 : false; // ragged edge of the open roof
      } else if (rng() < 0.03) keep = false; // random small holes
      g[s].push(keep);
    }
  }
  for (let s = 9; s <= 11; s++) for (let k = 12; k <= 15; k++) g[s][k] = k === 12 && rng() < 0.4; // big left breach
  for (let k = 0; k <= 2; k++) g[3][k] = false; // small right tear
  return g;
}
export const PANEL_GRID = makePanelGrid();
/** True where the wall is open at walking height (used by collision). */
export const RIGHT_OPEN = PANEL_GRID.map((r) => !r[0] && !r[1]);
export const LEFT_OPEN = PANEL_GRID.map((r) => !r[15] && !r[14]);

// ───────────────────────────── Types & helpers ─────────────────────────────
export interface Aabb { minX: number; maxX: number; minZ: number; maxZ: number }
export interface ShipModel {
  interior: THREE.BufferGeometry;
  exterior: THREE.BufferGeometry;
  emissive: THREE.BufferGeometry;
  alarm: THREE.BufferGeometry;
  flicker: THREE.BufferGeometry;
  colliders: Aabb[];
  triangles: number;
}
interface Xf { p?: [number, number, number]; r?: [number, number, number]; s?: [number, number, number] }
interface BakeLight { pos: THREE.Vector3; color: THREE.Color; intensity: number; radius: number; directional?: boolean }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();
function place(g: THREE.BufferGeometry, xf: Xf = {}) {
  const r = xf.r ?? [0, 0, 0], p = xf.p ?? [0, 0, 0], s = xf.s ?? [1, 1, 1];
  _e.set(r[0], r[1], r[2]); _q.setFromEuler(_e);
  _p.set(p[0], p[1], p[2]); _s.set(s[0], s[1], s[2]);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  return g;
}
function nonIndexed(g: THREE.BufferGeometry) {
  if (!g.index) return g;
  const n = g.toNonIndexed(); g.dispose(); return n;
}
/** Remove triangles whose centre satisfies pred (used to cut windows). */
function cullTris(g: THREE.BufferGeometry, pred: (x: number, y: number, z: number) => boolean) {
  const geo = nonIndexed(g);
  const p = geo.attributes.position, n = geo.attributes.normal;
  const kp: number[] = [], kn: number[] = [];
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    if (pred(cx, cy, cz)) continue;
    for (let k = 0; k < 3; k++) {
      kp.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
      kn.push(n.getX(i + k), n.getY(i + k), n.getZ(i + k));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(kp, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(kn, 3));
  geo.dispose();
  return out;
}

class Bucket {
  parts: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry) { this.parts.push(g); }
  merge() {
    const m = mergeGeometries(this.parts, false)!;
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    return m;
  }
}

/** Fake baked lighting + fake ambient occlusion, written into vertex colors. */
function bake(geo: THREE.BufferGeometry, lights: BakeLight[], ambient: THREE.Color, interior: boolean) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, col = geo.attributes.color as THREE.BufferAttribute;
  const p = new THREE.Vector3(), n = new THREE.Vector3(), l = new THREE.Vector3(), lit = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    lit.copy(ambient);
    // Fake AO: dark where walls meet the floor, dark floor edges
    let occ: number;
    if (n.y > 0.7 && p.y < 0.5) occ = interior ? 1 - 0.45 * smooth(HULL_RADIUS - 2.8, HULL_RADIUS, Math.abs(p.x)) : 1;
    else occ = 1 - 0.5 * (1 - smooth(0, 2.4, p.y));
    for (const L of lights) {
      let att = 1;
      if (L.directional) l.copy(L.pos).normalize();
      else {
        l.subVectors(L.pos, p);
        const d = l.length(); l.divideScalar(d || 1);
        const q = d / L.radius;
        att = q >= 1 ? 0 : (1 - q * q) * (1 - q * q);
      }
      if (att <= 0) continue;
      const ndl = 0.35 + 0.65 * Math.abs(n.dot(l)); // two-sided: hull panels are thin sheets
      const k = L.intensity * att * ndl;
      lit.r += L.color.r * k; lit.g += L.color.g * k; lit.b += L.color.b * k;
    }
    col.setXYZ(i,
      Math.min(1, col.getX(i) * lit.r * occ),
      Math.min(1, col.getY(i) * lit.g * occ),
      Math.min(1, col.getZ(i) * lit.b * occ));
  }
  col.needsUpdate = true;
}
/** Soot / scorch marks around damage centres (exterior only). */
function scorch(geo: THREE.BufferGeometry, centres: [number, number, number, number][]) {
  const pos = geo.attributes.position, col = geo.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let dark = 1;
    for (const [cx, cy, cz, sigma] of centres) {
      const d2 = (pos.getX(i) - cx) ** 2 + (pos.getY(i) - cy) ** 2 + (pos.getZ(i) - cz) ** 2;
      dark *= 1 - 0.62 * Math.exp(-d2 / (2 * sigma * sigma));
    }
    col.setXYZ(i, col.getX(i) * dark, col.getY(i) * dark, col.getZ(i) * dark);
  }
}

// ═════════════════════════════ The generator ═══════════════════════════════
export function buildShipModel(): ShipModel {
  const rng = mulberry32(2024);
  const interior = new Bucket(), exterior = new Bucket();
  const emissive = new Bucket(), alarm = new Bucket(), flicker = new Bucket();
  const colliders: Aabb[] = [];

  /** Give a geometry per-triangle albedo (with slight grime jitter). */
  const paint = (g: THREE.BufferGeometry, color: number, jitter = 0.05) => {
    const geo = nonIndexed(g);
    geo.deleteAttribute("uv");
    const c = new THREE.Color(color);
    const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) {
      const j = 1 + (rng() - 0.5) * 2 * jitter;
      for (let k = 0; k < 3; k++) { arr[(i + k) * 3] = c.r * j; arr[(i + k) * 3 + 1] = c.g * j; arr[(i + k) * 3 + 2] = c.b * j; }
    }
    geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const box = (b: Bucket, w: number, h: number, d: number, xf: Xf, color: number, seg: [number, number, number] = [1, 1, 1], jitter = 0.05) =>
    b.add(paint(place(new THREE.BoxGeometry(w, h, d, seg[0], seg[1], seg[2]), xf), color, jitter));
  /** Solid prop: a box that also registers a collider (footprint of its rotation). */
  const solid = (b: Bucket, w: number, h: number, d: number, p: [number, number, number], rotY: number, color: number) => {
    box(b, w, h, d, { p, r: [0, rotY, 0] }, color, [2, 2, 2]);
    const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
    const hx = (c * w + s * d) / 2, hz = (s * w + c * d) / 2;
    colliders.push({ minX: p[0] - hx, maxX: p[0] + hx, minZ: p[2] - hz, maxZ: p[2] + hz });
  };
  const cyl = (b: Bucket, rt: number, rb: number, len: number, radial: number, xf: Xf, color: number, open = false) => {
    const g = new THREE.CylinderGeometry(rt, rb, len, radial, 1, open);
    g.rotateX(Math.PI / 2); // axis along Z
    b.add(paint(place(g, xf), color));
  };

  // ── 1. HULL PANELS (inner skin + outer skin) ──────────────────────────────
  const hullPlate = (seg: number, sec: number, radius: number, taper: [number, number]) => {
    const z = -HULL_HALF_LEN + SEG_LEN * (seg + 0.5);
    const g = new THREE.CylinderGeometry(radius - taper[0], radius - taper[1], SEG_LEN - 0.04, 3, 3, true, Math.PI / 2 + sec * SECTOR_ANGLE, SECTOR_ANGLE);
    g.rotateX(Math.PI / 2); g.translate(0, 0, z);
    return g;
  };
  const missing = (s: number, k: number) => k < 0 || k >= SECTORS || s < 0 || s >= SEG_COUNT ? false : !PANEL_GRID[s][k];
  for (let s = 0; s < SEG_COUNT; s++) {
    for (let k = 0; k < SECTORS; k++) {
      if (!PANEL_GRID[s][k]) continue;
      // Panels next to a hole curl inward, like torn metal
      const edge = missing(s - 1, k) || missing(s + 1, k) || missing(s, k - 1) || missing(s, k + 1);
      const taper: [number, number] = edge ? [rng() < 0.5 ? rng() * 1.0 : 0, rng() * 1.0] : [0, 0];
      const shade = (s + k) % 2 ? 0x3a4553 : 0x353f4c;
      interior.add(paint(hullPlate(s, k, HULL_RADIUS, taper), shade, 0.07));
      exterior.add(paint(hullPlate(s, k, HULL_RADIUS + 0.28, taper), (s + k) % 3 ? 0x98a0ab : 0x8a929e, 0.08));
    }
  }

  // ── 2. COCKPIT DOME (inner + outer, with a smashed windscreen) ────────────
  const dome = (grow: number) => {
    const g = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    g.rotateX(-Math.PI / 2); // hemisphere now points to -Z
    g.scale(HULL_RADIUS + grow, HULL_RADIUS + grow, NOSE_LEN + grow);
    g.translate(0, 0, -HULL_HALF_LEN);
    return cullTris(g, (x, y, z) => z < -29.5 && Math.abs(x) < 4.2 && y > 1.7 && y < 5.0);
  };
  interior.add(paint(dome(0), 0x364150, 0.06));
  exterior.add(paint(dome(0.28), 0x9aa2ad, 0.07));

  // ── 3. FLOOR (deck plating + seams) ───────────────────────────────────────
  interior.add(paint(place(new THREE.BoxGeometry(HULL_RADIUS * 2, 0.3, HULL_HALF_LEN * 2, 13, 1, 26), { p: [0, FLOOR_Y - 0.15, 0] }), 0x2b323b, 0.08));
  {
    const g = new THREE.CircleGeometry(1, 32); g.rotateX(-Math.PI / 2); g.scale(HULL_RADIUS, 1, NOSE_LEN); g.translate(0, FLOOR_Y, -HULL_HALF_LEN);
    interior.add(paint(g, 0x2b323b, 0.08));
  }
  for (let z = -24; z <= 24; z += 4) box(interior, HULL_RADIUS * 2, 0.02, 0.07, { p: [0, FLOOR_Y + 0.011, z] }, 0x161a20, [1, 1, 1], 0);
  for (const x of [-2.4, 2.4]) box(interior, 0.07, 0.02, HULL_HALF_LEN * 2, { p: [x, FLOOR_Y + 0.011, 0] }, 0x161a20, [1, 1, 1], 0);
  // Central catwalk grating (broken into sections)
  for (let z = -22; z < 22; z += 2) if (rng() > 0.2) box(interior, 2.2, 0.06, 1.9, { p: [0, FLOOR_Y + 0.03, z + 1] }, 0x4a5563, [1, 1, 1]);

  // ── 4. STERN BULKHEAD (with door frame) + engine block ────────────────────
  {
    const wall = (grow: number) => { const g = new THREE.CircleGeometry(HULL_RADIUS + grow, 28, 0, Math.PI); g.translate(0, 0, HULL_HALF_LEN + grow); return g; };
    interior.add(paint(wall(0), 0x333d4a, 0.06));
    exterior.add(paint(wall(0.28), 0x8f97a2, 0.07));
    box(interior, 2.2, 3, 0.12, { p: [0, 1.5, HULL_HALF_LEN - 0.08] }, 0x1b2027, [1, 1, 1], 0.03);
    const zf = HULL_HALF_LEN - 0.14;
    box(emissive, 0.12, 3.3, 0.06, { p: [-1.25, 1.65, zf] }, 0xffb23a, [1, 1, 1], 0);
    box(emissive, 0.12, 3.3, 0.06, { p: [1.25, 1.65, zf] }, 0xffb23a, [1, 1, 1], 0);
    box(emissive, 2.62, 0.12, 0.06, { p: [0, 3.3, zf] }, 0xffb23a, [1, 1, 1], 0);
    colliders.push({ minX: -HULL_RADIUS - 0.3, maxX: HULL_RADIUS + 0.3, minZ: HULL_HALF_LEN - 0.15, maxZ: HULL_HALF_LEN + STERN_BLOCK_DEPTH });
  }
  // Engines (outside)
  [-3.6, 0, 3.6].forEach((x, i) => {
    const broken = i === 1;
    cyl(exterior, 1.9, 1.9, 5.6, 16, { p: [x, 2.5, 29], r: broken ? [0.06, 0, 0.05] : [0, 0, 0] }, 0x6b727c);
    cyl(exterior, 2.4, 1.7, 2.6, 16, { p: [x, 2.5, 33.3], r: broken ? [0.06, 0, 0.05] : [0, 0, 0] }, 0x4c525b, true);
    const ember = new THREE.CircleGeometry(1.5, 16); place(ember, { p: [x, 2.5, 32.2] });
    flicker.add(paint(ember, broken ? 0x331408 : 0xff5a1a, 0));
  });
  // Tail fin (bent) + sensor mast
  box(exterior, 0.35, 5, 7, { p: [0.2, 8.6, 22], r: [0, 0, 0.14] }, 0x8a929e, [1, 2, 4]);
  cyl(exterior, 0.07, 0.07, 5, 5, { p: [4.4, 8.2, 18], r: [0.3, 0, -0.35] }, 0x30353c);

  // ── 5. RIBS (broken in the open-roof section) ─────────────────────────────
  for (let z = -24; z <= 24; z += 4) {
    const open = Math.abs(z) < 14;
    const arcs: number[] = open ? [0.25 + rng() * 0.45, 0.2 + rng() * 0.4] : [1];
    arcs.forEach((frac, idx) => {
      const g = new THREE.TorusGeometry(HULL_RADIUS - 0.12, 0.17, 5, 28, Math.PI * frac);
      if (open && idx === 1) g.rotateZ(Math.PI - Math.PI * frac); // second stub hangs off the LEFT side
      g.translate(0, 0, z);
      interior.add(paint(g, 0x586474, 0.06));
    });
  }

  // ── 6. PIPES along the walls (only where a panel exists) ──────────────────
  for (let s = 0; s < SEG_COUNT; s++) {
    for (const deg of [35, 58]) {
      for (const side of [1, -1]) {
        const a = (deg * Math.PI) / 180, sector = Math.floor(a / SECTOR_ANGLE);
        const k = side === 1 ? sector : SECTORS - 1 - sector;
        if (!PANEL_GRID[s][k] || rng() < 0.2) continue;
        const r = HULL_RADIUS - 0.36, z = -HULL_HALF_LEN + SEG_LEN * (s + 0.5);
        cyl(interior, 0.13, 0.13, SEG_LEN - 0.1, 6, { p: [side * r * Math.cos(a), r * Math.sin(a), z] }, deg === 35 ? 0x7a5a3c : 0x4d6a70);
      }
    }
  }

  // ── 7. LIGHT FIXTURES (also used as baking lights) ────────────────────────
  const lights: BakeLight[] = [];
  const C = (r: number, g: number, b: number) => new THREE.Color(r, g, b);
  const fixtureZ = [-24, -20, -16, 16, 20, 24];
  let fi = 0;
  for (const z of fixtureZ) for (const x of [-3.2, 3.2]) {
    const flick = fi++ % 5 === 0;
    box(flick ? flicker : emissive, 0.22, 0.08, 1.6, { p: [x, 5.42, z] }, 0xfff1d6, [1, 1, 1], 0);
    lights.push({ pos: new THREE.Vector3(x, 5.1, z), color: C(1, 0.88, 0.7), intensity: flick ? 0.55 : 0.95, radius: 9 });
  }
  // Red alarm lamps near the cockpit
  for (const x of [-5, 5]) {
    box(alarm, 0.28, 0.28, 0.28, { p: [x * 0.97, 3.3, -21] }, 0xff3b2f, [1, 1, 1], 0);
    lights.push({ pos: new THREE.Vector3(x * 0.85, 3.2, -21), color: C(1, 0.15, 0.1), intensity: 0.8, radius: 7 });
  }
  // Moonlight / starlight falling through the open roof
  for (const z of [-9, -3, 3, 9]) lights.push({ pos: new THREE.Vector3(0, 9, z), color: C(0.35, 0.5, 0.9), intensity: 0.6, radius: 14 });
  lights.push({ pos: new THREE.Vector3(3.5, 14, 2), color: C(0.6, 0.7, 1.0), intensity: 0.45, radius: 24 });
  // Cockpit glow from the screens + windscreen starlight
  lights.push({ pos: new THREE.Vector3(0, 1.6, -29), color: C(0.3, 0.9, 1), intensity: 0.8, radius: 7.5 });
  lights.push({ pos: new THREE.Vector3(0, 3, -34), color: C(0.4, 0.55, 1), intensity: 0.4, radius: 12 });
  // Sparks from the breach
  lights.push({ pos: new THREE.Vector3(-5.6, 1.6, -5), color: C(1, 0.55, 0.15), intensity: 0.6, radius: 6 });

  // ── 8. COCKPIT: consoles, seats ───────────────────────────────────────────
  [-3.4, 0, 3.4].forEach((x, i) => {
    const ry = -Math.sign(x || 1) * 0.35 * (i === 1 ? 0 : 1);
    solid(interior, 2.8, 0.95, 1.1, [x, 0.5, -31], ry, 0x2d3540);
    const on = i !== 1 || rng() > 0.5;
    const screen = new THREE.BoxGeometry(2.4, 0.04, 0.8); place(screen, { p: [0, 0, 0], r: [-0.85, 0, 0] });
    place(screen, { p: [x, 1.12, -31.1], r: [0, ry, 0] });
    (i === 2 ? flicker : emissive).add(paint(screen, on ? 0x44e6ff : 0x12303a, 0));
  });
  for (const x of [-1.8, 1.8]) {
    const fallen = x < 0;
    box(interior, 1, 0.45, 1, { p: [x, fallen ? 0.25 : 0.4, -26.5], r: fallen ? [0, 0.5, 0.35] : [0, 0, 0] }, 0x4a3f3a, [2, 1, 2]);
    box(interior, 1, 1.3, 0.2, { p: [x + (fallen ? 0.3 : 0), fallen ? 0.45 : 1.15, fallen ? -25.9 : -26.1], r: fallen ? [0, 0.5, 1.2] : [-0.15, 0, 0] }, 0x4a3f3a, [2, 2, 1]);
    if (!fallen) colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: -27.1, maxZ: -25.9 });
  }

  // ── 9. CARGO, LOCKERS, FALLEN DEBRIS ──────────────────────────────────────
  solid(interior, 2.6, 2.2, 4.5, [-4.0, 1.1, 18], 0.04, 0x8a4b2a);
  box(interior, 2.2, 0.06, 4.1, { p: [-4.0, 2.23, 18], r: [0, 0.04, 0] }, 0xc9a227, [1, 1, 3]); // hazard top
  box(interior, 2.6, 2.2, 4.5, { p: [-4.4, 3.35, 18.4], r: [0.05, 0.2, 0.18] }, 0x2f6a6a, [2, 2, 2]); // stacked, leaning
  solid(interior, 2.6, 2.2, 4.5, [4.1, 1.1, 15.5], -0.06, 0x3c5a7a);
  solid(interior, 2.4, 1.8, 3.6, [3.6, 0.9, 22], 0.45, 0x6a6f78);
  for (let i = 0; i < 4; i++) solid(interior, 0.9, 2.1, 0.8, [-5.35, 1.05, -14 + i * 0.95], 0, i % 2 ? 0x56606c : 0x4b5560);
  solid(interior, 1.2, 1.2, 1.2, [5.0, 0.6, -10], 0.3, 0x7a5a3c);
  box(interior, 0.4, 0.4, 7.5, { p: [-1.6, 1.6, -3.5], r: [0.1, 0.5, 0.15] }, 0x6c7684, [1, 1, 6]);   // fallen beam
  box(interior, 0.3, 0.3, 5.5, { p: [2.2, 0.45, 5], r: [0, -0.7, 0.1] }, 0x6c7684, [1, 1, 5]);
  for (let i = 0; i < 9; i++) { // hanging torn roof plates around the opening
    const side = i % 2 ? 1 : -1, x = side * (2.9 + rng() * 1.7), z = -13 + rng() * 26;
    box(interior, 1.6 + rng(), 0.08, 1.6 + rng() * 1.2, { p: [x, 4 + rng() * 1.3, z], r: [rng() * 0.6, rng() * 3, side * (0.4 + rng() * 0.7)] }, 0x3c4655, [2, 1, 2]);
  }
  for (let i = 0; i < 14; i++) box(interior, 0.3 + rng() * 0.5, 0.15 + rng() * 0.3, 0.3 + rng() * 0.6, { p: [(rng() - 0.5) * 9, 0.15, -20 + rng() * 40], r: [0, rng() * 3, 0] }, 0x4a5058, [1, 1, 1], 0.1);
  // Hanging cables with live sparking tips
  for (let i = 0; i < 9; i++) {
    const side = rng() < 0.5 ? -1 : 1, x0 = side * (2.8 + rng() * 1.8), z0 = -12 + rng() * 24, y0 = 5.0;
    const end = new THREE.Vector3(x0 - side * rng() * 0.8, 1.2 + rng() * 1.4, z0 + rng() - 0.5);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x0 + side * 0.25, y0 - 1.3, z0 + rng() - 0.5), end]);
    interior.add(paint(new THREE.TubeGeometry(curve, 10, 0.045, 5, false), 0x14181d, 0.2));
    if (rng() < 0.4) box(flicker, 0.12, 0.12, 0.12, { p: [end.x, end.y, end.z] }, 0xffb23a, [1, 1, 1], 0);
  }
  // Floor guide strips (dashed)
  for (const x of [-1.5, 1.5]) for (let z = -22; z < 22; z += 2) if (rng() > 0.3) box(emissive, 0.08, 0.02, 1.0, { p: [x, FLOOR_Y + 0.03, z] }, 0x44e6ff, [1, 1, 1], 0);

  // ── 10. EXTERIOR: wings, berms, scorched trail, debris ────────────────────
  const wing = (pts: [number, number][], y: number, droop: number, pivotX: number) => {
    const shape = new THREE.Shape(); shape.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([x, z]) => shape.lineTo(x, z));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false });
    g.rotateX(Math.PI / 2); g.translate(0, 0.4 + y, 0);
    g.translate(-pivotX, -y, 0); g.rotateZ(droop); g.translate(pivotX, y, 0);
    exterior.add(paint(g, 0x858d98, 0.08));
  };
  wing([[-6.2, -5], [-21, 5], [-23, 10], [-6.2, 13]], 1.8, 0.2, -6.2);   // left wing, drooping into the ground
  wing([[6.2, -5], [9.8, -2], [8.6, 3], [10.4, 7], [6.2, 13]], 1.8, -0.05, 6.2); // right wing snapped to a stub
  for (let i = 0; i < 22; i++) { // dirt berms pushed up by the crash
    const side = i % 2 ? 1 : -1, m = new THREE.SphereGeometry(1, 8, 6);
    place(m, { p: [side * (HULL_RADIUS + 1.5 + rng() * 3.5), 0, -28 + rng() * 52], s: [1.6 + rng() * 2.4, 0.5 + rng() * 1.1, 1.8 + rng() * 2.8] });
    exterior.add(paint(m, 0x5d5648, 0.12));
  }
  for (let i = 0; i < 6; i++) { // dirt pile in front of the nose
    const m = new THREE.SphereGeometry(1, 8, 6);
    place(m, { p: [(rng() - 0.5) * 9, 0, -37 - rng() * 3], s: [2 + rng() * 2, 0.7 + rng() * 0.9, 2 + rng() * 2] });
    exterior.add(paint(m, 0x5d5648, 0.12));
  }
  for (let i = 0; i < 16; i++) { // scorched skid trail behind the engines
    const d = new THREE.CircleGeometry(1.5 + rng() * 3.2, 14); d.rotateX(-Math.PI / 2);
    place(d, { p: [(rng() - 0.5) * 7, 0.03 + i * 0.001, 34 + i * 4 + rng() * 3] });
    exterior.add(paint(d, 0x1f1b17, 0.15));
  }
  for (let i = 0; i < 40; i++) { // scattered hull debris
    const side = rng() < 0.5 ? -1 : 1, big = rng() < 0.25;
    const w = (big ? 1.4 : 0.4) + rng() * 1.1, d = (big ? 1.4 : 0.4) + rng() * 1.1;
    box(exterior, w, 0.1 + rng() * 0.15, d, {
      p: [side * (HULL_RADIUS + 2 + rng() * 14), 0.1 + rng() * 0.2, -30 + rng() * 80],
      r: [(rng() - 0.5) * 0.7, rng() * 6, (rng() - 0.5) * 0.7],
    }, rng() < 0.3 ? 0x6a5a48 : 0x8a929e, [1, 1, 1], 0.1);
  }

  // ═════════════ Merge + bake ═════════════
  const iGeo = interior.merge(), eGeo = exterior.merge();
  bake(iGeo, lights, new THREE.Color(0.16, 0.19, 0.26), true);
  bake(eGeo, [{ pos: new THREE.Vector3(0.4, 0.8, -0.3), color: new THREE.Color(0.75, 0.85, 1), intensity: 0.85, radius: 1, directional: true }], new THREE.Color(0.24, 0.28, 0.36), false);
  scorch(eGeo, [[-6.8, 1.5, -5, 3], [6.8, 1, -19, 2], [0, 6.8, 0, 7], [0, 0.8, -36, 4], [0, 2.5, 31, 5]]);

  const out: ShipModel = {
    interior: iGeo, exterior: eGeo,
    emissive: emissive.merge(), alarm: alarm.merge(), flicker: flicker.merge(),
    colliders, triangles: 0,
  };
  for (const g of [out.interior, out.exterior, out.emissive, out.alarm, out.flicker]) {
    g.computeBoundingSphere();
    out.triangles += g.attributes.position.count / 3;
  }
  return out;
}

// ═══════════════════════════ Collision (no physics) ═══════════════════════════
const segOf = (z: number) => Math.min(SEG_COUNT - 1, Math.max(0, Math.floor((z + HULL_HALF_LEN) / SEG_LEN)));
const WALL_IN = 5.75;   // furthest the player may go toward a closed wall (from inside)
const WALL_OUT = 6.95;  // closest the player may get to a closed wall (from outside)

/**
 * Call AFTER your movement code each frame:  resolveShipCollisions(camera.position, 0.4, colliders)
 * - Closed hull walls block you, but BREACHES in the wall let you walk through.
 * - Cockpit dome and stern/engine block are solid.
 * - Props (containers, lockers, consoles) are slid around.
 */
export function resolveShipCollisions(pos: THREE.Vector3, colliders: Aabb[], radius = 0.4) {
  const ox = SHIP_POSITION[0], oz = SHIP_POSITION[2];
  let x = pos.x - ox, z = pos.z - oz;

  // Main hull side walls
  if (z > -HULL_HALF_LEN && z < HULL_HALF_LEN) {
    const seg = segOf(z), s = x < 0 ? -1 : 1, ax = Math.abs(x);
    const open = s > 0 ? RIGHT_OPEN[seg] : LEFT_OPEN[seg];
    if (!open) x = s * (ax < HULL_RADIUS ? Math.min(ax, WALL_IN) : Math.max(ax, WALL_OUT));
  }
  // Cockpit dome (ellipse in XZ): stay inside it, or stay outside it
  if (z <= -HULL_HALF_LEN) {
    const t = (-HULL_HALF_LEN - z) / NOSE_LEN, u = x / HULL_RADIUS;
    const e = Math.sqrt(u * u + t * t) || 1e-6;
    const target = e < 1 ? Math.min(e, 0.88) : Math.max(e, 1.12);
    if (target !== e) { const k = target / e; x = u * k * HULL_RADIUS; z = -HULL_HALF_LEN - t * k * NOSE_LEN; }
  }
  // Props, stern wall, engine block
  for (const b of colliders) {
    const minX = b.minX - radius, maxX = b.maxX + radius, minZ = b.minZ - radius, maxZ = b.maxZ + radius;
    if (x > minX && x < maxX && z > minZ && z < maxZ) {
      const dl = x - minX, dr = maxX - x, df = z - minZ, db = maxZ - z, m = Math.min(dl, dr, df, db);
      if (m === dl) x = minX; else if (m === dr) x = maxX; else if (m === df) z = minZ; else z = maxZ;
    }
  }
  pos.x = x + ox; pos.z = z + oz;
}
