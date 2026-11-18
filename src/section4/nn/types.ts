/**
 * types.ts — Type definitions for Section 4 Neural Engine
 * ========================================================
 * Pure TypeScript definitions for TensorFlow Playground-style network math.
 */

export type ActivationType = "relu" | "tanh" | "sigmoid" | "linear";
export type RegularizationType = "none" | "l1" | "l2";
export type ProblemType = "classification" | "regression";

export type FeatureId = "x1" | "x2" | "x1_sq" | "x2_sq" | "x1_x2" | "sin_x1" | "sin_x2";

export interface DataPoint {
  x: number; // Domain: [-1, 1]
  y: number; // Domain: [-1, 1]
  label: number; // +1 (machine) or -1 (natural), or continuous value for regression
  rawX?: number; // Original [0, 1] scale (e.g. Brightness)
  rawY?: number; // Original [0, 1] scale (e.g. Steady beat)
  category?: string; // Optional metadata: e.g. "black_hole", "planet", "stars", "beacon"
}

export interface Dataset {
  train: DataPoint[];
  test: DataPoint[];
  all: DataPoint[];
}

export interface Link {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceLayerIdx: number;
  sourceNodeIdx: number;
  targetLayerIdx: number;
  targetNodeIdx: number;
  weight: number;
  errorDeriv: number; // Accumulated dE/dw over minibatch
  accErrorDeriv: number;
  numDerivs: number;
}

export interface Node {
  id: string;
  layerIdx: number;
  nodeIdx: number;
  bias: number;
  biasDeriv: number; // Accumulated dE/db over minibatch
  totalInput: number; // z = sum(w_i * x_i) + b
  output: number; // a = f(z)
  outputDeriv: number; // dE/da
  inputDeriv: number; // delta = dE/dz = dE/da * f'(z)
  inputLinks: Link[];
  outputLinks: Link[];
  activation: ActivationType;
}

export interface NetworkConfig {
  inputFeatures: FeatureId[];
  hiddenLayers: number[]; // e.g. [4, 2] = 2 hidden layers with 4 and 2 neurons
  activation?: ActivationType; // Activation applied to hidden layers (default: 'tanh')
  outputActivation?: ActivationType; // default 'tanh' for classification, 'linear' for regression
  problemType?: ProblemType; // default 'classification'
}

export interface Network {
  config: NetworkConfig;
  inputNodes: Node[];
  hiddenLayers: Node[][];
  outputNode: Node;
  allNodes: Node[];
  allLinks: Link[];
}

export interface Metrics {
  epoch: number;
  trainLoss: number;
  testLoss: number;
  testAccuracy: number; // 0..1 (percentage for classification)
}
