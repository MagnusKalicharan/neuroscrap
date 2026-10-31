/**
 * collision.ts — Physical collision resolution & height following
 * ===============================================================
 * High-performance, allocation-free collision system for the upgraded ship.
 * 
 * Supports:
 *   - Hull perimeter walls with double-shell thickness
 *   - Walkable Surface Exits (Starboard Main Egress Ramp & Port Breach)
 *   - Cockpit dome elliptical barrier
 *   - Stern engine bulkhead
 *   - Mezzanine walkway height & ramp slope following
 *   - Sliding bulkhead doors (passable when open, solid when closed)
 *   - Interior props & furniture AABBs
 */
import * as THREE from "three";
import {
  HULL_RADIUS,
  HULL_HALF_LEN,
  NOSE_LEN,
  FLOOR_Y,
  MEZZANINE,
  SHIP_POSITION,
} from "./layout";

export interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  id?: string;
  isDoor?: boolean;
  isOpen?: boolean;
}

// Wall thickness thresholds
const INNER_WALL_LIMIT = HULL_RADIUS - 0.45; // ~10.55m inside
const OUTER_WALL_LIMIT = HULL_RADIUS + 0.65; // ~11.65m outside

/**
 * Checks if a point falls within either of the walkable planetary surface exits:
 *   1. Starboard Main Cargo Egress Ramp: x >= 6.5, z ∈ [1.5, 14.5]
 *   2. Port Secondary Breach: x <= -6.5, z ∈ [-15.0, -2.0]
 */
export function isHullBreachEgress(localX: number, localZ: number): boolean {
  // Starboard Main Surface Egress Ramp (Cargo Bay +X side)
  if (localX >= 6.5 && localZ >= 1.5 && localZ <= 14.5) {
    return true;
  }
  // Port Secondary Hull Breach (-X side)
  if (localX <= -6.5 && localZ >= -15.0 && localZ <= -2.0) {
    return true;
  }
  return false;
}

/**
 * Backward-compatible alias for port breach check
 */
export function isPortBreach(localX: number, localZ: number): boolean {
  return isHullBreachEgress(localX, localZ);
}

/**
 * Calculates floor walking height inside the ship and on the egress ramps:
 *  - Main deck plating: y = FLOOR_Y (0.02)
 *  - Starboard Egress Ramp: smooth slope from 0.02 down to alien ground level (-0.28)
 *  - Mezzanine platform: y = MEZZANINE.floorY (3.5)
 *  - Mezzanine ramp: smooth slope from FLOOR_Y to 3.5
 */
export function getShipFloorHeight(localX: number, localZ: number, currentY = 1.5): number {
  // 1. Starboard Cargo Bay Surface Egress Ramp (x: 6.5 -> 15.5, z: 2.0 -> 14.0)
  if (localX >= 6.5 && localX <= 15.5 && localZ >= 1.8 && localZ <= 14.2) {
    const t = THREE.MathUtils.clamp((localX - 6.5) / 8.5, 0, 1);
    return THREE.MathUtils.lerp(FLOOR_Y, -0.25, t);
  }

  // 2. Mezzanine Ramp (z from zStart to zEnd, x within ramp bounds)
  const m = MEZZANINE;
  const r = m.ramp;
  if (
    localX >= r.xMin - 0.2 &&
    localX <= r.xMax + 0.2 &&
    localZ >= r.zStart - 0.2 &&
    localZ <= r.zEnd + 0.2
  ) {
    const t = THREE.MathUtils.clamp((localZ - r.zStart) / (r.zEnd - r.zStart), 0, 1);
    return THREE.MathUtils.lerp(r.yStart, r.yEnd, t);
  }

  // 3. Mezzanine Elevated Platform
  if (
    localX >= m.xMin - 0.3 &&
    localX <= m.xMax + 0.3 &&
    localZ >= m.zMin - 0.2 &&
    localZ <= m.zMax + 0.2
  ) {
    if (currentY >= m.floorY - 0.8) {
      return m.floorY;
    }
  }

  // 4. Base deck level
  return FLOOR_Y;
}

/**
 * Returns whether a point is within the ship's overall interior footprint
 */
