/**
 * datasets.ts — Dataset Generators for Section 4 Neural Lab
 * =========================================================
 * Pure TypeScript, deterministic seeded PRNG.
 * Includes circle, xor, gaussian, spiral, and the game's canonical SIGNAL dataset.
 */

import type { DataPoint, Dataset } from "./types.ts";
import { createPRNG, randUniform, randNormal, shuffleArray, type PRNG } from "./random.ts";

/**
 * Normalizes a [0, 1] coordinate to [-1, 1].
 */
export function toEngineDomain(v: number): number {
  return Math.max(-1, Math.min(1, v * 2 - 1));
}

/**
 * Maps an engine [-1, 1] coordinate back to [0, 1].
 */
export function toDisplayDomain(v: number): number {
  return Math.max(0, Math.min(1, (v + 1) / 2));
}

/**
 * Splits points into train and test sets by ratio (e.g. 50% = 0.5).
 */
export function splitDataset(points: DataPoint[], trainRatio = 0.5, seed = 42): Dataset {
  const prng = createPRNG(seed);
  const shuffled = shuffleArray(points, prng);
  const trainCount = Math.round(shuffled.length * trainRatio);

  return {
    train: shuffled.slice(0, trainCount),
    test: shuffled.slice(trainCount),
    all: shuffled,
  };
}

/**
 * 1. CIRCLE DATASET (500 points default)
 */
export function generateCircleData(numSamples = 500, noise = 0, seed = 42): DataPoint[] {
  const prng = createPRNG(seed);
  const points: DataPoint[] = [];
  const radius = 0.5;

  for (let i = 0; i < numSamples / 2; i++) {
    // Positive (inner circle)
    const r = randUniform(prng, 0, radius * 0.8);
    const angle = randUniform(prng, 0, 2 * Math.PI);
    let x = r * Math.sin(angle);
    let y = r * Math.cos(angle);
    const noiseX = randUniform(prng, -radius, radius) * (noise / 100);
    const noiseY = randUniform(prng, -radius, radius) * (noise / 100);
    x += noiseX;
    y += noiseY;
    points.push({ x, y, label: 1 });
  }

  for (let i = 0; i < numSamples / 2; i++) {
    // Negative (outer ring)
    const r = randUniform(prng, radius * 1.15, 0.95);
    const angle = randUniform(prng, 0, 2 * Math.PI);
    let x = r * Math.sin(angle);
    let y = r * Math.cos(angle);
    const noiseX = randUniform(prng, -radius, radius) * (noise / 100);
    const noiseY = randUniform(prng, -radius, radius) * (noise / 100);
    x += noiseX;
    y += noiseY;
    points.push({ x, y, label: -1 });
  }

  return points;
}

/**
 * 2. XOR DATASET (500 points default)
 */
export function generateXorData(numSamples = 500, noise = 0, seed = 42): DataPoint[] {
  const prng = createPRNG(seed);
  const points: DataPoint[] = [];

  for (let i = 0; i < numSamples; i++) {
    let x = randUniform(prng, -1, 1);
    let padding = 0.1;
    x += x > 0 ? padding : -padding;
    let y = randUniform(prng, -1, 1);
    y += y > 0 ? padding : -padding;

    const noiseX = randUniform(prng, -1, 1) * (noise / 100);
    const noiseY = randUniform(prng, -1, 1) * (noise / 100);
    x += noiseX;
    y += noiseY;

    const label = x * y > 0 ? 1 : -1;
    points.push({ x, y, label });
  }

  return points;
}

/**
 * 3. GAUSSIAN DATASET (500 points default)
 */
export function generateGaussianData(numSamples = 500, noise = 0, seed = 42): DataPoint[] {
  const prng = createPRNG(seed);
  const points: DataPoint[] = [];

  for (let i = 0; i < numSamples / 2; i++) {
    let x = randNormal(prng, -0.5, 0.25);
    let y = randNormal(prng, -0.5, 0.25);
    x += randUniform(prng, -1, 1) * (noise / 100);
    y += randUniform(prng, -1, 1) * (noise / 100);
    points.push({ x, y, label: 1 });
  }

  for (let i = 0; i < numSamples / 2; i++) {
    let x = randNormal(prng, 0.5, 0.25);
    let y = randNormal(prng, 0.5, 0.25);
    x += randUniform(prng, -1, 1) * (noise / 100);
    y += randUniform(prng, -1, 1) * (noise / 100);
    points.push({ x, y, label: -1 });
  }

  return points;
}

/**
 * 4. SPIRAL DATASET (500 points default)
 */
export function generateSpiralData(numSamples = 500, noise = 0, seed = 42): DataPoint[] {
  const prng = createPRNG(seed);
  const points: DataPoint[] = [];
  const n = numSamples / 2;

  // Positive spiral
  for (let i = 0; i < n; i++) {
    const r = (i / n) * 0.9;
    const t = 1.75 * i / n * 2 * Math.PI;
    let x = r * Math.sin(t) + randUniform(prng, -1, 1) * (noise / 100) * 0.2;
    let y = r * Math.cos(t) + randUniform(prng, -1, 1) * (noise / 100) * 0.2;
    points.push({ x, y, label: 1 });
  }

  // Negative spiral
  for (let i = 0; i < n; i++) {
    const r = (i / n) * 0.9;
    const t = 1.75 * i / n * 2 * Math.PI + Math.PI;
    let x = r * Math.sin(t) + randUniform(prng, -1, 1) * (noise / 100) * 0.2;
    let y = r * Math.cos(t) + randUniform(prng, -1, 1) * (noise / 100) * 0.2;
    points.push({ x, y, label: -1 });
  }

  return points;
}

