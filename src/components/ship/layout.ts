/**
 * layout.ts — Data-driven ship layout (single source of truth)
 * =============================================================
 * Every room, corridor, door, breach, prop, and structural element is
 * defined here as plain data. Both the geometry generator (shipModel.ts)
 * and the collision system (collision.ts) read from these arrays.
 *
 * Ship axis: +Z = stern (engines), -Z = nose (cockpit/bridge).
 * Floor at y = 0.02, player eye height 1.5.
 * Hull radius ~11, total length ~100.
 *
 * Zones (nose → stern):
 *   1. Bridge/Cockpit   z ∈ [-50, -30]   — dome + command deck
 *   2. Corridor          z ∈ [-30, -18]   — main connecting passage
 *   3. Crew Quarters     z ∈ [-18, -4]    — bunks, lockers, mess
 *   4. Cargo Bay         z ∈ [-4, 22]     — large open area, mezzanine
 *   5. Engine Room       z ∈ [22, 40]     — machinery, reactors
 *   6. Stern/Engines     z ∈ [40, 50]     — engine block, nozzles
 */

// ─────────────────────── HULL CONSTANTS ───────────────────────
export const HULL_RADIUS   = 11;
export const HULL_HALF_LEN = 40;           // main tunnel: z ∈ [-40, 40]
export const NOSE_LEN      = 14;           // cockpit dome beyond -40
export const TOTAL_LENGTH  = HULL_HALF_LEN * 2 + NOSE_LEN + 10; // ~104
export const FLOOR_Y       = 0.02;
export const CEILING_H     = 9;            // floor-to-ceiling at centre

// Panel grid resolution
export const SEG_LEN   = 2.5;
export const SEG_COUNT = Math.floor((HULL_HALF_LEN * 2) / SEG_LEN); // 32
export const SECTORS   = 20;              // angular panels over upper half
export const SECTOR_ANGLE = Math.PI / SECTORS;

// Hull thickness (double-shell)
export const HULL_THICKNESS = 0.35;

// ─────────────────────── ZONE DEFINITIONS ───────────────────────
export interface Zone {
  id: string;
  name: string;
  zMin: number;
  zMax: number;
  /** Optional narrower x bounds (defaults to full hull width) */
  xMin?: number;
  xMax?: number;
  /** Ceiling height override */
  ceilingY?: number;
  color: number;  // base interior tint
}

export const ZONES: Zone[] = [
  { id: "bridge",    name: "Bridge",         zMin: -54, zMax: -30, ceilingY: 8,   color: 0x2a3545 },
  { id: "corridor1", name: "Main Corridor",  zMin: -30, zMax: -18, ceilingY: 4.5, color: 0x333d4a },
  { id: "crew",      name: "Crew Quarters",  zMin: -18, zMax: -4,  ceilingY: 4.5, color: 0x3a3535 },
  { id: "cargo",     name: "Cargo Bay",      zMin: -4,  zMax: 22,  ceilingY: 9,   color: 0x2d3640 },
  { id: "engine",    name: "Engine Room",    zMin: 22,  zMax: 40,  ceilingY: 6,   color: 0x2b2b35 },
  { id: "stern",     name: "Stern",          zMin: 40,  zMax: 50,  ceilingY: 5,   color: 0x252530 },
];

// ─────────────────────── ROOM / CORRIDOR DATA ───────────────────────
export interface Room {
  id: string;
  zone: string;
  /** AABB in ship-local coords */
  xMin: number; xMax: number;
  zMin: number; zMax: number;
  floorY: number;
  ceilingY: number;
  /** Wall segments to generate (open sides get doors/archways) */
  walls: ("north" | "south" | "east" | "west")[];
}

