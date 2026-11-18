/**
 * packetSimulation.ts — Cisco Packet Tracer Simulation Engine for Neural Network
 * ==============================================================================
 * Controls physical value transit along synaptic curves, neuron accumulation,
 * strict layer-by-layer backward propagation, real-time weight & bias changes,
 * and variable assignment.
 */

import type { Network, Link, Node, DataPoint } from "../nn/types";
import { buildNodeMap, forward, backward, SQUARE_LOSS, computeFeatures } from "../nn/index";

export type PacketType = "forward_data" | "backward_error" | "weight_update" | "loss";

export interface TravelingPacket {
  id: string;
  linkId: string;
  sourceNodeId: string;
  targetNodeId: string;
  direction: "forward" | "backward";
  type: PacketType;
  /** Variable name: e.g. "w₁₁·x₁" or "∂L/∂w" */
  variableName: string;
  /** Value being carried */
  value: number;
  /** Short label displayed on the compact pill badge */
  badgeText: string;
  /** Detailed calculation string (e.g. "w=-0.10 × x=-0.88 = +0.088") */
  detailFormula: string;
  /** Old and new weights for live real-time weight update display */
  wOld?: number;
  wNew?: number;
  updateText?: string;
  color: "green" | "magenta" | "amber" | "cyan";
  /** Progress along the wire 0.0 (source) to 1.0 (target) */
  progress: number;
  /** Horizontal stagger offset to prevent crossing links from colliding */
  staggerOffset: number;
}

export interface SimulationEvent {
  id: string;
  stageIndex: number;
  timeLabel: string;
  title: string;
  description: string;
  phase: "forward" | "loss" | "backward" | "update" | "verify";
  activeLayer: number;
  activeNodeIds: string[];
  activeLinkIds: string[];
  summary?: {
    label: string;
    value: string;
  };
}

export interface SimulationFrame {
  stageIndex: number;
  totalStages: number;
  event: SimulationEvent;
  packets: TravelingPacket[];
  activeNodeIds: string[];
  activeLinkIds: string[];
  /** Snapshot of weights at this stage for live real-time morphing */
  liveWeights: Map<string, number>;
  /** Snapshot of biases at this stage */
  liveBiases: Map<string, number>;
  /** Active neuron accumulation data if an arrival stage */
  neuronAccumulations?: Map<
    string,
    {
      variableName: string;
      inputs: Array<{ sourceId: string; sourceVar: string; weight: number; activation: number; product: number }>;
      bias: number;
      z: number;
      a: number;
    }
  >;
  /** Active neuron delta signals if a backward arrival stage */
  neuronDeltas?: Map<
    string,
    {
      variableName: string;
      delta: number;
    }
  >;
  /** Loss metrics if at or after loss stage */
  lossData?: {
    prediction: number;
    target: number;
    loss: number;
    lossReduction?: number;
  };
}

