/**
 * telemetryStore.ts — Physical Telemetry Chip / Pendrive State Manager
 * ====================================================================
 * Manages the data collected onto SCRAP's physical telemetry pendrive
 * when scanning the celestial sky (Black Hole, Planets, Distant Stars).
 * 
 * Supports full data persistence, evaluation of Sampling Bias vs
 * Representative Sample, and reactive state hooks via useSyncExternalStore.
 */
import { useSyncExternalStore } from "react";

export type CelestialCategory = "black_hole" | "planet" | "stars";

export interface TelemetryScan {
  id: string;
  filename: string;
  targetName: string;
  category: CelestialCategory;
  gravity: number; // 0.0 to 1.0 (Black Hole ~0.98, Planets ~0.44, Stars ~0.02)
  elevationDeg: number;
  azimuthDeg: number;
  timestamp: string;
  imageDataUrl?: string;
}

export type AnalysisOutcome = "sampling_bias" | "representative_sample" | null;

export interface TelemetryState {
  scans: TelemetryScan[];
  maxScans: number;
  terminalOpen: boolean;
  pendriveMounted: boolean;
  analysisOutcome: AnalysisOutcome;
  biasMessage: string | null;
  activeDialogueKey: "briefing" | "bias_failure" | "representative_success" | null;
  dialogueIndex: number;
}

const STORAGE_KEY = "neuroscrap_telemetry_pendrive_v1";

const DEFAULT_STATE: TelemetryState = {
  scans: [],
  maxScans: 10,
  terminalOpen: false,
  pendriveMounted: false,
  analysisOutcome: null,
  biasMessage: null,
  activeDialogueKey: null,
  dialogueIndex: 0,
};

let currentState: TelemetryState = loadState();
const listeners = new Set<() => void>();

function notify() {
  saveState();
  listeners.forEach((l) => l());
}

function loadState(): TelemetryState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      scans: Array.isArray(parsed.scans) ? parsed.scans : [],
      maxScans: 10,
      terminalOpen: false,
      pendriveMounted: Boolean(parsed.pendriveMounted ?? false),
      analysisOutcome: parsed.analysisOutcome || null,
      biasMessage: parsed.biasMessage || null,
      activeDialogueKey: parsed.activeDialogueKey || null,
      dialogueIndex: typeof parsed.dialogueIndex === "number" ? parsed.dialogueIndex : 0,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch {
    // Ignore quota or private mode errors
  }
}

