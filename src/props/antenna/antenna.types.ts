/**
 * antenna.types.ts — Public Types & Reactive State Subsystem for Roof Comms Array
 * ==============================================================================
 * Destination of the Section 2 transmission line. Supports 4 core states:
 * "dead" | "powering" | "aligning" | "transmitting".
 */
import * as THREE from "three";

export type AntennaState = "dead" | "powering" | "aligning" | "transmitting";

export interface RoofAntennaProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  height?: number;
  state?: AntennaState;
  diagnosticPassed?: boolean;
  greyscale?: boolean;
  reduceMotion?: boolean;
  lowQuality?: boolean;
}

// ── Shared Reactive State Store (Zero React Overhead, Event-Driven) ───────────
type StateChangeListener = (state: AntennaState) => void;

class AntennaStateStore {
  private state: AntennaState = "dead";
  private target: THREE.Vector3 | null = null;
  private cablePulse = 0.0; // 0..1
  private listeners: Set<StateChangeListener> = new Set();

  public getState(): AntennaState {
    return this.state;
  }

  public setState(next: AntennaState): void {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }

  public getTarget(): THREE.Vector3 | null {
    return this.target;
  }

  public setTarget(dir: THREE.Vector3 | null): void {
    if (!dir) {
      this.target = null;
    } else {
      this.target = dir.clone().normalize();
    }
  }

  public getCablePulse(): number {
    return this.cablePulse;
  }

  public setCablePulse(p: number): void {
    this.cablePulse = Math.max(0, Math.min(1, p));
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public reset(): void {
    this.state = "dead";
    this.target = null;
    this.cablePulse = 0.0;
  }
}

const store = new AntennaStateStore();

// ── Public Exported Interface Functions ────────────────────────────────────────
export function setAntennaState(state: AntennaState): void {
  store.setState(state);
}

export function getAntennaState(): AntennaState {
  return store.getState();
}

export function setAntennaTarget(target: THREE.Vector3 | null): void {
  store.setTarget(target);
}

export function getAntennaTarget(): THREE.Vector3 | null {
  return store.getTarget();
}

export function setCablePulse(progress: number): void {
  store.setCablePulse(progress);
}

export function getCablePulse(): number {
  return store.getCablePulse();
}

export function onAntennaStateChange(listener: StateChangeListener): () => void {
  return store.subscribe(listener);
}
