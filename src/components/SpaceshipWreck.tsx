"use client";
/**
 * SpaceshipWreck.tsx — Root Re-Export Component
 * ==============================================
 * Connects the root component directly to the upgraded ship system
 * under src/components/ship/ while preserving 100% backward compatibility
 * with all existing exports, types, and Props.
 */
import SpaceshipWreckDefault, {
  SpaceshipWreck,
  PLAYER_SPAWN,
  SHIP_POSITION,
  resolveShipCollisions,
  CableSystem,
  BrokenCables,
  SparkSystem,
  getCablePositions,
  type Aabb,
  type ShipModel,
  type SpaceshipWreckProps,
} from "./ship/SpaceshipWreck";

export {
  SpaceshipWreck,
  PLAYER_SPAWN,
  SHIP_POSITION,
  resolveShipCollisions,
  CableSystem,
  BrokenCables,
  SparkSystem,
  getCablePositions,
};

export type { Aabb, ShipModel, SpaceshipWreckProps };

export default SpaceshipWreckDefault;
