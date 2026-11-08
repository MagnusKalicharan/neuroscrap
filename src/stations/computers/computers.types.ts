/**
 * computers.types.ts — Public Types & Reactive State Subsystem for Cockpit Computers
 * ==================================================================================
 * Supports five core states per machine:
 * "dead" | "booting" | "idle" | "active" | "fault"
 * 
 * Defaults per specification:
 * - CORE-A: "booting" (booting loop with rare flicker)
 * - CORE-B: "idle" (primary command core)
 * - CORE-C: "fault" (severed modules, flickering)
 */

export type ComputerId = "core-a" | "core-b" | "core-c";
export type ComputerState = "dead" | "booting" | "idle" | "active" | "fault";

export type ScreenDrawFn = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: ComputerState,
  time: number
) => void;

export interface CockpitComputersProps {
  /** If true, renders the Step A massing blocks for silhouette & clearance verification */
  isMassingPass?: boolean;
  /** Test 1: greyscale high-contrast silhouette validation mode */
  greyscale?: boolean;
  /** Accessibility: static pose without transforms or particle flashes */
  reduceMotion?: boolean;
  /** Performance: disables secondary sprites and lowers detail */
  lowQuality?: boolean;
  /** Active HUD prompt callback */
  onInteractionPrompt?: (prompt: string | null) => void;
  /** Callback on [E] interaction */
  onInteract?: (id: ComputerId) => void;
}

type StateChangeListener = (id: ComputerId, state: ComputerState) => void;

class ComputersStateStore {
  private states: Record<ComputerId, ComputerState> = {
    "core-a": "booting",
    "core-b": "idle",
    "core-c": "fault",
  };

  private screenDrawers: Partial<Record<ComputerId, ScreenDrawFn>> = {};
  private listeners: Set<StateChangeListener> = new Set();

  public getState(id: ComputerId): ComputerState {
    return this.states[id];
  }

  public setState(id: ComputerId, next: ComputerState): void {
    if (this.states[id] === next) return;
    this.states[id] = next;
    this.listeners.forEach((l) => l(id, next));
  }

  public setScreenContent(id: ComputerId, drawFn: ScreenDrawFn): void {
    this.screenDrawers[id] = drawFn;
    this.listeners.forEach((l) => l(id, this.states[id]));
  }

  public getScreenContent(id: ComputerId): ScreenDrawFn | undefined {
    return this.screenDrawers[id];
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public reset(): void {
    this.states = {
      "core-a": "booting",
      "core-b": "idle",
      "core-c": "fault",
    };
    this.screenDrawers = {};
  }
}

const store = new ComputersStateStore();

// ── Public Exported Interface Functions ────────────────────────────────────────

export function setComputerState(id: ComputerId, state: ComputerState): void {
  store.setState(id, state);
}

export function getComputerState(id: ComputerId): ComputerState {
  return store.getState(id);
}

export function setScreenContent(id: ComputerId, drawFn: ScreenDrawFn): void {
  store.setScreenContent(id, drawFn);
}

export function onComputerStateChange(listener: StateChangeListener): () => void {
  return store.subscribe(listener);
}

// Expose on window for easy testing in console
if (typeof window !== "undefined") {
  (window as any).setComputerState = setComputerState;
  (window as any).getComputerState = getComputerState;
  (window as any).setScreenContent = setScreenContent;
}
