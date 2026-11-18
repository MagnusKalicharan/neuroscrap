/**
 * network.ts — Core Neural Network Computation Engine
 * ====================================================
 * Pure TypeScript, zero UI dependencies.
 * Implements forward pass, backpropagation, and minibatch gradient descent.
 */

import type {
  Network,
  NetworkConfig,
  Node,
  Link,
  DataPoint,
  Metrics,
  RegularizationType,
  ProblemType,
  ActivationType,
} from "./types.ts";
import { ACTIVATIONS } from "./activations.ts";
import { SQUARE_LOSS, BINARY_CROSS_ENTROPY, type LossFunction } from "./loss.ts";
import { computeFeatures } from "./features.ts";
import { createPRNG, randUniform, type PRNG } from "./random.ts";

let nextLinkId = 1;
let nextNodeId = 1;

export function resetIds(): void {
  nextLinkId = 1;
  nextNodeId = 1;
}

/**
 * Creates a fully initialized feedforward network.
 * Weights initialized uniformly in [-0.5, 0.5] from seeded PRNG.
 * Biases initialized to 0.1.
 */
export function createNetwork(config: NetworkConfig, seed = 42): Network {
  const prng = createPRNG(seed);
  resetIds();

  const problemType: ProblemType = config.problemType || "classification";
  const hiddenActivation: ActivationType = config.activation || "tanh";
  const outputActivation: ActivationType =
    config.outputActivation || (problemType === "classification" ? "tanh" : "linear");

  const inputNodes: Node[] = config.inputFeatures.map((featId, idx) => ({
    id: `input_${featId}_${idx}`,
    layerIdx: 0,
    nodeIdx: idx,
    bias: 0,
    biasDeriv: 0,
    totalInput: 0,
    output: 0,
    outputDeriv: 0,
    inputDeriv: 0,
    inputLinks: [],
    outputLinks: [],
    activation: "linear",
  }));

  const hiddenLayers: Node[][] = [];
  let prevLayerNodes = inputNodes;

  config.hiddenLayers.forEach((neuronCount, layerOffset) => {
    const layerIdx = layerOffset + 1;
    const currentLayerNodes: Node[] = [];

    for (let nodeIdx = 0; nodeIdx < neuronCount; nodeIdx++) {
      const node: Node = {
        id: `node_L${layerIdx}_N${nodeIdx}`,
        layerIdx,
        nodeIdx,
        bias: 0.1,
        biasDeriv: 0,
        totalInput: 0,
        output: 0,
        outputDeriv: 0,
        inputDeriv: 0,
        inputLinks: [],
        outputLinks: [],
        activation: hiddenActivation,
      };

      // Fully connect from prev layer
      prevLayerNodes.forEach((srcNode) => {
        const link: Link = {
          id: `link_${srcNode.id}_${node.id}`,
          sourceNodeId: srcNode.id,
          targetNodeId: node.id,
          sourceLayerIdx: srcNode.layerIdx,
          sourceNodeIdx: srcNode.nodeIdx,
          targetLayerIdx: layerIdx,
          targetNodeIdx: nodeIdx,
          weight: randUniform(prng, -0.5, 0.5),
          errorDeriv: 0,
          accErrorDeriv: 0,
          numDerivs: 0,
        };
        srcNode.outputLinks.push(link);
        node.inputLinks.push(link);
      });

      currentLayerNodes.push(node);
    }

    hiddenLayers.push(currentLayerNodes);
    prevLayerNodes = currentLayerNodes;
  });

  // Output Node (Layer idx = hiddenLayers.length + 1)
  const outputLayerIdx = hiddenLayers.length + 1;
  const outputNode: Node = {
    id: "output_node",
    layerIdx: outputLayerIdx,
    nodeIdx: 0,
    bias: 0.1,
    biasDeriv: 0,
    totalInput: 0,
    output: 0,
    outputDeriv: 0,
    inputDeriv: 0,
    inputLinks: [],
    outputLinks: [],
    activation: outputActivation,
  };

  prevLayerNodes.forEach((srcNode) => {
    const link: Link = {
      id: `link_${srcNode.id}_${outputNode.id}`,
      sourceNodeId: srcNode.id,
      targetNodeId: outputNode.id,
      sourceLayerIdx: srcNode.layerIdx,
      sourceNodeIdx: srcNode.nodeIdx,
      targetLayerIdx: outputLayerIdx,
      targetNodeIdx: 0,
      weight: randUniform(prng, -0.5, 0.5),
      errorDeriv: 0,
      accErrorDeriv: 0,
      numDerivs: 0,
    };
    srcNode.outputLinks.push(link);
    outputNode.inputLinks.push(link);
  });

  const allNodes: Node[] = [
    ...inputNodes,
    ...hiddenLayers.flat(),
    outputNode,
  ];

  const allLinks: Link[] = [];
  allNodes.forEach((n) => {
    n.outputLinks.forEach((l) => allLinks.push(l));
  });

  return {
    config: {
      ...config,
      problemType,
      outputActivation,
    },
    inputNodes,
    hiddenLayers,
    outputNode,
    allNodes,
    allLinks,
  };
}

