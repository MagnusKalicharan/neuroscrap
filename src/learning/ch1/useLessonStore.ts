import { useSyncExternalStore } from 'react';
import { DEFAULT_WEIGHTS } from './scenarios.ts';
import type { Weights } from './neuronMath.ts';

export type LessonPhase =
  | 'phaseA'  // Free play (Case 1, 3 weights enabled, no jargon)
  | 'phaseB'  // Naming toast (after 3 moves, reveals terms)
  | 'phaseC'  // Bias unlocked (Case 2, discovering weights alone aren't enough)
  | 'phaseD'  // Challenge (All 6 cases, target 6/6)
  | 'phaseE'  // Quiz (3 conceptual questions)
  | 'phaseF'  // Live airlock payoff (radiation storm)
  | 'completed'; // Summary modal

export interface Chapter1State {
  phase: LessonPhase;
  weights: Weights;
  selectedCaseId: number;
  sliderMoveCount: number;
  attempts: number;
  hintsUsed: number;
  activeHint: string | null;
  quizIndex: number;
  quizAnswers: Record<string, string>;
  quizAttempts: number;
  quizPassed: boolean;
  timeSpentSec: number;
  completed: boolean;
  trustChoice: 'neuron' | 'oracle' | null;
  reduceMotion: boolean;
}

const STORAGE_KEY = 'ch1_lesson_state_v1';

const defaultState: Chapter1State = {
  phase: 'phaseA',
  weights: { ...DEFAULT_WEIGHTS },
  selectedCaseId: 1,
  sliderMoveCount: 0,
  attempts: 0,
  hintsUsed: 0,
  activeHint: null,
  quizIndex: 0,
  quizAnswers: {},
  quizAttempts: 0,
  quizPassed: false,
  timeSpentSec: 0,
  completed: false,
  trustChoice: null,
  reduceMotion: false,
};

function loadStoredState(): Chapter1State {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
      weights: {
        ...defaultState.weights,
        ...(parsed.weights || {}),
      },
      quizAnswers: parsed.quizAnswers || {},
    };
  } catch {
    return defaultState;
  }
}

function persistState(state: Chapter1State) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Fail safe
  }
}

let currentState: Chapter1State = loadStoredState();
const listeners = new Set<() => void>();

function notify() {
  persistState(currentState);
  listeners.forEach((listener) => listener());
}

export const lessonStore = {
  getState(): Chapter1State {
    return currentState;
  },

  setPhase(phase: LessonPhase) {
    currentState = { ...currentState, phase };
    notify();
  },

  setWeight(key: keyof Weights, value: number) {
    const rounded = Math.round(value * 10) / 10;
    const clamped = Math.max(-2, Math.min(2, rounded));
    const newWeights = { ...currentState.weights, [key]: clamped };
    const newMoveCount = currentState.sliderMoveCount + 1;

    let newPhase = currentState.phase;
    // Advance from phaseA to phaseB after 3 moves
    if (newPhase === 'phaseA' && newMoveCount >= 3) {
      newPhase = 'phaseB';
    }

    currentState = {
      ...currentState,
      weights: newWeights,
      sliderMoveCount: newMoveCount,
      attempts: currentState.attempts + 1,
      phase: newPhase,
    };
    notify();
  },

  setAllWeights(weights: Weights) {
    currentState = {
      ...currentState,
      weights: { ...weights },
      attempts: currentState.attempts + 1,
    };
    notify();
  },

  setSelectedCaseId(id: number) {
    currentState = { ...currentState, selectedCaseId: id };
    notify();
  },

  incrementHints() {
    currentState = {
      ...currentState,
      hintsUsed: currentState.hintsUsed + 1,
    };
    notify();
  },

  setActiveHint(hint: string | null) {
    currentState = { ...currentState, activeHint: hint };
    notify();
  },

  setQuizAnswer(questionId: string, optionId: string) {
    currentState = {
      ...currentState,
      quizAnswers: { ...currentState.quizAnswers, [questionId]: optionId },
    };
    notify();
  },

  incrementQuizAttempts() {
    currentState = {
      ...currentState,
      quizAttempts: currentState.quizAttempts + 1,
    };
    notify();
  },

  setQuizIndex(index: number) {
    currentState = { ...currentState, quizIndex: index };
    notify();
  },

  setQuizPassed(passed: boolean) {
    currentState = { ...currentState, quizPassed: passed };
    notify();
  },

  setTrustChoice(choice: 'neuron' | 'oracle' | null) {
    currentState = { ...currentState, trustChoice: choice };
    notify();
  },

  markCompleted() {
    currentState = {
      ...currentState,
      completed: true,
      phase: 'completed',
    };
    notify();
  },

  tickTime() {
    currentState = {
      ...currentState,
      timeSpentSec: currentState.timeSpentSec + 1,
    };
    // Save periodically or at phase changes, don't spam disk on every tick
    listeners.forEach((listener) => listener());
  },

  setReduceMotion(reduce: boolean) {
    currentState = { ...currentState, reduceMotion: reduce };
    notify();
  },

  resetLesson() {
    currentState = {
      ...defaultState,
      reduceMotion: currentState.reduceMotion,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    notify();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** React hook consuming the store */
export function useLessonStore(): Chapter1State {
  return useSyncExternalStore(
    lessonStore.subscribe,
    lessonStore.getState,
    () => defaultState
  );
}

/** Teacher Summary */
export function getChapter1Summary() {
  const state = lessonStore.getState();
  return {
    completed: state.completed,
    timeSpentSec: state.timeSpentSec,
    attempts: state.attempts,
    hintsUsed: state.hintsUsed,
    quizAttempts: state.quizAttempts,
    finalWeights: state.weights,
  };
}