export const ROOMS: Room[] = [
  // Crew quarters side rooms
  { id: "bunk_port",    zone: "crew", xMin: -10.5, xMax: -3, zMin: -17, zMax: -11, floorY: FLOOR_Y, ceilingY: 4, walls: ["north", "south", "west"] },
  { id: "bunk_star",    zone: "crew", xMin: 3,     xMax: 10.5, zMin: -17, zMax: -11, floorY: FLOOR_Y, ceilingY: 4, walls: ["north", "south", "east"] },
  { id: "mess_hall",    zone: "crew", xMin: -10.5, xMax: -3, zMin: -10, zMax: -5,  floorY: FLOOR_Y, ceilingY: 4, walls: ["north", "south", "west"] },
  { id: "med_bay",      zone: "crew", xMin: 3,     xMax: 10.5, zMin: -10, zMax: -5,  floorY: FLOOR_Y, ceilingY: 4, walls: ["north", "south", "east"] },
  // Engine sub-rooms
  { id: "reactor",      zone: "engine", xMin: -4,  xMax: 4,  zMin: 28, zMax: 38, floorY: FLOOR_Y, ceilingY: 5.5, walls: ["north", "south"] },
];

// ─────────────────────── DOOR DATA ───────────────────────
export interface DoorDef {
  id: string;
  /** Centre position */
  x: number; z: number;
  /** Opening width and height */
  width: number;
  height: number;
  /** Rotation around Y (0 = opening faces ±Z) */
  rotY: number;
  /** Initial state */
  open: boolean;
  /** Is it jammed / broken? */
  jammed: boolean;
  /** Requires keycard? */
  locked: boolean;
}

export const DOORS: DoorDef[] = [
  // Corridor → Crew Quarters
  { id: "door_crew",    x: 0,    z: -18, width: 2.6, height: 3.2, rotY: 0, open: false, jammed: false, locked: false },
  // Crew → Cargo Bay
  { id: "door_cargo",   x: 0,    z: -4,  width: 3.0, height: 3.4, rotY: 0, open: false, jammed: false, locked: false },
  // Cargo → Engine
  { id: "door_engine",  x: 0,    z: 22,  width: 2.6, height: 3.2, rotY: 0, open: false, jammed: false, locked: false },
  // Corridor → Bridge
  { id: "door_bridge",  x: 0,    z: -30, width: 2.4, height: 3.0, rotY: 0, open: false, jammed: false, locked: false },
];

// ─────────────────────── BREACH DATA ───────────────────────
export interface BreachDef {
  id: string;
  name: string;
  description: string;
  /** Centre of the breach */
  x: number; y: number; z: number;
  /** Approximate radius of missing panels */
  radius: number;
  /** Side: 'roof', 'port' (left/−x), 'starboard' (+x), 'floor' */
  side: "roof" | "port" | "starboard" | "floor";
}

export const BREACHES: BreachDef[] = [
  // Main roof breach over cargo bay (the big open roof)
  { id: "roof_main",   name: "Main Roof Breach",            description: "Massive hull rupture exposing the cargo bay to space", x: 0, y: HULL_RADIUS, z: 5,   radius: 14, side: "roof" },
  // Port hull breach (walkable exit)
  { id: "port_breach",  name: "Port Hull Breach (Surface Egress)", description: "Shattered composite hull plating opening a walkable path directly onto the alien regolith", x: -HULL_RADIUS, y: 2, z: -6, radius: 5,  side: "port" },
  // Small starboard tear
  { id: "star_tear",    name: "Starboard Micro-Fracture",    description: "Hairline fracture leaking atmosphere", x: HULL_RADIUS, y: 3, z: -20, radius: 2.5, side: "starboard" },
  // Floor breach in engine room
  { id: "floor_eng",    name: "Engine Floor Collapse",       description: "Buckled deck plating from reactor overload", x: 2, y: 0, z: 32, radius: 3,  side: "floor" },
];

// ─────────────────────── PROP / FURNITURE DATA ───────────────────────
export interface PropDef {
  id: string;
  type: "crate" | "console" | "locker" | "seat" | "table" | "debris" | "barrel" | "rack" | "bed" | "generator" | "reactor_core" | "pipe_bundle";
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  rotY: number;
  color: number;
  /** Is it a solid collider? */
  solid: boolean;
  /** Can the player interact? */
  interactable: boolean;
  interactType?: "push" | "open" | "activate" | "collect";
  /** Zone it belongs to */
  zone: string;
}

