/**
 * src/section2/relayStore.ts — Section 2 Reactive State Store
 * ============================================================
 * Manages relay node scan states, current scan progress (0..1),
 * active targeted node, floating AR tag timeouts, and the
 * Section 2 Transmission Diagnostic console configuration.
 * Supports localStorage persistence.
 */
import { useSyncExternalStore } from "react";
import { RELAY_NODES, type RelayNodeId, type RelayNodeData } from "./nodeData";
import type { RelayConfig, RelayMode, EvaluationResult } from "./evaluateConfig";

export interface RelayFloatingTag {
  nodeId: string;
  label: string;
  text: string;
  kind: "healthy" | "surge" | "missing";
  expiresAt: number;
}

export interface DiagnosticAttemptRecord {
  config: RelayConfig;
  result: EvaluationResult;
  timestamp: number;
}

export interface RelayStoreState {
  scannedNodeIds: string[];
  readings: Record<string, number | null>;
  activeTargetNodeId: string | null;
  scanningNodeId: string | null;
  scanProgress: number; // 0.0 to 1.0
  floatingTags: Record<string, RelayFloatingTag>;
  dialogueTriggered: {
    oracleIntro: boolean;
    r3Scanned: boolean;
    r4Scanned: boolean;
    allComplete: boolean;
  };
  consoleUnlocked: boolean;
  diagnosticConfig: RelayConfig;
  attempts: DiagnosticAttemptRecord[];
  lastResult: EvaluationResult | null;
  diagnosticPassed: boolean;
  activeStationTab: "intake" | "diagnostic";
  diagnosticConsoleOpen: boolean;
}

type Listener = () => void;

const STORAGE_KEY = "neuro_scrap_section2_relay";

export function createDefaultDiagnosticConfig(): RelayConfig {
  return {
    R1: { mode: "connect" },
    R2: { mode: "connect" },
    R3: { mode: "connect" },
    R4: { mode: "connect" },
    R5: { mode: "connect" },
    R6: { mode: "connect" },
  };
}

const DORMANT_RELAY_STATE: RelayStoreState = {
  scannedNodeIds: [],
  readings: {},
  activeTargetNodeId: null,
  scanningNodeId: null,
  scanProgress: 0,
  floatingTags: {},
  dialogueTriggered: {
    oracleIntro: false,
    r3Scanned: false,
    r4Scanned: false,
    allComplete: false,
  },
  consoleUnlocked: false,
  diagnosticConfig: createDefaultDiagnosticConfig(),
  attempts: [],
  lastResult: null,
  diagnosticPassed: false,
  activeStationTab: "intake",
  diagnosticConsoleOpen: false,
};

function loadInitialState(): RelayStoreState {
  const defaultCfg = createDefaultDiagnosticConfig();
  const freshDefault: RelayStoreState = {
    scannedNodeIds: [],
    readings: {},
    activeTargetNodeId: null,
    scanningNodeId: null,
    scanProgress: 0,
    floatingTags: {},
    dialogueTriggered: {
      oracleIntro: false,
      r3Scanned: false,
      r4Scanned: false,
      allComplete: false,
    },
    consoleUnlocked: false,
    diagnosticConfig: defaultCfg,
    attempts: [],
    lastResult: null,
    diagnosticPassed: false,
    activeStationTab: "intake",
    diagnosticConsoleOpen: false,
  };

  if (typeof window !== "undefined") {
    try {
      // Validate that Section 1 was genuinely completed before restoring Section 2 relay progress
      const pRaw = localStorage.getItem("neuroscrap_pendrive_store_v1");
      const tRaw = localStorage.getItem("neuroscrap_telemetry_pendrive_v1");
      const parsedP = pRaw ? JSON.parse(pRaw) : null;
      const parsedT = tRaw ? JSON.parse(tRaw) : null;

      const isSec1Done = Boolean(
        parsedP?.section1Complete &&
        Array.isArray(parsedP?.uploadedBatches) &&
        parsedP.uploadedBatches.length > 0 &&
        Array.isArray(parsedT?.scans) &&
        parsedT.scans.length >= 10
      );

      if (!isSec1Done) {
        // Section 1 is not done — relays MUST stay fresh/unscanned
        localStorage.removeItem(STORAGE_KEY);
        return freshDefault;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...freshDefault,
          ...parsed,
          activeTargetNodeId: null,
          scanningNodeId: null,
          scanProgress: 0,
          floatingTags: {},
          diagnosticConsoleOpen: false,
        };
      }
    } catch {}
  }
  return freshDefault;
}

