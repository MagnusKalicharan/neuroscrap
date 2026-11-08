/**
 * pendriveStore.ts — Terminal State & Upload Store
 * ================================================
 * Built with useSyncExternalStore for zero tearing and SSR safety.
 * Persists uploaded batches and pendrive connection state to localStorage.
 */
import { useSyncExternalStore } from "react";

export interface PendriveState {
  hasPendrive: boolean;
  uploadedBatches: string[];
  deletedImageIds: string[];
}

const STORAGE_KEY = "neuroscrap_pendrive_store_v1";

const DEFAULT_STATE: PendriveState = {
  hasPendrive: true,
  uploadedBatches: [],
  deletedImageIds: [],
};

let currentState: PendriveState = loadStoredState();
const listeners = new Set<() => void>();

function notify() {
  saveStoredState();
  listeners.forEach((l) => l());
}

function loadStoredState(): PendriveState {
  if (typeof window === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      hasPendrive: Boolean(parsed.hasPendrive ?? true),
      uploadedBatches: Array.isArray(parsed.uploadedBatches) ? parsed.uploadedBatches : [],
      deletedImageIds: Array.isArray(parsed.deletedImageIds) ? parsed.deletedImageIds : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveStoredState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch {
    // Ignore quota or private mode errors
  }
}

export const pendriveStore = {
  getState(): PendriveState {
    return currentState;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setHasPendrive(has: boolean) {
    currentState = { ...currentState, hasPendrive: has };
    notify();
  },

  recordBatchUpload(batchId: string) {
    if (!currentState.uploadedBatches.includes(batchId)) {
      currentState = {
        ...currentState,
        uploadedBatches: [...currentState.uploadedBatches, batchId],
      };
      notify();
    }
  },

  deleteImage(id: string) {
    if (!currentState.deletedImageIds.includes(id)) {
      currentState = {
        ...currentState,
        deletedImageIds: [...currentState.deletedImageIds, id],
      };
      notify();
    }
  },

  reset() {
    currentState = { ...DEFAULT_STATE };
    notify();
  },
};

export function usePendriveStore(): PendriveState {
  return useSyncExternalStore(
    pendriveStore.subscribe,
    pendriveStore.getState,
    () => DEFAULT_STATE
  );
}
