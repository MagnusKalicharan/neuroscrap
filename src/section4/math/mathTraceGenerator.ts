/**
 * mathTraceGenerator.ts — Chronological Mathematical Trace Generator
 * ====================================================================
 * Generates the full step-by-step mathematical derivation for:
 * Forward Pass → Loss Calculation → Backpropagation → Gradient Summary →
 * Parameter Updates → Verification Forward Pass.
 *
 * Uses the exact internal values, activation (Tanh), and squared loss
 * from the Section 4 neural engine with KaTeX LaTeX formatting.
 */

import type { Network, Node, Link, DataPoint } from "../nn/types.ts";
import { buildNodeMap, forward, backward, SQUARE_LOSS, computeFeatures } from "../nn/index.ts";
import type { MathStep, GradientSummaryEntry } from "./types.ts";

function fmt(n: number, decimals = 4): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${abs.toFixed(decimals)}`;
}

export function generateMathematicalTrace(
  net: Network,
  sample: DataPoint,
  learningRate = 0.03
): {
  steps: MathStep[];
  gradientSummary: GradientSummaryEntry[];
  beforeAfter: {
    oldPrediction: number;
    newPrediction: number;
    oldLoss: number;
    newLoss: number;
    lossDelta: number;
  };
} {
  const steps: MathStep[] = [];
  const map = buildNodeMap(net);

  // 1. Snapshot original parameters
  const origWeights = new Map<string, number>();
  const origBiases = new Map<string, number>();
  net.allLinks.forEach((l) => origWeights.set(l.id, l.weight));
  net.allNodes.forEach((n) => origBiases.set(n.id, n.bias));

  // 2. Perform original forward pass
  const inputs = computeFeatures(net.config.inputFeatures, sample.x, sample.y);
  const oldPred = forward(net, inputs, map);
  const oldLoss = SQUARE_LOSS.loss(oldPred, sample.label);

  // Save intermediate pre-activations (z) and activations (a)
  const zValues = new Map<string, number>();
  const aValues = new Map<string, number>();
  net.allNodes.forEach((n) => {
    zValues.set(n.id, n.totalInput);
    aValues.set(n.id, n.output);
  });

  // 3. Compute gradients via backward pass
  backward(net, sample.label, SQUARE_LOSS, map);

  // Save error signals (delta) and gradients
  const deltaValues = new Map<string, number>();
  const weightGrads = new Map<string, number>();
  const biasGrads = new Map<string, number>();

  net.allNodes.forEach((n) => {
    deltaValues.set(n.id, n.inputDeriv);
    biasGrads.set(n.id, n.biasDeriv);
  });
  net.allLinks.forEach((l) => {
    weightGrads.set(l.id, l.errorDeriv);
  });

  // 4. Calculate parameter updates
  const newWeights = new Map<string, number>();
  const newBiases = new Map<string, number>();
  const gradientSummary: GradientSummaryEntry[] = [];

  net.allLinks.forEach((l) => {
    const wOld = origWeights.get(l.id)!;
    const grad = weightGrads.get(l.id)!;
    const wNew = wOld - learningRate * grad;
    newWeights.set(l.id, wNew);
    gradientSummary.push({
      parameterId: l.id,
      paramType: "weight",
      oldValue: wOld,
      gradient: grad,
      learningRate,
      updateStep: learningRate * grad,
      newValue: wNew,
    });
  });

  net.allNodes.forEach((n) => {
    if (n.inputLinks.length > 0) {
      const bOld = origBiases.get(n.id)!;
      const bGrad = biasGrads.get(n.id)!;
      const bNew = bOld - learningRate * bGrad;
      newBiases.set(n.id, bNew);
      gradientSummary.push({
        parameterId: `b_${n.id}`,
        paramType: "bias",
        oldValue: bOld,
        gradient: bGrad,
        learningRate,
        updateStep: learningRate * bGrad,
        newValue: bNew,
      });
    }
  });

  // 5. Apply new parameters and calculate new forward pass
  net.allLinks.forEach((l) => (l.weight = newWeights.get(l.id)!));
  net.allNodes.forEach((n) => {
    if (newBiases.has(n.id)) n.bias = newBiases.get(n.id)!;
  });
  const newPred = forward(net, inputs, map);
  const newLoss = SQUARE_LOSS.loss(newPred, sample.label);
  const lossDelta = newLoss - oldLoss;

  // Restore original parameters to preserve network immutability
  net.allLinks.forEach((l) => (l.weight = origWeights.get(l.id)!));
  net.allNodes.forEach((n) => {
    if (origBiases.has(n.id)) n.bias = origBiases.get(n.id)!;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD CHRONOLOGICAL STEPS
  // ─────────────────────────────────────────────────────────────────────────

  // STEP 0: CURRENT TRAINING EXAMPLE
  steps.push({
    id: "step_input_sample",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "input",
    phaseLabel: "PHASE I: FORWARD PROPAGATION",
    title: "Current Training Vector Injection",
    targetType: "input",
    activeNodeIds: net.inputNodes.map((n) => n.id),
    activeLinkIds: [],
    glowColor: "green",
    generalFormulaLatex: "X = [x_1, x_2]^T, \\quad y \\in \\{-1, +1\\}",
    substitutionLatex: `X = [${fmt(sample.x)}, ${fmt(sample.y)}]^T, \\quad y = ${fmt(sample.label, 1)}`,
    intermediateLatex: `x_1 = ${fmt(sample.x)}, \\quad x_2 = ${fmt(sample.y)}`,
    finalCalculationLatex: `a_1^{(0)} = ${fmt(sample.x)}, \\quad a_2^{(0)} = ${fmt(sample.y)}`,
    finalValueLatex: `y_{\\text{expected}} = ${sample.label === 1 ? "+1.0000 \\text{ (MACHINE)}" : "-1.0000 \\text{ (NATURAL)}"}` ,
    explanation:
      "Training observation loaded from sensor space. The input properties x_1 and x_2 enter the input layer neurons.",
    numericValue: sample.x,
  });

  // PHASE I — HIDDEN LAYERS FORWARD PASS
  net.hiddenLayers.forEach((layer, lIdx) => {
    const layerNum = lIdx + 1;

    layer.forEach((node, nIdx) => {
      const neuronName = `h_{${layerNum},${nIdx + 1}}`;
      const z = zValues.get(node.id)!;
      const a = aValues.get(node.id)!;
      const bias = origBiases.get(node.id)!;

      // STEP A: Weighted sum for this neuron
      const inLinks = node.inputLinks;
      const products = inLinks.map((l) => {
        const srcNode = map.get(l.sourceNodeId)!;
        const srcA = aValues.get(srcNode.id)!;
        const w = origWeights.get(l.id)!;
        return {
          linkId: l.id,
          srcId: srcNode.id,
          w,
          a: srcA,
          prod: w * srcA,
        };
      });

      const formulaParts = inLinks.map((_, i) => `w_{${nIdx + 1},${i + 1}}^{(${layerNum})} a_{${i + 1}}^{(${layerNum - 1})}`).join(" + ");
      const subParts = products.map((p) => `(${fmt(p.w)} \\times ${fmt(p.a)})`).join(" + ");
      const interParts = products.map((p) => fmt(p.prod)).join(" + ");

      steps.push({
        id: `step_sum_${node.id}`,
        stepIndex: steps.length,
        totalSteps: 0,
        phase: "forward_sum",
        phaseLabel: `PHASE I: FORWARD PROPAGATION — LAYER ${layerNum}`,
        title: `Layer ${layerNum} Neuron ${nIdx + 1}: Weighted Sum`,
        targetType: "node",
        targetNodeId: node.id,
        activeNodeIds: [node.id, ...inLinks.map((l) => l.sourceNodeId)],
        activeLinkIds: inLinks.map((l) => l.id),
        glowColor: "green",
        generalFormulaLatex: `z_{${nIdx + 1}}^{(${layerNum})} = \\sum_{i} w_{${nIdx + 1},i}^{(${layerNum})} a_i^{(${layerNum - 1})} + b_{${nIdx + 1}}^{(${layerNum})}`,
        substitutionLatex: `z_{${nIdx + 1}}^{(${layerNum})} = ${subParts} + (${fmt(bias)})`,
        intermediateLatex: `\\sum (w \\cdot a) = ${interParts}, \\quad b = ${fmt(bias)}`,
        finalCalculationLatex: `z_{${nIdx + 1}}^{(${layerNum})} = ${interParts} + (${fmt(bias)})`,
        finalValueLatex: `z_{${nIdx + 1}}^{(${layerNum})} = ${fmt(z)}`,
        explanation: `Each incoming connection multiplies the preceding activation by its synaptic weight, then adds bias b_${nIdx + 1}.`,
        numericValue: z,
      });

      // STEP B: Activation function for this neuron
      steps.push({
        id: `step_act_${node.id}`,
        stepIndex: steps.length,
        totalSteps: 0,
        phase: "forward_act",
        phaseLabel: `PHASE I: FORWARD PROPAGATION — LAYER ${layerNum}`,
        title: `Layer ${layerNum} Neuron ${nIdx + 1}: Tanh Activation`,
        targetType: "node",
        targetNodeId: node.id,
        activeNodeIds: [node.id],
        activeLinkIds: [],
        glowColor: "cyan",
        generalFormulaLatex: `a_{${nIdx + 1}}^{(${layerNum})} = \\varphi(z_{${nIdx + 1}}^{(${layerNum})}) = \\tanh(z_{${nIdx + 1}}^{(${layerNum})})`,
        substitutionLatex: `a_{${nIdx + 1}}^{(${layerNum})} = \\tanh(${fmt(z)})`,
        intermediateLatex: `\\tanh(z) = \\frac{e^{${fmt(z)}} - e^{-${fmt(z)}}}{e^{${fmt(z)}} + e^{-${fmt(z)}}}`,
        finalCalculationLatex: `a_{${nIdx + 1}}^{(${layerNum})} = \\tanh(${fmt(z)})`,
        finalValueLatex: `a_{${nIdx + 1}}^{(${layerNum})} = ${fmt(a, 6)}`,
        explanation: `The hyperbolic tangent activation squashes the pre-activation sum into the range (-1.0, +1.0).`,
        numericValue: a,
      });
    });
  });

  // OUTPUT LAYER FORWARD PASS
  const outNode = net.outputNode;
  const outZ = zValues.get(outNode.id)!;
  const outA = aValues.get(outNode.id)!;
  const outBias = origBiases.get(outNode.id)!;

  const outProducts = outNode.inputLinks.map((l, i) => {
    const srcNode = map.get(l.sourceNodeId)!;
    const srcA = aValues.get(srcNode.id)!;
    const w = origWeights.get(l.id)!;
    return {
      linkId: l.id,
      w,
      a: srcA,
      prod: w * srcA,
    };
  });
  const outSubParts = outProducts.map((p) => `(${fmt(p.w)} \\times ${fmt(p.a)})`).join(" + ");
  const outInterParts = outProducts.map((p) => fmt(p.prod)).join(" + ");

  // Output Weighted Sum
  steps.push({
    id: "step_output_sum",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "output_sum",
    phaseLabel: "PHASE I: FORWARD PROPAGATION — OUTPUT LAYER",
    title: "Output Neuron: Weighted Sum",
    targetType: "node",
    targetNodeId: outNode.id,
    activeNodeIds: [outNode.id, ...outNode.inputLinks.map((l) => l.sourceNodeId)],
    activeLinkIds: outNode.inputLinks.map((l) => l.id),
    glowColor: "green",
    generalFormulaLatex: "z_o = \\sum_{j} w_{oj} a_j + b_o",
    substitutionLatex: `z_o = ${outSubParts} + (${fmt(outBias)})`,
    intermediateLatex: `\\sum (w \\cdot a) = ${outInterParts}, \\quad b_o = ${fmt(outBias)}`,
    finalCalculationLatex: `z_o = ${outInterParts} + (${fmt(outBias)})`,
    finalValueLatex: `z_o = ${fmt(outZ)}`,
    explanation: "The output neuron combines all activations from the final hidden layer with output bias b_o.",
    numericValue: outZ,
  });

  // Output Prediction
  steps.push({
    id: "step_output_act",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "output_act",
    phaseLabel: "PHASE I: FORWARD PROPAGATION — PREDICTION",
    title: "Network Prediction: Output Activation",
    targetType: "node",
    targetNodeId: outNode.id,
    activeNodeIds: [outNode.id],
    activeLinkIds: [],
    glowColor: "green",
    generalFormulaLatex: "\\hat{y} = \\varphi_o(z_o) = \\tanh(z_o)",
    substitutionLatex: `\\hat{y} = \\tanh(${fmt(outZ)})`,
    intermediateLatex: `\\hat{y} = \\frac{e^{${fmt(outZ)}} - e^{-${fmt(outZ)}}}{e^{${fmt(outZ)}} + e^{-${fmt(outZ)}}}`,
    finalCalculationLatex: `\\hat{y} = \\tanh(${fmt(outZ)})`,
    finalValueLatex: `\\hat{y} = ${fmt(oldPred, 6)}`,
    explanation: "The final prediction ŷ is computed. Forward propagation is complete.",
    numericValue: oldPred,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE II — LOSS CALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  const errDiff = oldPred - sample.label;
  steps.push({
    id: "step_loss_calc",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "loss",
    phaseLabel: "PHASE II: LOSS CALCULATION",
    title: "Squared Error Loss Function",
    targetType: "loss",
    targetNodeId: outNode.id,
    activeNodeIds: [outNode.id],
    activeLinkIds: [],
    glowColor: "amber",
    generalFormulaLatex: "L = \\frac{1}{2} (\\hat{y} - y)^2, \\quad e = \\hat{y} - y",
    substitutionLatex: `L = \\frac{1}{2} (${fmt(oldPred, 4)} - (${fmt(sample.label, 1)}))^2`,
    intermediateLatex: `e = ${fmt(oldPred)} - (${fmt(sample.label, 1)}) = ${fmt(errDiff, 6)}`,
    finalCalculationLatex: `L = \\frac{1}{2} (${fmt(errDiff, 4)})^2 = \\frac{1}{2} (${fmt(errDiff * errDiff, 6)})`,
    finalValueLatex: `L = ${fmt(oldLoss, 6)}`,
    explanation:
      "The loss measures how far the prediction is from the target. Squared error scales quadratically with error.",
    numericValue: oldLoss,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE III — BACKPROPAGATION (REVERSE ORDER)
  // ─────────────────────────────────────────────────────────────────────────
  const outDelta = deltaValues.get(outNode.id)!;
  const dL_dy = errDiff;
  const dy_dzo = 1 - oldPred * oldPred;

  // STEP 8: OUTPUT DELTA
  steps.push({
    id: "step_output_delta",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "output_delta",
    phaseLabel: "PHASE III: BACKPROPAGATION — OUTPUT ERROR",
    title: "Output Error Signal: Chain Rule",
    targetType: "node",
    targetNodeId: outNode.id,
    activeNodeIds: [outNode.id],
    activeLinkIds: [],
    glowColor: "magenta",
    generalFormulaLatex: "\\delta_o = \\frac{\\partial L}{\\partial z_o} = \\frac{\\partial L}{\\partial \\hat{y}} \\cdot \\frac{\\partial \\hat{y}}{\\partial z_o} = (\\hat{y} - y)(1 - \\hat{y}^2)",
    substitutionLatex: `\\delta_o = (${fmt(oldPred)} - ${fmt(sample.label, 1)})(1 - (${fmt(oldPred)})^2)`,
    intermediateLatex: `\\frac{\\partial L}{\\partial \\hat{y}} = ${fmt(dL_dy)}, \\quad \\varphi'(z_o) = 1 - (${fmt(oldPred)})^2 = ${fmt(dy_dzo)}`,
    finalCalculationLatex: `\\delta_o = ${fmt(dL_dy)} \\times ${fmt(dy_dzo)}`,
    finalValueLatex: `\\delta_o = ${fmt(outDelta, 6)}`,
    explanation:
      "Backpropagation begins by multiplying the prediction error by the local slope of the output activation.",
    numericValue: outDelta,
  });

  // STEP 9: OUTPUT-LAYER WEIGHT & BIAS GRADIENTS
  outNode.inputLinks.forEach((link, idx) => {
    const srcNode = map.get(link.sourceNodeId)!;
    const srcA = aValues.get(srcNode.id)!;
    const grad = weightGrads.get(link.id)!;

    steps.push({
      id: `step_grad_${link.id}`,
      stepIndex: steps.length,
      totalSteps: 0,
      phase: "output_weight_grad",
      phaseLabel: "PHASE III: BACKPROPAGATION — OUTPUT GRADIENTS",
      title: `Synapse Gradient: ${link.sourceNodeId} → Output`,
      targetType: "link",
      targetLinkId: link.id,
      sourceNodeId: link.sourceNodeId,
      activeNodeIds: [link.sourceNodeId, outNode.id],
      activeLinkIds: [link.id],
      glowColor: "magenta",
      generalFormulaLatex: "\\frac{\\partial L}{\\partial w_{oj}} = \\delta_o \\cdot a_j",
      substitutionLatex: `\\frac{\\partial L}{\\partial w_{oj}} = ${fmt(outDelta)} \\times ${fmt(srcA)}`,
      intermediateLatex: `\\delta_o = ${fmt(outDelta)}, \\quad a_j = ${fmt(srcA)}`,
      finalCalculationLatex: `\\frac{\\partial L}{\\partial w_{oj}} = ${fmt(outDelta)} \\times ${fmt(srcA)}`,
      finalValueLatex: `\\frac{\\partial L}{\\partial w_{oj}} = ${fmt(grad, 6)}`,
      explanation:
        "The gradient of each incoming weight is the output error delta multiplied by the activation arriving at the synapse.",
      numericValue: grad,
    });
  });

  // Output Bias Gradient
  const outBiasGrad = biasGrads.get(outNode.id)!;
  steps.push({
    id: "step_grad_bias_output",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "bias_grad",
    phaseLabel: "PHASE III: BACKPROPAGATION — OUTPUT BIAS",
    title: "Output Bias Gradient",
    targetType: "node",
    targetNodeId: outNode.id,
    activeNodeIds: [outNode.id],
    activeLinkIds: [],
    glowColor: "magenta",
    generalFormulaLatex: "\\frac{\\partial L}{\\partial b_o} = \\delta_o",
    substitutionLatex: `\\frac{\\partial L}{\\partial b_o} = ${fmt(outDelta)}`,
    intermediateLatex: `\\delta_o = ${fmt(outDelta)}`,
    finalCalculationLatex: `\\frac{\\partial L}{\\partial b_o} = ${fmt(outDelta)}`,
    finalValueLatex: `\\frac{\\partial L}{\\partial b_o} = ${fmt(outBiasGrad, 6)}`,
    explanation: "Because bias has a constant input multiplier of 1, its gradient is identically equal to delta_o.",
    numericValue: outBiasGrad,
  });

  // STEP 10-12: PROPAGATE ERROR THROUGH HIDDEN LAYERS IN REVERSE
  for (let l = net.hiddenLayers.length - 1; l >= 0; l--) {
    const layer = net.hiddenLayers[l];
    const layerNum = l + 1;

    layer.forEach((node, nIdx) => {
      const delta = deltaValues.get(node.id)!;
      const a = aValues.get(node.id)!;
      const bGrad = biasGrads.get(node.id)!;

      // Downstream contributions
      const outLinks = node.outputLinks;
      const downstreamContributions = outLinks.map((l) => {
        const targetDelta = deltaValues.get(l.targetNodeId)!;
        const w = origWeights.get(l.id)!;
        return {
          targetId: l.targetNodeId,
          w,
          delta: targetDelta,
          prod: w * targetDelta,
        };
      });

      const sumDownstream = downstreamContributions.reduce((acc, c) => acc + c.prod, 0);
      const actSlope = 1 - a * a;

      const subDownstream = downstreamContributions
        .map((c) => `(${fmt(c.w)} \\times ${fmt(c.delta)})`)
        .join(" + ");

      // Hidden Delta calculation
      steps.push({
        id: `step_delta_${node.id}`,
        stepIndex: steps.length,
        totalSteps: 0,
        phase: "hidden_delta",
        phaseLabel: `PHASE III: BACKPROPAGATION — LAYER ${layerNum}`,
        title: `Layer ${layerNum} Neuron ${nIdx + 1}: Error Signal δ`,
        targetType: "node",
        targetNodeId: node.id,
        activeNodeIds: [node.id, ...outLinks.map((l) => l.targetNodeId)],
        activeLinkIds: outLinks.map((l) => l.id),
        glowColor: "magenta",
        generalFormulaLatex: `\\delta_j^{(${layerNum})} = (1 - (a_j^{(${layerNum})})^2) \\sum_{k} w_{kj}^{(${layerNum + 1})} \\delta_k^{(${layerNum + 1})}`,
        substitutionLatex: `\\delta_{${nIdx + 1}} = (1 - (${fmt(a)})^2) [${subDownstream}]`,
        intermediateLatex: `\\varphi'(z) = ${fmt(actSlope)}, \\quad \\sum (w \\cdot \\delta) = ${fmt(sumDownstream)}`,
        finalCalculationLatex: `\\delta_{${nIdx + 1}} = ${fmt(actSlope)} \\times ${fmt(sumDownstream)}`,
        finalValueLatex: `\\delta_{${nIdx + 1}}^{(${layerNum})} = ${fmt(delta, 6)}`,
        explanation:
          "Error flows backwards. The neuron sums the error signals from downstream connections, scaled by the activation derivative.",
        numericValue: delta,
      });

      // Incoming weight gradients for this hidden neuron
      node.inputLinks.forEach((link) => {
        const srcNode = map.get(link.sourceNodeId)!;
        const srcA = aValues.get(srcNode.id)!;
        const grad = weightGrads.get(link.id)!;

        steps.push({
          id: `step_grad_${link.id}`,
          stepIndex: steps.length,
          totalSteps: 0,
          phase: "hidden_weight_grad",
          phaseLabel: `PHASE III: BACKPROPAGATION — LAYER ${layerNum} GRADIENTS`,
          title: `Synapse Gradient: ${link.sourceNodeId} → Layer ${layerNum} N${nIdx + 1}`,
          targetType: "link",
          targetLinkId: link.id,
          sourceNodeId: link.sourceNodeId,
          activeNodeIds: [link.sourceNodeId, node.id],
          activeLinkIds: [link.id],
          glowColor: "magenta",
          generalFormulaLatex: "\\frac{\\partial L}{\\partial w_{ji}} = \\delta_j \\cdot a_i",
          substitutionLatex: `\\frac{\\partial L}{\\partial w_{ji}} = ${fmt(delta)} \\times ${fmt(srcA)}`,
          intermediateLatex: `\\delta_j = ${fmt(delta)}, \\quad a_i = ${fmt(srcA)}`,
          finalCalculationLatex: `\\frac{\\partial L}{\\partial w_{ji}} = ${fmt(delta)} \\times ${fmt(srcA)}`,
          finalValueLatex: `\\frac{\\partial L}{\\partial w_{ji}} = ${fmt(grad, 6)}`,
          explanation: "Gradient calculated from this hidden neuron delta and the incoming activation from preceding layer.",
          numericValue: grad,
        });
      });

      // Bias gradient
      steps.push({
        id: `step_grad_bias_${node.id}`,
        stepIndex: steps.length,
        totalSteps: 0,
        phase: "bias_grad",
        phaseLabel: `PHASE III: BACKPROPAGATION — LAYER ${layerNum} BIAS`,
        title: `Layer ${layerNum} Neuron ${nIdx + 1}: Bias Gradient`,
        targetType: "node",
        targetNodeId: node.id,
        activeNodeIds: [node.id],
        activeLinkIds: [],
        glowColor: "magenta",
        generalFormulaLatex: `\\frac{\\partial L}{\\partial b_{${nIdx + 1}}} = \\delta_{${nIdx + 1}}`,
        substitutionLatex: `\\frac{\\partial L}{\\partial b_{${nIdx + 1}}} = ${fmt(delta)}`,
        intermediateLatex: `\\delta = ${fmt(delta)}`,
        finalCalculationLatex: `\\frac{\\partial L}{\\partial b_{${nIdx + 1}}} = ${fmt(delta)}`,
        finalValueLatex: `\\frac{\\partial L}{\\partial b_{${nIdx + 1}}} = ${fmt(bGrad, 6)}`,
        explanation: "Bias gradient matches the neuron delta.",
        numericValue: bGrad,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE IV — GRADIENT SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  steps.push({
    id: "step_gradient_summary",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "gradient_summary",
    phaseLabel: "PHASE IV: COMPLETE GRADIENT SUMMARY",
    title: "All Parameter Gradients Synthesized",
    targetType: "summary",
    activeNodeIds: net.allNodes.map((n) => n.id),
    activeLinkIds: net.allLinks.map((l) => l.id),
    glowColor: "amber",
    generalFormulaLatex: "\\nabla L = \\left[ \\frac{\\partial L}{\\partial w_{11}}, \\dots, \\frac{\\partial L}{\\partial b_o} \\right]^T",
    substitutionLatex: `\\text{Total Gradients: } ${net.allLinks.length} \\text{ weights} + ${net.allNodes.length - net.inputNodes.length} \\text{ biases}`,
    intermediateLatex: `\\eta = ${learningRate}, \\quad L_{\\text{curr}} = ${fmt(oldLoss)}`,
    finalCalculationLatex: `\\Delta \\mathbf{\\theta} = -\\eta \\nabla L`,
    finalValueLatex: `\\|\\nabla L\\|_2 = ${fmt(Math.sqrt(gradientSummary.reduce((acc, g) => acc + g.gradient * g.gradient, 0)))}`,
    explanation:
      "All parameter gradients are now known. Gradients remain fixed while simultaneous updates are performed.",
    numericValue: gradientSummary.length,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE V — PARAMETER UPDATES (GRADIENT DESCENT)
  // ─────────────────────────────────────────────────────────────────────────
  net.allLinks.forEach((link) => {
    const wOld = origWeights.get(link.id)!;
    const grad = weightGrads.get(link.id)!;
    const wNew = newWeights.get(link.id)!;
    const updateVal = learningRate * grad;

    steps.push({
      id: `step_update_${link.id}`,
      stepIndex: steps.length,
      totalSteps: 0,
      phase: "weight_update",
      phaseLabel: "PHASE V: GRADIENT DESCENT — WEIGHT UPDATE",
      title: `Update Weight: ${link.sourceNodeId} → ${link.targetNodeId}`,
      targetType: "link",
      targetLinkId: link.id,
      sourceNodeId: link.sourceNodeId,
      activeNodeIds: [link.sourceNodeId, link.targetNodeId],
      activeLinkIds: [link.id],
      glowColor: "cyan",
      generalFormulaLatex: "w_{\\text{new}} = w_{\\text{old}} - \\eta \\cdot \\frac{\\partial L}{\\partial w}",
      substitutionLatex: `w_{\\text{new}} = ${fmt(wOld)} - (${learningRate} \\times ${fmt(grad)})`,
      intermediateLatex: `\\eta \\cdot \\frac{\\partial L}{\\partial w} = ${fmt(updateVal, 6)}`,
      finalCalculationLatex: `w_{\\text{new}} = ${fmt(wOld)} - (${fmt(updateVal, 6)})`,
      finalValueLatex: `w_{\\text{new}} = ${fmt(wNew, 6)}`,
      explanation:
        "The weight steps opposite to the gradient slope to minimize loss. Amber = old, Cyan = new.",
      numericValue: wNew,
    });
  });

  // Bias updates
  net.allNodes.forEach((node) => {
    if (node.inputLinks.length > 0) {
      const bOld = origBiases.get(node.id)!;
      const bGrad = biasGrads.get(node.id)!;
      const bNew = newBiases.get(node.id)!;
      const updateVal = learningRate * bGrad;

      steps.push({
        id: `step_update_bias_${node.id}`,
        stepIndex: steps.length,
        totalSteps: 0,
        phase: "bias_update",
        phaseLabel: "PHASE V: GRADIENT DESCENT — BIAS UPDATE",
        title: `Update Bias: ${node.id}`,
        targetType: "node",
        targetNodeId: node.id,
        activeNodeIds: [node.id],
        activeLinkIds: [],
        glowColor: "cyan",
        generalFormulaLatex: "b_{\\text{new}} = b_{\\text{old}} - \\eta \\cdot \\frac{\\partial L}{\\partial b}",
        substitutionLatex: `b_{\\text{new}} = ${fmt(bOld)} - (${learningRate} \\times ${fmt(bGrad)})`,
        intermediateLatex: `\\eta \\cdot \\frac{\\partial L}{\\partial b} = ${fmt(updateVal, 6)}`,
        finalCalculationLatex: `b_{\\text{new}} = ${fmt(bOld)} - (${fmt(updateVal, 6)})`,
        finalValueLatex: `b_{\\text{new}} = ${fmt(bNew, 6)}`,
        explanation: "Bias parameter shifts along the gradient to re-center the activation hyperplane.",
        numericValue: bNew,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE VI — VERIFY LEARNING (BEFORE VS AFTER COMPARISON)
  // ─────────────────────────────────────────────────────────────────────────
  steps.push({
    id: "step_verify_comparison",
    stepIndex: steps.length,
    totalSteps: 0,
    phase: "loss_comparison",
    phaseLabel: "PHASE VI: LEARNING VERIFICATION",
    title: "Forward Propagation Recalculated & Verified",
    targetType: "comparison",
    activeNodeIds: [outNode.id],
    activeLinkIds: [],
    glowColor: lossDelta <= 0 ? "green" : "amber",
    generalFormulaLatex: "\\Delta L = L_{\\text{new}} - L_{\\text{old}}",
    substitutionLatex: `\\Delta L = ${fmt(newLoss, 6)} - ${fmt(oldLoss, 6)}`,
    intermediateLatex: `\\hat{y}_{\\text{old}} = ${fmt(oldPred, 4)} \\rightarrow \\hat{y}_{\\text{new}} = ${fmt(newPred, 4)}`,
    finalCalculationLatex: `L_{\\text{old}} = ${fmt(oldLoss, 6)} \\rightarrow L_{\\text{new}} = ${fmt(newLoss, 6)}`,
    finalValueLatex: `\\Delta L = ${fmt(lossDelta, 6)} \\text{ (${lossDelta <= 0 ? "DECREASED" : "INCREASED"})} ${lossDelta <= 0 ? "\\checkmark" : ""}`,
    explanation:
      "A complete training step has concluded. The network was re-tested with the same vector to verify the loss shift.",
    numericValue: lossDelta,
    comparisonData: {
      oldPrediction: oldPred,
      newPrediction: newPred,
      oldLoss,
      newLoss,
      lossDelta,
    },
  });

  // Set totalSteps on every step
  const totalSteps = steps.length;
  steps.forEach((s) => (s.totalSteps = totalSteps));

  return {
    steps,
    gradientSummary,
    beforeAfter: {
      oldPrediction: oldPred,
      newPrediction: newPred,
      oldLoss,
      newLoss,
      lossDelta,
    },
  };
}
