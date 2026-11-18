/**
 * neural.test.ts — Section 4 Neural Engine Verification Suite
 * ============================================================
 * Validates:
 * 1. Updates per epoch equals floor(trainSize / batchSize) across multiple settings
 * 2. Standalone naive per-sample reference implementation matches engine weights to < 1e-9 after 50 updates
 * 3. Gradient check: finite difference vs analytical backprop across 20 random networks (< 1e-4 rel error)
 * 4. SPIRAL benchmark across 5 seeds (ReLU, lr 0.01, [6,6,6,6], batch 21, noise 10, 500 points) at epochs 1000, 3000, 8500
 * 5. Default watch-mode configuration (SIGNAL dataset) reaches completion criteria within 300 epochs
 * 6. Long-run stability: No NaN after 10,000 epochs
 * 7. Reference 2-2-1 network verification down to 6 decimals
 * 8. L1 / L2 regularization shrinkage
 * 9. Dataset generators & file export validation
 */

import assert from "node:assert";
import {
  createNetwork,
  forward,
  backward,
  updateWeights,
  trainEpoch,
  evaluateMetrics,
  buildNodeMap,
  generateCircleData,
  generateXorData,
  generateGaussianData,
  generateSpiralData,
  generateSignalData,
  splitDataset,
  exportSignalFiles,
  BINARY_CROSS_ENTROPY,
  SQUARE_LOSS,
  ACTIVATIONS,
  type ActivationType,
  type DataPoint,
} from "./nn/index.ts";

console.log("================================================================================");
console.log("SECTION 4: NEURAL COMPUTATION ENGINE — VERIFICATION SUITE");
console.log("================================================================================");

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 1] UPDATES PER EPOCH EQUALS FLOOR(trainSize / batchSize)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 1] Minibatch Updates Per Epoch == floor(trainSize / batchSize)...");