/**
 * Builds a node lookup map for O(1) source node resolution during forward/backward.
 */
export function buildNodeMap(net: Network): Map<string, Node> {
  const map = new Map<string, Node>();
  net.allNodes.forEach((n) => map.set(n.id, n));
  return map;
}

/**
 * Forward pass: Evaluates the network on inputs.
 * Returns the scalar output value.
 */
export function forward(net: Network, inputValues: number[], nodeMap?: Map<string, Node>): number {
  const map = nodeMap || buildNodeMap(net);

  // Set input nodes
  for (let i = 0; i < net.inputNodes.length; i++) {
    const inNode = net.inputNodes[i];
    inNode.output = inputValues[i] ?? 0;
    inNode.totalInput = inNode.output;
  }

  // Forward hidden layers
  for (let l = 0; l < net.hiddenLayers.length; l++) {
    const layer = net.hiddenLayers[l];
    for (let n = 0; n < layer.length; n++) {
      const node = layer[n];
      let sum = node.bias;
      for (let k = 0; k < node.inputLinks.length; k++) {
        const link = node.inputLinks[k];
        const srcNode = map.get(link.sourceNodeId)!;
        sum += link.weight * srcNode.output;
      }
      node.totalInput = sum;
      node.output = ACTIVATIONS[node.activation].output(sum);
    }
  }

  // Forward output node
  const outNode = net.outputNode;
  let outSum = outNode.bias;
  for (let k = 0; k < outNode.inputLinks.length; k++) {
    const link = outNode.inputLinks[k];
    const srcNode = map.get(link.sourceNodeId)!;
    outSum += link.weight * srcNode.output;
  }
  outNode.totalInput = outSum;
  outNode.output = ACTIVATIONS[outNode.activation].output(outSum);

  return outNode.output;
}

/**
 * Backward pass: Computes and accumulates error derivatives over minibatch.
 * Note: Does NOT modify weights or biases; accumulates in link.errorDeriv and node.biasDeriv.
 */
export function backward(
  net: Network,
  target: number,
  lossFn: LossFunction = SQUARE_LOSS,
  nodeMap?: Map<string, Node>
): void {
  const map = nodeMap || buildNodeMap(net);
  const outNode = net.outputNode;

  // Output error derivative dE/dOutput
  outNode.outputDeriv = lossFn.der(outNode.output, target);

  // Output delta = dE/dz = dE/da * f'(z)
  outNode.inputDeriv =
    outNode.outputDeriv * ACTIVATIONS[outNode.activation].der(outNode.totalInput, outNode.output);

  // Accumulate bias derivative for output node
  outNode.biasDeriv += outNode.inputDeriv;

  // Accumulate weight derivatives for links into output node
  for (let k = 0; k < outNode.inputLinks.length; k++) {
    const link = outNode.inputLinks[k];
    const srcNode = map.get(link.sourceNodeId)!;
    const dW = outNode.inputDeriv * srcNode.output;
    link.errorDeriv += dW;
    link.accErrorDeriv += dW;
    link.numDerivs++;
  }

  // Backprop through hidden layers in reverse order
  for (let l = net.hiddenLayers.length - 1; l >= 0; l--) {
    const layer = net.hiddenLayers[l];
    for (let n = 0; n < layer.length; n++) {
      const node = layer[n];

      // dE/da = sum of delta_j * w_ij over all output links
      let sumDownstream = 0;
      for (let k = 0; k < node.outputLinks.length; k++) {
        const link = node.outputLinks[k];
        const targetNode = map.get(link.targetNodeId)!;
        sumDownstream += targetNode.inputDeriv * link.weight;
      }
      node.outputDeriv = sumDownstream;

      // delta_i = dE/dz = dE/da * f'(z)
      node.inputDeriv =
        node.outputDeriv * ACTIVATIONS[node.activation].der(node.totalInput, node.output);

      // Accumulate bias derivative
      node.biasDeriv += node.inputDeriv;

      // Accumulate weight derivatives for links into this hidden node
      for (let k = 0; k < node.inputLinks.length; k++) {
        const link = node.inputLinks[k];
        const srcNode = map.get(link.sourceNodeId)!;
        const dW = node.inputDeriv * srcNode.output;
        link.errorDeriv += dW;
        link.accErrorDeriv += dW;
        link.numDerivs++;
      }
    }
  }
}

