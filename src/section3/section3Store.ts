/**
 * Section 3: Find the Rescue Beacon — Reactive State Manager
 * ============================================================
 * Manages player progression through Section 3:
 * - examplesViewed: set of known record IDs studied
 * - toolsApplied: per-record per-tool measurement status
 * - channels: [CH1, CH2] installed measurement modules
 * - locksTried: history of antenna lock attempts with verdicts
 * - bursts: auxiliary reactor charge (starts at 3)
 * - passed: completion flag
 *
 * Fully reactive via useSyncExternalStore with try/catch localStorage persistence.
 */

import { useSyncExternalStore, useEffect } from "react";
import type {
  CandidateId,
  LockAttempt,
  MeasurementId,
  PairVerdict,
  SectionThreeState,
} from "./types.ts";

const STORAGE_KEY = "neuro_scrap_section3_v3";
const LEGACY_STORAGE_KEYS = ["neuro_scrap_section3_v2", "neuro_scrap_section3"];

const VALID_MEASUREMENT_IDS = new Set<MeasurementId>([
  "brightness",
  "beat",
  "colour",
  "jumpiness",
]);

const DEFAULT_STATE: SectionThreeState = {
  examplesViewed: [],
  toolsApplied: {},
  channels: [null, null],
  pairsTried: [],
  locksTried: [],
  bursts: 3,
  passed: false,
  unknownOpened: false,
  beaconVerified: false,
  transitionDialogueSeen: false,
};

let currentState: SectionThreeState = { ...DEFAULT_STATE };
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
    // Ignore quota or private browsing errors
  }
}

function loadFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Clean up older version keys if present
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      if (localStorage.getItem(legacyKey)) {
        localStorage.removeItem(legacyKey);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.examplesViewed)) {
      const rawChannels = Array.isArray(parsed.channels) ? parsed.channels : [null, null];
      const sanitizedChannels: [MeasurementId | null, MeasurementId | null] = [
        VALID_MEASUREMENT_IDS.has(rawChannels[0]) ? rawChannels[0] : null,
        VALID_MEASUREMENT_IDS.has(rawChannels[1]) ? rawChannels[1] : null,
      ];

      // Sanitize toolsApplied map
      const sanitizedToolsApplied: Record<string, Record<MeasurementId, number | boolean>> = {};
      if (parsed.toolsApplied && typeof parsed.toolsApplied === "object") {
        for (const [scanId, toolMap] of Object.entries(parsed.toolsApplied)) {
          if (toolMap && typeof toolMap === "object") {
            sanitizedToolsApplied[scanId] = {} as Record<MeasurementId, number | boolean>;
            for (const [tId, val] of Object.entries(toolMap)) {
              if (VALID_MEASUREMENT_IDS.has(tId as MeasurementId)) {
                sanitizedToolsApplied[scanId][tId as MeasurementId] = val as number | boolean;
              }
            }
          }
        }
      }

      currentState = {
        examplesViewed: parsed.examplesViewed,
        toolsApplied: sanitizedToolsApplied,
        channels: sanitizedChannels,
        pairsTried: Array.isArray(parsed.pairsTried) ? parsed.pairsTried : [],
        locksTried: Array.isArray(parsed.locksTried) ? parsed.locksTried : [],
        bursts: typeof parsed.bursts === "number" ? parsed.bursts : 3,
        passed: Boolean(parsed.passed),
        unknownOpened: Boolean(parsed.unknownOpened),
        beaconVerified: Boolean(parsed.beaconVerified),
        transitionDialogueSeen: Boolean(parsed.transitionDialogueSeen),
      };
      return true;
    }
  } catch {
    // Corrupted state, ignore
  }
  return false;
}

// Storage load flag — prevents duplicate loads under React StrictMode double-invoke
let _storageLoaded = false;

// ── Event Emitter for Section 3 Life Cycle ────────────────────────────────────
type Section3EventMap = {
  "channels-set": { a: MeasurementId | null; b: MeasurementId | null } | [MeasurementId | null, MeasurementId | null];
  "lock": LockAttempt;
  "section3-complete": {
    pair: [MeasurementId, MeasurementId] | null;
    locksTried: LockAttempt[];
    attempts: number;
  };
};

type EventCallback<K extends keyof Section3EventMap> = (data: Section3EventMap[K]) => void;

class Section3EventEmitter {
  private handlers = new Map<string, Set<any>>();

