"use client";
/**
 * src/ending/endingState.ts
 * ============================================================
 * State controller for the interactive ending sequence.
 * 
 * Coordinates:
 * - Arrival cinematic (0s - 33s)
 * - Manual player egress: player takes first-person control, walks outside to Rescue Two
 * - Boarding trigger: [E] interaction prompt when near Rescue Two ramp
 * - Liftoff cinematic & epilogue completion
 */

export type EndingPhase = 
  | "antenna"        // Act 1: Antenna fires signal (0 - 9s)
  | "timelapse"      // Act 2: Time lapse & radio confirmation (9 - 16s)
  | "descent"        // Act 3: Rescue Two atmospheric descent (16 - 26s)
  | "touchdown"      // Act 4: Touchdown on dunes & doorway opens (26 - 33s)
  | "manual_egress"  // Act 5: Player has first-person control to walk out & press [E]
  | "liftoff"        // Act 6: Player aboard, Rescue Two blasts off (48 - 56s)
  | "complete";      // Act 7: Epilogue debrief card

type Listener = () => void;

class EndingStateManager {
  private phase: EndingPhase = "antenna";
  private isPlayerControlActive: boolean = false;
  private isBoarded: boolean = false;
  private nearRescueShip: boolean = false;
  private listeners: Set<Listener> = new Set();

  public getPhase(): EndingPhase {
    return this.phase;
  }

  public getIsPlayerControlActive(): boolean {
    return this.isPlayerControlActive;
  }

  public getIsBoarded(): boolean {
    return this.isBoarded;
  }

  public getNearRescueShip(): boolean {
    return this.nearRescueShip;
  }

  public setPhase(phase: EndingPhase) {
    if (this.phase === phase) return;
    this.phase = phase;
    this.isPlayerControlActive = phase === "manual_egress";
    this.notify();
  }

  public setNearRescueShip(near: boolean) {
    if (this.nearRescueShip === near) return;
    this.nearRescueShip = near;
    this.notify();
  }

  public boardShip() {
    if (this.isBoarded) return;
    this.isBoarded = true;
    this.isPlayerControlActive = false;
    this.phase = "liftoff";
    this.notify();
  }

  public reset() {
    this.phase = "antenna";
    this.isPlayerControlActive = false;
    this.isBoarded = false;
    this.nearRescueShip = false;
    this.notify();
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        console.error("endingState listener error:", err);
      }
    }
  }
}

export const endingState = new EndingStateManager();
