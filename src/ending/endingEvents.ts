/**
 * src/ending/endingEvents.ts
 * ============================================================
 * Event subsystem for the Ending Cinematic.
 * Emits "ending-complete" exactly once upon completion.
 */

type EndingEventListener = () => void;

class EndingEventEmitter {
  private listeners: Set<EndingEventListener> = new Set();
  private hasCompleted = false;

  public on(event: "ending-complete", listener: EndingEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(event: "ending-complete"): void {
    if (this.hasCompleted) return;
    this.hasCompleted = true;
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error in endingEvents listener:", err);
      }
    });
  }

  public reset(): void {
    this.hasCompleted = false;
  }
}

export const endingEvents = new EndingEventEmitter();