  on<K extends keyof Section3EventMap>(event: K, handler: EventCallback<K>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof Section3EventMap>(event: K, handler: EventCallback<K>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof Section3EventMap>(event: K, data: Section3EventMap[K]): void {
    this.handlers.get(event)?.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`Error in section3 event handler for ${event}:`, err);
      }
    });
  }
}

export const section3Events = new Section3EventEmitter();

// ── Store API ─────────────────────────────────────────────────────────────────
export const section3Store = {
  getSnapshot(): SectionThreeState {
    return currentState;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  markExampleViewed(scanId: string): void {
    if (currentState.examplesViewed.includes(scanId)) return;
    currentState = {
      ...currentState,
      examplesViewed: [...currentState.examplesViewed, scanId],
    };
    emitChange();
  },

  markToolApplied(scanId: string, toolId: MeasurementId, reading: number | boolean = true): void {
    const existing = currentState.toolsApplied[scanId] || {};
    currentState = {
      ...currentState,
      toolsApplied: {
        ...currentState.toolsApplied,
        [scanId]: {
          ...existing,
          [toolId]: reading,
        },
      },
    };
    emitChange();
  },

  setChannels(ch1: MeasurementId | null, ch2: MeasurementId | null): void {
    const nextPairs = [...currentState.pairsTried];
    if (ch1 && ch2) {
      const alreadyTried = nextPairs.some(([a, b]) => a === ch1 && b === ch2);
      if (!alreadyTried) {
        nextPairs.push([ch1, ch2]);
      }
    }
    currentState = {
      ...currentState,
      channels: [ch1, ch2],
      pairsTried: nextPairs,
    };
    if (ch1 !== null && ch2 !== null) {
      section3Events.emit("channels-set", { a: ch1, b: ch2 });
    }
    section3Events.emit("channels-set", [ch1, ch2]);
    emitChange();
  },

  setUnknownOpened(opened = true): void {
    if (currentState.unknownOpened === opened) return;
    currentState = {
      ...currentState,
      unknownOpened: opened,
    };
    emitChange();
  },

  recordLock(targetId: CandidateId, verdict: PairVerdict): void {
    const currentPair = currentState.channels[0] && currentState.channels[1]
      ? ([currentState.channels[0], currentState.channels[1]] as [MeasurementId, MeasurementId])
      : null;

    const attempt: LockAttempt = {
      targetId,
      pair: currentPair,
      verdict,
      timestamp: Date.now(),
    };

    let nextBursts = currentState.bursts;
    if (verdict !== "found") {
      nextBursts = Math.max(0, currentState.bursts - 1);
    }

    currentState = {
      ...currentState,
      locksTried: [...currentState.locksTried, attempt],
      bursts: nextBursts,
      passed: verdict === "found" ? true : currentState.passed,
    };

    section3Events.emit("lock", attempt);
    emitChange();
  },

  setPassed(passed: boolean): void {
    currentState = {
      ...currentState,
      passed,
    };
    emitChange();
  },

  setBeaconVerified(verified: boolean): void {
    currentState = {
      ...currentState,
      beaconVerified: verified,
      transitionDialogueSeen: verified ? currentState.transitionDialogueSeen : false,
    };
    emitChange();
  },

  markTransitionDialogueSeen(): void {
    currentState = {
      ...currentState,
      transitionDialogueSeen: true,
    };
    emitChange();
  },

  resetTransitionDialogue(): void {
    currentState = {
      ...currentState,
      transitionDialogueSeen: false,
    };
    emitChange();
  },

  rechargeBursts(): void {
    currentState = {
      ...currentState,
      bursts: 3,
    };
    emitChange();
  },

  reset(): void {
    currentState = { ...DEFAULT_STATE };
    _storageLoaded = false;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    emitChange();
  },
};

const SERVER_SNAPSHOT: SectionThreeState = Object.freeze({ ...DEFAULT_STATE });
const getServerSnapshot = () => SERVER_SNAPSHOT;

export function useSection3Store(): SectionThreeState {
  // Lazy load from localStorage on first client render, safe under StrictMode.
  // Running in useEffect (after mount) guarantees server snapshot == initial
  // client snapshot, eliminating the React 19 hydration mismatch warning.
  useEffect(() => {
    if (!_storageLoaded) {
      _storageLoaded = true;
      if (loadFromStorage()) {
        // Notify all subscribers so components re-render with persisted state
        listeners.forEach((l) => l());
      }
    }
  }, []);

  return useSyncExternalStore(
    section3Store.subscribe,
    section3Store.getSnapshot,
    getServerSnapshot
  );
}