{
  const testCases = [
    { trainSize: 250, batchSize: 21, expected: 11 },
    { trainSize: 250, batchSize: 10, expected: 25 },
    { trainSize: 200, batchSize: 30, expected: 6 },
    { trainSize: 100, batchSize: 7,  expected: 14 },
    { trainSize: 500, batchSize: 22, expected: 22 },
    { trainSize: 15,  batchSize: 20, expected: 0 },
    { trainSize: 300, batchSize: 1,  expected: 300 },
  ];

  for (const tc of testCases) {
    const data: DataPoint[] = [];
    for (let i = 0; i < tc.trainSize; i++) {
      data.push({ x: i * 0.01, y: -i * 0.01, label: i % 2 === 0 ? 1 : -1 });
    }
    const net = createNetwork(
      { inputFeatures: ["x1", "x2"], hiddenLayers: [2], activation: "tanh", outputActivation: "tanh" },
      42
    );
    const map = buildNodeMap(net);

    const actualUpdates = trainEpoch(net, data, 0.01, tc.batchSize, "none", 0, SQUARE_LOSS, map);
    const formulaUpdates = Math.floor(tc.trainSize / tc.batchSize);

    assert.strictEqual(
      actualUpdates,
      formulaUpdates,
      `Updates mismatch for trainSize=${tc.trainSize}, batchSize=${tc.batchSize}`
    );
    assert.strictEqual(
      actualUpdates,
      tc.expected,
      `Expected ${tc.expected} updates, got ${actualUpdates}`
    );
  }
  console.log("  ✓ Updates per epoch strictly equals floor(trainSize / batchSize) across all settings tested:");
  for (const tc of testCases) {
    console.log(`    • trainSize=${tc.trainSize}, batchSize=${tc.batchSize} => ${tc.expected} updates`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 2] NAIVE PER-SAMPLE REFERENCE IMPLEMENTATION (MATCHES TO < 1e-9 AFTER 50 UPDATES)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 2] Standalone Naive Per-Sample Reference Comparison (50 updates)...");

{
  // Small network: 2 inputs, 1 hidden layer with 2 neurons, 1 output neuron, all tanh activations
  const net = createNetwork(
    { inputFeatures: ["x1", "x2"], hiddenLayers: [2], activation: "tanh", outputActivation: "tanh" },
    42
  );
  const map = buildNodeMap(net);

  // Extract initial weights & biases
  const w00 = net.inputNodes[0].outputLinks[0].weight; // x1 -> h0
  const w01 = net.inputNodes[0].outputLinks[1].weight; // x1 -> h1
  const w10 = net.inputNodes[1].outputLinks[0].weight; // x2 -> h0
  const w11 = net.inputNodes[1].outputLinks[1].weight; // x2 -> h1
  const v0 = net.hiddenLayers[0][0].outputLinks[0].weight; // h0 -> out
  const v1 = net.hiddenLayers[0][1].outputLinks[0].weight; // h1 -> out
  const bh0 = net.hiddenLayers[0][0].bias;
  const bh1 = net.hiddenLayers[0][1].bias;
  const bo = net.outputNode.bias;

  // Separate reference object
  const ref = {
    w00, w10, bh0,
    w01, w11, bh1,
    v0, v1, bo,
  };

  // Fixed sample points
  const points: DataPoint[] = [];
  for (let i = 0; i < 10; i++) {
    points.push({
      x: Math.sin(i + 1),
      y: Math.cos(i + 1),
      label: i % 2 === 0 ? 1 : -1,
    });
  }

  const batchSize = 2;
  const lr = 0.05;
  const totalUpdates = 50;
  const numEpochs = totalUpdates / (points.length / batchSize); // 10 epochs = 50 updates

  function refUpdateBatch(batch: DataPoint[]) {
    let d_v0 = 0, d_v1 = 0, d_bo = 0;
    let d_w00 = 0, d_w10 = 0, d_bh0 = 0;
    let d_w01 = 0, d_w11 = 0, d_bh1 = 0;

    for (const pt of batch) {
      const x1 = pt.x;
      const x2 = pt.y;
      const y = pt.label;

      // Forward
      const zh0 = x1 * ref.w00 + x2 * ref.w10 + ref.bh0;
      const ah0 = Math.tanh(zh0);

      const zh1 = x1 * ref.w01 + x2 * ref.w11 + ref.bh1;
      const ah1 = Math.tanh(zh1);

      const zo = ah0 * ref.v0 + ah1 * ref.v1 + ref.bo;
      const ao = Math.tanh(zo);

      // Backward: Square Loss = 0.5 * (ao - y)^2, dL/dao = ao - y
      const dOut = (ao - y) * (1 - ao * ao);
      d_bo += dOut;
      d_v0 += dOut * ah0;
      d_v1 += dOut * ah1;

      // Hidden node 0
      const dH0 = (dOut * ref.v0) * (1 - ah0 * ah0);
      d_bh0 += dH0;
      d_w00 += dH0 * x1;
      d_w10 += dH0 * x2;

      // Hidden node 1
      const dH1 = (dOut * ref.v1) * (1 - ah1 * ah1);
      d_bh1 += dH1;
      d_w01 += dH1 * x1;
      d_w11 += dH1 * x2;
    }

    const scale = lr / batch.length;
    ref.v0 -= scale * d_v0;
    ref.v1 -= scale * d_v1;
    ref.bo -= scale * d_bo;

    ref.w00 -= scale * d_w00;
    ref.w10 -= scale * d_w10;
    ref.bh0 -= scale * d_bh0;

    ref.w01 -= scale * d_w01;
    ref.w11 -= scale * d_w11;
    ref.bh1 -= scale * d_bh1;
  }

  // Train engine
  for (let ep = 0; ep < numEpochs; ep++) {
    trainEpoch(net, points, lr, batchSize, "none", 0, SQUARE_LOSS, map);
  }

  // Train reference implementation
  for (let ep = 0; ep < numEpochs; ep++) {
    for (let i = 0; i < points.length; i += batchSize) {
      refUpdateBatch(points.slice(i, i + batchSize));
    }
  }

  // Compare every parameter
  const diffs = [
    Math.abs(net.inputNodes[0].outputLinks[0].weight - ref.w00),
    Math.abs(net.inputNodes[1].outputLinks[0].weight - ref.w10),
    Math.abs(net.inputNodes[0].outputLinks[1].weight - ref.w01),
    Math.abs(net.inputNodes[1].outputLinks[1].weight - ref.w11),
    Math.abs(net.hiddenLayers[0][0].outputLinks[0].weight - ref.v0),
    Math.abs(net.hiddenLayers[0][1].outputLinks[0].weight - ref.v1),
    Math.abs(net.hiddenLayers[0][0].bias - ref.bh0),
    Math.abs(net.hiddenLayers[0][1].bias - ref.bh1),
    Math.abs(net.outputNode.bias - ref.bo),
  ];

  const maxDiff = Math.max(...diffs);
  assert.ok(
    maxDiff < 1e-9,
    `Engine weights differed from reference implementation by ${maxDiff} (threshold 1e-9)`
  );
  console.log(`  ✓ Reference matched to 1e-9 (max absolute difference: ${maxDiff.toExponential(4)}).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 3] FINITE DIFFERENCE GRADIENT CHECK (20 RANDOM NETWORKS)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 3] Finite Difference Gradient Check across 20 random networks...");

{
  const activations: ActivationType[] = ["tanh", "relu", "sigmoid", "linear"];
  const eps = 1e-6;
  let maxRelError = 0;

  for (let trial = 0; trial < 20; trial++) {
    const act = activations[trial % activations.length];
    const net = createNetwork(
      {
        inputFeatures: ["x1", "x2"],
        hiddenLayers: [3, 2],
        activation: act,
        outputActivation: act === "linear" ? "linear" : "tanh",
      },
      trial + 100
    );

    const map = buildNodeMap(net);
    const x = [Math.sin(trial * 0.7), Math.cos(trial * 0.9)];
    const y = trial % 2 === 0 ? 1 : -1;

    // 1. Analytical backprop
    forward(net, x, map);
    backward(net, y, SQUARE_LOSS, map);

    // 2. Numerical gradient for links
    for (let l = 0; l < net.allLinks.length; l++) {
      const link = net.allLinks[l];
      const origWeight = link.weight;
      const anaGrad = link.errorDeriv;

      link.weight = origWeight + eps;
      const predPlus = forward(net, x, map);
      const lossPlus = SQUARE_LOSS.loss(predPlus, y);

      link.weight = origWeight - eps;
      const predMinus = forward(net, x, map);
      const lossMinus = SQUARE_LOSS.loss(predMinus, y);

      link.weight = origWeight; // Restore

      const numGrad = (lossPlus - lossMinus) / (2 * eps);
      const diff = Math.abs(numGrad - anaGrad);
      const relError = diff / Math.max(1e-5, Math.abs(numGrad) + Math.abs(anaGrad));

      if (relError > maxRelError) maxRelError = relError;
      assert.ok(
        relError < 1e-4,
        `Gradient check failed on link ${link.id} (act: ${act}): ana=${anaGrad}, num=${numGrad}, relErr=${relError}`
      );
    }

    // Numerical gradient for biases
    for (let n = 0; n < net.allNodes.length; n++) {
      const node = net.allNodes[n];
      if (node.inputLinks.length === 0) continue; // skip input nodes

      const origBias = node.bias;
      const anaGrad = node.biasDeriv;

      node.bias = origBias + eps;
      const predPlus = forward(net, x, map);
      const lossPlus = SQUARE_LOSS.loss(predPlus, y);

      node.bias = origBias - eps;
      const predMinus = forward(net, x, map);
      const lossMinus = SQUARE_LOSS.loss(predMinus, y);

      node.bias = origBias; // Restore

      const numGrad = (lossPlus - lossMinus) / (2 * eps);
      const diff = Math.abs(numGrad - anaGrad);
      const relError = diff / Math.max(1e-5, Math.abs(numGrad) + Math.abs(anaGrad));

      if (relError > maxRelError) maxRelError = relError;
      assert.ok(
        relError < 1e-4,
        `Gradient check failed on bias ${node.id} (act: ${act}): ana=${anaGrad}, num=${numGrad}, relErr=${relError}`
      );
    }
  }

  console.log(`  ✓ 20 networks verified. Maximum relative error: ${maxRelError.toExponential(4)} (< 1e-4).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 4] SPIRAL BENCHMARK ACROSS 5 SEEDS (500 pts, ReLU, lr 0.01, [6,6,6,6], batch 21, noise 10)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 4] SPIRAL Benchmark (ReLU, lr 0.01, [6,6,6,6], batch 21, noise 10, 500 points)...");

interface SpiralSeedResult {
  seed: number;
  loss1000: number;
  acc1000: number;
  loss3000: number;
  acc3000: number;
  loss8500: number;
  acc8500: number;
  passed: boolean;
}

const spiralResults: SpiralSeedResult[] = [];
const seeds = [1, 2, 3, 4, 5];

for (const seed of seeds) {
  const points = generateSpiralData(500, 10, seed);
  const dataset = splitDataset(points, 0.5, seed);

  const net = createNetwork(
    {
      inputFeatures: ["x1", "x2"],
      hiddenLayers: [6, 6, 6, 6],
      activation: "relu",
      outputActivation: "tanh",
      problemType: "classification",
    },
    seed
  );
  const map = buildNodeMap(net);

  let loss1000 = 0, acc1000 = 0;
  let loss3000 = 0, acc3000 = 0;
  let loss8500 = 0, acc8500 = 0;

  for (let ep = 1; ep <= 8500; ep++) {
    trainEpoch(net, dataset.train, 0.01, 21, "none", 0, SQUARE_LOSS, map);

    if (ep === 1000) {
      const m = evaluateMetrics(net, dataset.train, dataset.test, ep);
      loss1000 = m.testLoss;
      acc1000 = m.testAccuracy;
    } else if (ep === 3000) {
      const m = evaluateMetrics(net, dataset.train, dataset.test, ep);
      loss3000 = m.testLoss;
      acc3000 = m.testAccuracy;
    } else if (ep === 8500) {
      const m = evaluateMetrics(net, dataset.train, dataset.test, ep);
      loss8500 = m.testLoss;
      acc8500 = m.testAccuracy;
    }
  }

  spiralResults.push({
    seed,
    loss1000,
    acc1000,
    loss3000,
    acc3000,
    loss8500,
    acc8500,
    passed: acc8500 >= 0.90,
  });
}

// Print Markdown Table
console.log("\n### Spiral Benchmark Results (5 Seeds)");
console.log("| Seed | Epoch 1000 Loss | Epoch 1000 Acc | Epoch 3000 Loss | Epoch 3000 Acc | Epoch 8500 Loss | Epoch 8500 Acc | Target (>=90%) |");
console.log("|:----:|:---------------:|:--------------:|:---------------:|:--------------:|:---------------:|:--------------:|:--------------:|");
for (const r of spiralResults) {
  console.log(
    `| ${r.seed} | ${r.loss1000.toFixed(4)} | ${(r.acc1000 * 100).toFixed(1)}% | ${r.loss3000.toFixed(4)} | ${(r.acc3000 * 100).toFixed(1)}% | ${r.loss8500.toFixed(4)} | ${(r.acc8500 * 100).toFixed(1)}% | ${r.passed ? "PASS" : "FAIL"} |`
  );
}

const passingSeeds = spiralResults.filter((r) => r.passed).length;
console.log(`\nPassing Seeds: ${passingSeeds} / 5 (Target: >= 4 of 5 seeds reach >= 90% at epoch 8500)`);
assert.ok(
  passingSeeds >= 4,
  `Spiral benchmark failed: only ${passingSeeds} / 5 seeds reached 90% accuracy by epoch 8500.`
);
console.log("  ✓ Spiral benchmark target satisfied (at least 4/5 reached >= 90% test accuracy).");

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 5] DEFAULT WATCH-MODE (SIGNAL DATASET) CONVERGENCE WITHIN 300 EPOCHS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 5] Default Watch-Mode (SIGNAL Dataset) Convergence within 300 Epochs...");