/**
 * 5. CANONICAL SIGNAL DATASET (400 points: 320 natural, 80 machine)
 * ================================================================
 * Inputs: Brightness (X1), Steady beat (X2) in [0, 1]^2, mapped to [-1, 1]^2.
 * Output labels:
 *   NATURAL (label -1, 320 points: 5 clusters of 64):
 *     - Flashing debris near (0.08, 0.88) [64 points]
 *     - Pulsar near (0.70, 0.88) [64 points]
 *     - Black Hole near (0.78, 0.15) [64 points]
 *     - Star cluster near (0.40, 0.12) [64 points]
 *     - Dark rock look-alike near (0.10, 0.12) [64 points]
 *   MACHINE (label +1, 80 points: 1 cluster of 80):
 *     - Rescue beacon near (0.30, 0.88) [80 points]
 */
export function generateSignalData(seed = 42, noise = 0): DataPoint[] {
  const prng = createPRNG(seed);
  const points: DataPoint[] = [];

  const noiseScale = (noise / 100) * 0.1;

  function sampleCluster(
    centerX: number,
    centerY: number,
    stdX: number,
    stdY: number,
    count: number,
    label: number,
    category: string
  ) {
    for (let i = 0; i < count; i++) {
      let rawX = randNormal(prng, centerX, stdX);
      let rawY = randNormal(prng, centerY, stdY);

      if (noiseScale > 0) {
        rawX += randUniform(prng, -noiseScale, noiseScale);
        rawY += randUniform(prng, -noiseScale, noiseScale);
      }

      // Clamp strictly within [0.01, 0.99]
      rawX = Math.max(0.01, Math.min(0.99, rawX));
      rawY = Math.max(0.01, Math.min(0.99, rawY));

      const x = toEngineDomain(rawX);
      const y = toEngineDomain(rawY);

      points.push({
        x,
        y,
        label,
        rawX: Number(rawX.toFixed(4)),
        rawY: Number(rawY.toFixed(4)),
        category,
      });
    }
  }

  // 1. Natural: Debris / Flare (faint brightness, high steady beat) -> 64 pts
  sampleCluster(0.08, 0.88, 0.025, 0.025, 64, -1, "flashing_debris");

  // 2. Natural: Pulsar look-alike (high brightness, high steady beat) -> 64 pts
  sampleCluster(0.70, 0.88, 0.04, 0.03, 64, -1, "pulsar");

  // 3. Natural: Black Hole (high brightness, low steady beat) -> 64 pts
  sampleCluster(0.78, 0.15, 0.05, 0.04, 64, -1, "black_hole");

  // 4. Natural: Star cluster (moderate brightness, low beat) -> 64 pts
  sampleCluster(0.40, 0.12, 0.05, 0.03, 64, -1, "stars");

  // 5. Natural: Dark rock look-alike (faint, low beat) -> 64 pts
  sampleCluster(0.10, 0.12, 0.03, 0.03, 64, -1, "dark_rock");

  // 6. MACHINE: Rescue Beacon (nestled horizontally between flare & pulsar) -> 80 pts
  sampleCluster(0.30, 0.88, 0.03, 0.025, 80, 1, "beacon");

  return points;
}

/**
 * Formats the SIGNAL dataset into INPUT.DAT (400 rows x 2 columns) and OUTPUT.DAT (400 labels).
 */
export function exportSignalFiles(points: DataPoint[]): {
  inputFileText: string;
  outputFileText: string;
  distractorFileText: string;
} {
  // INPUT.DAT: 400 rows x 2 columns (Brightness, Steady beat)
  const inputRows = points.map((p) => `${p.rawX!.toFixed(4)} ${p.rawY!.toFixed(4)}`);
  const inputFileText = inputRows.join("\n");

  // OUTPUT.DAT: 400 labels (NATURAL or MACHINE)
  const outputRows = points.map((p) => (p.label === 1 ? "MACHINE" : "NATURAL"));
  const outputFileText = outputRows.join("\n");

  // SKY_SCANS.DAT: Distractor file (10 rows x 3 columns)
  const distractorRows = [
    "0.820 0.110 0.450",
    "0.790 0.090 0.420",
    "0.390 0.050 0.610",
    "0.370 0.060 0.580",
    "0.630 0.190 0.510",
    "0.610 0.210 0.490",
    "0.560 0.940 0.530",
    "0.540 0.960 0.520",
    "0.070 0.080 0.290",
    "0.120 0.950 0.500",
  ];
  const distractorFileText = distractorRows.join("\n");

  return {
    inputFileText,
    outputFileText,
    distractorFileText,
  };
}