export const PROPS: PropDef[] = [
  // ── Bridge ──
  { id: "console_main",  type: "console",   x: 0,    y: 0.5,  z: -44,  w: 6,   h: 1.0, d: 1.4,  rotY: 0,    color: 0x2d3540, solid: true, interactable: true, interactType: "activate", zone: "bridge" },
  { id: "console_left",  type: "console",   x: -4.5, y: 0.5,  z: -42,  w: 2.8, h: 0.95, d: 1.1, rotY: 0.35, color: 0x2d3540, solid: true, interactable: true, interactType: "activate", zone: "bridge" },
  { id: "console_right", type: "console",   x: 4.5,  y: 0.5,  z: -42,  w: 2.8, h: 0.95, d: 1.1, rotY: -0.35, color: 0x2d3540, solid: true, interactable: true, interactType: "activate", zone: "bridge" },
  { id: "seat_pilot",    type: "seat",      x: 0,    y: 0.35, z: -40,  w: 1.2, h: 1.5, d: 1.0,  rotY: 0,    color: 0x4a3f3a, solid: true, interactable: false, zone: "bridge" },
  { id: "seat_copilot",  type: "seat",      x: -2.5, y: 0.25, z: -38,  w: 1.0, h: 1.3, d: 1.0,  rotY: 0.5,  color: 0x4a3f3a, solid: true, interactable: false, zone: "bridge" },
  { id: "seat_nav",      type: "seat",      x: 2.5,  y: 0.35, z: -38,  w: 1.0, h: 1.3, d: 1.0,  rotY: -0.15, color: 0x4a3f3a, solid: true, interactable: false, zone: "bridge" },

  // ── Corridor ──
  { id: "locker_c1",     type: "locker",    x: -8,   y: 1.05, z: -28,  w: 0.9, h: 2.1, d: 0.8, rotY: 0,    color: 0x56606c, solid: true, interactable: true, interactType: "open", zone: "corridor1" },
  { id: "locker_c2",     type: "locker",    x: -8,   y: 1.05, z: -26,  w: 0.9, h: 2.1, d: 0.8, rotY: 0,    color: 0x4b5560, solid: true, interactable: true, interactType: "open", zone: "corridor1" },
  { id: "locker_c3",     type: "locker",    x: -8,   y: 1.05, z: -24,  w: 0.9, h: 2.1, d: 0.8, rotY: 0,    color: 0x56606c, solid: true, interactable: true, interactType: "open", zone: "corridor1" },
  { id: "locker_c4",     type: "locker",    x: -8,   y: 1.05, z: -22,  w: 0.9, h: 2.1, d: 0.8, rotY: 0,    color: 0x4b5560, solid: true, interactable: true, interactType: "open", zone: "corridor1" },

  // ── Crew Quarters ──
  { id: "bed_1",         type: "bed",       x: -7,   y: 0.4,  z: -15,  w: 1.8, h: 0.8, d: 2.4, rotY: 0,    color: 0x4a5060, solid: true, interactable: false, zone: "crew" },
  { id: "bed_2",         type: "bed",       x: -7,   y: 0.4,  z: -12.5, w: 1.8, h: 0.8, d: 2.4, rotY: 0,   color: 0x4a5060, solid: true, interactable: false, zone: "crew" },
  { id: "bed_3",         type: "bed",       x: 7,    y: 0.4,  z: -15,  w: 1.8, h: 0.8, d: 2.4, rotY: 0,    color: 0x4a5060, solid: true, interactable: false, zone: "crew" },
  { id: "bed_4",         type: "bed",       x: 7,    y: 0.4,  z: -12.5, w: 1.8, h: 0.8, d: 2.4, rotY: 0,   color: 0x4a5060, solid: true, interactable: false, zone: "crew" },
  { id: "table_mess",    type: "table",     x: -6.5, y: 0.4,  z: -7.5, w: 3.0, h: 0.8, d: 2.0, rotY: 0,    color: 0x5a5a5a, solid: true, interactable: false, zone: "crew" },
  { id: "med_console",   type: "console",   x: 6.5,  y: 0.5,  z: -7.5, w: 2.2, h: 1.0, d: 1.0, rotY: Math.PI, color: 0x2d4540, solid: true, interactable: true, interactType: "activate", zone: "crew" },

  // ── Cargo Bay ──
  { id: "crate_1",       type: "crate",     x: -7,   y: 1.1,  z: 10,   w: 3.0, h: 2.2, d: 4.5, rotY: 0.04, color: 0x8a4b2a, solid: true, interactable: false, zone: "cargo" },
  { id: "crate_2",       type: "crate",     x: -7.5, y: 3.35, z: 10.4, w: 2.6, h: 2.2, d: 4.5, rotY: 0.18, color: 0x2f6a6a, solid: false, interactable: false, zone: "cargo" }, // stacked, leaning
  { id: "crate_3",       type: "crate",     x: 7,    y: 1.1,  z: 8,    w: 2.6, h: 2.2, d: 4.5, rotY: -0.06, color: 0x3c5a7a, solid: true, interactable: false, zone: "cargo" },
  { id: "crate_4",       type: "crate",     x: 6,    y: 0.9,  z: 16,   w: 2.4, h: 1.8, d: 3.6, rotY: 0.45, color: 0x6a6f78, solid: true, interactable: false, zone: "cargo" },
  { id: "barrel_1",      type: "barrel",    x: -3,   y: 0.6,  z: 18,   w: 1.0, h: 1.2, d: 1.0, rotY: 0,    color: 0x7a5a3c, solid: true, interactable: false, zone: "cargo" },
  { id: "barrel_2",      type: "barrel",    x: -4.2, y: 0.6,  z: 17.5, w: 1.0, h: 1.2, d: 1.0, rotY: 0.3,  color: 0x7a5a3c, solid: true, interactable: false, zone: "cargo" },
  { id: "barrel_3",      type: "barrel",    x: -3.5, y: 0.35, z: 19,   w: 1.0, h: 1.2, d: 1.0, rotY: 1.2,  color: 0x6a4a2c, solid: true, interactable: false, zone: "cargo" }, // fallen

  // ── Engine Room ──
  { id: "reactor",       type: "reactor_core", x: 0, y: 2.0, z: 33,   w: 4.0, h: 4.0, d: 4.0, rotY: 0,    color: 0x2a2a3a, solid: true, interactable: true, interactType: "activate", zone: "engine" },
  { id: "gen_left",      type: "generator",  x: -6,  y: 1.0, z: 28,   w: 2.5, h: 2.0, d: 3.0, rotY: 0,    color: 0x3a3a4a, solid: true, interactable: false, zone: "engine" },
  { id: "gen_right",     type: "generator",  x: 6,   y: 1.0, z: 28,   w: 2.5, h: 2.0, d: 3.0, rotY: 0,    color: 0x3a3a4a, solid: true, interactable: false, zone: "engine" },
  { id: "pipe_bundle1",  type: "pipe_bundle", x: -8, y: 3.0, z: 30,   w: 1.0, h: 6.0, d: 12,  rotY: 0,    color: 0x4d6a70, solid: false, interactable: false, zone: "engine" },
  { id: "pipe_bundle2",  type: "pipe_bundle", x: 8,  y: 3.0, z: 30,   w: 1.0, h: 6.0, d: 12,  rotY: 0,    color: 0x4d6a70, solid: false, interactable: false, zone: "engine" },
];

