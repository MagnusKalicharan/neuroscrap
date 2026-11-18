/**
 * activations.ts — Activation functions and their derivatives
 * ==========================================================
 * Supports ReLU, Tanh, Sigmoid, Linear.
 */

import type { ActivationType } from "./types.ts";

export interface ActivationFunction {
  output: (x: number) => number;
  der: (x: number, outputVal?: number) => number;
}

export const ACTIVATIONS: Record<ActivationType, ActivationFunction> = {
  tanh: {
    output: (x: number) => Math.tanh(x),
    der: (x: number, outputVal?: number) => {
      const o = outputVal !== undefined ? outputVal : Math.tanh(x);
      return 1 - o * o;
    },
  },
  relu: {
    output: (x: number) => Math.max(0, x),
    der: (x: number) => (x > 0 ? 1 : 0),
  },
  sigmoid: {
    output: (x: number) => {
      // Numerical stability clamp
      if (x < -45) return 0;
      if (x > 45) return 1;
      return 1 / (1 + Math.exp(-x));
    },
    der: (x: number, outputVal?: number) => {
      let o = outputVal;
      if (o === undefined) {
        if (x < -45) o = 0;
        else if (x > 45) o = 1;
        else o = 1 / (1 + Math.exp(-x));
      }
      return o * (1 - o);
    },
  },
  linear: {
    output: (x: number) => x,
    der: () => 1,
  },
};
