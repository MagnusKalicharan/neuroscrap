/**
 * shipModel.ts — High-Fidelity Procedural Crashed Spaceship Generator
 * ===================================================================
 * Generates an expansive, visually harmonious sci-fi starship wreck entirely
 * from code.
 *
 * Architectural Features:
 *   - Scale: Hull radius 11m (floor to ceiling 9m), total length ~104m
 *   - Continuous Arched I-Beam Ribs with jagged torn stubs in the breach zone
 *   - Multi-tiered Wall Conduits & Coolant Pipes running along the hull
 *   - Hanging Torn Ceiling Plates suspended dynamically from the roof breach
 *   - Sleek Integrated Mezzanine Walkway with steel support trusses & railings
 *   - Recessed Wall Lockers & Curved Bridge Avionics Consoles
 *   - Vibrant Sci-Fi Palette: Industrial slate-blue, titanium, amber hazard, cyan neon
 *   - Baked Vertex Colors with wrap-lighting and contact AO (zero real-time light cost)
 *
 * Performance:
 *   - 100% MeshBasicMaterial with vertexColors: true
 *   - Zero per-frame allocations, ~7 merged draw calls, 60+ FPS
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  HULL_RADIUS,
  HULL_HALF_LEN,
  NOSE_LEN,
  FLOOR_Y,
  CEILING_H,
  SEG_LEN,
  SEG_COUNT,
  SECTORS,
  SECTOR_ANGLE,
  HULL_THICKNESS,
  PLAYER_SPAWN,
  SHIP_POSITION,
  MEZZANINE,
  DOORS,
} from "./layout";
import { Aabb, resolveShipCollisions } from "./collision";

export { PLAYER_SPAWN, SHIP_POSITION, resolveShipCollisions };
export type { Aabb };

export interface ShipModel {
  interior: THREE.BufferGeometry;
  exterior: THREE.BufferGeometry;
  floor: THREE.BufferGeometry;
  structural: THREE.BufferGeometry;
  emissive: THREE.BufferGeometry;
  alarm: THREE.BufferGeometry;
  flicker: THREE.BufferGeometry;
  colliders: Aabb[];
  triangles: number;
}

// ───────────────────────────── UTILITIES ─────────────────────────────

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

interface Xf {
  p?: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number];
}

interface BakeLight {
  pos: THREE.Vector3;
  color: THREE.Color;
  intensity: number;
  radius: number;
  directional?: boolean;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function place(g: THREE.BufferGeometry, xf: Xf = {}) {
  const r = xf.r ?? [0, 0, 0],
    p = xf.p ?? [0, 0, 0],
    s = xf.s ?? [1, 1, 1];
  _e.set(r[0], r[1], r[2]);
  _q.setFromEuler(_e);
  _p.set(p[0], p[1], p[2]);
  _s.set(s[0], s[1], s[2]);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  return g;
}

function nonIndexed(g: THREE.BufferGeometry) {
  if (!g.index) return g;
  const n = g.toNonIndexed();
  g.dispose();
  return n;
}

function cullTris(
  g: THREE.BufferGeometry,
  pred: (x: number, y: number, z: number) => boolean
) {
  const geo = nonIndexed(g);
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const u = geo.attributes.uv;
  const kp: number[] = [],
    kn: number[] = [],
    ku: number[] = [];
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    if (pred(cx, cy, cz)) continue;
    for (let k = 0; k < 3; k++) {
      kp.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
      kn.push(n.getX(i + k), n.getY(i + k), n.getZ(i + k));
      if (u) {
        ku.push(u.getX(i + k), u.getY(i + k));
      }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(kp, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(kn, 3));
  if (u && ku.length > 0) {
    out.setAttribute("uv", new THREE.Float32BufferAttribute(ku, 2));
  } else {
    out.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(new Float32Array((kp.length / 3) * 2), 2)
    );
  }
  geo.dispose();
  return out;
}

class Bucket {
  parts: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry) {
    this.parts.push(g);
  }
  merge(): THREE.BufferGeometry {
    if (this.parts.length === 0) return new THREE.BufferGeometry();

    // Standardize every geometry in this bucket to ensure mergeGeometries succeeds.
    for (let i = 0; i < this.parts.length; i++) {
      let geo = this.parts[i];
      if (geo.index) {
        geo = geo.toNonIndexed();
        this.parts[i] = geo;
      }
      const count = geo.attributes.position ? geo.attributes.position.count : 0;
      if (count === 0) continue;

      if (!geo.attributes.normal) {
        geo.computeVertexNormals();
      }

      if (!geo.attributes.color) {
        const arr = new Float32Array(count * 3);
        arr.fill(1.0);
        geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
      }

      if (!geo.attributes.uv) {
        const arr = new Float32Array(count * 2);
        geo.setAttribute("uv", new THREE.BufferAttribute(arr, 2));
      }

      const keys = Object.keys(geo.attributes);
      for (const k of keys) {
        if (k !== "position" && k !== "normal" && k !== "color" && k !== "uv") {
          geo.deleteAttribute(k);
        }
      }
    }

    try {
      const m = mergeGeometries(this.parts, false);
      this.parts.forEach((p) => p.dispose());
      this.parts = [];
      return m || new THREE.BufferGeometry();
    } catch (err) {
      console.warn("Bucket.merge fallback:", err);
      const fallback = this.parts[0] || new THREE.BufferGeometry();
      this.parts = [];
      return fallback;
    }
  }
}

// ─────────────────────── DAMAGE & BREACH GRID ───────────────────────

function makeDamageGrid(): boolean[][] {
  const rng = mulberry32(4092);
  const grid: boolean[][] = [];

  for (let s = 0; s < SEG_COUNT; s++) {
    grid.push([]);
    const z = -HULL_HALF_LEN + SEG_LEN * (s + 0.5);

    for (let k = 0; k < SECTORS; k++) {
      let keep = true;

      // 1. Catastrophic roof breach over Cargo Bay (z between -10 and 18, upper half sectors)
      const inRoofBreach = z >= -10 && z <= 18 && k >= 4 && k <= 15;
      if (inRoofBreach) {
        const isBorder = k === 4 || k === 15 || z <= -8 || z >= 16;
        keep = isBorder ? rng() < 0.28 : false;
      } else if (rng() < 0.02) {
        keep = false;
      }

      // 2. Starboard Main Surface Egress Breach (walkable ramp onto alien regolith: z ∈ [2, 14], sectors 0..3)
      if (z >= 2.0 && z <= 14.0 && k <= 3) {
        keep = false;
      }

      // 3. Port Secondary Hull Breach (z ∈ [-14, -4], sectors 17..19)
      if (z >= -14.0 && z <= -4.0 && k >= 17) {
        keep = false;
      }

      // 4. Starboard micro-tear near cockpit
      if (z >= -24 && z <= -21 && k <= 2) {
        keep = false;
      }

      grid[s].push(keep);
    }
  }
  return grid;
}

const PANEL_GRID = makeDamageGrid();

// ─────────────────────── BAKING LIGHTS & AO ───────────────────────

function bake(
  geo: THREE.BufferGeometry | null | undefined,
  lights: BakeLight[],
  ambient: THREE.Color,
  interior: boolean
) {
  if (!geo || !geo.attributes) return;
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const col = geo.attributes.color as THREE.BufferAttribute;
  if (!pos || !nor || !col) return;

  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const l = new THREE.Vector3();
  const lit = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    lit.copy(ambient);

    // Realistic ambient occlusion: contact shadow where walls meet deck & ceiling corners
    let occ = 1.0;
    if (interior) {
      if (p.y < 0.7) {
        const wallDist = HULL_RADIUS - Math.abs(p.x);
        occ *= 0.7 + 0.3 * smooth(0, 3.0, wallDist);
      }
      if (p.y > CEILING_H - 1.5) {
        occ *= 0.8 + 0.2 * smooth(CEILING_H - 1.5, CEILING_H, p.y);
      }
    }

    for (const L of lights) {
      let att = 1;
      if (L.directional) {
        l.copy(L.pos).normalize();
      } else {
        l.subVectors(L.pos, p);
        const d = l.length();
        l.divideScalar(d || 1);
        const q = d / L.radius;
        att = q >= 1 ? 0 : (1 - q * q) * (1 - q * q);
      }
      if (att <= 0) continue;

      // Wrap-around soft diffuse lighting so both sides stay lit
      const ndl = 0.35 + 0.65 * Math.abs(n.dot(l));
      const k = L.intensity * att * ndl;
      lit.r += L.color.r * k;
      lit.g += L.color.g * k;
      lit.b += L.color.b * k;
    }

    col.setXYZ(
      i,
      Math.min(1, col.getX(i) * lit.r * occ),
      Math.min(1, col.getY(i) * lit.g * occ),
      Math.min(1, col.getZ(i) * lit.b * occ)
    );
  }
  col.needsUpdate = true;
}

function scorch(
  geo: THREE.BufferGeometry | null | undefined,
  centres: [number, number, number, number][]
) {
  if (!geo || !geo.attributes) return;
  const pos = geo.attributes.position;
  const col = geo.attributes.color as THREE.BufferAttribute;
  if (!pos || !col) return;

  for (let i = 0; i < pos.count; i++) {
    let dark = 1;
    for (const [cx, cy, cz, sigma] of centres) {
      const d2 =
        (pos.getX(i) - cx) ** 2 +
        (pos.getY(i) - cy) ** 2 +
        (pos.getZ(i) - cz) ** 2;
      dark *= 1 - 0.7 * Math.exp(-d2 / (2 * sigma * sigma));
    }
    col.setXYZ(i, col.getX(i) * dark, col.getY(i) * dark, col.getZ(i) * dark);
  }
}

// ═════════════════════════════ GENERATOR ═══════════════════════════════

export function buildShipModel(): ShipModel {
  const rng = mulberry32(2024);
  const interior = new Bucket();
  const exterior = new Bucket();
  const floor = new Bucket();
  const structural = new Bucket();
  const emissive = new Bucket();
  const alarm = new Bucket();
  const flicker = new Bucket();
  const colliders: Aabb[] = [];

  const paint = (g: THREE.BufferGeometry, color: number, jitter = 0.06) => {
    const geo = nonIndexed(g);
    const c = new THREE.Color(color);
    const n = geo.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 3) {
      const j = 1 + (rng() - 0.5) * 2 * jitter;
      for (let k = 0; k < 3; k++) {
        arr[(i + k) * 3] = c.r * j;
        arr[(i + k) * 3 + 1] = c.g * j;
        arr[(i + k) * 3 + 2] = c.b * j;
      }
    }
    geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    return geo;
  };

  const box = (
    b: Bucket,
    w: number,
    h: number,
    d: number,
    xf: Xf,
    color: number,
    seg: [number, number, number] = [1, 1, 1],
    jitter = 0.05
  ) => {
    b.add(
      paint(
        place(new THREE.BoxGeometry(w, h, d, seg[0], seg[1], seg[2]), xf),
        color,
        jitter
      )
    );
  };

  const solid = (
    b: Bucket,
    w: number,
    h: number,
    d: number,
    p: [number, number, number],
    rotY: number,
    color: number
  ) => {
    box(b, w, h, d, { p, r: [0, rotY, 0] }, color, [2, 2, 2]);
    const c = Math.abs(Math.cos(rotY)),
      s = Math.abs(Math.sin(rotY));
    const hx = (c * w + s * d) / 2,
      hz = (s * w + c * d) / 2;
    colliders.push({
      minX: p[0] - hx,
      maxX: p[0] + hx,
      minZ: p[2] - hz,
      maxZ: p[2] + hz,
    });
  };

  const cyl = (
    b: Bucket,
    rt: number,
    rb: number,
    len: number,
    radial: number,
    xf: Xf,
    color: number,
    open = false
  ) => {
    const g = new THREE.CylinderGeometry(rt, rb, len, radial, 1, open);
    g.rotateX(Math.PI / 2); // axis along Z
    b.add(paint(place(g, xf), color));
  };

  // ── 1. DOUBLE-SHELL HULL WITH REAL THICK TORN EDGES ───────────────────
  const hullPlate = (
    seg: number,
    sec: number,
    radius: number,
    taper: [number, number]
  ) => {
    const z = -HULL_HALF_LEN + SEG_LEN * (seg + 0.5);
    const g = new THREE.CylinderGeometry(
      radius - taper[0],
      radius - taper[1],
      SEG_LEN - 0.04,
      4,
      3,
      true,
      Math.PI / 2 + sec * SECTOR_ANGLE,
      SECTOR_ANGLE
    );
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, z);
    return g;
  };

  const missing = (s: number, k: number) =>
    k < 0 || k >= SECTORS || s < 0 || s >= SEG_COUNT
      ? false
      : !PANEL_GRID[s][k];

  for (let s = 0; s < SEG_COUNT; s++) {
    for (let k = 0; k < SECTORS; k++) {
      if (!PANEL_GRID[s][k]) continue;

      const edge =
        missing(s - 1, k) ||
        missing(s + 1, k) ||
        missing(s, k - 1) ||
        missing(s, k + 1);
      const taper: [number, number] = edge
        ? [rng() < 0.5 ? rng() * 0.9 : 0, rng() * 0.9]
        : [0, 0];

      // Alternating slate-blue interior hull panels
      const shade = (s + k) % 2 ? 0x3d4856 : 0x343e4b;
      interior.add(paint(hullPlate(s, k, HULL_RADIUS, taper), shade, 0.07));

      // Outer weathered titanium armor
      const extShade = (s + k) % 3 ? 0x8a94a2 : 0x788290;
      exterior.add(
        paint(
          hullPlate(s, k, HULL_RADIUS + HULL_THICKNESS, taper),
          extShade,
          0.08
        )
      );

      // Capped edge thickness geometry along torn perimeter (real thickness >= 0.28m)
      if (edge) {
        const z = -HULL_HALF_LEN + SEG_LEN * (s + 0.5);
        const a = Math.PI / 2 + (k + 0.5) * SECTOR_ANGLE;
        const capX = (HULL_RADIUS + HULL_THICKNESS * 0.5) * Math.cos(a);
        const capY = (HULL_RADIUS + HULL_THICKNESS * 0.5) * Math.sin(a);
        box(
          structural,
          0.32,
          0.32,
          SEG_LEN * 0.96,
          { p: [capX, capY, z], r: [0, 0, a - Math.PI / 2] },
          0x4a5563,
          [1, 1, 1],
          0.05
        );
      }
    }
  }

  // ── 2. CONTINUOUS ARCHED I-BEAM RIBS (Framing every 4 meters) ─────────
  for (let z = -38; z <= 38; z += 4) {
    const inBreach = z > -12 && z < 20;
    const arcs: number[] = inBreach
      ? [0.28 + rng() * 0.4, 0.24 + rng() * 0.35]
      : [1.0];

    arcs.forEach((frac, idx) => {
      // Main web
      const ribGeo = new THREE.TorusGeometry(
        HULL_RADIUS - 0.16,
        0.24,
        6,
        32,
        Math.PI * frac
      );
      if (inBreach && idx === 1) {
        // Second jagged stub hangs off the LEFT side
        ribGeo.rotateZ(Math.PI - Math.PI * frac);
      }
      ribGeo.translate(0, 0, z);
      structural.add(paint(ribGeo, 0x546274, 0.06));

      // Inner flange lip
      const flangeGeo = new THREE.TorusGeometry(
        HULL_RADIUS - 0.36,
        0.1,
        4,
        32,
        Math.PI * frac
      );
      if (inBreach && idx === 1) {
        flangeGeo.rotateZ(Math.PI - Math.PI * frac);
      }
      flangeGeo.translate(0, 0, z);
      structural.add(paint(flangeGeo, 0x3d4754, 0.05));
    });

    // Floor gusset anchor plates where rib meets the deck
    for (const side of [-1, 1]) {
      box(
        structural,
        0.6,
        1.1,
        0.4,
        { p: [side * (HULL_RADIUS - 0.5), FLOOR_Y + 0.55, z] },
        0x36404d,
        [1, 1, 1],
        0.04
      );
    }
  }

  // ── 3. WALL PIPES & CONDUITS (Running continuously down the hull) ──────
  for (let s = 0; s < SEG_COUNT; s++) {
    const z = -HULL_HALF_LEN + SEG_LEN * (s + 0.5);
    for (const deg of [25, 42, 60]) {
      for (const side of [1, -1]) {
        const a = (deg * Math.PI) / 180;
        const sec = Math.floor(a / SECTOR_ANGLE);
        const k = side === 1 ? sec : SECTORS - 1 - sec;
        if (!PANEL_GRID[s][k] || rng() < 0.12) continue;

        const r = HULL_RADIUS - 0.42;
        const color =
          deg === 42 ? 0x8c6240 : deg === 25 ? 0x40727c : 0x58626e;
        cyl(
          structural,
          0.16,
          0.16,
          SEG_LEN - 0.08,
          8,
          { p: [side * r * Math.cos(a), r * Math.sin(a), z] },
          color
        );
      }
    }
  }

  // ── 4. COCKPIT DOME & SMASHED PANORAMIC VIEWPORT ──────────────────────
  const dome = (grow: number) => {
    const g = new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    g.rotateX(-Math.PI / 2);
    g.scale(HULL_RADIUS + grow, HULL_RADIUS + grow, NOSE_LEN + grow);
    g.translate(0, 0, -HULL_HALF_LEN);
    return cullTris(
      g,
      (x, y, z) => z < -47 && Math.abs(x) < 5.6 && y > 2.0 && y < 6.4
    );
  };
  interior.add(paint(dome(0), 0x364250, 0.06));
  exterior.add(paint(dome(HULL_THICKNESS), 0x828c98, 0.07));

  // Cockpit window frame mullions
  [-3.2, 0, 3.2].forEach((x) => {
    box(
      structural,
      0.4,
      4.8,
      0.5,
      { p: [x, 4.3, -48.2], r: [0.35, 0, 0] },
      0x222a34
    );
  });
  box(
    structural,
    11.4,
    0.4,
    0.5,
    { p: [0, 4.3, -48.2], r: [0.35, 0, 0] },
    0x222a34
  );

  // ── 5. FLOOR DECK, CATWALK, AND MEZZANINE ─────────────────────────────
  // Main deck plating (solid 35cm heavy alloy slab)
  floor.add(
    paint(
      place(
        new THREE.BoxGeometry(
          HULL_RADIUS * 2,
          0.35,
          HULL_HALF_LEN * 2,
          16,
          1,
          32
        ),
        { p: [0, FLOOR_Y - 0.175, 0] }
      ),
      0x303844,
      0.04
    )
  );

  // Cockpit deck plating (solid 35cm heavy alloy platform matching main deck)
  {
    const g = new THREE.CylinderGeometry(1, 1, 0.35, 36);
    g.scale(HULL_RADIUS, 1, NOSE_LEN);
    g.translate(0, FLOOR_Y - 0.175, -HULL_HALF_LEN);
    floor.add(paint(g, 0x303844, 0.04));
  }

  // Transverse floor expansion seams across the full ship length
  for (let z = -48; z <= 40; z += 4) {
    box(
      floor,
      HULL_RADIUS * 2,
      0.03,
      0.09,
      { p: [0, FLOOR_Y + 0.015, z] },
      0x181e26,
      [1, 1, 1],
      0
    );
  }
  // Longitudinal guide seams
  for (const x of [-3.2, 3.2, -6.5, 6.5]) {
    box(
      floor,
      0.09,
      0.03,
      HULL_HALF_LEN * 2 + NOSE_LEN,
      { p: [x, FLOOR_Y + 0.015, -NOSE_LEN * 0.5] },
      0x181e26,
      [1, 1, 1],
      0
    );
  }

  // Continuous central industrial catwalk grating down the entire ship spine
  // Runs seamlessly from stern (z = 38) through the corridor and door into the bridge (z = -48)
  for (let z = -48; z <= 38; z += 2.5) {
    box(
      floor,
      3.2,
      0.07,
      2.35,
      { p: [0, FLOOR_Y + 0.035, z + 1.25] },
      0x4e5b6e,
      [1, 1, 1],
      0.04
    );
  }

  // Dashed neon cyan floor guide strips (continuous through doorway and bridge)
  for (const x of [-1.8, 1.8]) {
    for (let z = -48; z <= 38; z += 2.5) {
      box(
        emissive,
        0.14,
        0.025,
        1.5,
        { p: [x, FLOOR_Y + 0.038, z] },
        0x00ffff,
        [1, 1, 1],
        0
      );
    }
  }

  // Side modular floor plating panels flanking the central catwalk
  for (const x of [-5.5, 5.5]) {
    for (let z = -44; z <= 36; z += 4.0) {
      box(
        floor,
        3.2,
        0.04,
        3.6,
        { p: [x, FLOOR_Y + 0.02, z + 2.0] },
        0x36414e,
        [1, 1, 1],
        0.03
      );
    }
  }

  // ── 6. SLEEK INTEGRATED MEZZANINE (Cargo Bay Elevated Walkway) ─────────
  const mz = MEZZANINE;
  const mzW = mz.xMax - mz.xMin; // 5.2m wide
  const mzD = mz.zMax - mz.zMin; // 20m long

  // Walkway deck grating
  box(
    floor,
    mzW,
    0.22,
    mzD,
    {
      p: [
        (mz.xMin + mz.xMax) * 0.5,
        mz.floorY - 0.11,
        (mz.zMin + mz.zMax) * 0.5,
      ],
    },
    0x3d4754,
    [3, 1, 8],
    0.06
  );

  // Yellow hazard stripe border along walkway inner edge
  box(
    emissive,
    0.16,
    0.03,
    mzD,
    { p: [mz.xMax - 0.08, mz.floorY + 0.015, (mz.zMin + mz.zMax) * 0.5] },
    0xf5a623,
    [1, 1, 1],
    0
  );

  // Vertical steel support pillars with diagonal cross-bracing
  for (let z = mz.zMin + 2; z <= mz.zMax; z += 4.5) {
    box(
      structural,
      0.35,
      mz.floorY,
      0.35,
      { p: [mz.xMax - 0.18, mz.floorY * 0.5, z] },
      0x303742
    );
    // Diagonal brace to wall
    box(
      structural,
      2.8,
      0.18,
      0.18,
      { p: [mz.xMin + 1.4, mz.floorY * 0.6, z], r: [0, 0, 0.42] },
      0x28303a
    );
  }

  // Mezzanine safety railings & handrail
  for (let z = mz.zMin; z <= mz.zMax; z += 2.0) {
    box(
      structural,
      0.08,
      mz.railHeight,
      0.08,
      { p: [mz.xMax, mz.floorY + mz.railHeight * 0.5, z] },
      0x8c96a4
    );
  }
  box(
    structural,
    0.1,
    0.08,
    mzD,
    { p: [mz.xMax, mz.floorY + mz.railHeight, (mz.zMin + mz.zMax) * 0.5] },
    0xf5a623 // bright safety amber
  );

  // Sleek industrial access ramp from z = -3 to z = 0
  const r = mz.ramp;
  const rampLen = Math.hypot(r.zEnd - r.zStart, r.yEnd - r.yStart);
  const rampPitch = Math.atan2(r.yEnd - r.yStart, r.zEnd - r.zStart);
  const rampW = r.xMax - r.xMin;
  box(
    floor,
    rampW,
    0.16,
    rampLen,
    {
      p: [
        (r.xMin + r.xMax) * 0.5,
        (r.yStart + r.yEnd) * 0.5,
        (r.zStart + r.zEnd) * 0.5,
      ],
      r: [rampPitch, 0, 0],
    },
    0x3d4754,
    [2, 1, 4]
  );
  // Ramp safety side railing
  box(
    structural,
    0.08,
    mz.railHeight,
    rampLen,
    {
      p: [
        r.xMax,
        (r.yStart + r.yEnd) * 0.5 + mz.railHeight * 0.5,
        (r.zStart + r.zEnd) * 0.5,
      ],
      r: [rampPitch, 0, 0],
    },
    0xf5a623
  );

  // ── 7. STARBOARD CARGO BAY SURFACE EGRESS GANGWAY RAMP ───────────────────
  // A wide, heavy industrial loading ramp leading from inside the ship directly out onto the planet!
  const rampStartX = 6.6;
  const rampEndX = 15.2;
  const egressRampW = rampEndX - rampStartX; // 8.6m long
  const rampZ = 8.0;
  const rampD = 9.0; // 9m wide in Z (from z = 3.5 to z = 12.5)
  const rampSlope = Math.atan2(0.02 - (-0.28), egressRampW);

  // Main textured metal gangway plate
  box(
    floor,
    egressRampW,
    0.22,
    rampD,
    {
      p: [(rampStartX + rampEndX) * 0.5, -0.12, rampZ],
      r: [0, 0, -rampSlope],
    },
    0x3d4754,
    [3, 1, 4]
  );

  // Bold yellow/black hazard chevrons painted on the ramp surface
  for (let z = rampZ - 3.6; z <= rampZ + 3.6; z += 1.8) {
    box(
      emissive,
      egressRampW * 0.9,
      0.03,
      0.22,
      {
        p: [(rampStartX + rampEndX) * 0.5, -0.01, z],
        r: [0, 0, -rampSlope],
      },
      0xf5a623,
      [1, 1, 1],
      0
    );
  }

  // Cyan guide lights running along both sides of the ramp leading outside
  for (let x = rampStartX + 0.8; x <= rampEndX - 0.5; x += 1.8) {
    const t = (x - rampStartX) / egressRampW;
    const y = THREE.MathUtils.lerp(FLOOR_Y + 0.04, -0.25 + 0.04, t);
    for (const sideZ of [rampZ - rampD * 0.5 + 0.25, rampZ + rampD * 0.5 - 0.25]) {
      box(
        emissive,
        0.2,
        0.05,
        0.2,
        { p: [x, y, sideZ] },
        0x00ffff,
        [1, 1, 1],
        0
      );
    }
  }

  // Side heavy safety curbs on the ramp
  for (const sideZ of [rampZ - rampD * 0.5, rampZ + rampD * 0.5]) {
    box(
      structural,
      egressRampW,
      0.35,
      0.25,
      {
        p: [(rampStartX + rampEndX) * 0.5, -0.05, sideZ],
        r: [0, 0, -rampSlope],
      },
      0x4a5563
    );
  }

  // Large illuminated overhead archway portal at the breach threshold (x = 7.2)
  box(
    structural,
    0.5,
    5.2,
    0.5,
    { p: [7.2, 2.6, rampZ - rampD * 0.5 + 0.2] },
    0x2b323c
  );
  box(
    structural,
    0.5,
    5.2,
    0.5,
    { p: [7.2, 2.6, rampZ + rampD * 0.5 - 0.2] },
    0x2b323c
  );
  box(
    structural,
    0.5,
    0.45,
    rampD,
    { p: [7.2, 5.1, rampZ] },
    0x2b323c
  );
  // Glowing overhead sign
  box(
    emissive,
    0.08,
    0.35,
    rampD * 0.75,
    { p: [7.0, 5.0, rampZ] },
    0x00ffff,
    [1, 1, 1],
    0
  );

  // Banked dirt and alien regolith berms smoothly piled around the ramp edges outside
  for (let i = 0; i < 8; i++) {
    const m = new THREE.SphereGeometry(1, 8, 6);
    const zOffset = (i - 3.5) * 2.2;
    place(m, {
      p: [rampEndX + 0.5, -0.2, rampZ + zOffset],
      s: [2.5, 0.4, 2.0],
    });
    exterior.add(paint(m, 0x5d5648, 0.12));
  }

  // ── 8. HANGING TORN CEILING PLATES (Dramatic silhouette against sky) ───
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (4.2 + rng() * 3.2);
    const z = -9 + rng() * 26;
    box(
      interior,
      2.2 + rng() * 1.5,
      0.1,
      2.0 + rng() * 1.6,
      {
        p: [x, 5.5 + rng() * 2.2, z],
        r: [rng() * 0.6, rng() * 3, side * (0.35 + rng() * 0.65)],
      },
      0x3c4655,
      [2, 1, 2]
    );
  }

  // ── 9. BULKHEAD WALLS WITH ARCHED BEVELED FRAMES ──────────────────────
  const makeBulkhead = (z: number, doorW: number, doorH: number) => {
    // Left partition
    box(
      interior,
      (HULL_RADIUS - doorW * 0.5) * 1.05,
      CEILING_H,
      0.4,
      { p: [-(HULL_RADIUS + doorW * 0.5) * 0.5, CEILING_H * 0.5, z] },
      0x323c48
    );
    // Right partition
    box(
      interior,
      (HULL_RADIUS - doorW * 0.5) * 1.05,
      CEILING_H,
      0.4,
      { p: [(HULL_RADIUS + doorW * 0.5) * 0.5, CEILING_H * 0.5, z] },
      0x323c48
    );
    // Transom lintel
    box(
      interior,
      doorW + 0.6,
      CEILING_H - doorH,
      0.4,
      { p: [0, doorH + (CEILING_H - doorH) * 0.5, z] },
      0x323c48
    );

    // Glowing door frame jambs on BOTH sides (+Z and -Z)
    for (const sideZ of [z - 0.22, z + 0.22]) {
      box(
        emissive,
        0.14,
        doorH + 0.2,
        0.1,
        { p: [-doorW * 0.5 - 0.07, doorH * 0.5, sideZ] },
        0xffb23a,
        [1, 1, 1],
        0
      );
      box(
        emissive,
        0.14,
        doorH + 0.2,
        0.1,
        { p: [doorW * 0.5 + 0.07, doorH * 0.5, sideZ] },
        0xffb23a,
        [1, 1, 1],
        0
      );
    }

    colliders.push({
      minX: -HULL_RADIUS,
      maxX: -doorW * 0.5,
      minZ: z - 0.3,
      maxZ: z + 0.3,
    });
    colliders.push({
      minX: doorW * 0.5,
      maxX: HULL_RADIUS,
      minZ: z - 0.3,
      maxZ: z + 0.3,
    });
  };

  makeBulkhead(-30, 2.8, 3.4); // Bridge bulkhead
  makeBulkhead(-18, 3.0, 3.4); // Crew quarters bulkhead
  makeBulkhead(-4, 3.4, 3.6);  // Cargo bay bulkhead
  makeBulkhead(22, 2.8, 3.4);  // Engine room bulkhead

  // Dynamic doorway colliders (passable when open, blocking when closed)
  DOORS.forEach((d) => {
    colliders.push({
      id: d.id,
      isDoor: true,
      isOpen: d.open,
      minX: d.rotY === 0 ? -d.width * 0.5 : d.x - 0.25,
      maxX: d.rotY === 0 ? d.width * 0.5 : d.x + 0.25,
      minZ: d.rotY === 0 ? d.z - 0.25 : d.z - d.width * 0.5,
      maxZ: d.rotY === 0 ? d.z + 0.25 : d.z + d.width * 0.5,
      minY: 0,
      maxY: d.height,
    });
  });

  // ── 9. PROPS INTEGRATED INTO ARCHITECTURAL WALL BAYS ──────────────────
  // A) Recessed Wall Lockers (Nestled into wall alcoves at x = -9.2)
  for (let i = 0; i < 4; i++) {
    const lz = -27 + i * 1.5;
    solid(interior, 1.1, 2.4, 0.9, [-9.2, 1.2, lz], 0, 0x485260);
    // Locker door seams and status latch
    box(
      structural,
      0.08,
      2.1,
      0.7,
      { p: [-8.6, 1.2, lz] },
      0x343c46
    );
    box(
      emissive,
      0.06,
      0.06,
      0.06,
      { p: [-8.55, 1.7, lz] },
      i % 2 === 0 ? 0x00ff88 : 0xff3b30,
      [1, 1, 1],
      0
    );
  }

  // B) Mess Hall Dining Tables & Benches (Crew Quarters)
  box(interior, 3.2, 0.8, 1.8, { p: [-6.8, 0.4, -10] }, 0x56606e);
  box(interior, 3.2, 0.45, 0.6, { p: [-6.8, 0.225, -11.4] }, 0x3d4550);
  box(interior, 3.2, 0.45, 0.6, { p: [-6.8, 0.225, -8.6] }, 0x3d4550);
  colliders.push({ minX: -8.6, maxX: -5.0, minZ: -12.0, maxZ: -8.0 });

  // C) Bridge Avionics Consoles & Pilot Chairs
  [-4.2, 0, 4.2].forEach((x, i) => {
    const ry = -Math.sign(x || 1) * 0.32 * (i === 1 ? 0 : 1);
    solid(interior, 3.4, 1.05, 1.3, [x, 0.55, -42], ry, 0x2e3642);

    // CRT Displays
    const scr = new THREE.BoxGeometry(2.6, 0.04, 0.9);
    place(scr, { p: [x, 1.25, -42.2], r: [-0.68, ry, 0] });
    (i === 1 ? flicker : emissive).add(
      paint(scr, i === 1 ? 0x2288aa : 0x00f0ff, 0)
    );

    // Pilot seats
    box(
      interior,
      1.1,
      0.45,
      1.1,
      { p: [x, 0.45, -39], r: [0, ry, 0] },
      0x4a3f3a
    );
    box(
      interior,
      1.1,
      1.4,
      0.22,
      { p: [x, 1.25, -38.5], r: [-0.15, ry, 0] },
      0x4a3f3a
    );
    colliders.push({
      minX: x - 0.6,
      maxX: x + 0.6,
      minZ: -39.6,
      maxZ: -38.4,
    });
  });

  // D) Cargo Bay Shipping Containers & Heavy Crates
  solid(interior, 3.2, 2.4, 5.0, [-4.5, 1.2, 14], 0.05, 0x9a4e28); // rust orange
  box(
    emissive,
    2.8,
    0.06,
    4.6,
    { p: [-4.5, 2.43, 14], r: [0, 0.05, 0] },
    0xf5a623, // hazard top
    [1, 1, 1],
    0
  );
  box(
    interior,
    3.0,
    2.2,
    4.8,
    { p: [-4.8, 3.6, 14.3], r: [0.06, 0.22, 0.16] },
    0x2c6a6e // stacked teal container
  );
  // Keep starboard egress corridor (x ∈ [5, 16], z ∈ [2, 14]) completely clear for walking out!
  solid(interior, 3.0, 2.4, 4.0, [4.8, 1.2, 19], -0.06, 0x385c7e); // navy container in aft corner
  solid(interior, 2.4, 1.8, 3.2, [-4.5, 0.9, 19], 0.42, 0x606874);

  // Fallen industrial beams & debris (tucked safely along sides)
  box(
    structural,
    0.45,
    0.45,
    9.0,
    { p: [-1.8, 1.8, -3.5], r: [0.12, 0.52, 0.16] },
    0x647080,
    [1, 1, 6]
  );
  box(
    structural,
    0.4,
    0.4,
    6.5,
    { p: [-3.2, 0.4, 6.0], r: [0, -0.68, 0.1] },
    0x647080,
    [1, 1, 5]
  );

  // E) Engine Room Reactor Core
  solid(interior, 4.8, 4.5, 4.8, [0, 2.25, 33], 0, 0x272c35);
  // Reactor glowing containment ring
  const reactorRing = new THREE.TorusGeometry(2.6, 0.25, 8, 32);
  reactorRing.rotateX(Math.PI / 2);
  reactorRing.translate(0, 2.5, 33);
  flicker.add(paint(reactorRing, 0x00ffcc, 0));

  // ── 10. LIGHT FIXTURES & MOUNTING BRACKETS ────────────────────────────
  const bakeLights: BakeLight[] = [];
  const C = (r: number, g: number, b: number) => new THREE.Color(r, g, b);

  // Ceiling lights with industrial angled mounting brackets
  const fixtureZ = [-36, -32, -26, -22, -14, -6, 2, 8, 14, 24, 28, 34];
  fixtureZ.forEach((z, i) => {
    [-3.8, 3.8].forEach((x) => {
      const isFlicker = (i + (x > 0 ? 1 : 0)) % 4 === 0;
      const targetBucket = isFlicker ? flicker : emissive;

      // Fixture housing
      box(
        structural,
        0.5,
        0.18,
        2.2,
        { p: [x, 6.2, z] },
        0x202630
      );
      // Mounting bracket to hull
      box(
        structural,
        0.12,
        0.9,
        0.12,
        { p: [x, 6.7, z] },
        0x36404d
      );
      // Glowing luminaire lens
      box(
        targetBucket,
        0.36,
        0.08,
        1.9,
        { p: [x, 6.1, z] },
        0xffeed0,
        [1, 1, 1],
        0
      );

      bakeLights.push({
        pos: new THREE.Vector3(x, 5.8, z),
        color: C(0.92, 0.96, 1.0),
        intensity: isFlicker ? 0.7 : 1.05,
        radius: 12,
      });
    });
  });

  // Red alarm lamps in corridors & engine room (tight radius so they don't muddy the floor)
  [-28, -16, 24, 36].forEach((z) => {
    [-HULL_RADIUS + 0.8, HULL_RADIUS - 0.8].forEach((x) => {
      box(alarm, 0.35, 0.35, 0.35, { p: [x, 3.8, z] }, 0xff2211, [1, 1, 1], 0);
      bakeLights.push({
        pos: new THREE.Vector3(x * 0.9, 3.6, z),
        color: C(1.0, 0.15, 0.08),
        intensity: 0.65,
        radius: 6,
      });
    });
  });

  // Gorgeous starlight & black hole gravitational azure wash through the open roof
  [-8, -2, 4, 10, 16].forEach((z) => {
    bakeLights.push({
      pos: new THREE.Vector3(0, 15, z),
      color: C(0.42, 0.68, 1.0),
      intensity: 0.85,
      radius: 22,
    });
  });
  // Cockpit view glow
  bakeLights.push({
    pos: new THREE.Vector3(0, 3.5, -46),
    color: C(0.35, 0.85, 1.0),
    intensity: 0.95,
    radius: 14,
  });

  // ── 11. STERN PROPULSION BLOCK & THRUSTERS ────────────────────────────
  {
    const wall = (grow: number) => {
      const g = new THREE.CircleGeometry(HULL_RADIUS + grow, 36, 0, Math.PI);
      g.translate(0, 0, HULL_HALF_LEN + grow);
      return g;
    };
    interior.add(paint(wall(0), 0x303844, 0.06));
    exterior.add(paint(wall(HULL_THICKNESS), 0x7c8896, 0.07));

    colliders.push({
      minX: -HULL_RADIUS,
      maxX: HULL_RADIUS,
      minZ: HULL_HALF_LEN - 0.2,
      maxZ: HULL_HALF_LEN + 14,
    });
  }

  // Triple massive sublight engines
  [-5.6, 0, 5.6].forEach((x, i) => {
    const isBroken = i === 1;
    cyl(
      exterior,
      2.8,
      2.8,
      8.5,
      20,
      { p: [x, 4.5, 44.5], r: isBroken ? [0.08, 0, 0.06] : [0, 0, 0] },
      0x58606c
    );
    cyl(
      exterior,
      3.5,
      2.7,
      3.8,
      20,
      { p: [x, 4.5, 50.2], r: isBroken ? [0.08, 0, 0.06] : [0, 0, 0] },
      0x383e46,
      true
    );
    const ember = new THREE.CircleGeometry(2.4, 20);
    place(ember, { p: [x, 4.5, 48.8] });
    (isBroken ? flicker : alarm).add(
      paint(ember, isBroken ? 0x441508 : 0xff4810, 0)
    );
  });

  // ── 12. EXTERIOR CRASH SITE & SCORCH TRAIL ────────────────────────────
  const wing = (
    pts: [number, number][],
    y: number,
    droop: number,
    pivotX: number
  ) => {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, z]) => shape.lineTo(x, z));
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: false,
    });
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.55 + y, 0);
    g.translate(-pivotX, -y, 0);
    g.rotateZ(droop);
    g.translate(pivotX, y, 0);
    exterior.add(paint(g, 0x7a8492, 0.08));
  };

  wing(
    [
      [-10.8, -10],
      [-32, 8],
      [-35, 16],
      [-10.8, 22],
    ],
    2.5,
    0.22,
    -10.8
  );
  wing(
    [
      [10.8, -10],
      [18, -4],
      [16, 5],
      [19, 11],
      [10.8, 22],
    ],
    2.5,
    -0.08,
    10.8
  );

  // Scorched landing drag marks
  for (let i = 0; i < 24; i++) {
    const d = new THREE.CircleGeometry(2.5 + rng() * 4.5, 16);
    d.rotateX(-Math.PI / 2);
    place(d, {
      p: [(rng() - 0.5) * 10, 0.03 + i * 0.001, 52 + i * 5 + rng() * 4],
    });
    exterior.add(paint(d, 0x161310, 0.15));
  }

  // ═════════════ MERGE & BAKE VERTEX LIGHTING ═════════════
  const iGeo = interior.merge();
  const eGeo = exterior.merge();
  const fGeo = floor.merge();
  const sGeo = structural.merge();

  // Vibrant ambient starlight: rich clear deep-space fill
  const interiorAmbient = new THREE.Color(0.36, 0.42, 0.56);
  const exteriorAmbient = new THREE.Color(0.48, 0.56, 0.70);

  bake(iGeo, bakeLights, interiorAmbient, true);
  bake(fGeo, bakeLights, interiorAmbient, true);
  bake(sGeo, bakeLights, interiorAmbient, true);
  bake(
    eGeo,
    [
      {
        pos: new THREE.Vector3(0.5, 0.8, -0.4),
        color: new THREE.Color(0.85, 0.92, 1.0),
        intensity: 0.95,
        radius: 1,
        directional: true,
      },
    ],
    exteriorAmbient,
    false
  );

  scorch(eGeo, [
    [-11.5, 2.0, -6, 4],
    [11.5, 1.5, -20, 3],
    [0, 11, 4, 10],
    [0, 1.2, -50, 6],
    [0, 4.5, 45, 8],
  ]);

  const out: ShipModel = {
    interior: iGeo,
    exterior: eGeo,
    floor: fGeo,
    structural: sGeo,
    emissive: emissive.merge(),
    alarm: alarm.merge(),
    flicker: flicker.merge(),
    colliders,
    triangles: 0,
  };

  [
    out.interior,
    out.exterior,
    out.floor,
    out.structural,
    out.emissive,
    out.alarm,
    out.flicker,
  ].forEach((g) => {
    if (g && g.attributes && g.attributes.position) {
      g.computeBoundingSphere();
      out.triangles += g.attributes.position.count / 3;
    }
  });

  return out;
}
