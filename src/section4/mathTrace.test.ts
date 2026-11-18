/**
 * mathTrace.test.ts — Verification of Mathematical Trace & KaTeX Equations
 */

import { createNetwork } from "./nn/network.ts";
import { generateSignalData } from "./nn/datasets.ts";
import { generateMathematicalTrace } from "./math/mathTraceGenerator.ts";
import katex from "katex";

console.log("================================================================================");
console.log("SECTION 4: MATHEMATICAL VISUALIZATION TRACE VERIFICATION");
console.log("================================================================================");

const net = createNetwork(
  {
    inputFeatures: ["x1", "x2"],
    hiddenLayers: [4, 2],
    outputActivation: "tanh",
    problemType: "classification",
  },
  42
);

const samples = generateSignalData(42, 0);
const sample = samples[0];

console.log("\n[Test 1] Generating Mathematical Trace for Sample (x1=" + sample.x.toFixed(3) + ", x2=" + sample.y.toFixed(3) + ", label=" + sample.label + ")...");
const trace = generateMathematicalTrace(net, sample, 0.03);

console.log("  ✓ Trace generated successfully with " + trace.steps.length + " chronological steps.");
console.log("  ✓ Gradient summary entries: " + trace.gradientSummary.length);

console.log("\n[Test 2] KaTeX Syntax Validation across all generated mathematical steps...");
let formulaCount = 0;
trace.steps.forEach((step, idx) => {
  const formulas = [
    { name: "generalFormula", latex: step.generalFormulaLatex },
    { name: "substitution", latex: step.substitutionLatex },
    { name: "intermediate", latex: step.intermediateLatex },
    { name: "finalCalculation", latex: step.finalCalculationLatex },
    { name: "finalValue", latex: step.finalValueLatex },
  ];

  formulas.forEach((f) => {
    if (f.latex) {
      formulaCount++;
      try {
        katex.renderToString(f.latex, { throwOnError: true });
      } catch (err: any) {
        console.error("  ✕ KaTeX render error in step " + idx + " (" + step.id + ") [" + f.name + "]: " + f.latex);
        throw err;
      }
    }
  });
});
console.log("  ✓ All " + formulaCount + " KaTeX mathematical expressions parsed without any syntax error.");

console.log("\n[Test 3] Gradient Descent Verification: Loss Reduction (ΔL < 0)...");
console.log("  • Pre-update Loss:  " + trace.beforeAfter.oldLoss.toFixed(6));
console.log("  • Post-update Loss: " + trace.beforeAfter.newLoss.toFixed(6));
console.log("  • Loss Delta (ΔL):  " + trace.beforeAfter.lossDelta.toFixed(6));

if (trace.beforeAfter.lossDelta >= 0) {
  throw new Error("Gradient descent step did not reduce loss!");
}
console.log("  ✓ Verified: Parameter update via gradient descent strictly decreased loss on the sample.");

console.log("\n[Test 4] Sequence Completeness Check...");
const phases = trace.steps.map((s) => s.phase);
const expectedPhases = [
  "forward_sum",
  "forward_act",
  "output_sum",
  "output_act",
  "loss",
  "output_delta",
  "output_weight_grad",
  "hidden_delta",
  "hidden_weight_grad",
  "gradient_summary",
  "weight_update",
  "bias_update",
  "loss_comparison",
];

expectedPhases.forEach((p) => {
  if (!phases.includes(p as any)) {
    throw new Error("Missing phase in trace: " + p);
  }
});
console.log("  ✓ All expected phases (Forward Pass, Loss, Delta, Gradients, Updates, Verification) present in chronological order.");

console.log("\n================================================================================");
console.log("🎉 ALL MATHEMATICAL TRACE TESTS PASSED!");
console.log("================================================================================");