class RelayStore {
  private state: RelayStoreState = loadInitialState();
  private listeners = new Set<Listener>();

  public getState(): RelayStoreState {
    if (typeof window !== "undefined") {
      try {
        const pRaw = localStorage.getItem("neuroscrap_pendrive_store_v1");
        const tRaw = localStorage.getItem("neuroscrap_telemetry_pendrive_v1");
        const parsedP = pRaw ? JSON.parse(pRaw) : null;
        const parsedT = tRaw ? JSON.parse(tRaw) : null;
        const isSec1Done = Boolean(
          parsedP?.section1Complete &&
          Array.isArray(parsedP?.uploadedBatches) &&
          parsedP.uploadedBatches.length > 0 &&
          parsedP.uploadedBatches.some((b: string) => b && b !== "BATCH_DEV_AUTO") &&
          Array.isArray(parsedT?.scans) &&
          parsedT.scans.length >= 10 &&
          parsedT.analysisOutcome !== "sampling_bias"
        );

        if (!isSec1Done) {
          return DORMANT_RELAY_STATE;
        }
      } catch {}
    }
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.state = { ...this.state };
    this.listeners.forEach((l) => l());
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            scannedNodeIds: this.state.scannedNodeIds,
            readings: this.state.readings,
            dialogueTriggered: this.state.dialogueTriggered,
            consoleUnlocked: this.state.consoleUnlocked,
            diagnosticConfig: this.state.diagnosticConfig,
            attempts: this.state.attempts,
            lastResult: this.state.lastResult,
            diagnosticPassed: this.state.diagnosticPassed,
            activeStationTab: this.state.activeStationTab,
          })
        );
      } catch {}
    }
  }

  public setActiveTarget(nodeId: string | null) {
    if (this.state.activeTargetNodeId !== nodeId) {
      this.state = {
        ...this.state,
        activeTargetNodeId: nodeId,
      };
      this.notify();
    }
  }

  public setScanning(nodeId: string | null, progress: number = 0) {
    this.state = {
      ...this.state,
      scanningNodeId: nodeId,
      scanProgress: progress,
    };
    this.notify();
  }

  public completeScan(node: RelayNodeData) {
    const nextScanned = this.state.scannedNodeIds.includes(node.id)
      ? this.state.scannedNodeIds
      : [...this.state.scannedNodeIds, node.id];
    const nextReadings = {
      ...this.state.readings,
      [node.id]: node.reading,
    };
    const nextTags = {
      ...this.state.floatingTags,
      [node.id]: {
        nodeId: node.id,
        label: node.label,
        text: node.scannerText,
        kind: node.kind,
        expiresAt: Date.now() + 4000,
      },
    };

    this.state = {
      ...this.state,
      scannedNodeIds: nextScanned,
      readings: nextReadings,
      scanningNodeId: null,
      scanProgress: 0,
      floatingTags: nextTags,
      consoleUnlocked: nextScanned.length >= 6 ? true : this.state.consoleUnlocked,
    };

    this.notify();
  }

  public markDialogue(key: keyof RelayStoreState["dialogueTriggered"]) {
    this.state = {
      ...this.state,
      dialogueTriggered: {
        ...this.state.dialogueTriggered,
        [key]: true,
      },
    };
    this.notify();
  }

  public pruneExpiredTags() {
    const now = Date.now();
    let changed = false;
    const nextTags: Record<string, RelayFloatingTag> = {};
    for (const [id, tag] of Object.entries(this.state.floatingTags)) {
      if (tag.expiresAt > now) {
        nextTags[id] = tag;
      } else {
        changed = true;
      }
    }
    if (changed) {
      this.state = {
        ...this.state,
        floatingTags: nextTags,
      };
      this.notify();
    }
  }

  // ── Diagnostic Console Controls ─────────────────────────
  public setNodeMode(nodeId: string, mode: RelayMode) {
    const currentCfg = this.state.diagnosticConfig[nodeId] || { mode: "connect" };
    const patchVal = mode === "patch" ? (currentCfg.patchValue ?? 0) : currentCfg.patchValue;
    this.state = {
      ...this.state,
      diagnosticConfig: {
        ...this.state.diagnosticConfig,
        [nodeId]: {
          mode,
          patchValue: patchVal,
        },
      },
    };
    this.notify();
  }

  public setNodePatchValue(nodeId: string, patchValue: number) {
    const currentCfg = this.state.diagnosticConfig[nodeId] || { mode: "patch" };
    this.state = {
      ...this.state,
      diagnosticConfig: {
        ...this.state.diagnosticConfig,
        [nodeId]: {
          ...currentCfg,
          mode: "patch",
          patchValue,
        },
      },
    };
    this.notify();
  }

  public setDiagnosticConfig(config: RelayConfig) {
    this.state = {
      ...this.state,
      diagnosticConfig: { ...config },
    };
    this.notify();
  }

  public resetDiagnosticConfig() {
    this.state = {
      ...this.state,
      diagnosticConfig: createDefaultDiagnosticConfig(),
      lastResult: null,
    };
    this.notify();
  }

  public recordAttempt(config: RelayConfig, result: EvaluationResult) {
    const record: DiagnosticAttemptRecord = {
      config: JSON.parse(JSON.stringify(config)),
      result,
      timestamp: Date.now(),
    };
    this.state = {
      ...this.state,
      attempts: [...this.state.attempts, record],
      lastResult: result,
    };
    this.notify();
  }

  public setDiagnosticPassed(passed: boolean) {
    if (this.state.diagnosticPassed !== passed) {
      this.state = {
        ...this.state,
        diagnosticPassed: passed,
      };
      this.notify();
    }
  }

  public setActiveStationTab(tab: "intake" | "diagnostic") {
    if (this.state.activeStationTab !== tab) {
      this.state = {
        ...this.state,
        activeStationTab: tab,
      };
      this.notify();
    }
  }

  public setDiagnosticConsoleOpen(open: boolean) {
    if (this.state.diagnosticConsoleOpen !== open) {
      this.state = {
        ...this.state,
        diagnosticConsoleOpen: open,
      };
      this.notify();
    }
  }

  public markAllScannedForTesting() {
    this.state = {
      ...this.state,
      scannedNodeIds: RELAY_NODES.map((n) => n.id),
      readings: Object.fromEntries(RELAY_NODES.map((n) => [n.id, n.reading])),
      consoleUnlocked: true,
    };
    this.notify();
  }

  public resetTransmissionTest() {
    this.state = {
      ...this.state,
      diagnosticPassed: false,
      lastResult: null,
      diagnosticConfig: createDefaultDiagnosticConfig(),
    };
    this.notify();
  }

  public reset() {
    this.state = {
      scannedNodeIds: [],
      readings: {},
      activeTargetNodeId: null,
      scanningNodeId: null,
      scanProgress: 0,
      floatingTags: {},
      dialogueTriggered: {
        oracleIntro: false,
        r3Scanned: false,
        r4Scanned: false,
        allComplete: false,
      },
      consoleUnlocked: false,
      diagnosticConfig: createDefaultDiagnosticConfig(),
      attempts: [],
      lastResult: null,
      diagnosticPassed: false,
      activeStationTab: "intake",
      diagnosticConsoleOpen: false,
    };
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
    this.notify();
  }
}

export const relayStore = new RelayStore();

export function useRelayStore(): RelayStoreState {
  return useSyncExternalStore(
    (onStoreChange) => relayStore.subscribe(onStoreChange),
    () => relayStore.getState(),
    () => relayStore.getState()
  );
}