/**
 * Updates weights and biases according to accumulated minibatch derivatives.
 * Implements: w -= (lr / batchSize) * sum(dE/dw) + regularization term
 * L1: lr * lambda * sign(w)
 * L2: lr * lambda * w
 */
export function updateWeights(
  net: Network,
  learningRate: number,
  batchSize: number,
  regularization: RegularizationType = "none",
  regularizationRate = 0
): void {
  const scale = learningRate / Math.max(1, batchSize);

  // Update links
  for (let i = 0; i < net.allLinks.length; i++) {
    const link = net.allLinks[i];
    let regDeriv = 0;
    if (regularization === "l1") {
      regDeriv = regularizationRate * Math.sign(link.weight);
    } else if (regularization === "l2") {
      regDeriv = regularizationRate * link.weight;
    }

    const weightDelta = scale * link.errorDeriv + learningRate * regDeriv;
    link.weight -= weightDelta;

    link.errorDeriv = 0;
    link.accErrorDeriv = 0;
    link.numDerivs = 0;
  }

  // Update biases (biases are not regularized)
  for (let i = 0; i < net.allNodes.length; i++) {
    const node = net.allNodes[i];
    if (node.inputLinks.length > 0) {
      const biasDelta = scale * node.biasDeriv;
      node.bias -= biasDelta;
      node.biasDeriv = 0;
    }
  }
}

/**
 * Performs one full minibatch training iteration.
 */
export function step(
  net: Network,
  batch: DataPoint[],
  learningRate: number,
  regularization: RegularizationType = "none",
  regularizationRate = 0,
  lossFn: LossFunction = SQUARE_LOSS
): void {
  const map = buildNodeMap(net);
  const featureIds = net.config.inputFeatures;

  for (let i = 0; i < batch.length; i++) {
    const pt = batch[i];
    const inputs = computeFeatures(featureIds, pt.x, pt.y);
    forward(net, inputs, map);
    backward(net, pt.label, lossFn, map);
  }

  updateWeights(net, learningRate, batch.length, regularization, regularizationRate);
}

/**
 * Executes one complete training epoch over all points in trainData.
 * For each point, computes features, runs forward pass and backprop.
 * Calls updateWeights exactly every batchSize points.
 * Matches TensorFlow Playground's oneStep loop.
 * Returns the exact count of weight updates performed: Math.floor(trainData.length / batchSize).
 */
export function trainEpoch(
  net: Network,
  trainData: DataPoint[],
  learningRate: number,
  batchSize: number,
  regularization: RegularizationType = "none",
  regularizationRate = 0,
  lossFn: LossFunction = SQUARE_LOSS,
  nodeMap?: Map<string, Node>
): number {
  const map = nodeMap || buildNodeMap(net);
  const featureIds = net.config.inputFeatures;
  let updatesCount = 0;

  for (let i = 0; i < trainData.length; i++) {
    const pt = trainData[i];
    const inputs = computeFeatures(featureIds, pt.x, pt.y);
    forward(net, inputs, map);
    backward(net, pt.label, lossFn, map);

    if ((i + 1) % batchSize === 0) {
      updateWeights(net, learningRate, batchSize, regularization, regularizationRate);
      updatesCount++;
    }
  }

  // Clear any residual accumulators from trailing points (< batchSize)
  for (let i = 0; i < net.allLinks.length; i++) {
    net.allLinks[i].errorDeriv = 0;
    net.allLinks[i].accErrorDeriv = 0;
    net.allLinks[i].numDerivs = 0;
  }
  for (let i = 0; i < net.allNodes.length; i++) {
    net.allNodes[i].biasDeriv = 0;
  }

  return updatesCount;
}

/**
 * Evaluates performance metrics (train loss, test loss, test accuracy).
 */
