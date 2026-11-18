"use client";

import React from "react";
import { KaTeXBlock } from "./KaTeXBlock";

export interface MathGlossaryModalProps {
  open: boolean;
  onClose: () => void;
}

export function MathGlossaryModal({ open, onClose }: MathGlossaryModalProps) {
  if (!open) return null;

  const GLOSSARY_ITEMS = [
    {
      symbol: "a_j^{(l)}",
      name: "Activation / Output",
      formula: "a_j^{(l)} = \\varphi\\left(z_j^{(l)}\\right)",
      description: "The output value of neuron j in layer l after applying the non-linear squashing function φ(z).",
    },
    {
      symbol: "z_j^{(l)}",
      name: "Pre-Activation (Weighted Sum)",
      formula: "z_j^{(l)} = \\sum_{i} w_{ji}^{(l)} a_i^{(l-1)} + b_j^{(l)}",
      description: "The linear sum of preceding activations multiplied by synaptic weights plus the neuron's threshold bias.",
    },
    {
      symbol: "w_{ji}^{(l)}",
      name: "Synaptic Weight",
      formula: "w_{ji}^{(l)} \\in \\mathbb{R}",
      description: "The connection strength from neuron i in preceding layer (l-1) into neuron j in current layer l.",
    },
    {
      symbol: "b_j^{(l)}",
      name: "Neuron Bias",
      formula: "b_j^{(l)} \\in \\mathbb{R}",
      description: "An adjustable baseline offset added to the weighted sum that shifts the activation threshold.",
    },
    {
      symbol: "\\varphi(z)",
      name: "Activation Function (Tanh)",
      formula: "\\varphi(z) = \\tanh(z) = \\frac{e^z - e^{-z}}{e^z + e^{-z}}",
      description: "Hyperbolic tangent function mapping all real numbers smoothly into the bounded interval (-1, +1).",
    },
    {
      symbol: "\\varphi'(z)",
      name: "Activation Derivative",
      formula: "\\varphi'(z) = 1 - \\tanh^2(z) = 1 - a^2",
      description: "Derivative of tanh with respect to pre-activation z, computable directly from the activation output a.",
    },
    {
      symbol: "L",
      name: "Squared Error Loss",
      formula: "L = \\frac{1}{2}(\\hat{y} - y)^2",
      description: "Measures discrepancy between network prediction ŷ and desired ground-truth target label y.",
    },
    {
      symbol: "\\delta_j^{(l)}",
      name: "Error Signal (Delta)",
      formula: "\\delta_j^{(l)} = \\frac{\\partial L}{\\partial z_j^{(l)}}",
      description: "Sensitivity of loss with respect to pre-activation z_j, backpropagated through network layers.",
    },
    {
      symbol: "\\frac{\\partial L}{\\partial w}",
      name: "Weight Gradient",
      formula: "\\frac{\\partial L}{\\partial w_{ji}^{(l)}} = \\delta_j^{(l)} \\cdot a_i^{(l-1)}",
      description: "Partial derivative of total loss with respect to connection weight, derived via the chain rule.",
    },
    {
      symbol: "\\eta",
      name: "Learning Rate",
      formula: "\\eta > 0",
      description: "Step-size hyperparameter dictating how aggressively parameters shift along the negative gradient vector.",
    },
    {
      symbol: "w_{\\text{new}}",
      name: "Gradient Descent Update",
      formula: "w_{ji}^{\\text{new}} = w_{ji}^{\\text{old}} - \\eta \\frac{\\partial L}{\\partial w_{ji}}",
      description: "Parameter update equation moving weights in the direction of steepest descent to minimize prediction loss.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-[660px] max-w-[95vw] max-h-[85vh] rounded-md border-2 border-[#2EE85C] bg-[#020e05] p-5 shadow-[0_0_40px_rgba(46,232,92,0.4)] flex flex-col font-mono select-none overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2EE85C]/50 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#2EE85C] text-base font-bold">📐</span>
            <span className="font-bold text-sm text-[#4BFF7B] tracking-wider uppercase">
              MATHEMATICAL NOTATION GLOSSARY
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded border border-[#2EE85C]/60 hover:bg-[#2EE85C]/20 text-[#4BFF7B] text-xs font-bold"
          >
            ESC / CLOSE [✕]
          </button>
        </div>

        {/* Scrollable list of symbols */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {GLOSSARY_ITEMS.map((item) => (
            <div
              key={item.name}
              className="p-2.5 rounded bg-[#010803] border border-[var(--term-outline-green)]/40 hover:border-[#2EE85C] transition-all"
            >
              <div className="flex items-center justify-between border-b border-[var(--term-outline-green)]/20 pb-1 mb-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {item.name}
                </span>
                <span className="text-sm text-[#4BFF7B] font-bold">
                  <KaTeXBlock math={item.symbol} />
                </span>
              </div>

              {/* Math formula */}
              <div className="py-1 px-2 my-1 rounded bg-[#021306] border border-[#2EE85C]/30 text-center text-xs text-[#4BFF7B]">
                <KaTeXBlock math={item.formula} displayMode={true} />
              </div>

              {/* Plain English explanation */}
              <div className="text-[11px] text-[var(--term-green-text-dim)] leading-relaxed mt-1">
                {item.description}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-[#2EE85C]/40 flex items-center justify-between text-[10px] text-[var(--term-green-text-dim)] shrink-0">
          <span>NEURO-SCRAP // SECTION 4 PART 1 MATH SUBSYSTEM</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#062e0f] border border-[#2EE85C] text-[#4BFF7B] font-bold text-xs hover:bg-[#0a4217]"
          >
            RETURN TO TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
}
