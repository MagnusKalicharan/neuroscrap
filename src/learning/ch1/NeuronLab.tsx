'use client';

import React, { useState, useId } from 'react';
import { SCENARIOS, Scenario, KNOWN_SOLUTION } from './scenarios.ts';
import {
  computeNeuron,
  evaluateCase,
  evaluateAllCases,
  round,
  Weights,
} from './neuronMath.ts';
import { ch1Sounds } from './sound.ts';
import './ch1.css';

export interface NeuronLabProps {
  weights: Weights;
  onWeightChange: (key: keyof Weights, value: number) => void;
  onSetAllWeights?: (weights: Weights) => void;
  selectedCaseId: number;
  onSelectCase: (id: number) => void;
  phase: string;
  reduceMotion?: boolean;
  onHintRequested?: () => void;
  activeHint?: string | null;
  onAllPassed?: () => void;
}

export const NeuronLab: React.FC<NeuronLabProps> = ({
  weights,
  onWeightChange,
  onSetAllWeights,
  selectedCaseId,
  onSelectCase,
  phase,
  reduceMotion = false,
  onHintRequested,
  activeHint,
  onAllPassed,
}) => {
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const airSliderId = useId();
  const tempSliderId = useId();
  const radSliderId = useId();
  const biasSliderId = useId();

  // Find active scenario
  const activeScenario = SCENARIOS.find((s) => s.id === selectedCaseId) || SCENARIOS[0];
  const activeEval = evaluateCase(activeScenario, weights);
  const allEval = evaluateAllCases(SCENARIOS, weights);

  // Phase unlocking rules
  // Phase A: only Case 1 unlocked, bias locked
  // Phase B: Case 1 unlocked, bias locked
  // Phase C: Case 1 and 2 unlocked, bias unlocked
  // Phase D+: All 6 cases unlocked, bias unlocked
  const isBiasUnlocked = phase !== 'phaseA' && phase !== 'phaseB';
  const isCaseUnlocked = (caseId: number) => {
    if (phase === 'phaseA' || phase === 'phaseB') return caseId === 1;
    if (phase === 'phaseC') return caseId === 1 || caseId === 2;
    return true;
  };

  // Check 6/6 condition
  React.useEffect(() => {
    if (allEval.allPassed && (phase === 'phaseD' || phase === 'phaseC')) {
      ch1Sounds.successFanfare();
      onAllPassed?.();
    }
  }, [allEval.allPassed, phase, onAllPassed]);

  const handleSliderChange = (key: keyof Weights, rawVal: number) => {
    onWeightChange(key, rawVal);
    ch1Sounds.sliderTick(1.0 + (rawVal + 2) * 0.15);
  };

  const { air, temp, radiation, bias } = activeEval.result.contributions;
  const currentSum = activeEval.result.sum;
  const decision = activeEval.result.decision;
  const isPassed = activeEval.passed;

  // Max contribution for bar scaling (capped at 4.0 for nice bar widths)
  const maxBar = 2.5;
  const getBarPercent = (val: number) => {
    const clamped = Math.max(-maxBar, Math.min(maxBar, val));
    return Math.abs(clamped / maxBar) * 50; // max 50% left or right of center
  };

  return (
    <div className={`ch1-lab-container ${reduceMotion ? 'ch1-reduced-motion' : ''}`}>
      {/* Objective bar */}
      <div className="ch1-objective-bar" role="region" aria-label="Current Objective">
        <div className="ch1-objective-text">
          <span style={{ color: 'var(--ch1-cyan)' }}>▶ OBJECTIVE:</span>
          {phase === 'phaseA' && (
            <span>Make the neuron say OPEN for Case 1. Experiment with the connections.</span>
          )}
          {phase === 'phaseB' && (
            <span>Notice how each connection has a WEIGHT and the neuron adds them up.</span>
          )}
          {phase === 'phaseC' && (
            <span>Use the BIAS control to make the neuron cautious enough for Toxic Fog.</span>
          )}
          {(phase === 'phaseD' || phase === 'phaseE' || phase === 'phaseF' || phase === 'completed') && (
            <span>Configure weights and bias to solve ALL 6 scenarios simultaneously.</span>
          )}
        </div>
        <div className={`ch1-meter-badge ${allEval.allPassed ? 'all-passed' : ''}`}>
          {allEval.score} / {allEval.total} PASSED
        </div>
      </div>

      {/* Main 3-column Layout */}
      <div className="ch1-grid">
        {/* LEFT: Scenarios */}
        <section className="ch1-panel" aria-label="Scenarios List">
          <div className="ch1-panel-header">
            <span>Scenarios ({allEval.score}/6)</span>
            <span style={{ fontSize: '12px', color: 'var(--ch1-text-muted)' }}>Ground Truth</span>
          </div>
          <div className="ch1-scenarios-list" role="tablist">
            {SCENARIOS.map((sc) => {
              const scEval = evaluateCase(sc, weights);
              const unlocked = isCaseUnlocked(sc.id);
              const isSelected = sc.id === activeScenario.id;

              return (
                <button
                  key={sc.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  disabled={!unlocked}
                  className={`ch1-scenario-card ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onSelectCase(sc.id);
                    if (scEval.passed) {
                      ch1Sounds.casePass();
                    } else {
                      ch1Sounds.caseFail();
                    }
                  }}
                >
                  <div className="ch1-card-left">
                    <span className="ch1-card-icon" aria-hidden="true">{sc.icon}</span>
                    <div>
                      <div className="ch1-card-name">
                        {unlocked ? sc.name : '🔒 Locked'}
                      </div>
                      <div className="ch1-card-expected">
                        Target: <strong style={{ color: sc.expected === 'OPEN' ? 'var(--ch1-green)' : 'var(--ch1-red)' }}>{sc.expected}</strong>
                      </div>
                    </div>
                  </div>
                  <div>
                    {unlocked && (
                      <span className={scEval.passed ? 'ch1-badge-pass' : 'ch1-badge-fail'}>
                        {scEval.passed ? 'PASS ✓' : 'FAIL ✕'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* MIDDLE: Diagram & Contribution Bars */}
        <section className="ch1-panel" aria-label="Neuron SVG Diagram">
          <div className="ch1-panel-header">
            <span>Decision Circuit</span>
            <span style={{ fontSize: '13px', color: 'var(--ch1-cyan)' }}>
              x • w + b
            </span>
          </div>

          <div className="ch1-diagram-container">
            {/* SVG Neuron Diagram */}
            <svg
              className="ch1-svg-canvas"
              viewBox="0 0 520 260"
              role="img"
              aria-label={`Neuron diagram: Sum is ${currentSum.toFixed(2)}, decision is ${decision}`}
            >
              <defs>
                <filter id="ch1-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Input Nodes on the Left */}
              {/* x1: Air Quality */}
              <g
                transform="translate(50, 45)"
                onMouseEnter={() => setHoveredNode('Air Quality Input')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle r="24" fill="#0d1624" stroke="var(--ch1-panel-border)" strokeWidth="2" />
                <text textAnchor="middle" y="-4" fill="var(--ch1-text-muted)" fontSize="10" fontFamily="var(--ch1-font-mono)">
                  AIR x1
                </text>
                <text textAnchor="middle" y="12" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="var(--ch1-font-mono)">
                  {activeScenario.inputs.air.toFixed(1)}
                </text>
              </g>

              {/* x2: Temperature */}
              <g
                transform="translate(50, 130)"
                onMouseEnter={() => setHoveredNode('Temperature Input')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle r="24" fill="#0d1624" stroke="var(--ch1-panel-border)" strokeWidth="2" />
                <text textAnchor="middle" y="-4" fill="var(--ch1-text-muted)" fontSize="10" fontFamily="var(--ch1-font-mono)">
                  TEMP x2
                </text>
                <text textAnchor="middle" y="12" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="var(--ch1-font-mono)">
                  {activeScenario.inputs.temp.toFixed(1)}
                </text>
              </g>

              {/* x3: Radiation */}
              <g
                transform="translate(50, 215)"
                onMouseEnter={() => setHoveredNode('Radiation Input')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle r="24" fill="#0d1624" stroke="var(--ch1-panel-border)" strokeWidth="2" />
                <text textAnchor="middle" y="-4" fill="var(--ch1-text-muted)" fontSize="10" fontFamily="var(--ch1-font-mono)">
                  RAD x3
                </text>
                <text textAnchor="middle" y="12" fill="#fff" fontSize="13" fontWeight="bold" fontFamily="var(--ch1-font-mono)">
                  {activeScenario.inputs.radiation.toFixed(1)}
                </text>
              </g>

              {/* Synapse Connection Lines */}
              {/* Line 1: Air -> Neuron */}
              <line
                x1="74"
                y1="45"
                x2="250"
                y2="130"
                stroke={weights.w1 >= 0 ? '#44e6ff' : '#ffb23a'}
                strokeWidth={Math.max(1.5, Math.abs(weights.w1) * 3.5)}
                className="ch1-pulse-line"
              />
              {/* Badge 1 */}
              <g transform="translate(150, 80)">
                <rect x="-18" y="-9" width="36" height="18" rx="4" fill="#0a101a" stroke="var(--ch1-panel-border)" strokeWidth="1" />
                <text textAnchor="middle" y="4" fill={weights.w1 >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)'} fontSize="11" fontWeight="bold" fontFamily="var(--ch1-font-mono)">
                  {weights.w1 >= 0 ? `+${weights.w1.toFixed(1)}` : weights.w1.toFixed(1)}
                </text>
              </g>

              {/* Line 2: Temp -> Neuron */}
              <line
                x1="74"
                y1="130"
                x2="250"
                y2="130"
                stroke={weights.w2 >= 0 ? '#44e6ff' : '#ffb23a'}
                strokeWidth={Math.max(1.5, Math.abs(weights.w2) * 3.5)}
                className="ch1-pulse-line"
              />
              {/* Badge 2 */}
              <g transform="translate(155, 120)">
                <rect x="-18" y="-9" width="36" height="18" rx="4" fill="#0a101a" stroke="var(--ch1-panel-border)" strokeWidth="1" />
                <text textAnchor="middle" y="4" fill={weights.w2 >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)'} fontSize="11" fontWeight="bold" fontFamily="var(--ch1-font-mono)">
                  {weights.w2 >= 0 ? `+${weights.w2.toFixed(1)}` : weights.w2.toFixed(1)}
                </text>
              </g>

              {/* Line 3: Radiation -> Neuron */}
              <line
                x1="74"
                y1="215"
                x2="250"
                y2="130"
                stroke={weights.w3 >= 0 ? '#44e6ff' : '#ffb23a'}
                strokeWidth={Math.max(1.5, Math.abs(weights.w3) * 3.5)}
                className="ch1-pulse-line"
              />
              {/* Badge 3 */}
              <g transform="translate(150, 180)">
                <rect x="-18" y="-9" width="36" height="18" rx="4" fill="#0a101a" stroke="var(--ch1-panel-border)" strokeWidth="1" />
                <text textAnchor="middle" y="4" fill={weights.w3 >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)'} fontSize="11" fontWeight="bold" fontFamily="var(--ch1-font-mono)">
                  {weights.w3 >= 0 ? `+${weights.w3.toFixed(1)}` : weights.w3.toFixed(1)}
                </text>
              </g>

              {/* Central Neuron Circle */}
              <g
                transform="translate(290, 130)"
                onMouseEnter={() => setHoveredNode('Neuron Summing Core')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle
                  r="42"
                  fill="#080e18"
                  stroke={currentSum > 0 ? 'var(--ch1-green)' : 'var(--ch1-red)'}
                  strokeWidth="3"
                  filter="url(#ch1-glow)"
                />
                <text textAnchor="middle" y="-12" fill="var(--ch1-text-muted)" fontSize="11" fontFamily="var(--ch1-font-mono)">
                  SUM Σ
                </text>
                <text
                  textAnchor="middle"
                  y="12"
                  fill="#fff"
                  fontSize="18"
                  fontWeight="bold"
                  fontFamily="var(--ch1-font-mono)"
                >
                  {currentSum > 0 ? `+${currentSum.toFixed(2)}` : currentSum.toFixed(2)}
                </text>
                {isBiasUnlocked && (
                  <text textAnchor="middle" y="27" fill="var(--ch1-text-muted)" fontSize="10" fontFamily="var(--ch1-font-mono)">
                    bias: {weights.b >= 0 ? `+${weights.b.toFixed(1)}` : weights.b.toFixed(1)}
                  </text>
                )}
              </g>

              {/* Axon Line: Neuron -> Decision */}
              <line
                x1="332"
                y1="130"
                x2="415"
                y2="130"
                stroke={decision === 'OPEN' ? 'var(--ch1-green)' : 'var(--ch1-red)'}
                strokeWidth="4"
                className="ch1-pulse-line"
              />

              {/* Output Decision Node */}
              <g
                transform="translate(455, 130)"
                onMouseEnter={() => setHoveredNode('Threshold Decision Output')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <rect
                  x="-35"
                  y="-24"
                  width="70"
                  height="48"
                  rx="6"
                  fill={decision === 'OPEN' ? 'rgba(45, 224, 137, 0.2)' : 'rgba(255, 77, 90, 0.2)'}
                  stroke={decision === 'OPEN' ? 'var(--ch1-green)' : 'var(--ch1-red)'}
                  strokeWidth="2"
                />
                <text
                  textAnchor="middle"
                  y="5"
                  fill={decision === 'OPEN' ? 'var(--ch1-green)' : 'var(--ch1-red)'}
                  fontSize="16"
                  fontWeight="bold"
                  fontFamily="var(--ch1-font-mono)"
                >
                  {decision === 'OPEN' ? 'OPEN ✓' : 'SHUT ✕'}
                </text>
              </g>
            </svg>

            {hoveredNode && (
              <div style={{ fontSize: '12px', color: 'var(--ch1-cyan)', minHeight: '18px' }}>
                ℹ️ {hoveredNode}
              </div>
            )}

            {/* Contribution Bars: WHY did it say that? */}
            <div className="ch1-contributions-panel" role="region" aria-label="Component Contributions">
              <div className="ch1-contr-header">
                <span>CONTRIBUTIONS (Push toward SHUT ◀ | ▶ Push toward OPEN)</span>
                <span>Threshold: 0.0</span>
              </div>

              {/* Air contribution */}
              <div className="ch1-contr-row">
                <span className="ch1-contr-label">Air ({activeScenario.inputs.air}×{weights.w1}):</span>
                <div className="ch1-contr-bar-track">
                  <div className="ch1-contr-center-line" />
                  <div
                    className={`ch1-contr-fill ${air >= 0 ? 'positive' : 'negative'}`}
                    style={{
                      width: `${getBarPercent(air)}%`,
                      left: air >= 0 ? '50%' : `${50 - getBarPercent(air)}%`,
                    }}
                  />
                </div>
                <span className="ch1-contr-val" style={{ color: air >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {air >= 0 ? `+${air.toFixed(2)}` : air.toFixed(2)}
                </span>
              </div>

              {/* Temp contribution */}
              <div className="ch1-contr-row">
                <span className="ch1-contr-label">Temp ({activeScenario.inputs.temp}×{weights.w2}):</span>
                <div className="ch1-contr-bar-track">
                  <div className="ch1-contr-center-line" />
                  <div
                    className={`ch1-contr-fill ${temp >= 0 ? 'positive' : 'negative'}`}
                    style={{
                      width: `${getBarPercent(temp)}%`,
                      left: temp >= 0 ? '50%' : `${50 - getBarPercent(temp)}%`,
                    }}
                  />
                </div>
                <span className="ch1-contr-val" style={{ color: temp >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {temp >= 0 ? `+${temp.toFixed(2)}` : temp.toFixed(2)}
                </span>
              </div>

              {/* Radiation contribution */}
              <div className="ch1-contr-row">
                <span className="ch1-contr-label">Rad ({activeScenario.inputs.radiation}×{weights.w3}):</span>
                <div className="ch1-contr-bar-track">
                  <div className="ch1-contr-center-line" />
                  <div
                    className={`ch1-contr-fill ${radiation >= 0 ? 'positive' : 'negative'}`}
                    style={{
                      width: `${getBarPercent(radiation)}%`,
                      left: radiation >= 0 ? '50%' : `${50 - getBarPercent(radiation)}%`,
                    }}
                  />
                </div>
                <span className="ch1-contr-val" style={{ color: radiation >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {radiation >= 0 ? `+${radiation.toFixed(2)}` : radiation.toFixed(2)}
                </span>
              </div>

              {/* Bias contribution */}
              {isBiasUnlocked && (
                <div className="ch1-contr-row">
                  <span className="ch1-contr-label">Bias offset:</span>
                  <div className="ch1-contr-bar-track">
                    <div className="ch1-contr-center-line" />
                    <div
                      className={`ch1-contr-fill ${bias >= 0 ? 'positive' : 'negative'}`}
                      style={{
                        width: `${getBarPercent(bias)}%`,
                        left: bias >= 0 ? '50%' : `${50 - getBarPercent(bias)}%`,
                      }}
                    />
                  </div>
                  <span className="ch1-contr-val" style={{ color: bias >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                    {bias >= 0 ? `+${bias.toFixed(2)}` : bias.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT: Controls & Formula */}
        <section className="ch1-panel" aria-label="Neuron Controls">
          <div className="ch1-panel-header">
            <span>Parameters</span>
            <button
              type="button"
              className="ch1-btn-ghost"
              style={{ padding: '2px 8px', minHeight: '26px', fontSize: '12px' }}
              onClick={() => setShowHelpModal(true)}
              aria-label="View Concept Help"
            >
              ? Help
            </button>
          </div>

          <div className="ch1-controls-content">
            {/* Slider 1: Air Weight */}
            <div className="ch1-slider-group">
              <div className="ch1-slider-header">
                <label htmlFor={airSliderId}>
                  {phase === 'phaseA' ? 'Air connection' : 'Weight: Air (w1)'}
                </label>
                <span className="ch1-slider-val" style={{ color: weights.w1 >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {weights.w1 >= 0 ? `+${weights.w1.toFixed(1)}` : weights.w1.toFixed(1)}
                </span>
              </div>
              <input
                id={airSliderId}
                type="range"
                min="-2.0"
                max="2.0"
                step="0.1"
                value={weights.w1}
                className="ch1-range-input"
                aria-label="Air connection weight slider"
                onFocus={() => setActiveSlider('w1')}
                onBlur={() => setActiveSlider(null)}
                onChange={(e) => handleSliderChange('w1', parseFloat(e.target.value))}
              />
            </div>

            {/* Slider 2: Temp Weight */}
            <div className="ch1-slider-group">
              <div className="ch1-slider-header">
                <label htmlFor={tempSliderId}>
                  {phase === 'phaseA' ? 'Temperature connection' : 'Weight: Temp (w2)'}
                </label>
                <span className="ch1-slider-val" style={{ color: weights.w2 >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {weights.w2 >= 0 ? `+${weights.w2.toFixed(1)}` : weights.w2.toFixed(1)}
                </span>
              </div>
              <input
                id={tempSliderId}
                type="range"
                min="-2.0"
                max="2.0"
                step="0.1"
                value={weights.w2}
                className="ch1-range-input"
                aria-label="Temperature connection weight slider"
                onFocus={() => setActiveSlider('w2')}
                onBlur={() => setActiveSlider(null)}
                onChange={(e) => handleSliderChange('w2', parseFloat(e.target.value))}
              />
            </div>

            {/* Slider 3: Radiation Weight */}
            <div className="ch1-slider-group">
              <div className="ch1-slider-header">
                <label htmlFor={radSliderId}>
                  {phase === 'phaseA' ? 'Radiation connection' : 'Weight: Radiation (w3)'}
                </label>
                <span className="ch1-slider-val" style={{ color: weights.w3 >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {weights.w3 >= 0 ? `+${weights.w3.toFixed(1)}` : weights.w3.toFixed(1)}
                </span>
              </div>
              <input
                id={radSliderId}
                type="range"
                min="-2.0"
                max="2.0"
                step="0.1"
                value={weights.w3}
                className="ch1-range-input"
                aria-label="Radiation connection weight slider"
                onFocus={() => setActiveSlider('w3')}
                onBlur={() => setActiveSlider(null)}
                onChange={(e) => handleSliderChange('w3', parseFloat(e.target.value))}
              />
            </div>

            {/* Slider 4: Bias */}
            <div className="ch1-slider-group" style={{ opacity: isBiasUnlocked ? 1 : 0.45 }}>
              <div className="ch1-slider-header">
                <label htmlFor={biasSliderId}>
                  {isBiasUnlocked ? 'Bias offset (b)' : '🔒 Bias (Unlocks Case 2)'}
                </label>
                <span className="ch1-slider-val" style={{ color: weights.b >= 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {weights.b >= 0 ? `+${weights.b.toFixed(1)}` : weights.b.toFixed(1)}
                </span>
              </div>
              <input
                id={biasSliderId}
                type="range"
                min="-2.0"
                max="2.0"
                step="0.1"
                disabled={!isBiasUnlocked}
                value={weights.b}
                className="ch1-range-input"
                aria-label="Neuron bias offset slider"
                onFocus={() => setActiveSlider('b')}
                onBlur={() => setActiveSlider(null)}
                onChange={(e) => handleSliderChange('b', parseFloat(e.target.value))}
              />
            </div>

            {/* Live Formula Box */}
            <div className="ch1-formula-box" role="region" aria-label="Live Equation">
              <div style={{ color: 'var(--ch1-text-muted)', fontSize: '12px', marginBottom: '4px' }}>
                LIVE COMPUTATION:
              </div>
              <div>
                sum ={' '}
                <span className={activeSlider === 'w1' ? 'ch1-formula-highlight' : ''}>
                  ({activeScenario.inputs.air} × {weights.w1 >= 0 ? `+${weights.w1.toFixed(1)}` : weights.w1.toFixed(1)})
                </span>{' '}
                +{' '}
                <span className={activeSlider === 'w2' ? 'ch1-formula-highlight' : ''}>
                  ({activeScenario.inputs.temp} × {weights.w2 >= 0 ? `+${weights.w2.toFixed(1)}` : weights.w2.toFixed(1)})
                </span>{' '}
                +{' '}
                <span className={activeSlider === 'w3' ? 'ch1-formula-highlight' : ''}>
                  ({activeScenario.inputs.radiation} × {weights.w3 >= 0 ? `+${weights.w3.toFixed(1)}` : weights.w3.toFixed(1)})
                </span>
                {isBiasUnlocked && (
                  <>
                    {' '}+{' '}
                    <span className={activeSlider === 'b' ? 'ch1-formula-highlight' : ''}>
                      ({weights.b >= 0 ? `+${weights.b.toFixed(1)}` : weights.b.toFixed(1)})
                    </span>
                  </>
                )}
                {' = '}
                <strong style={{ color: currentSum > 0 ? 'var(--ch1-cyan)' : 'var(--ch1-amber)' }}>
                  {currentSum > 0 ? `+${currentSum.toFixed(2)}` : currentSum.toFixed(2)}
                </strong>
              </div>
              <div style={{ marginTop: '8px' }}>
                threshold: sum &gt; 0 ? &quot;OPEN&quot; : &quot;SHUT&quot; ➔{' '}
                <strong style={{ color: decision === 'OPEN' ? 'var(--ch1-green)' : 'var(--ch1-red)' }}>
                  {decision}
                </strong>
              </div>
            </div>

            {/* Hint Trigger */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="ch1-btn-ghost"
                style={{ flex: 1 }}
                onClick={() => onHintRequested?.()}
              >
                💡 Need a Hint?
              </button>
              {activeHint?.includes('Reveal') && onSetAllWeights && (
                <button
                  type="button"
                  className="ch1-btn-accent"
                  style={{ fontSize: '13px' }}
                  onClick={() => onSetAllWeights(KNOWN_SOLUTION)}
                >
                  Reveal Working Setting
                </button>
              )}
            </div>

            {activeHint && (
              <div style={{ background: 'rgba(255, 178, 58, 0.15)', border: '1px solid var(--ch1-amber)', borderRadius: '4px', padding: '10px', fontSize: '13px', color: '#ffecbe' }}>
                {activeHint}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* BOTTOM: Result Strip */}
      <footer className="ch1-result-strip" role="region" aria-label="Scenario Result Strip">
        <div className="ch1-result-left">
          <span style={{ fontSize: '20px' }}>{activeScenario.icon}</span>
          <div>
            <strong>Case {activeScenario.id}: {activeScenario.name}</strong>
            <div style={{ fontSize: '13px', color: isPassed ? 'var(--ch1-green)' : 'var(--ch1-red)' }}>
              {activeEval.why}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div aria-live="polite" className={isPassed ? 'ch1-badge-pass' : 'ch1-badge-fail'}>
            {isPassed ? `PASS: ${decision} matches target` : `FAIL: got ${decision}, wanted ${activeScenario.expected}`}
          </div>
        </div>
      </footer>

      {/* Concept Help Modal */}
      {showHelpModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="The Neuron Concept Summary"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="ch1-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: 0, color: 'var(--ch1-cyan)' }}>🧠 The Single Neuron</h2>
            <p style={{ lineHeight: '1.6', fontSize: '16px' }}>
              <strong>1. Weighted Inputs:</strong> Each sensor measurement is multiplied by a connection weight. High weights make an input matter more; negative weights turn hazards into warnings.
            </p>
            <p style={{ lineHeight: '1.6', fontSize: '16px' }}>
              <strong>2. Summation &amp; Bias:</strong> All weighted pushes are summed together, plus a constant <em>bias</em>. A negative bias makes the neuron cautious, requiring overwhelming positive evidence to open.
            </p>
            <p style={{ lineHeight: '1.6', fontSize: '16px' }}>
              <strong>3. Threshold Decision:</strong> If the grand sum is greater than zero, the neuron triggers <strong>OPEN</strong>; otherwise, it remains <strong>SHUT</strong>.
            </p>
            <button
              type="button"
              className="ch1-btn-accent"
              onClick={() => setShowHelpModal(false)}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
