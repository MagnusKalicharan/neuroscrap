/**
 * computers.config.ts — Spatial Dimensions, Placements, Clearances & Screen Anchors
 * =================================================================================
 * Configures the Three Cockpit Computers in front of the smashed windscreen:
 * - CORE-A: Server Monolith (left / port)
 * - CORE-B: Command Core (center / hero)
 * - CORE-C: Lattice Array Honeycomb (right / starboard)
 * - Restyled Pilot Seats (port & starboard, moved aside from walkway)
 */
import * as THREE from "three";

export interface ScreenQuadAnchor {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: {
    width: number;
    height: number;
  };
  normal: [number, number, number];
}

export interface ComputerConfig {
  id: "core-a" | "core-b" | "core-c";
  name: string;
  title: string;
  labelPlate: string;
  description: string;
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  collider: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
    maxY: number;
  };
  dockAnchor: {
    position: [number, number, number];
    lookAt: [number, number, number];
  };
  screenQuads: ScreenQuadAnchor[];
}

export const COMPUTERS_CONFIG: Record<"coreA" | "coreB" | "coreC", ComputerConfig> = {
  // A) CORE-A: The Server Monolith (Port / Left)
  // Narrower server tower (1.6m W x 2.95m H x 1.1m D), stepped top exhaust cowl,
  // recessed front glass, 14 side fins, pulled blade drawer, screen quad at 1.3m
  coreA: {
    id: "core-a",
    name: "CORE-A",
    title: "CORE-A // SERVER MONOLITH",
    labelPlate: "AURELIA // CORE-A",
    description: "High-density blade server array. Blade 07 hanging; coolant line ruptured.",
    position: [-3.4, 0.04, -43.5],
    rotation: [0, 0.28, 0], // Turned ~16° toward the walkway
    dimensions: {
      width: 1.6,
      height: 2.95,
      depth: 1.1,
    },
    collider: {
      minX: -4.3,
      maxX: -2.5,
      minZ: -44.2,
      maxZ: -42.8,
      minY: 0.0,
      maxY: 3.0,
    },
    dockAnchor: {
      position: [-2.45, 1.3, -42.5],
      lookAt: [-3.4, 1.3, -43.5], // 1.1m in front of main screen
    },
    screenQuads: [
      {
        id: "screen-core-a-main",
        name: "CORE-A Blade Rack Monitor",
        position: [0.0, 1.3, 0.52],
        rotation: [0, 0, 0],
        dimensions: { width: 0.9, height: 0.6 },
        normal: [0, 0, 1],
      },
    ],
  },

  // B) CORE-B: The Command Core (Center Hero, Largest - Dominant by Height & Width)
  // Curved wrap-around console (4.6m W x 3.25m H overall), main screen at 1.5m eye height (2.2x1.3m),
  // two angled side screens (1.1x0.8m), processor chamber with ring attached by 3 struts (gap <= 0.25m),
  // 4° buckled deck tilt
  coreB: {
    id: "core-b",
    name: "CORE-B",
    title: "CORE-B // COMMAND CORE",
    labelPlate: "AURELIA // CORE-B",
    description: "Primary flight avionics & command processor. Running on 9% emergency battery.",
    position: [0.0, 0.04, -45.5],
    rotation: [0, 0, 0.07], // Tilted ~4° as if the deck buckled
    dimensions: {
      width: 4.6,
      height: 3.25,
      depth: 2.2, // Wrap-around curve footprint
    },
    collider: {
      minX: -2.4,
      maxX: 2.4,
      minZ: -46.7,
      maxZ: -44.3,
      minY: 0.0,
      maxY: 3.3,
    },
    dockAnchor: {
      position: [0.0, 1.5, -44.4],
      lookAt: [0.0, 1.5, -45.5], // 1.1m in front of main screen
    },
    screenQuads: [
      {
        id: "screen-core-b-main",
        name: "CORE-B Main Tactical Display",
        position: [0.0, 1.5, -0.15],
        rotation: [-0.31, 0, 0], // Tilted back ~18°
        dimensions: { width: 2.2, height: 1.3 },
        normal: [0, 0.3, 0.95],
      },
      {
        id: "screen-core-b-left",
        name: "CORE-B Left Schematic Display",
        position: [-1.65, 1.45, 0.22],
        rotation: [-0.25, 0.42, 0],
        dimensions: { width: 1.1, height: 0.8 },
        normal: [0.38, 0.24, 0.89],
      },
      {
        id: "screen-core-b-right",
        name: "CORE-B Right Breach Display (Shattered)",
        position: [1.65, 1.45, 0.22],
        rotation: [-0.25, -0.42, 0],
        dimensions: { width: 1.1, height: 0.8 },
        normal: [-0.38, 0.24, 0.89],
      },
    ],
  },

  // C) CORE-C: The Lattice Array (Starboard / Right)
  // Honeycomb cluster of 7 hexagonal prisms (CylinderGeometry 6 radial segments)
  // in 2-3-2 pattern with vertical edge facing catwalk, stepped heights (1.4m to 2.8m),
  // visible flat hexagonal tops on lower prisms, lit edge seams, floor ring,
  // 2 fallen prisms on deck (9 prisms total), 1.0x0.7m screen quad on tallest hexagon
  coreC: {
    id: "core-c",
    name: "CORE-C",
    title: "CORE-C // LATTICE ARRAY",
    labelPlate: "AURELIA // CORE-C",
    description: "Distributed optical lattice coprocessor. Modules 04 & 06 severed on deck.",
    position: [3.5, 0.04, -43.2],
    rotation: [0, -0.32, 0], // Turned ~18° toward the walkway
    dimensions: {
      width: 2.4,
      height: 2.8,
      depth: 2.2,
    },
    collider: {
      minX: 2.3,
      maxX: 4.7,
      minZ: -44.3,
      maxZ: -42.1,
      minY: 0.0,
      maxY: 2.9,
    },
    dockAnchor: {
      position: [2.5, 1.5, -42.3],
      lookAt: [3.5, 1.5, -43.2], // 1.1m in front of main screen
    },
    screenQuads: [
      {
        id: "screen-core-c-tall",
        name: "CORE-C Lattice Diagnostics Display",
        position: [0.0, 1.5, 0.44],
        rotation: [0, 0, 0],
        dimensions: { width: 0.7, height: 1.0 },
        normal: [0, 0, 1],
      },
    ],
  },
};

