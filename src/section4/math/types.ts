/**
 * types.ts — Type Definitions for the Floating Mathematical Visualization System
 * ==============================================================================
 * Defines the state machine steps, phases, mathematical formulas, and visual
 * anchors connecting mathematical operations to the neural network graph.
 */

export type MathPhase =
  | "input"
  | "forward_sum"
  | "forward_act"
  | "output_sum"
  | "output_act"
  | "loss"
  | "output_delta"
  | "output_weight_grad"
  | "hidden_delta"
  | "hidden_weight_grad"
  | "bias_grad"
  | "gradient_summary"
  | "weight_update"
  | "bias_update"
  | "forward_verify"
  | "loss_comparison";

export interface MathStep {
  id: string;
  stepIndex: number;
  totalSteps: number;
  phase: MathPhase;
  phaseLabel: string;
  title: string;

  // Spatial anchor targets for the floating panel & glowing connector line
  targetType: "node" | "link" | "loss" | "input" | "summary" | "comparison";
  targetNodeId?: string;
  targetLinkId?: string;
  sourceNodeId?: string;

  // Elements to highlight on the network diagram
  activeNodeIds: string[];
  activeLinkIds: string[];
  glowColor: "green" | "magenta" | "amber" | "cyan";

  // The 5 chronological sub-stages required:
  // A. General formula (LaTeX)
  generalFormulaLatex: string;
  // B. Numerical substitution (LaTeX)
  substitutionLatex: string;
  // C. Intermediate calculations (LaTeX)
  intermediateLatex: string;
  // D. Final calculation (LaTeX)
  finalCalculationLatex: string;
  // E. Final neuron value / result (LaTeX)
  finalValueLatex: string;

  // Educational explanation
  explanation: string;

  // Exact numeric value from the engine
  numericValue: number;

  // Contextual data (for summary tables or before/after comparisons)
  comparisonData?: {
    oldPrediction: number;
    newPrediction: number;
    oldLoss: number;
    newLoss: number;
    lossDelta: number;
  };
}

export interface GradientSummaryEntry {
  parameterId: string;
  paramType: "weight" | "bias";
  oldValue: number;
  gradient: number;
  learningRate: number;
  updateStep: number;
  newValue: number;
}