{
  const pts = generateSignalData(42, 0); // 400 points (320 natural, 80 machine)
  const dataset = splitDataset(pts, 0.5, 42); // 200 train, 200 test
  const net = createNetwork(
    { inputFeatures: ["x1", "x2"], hiddenLayers: [4, 2], activation: "tanh", outputActivation: "tanh" },
    42
  );
  const map = buildNodeMap(net);

  let completionEpoch = -1;
  let consecutivePassed = 0;

  for (let ep = 1; ep <= 300; ep++) {
    trainEpoch(net, dataset.train, 0.03, 10, "none", 0, SQUARE_LOSS, map);
    const m = evaluateMetrics(net, dataset.train, dataset.test, ep);

    if (m.testAccuracy >= 0.95 && m.testLoss <= 0.12) {
      consecutivePassed++;
      if (consecutivePassed >= 20 && completionEpoch === -1) {
        completionEpoch = ep;
      }
    } else {
      consecutivePassed = 0;
    }
  }

  assert.ok(
    completionEpoch !== -1 && completionEpoch <= 300,
    `Signal dataset did not meet criteria within 300 epochs: achieved at ${completionEpoch}`
  );
  console.log(`  ✓ Criteria met: Test Acc >= 95% & Test Loss <= 0.12 sustained for 20 epochs at epoch ${completionEpoch} (<= 300).`);
}

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 6] LONG-RUN STABILITY: NO NaN AFTER 10,000 EPOCHS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 6] Numerical Stability: No NaN after 10,000 Epochs...");

