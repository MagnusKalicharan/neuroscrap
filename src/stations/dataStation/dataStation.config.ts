/**
 * dataStation.config.ts — Configuration & Spatial Constants for 3D Data Station
 * ==============================================================================
 * Defines the physical dimensions, placement, collision bounding box,
 * and interaction tuning parameters for the 3D wrap-around Data Station console.
 */
import * as THREE from "three";

/**
 * World space placement of Data Station inside the starship.
 * Positioned in the Crew Quarters / forward intake alcove, firmly grounded on the floor (y = 0).
 */
export const DATA_STATION_POS = new THREE.Vector3(6.2, 0.0, -7.5);

/**
 * World space orientation: faces into the room toward -Z (Math.PI).
 */
export const DATA_STATION_ROT = new THREE.Euler(0, Math.PI, 0);

/**
 * Solid Axis-Aligned Bounding Box (AABB) Collider for the physical desk & arch.
 * Blocks the player from walking through the workstation.
 */
export const DATA_STATION_COLLIDER = {
  minX: 4.8,
  maxX: 7.6,
  minY: 0.0,
  maxY: 2.3,
  minZ: -8.5,
  maxZ: -6.5,
};

/**
 * Interactive proximity & aim tuning parameters
 */
export const DATA_STATION_INTERACTION = {
  /** Maximum distance (units) the player can activate the station */
  maxRange: 2.6,
  /** Field-of-view aim cone angle in degrees (30 degrees from direct gaze) */
  aimConeDeg: 30.0,
  /** Dot product threshold corresponding to 30 degrees cone */
  aimDotThreshold: Math.cos(THREE.MathUtils.degToRad(30.0)), // ~0.866
  /** Input debounce time in milliseconds */
  debounceMs: 400,
  /** Docking camera transition duration in milliseconds */
  dockEaseInMs: 450,
  /** Undocking camera restore duration in milliseconds */
  dockEaseOutMs: 350,
  /** Distance in front of center monitor for docked camera */
  dockDistance: 0.92,
  /** Eye elevation of docked camera relative to center monitor */
  dockEyeY: 1.35,
};

/**
 * Prop structural dimensions
 */
export const DATA_STATION_DIMENSIONS = {
  // Center Monitor
  centerWidth: 1.20,
  centerHeight: 0.80,
  centerBezelDepth: 0.12,
  centerElevation: 1.35,

  // Side Monitors (wrap-around wings)
  sideWidth: 0.68,
  sideHeight: 0.52,
  sideBezelDepth: 0.10,
  sideElevation: 1.34,
  sideToeAngleDeg: 25.0, // Ergonomic 25 deg wrap-around angle
  sideOffsetX: 1.00,
  sideOffsetZ: 0.20,

  // Arch & Status Bar
  archHeight: 2.32,
  archWidth: 2.45,
  statusBarWidth: 1.62,
  statusBarHeight: 0.16,
  statusBarDepth: 0.08,

  // Slanted Desk
  deskWidth: 2.44,
  deskDepth: 1.15,
  deskFrontHeight: 0.82,
  deskBackHeight: 0.94,
  deskSlantAngleDeg: 18.0,

  // Pendrive Port on Desktop
  portWidth: 0.09,
  portHeight: 0.03,
  portDepth: 0.06,
};

/**
 * Cubic ease-in-out pure function
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Palette colors (authentic CRT phosphor & industrial starship tones)
 */
export const DATA_STATION_COLORS = {
  // CRT Phosphor
  greenLit: "#22c55e",
  greenDark: "#051508",
  amberLit: "#f59e0b",
  amberDark: "#1a1205",
  redLit: "#ef4444",
  redDark: "#1a0505",
  cyanHeader: "#00ffff",

  // Chassis & Structural Steel
  metalDark: 0x141820,
  metalBezel: 0x1c222c,
  deskTop: 0x0f141a,
  hazardYellow: 0xeab308,
  hazardBlack: 0x18181b,
};
