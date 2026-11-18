/**
 * section4Store.ts — Section 4 Part 1 Reactive State Manager
 * ============================================================
 * Manages:
 * - Current screen: 'ports' | 'lab'
 * - Data ports state: inputMounted, outputMounted, file names, preview rows
 * - Neural lab training state: epoch, loss, accuracy, completion flag
 * - Captions seen flags so pedagogical captions don't repeat annoyingly
 * - Persistence to localStorage with useSyncExternalStore
 */

import { useSyncExternalStore, useEffect } from "react";
import { generateSignalData, type DataPoint } from "./nn/index";

export interface PreviewRow {
  row: number;
  brightness: number;
  steadyBeat: number;
  label: "NATURAL" | "MACHINE";
}

export interface SectionFourState {
  screen: "ports" | "lab";
  portsState: {
    inputMounted: boolean;
    outputMounted: boolean;
    inputFileName: string | null;
    outputFileName: string | null;
    selectedPort: "input" | "output";
    selectedFileIndex: number;
    previewRows: PreviewRow[];
  };
  labState: {
    epoch: number;
    isPlaying: boolean;
    testLoss: number;
    trainLoss: number;
    testAccuracy: number;
    isComplete: boolean;
  };
  captionsSeen: {
    portsMounted: boolean;
    labOpen: boolean;
    firstPause: boolean;
    lossBelow12: boolean;
    trainingComplete: boolean;
  };
}

const STORAGE_KEY = "neuro_scrap_section4_v1";

// Generate canonical preview rows from seed 42
function getCanonicalPreviewRows(): PreviewRow[] {
  const pts = generateSignalData(42, 0);
  return pts.slice(0, 6).map((p, idx) => ({
    row: idx + 1,
    brightness: p.rawX ?? (p.x + 1) / 2,
    steadyBeat: p.rawY ?? (p.y + 1) / 2,
    label: p.label === 1 ? "MACHINE" : "NATURAL",
  }));
}

const DEFAULT_STATE: SectionFourState = {
  screen: "ports",
  portsState: {
    inputMounted: false,
    outputMounted: false,
    inputFileName: null,
    outputFileName: null,
    selectedPort: "input",
    selectedFileIndex: 0,
    previewRows: [],
  },
  labState: {
    epoch: 0,
    isPlaying: false,
    testLoss: 0.59,
    trainLoss: 0.595,
    testAccuracy: 0.21,
    isComplete: false,
  },
  captionsSeen: {
    portsMounted: false,
    labOpen: false,
    firstPause: false,
    lossBelow12: false,
    trainingComplete: false,
  },
};

let currentState: SectionFourState = { ...DEFAULT_STATE };
const listeners = new Set<() => void>();

function emitChange() {
  saveToStorage();
  listeners.forEach((l) => l());
}

function saveToStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch {
    // Ignore storage quota
  }
}

function loadFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<SectionFourState>;
    if (parsed && typeof parsed === "object") {
      currentState = {
        ...DEFAULT_STATE,
        ...parsed,
        portsState: {
          ...DEFAULT_STATE.portsState,
          ...(parsed.portsState || {}),
        },
        labState: {
          ...DEFAULT_STATE.labState,
          ...(parsed.labState || {}),
        },
        captionsSeen: {
          ...DEFAULT_STATE.captionsSeen,
          ...(parsed.captionsSeen || {}),
        },
      };
      return true;
    }
  } catch {
    // Corrupt storage fallback
  }
  return false;
}

export const section4Store = {
  getState(): SectionFourState {
    return currentState;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setScreen(screen: "ports" | "lab") {
    currentState = {
      ...currentState,
      screen,
    };
    emitChange();
  },

  setSelectedPort(port: "input" | "output") {
    currentState = {
      ...currentState,
      portsState: {
        ...currentState.portsState,
        selectedPort: port,
      },
    };
    emitChange();
  },

  setSelectedFileIndex(idx: number) {
    currentState = {
      ...currentState,
      portsState: {
        ...currentState.portsState,
        selectedFileIndex: idx,
      },
    };
    emitChange();
  },

  mountInputPort(fileName: string) {
    const bothNowMounted = currentState.portsState.outputMounted;
    currentState = {
      ...currentState,
      portsState: {
        ...currentState.portsState,
        inputMounted: true,
        inputFileName: fileName,
        previewRows: bothNowMounted ? getCanonicalPreviewRows() : [],
      },
    };
    emitChange();
  },

  mountOutputPort(fileName: string) {
    const bothNowMounted = currentState.portsState.inputMounted;
    currentState = {
      ...currentState,
      portsState: {
        ...currentState.portsState,
        outputMounted: true,
        outputFileName: fileName,
        previewRows: bothNowMounted ? getCanonicalPreviewRows() : [],
      },
    };
    emitChange();
  },

  unmountPort(port: "input" | "output") {
    currentState = {
      ...currentState,
      portsState: {
        ...currentState.portsState,
        ...(port === "input"
          ? { inputMounted: false, inputFileName: null }
          : { outputMounted: false, outputFileName: null }),
        previewRows: [],
      },
    };
    emitChange();
  },

  updateLabState(updates: Partial<SectionFourState["labState"]>) {
    currentState = {
      ...currentState,
      labState: {
        ...currentState.labState,
        ...updates,
      },
    };
    emitChange();
  },

  markCaptionSeen(key: keyof SectionFourState["captionsSeen"]) {
    currentState = {
      ...currentState,
      captionsSeen: {
        ...currentState.captionsSeen,
        [key]: true,
      },
    };
    emitChange();
  },

  resetSection() {
    currentState = { ...DEFAULT_STATE };
    emitChange();
  },

  reset() {
    currentState = { ...DEFAULT_STATE };
    emitChange();
  },
};

/**
 * React Hook for consuming section 4 store state
 */
export function useSection4Store(): SectionFourState {
  useEffect(() => {
    loadFromStorage();
    listeners.forEach((l) => l());
  }, []);

  return useSyncExternalStore(
    section4Store.subscribe,
    section4Store.getState,
    () => DEFAULT_STATE
  );
}