export function isInsideShipBounds(worldX: number, worldZ: number): boolean {
  const x = worldX - SHIP_POSITION[0];
  const z = worldZ - SHIP_POSITION[2];

  // Main hull tunnel: z ∈ [-40, 40], |x| <= 11.2
  if (z >= -HULL_HALF_LEN && z <= HULL_HALF_LEN + 2) {
    return Math.abs(x) <= HULL_RADIUS + 0.5;
  }

  // Cockpit dome: z ∈ [-54, -40]
  if (z < -HULL_HALF_LEN && z >= -HULL_HALF_LEN - NOSE_LEN) {
    const u = x / HULL_RADIUS;
    const t = (-HULL_HALF_LEN - z) / NOSE_LEN;
    return u * u + t * t <= 1.05;
  }

  return false;
}

/**
 * Main collision resolution function called each frame after player movement.
 * Keeps player inside the hull unless stepping through an egress breach,
 * slides against solid props, bulkheads, and closed doors.
 */
export function resolveShipCollisions(
  pos: THREE.Vector3,
  colliders: Aabb[],
  radius = 0.45
): void {
  const ox = SHIP_POSITION[0];
  const oz = SHIP_POSITION[2];
  let x = pos.x - ox;
  let z = pos.z - oz;
  const playerY = pos.y;

  // 1. MAIN HULL CYLINDER WALLS (z between -HULL_HALF_LEN and +HULL_HALF_LEN)
  if (z > -HULL_HALF_LEN && z < HULL_HALF_LEN) {
    const ax = Math.abs(x);
    const signX = x < 0 ? -1 : 1;

    // Check if player is stepping through any walkable surface exit
    const inBreach = isHullBreachEgress(x, z);

    if (!inBreach) {
      if (ax < HULL_RADIUS) {
        if (ax > INNER_WALL_LIMIT - radius) {
          x = signX * (INNER_WALL_LIMIT - radius);
        }
      } else {
        if (ax < OUTER_WALL_LIMIT + radius) {
          x = signX * (OUTER_WALL_LIMIT + radius);
        }
      }
    }
  }

  // 2. COCKPIT DOME (Ellipse in XZ plane for z <= -HULL_HALF_LEN)
  if (z <= -HULL_HALF_LEN && z >= -HULL_HALF_LEN - NOSE_LEN - 3) {
    const t = (-HULL_HALF_LEN - z) / NOSE_LEN;
    const u = x / HULL_RADIUS;
    const distNorm = Math.sqrt(u * u + t * t) || 1e-6;

    if (distNorm < 1.0) {
      const maxNorm = 0.88;
      if (distNorm > maxNorm) {
        const factor = maxNorm / distNorm;
        x = u * factor * HULL_RADIUS;
        z = -HULL_HALF_LEN - t * factor * NOSE_LEN;
      }
    } else {
      const minNorm = 1.12;
      if (distNorm < minNorm) {
        const factor = minNorm / distNorm;
        x = u * factor * HULL_RADIUS;
        z = -HULL_HALF_LEN - t * factor * NOSE_LEN;
      }
    }
  }

  // 3. MEZZANINE PLATFORM SAFETY RAILING COLLISION
  const onMezzanine =
    x >= MEZZANINE.xMin - 0.2 &&
    x <= MEZZANINE.xMax + 0.2 &&
    z >= MEZZANINE.zMin &&
    z <= MEZZANINE.zMax &&
    playerY >= MEZZANINE.floorY - 0.5;

  if (onMezzanine) {
    if (x > MEZZANINE.xMax - radius) {
      x = MEZZANINE.xMax - radius;
    }
  }

  // 4. AABB COLLIDERS (Props, Crates, Consoles, Bulkheads, Doors)
  for (let i = 0; i < colliders.length; i++) {
    const b = colliders[i];

    // Skip open doors
    if (b.isDoor && b.isOpen) continue;

    // Filter by Y axis if specified
    if (b.minY !== undefined && b.maxY !== undefined) {
      if (playerY < b.minY - 1.2 || playerY > b.maxY + 0.5) {
        continue;
      }
    }

    const minX = b.minX - radius;
    const maxX = b.maxX + radius;
    const minZ = b.minZ - radius;
    const maxZ = b.maxZ + radius;

    if (x > minX && x < maxX && z > minZ && z < maxZ) {
      const dl = x - minX;
      const dr = maxX - x;
      const df = z - minZ;
      const db = maxZ - z;
      const minOverlap = Math.min(dl, dr, df, db);

      if (minOverlap === dl) {
        x = minX;
      } else if (minOverlap === dr) {
        x = maxX;
      } else if (minOverlap === df) {
        z = minZ;
      } else {
        z = maxZ;
      }
    }
  }

  pos.x = x + ox;
  pos.z = z + oz;
}