export const telemetryStore = {
  getState(): TelemetryState {
    return currentState;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Adds a new sky telemetry scan to the pendrive (up to 10 max).
   */
  addScan(target: {
    targetName: string;
    category: CelestialCategory;
    gravity: number;
    elevationDeg: number;
    azimuthDeg: number;
    imageDataUrl?: string;
  }): boolean {
    if (currentState.scans.length >= currentState.maxScans) {
      return false;
    }

    const index = currentState.scans.length + 1;
    const catPrefix =
      target.category === "black_hole"
        ? "GARGANTUA"
        : target.category === "planet"
        ? "PLANET"
        : "VOID_STAR";
    const filename = `SCAN_${String(index).padStart(2, "0")}_${catPrefix}.DAT`;

    const newScan: TelemetryScan = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      filename,
      targetName: target.targetName,
      category: target.category,
      gravity: target.gravity,
      elevationDeg: Math.round(target.elevationDeg),
      azimuthDeg: Math.round(target.azimuthDeg),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      imageDataUrl: target.imageDataUrl,
    };

    currentState = {
      ...currentState,
      scans: [...currentState.scans, newScan],
      // If player was in a sampling_bias state, taking new scans clears old bias feedback
      analysisOutcome: currentState.analysisOutcome === "sampling_bias" ? null : currentState.analysisOutcome,
      biasMessage: currentState.analysisOutcome === "sampling_bias" ? null : currentState.biasMessage,
      activeDialogueKey: currentState.activeDialogueKey === "bias_failure" ? null : currentState.activeDialogueKey,
    };
    notify();
    return true;
  },

  /**
   * Deletes a specific telemetry scan file by id from the pendrive.
   */
  deleteScan(id: string) {
    currentState = {
      ...currentState,
      scans: currentState.scans.filter((s) => s.id !== id),
      analysisOutcome: null,
    };
    notify();
  },

  /**
   * Clears/formats the pendrive so player can re-sample after feedback.
   */
  formatPendrive() {
    currentState = {
      ...currentState,
      scans: [],
      analysisOutcome: null,
      biasMessage: null,
      activeDialogueKey: null,
      dialogueIndex: 0,
    };
    notify();
  },

  /**
   * Purges/deletes all scans from the pendrive due to sampling bias,
   * sets the analysis outcome and activates Oracle's bias failure dialogue.
   */
  purgeScansDueToBias(biasMessage: string) {
    currentState = {
      ...currentState,
      scans: [],
      analysisOutcome: "sampling_bias",
      biasMessage,
      activeDialogueKey: "bias_failure",
      dialogueIndex: 0,
    };
    notify();
  },

  /**
   * Mounts/opens or closes the Crew Terminal computer interface.
   */
  setTerminalOpen(open: boolean) {
    currentState = {
      ...currentState,
      terminalOpen: open,
      pendriveMounted: open && currentState.scans.length > 0,
      // If opening with full scans and no analysis yet, ready to evaluate
    };
    notify();
  },

  /**
   * Evaluates the dataset stored on the pendrive:
   * Representative requires at least 2 scans from each of the 3 celestial categories:
   * - Black Hole (high mass): 2-4 scans
   * - Planets (medium mass): 2-5 scans
   * - Distant Stars (zero mass): 2-5 scans
   * 
   * If heavily biased to Black Hole (e.g. 7+ scans) or missing distant stars,
   * triggers "sampling_bias".
   */
  evaluatePendriveData(): AnalysisOutcome {
    const scans = currentState.scans;
    if (scans.length === 0) return null;

    const holes = scans.filter((s) => s.category === "black_hole").length;
    const planets = scans.filter((s) => s.category === "planet").length;
    const stars = scans.filter((s) => s.category === "stars").length;

    // A sample is biased if:
    // 1. Any single category has 5 or more scans (majority >= 5)
    // 2. Or total scans < 10
    // 3. Or all 10 are the same kind
    const isBiased = scans.length < 10 || holes >= 5 || planets >= 5 || stars >= 5;

    const outcome: AnalysisOutcome = isBiased
      ? "sampling_bias"
      : "representative_sample";

    let biasMessage: string | null = null;
    if (outcome === "sampling_bias") {
      if (scans.length < 10) {
        biasMessage = `Pendrive buffer incomplete (${scans.length}/10). Collect 10 scans total.`;
      } else if (holes === 10) {
        biasMessage = "You have only taken Black Hole images. The sample is biased.";
      } else if (planets === 10) {
        biasMessage = "You have only taken Planet images. The sample is biased.";
      } else if (stars === 10) {
        biasMessage = "You have only taken Star images. The sample is biased.";
      } else if (holes >= 5) {
        biasMessage = `You have taken Black Hole images more (${holes}/10). The sample is biased.`;
      } else if (planets >= 5) {
        biasMessage = `You have taken Planet images more (${planets}/10). The sample is biased.`;
      } else if (stars >= 5) {
        biasMessage = `You have taken Star images more (${stars}/10). The sample is biased.`;
      } else {
        biasMessage = "You have taken one type of image more. The sample is biased.";
      }
    } else {
      biasMessage = "Sample verified! You have a balanced mix of Black Hole, Planet, and Star images.";
    }

    currentState = {
      ...currentState,
      analysisOutcome: outcome,
      biasMessage,
      activeDialogueKey: outcome === "representative_sample" ? "representative_success" : "bias_failure",
      dialogueIndex: 0,
    };
    notify();
    return outcome;
  },

  advanceDialogue() {
    currentState = {
      ...currentState,
      dialogueIndex: currentState.dialogueIndex + 1,
    };
    notify();
  },

  setDialogueKey(key: "briefing" | "bias_failure" | "representative_success" | null) {
    currentState = {
      ...currentState,
      activeDialogueKey: key,
      dialogueIndex: 0,
    };
    notify();
  },
};

if (typeof window !== "undefined") {
  (window as any).__telemetryStore = telemetryStore;
}

/** React Hook for consuming the Telemetry Pendrive store */
export function useTelemetryStore(): TelemetryState {
  return useSyncExternalStore(
    telemetryStore.subscribe,
    telemetryStore.getState,
    telemetryStore.getState
  );
}