function fmt(n: number, d = 3): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${abs.toFixed(d)}`;
}

/**
 * Returns human-readable variable labels:
 * Input node 0 -> "x₁", Hidden L1 node 0 -> "h₁⁽¹⁾", Output -> "ŷ"
 */
export function getNodeVariable(nodeId: string, net: Network): string {
  const inIdx = net.inputNodes.findIndex((n) => n.id === nodeId);
  if (inIdx >= 0) {
    const subs = ["₁", "₂", "₃", "₄"];
    return `x${subs[inIdx] || inIdx + 1}`;
  }

  if (nodeId === net.outputNode.id) return "ŷ";

  for (let l = 0; l < net.hiddenLayers.length; l++) {
    const idx = net.hiddenLayers[l].findIndex((n) => n.id === nodeId);
    if (idx >= 0) {
      const subs = ["₁", "₂", "₃", "₄", "₅", "₆"];
      const supers = ["¹", "²", "³", "⁴"];
      const sub = subs[idx] || String(idx + 1);
      const sup = supers[l] || String(l + 1);
      return `h${sub}⁽${sup}⁾`;
    }
  }
  return nodeId;
}

/**
 * Builds the complete sequence of Cisco Packet Tracer simulation stages.
 * Guaranteed continuous value transit:
 * Forward: Inputs -> Layer 1 -> Layer 2 -> ... -> Output
 * Backward: Output -> ... -> Layer 2 -> Layer 1 -> Inputs
 * Every single transit stage animates ALL synapses of that layer simultaneously with live updates.
 */
export function buildSimulationStages(
  net: Network,
  sample: DataPoint,
  learningRate = 0.03
): SimulationFrame[] {
  const frames: SimulationFrame[] = [];
  const map = buildNodeMap(net);

  // Snapshot original weights & biases
  const origWeights = new Map<string, number>();
  const origBiases = new Map<string, number>();
  net.allLinks.forEach((l) => origWeights.set(l.id, l.weight));
  net.allNodes.forEach((n) => origBiases.set(n.id, n.bias));

  // Forward pass computation
  const inputs = computeFeatures(net.config.inputFeatures, sample.x, sample.y);
  const oldPred = forward(net, inputs, map);
  const oldLoss = SQUARE_LOSS.loss(oldPred, sample.label);

  // Snapshot pre-activations (z) and activations (a)
  const zValues = new Map<string, number>();
  const aValues = new Map<string, number>();
  net.allNodes.forEach((n) => {
    zValues.set(n.id, n.totalInput);
    aValues.set(n.id, n.output);
  });

  // Backward pass computation
  backward(net, sample.label, SQUARE_LOSS, map);
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

  // Calculate new weights & biases
  const newWeights = new Map<string, number>();
  const newBiases = new Map<string, number>();
  net.allLinks.forEach((l) => {
    const wOld = origWeights.get(l.id)!;
    const grad = weightGrads.get(l.id)!;
    newWeights.set(l.id, wOld - learningRate * grad);
  });
  net.allNodes.forEach((n) => {
    if (n.inputLinks.length > 0) {
      const bOld = origBiases.get(n.id)!;
      const bGrad = biasGrads.get(n.id)!;
      newBiases.set(n.id, bOld - learningRate * bGrad);
    }
  });

  // Verification pass with updated parameters
  net.allLinks.forEach((l) => (l.weight = newWeights.get(l.id)!));
  net.allNodes.forEach((n) => {
    if (newBiases.has(n.id)) n.bias = newBiases.get(n.id)!;
  });
  const newPred = forward(net, inputs, map);
  const newLoss = SQUARE_LOSS.loss(newPred, sample.label);
  const lossDelta = newLoss - oldLoss;

  // Restore original parameters
  net.allLinks.forEach((l) => (l.weight = origWeights.get(l.id)!));
  net.allNodes.forEach((n) => {
    if (origBiases.has(n.id)) n.bias = origBiases.get(n.id)!;
  });

  // Helper to create forward traveling packets
  function makeForwardPackets(links: Link[], progress = 0.5): TravelingPacket[] {
    return links.map((l) => {
      const srcAct = aValues.get(l.sourceNodeId) ?? 0;
      const w = origWeights.get(l.id) ?? l.weight;
      const prod = w * srcAct;
      const srcVar = getNodeVariable(l.sourceNodeId, net);

      return {
        id: `pkt_fwd_${l.id}`,
        linkId: l.id,
        sourceNodeId: l.sourceNodeId,
        targetNodeId: l.targetNodeId,
        direction: "forward",
        type: "forward_data",
        variableName: `w·${srcVar}`,
        value: prod,
        badgeText: `${prod >= 0 ? "+" : ""}${prod.toFixed(3)}`,
        detailFormula: `${srcVar}=${fmt(srcAct, 2)} × w=${fmt(w, 2)} = ${fmt(prod, 3)}`,
        color: "green",
        progress,
        staggerOffset: 0,
      };
    });
  }

  // Helper to build accumulator map for target neurons
  function makeAccumulatorMap(targetNodes: Node[]) {
    const acc = new Map<
      string,
      {
        variableName: string;
        inputs: Array<{ sourceId: string; sourceVar: string; weight: number; activation: number; product: number }>;
        bias: number;
        z: number;
        a: number;
      }
    >();

    targetNodes.forEach((node) => {
      const ins = node.inputLinks.map((l) => {
        const act = aValues.get(l.sourceNodeId) ?? 0;
        const w = origWeights.get(l.id) ?? l.weight;
        return {
          sourceId: l.sourceNodeId,
          sourceVar: getNodeVariable(l.sourceNodeId, net),
          weight: w,
          activation: act,
          product: w * act,
        };
      });
      acc.set(node.id, {
        variableName: getNodeVariable(node.id, net),
        inputs: ins,
        bias: origBiases.get(node.id) ?? node.bias,
        z: zValues.get(node.id) ?? 0,
        a: aValues.get(node.id) ?? 0,
      });
    });
    return acc;
  }

  // Helper to build delta map for backward arrival
  function makeDeltaMap(nodes: Node[]) {
    const dMap = new Map<string, { variableName: string; delta: number }>();
    nodes.forEach((n) => {
      dMap.set(n.id, {
        variableName: getNodeVariable(n.id, net),
        delta: deltaValues.get(n.id) ?? 0,
      });
    });
    return dMap;
  }

  // Helper to create backward traveling error packets with real-time weight update
  function makeBackwardPackets(links: Link[], progress = 0.5): TravelingPacket[] {
    return links.map((l) => {
      const grad = weightGrads.get(l.id) ?? l.errorDeriv;
      const deltaTgt = deltaValues.get(l.targetNodeId) ?? 0;
      const wOld = origWeights.get(l.id) ?? l.weight;
      const wNew = newWeights.get(l.id) ?? wOld;

      return {
        id: `pkt_bwd_${l.id}`,
        linkId: l.id,
        sourceNodeId: l.targetNodeId, // traveling backward
        targetNodeId: l.sourceNodeId,
        direction: "backward",
        type: "backward_error",
        variableName: `∂L/∂w`,
        value: grad,
        badgeText: `w: ${fmt(wOld, 2)}➔${fmt(wNew, 2)}`,
        wOld,
        wNew,
        updateText: `w: ${fmt(wOld, 2)}➔${fmt(wNew, 2)}`,
        detailFormula: `δ=${fmt(deltaTgt, 3)} ➔ ∂L/∂w=${fmt(grad, 3)} ➔ w: ${fmt(wOld, 3)} ➔ ${fmt(wNew, 3)}`,
        color: "magenta",
        progress,
        staggerOffset: 0,
      };
    });
  }

  // Track live weights state as updates roll backward
  let currentLiveWeights = new Map(origWeights);
  let currentLiveBiases = new Map(origBiases);

  // Group links layer-by-layer:
  // Layer 0 -> Layer 1
  const l0Links = net.allLinks.filter((l) =>
    net.inputNodes.some((inN) => inN.id === l.sourceNodeId)
  );
  // Hidden layers
  const numHidden = net.hiddenLayers.length;
  // Hidden-to-hidden link groups
  const hiddenLinkGroups: Link[][] = [];
  for (let l = 0; l < numHidden - 1; l++) {
    const srcNodes = net.hiddenLayers[l];
    const tgtNodes = net.hiddenLayers[l + 1];
    const links = net.allLinks.filter(
      (lnk) =>
        srcNodes.some((s) => s.id === lnk.sourceNodeId) &&
        tgtNodes.some((t) => t.id === lnk.targetNodeId)
    );
    hiddenLinkGroups.push(links);
  }
  // Output links (last hidden layer -> output)
  const outLinks = net.allLinks.filter((l) => l.targetNodeId === net.outputNode.id);
  const h1Nodes = net.hiddenLayers[0] || [];
  const lastHiddenNodes = net.hiddenLayers[numHidden - 1] || [];

  // ──────────────────────────────────────────────────────────────────────────
  // FORWARD PROPAGATION SEQUENCE (Layer by Layer, All Synapses Active)
  // ──────────────────────────────────────────────────────────────────────────

  let stg = 0;

  // Stage 1: Input Values Injected
  frames.push({
    stageIndex: stg++,
    totalStages: 0,
    event: {
      id: `ev_${stg}`,
      stageIndex: stg - 1,
      timeLabel: "00:00.00",
      title: "Input Signals Injected",
      description: `Input signals x₁=${fmt(sample.x)} (Brightness) and x₂=${fmt(sample.y)} (Steady Beat) injected into origin nodes.`,
      phase: "forward",
      activeLayer: 0,
      activeNodeIds: net.inputNodes.map((n) => n.id),
      activeLinkIds: [],
      summary: { label: "SENSOR INPUTS", value: `x₁:${fmt(sample.x)}, x₂:${fmt(sample.y)}` },
    },
    packets: [],
    activeNodeIds: net.inputNodes.map((n) => n.id),
    activeLinkIds: [],
    liveWeights: new Map(currentLiveWeights),
    liveBiases: new Map(currentLiveBiases),
  });

  // Stage 2: Forward Transit: Inputs ➔ Layer 1 (ALL synapses carrying values)
  frames.push({
    stageIndex: stg++,
    totalStages: 0,
    event: {
      id: `ev_${stg}`,
      stageIndex: stg - 1,
      timeLabel: `00:0${stg}.00`,
      title: "Forward Propagation: Inputs ➔ Layer 1",
      description: `Input values multiply by weights w · x across all synapses, activating Layer 1 neurons.`,
      phase: "forward",
      activeLayer: 1,
      activeNodeIds: h1Nodes.map((n) => n.id),
      activeLinkIds: l0Links.map((l) => l.id),
      summary: { label: "LAYER 1 SYNAPSES", value: `${l0Links.length} synapse products` },
    },
    packets: makeForwardPackets(l0Links, 0.5),
    activeNodeIds: h1Nodes.map((n) => n.id),
    activeLinkIds: l0Links.map((l) => l.id),
    neuronAccumulations: makeAccumulatorMap(h1Nodes),
    liveWeights: new Map(currentLiveWeights),
    liveBiases: new Map(currentLiveBiases),
  });

  // Intermediate Hidden Layers (e.g. Layer 1 ➔ Layer 2)
  for (let l = 0; l < hiddenLinkGroups.length; l++) {
    const srcLayerNodes = net.hiddenLayers[l];
    const tgtLayerNodes = net.hiddenLayers[l + 1];
    const groupLinks = hiddenLinkGroups[l];

    frames.push({
      stageIndex: stg++,
      totalStages: 0,
      event: {
        id: `ev_${stg}`,
        stageIndex: stg - 1,
        timeLabel: `00:0${stg}.00`,
        title: `Forward Propagation: Layer ${l + 1} ➔ Layer ${l + 2}`,
        description: `Layer ${l + 1} activations propagate across all intermediate synapses into Layer ${l + 2}.`,
        phase: "forward",
        activeLayer: l + 2,
        activeNodeIds: tgtLayerNodes.map((n) => n.id),
        activeLinkIds: groupLinks.map((lnk) => lnk.id),
        summary: { label: `LAYER ${l + 2} SYNAPSES`, value: `${groupLinks.length} synapse products` },
      },
      packets: makeForwardPackets(groupLinks, 0.5),
      activeNodeIds: tgtLayerNodes.map((n) => n.id),
      activeLinkIds: groupLinks.map((lnk) => lnk.id),
      neuronAccumulations: makeAccumulatorMap(tgtLayerNodes),
      liveWeights: new Map(currentLiveWeights),
      liveBiases: new Map(currentLiveBiases),
    });
  }

  // Final Hidden Layer ➔ Output Node ŷ
  frames.push({
    stageIndex: stg++,
    totalStages: 0,
    event: {
      id: `ev_${stg}`,
      stageIndex: stg - 1,
      timeLabel: `00:0${stg}.00`,
      title: `Forward Propagation: Layer ${numHidden} ➔ Output Node ŷ`,
      description: `Final hidden layer activations converge into output neuron to produce prediction ŷ and synthesize loss L.`,
      phase: "forward",
      activeLayer: net.hiddenLayers.length + 1,
      activeNodeIds: [net.outputNode.id],
      activeLinkIds: outLinks.map((l) => l.id),
      summary: { label: "OUTPUT CONVERGENCE", value: `ŷ = ${fmt(oldPred, 3)}` },
    },
    packets: makeForwardPackets(outLinks, 0.5),
    activeNodeIds: [net.outputNode.id],
    activeLinkIds: outLinks.map((l) => l.id),
    neuronAccumulations: makeAccumulatorMap([net.outputNode]),
    liveWeights: new Map(currentLiveWeights),
    liveBiases: new Map(currentLiveBiases),
    lossData: {
      prediction: oldPred,
      target: sample.label,
      loss: oldLoss,
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // STRICT LAYER-BY-LAYER BACKPROPAGATION (All Synapses Active, Live Weights)
  // ──────────────────────────────────────────────────────────────────────────

  // Output ➔ Last Hidden Layer Reverse Error Transit & Live Weight Morphing
  outLinks.forEach((l) => currentLiveWeights.set(l.id, newWeights.get(l.id)!));
  currentLiveBiases.set(net.outputNode.id, newBiases.get(net.outputNode.id)!);

  frames.push({
    stageIndex: stg++,
    totalStages: 0,
    event: {
      id: `ev_${stg}`,
      stageIndex: stg - 1,
      timeLabel: `00:0${stg}.35`,
      title: `Error Backflowing: Output ➔ Layer ${numHidden}`,
      description: `Output error sensitivity δ_out travels BACKWARDS along all output synapses. Output weights update live in real-time.`,
      phase: "backward",
      activeLayer: net.hiddenLayers.length,
      activeNodeIds: [net.outputNode.id, ...lastHiddenNodes.map((n) => n.id)],
      activeLinkIds: outLinks.map((l) => l.id),
      summary: { label: "OUTPUT WEIGHTS UPDATED", value: `${outLinks.length} synapses updated` },
    },
    packets: makeBackwardPackets(outLinks, 0.5),
    activeNodeIds: [net.outputNode.id, ...lastHiddenNodes.map((n) => n.id)],
    activeLinkIds: outLinks.map((l) => l.id),
    neuronDeltas: makeDeltaMap([net.outputNode]),
    liveWeights: new Map(currentLiveWeights),
    liveBiases: new Map(currentLiveBiases),
    lossData: {
      prediction: oldPred,
      target: sample.label,
      loss: oldLoss,
    },
  });

  // Hidden Layers Reverse Error Transit (e.g. Layer 2 ➔ Layer 1)
  for (let l = hiddenLinkGroups.length - 1; l >= 0; l--) {
    const srcNodes = net.hiddenLayers[l];
    const tgtNodes = net.hiddenLayers[l + 1];
    const groupLinks = hiddenLinkGroups[l];

    groupLinks.forEach((lnk) => currentLiveWeights.set(lnk.id, newWeights.get(lnk.id)!));
    tgtNodes.forEach((n) => currentLiveBiases.set(n.id, newBiases.get(n.id)!));

    frames.push({
      stageIndex: stg++,
      totalStages: 0,
      event: {
        id: `ev_${stg}`,
        stageIndex: stg - 1,
        timeLabel: `00:0${stg}.35`,
        title: `Error Backflowing: Layer ${l + 2} ➔ Layer ${l + 1}`,
        description: `Error sensitivities δ propagate BACKWARDS across ALL synapses connecting Layer ${l + 2} to Layer ${l + 1}. Weights update live in real-time.`,
        phase: "backward",
        activeLayer: l + 1,
        activeNodeIds: [...tgtNodes.map((n) => n.id), ...srcNodes.map((n) => n.id)],
        activeLinkIds: groupLinks.map((lnk) => lnk.id),
        summary: { label: `LAYER ${l + 2}➔${l + 1} WEIGHTS`, value: `${groupLinks.length} synapses updated` },
      },
      packets: makeBackwardPackets(groupLinks, 0.5),
      activeNodeIds: [...tgtNodes.map((n) => n.id), ...srcNodes.map((n) => n.id)],
      activeLinkIds: groupLinks.map((lnk) => lnk.id),
      neuronDeltas: makeDeltaMap(tgtNodes),
      liveWeights: new Map(currentLiveWeights),
      liveBiases: new Map(currentLiveBiases),
    });
  }

  // Reverse Error Transit: Layer 1 ➔ Input Origins (ALL synapses active with live weight updates!)
  l0Links.forEach((lnk) => currentLiveWeights.set(lnk.id, newWeights.get(lnk.id)!));
  h1Nodes.forEach((n) => currentLiveBiases.set(n.id, newBiases.get(n.id)!));

  frames.push({
    stageIndex: stg++,
    totalStages: 0,
    event: {
      id: `ev_${stg}`,
      stageIndex: stg - 1,
      timeLabel: `00:0${stg}.35`,
      title: "Error Backflowing: Layer 1 ➔ Input Origins",
      description: `Error signals travel BACKWARDS across ALL synapses connecting Layer 1 to Input origins. Input connection weights update live in real-time.`,
      phase: "backward",
      activeLayer: 0,
      activeNodeIds: [...h1Nodes.map((n) => n.id), ...net.inputNodes.map((n) => n.id)],
      activeLinkIds: l0Links.map((lnk) => lnk.id),
      summary: { label: "INPUT SYNAPSES UPDATED", value: `${l0Links.length} synapses updated` },
    },
    packets: makeBackwardPackets(l0Links, 0.5),
    activeNodeIds: [...h1Nodes.map((n) => n.id), ...net.inputNodes.map((n) => n.id)],
    activeLinkIds: l0Links.map((lnk) => lnk.id),
    neuronDeltas: makeDeltaMap(h1Nodes),
    liveWeights: new Map(currentLiveWeights),
    liveBiases: new Map(currentLiveBiases),
  });

  // Final Verification Pulse (All Weights Updated, Error Loss Decreased)
  frames.push({
    stageIndex: stg++,
    totalStages: 0,
    event: {
      id: `ev_${stg}`,
      stageIndex: stg - 1,
      timeLabel: `00:0${stg}.35`,
      title: "Gradient Descent Complete: Loss Verified",
      description: `All synapses across all layers updated. Forward verification confirms loss dropped from ${fmt(oldLoss, 6)} to ${fmt(newLoss, 6)} (ΔL = ${fmt(lossDelta, 6)}).`,
      phase: "verify",
      activeLayer: 0,
      activeNodeIds: [net.outputNode.id],
      activeLinkIds: net.allLinks.map((l) => l.id),
      summary: { label: "LOSS REDUCTION (ΔL)", value: `${fmt(lossDelta, 6)} ✓` },
    },
    packets: [],
    activeNodeIds: [net.outputNode.id],
    activeLinkIds: net.allLinks.map((l) => l.id),
    liveWeights: new Map(currentLiveWeights),
    liveBiases: new Map(currentLiveBiases),
    lossData: {
      prediction: newPred,
      target: sample.label,
      loss: newLoss,
      lossReduction: lossDelta,
    },
  });

  // Assign totalStages across all frames
  frames.forEach((f) => {
    f.totalStages = frames.length;
  });

  return frames;
}
