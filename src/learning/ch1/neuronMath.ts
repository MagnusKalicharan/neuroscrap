import type { Scenario, Decision } from './scenarios.ts';

export interface Weights {
  w1: number; // Air weight
  w2: number; // Temp weight
  w3: number; // Radiation weight
  b: number;  // Bias
}

export interface NeuronInputs {
  air: number;
  temp: number;
  radiation: number;
}

export interface NeuronContributions {
  air: number;
  temp: number;
  radiation: number;
  bias: number;
}

export interface NeuronResult {
  sum: number;
  decision: Decision;
  contributions: NeuronContributions;
}

export interface CaseEvaluation {
  scenario: Scenario;
  result: NeuronResult;
  passed: boolean;
  why: string;
}

export interface EvaluationSummary {
  evaluations: CaseEvaluation[];
  score: number;
  total: number;
  allPassed: boolean;
}

export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Pure neuron computation:
 * sum = w1*x1 + w2*x2 + w3*x3 + b
 * decision = sum > 0 ? "OPEN" : "SHUT"
 */
export function computeNeuron(
  inputs: NeuronInputs,
  weights: Weights
): NeuronResult {
  const airContr = round(inputs.air * weights.w1, 3);
  const tempContr = round(inputs.temp * weights.w2, 3);
  const radContr = round(inputs.radiation * weights.w3, 3);
  const biasContr = round(weights.b, 3);

  const rawSum = airContr + tempContr + radContr + biasContr;
  const sum = round(rawSum, 2);
  const decision: Decision = sum > 0 ? 'OPEN' : 'SHUT';

  return {
    sum,
    decision,
    contributions: {
      air: airContr,
      temp: tempContr,
      radiation: radContr,
      bias: biasContr,
    },
  };
}

/**
 * Explains why a case passed or failed in plain language based on contributions.
 */
export function generateCaseWhy(
  scenario: Scenario,
  result: NeuronResult,
  weights: Weights
): string {
  const passed = result.decision === scenario.expected;
  const { air, temp, radiation, bias } = result.contributions;

  if (passed) {
    if (scenario.expected === 'OPEN') {
      return `Sum was +${result.sum.toFixed(2)} (> 0). Air (+${air.toFixed(2)}) and temperature pushed strong enough to open safely.`;
    } else {
      return `Sum was ${result.sum.toFixed(2)} (≤ 0). Negative push from hazards kept the airlock safely SHUT.`;
    }
  }

  // Failed cases diagnostics
  if (scenario.expected === 'SHUT' && result.decision === 'OPEN') {
    if (scenario.id === 3 || scenario.inputs.radiation > 0.5) {
      if (weights.w3 >= 0) {
        return `Radiation is deadly (${scenario.inputs.radiation}), but its weight (${weights.w3.toFixed(1)}) pushed toward OPEN (+${radiation.toFixed(2)})! Negative weights push toward SHUT.`;
      }
      return `Radiation push (${radiation.toFixed(2)}) wasn't negative enough to overcome air/temp pushes (+${(air + temp).toFixed(2)}) + bias (${bias.toFixed(2)}).`;
    }
    if (scenario.id === 2 || scenario.inputs.air < 0.3) {
      return `Air is toxic (${scenario.inputs.air}), but the sum remained positive (+${result.sum.toFixed(2)}). A lower or negative bias can help keep toxic environments SHUT.`;
    }
    if (scenario.id === 4 || scenario.inputs.temp < 0.3) {
      return `Freezing temperature (${scenario.inputs.temp}) is dangerous, but total sum (+${result.sum.toFixed(2)}) still forced OPEN.`;
    }
    return `Sum was +${result.sum.toFixed(2)}, opening the airlock during hazardous conditions.`;
  }

  if (scenario.expected === 'OPEN' && result.decision === 'SHUT') {
    return `Environment was safe, but the sum fell to ${result.sum.toFixed(2)}. Connection weights were too weak or bias was too negative.`;
  }

  return `Decision was ${result.decision}, but expected ${scenario.expected}.`;
}

/**
 * Evaluates a single scenario against weights.
 */
export function evaluateCase(
  scenario: Scenario,
  weights: Weights
): CaseEvaluation {
  const result = computeNeuron(scenario.inputs, weights);
  const passed = result.decision === scenario.expected;
  const why = generateCaseWhy(scenario, result, weights);

  return {
    scenario,
    result,
    passed,
    why,
  };
}

/**
 * Evaluates all scenarios against weights.
 */
export function evaluateAllCases(
  scenarios: Scenario[],
  weights: Weights
): EvaluationSummary {
  const evaluations = scenarios.map((s) => evaluateCase(s, weights));
  const score = evaluations.filter((e) => e.passed).length;

  return {
    evaluations,
    score,
    total: scenarios.length,
    allPassed: score === scenarios.length,
  };
}
