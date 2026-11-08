/**
 * section2.config.ts — Section 2 Relay Line Spatial Configuration
 * =================================================================
 * Configures the 7-point polyline cable path, 6 relay node positions,
 * visual styles, colliders, and scanner interaction tolerances.
 */
import * as THREE from "three";
import { RELAY_NODES, type RelayNodeId, type RelayNodeDef } from "./nodeData";

export interface RelayPathPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * 7-point polyline along the ship floor:
 * Starts beside the Data Station alcove, passes through the cargo bulkhead
 * doorway, runs along the floor to the starboard side of the central catwalk,
 * and ascends the riser column at z = +11.8 toward the roof breach antenna.
 */
export const RELAY_PATH: [number, number, number][] = [
  [4.6, 0.04, -7.2],  // Pt 0: Beside Data Station
  [2.8, 0.04, -5.5],  // Pt 1: Angling toward doorway
  [1.4, 0.04, -3.8],  // Pt 2: Through cargo bulkhead door opening (x in [-1.7, 1.7])
  [1.8, 0.04, -0.5],  // Pt 3: Cargo bay floor (starboard of catwalk)
  [1.8, 0.04, 3.5],   // Pt 4: Mid cargo bay
  [1.8, 0.04, 7.5],   // Pt 5: Aft cargo bay
  [2.2, 0.04, 13.6],  // Pt 6: Comms array base mount (safely spaced past node R6 at z = 11.4)
];

export const RISER_POSITION: [number, number, number] = [2.2, 0.04, 13.6];
export const RISER_HEIGHT = 10.4; // Climbs through roof breach into open space toward the stars

export interface Section2NodePlacement {
  id: RelayNodeId;
  label: string;
  position: [number, number, number];
  rotationY: number;
  reading: number | null;
  kind: "healthy" | "surge" | "missing";
  scannerText: string;
  collider?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

/**
 * Dimensions of industrial junction box: ~0.9 x 0.7 x 0.9 m
 */
export const NODE_BOX_DIMS = {
  width: 0.9,
  height: 0.7,
  depth: 0.9,
};

/**
 * Node placements spaced ~3.5 to 4.0 units apart along RELAY_PATH.
 * Floor height is y = 0.04 (+0.02 above floor to prevent z-fighting).
 */
export const SECTION2_NODES: Section2NodePlacement[] = [
  {
    ...RELAY_NODES[0], // R1: 118 V, healthy
    position: [3.4, 0.04, -6.1],
    rotationY: 0.45,
    collider: {
      minX: 3.4 - 0.45,
      maxX: 3.4 + 0.45,
      minY: 0.0,
      maxY: 0.75,
      minZ: -6.1 - 0.45,
      maxZ: -6.1 + 0.45,
    },
  },
  {
    ...RELAY_NODES[1], // R2: 121 V, healthy
    position: [1.6, 0.04, -2.5],
    rotationY: 0.12,
    collider: {
      minX: 1.6 - 0.45,
      maxX: 1.6 + 0.45,
      minY: 0.0,
      maxY: 0.75,
      minZ: -2.5 - 0.45,
      maxZ: -2.5 + 0.45,
    },
  },
  {
    ...RELAY_NODES[2], // R3: 99999 V, surge
    position: [1.8, 0.04, 1.2],
    rotationY: 0.0,
    collider: {
      minX: 1.8 - 0.45,
      maxX: 1.8 + 0.45,
      minY: 0.0,
      maxY: 0.75,
      minZ: 1.2 - 0.45,
      maxZ: 1.2 + 0.45,
    },
  },
  {
    ...RELAY_NODES[3], // R4: null, missing component (NO box collider: player can step into gap)
    position: [1.8, 0.04, 4.8],
    rotationY: 0.0,
    collider: undefined, // Empty bracket; walkable
  },
  {
    ...RELAY_NODES[4], // R5: 120 V, healthy
    position: [1.8, 0.04, 8.4],
    rotationY: 0.0,
    collider: {
      minX: 1.8 - 0.45,
      maxX: 1.8 + 0.45,
      minY: 0.0,
      maxY: 0.75,
      minZ: 8.4 - 0.45,
      maxZ: 8.4 + 0.45,
    },
  },
  {
    ...RELAY_NODES[5], // R6: 122 V, healthy
    position: [2.1, 0.04, 11.4],
    rotationY: -0.22,
    collider: {
      minX: 2.1 - 0.45,
      maxX: 2.1 + 0.45,
      minY: 0.0,
      maxY: 0.75,
      minZ: 11.4 - 0.45,
      maxZ: 11.4 + 0.45,
    },
  },
];

/**
 * Scanner tuning constants
 */
export const RELAY_SCANNER_CONFIG = {
  maxDistance: 4.8,       // Max distance to target node
  aimDotThreshold: 0.38,  // Forgiving aim threshold (approx 68 degrees)
  scanDurationSec: 0.32,  // Responsive scan duration
  tagDisplayDurationMs: 4000, // AR floating tag persistence
};
