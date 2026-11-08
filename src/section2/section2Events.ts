/**
 * src/section2/section2Events.ts
 * ============================================================
 * Section 2: Typed Event Emitter for Transmission Line Actions
 * 
 * Emits typed events when the Transmission Diagnostic console completes,
 * allowing subsequent station animations and Section 2 progression to react.
 */

import type { RelayConfig } from "./evaluateConfig";

export interface DiagnosticPassedPayload {
  config: RelayConfig;
  attempts: any[];
}

export type Section2EventName = "diagnostic-passed";

type DiagnosticPassedListener = (payload: DiagnosticPassedPayload) => void;

const passedListeners = new Set<DiagnosticPassedListener>();

export const section2Events = {
  /**
   * Emit an event to all registered listeners.
   */
  emit(event: "diagnostic-passed", data: DiagnosticPassedPayload): void {
    if (event === "diagnostic-passed") {
      passedListeners.forEach((fn) => {
        try {
          fn(data);
        } catch (err) {
          console.error("Error in section2Events listener:", err);
        }
      });
    }
  },

  /**
   * Subscribe to section 2 events. Returns an unsubscribe cleanup callback.
   */
  on(event: "diagnostic-passed", listener: DiagnosticPassedListener): () => void {
    if (event === "diagnostic-passed") {
      passedListeners.add(listener);
    }
    return () => {
      passedListeners.delete(listener);
    };
  },

  /** Clear all listeners (used in testing & cleanup) */
  clear(): void {
    passedListeners.clear();
  },
};
