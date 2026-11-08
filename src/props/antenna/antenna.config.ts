/**
 * antenna.config.ts — Spatial Parameters & Continuous Cable Path
 * ================================================================
 * Configures the real world position, structural heights, and continuous
 * cable curve reaching from the relay line into the comms array.
 */
import * as THREE from "three";

/**
 * World space placement of Antenna Base Mount on cargo bay deck.
 * Positioned at z = +13.6 so it has a clean separation from relay node R6 (z = 11.4),
 * connected via the floor cable line with zero overlap.
 */
export const ANTENNA_WORLD_POS = new THREE.Vector3(2.2, 0.04, 13.6);

/**
 * Structural dimensions of the Comms Array:
 * - Structure height: 11.0m tall (climbs through the roof breach high into space)
 * - Dish diameter: 3.0m across, real parabolic profile
 * - Mast base width: ~0.82m, tapering to ~0.52m at gimbal head
 * - Mast damage tilt: 3 degrees off vertical
 */
export const ANTENNA_CONFIG = {
  mastHeight: 11.0,
  mastBaseWidth: 0.82,
  mastTopWidth: 0.52,
  mastTiltRad: THREE.MathUtils.degToRad(3.0), // 3° bent off vertical
  dishDiameter: 3.0,
  dishDepth: 0.65,
  focalDistance: 1.25,
  secondaryArraySize: 0.58,
};

/**
 * Default sky orientation: points toward the celestial deep-space apex / black hole
 * (matches BLACK_HOLE_WORLD_DIR from Game.tsx: [-0.35, 0.55, -0.75]).
 */
export const DEFAULT_SKY_TARGET = new THREE.Vector3(-0.35, 0.55, -0.75).normalize();

/**
 * Continuous Antenna Cable Path from node R6 at [2.1, 0.04, 11.75]
 * across the deck floor, entering the base gland at [2.05, 0.14, 13.55],
 * and curving up inside the clamped conduit along the mast leg to the azimuth head.
 */
export const ANTENNA_CABLE_PATH: THREE.CatmullRomCurve3 = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(2.10, 0.04, 11.75),       // Pt 0: Relay node R6 exit
    new THREE.Vector3(2.14, 0.04, 12.40),       // Pt 1: Floor deck clamp 1
    new THREE.Vector3(2.17, 0.04, 13.10),       // Pt 2: Floor deck clamp 2
    new THREE.Vector3(2.05, 0.14, 13.55),       // Pt 3: Base gland entry flange
    new THREE.Vector3(1.98, 0.45, 13.52),       // Pt 4: Base conduit collar
    new THREE.Vector3(1.96, 2.50, 13.50),       // Pt 5: Lower mast clamp
    new THREE.Vector3(1.98, 5.50, 13.50),       // Pt 6: Mid-lower mast clamp
    new THREE.Vector3(2.02, 8.50, 13.52),       // Pt 7: Mid-upper mast clamp
    new THREE.Vector3(2.06, 10.60, 13.55),      // Pt 8: Top mast flex loop
    new THREE.Vector3(2.12, 11.15, 13.58),      // Pt 9: Azimuth slip-ring gland
  ],
  false,
  "catmullrom",
  0.15
);