// ─────────────────────── MEZZANINE (cargo bay) ───────────────────────
export interface MezzanineDef {
  /** Platform bounds */
  xMin: number; xMax: number;
  zMin: number; zMax: number;
  /** Platform floor height */
  floorY: number;
  /** Ramp: start Z, end Z, start Y, end Y, x bounds */
  ramp: {
    xMin: number; xMax: number;
    zStart: number; zEnd: number;
    yStart: number; yEnd: number;
  };
  railHeight: number;
}

export const MEZZANINE: MezzanineDef = {
  xMin: -10.2,
  xMax: -5,
  zMin: 0,
  zMax: 20,
  floorY: 3.5,
  ramp: {
    xMin: -10.2,
    xMax: -7,
    zStart: -3,
    zEnd: 0,
    yStart: FLOOR_Y,
    yEnd: 3.5,
  },
  railHeight: 1.1,
};

// ─────────────────────── CABLE ANCHOR POINTS ───────────────────────
export interface CableDef {
  id: string;
  /** Top anchor point (where cable hangs from ceiling/wall) */
  topX: number; topY: number; topZ: number;
  /** Bottom dangling end */
  endX: number; endY: number; endZ: number;
  /** Does this cable spark? */
  sparks: boolean;
  zone: string;
}

export const CABLES: CableDef[] = [
  // ── Cargo bay (Hanging from torn arched ribs & roof breach plates) ──
  { id: "cable_c1",  topX: -3.8, topY: 8.6, topZ: 2,   endX: -3.2, endY: 2.2, endZ: 2.5,  sparks: true,  zone: "cargo" },
  { id: "cable_c2",  topX: 3.8,  topY: 8.6, topZ: 6,   endX: 3.4,  endY: 2.4, endZ: 5.8,  sparks: true,  zone: "cargo" },
  { id: "cable_c3",  topX: -2.2, topY: 9.8, topZ: 10,  endX: -1.6, endY: 3.2, endZ: 9.6,  sparks: false, zone: "cargo" },
  { id: "cable_c4",  topX: 4.8,  topY: 8.2, topZ: 14,  endX: 4.2,  endY: 2.5, endZ: 13.6, sparks: true,  zone: "cargo" },
  { id: "cable_c5",  topX: -5.2, topY: 7.8, topZ: 14,  endX: -4.6, endY: 2.6, endZ: 14.3, sparks: false, zone: "cargo" },
  { id: "cable_c6",  topX: 1.2,  topY: 9.9, topZ: -2,  endX: 0.8,  endY: 2.2, endZ: -1.6, sparks: true,  zone: "cargo" },
  { id: "cable_c7",  topX: -4.5, topY: 8.4, topZ: 18,  endX: -4.0, endY: 2.8, endZ: 17.6, sparks: false, zone: "cargo" },

  // ── Corridor (Hanging from ceiling fixture housings & overhead ribs) ──
  { id: "cable_r1",  topX: -3.8, topY: 6.2, topZ: -26, endX: -3.2, endY: 2.2, endZ: -25.5, sparks: true,  zone: "corridor1" },
  { id: "cable_r2",  topX: 3.8,  topY: 6.2, topZ: -22, endX: 3.3,  endY: 2.4, endZ: -21.6, sparks: false, zone: "corridor1" },

  // ── Crew quarters (Hanging from ceiling light fixture housings & ribs) ──
  { id: "cable_q1",  topX: -3.8, topY: 6.2, topZ: -14, endX: -3.1, endY: 2.1, endZ: -13.5, sparks: true,  zone: "crew" },
  { id: "cable_q2",  topX: 3.8,  topY: 6.2, topZ: -14, endX: 3.2,  endY: 2.2, endZ: -13.6, sparks: true,  zone: "crew" },

  // ── Engine room (Hanging from conduit trays & machinery frames) ──
  { id: "cable_e1",  topX: -3.8, topY: 6.2, topZ: 26,  endX: -3.2, endY: 1.8, endZ: 26.5, sparks: true,  zone: "engine" },
  { id: "cable_e2",  topX: 3.8,  topY: 6.2, topZ: 28,  endX: 3.3,  endY: 1.9, endZ: 28.5, sparks: true,  zone: "engine" },
  { id: "cable_e3",  topX: -5.3, topY: 7.2, topZ: 34,  endX: -4.8, endY: 2.3, endZ: 34.4, sparks: false, zone: "engine" },
  { id: "cable_e4",  topX: 5.3,  topY: 7.2, topZ: 34,  endX: 4.8,  endY: 2.1, endZ: 34.3, sparks: true,  zone: "engine" },

  // ── Bridge (Hanging from ceiling ribs & console conduits) ──
  { id: "cable_b1",  topX: -3.8, topY: 6.2, topZ: -36, endX: -3.2, endY: 2.4, endZ: -35.6, sparks: false, zone: "bridge" },
  { id: "cable_b2",  topX: 3.8,  topY: 6.2, topZ: -32, endX: 3.2,  endY: 2.5, endZ: -31.6, sparks: true,  zone: "bridge" },
];