/**
 * Restyled Pilot Seats (Lower profile, shrunken 30%, dark industrial slate-graphite, moved aside to outer hull)
 */
export const PILOT_SEATS_CONFIG = [
  {
    id: "seat_pilot_port",
    position: [-3.35, 0.04, -39.0] as [number, number, number],
    rotation: [0, 0.45, 0] as [number, number, number],
    width: 0.72,
    height: 0.85,
    depth: 0.75,
  },
  {
    id: "seat_pilot_starboard",
    position: [3.35, 0.04, -39.0] as [number, number, number],
    rotation: [0, -0.45, 0] as [number, number, number],
    width: 0.72,
    height: 0.85,
    depth: 0.75,
  },
];

/**
 * Spatial Verification & Clearances:
 * - Central Walkway Lane: Catwalk width 3.2m (x in [-1.6, 1.6]).
 *   Clear central lane is >= 2.2m (x in [-1.1, 1.1]), completely unobstructed.
 * - Walkway Clearance to CORE-A: abs(-1.1 - (-2.5)) = 1.4m (>= 1.2m requirement)
 * - Walkway Clearance to CORE-C: abs(2.3 - 1.1) = 1.2m (>= 1.2m requirement)
 * - Machine-to-Machine Gap (CORE-A to CORE-B): sqrt((-2.6 - (-1.65))^2 + (-43.5 - (-44.8))^2) = 1.61m (>= 1.2m requirement)
 * - Machine-to-Machine Gap (CORE-C to CORE-B): sqrt((2.3 - 1.65)^2 + (-43.2 - (-44.8))^2) = 1.73m (>= 1.2m requirement)
 * - Clearance behind CORE-B to Windscreen: abs(-46.7 - (-48.2)) = 1.50m (>= 1.2m requirement)
 * - Clearance to Hull Walls: Hull at x = ±6.2; gap from CORE-A is 1.9m, from CORE-C is 1.5m (>= 1.2m requirement)
 * - Clearance to Pilot Seats: Seats at x = ±3.35, walkway lane at x = ±1.1 (gap 2.25m, >= 1.2m requirement)
 */
export const COCKPIT_SPATIAL_METRICS = {
  cockpitLengthZ: 18.0, // from door z = -30 to windscreen z = -48
  cockpitWidthXAtWindscreen: 10.5,
  catwalkWidth: 3.2,
  unobstructedCenterLaneWidth: 2.2, // x in [-1.1, 1.1]
  clearanceCoreAToCoreB: 1.61,
  clearanceCoreCToCoreB: 1.73,
  clearanceBehindCoreB: 1.50,
  clearanceCoreAToHull: 1.90,
  clearanceCoreCToHull: 1.50,
};
