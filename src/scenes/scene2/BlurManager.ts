/**
 * BlurManager.ts — Adaptive Vision Blur Engine for Scene 2
 *
 * Implements:
 * - Mode A: Hardware CSS filter blur(Npx) quantized to integer pixels.
 *           Removed completely (filter: "none") when blur is 0px.
 * - Mode B: Lightweight soft-focus gradient overlay for low-spec devices.
 * - Dynamic frame-time probe: switches from Mode A to Mode B if avg frame time > 24ms.
 * - Double-image ghosting and chromatic fringing when blur > 8px.
 */

export type BlurMode = "A" | "B";

export interface BlurState {
  blurPx: number;
  hasDoubleImage: boolean;
  visionPercent: number;
  mode: BlurMode;
  overlayOpacity: number;
}

class BlurEngine {
  private mode: BlurMode = "A";
  private hasLoggedMode: boolean = false;
  private frameTimes: number[] = [];
  private probeActive: boolean = true;
  private lastTimestamp: number = 0;

  constructor() {
    this.mode = "A";
  }

  public setQuality(quality: "low" | "medium" | "high") {
    if (quality === "low") {
      this.mode = "B";
      this.logModeOnce();
    }
  }

  public getMode(): BlurMode {
    return this.mode;
  }

  public recordFrameTime(now: number) {
    if (!this.probeActive || this.mode === "B") return;

    if (this.lastTimestamp > 0) {
      const dt = now - this.lastTimestamp;
      this.frameTimes.push(dt);

      // Probe over first ~30 frames (~500ms)
      if (this.frameTimes.length >= 30) {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        if (avg > 24) {
          this.mode = "B";
          console.info(
            `[Scene 2 BlurManager] Frame time avg (${avg.toFixed(1)}ms > 24ms). Switched to Mode B (Soft Overlay).`
          );
        } else {
          this.logModeOnce();
        }
        this.probeActive = false;
      }
    }
    this.lastTimestamp = now;
  }

  public evaluate(p: number, reduceMotion: boolean = false): BlurState {
    this.logModeOnce();

    const clampedP = Math.min(1, Math.max(0, p));
    let blurPx = 0;
    let visionPercent = 8;

    if (reduceMotion) {
      // Reduced motion: Smooth fade without discrete hunting steps
      if (clampedP < 0.50) {
        const factor = 1 - clampedP / 0.50;
        blurPx = Math.round(28 * factor);
        visionPercent = Math.round(8 + (clampedP / 0.50) * 92);
      } else {
        blurPx = 0;
        visionPercent = 100;
      }
    } else {
      // Focus hunting steps: 28 -> 14 -> 20 -> 6 -> 10 -> 2 -> 0
      if (clampedP < 0.10) {
        blurPx = 28;
        visionPercent = 8 + Math.round((clampedP / 0.10) * 10);
      } else if (clampedP < 0.18) {
        blurPx = 14;
        visionPercent = 18 + Math.round(((clampedP - 0.10) / 0.08) * 17);
      } else if (clampedP < 0.27) {
        blurPx = 20; // overshoot 1
        visionPercent = 35 + Math.round(((clampedP - 0.18) / 0.09) * 15);
      } else if (clampedP < 0.36) {
        blurPx = 6;
        visionPercent = 50 + Math.round(((clampedP - 0.27) / 0.09) * 20);
      } else if (clampedP < 0.44) {
        blurPx = 10; // overshoot 2
        visionPercent = 70 + Math.round(((clampedP - 0.36) / 0.08) * 15);
      } else if (clampedP < 0.50) {
        blurPx = 2;
        visionPercent = 85 + Math.round(((clampedP - 0.44) / 0.06) * 15);
      } else {
        blurPx = 0;
        visionPercent = 100;
      }
    }

    const hasDoubleImage = blurPx > 8 && !reduceMotion;
    const overlayOpacity = Math.min(0.7, blurPx / 28);

    return {
      blurPx,
      hasDoubleImage,
      visionPercent,
      mode: this.mode,
      overlayOpacity,
    };
  }

  private logModeOnce() {
    if (!this.hasLoggedMode) {
      this.hasLoggedMode = true;
      console.info(
        `[Scene 2 BlurManager] Initialized Mode ${this.mode}: ${
          this.mode === "A" ? "Hardware CSS Filter Blur" : "Lightweight Soft Overlay"
        }`
      );
    }
  }

  public reset() {
    this.frameTimes = [];
    this.probeActive = true;
    this.lastTimestamp = 0;
  }
}

export const blurManager = new BlurEngine();
