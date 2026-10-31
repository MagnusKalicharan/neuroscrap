/**
 * cableConfig.ts — Cable Configuration Bridge
 * ===========================================
 * Maps cables directly from layout.ts (single source of truth).
 */
import { CABLES, CableDef } from "./layout";

export interface CableBundleConfig {
  id: string;
  anchor: [number, number, number]; // (x, y, z)
  end: [number, number, number];
  length: number;
  thickness: number;
  strandCount: number;
  live: boolean;
  burstMin: number;
  burstMax: number;
  tint: [number, number, number];
  swayPhase: number;
  swayFreq: number;
  smokeEmitter: boolean;
}

export function generateCableConfigs(): CableBundleConfig[] {
  return CABLES.map((c, i) => {
    const length = Math.hypot(c.topX - c.endX, c.topY - c.endY, c.topZ - c.endZ);
    return {
      id: c.id,
      anchor: [c.topX, c.topY, c.topZ],
      end: [c.endX, c.endY, c.endZ],
      length,
      thickness: 0.048,
      strandCount: 2,
      live: c.sparks,
      burstMin: 10.0,
      burstMax: 24.0,
      tint: [0.12, 0.14, 0.16],
      swayPhase: i * 0.7,
      swayFreq: 1.15 + (i % 5) * 0.18,
      smokeEmitter: false,
    };
  });
}

export const CABLE_CONFIGS: CableBundleConfig[] = generateCableConfigs();
