'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { NeuronLab } from './NeuronLab.tsx';
import { useLessonStore, lessonStore, LessonPhase } from './useLessonStore.ts';
import { SCENARIOS, KNOWN_SOLUTION } from './scenarios.ts';
import { evaluateAllCases, computeNeuron } from './neuronMath.ts';
import { ch1Sounds } from './sound.ts';
import dialogueData from './dialogue.json';
import quizData from './quiz.json';
import './ch1.css';

export interface Chapter1OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onChapterComplete?: (chapterId: string) => void;
  onPayoffTriggered?: () => void;
}

interface DialogueLine {
  speaker: string;
  text: string;
  expression?: string;
}

export const Chapter1Overlay: React.FC<Chapter1OverlayProps> = ({
  isOpen,
  onClose,
  onChapterComplete,
  onPayoffTriggered,
}) => {
  const store = useLessonStore();
  const [currentDialogue, setCurrentDialogue] = useState<DialogueLine | null>(null);
  const [dialogueQueue, setDialogueQueue] = useState<DialogueLine[]>([]);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [showQuizExplanation, setShowQuizExplanation] = useState(false);
  const [payoffFailed, setPayoffFailed] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Release pointer lock immediately when overlay opens
  useEffect(() => {
    if (isOpen) {
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        document.exitPointerLock();
      }
      ch1Sounds.terminalBoot();
    }
  }, [isOpen]);

  // Periodic time tick for lesson stats
  useEffect(() => {
    if (!isOpen || store.completed) return;
    const interval = setInterval(() => {
      lessonStore.tickTime();
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, store.completed]);

  // Initial Dialogue triggers based on phase
  useEffect(() => {
    if (!isOpen) return;

    if (store.phase === 'phaseA' && store.sliderMoveCount === 0) {
      // Start with Beat 1 & Beat 2
      const queue = [
        ...dialogueData.beat1,
        ...dialogueData.beat2,
        ...dialogueData.beat3,
      ];
      setDialogueQueue(queue.slice(1));
      setCurrentDialogue(queue[0]);
    } else if (store.phase === 'phaseB') {
      setToastMessage('You just changed a WEIGHT: the strength of one connection!');
      const queue = [...dialogueData.beat4];
      setDialogueQueue(queue.slice(1));
      setCurrentDialogue(queue[0]);
    } else if (store.phase === 'phaseC') {
      setToastMessage('Bias unlocked: Bias shifts how easily the neuron says OPEN even before looking at inputs.');
    }
  }, [isOpen, store.phase, store.sliderMoveCount]);

  // Typewriter effect for current dialogue line
  useEffect(() => {
    if (!currentDialogue) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    if (store.reduceMotion) {
      setDisplayedText(currentDialogue.text);
      setIsTyping(false);
      return;
    }

    const fullText = currentDialogue.text;
    let charIndex = 0;
    setDisplayedText('');
    setIsTyping(true);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      charIndex++;
      setDisplayedText(fullText.slice(0, charIndex));
      if (charIndex >= fullText.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTyping(false);
      }
    }, 25);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentDialogue, store.reduceMotion]);

  // Handle advancing dialogue
  const advanceDialogue = () => {
    if (isTyping && currentDialogue) {
      // Skip typewriter animation
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedText(currentDialogue.text);
      setIsTyping(false);
      return;
    }

    if (dialogueQueue.length > 0) {
      const next = dialogueQueue[0];
      setDialogueQueue(dialogueQueue.slice(1));
      setCurrentDialogue(next);
    } else {
      setCurrentDialogue(null);
    }
  };

  // Keyboard navigation: Escape closes overlay, Space/Enter advances dialogue
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (currentDialogue) {
          e.preventDefault();
          advanceDialogue();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentDialogue, isTyping, dialogueQueue, onClose]);

  // Hint handler
  const handleHintRequest = () => {
    if (store.hintsUsed === 0) {
      lessonStore.setActiveHint('Radiation is dangerous. Should its weight push toward OPEN or toward SHUT?');
    } else if (store.hintsUsed === 1) {
      lessonStore.setActiveHint('Air quality matters most. Try giving it the biggest weight.');
    } else {
      lessonStore.setActiveHint('Reveal a working setting: w=(1.5, 1.0, -1.5), b=-1.2. (Other settings can work too!)');
    }
    lessonStore.incrementHints();
  };

  // Quiz Handling
  const currentQuiz = quizData[store.quizIndex] || quizData[0];
  const shuffledOptions = useMemo(() => {
    return [...currentQuiz.options].sort(() => 0.5 - Math.random());
  }, [store.quizIndex]);

  const handleSelectQuizOption = (optId: string) => {
    setSelectedQuizOption(optId);
    setShowQuizExplanation(true);
    lessonStore.setQuizAnswer(currentQuiz.id, optId);
    lessonStore.incrementQuizAttempts();

    const opt = currentQuiz.options.find((o) => o.id === optId);
    if (opt?.isCorrect) {
      ch1Sounds.quizRight();
    } else {
      ch1Sounds.quizWrong();
    }
  };

  const handleNextQuizQuestion = () => {
    setSelectedQuizOption(null);
    setShowQuizExplanation(false);
    if (store.quizIndex + 1 < quizData.length) {
      lessonStore.setQuizIndex(store.quizIndex + 1);
    } else {
      // Quiz complete!
      lessonStore.setQuizPassed(true);
      lessonStore.setPhase('phaseF');
    }
  };

  // Live sensors for Payoff (Phase F)
  const payoffSensors = { air: 0.9, temp: 0.8, radiation: 0.9 };
  const scrapDecision = computeNeuron(payoffSensors, store.weights);

  const handleTrustNeuron = () => {
    ch1Sounds.airlockClunk();
    ch1Sounds.casePass();
    setPayoffFailed(false);
    onPayoffTriggered?.();

    // Trigger payoff dialogue
    const lines = dialogueData.beat5_oracle_wrong;
    setCurrentDialogue(lines[0]);
    setDialogueQueue(lines.slice(1));

    lessonStore.setTrustChoice('neuron');
    lessonStore.markCompleted();
    onChapterComplete?.('ch1');
  };

  const handleTrustOracle = () => {
    ch1Sounds.caseFail();
    setPayoffFailed(true);
    lessonStore.setTrustChoice('oracle');
    const lines = dialogueData.beat5_fail_retry;
    setCurrentDialogue(lines[0]);
    setDialogueQueue([]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`ch1-overlay-root ${store.reduceMotion ? 'ch1-reduced-motion' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Chapter 1: The Neuron Interactive Lesson"
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="ch1-toast" role="status">
          <span style={{ fontSize: '20px' }}>⚡</span>
          <span style={{ flex: 1, fontSize: '15px' }}>{toastMessage}</span>
          <button
            type="button"
            className="ch1-btn-ghost"
            style={{ minHeight: '30px', padding: '2px 8px' }}
            onClick={() => setToastMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="ch1-header">
        <div className="ch1-title-group">
          <span className="ch1-badge-phase">
            {store.phase === 'phaseA' && 'Phase A: Free Play'}
            {store.phase === 'phaseB' && 'Phase B: Naming Parts'}
            {store.phase === 'phaseC' && 'Phase C: The Bias'}
            {store.phase === 'phaseD' && 'Phase D: 6-Case Challenge'}
            {store.phase === 'phaseE' && 'Phase E: Assessment Quiz'}
            {store.phase === 'phaseF' && 'Phase F: Live Airlock Payoff'}
            {store.phase === 'completed' && 'Chapter 1: Complete'}
          </span>
          <h1 className="ch1-title">CHAPTER 1: THE NEURON</h1>
        </div>

        <div className="ch1-header-actions">
          {/* Phase progress shortcuts for quick testing */}
          {store.phase === 'phaseB' && (
            <button
              type="button"
              className="ch1-btn-accent"
              style={{ fontSize: '13px' }}
              onClick={() => {
                lessonStore.setPhase('phaseC');
                lessonStore.setSelectedCaseId(2);
              }}
            >
              Continue to Case 2 ➔
            </button>
          )}

          {store.phase === 'phaseC' && (
            <button
              type="button"
              className="ch1-btn-accent"
              style={{ fontSize: '13px' }}
              onClick={() => lessonStore.setPhase('phaseD')}
            >
              Unlock All 6 Cases ➔
            </button>
          )}

          {store.phase === 'phaseD' && evaluateAllCases(SCENARIOS, store.weights).allPassed && (
            <button
              type="button"
              className="ch1-btn-accent"
              style={{ fontSize: '13px' }}
              onClick={() => lessonStore.setPhase('phaseE')}
            >
              Proceed to Quiz ➔
            </button>
          )}

          {/* Reduce motion toggle */}
          <button
            type="button"
            className="ch1-btn-ghost"
            style={{ fontSize: '13px' }}
            onClick={() => lessonStore.setReduceMotion(!store.reduceMotion)}
            aria-pressed={store.reduceMotion}
          >
            {store.reduceMotion ? '⚡ Motion: Reduced' : '⚡ Motion: Full'}
          </button>

          {/* Reset Lesson */}
          <button
            type="button"
            className="ch1-btn-ghost"
            style={{ fontSize: '13px' }}
            onClick={() => {
              if (window.confirm('Reset Chapter 1 progress?')) {
                lessonStore.resetLesson();
              }
            }}
          >
            Reset
          </button>

          {/* Close Overlay (ESC) */}
          <button
            type="button"
            className="ch1-btn-ghost"
            onClick={onClose}
            aria-label="Close terminal and return to ship"
          >
            Close (Esc) ✕
          </button>
        </div>
      </header>

      {/* Main Content Area: Varies by Phase */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Phases A to D: Neuron Lab */}
        {(store.phase === 'phaseA' ||
          store.phase === 'phaseB' ||
          store.phase === 'phaseC' ||
          store.phase === 'phaseD') && (
          <NeuronLab
            weights={store.weights}
            onWeightChange={(key, val) => lessonStore.setWeight(key, val)}
            onSetAllWeights={(w) => lessonStore.setAllWeights(w)}
            selectedCaseId={store.selectedCaseId}
            onSelectCase={(id) => lessonStore.setSelectedCaseId(id)}
            phase={store.phase}
            reduceMotion={store.reduceMotion}
            activeHint={store.activeHint}
            onHintRequested={handleHintRequest}
            onAllPassed={() => {
              setToastMessage('🎉 All 6 Scenarios Solved! Ready for the Quiz.');
            }}
          />
        )}

        {/* Phase E: Quiz Modal */}
        {store.phase === 'phaseE' && (
          <div style={{ padding: '32px 24px', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div className="ch1-modal-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--ch1-cyan)', fontFamily: 'var(--ch1-font-mono)', fontSize: '14px' }}>
                  QUESTION {store.quizIndex + 1} OF {quizData.length}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--ch1-text-muted)' }}>
                  Attempts: {store.quizAttempts}
                </span>
              </div>

              <h2 style={{ fontSize: '20px', margin: 0, color: '#fff' }}>
                {currentQuiz.question}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {shuffledOptions.map((opt) => {
                  const isSelected = selectedQuizOption === opt.id;
                  let btnClass = 'ch1-quiz-opt';
                  if (showQuizExplanation && isSelected) {
                    btnClass += opt.isCorrect ? ' selected-correct' : ' selected-incorrect';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={showQuizExplanation && opt.isCorrect}
                      className={btnClass}
                      onClick={() => handleSelectQuizOption(opt.id)}
                    >
                      <span style={{ fontWeight: 'bold', fontFamily: 'var(--ch1-font-mono)', color: 'var(--ch1-cyan)' }}>
                        {opt.id.toUpperCase()}.
                      </span>
                      <span style={{ flex: 1 }}>{opt.text}</span>
                      {showQuizExplanation && isSelected && (
                        <span>{opt.isCorrect ? '✓' : '✕'}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Inline Explanation */}
              {showQuizExplanation && (
                <div style={{ background: 'rgba(18, 27, 41, 0.9)', border: '1px solid var(--ch1-panel-border)', borderRadius: '6px', padding: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--ch1-cyan)', marginBottom: '4px' }}>
                    WHY:
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: '1.5' }}>
                    {currentQuiz.options.find((o) => o.id === selectedQuizOption)?.feedback || currentQuiz.explanation}
                  </div>
                </div>
              )}

              {/* Next Question / Retry Button */}
              {showQuizExplanation && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  {currentQuiz.options.find((o) => o.id === selectedQuizOption)?.isCorrect ? (
                    <button
                      type="button"
                      className="ch1-btn-accent"
                      onClick={handleNextQuizQuestion}
                    >
                      {store.quizIndex + 1 < quizData.length ? 'Next Question ➔' : 'Proceed to Live Airlock Sensors ➔'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ch1-btn-ghost"
                      onClick={() => setShowQuizExplanation(false)}
                    >
                      Try Another Option ↺
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase F: Live Airlock Payoff */}
        {store.phase === 'phaseF' && (
          <div style={{ padding: '32px 24px', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div className="ch1-modal-card" style={{ maxWidth: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--ch1-amber)', fontFamily: 'var(--ch1-font-mono)', fontWeight: 'bold' }}>
                  ⚠️ LIVE SHIP SENSORS // AIRLOCK STATUS
                </span>
                <span className="ch1-badge-fail">ALERT: SENSOR CONFLICT</span>
              </div>

              <p style={{ margin: 0, fontSize: '16px', color: '#cfd9e6' }}>
                Sensors are measuring live planetary conditions right outside the bridge airlock:
              </p>

              {/* Sensor Readings Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '6px', border: '1px solid var(--ch1-panel-border)' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ch1-text-muted)' }}>AIR QUALITY</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--ch1-cyan)' }}>0.9 (90% Clean)</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ch1-text-muted)' }}>TEMPERATURE</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--ch1-cyan)' }}>0.8 (Comfortable)</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ch1-text-muted)' }}>COSMIC RADIATION</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--ch1-red)' }}>0.9 (LETHAL STORM)</div>
                </div>
              </div>

              {/* Conflicting Diagnoses */}
              <div className="ch1-payoff-grid">
                {/* ORACLE Diagnosis */}
                <div style={{ background: 'rgba(255, 77, 90, 0.1)', border: '1px solid var(--ch1-red)', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--ch1-red)', marginBottom: '6px' }}>
                    🤖 ORACLE (Fragmented Ship AI):
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                    DECISION: OPEN (SAFE)
                  </div>
                  <div style={{ fontSize: '14px', color: '#ffb3ba' }}>
                    &quot;Air is 90% clean and temperature is mild. Proceed outside immediately.&quot;
                  </div>
                </div>

                {/* SCRAP Neuron Diagnosis */}
                <div style={{ background: 'rgba(68, 230, 255, 0.1)', border: '1px solid var(--ch1-cyan)', borderRadius: '6px', padding: '16px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--ch1-cyan)', marginBottom: '6px' }}>
                    🧠 SCRAP (Repaired Neuron):
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: scrapDecision.decision === 'SHUT' ? 'var(--ch1-green)' : 'var(--ch1-red)', marginBottom: '8px' }}>
                    DECISION: {scrapDecision.decision} (Sum: {scrapDecision.sum.toFixed(2)})
                  </div>
                  <div style={{ fontSize: '14px', color: '#c4f3ff' }}>
                    {scrapDecision.decision === 'SHUT' ? (
                      'Negative radiation push successfully overrides pleasant air & temp. Airlock must remain SHUT.'
                    ) : (
                      'Neuron weights allowed OPEN! Return to the lab to strengthen negative radiation weight.'
                    )}
                  </div>
                </div>
              </div>

              {payoffFailed && (
                <div style={{ background: 'rgba(255, 77, 90, 0.25)', border: '1px solid var(--ch1-red)', borderRadius: '6px', padding: '12px', color: '#fff' }}>
                  💥 <strong>DISASTER AVERTED BY EMERGENCY BACKUP:</strong> Radiation flare scorched the airlock outer seals! ORACLE was wrong. Trust your neuron!
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="ch1-btn-ghost"
                  style={{ color: 'var(--ch1-amber)', borderColor: 'var(--ch1-amber)' }}
                  onClick={handleTrustOracle}
                >
                  Trust ORACLE (OPEN Airlock)
                </button>
                <button
                  type="button"
                  className="ch1-btn-accent"
                  style={{ background: 'var(--ch1-green)', borderColor: 'var(--ch1-green)', color: '#03060c' }}
                  onClick={handleTrustNeuron}
                >
                  Trust SCRAP&apos;s Neuron (KEEP AIRLOCK SHUT) ✓
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase Completed: "What You Learned" Summary */}
        {store.phase === 'completed' && (
          <div style={{ padding: '32px 24px', display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div className="ch1-modal-card" style={{ maxWidth: '640px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '42px' }}>🎉</span>
                <h2 style={{ fontSize: '24px', color: 'var(--ch1-green)', margin: '8px 0' }}>
                  CHAPTER 1 COMPLETE!
                </h2>
                <p style={{ color: 'var(--ch1-text-muted)', fontSize: '15px' }}>
                  Airlock safely sealed. Bridge terminal core recalibrated.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--ch1-panel-border)', borderRadius: '6px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--ch1-cyan)' }}>
                  WHAT YOU LEARNED:
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', fontSize: '15px' }}>
                  <li>
                    <strong>The Artificial Neuron:</strong> Multiplies each sensor input by a weight, adds a bias offset, and checks if the sum crosses a threshold.
                  </li>
                  <li>
                    <strong>Weights (Connection Strengths):</strong> Determine how much each input matters. Negative weights turn hazards into warnings that push toward SHUT.
                  </li>
                  <li>
                    <strong>Bias (Decision Shift):</strong> Adjusts the baseline willingness to say OPEN, making the system cautious even when inputs look calm.
                  </li>
                </ul>
              </div>

              {/* Teacher Summary Statistics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center', background: 'rgba(18,27,41,0.5)', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ch1-text-muted)' }}>TIME SPENT</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{store.timeSpentSec}s</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ch1-text-muted)' }}>SLIDER MOVES</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{store.sliderMoveCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ch1-text-muted)' }}>QUIZ ATTEMPTS</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{store.quizAttempts}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="ch1-btn-ghost"
                  onClick={onClose}
                >
                  Return to Ship
                </button>
                <button
                  type="button"
                  className="ch1-btn-accent"
                  onClick={() => {
                    alert('Chapter 2: Activation Functions (Coming Soon!)');
                    onClose();
                  }}
                >
                  Next: Chapter 2 (Coming Soon) ➔
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM: Typewriter Dialogue Box */}
      {currentDialogue && (
        <section className="ch1-dialogue-bar" role="region" aria-label="Dialogue Transmission">
          <div style={{ flex: 1 }}>
            <div className="ch1-dialogue-speaker">
              {currentDialogue.speaker === 'ORACLE' ? '🤖 ORACLE [Ship AI]' : '🛠️ SCRAP [Maintenance Bot]'}
            </div>
            <div className="ch1-dialogue-text">
              {displayedText}
              {isTyping && <span style={{ color: 'var(--ch1-cyan)' }}>▊</span>}
            </div>
          </div>

          <div className="ch1-dialogue-controls">
            <button
              type="button"
              className="ch1-btn-ghost"
              style={{ fontSize: '13px' }}
              onClick={() => {
                // Clear queue immediately
                setDialogueQueue([]);
                setCurrentDialogue(null);
              }}
            >
              Skip
            </button>
            <button
              type="button"
              className="ch1-btn-accent"
              style={{ fontSize: '14px' }}
              onClick={advanceDialogue}
            >
              {isTyping ? 'Fast-forward' : dialogueQueue.length > 0 ? 'Next (Space) ➔' : 'Dismiss (Space) ✓'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