// ─────────────────────── LIGHT FIXTURE POSITIONS ───────────────────────
export interface LightFixtureDef {
  x: number; y: number; z: number;
  color: number;
  intensity: number;
  radius: number;
  /** flicker = faulty light, alarm = red pulse, steady = normal */
  type: "steady" | "flicker" | "alarm";
  zone: string;
}

export const LIGHT_FIXTURES: LightFixtureDef[] = [
  // Corridor ceiling lights
  ...[-28, -24, -20].flatMap(z => [
    { x: -4, y: 4.3, z, color: 0xfff1d6, intensity: 0.9, radius: 10, type: "steady" as const, zone: "corridor1" },
    { x: 4,  y: 4.3, z, color: 0xfff1d6, intensity: 0.9, radius: 10, type: "steady" as const, zone: "corridor1" },
  ]),
  // Crew quarters
  ...[-16, -12, -8, -6].flatMap(z => [
    { x: -4, y: 4.0, z, color: 0xfff1d6, intensity: 0.75, radius: 8, type: z === -12 ? "flicker" as const : "steady" as const, zone: "crew" },
    { x: 4,  y: 4.0, z, color: 0xfff1d6, intensity: 0.75, radius: 8, type: "steady" as const, zone: "crew" },
  ]),
  // Cargo bay (many broken)
  ...[-2, 4, 10, 16, 20].flatMap(z => [
    { x: -5, y: 8.5, z, color: 0xfff1d6, intensity: 0.6, radius: 12, type: z === 4 || z === 16 ? "flicker" as const : "steady" as const, zone: "cargo" },
    { x: 5,  y: 8.5, z, color: 0xfff1d6, intensity: 0.6, radius: 12, type: z === 10 ? "flicker" as const : "steady" as const, zone: "cargo" },
  ]),
  // Engine room (red alarm lights + work lights)
  ...([24, 28, 32, 36] as number[]).flatMap(z => [
    { x: -5, y: 5.0, z, color: 0xff5533, intensity: 0.7, radius: 8, type: "alarm" as const, zone: "engine" },
    { x: 5,  y: 5.0, z, color: 0xff5533, intensity: 0.7, radius: 8, type: "alarm" as const, zone: "engine" },
  ]),
  // Bridge screens + dome starlight
  { x: 0,    y: 1.8, z: -44, color: 0x44e6ff, intensity: 0.9, radius: 8, type: "steady",  zone: "bridge" },
  { x: -4.5, y: 1.6, z: -42, color: 0x44e6ff, intensity: 0.6, radius: 6, type: "flicker", zone: "bridge" },
  { x: 4.5,  y: 1.6, z: -42, color: 0x44e6ff, intensity: 0.6, radius: 6, type: "steady",  zone: "bridge" },
  { x: 0,    y: 5,   z: -48, color: 0x4466aa, intensity: 0.4, radius: 14, type: "steady", zone: "bridge" },
  // Moonlight through open roof
  { x: 0, y: 14, z: 0,  color: 0x5577cc, intensity: 0.5, radius: 22, type: "steady", zone: "cargo" },
  { x: 0, y: 14, z: 8,  color: 0x5577cc, intensity: 0.4, radius: 22, type: "steady", zone: "cargo" },
  { x: 4, y: 16, z: 4,  color: 0x6688dd, intensity: 0.35, radius: 26, type: "steady", zone: "cargo" },
];

// ─────────────────────── STRUCTURAL ELEMENTS ───────────────────────
/** I-beam ribs around the hull */
export interface RibDef {
  z: number;
  /** Fraction of the semicircle that exists (1.0 = complete, <1 = broken stub) */
  arcFrac: number;
  /** Thickness depth of the I-beam */
  depth: number;
}

export const RIBS: RibDef[] = [];
for (let z = -38; z <= 38; z += 4) {
  const inRoof = z > -12 && z < 20;
  RIBS.push({
    z,
    arcFrac: inRoof ? 0.25 + Math.abs(Math.sin(z * 0.3)) * 0.35 : 1.0,
    depth: z % 8 === 0 ? 0.6 : 0.35,  // major ribs every 8 units
  });
}

// ─────────────────────── SPAWN ───────────────────────
export const PLAYER_SPAWN: [number, number, number] = [0, 1.5, 6];
export const SHIP_POSITION: [number, number, number] = [0, 0, 0];