{
  const pts = generateSignalData(42, 0);
  const dataset = splitDataset(pts, 0.5, 42);
  const net = createNetwork(
    { inputFeatures: ["x1", "x2"], hiddenLayers: [4, 2], activation: "tanh", outputActivation: "tanh" },
    42
  );
  const map = buildNodeMap(net);

  for (let ep = 0; ep < 10000; ep++) {
    trainEpoch(net, dataset.train, 0.03, 10, "none", 0, SQUARE_LOSS, map);
  }

  for (const link of net.allLinks) {
    assert.ok(!isNaN(link.weight) && isFinite(link.weight), `NaN weight in link ${link.id}`);
  }
  for (const node of net.allNodes) {
    assert.ok(!isNaN(node.bias) && isFinite(node.bias), `NaN bias in node ${node.id}`);
  }
  const m = evaluateMetrics(net, dataset.train, dataset.test, 10000);
  assert.ok(!isNaN(m.testLoss) && isFinite(m.testLoss), "NaN test loss after 10,000 epochs");
  assert.ok(!isNaN(m.trainLoss) && isFinite(m.trainLoss), "NaN train loss after 10,000 epochs");
  console.log(`  ✓ 10,000 epochs completed without NaN or Infinity. Final test loss: ${m.testLoss.toFixed(5)}.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 7] REFERENCE 2-2-1 NETWORK (6 DECIMALS EXACT CHECK)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 7] Reference 2-2-1 Network Verification (Sigmoid + Binary Cross-Entropy)...");

{
  const net = createNetwork(
    { inputFeatures: ["x1", "x2"], hiddenLayers: [2], activation: "sigmoid", outputActivation: "sigmoid" },
    1
  );
  const map = buildNodeMap(net);
  net.hiddenLayers[0][0].bias = 0.1;
  net.hiddenLayers[0][1].bias = 0.1;
  net.outputNode.bias = 0.1;

  net.inputNodes[0].outputLinks[0].weight = 0.5; // w11
  net.inputNodes[1].outputLinks[0].weight = 0.3; // w21
  net.inputNodes[0].outputLinks[1].weight = 0.2; // w12
  net.inputNodes[1].outputLinks[1].weight = 0.6; // w22

  net.hiddenLayers[0][0].outputLinks[0].weight = 0.4; // v1
  net.hiddenLayers[0][1].outputLinks[0].weight = 0.7; // v2

  const x = [0.8, 0.4];
  const y = 1;

  const yhat = forward(net, x, map);
  const loss = BINARY_CROSS_ENTROPY.loss(yhat, y);

  const z1 = net.hiddenLayers[0][0].totalInput;
  const z2 = net.hiddenLayers[0][1].totalInput;
  const h1 = net.hiddenLayers[0][0].output;
  const h2 = net.hiddenLayers[0][1].output;
  const zo = net.outputNode.totalInput;

  assert.strictEqual(z1.toFixed(6), "0.620000", "z1 mismatch");
  assert.strictEqual(z2.toFixed(6), "0.500000", "z2 mismatch");
  assert.strictEqual(h1.toFixed(6), "0.650219", "h1 mismatch");
  assert.strictEqual(h2.toFixed(6), "0.622459", "h2 mismatch");
  assert.strictEqual(zo.toFixed(6), "0.795809", "zo mismatch");
  assert.strictEqual(yhat.toFixed(6), "0.689077", "yhat mismatch");
  assert.strictEqual(loss.toFixed(6), "0.372402", "loss mismatch");

  backward(net, y, BINARY_CROSS_ENTROPY, map);

  const outDelta = net.outputNode.inputDeriv;
  const dL_dv1 = net.hiddenLayers[0][0].outputLinks[0].errorDeriv;
  const dL_dv2 = net.hiddenLayers[0][1].outputLinks[0].errorDeriv;
  const dL_dbo = net.outputNode.biasDeriv;

  assert.strictEqual(outDelta.toFixed(6), "-0.310923", "output delta mismatch");
  assert.strictEqual(dL_dv1.toFixed(6), "-0.202168", "dL/dv1 mismatch");
  assert.strictEqual(dL_dv2.toFixed(6), "-0.193537", "dL/dv2 mismatch");
  assert.strictEqual(dL_dbo.toFixed(6), "-0.310923", "dL/dbo mismatch");

  updateWeights(net, 0.1, 1, "none", 0);

  assert.strictEqual(net.hiddenLayers[0][0].outputLinks[0].weight.toFixed(6), "0.420217", "new v1 mismatch");
  assert.strictEqual(net.hiddenLayers[0][1].outputLinks[0].weight.toFixed(6), "0.719354", "new v2 mismatch");
  assert.strictEqual(net.outputNode.bias.toFixed(6), "0.131092", "new bo mismatch");
  assert.strictEqual(net.inputNodes[0].outputLinks[0].weight.toFixed(6), "0.502263", "new w11 mismatch");
  assert.strictEqual(net.inputNodes[1].outputLinks[0].weight.toFixed(6), "0.301131", "new w21 mismatch");
  assert.strictEqual(net.inputNodes[0].outputLinks[1].weight.toFixed(6), "0.204092", "new w12 mismatch");
  assert.strictEqual(net.inputNodes[1].outputLinks[1].weight.toFixed(6), "0.602046", "new w22 mismatch");
  assert.strictEqual(net.hiddenLayers[0][0].bias.toFixed(6), "0.102829", "new b1 mismatch");
  assert.strictEqual(net.hiddenLayers[0][1].bias.toFixed(6), "0.105115", "new b2 mismatch");

  console.log("  ✓ All reference values matched exact 6-decimal specifications.");
}

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 8] REGULARIZATION SHRINKAGE (L1 & L2 VS NONE)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 8] Regularization Weight Shrinkage Verification (L1 & L2 vs None)...");

{
  function trainWithReg(reg: "none" | "l1" | "l2", regRate: number) {
    const pts = generateSignalData(42);
    const dataset = splitDataset(pts, 0.5, 42);
    const net = createNetwork(
      { inputFeatures: ["x1", "x2"], hiddenLayers: [4, 2], activation: "tanh", outputActivation: "tanh" },
      42
    );
    const map = buildNodeMap(net);

    for (let ep = 0; ep < 100; ep++) {
      trainEpoch(net, dataset.train, 0.03, 10, reg, regRate, SQUARE_LOSS, map);
    }

    let weightSum = 0;
    net.allLinks.forEach((l) => (weightSum += Math.abs(l.weight)));
    return weightSum;
  }

  const weightSumNone = trainWithReg("none", 0);
  const weightSumL1 = trainWithReg("l1", 0.005);
  const weightSumL2 = trainWithReg("l2", 0.005);

  assert.ok(
    weightSumL1 < weightSumNone,
    `L1 regularization did not shrink weights: L1=${weightSumL1}, None=${weightSumNone}`
  );
  assert.ok(
    weightSumL2 < weightSumNone,
    `L2 regularization did not shrink weights: L2=${weightSumL2}, None=${weightSumNone}`
  );
  console.log(
    `  ✓ L1 sum=${weightSumL1.toFixed(3)} and L2 sum=${weightSumL2.toFixed(3)} strictly shrink vs None=${weightSumNone.toFixed(3)}.`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// [TEST 9] DATASET GENERATORS & FILE EXPORT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[Test 9] Dataset Generators & Canonical SIGNAL (400 points) File Export...");

{
  const circle = generateCircleData(500, 0, 42);
  const xor = generateXorData(500, 0, 42);
  const gauss = generateGaussianData(500, 0, 42);
  const spiral = generateSpiralData(500, 0, 42);
  const signal = generateSignalData(42, 0);

  assert.strictEqual(circle.length, 500, "Circle default length must be 500");
  assert.strictEqual(xor.length, 500, "XOR default length must be 500");
  assert.strictEqual(gauss.length, 500, "Gaussian default length must be 500");
  assert.strictEqual(spiral.length, 500, "Spiral default length must be 500");
  assert.strictEqual(signal.length, 400, "Signal dataset must have 400 points");

  const naturalCount = signal.filter((p) => p.label === -1).length;
  const machineCount = signal.filter((p) => p.label === 1).length;
  assert.strictEqual(naturalCount, 320, "Signal natural count = 320");
  assert.strictEqual(machineCount, 80, "Signal machine count = 80");

  const exported = exportSignalFiles(signal);
  const inLines = exported.inputFileText.split("\n");
  const outLines = exported.outputFileText.split("\n");
  const distractorLines = exported.distractorFileText.split("\n");

  assert.strictEqual(inLines.length, 400, "INPUT.DAT must have 400 lines");
  assert.strictEqual(outLines.length, 400, "OUTPUT.DAT must have 400 lines");
  assert.strictEqual(distractorLines.length, 10, "SKY_SCANS.DAT must have 10 lines");

  console.log("  ✓ All 5 datasets verified. SIGNAL dataset (400 points: 320 natural, 80 machine) verified.");
}

console.log("\n================================================================================");
console.log("🎉 ALL NEURAL ENGINE VERIFICATION TESTS PASSED (9/9)!");
console.log("================================================================================");