export function evaluateMetrics(
  net: Network,
  trainData: DataPoint[],
  testData: DataPoint[],
  epoch = 0,
  lossFn: LossFunction = SQUARE_LOSS
): Metrics {
  const map = buildNodeMap(net);
  const featureIds = net.config.inputFeatures;

  // Train loss
  let trainLossSum = 0;
  for (let i = 0; i < trainData.length; i++) {
    const pt = trainData[i];
    const inputs = computeFeatures(featureIds, pt.x, pt.y);
    const pred = forward(net, inputs, map);
    trainLossSum += lossFn.loss(pred, pt.label);
  }
  const trainLoss = trainData.length > 0 ? trainLossSum / trainData.length : 0;

  // Test loss & test accuracy
  let testLossSum = 0;
  let correctCount = 0;
  for (let i = 0; i < testData.length; i++) {
    const pt = testData[i];
    const inputs = computeFeatures(featureIds, pt.x, pt.y);
    const pred = forward(net, inputs, map);
    testLossSum += lossFn.loss(pred, pt.label);

    if (net.config.problemType === "classification") {
      // Classification accuracy: sign(pred) == sign(label)
      const predSign = pred >= 0 ? 1 : -1;
      const targetSign = pt.label >= 0 ? 1 : -1;
      if (predSign === targetSign) {
        correctCount++;
      }
    }
  }
  const testLoss = testData.length > 0 ? testLossSum / testData.length : 0;
  const testAccuracy = testData.length > 0 ? correctCount / testData.length : 0;

  return {
    epoch,
    trainLoss,
    testLoss,
    testAccuracy,
  };
}

/**
 * Generates an output heatmap grid over [-1, 1]^2 at the requested resolution.
 * Reuses a single Float32Array to avoid per-frame allocations.
 */
export function outputGrid(
  net: Network,
  resolution: number,
  buffer?: Float32Array
): Float32Array {
  const map = buildNodeMap(net);
  const featureIds = net.config.inputFeatures;
  const size = resolution * resolution;
  const grid = buffer && buffer.length === size ? buffer : new Float32Array(size);

  const stepSize = 2.0 / (resolution - 1);
  let idx = 0;

  for (let row = 0; row < resolution; row++) {
    // y goes from 1.0 (top) down to -1.0 (bottom)
    const y = 1.0 - row * stepSize;
    for (let col = 0; col < resolution; col++) {
      // x goes from -1.0 (left) to 1.0 (right)
      const x = -1.0 + col * stepSize;
      const inputs = computeFeatures(featureIds, x, y);
      grid[idx++] = forward(net, inputs, map);
    }
  }

  return grid;
}

/**
 * Generates an individual neuron's activation heatmap grid over [-1, 1]^2.
 */
export function neuronGrid(
  net: Network,
  layerIdx: number,
  nodeIdx: number,
  resolution: number,
  buffer?: Float32Array
): Float32Array {
  const map = buildNodeMap(net);
  const featureIds = net.config.inputFeatures;
  const size = resolution * resolution;
  const grid = buffer && buffer.length === size ? buffer : new Float32Array(size);

  let targetNode: Node | null = null;
  if (layerIdx === 0) {
    targetNode = net.inputNodes[nodeIdx] || null;
  } else if (layerIdx <= net.hiddenLayers.length) {
    targetNode = net.hiddenLayers[layerIdx - 1]?.[nodeIdx] || null;
  } else {
    targetNode = net.outputNode;
  }

  if (!targetNode) return grid;

  const stepSize = 2.0 / (resolution - 1);
  let idx = 0;

  for (let row = 0; row < resolution; row++) {
    const y = 1.0 - row * stepSize;
    for (let col = 0; col < resolution; col++) {
      const x = -1.0 + col * stepSize;
      const inputs = computeFeatures(featureIds, x, y);
      forward(net, inputs, map);
      grid[idx++] = targetNode.output;
    }
  }

  return grid;
}

/**
 * Creates a lightweight parameter snapshot of the network for resets/comparisons.
 */
export function snapshot(net: Network): {
  weights: Record<string, number>;
  biases: Record<string, number>;
} {
  const weights: Record<string, number> = {};
  const biases: Record<string, number> = {};

  net.allLinks.forEach((l) => {
    weights[l.id] = l.weight;
  });
  net.allNodes.forEach((n) => {
    biases[n.id] = n.bias;
  });

  return { weights, biases };
}
