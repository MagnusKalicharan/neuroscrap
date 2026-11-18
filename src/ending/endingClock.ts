"use client";
/**
 * src/ending/endingClock.ts
 * ============================================================
 * Master Clock Timeline Controller for "THE ENDING".
 * Built strictly on the project's existing TimelineClock engine
 * (src/scenes/scene1/timeline.ts).
 * 
 * - Pure monotonic performance.now() loop
 * - Automatic pause/resume on tab blur/visibility change without time jumps
 * - Zero React state allocations per frame
 * - Synchronously accessible in Three.js useFrame and React DOM overlays
 */
import { TimelineClock } from "../scenes/scene1/timeline";
import { ENDING_DURATION_MS } from "./types";

class EndingClockService {
  private clock: TimelineClock | null = null;
  private currentMs: number = 0;
  private tickSubscribers: Set<(ms: number) => void> = new Set();
  private endSubscribers: Set<() => void> = new Set();

  public start() {
    this.stop();
    this.currentMs = 0;
    this.clock = new TimelineClock(ENDING_DURATION_MS);
    this.clock.onTick((ms) => {
      this.currentMs = ms;
      for (const fn of this.tickSubscribers) {
        fn(ms);
      }
    });
    this.clock.onEnd(() => {
      this.currentMs = ENDING_DURATION_MS;
      for (const fn of this.endSubscribers) {
        fn();
      }
    });
    this.clock.start();
  }

  public pause() {
    this.clock?.pause();
  }

  public resume() {
    this.clock?.resume();
  }

  public isPaused(): boolean {
    return this.clock?.getIsPaused() ?? false;
  }

  public skipTo(targetMs: number) {
    if (!this.clock) {
      this.start();
    }
    this.clock?.skipTo(targetMs);
    this.currentMs = targetMs;
    for (const fn of this.tickSubscribers) {
      fn(targetMs);
    }
  }

  public stop() {
    if (this.clock) {
      this.clock.pause();
      this.clock = null;
    }
  }

  public getElapsedMs(): number {
    return this.currentMs;
  }

  public getElapsedSec(): number {
    return this.currentMs / 1000;
  }

  public getProgress(): number {
    return Math.min(1.0, Math.max(0.0, this.currentMs / ENDING_DURATION_MS));
  }

  public subscribe(onTick: (ms: number) => void): () => void {
    this.tickSubscribers.add(onTick);
    onTick(this.currentMs);
    return () => {
      this.tickSubscribers.delete(onTick);
    };
  }

  public onEnd(callback: () => void): () => void {
    this.endSubscribers.add(callback);
    return () => {
      this.endSubscribers.delete(callback);
    };
  }
}

export const endingClock = new EndingClockService();
