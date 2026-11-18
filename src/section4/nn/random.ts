/**
 * random.ts — Seeded PRNG utilities for Section 4 Neural Engine
 * =============================================================
 * Deterministic mulberry32 generator and Box-Muller normal transform.
 * ZERO use of Math.random.
 */

export type PRNG = () => number;

/**
 * Creates a deterministic 32-bit pseudo-random number generator (mulberry32).
 * Returns floats uniformly distributed in [0, 1).
 */
export function createPRNG(seed: number): PRNG {
  let s = Math.floor(seed) >>> 0;
  return function mulberry32(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a uniform float in [min, max).
 */
export function randUniform(prng: PRNG, min: number, max: number): number {
  return min + (max - min) * prng();
}

/**
 * Box-Muller transform for standard normal distribution N(mean, std^2).
 */
export function randNormal(prng: PRNG, mean = 0, std = 1): number {
  let u1 = prng();
  let u2 = prng();
  // Prevent log(0)
  while (u1 <= 1e-15) {
    u1 = prng();
  }
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * std;
}

/**
 * Fisher-Yates array shuffle using the seeded PRNG.
 */
export function shuffleArray<T>(array: T[], prng: PRNG): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}
