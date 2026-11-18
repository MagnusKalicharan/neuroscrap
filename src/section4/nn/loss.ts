/**
 * loss.ts — Loss functions and their derivatives
 * ==============================================
 * Square Loss for classification (Playground standard) & regression.
 * Binary Cross-Entropy (used for reference test verification).
 */

export interface LossFunction {
  loss: (output: number, target: number) => number;
  der: (output: number, target: number) => number; // dE/dOutput
}

export const SQUARE_LOSS: LossFunction = {
  loss: (output: number, target: number) => 0.5 * Math.pow(output - target, 2),
  der: (output: number, target: number) => output - target,
};

export const BINARY_CROSS_ENTROPY: LossFunction = {
  loss: (output: number, target: number) => {
    const eps = 1e-15;
    const o = Math.max(eps, Math.min(1 - eps, output));
    return -(target * Math.log(o) + (1 - target) * Math.log(1 - o));
  },
  der: (output: number, target: number) => {
    const eps = 1e-15;
    const o = Math.max(eps, Math.min(1 - eps, output));
    return (o - target) / (o * (1 - o));
  },
};
