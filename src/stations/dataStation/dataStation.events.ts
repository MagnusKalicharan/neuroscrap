/**
 * dataStation.events.ts — Typed Event Emitter for Data Station Actions
 * =====================================================================
 * Emits typed events when the Data Station processes telemetry uploads,
 * allowing subsequent analysis stations and mission triggers to react.
 */

export interface StationUploadedEvent {
  batchId: string;
  time: number;
}

type StationEventListener = (data: StationUploadedEvent) => void;

const uploadListeners = new Set<StationEventListener>();

export const stationEvents = {
  /**
   * Emit an upload completion event to all registered listeners
   */
  emit(event: "uploaded", data: StationUploadedEvent): void {
    if (event === "uploaded") {
      uploadListeners.forEach((fn) => {
        try {
          fn(data);
        } catch (err) {
          console.error("Error in stationEvents listener:", err);
        }
      });
    }
  },

  /**
   * Subscribe to station events. Returns an unsubscribe cleanup callback.
   */
  on(event: "uploaded", listener: StationEventListener): () => void {
    if (event === "uploaded") {
      uploadListeners.add(listener);
    }
    return () => {
      uploadListeners.delete(listener);
    };
  },

  /** Clear all listeners (used in testing & cleanup) */
  clear(): void {
    uploadListeners.clear();
  },
};

/**
 * Convenient typed helper for subscribing to upload events.
 */
export function onStationUploaded(listener: StationEventListener): () => void {
  return stationEvents.on("uploaded", listener);
}
