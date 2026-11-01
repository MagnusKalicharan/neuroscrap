/**
 * Master Clock Timeline Engine for Scene 1
 *
 * - Single requestAnimationFrame loop driven by performance.now().
 * - Automatically pauses on document visibility change (tab hidden/blur)
 *   and resumes on tab focus without time jumps or accumulated drifts.
 * - Supports start(), pause(), resume(), skipTo(ms), and destroy().
 * - Dispatches cue triggers deterministically based on timestamp thresholds.
 */

export interface TimelineCueDefinition<T = any> {
  id: string;
  at: number; // Milliseconds from start
  type: string;
  payload?: T;
}

export type CueTriggerHandler<T = any> = (cue: TimelineCueDefinition<T>) => void;
export type TickHandler = (elapsedMs: number) => void;
export type EndHandler = () => void;

export class TimelineClock {
  private durationMs: number;
  private elapsedMs: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private wasPausedByVisibility: boolean = false;
  private lastRafTimestamp: number = 0;
  private rafId: number | null = null;

  private cues: TimelineCueDefinition[] = [];
  private triggeredCueIds: Set<string> = new Set();

  private onCueHandlers: Set<CueTriggerHandler> = new Set();
  private onTickHandlers: Set<TickHandler> = new Set();
  private onEndHandlers: Set<EndHandler> = new Set();

  private visibilityListener: (() => void) | null = null;
  private windowBlurListener: (() => void) | null = null;
  private windowFocusListener: (() => void) | null = null;

  constructor(durationMs: number, cues: TimelineCueDefinition[] = []) {
    this.durationMs = durationMs;
    // Sort cues monotonically by timestamp
    this.cues = [...cues].sort((a, b) => a.at - b.at);

    if (typeof document !== "undefined") {
      this.visibilityListener = this.handleVisibilityChange.bind(this);
      document.addEventListener("visibilitychange", this.visibilityListener);
    }

    if (typeof window !== "undefined") {
      this.windowBlurListener = () => {
        if (this.isRunning && !this.isPaused) {
          this.wasPausedByVisibility = true;
          this.pause();
        }
      };
      this.windowFocusListener = () => {
        if (this.wasPausedByVisibility) {
          this.wasPausedByVisibility = false;
          this.resume();
        }
      };
      window.addEventListener("blur", this.windowBlurListener);
      window.addEventListener("focus", this.windowFocusListener);
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      if (this.isRunning && !this.isPaused) {
        this.wasPausedByVisibility = true;
        this.pause();
      }
    } else {
      if (this.wasPausedByVisibility) {
        this.wasPausedByVisibility = false;
        this.resume();
      }
    }
  }

  public addCue(cue: TimelineCueDefinition) {
    this.cues.push(cue);
    this.cues.sort((a, b) => a.at - b.at);
  }

  public onCue(handler: CueTriggerHandler): () => void {
    this.onCueHandlers.add(handler);
    return () => this.onCueHandlers.delete(handler);
  }

  public onTick(handler: TickHandler): () => void {
    this.onTickHandlers.add(handler);
    return () => this.onTickHandlers.delete(handler);
  }

  public onEnd(handler: EndHandler): () => void {
    this.onEndHandlers.add(handler);
    return () => this.onEndHandlers.delete(handler);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastRafTimestamp = performance.now();
    this.scheduleFrame();
  }

  public pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.lastRafTimestamp = performance.now();
    this.scheduleFrame();
  }

  public skipTo(targetMs: number) {
    if (!this.isRunning) {
      this.isRunning = true;
    }
    const clampedTarget = Math.min(targetMs, this.durationMs);
    this.elapsedMs = clampedTarget;

    // Trigger all cues up to this point that haven't been fired yet
    for (const cue of this.cues) {
      if (cue.at <= clampedTarget && !this.triggeredCueIds.has(cue.id)) {
        this.triggeredCueIds.add(cue.id);
        for (const handler of this.onCueHandlers) {
          handler(cue);
        }
      }
    }

    // Notify tick handlers
    for (const handler of this.onTickHandlers) {
      handler(this.elapsedMs);
    }

    if (this.elapsedMs >= this.durationMs) {
      this.finish();
    }
  }

  public getElapsedMs(): number {
    return this.elapsedMs;
  }

  public getDurationMs(): number {
    return this.durationMs;
  }

  public getProgress(): number {
    if (this.durationMs <= 0) return 1;
    return Math.min(1, Math.max(0, this.elapsedMs / this.durationMs));
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  private scheduleFrame() {
    if (typeof requestAnimationFrame === "undefined") return;
    this.rafId = requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  private tick(now: number) {
    if (!this.isRunning || this.isPaused) return;

    const delta = Math.max(0, now - this.lastRafTimestamp);
    this.lastRafTimestamp = now;
    this.elapsedMs += delta;

    // Evaluate cues
    for (const cue of this.cues) {
      if (cue.at <= this.elapsedMs && !this.triggeredCueIds.has(cue.id)) {
        this.triggeredCueIds.add(cue.id);
        for (const handler of this.onCueHandlers) {
          handler(cue);
        }
      }
    }

    // Tick handlers
    for (const handler of this.onTickHandlers) {
      handler(this.elapsedMs);
    }

    if (this.elapsedMs >= this.durationMs) {
      this.finish();
    } else {
      this.scheduleFrame();
    }
  }

  private finish() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const handler of this.onEndHandlers) {
      handler();
    }
  }

  public destroy() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (typeof document !== "undefined" && this.visibilityListener) {
      document.removeEventListener("visibilitychange", this.visibilityListener);
    }
    if (typeof window !== "undefined") {
      if (this.windowBlurListener) window.removeEventListener("blur", this.windowBlurListener);
      if (this.windowFocusListener) window.removeEventListener("focus", this.windowFocusListener);
    }
    this.onCueHandlers.clear();
    this.onTickHandlers.clear();
    this.onEndHandlers.clear();
    this.triggeredCueIds.clear();
  }
}
