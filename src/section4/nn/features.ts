/**
 * features.ts — Feature transformers for 2D inputs
 * =================================================
 * Maps (x1, x2) in [-1, 1]^2 to selected feature inputs.
 */

import type { FeatureId } from "./types.ts";

export interface FeatureDefinition {
  id: FeatureId;
  label: string;
  mathLabel: string;
  compute: (x1: number, x2: number) => number;
}

export const FEATURES: Record<FeatureId, FeatureDefinition> = {
  x1: {
    id: "x1",
    label: "X1",
    mathLabel: "X₁",
    compute: (x1: number) => x1,
  },
  x2: {
    id: "x2",
    label: "X2",
    mathLabel: "X₂",
    compute: (_x1: number, x2: number) => x2,
  },
  x1_sq: {
    id: "x1_sq",
    label: "X1²",
    mathLabel: "X₁²",
    compute: (x1: number) => x1 * x1,
  },
  x2_sq: {
    id: "x2_sq",
    label: "X2²",
    mathLabel: "X₂²",
    compute: (_x1: number, x2: number) => x2 * x2,
  },
  x1_x2: {
    id: "x1_x2",
    label: "X1X2",
    mathLabel: "X₁X₂",
    compute: (x1: number, x2: number) => x1 * x2,
  },
  sin_x1: {
    id: "sin_x1",
    label: "sin(X1)",
    mathLabel: "sin(πX₁)",
    compute: (x1: number) => Math.sin(Math.PI * x1),
  },
  sin_x2: {
    id: "sin_x2",
    label: "sin(X2)",
    mathLabel: "sin(πX₂)",
    compute: (_x1: number, x2: number) => Math.sin(Math.PI * x2),
  },
};

export const FEATURE_ORDER: FeatureId[] = [
  "x1",
  "x2",
  "x1_sq",
  "x2_sq",
  "x1_x2",
  "sin_x1",
  "sin_x2",
];

export function computeFeatures(featureIds: FeatureId[], x1: number, x2: number): number[] {
  return featureIds.map((id) => FEATURES[id].compute(x1, x2));
}
