/**
 * Synthesized Audio Engine for Crash Cinematic
 * Strictly synced to CRASH_CUTS schedule with 30ms anti-pop gain ramps.
 * Master dynamics limiter ensures safe loudness levels.
 */

import { CRASH_CUTS } from "./types";

class CrashAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Active looping / continuous sound handles for clean cancellation
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;
  private alarmOsc: OscillatorNode | null = null;
  private alarmGain: GainNode | null = null;
  private tinnitusOsc: OscillatorNode | null = null;
  private tinnitusGain: GainNode | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.8;
  private isPlaying: boolean = false;

  private firedCues: Set<string> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = localStorage.getItem("scene1_audio_muted");
        if (savedMute !== null) this.isMuted = savedMute === "true";
        const savedVol = localStorage.getItem("scene1_audio_volume");
        if (savedVol !== null) this.volume = parseFloat(savedVol) || 0.8;
      } catch {}
    }
  }

  public init(existingCtx?: AudioContext | null): boolean {
    if (typeof window === "undefined") return false;

    if (existingCtx) {
      this.ctx = existingCtx;
    } else if (!this.ctx) {
      try {
        const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioClass) return false;
        this.ctx = new AudioClass();
      } catch {
        return false;
      }
    }

    if (this.ctx && !this.masterLimiter) {
      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.masterLimiter.knee.setValueAtTime(4, this.ctx.currentTime);
      this.masterLimiter.ratio.setValueAtTime(14, this.ctx.currentTime);
      this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.masterLimiter.release.setValueAtTime(0.08, this.ctx.currentTime);
      this.masterLimiter.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      const targetGain = this.isMuted ? 0.0001 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
      this.masterGain.connect(this.masterLimiter);

      // Pre-render 2-second white noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return true;
  }

  public start() {
    this.stopAll(0);
    this.isPlaying = true;
    this.firedCues.clear();
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // ── 0 ms: Rumble bed fades in (low noise + 40Hz sine, +6dB by 1400ms) ──
    try {
      this.rumbleOsc = this.ctx.createOscillator();
      const rumbleFilter = this.ctx.createBiquadFilter();
      this.rumbleGain = this.ctx.createGain();

      this.rumbleOsc.type = "sine";
      this.rumbleOsc.frequency.setValueAtTime(40, now);

      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.setValueAtTime(100, now);

      this.rumbleGain.gain.setValueAtTime(0.0001, now);
      // Fade in smoothly over 1400ms
      this.rumbleGain.gain.linearRampToValueAtTime(0.14, now + 1.4);

      this.rumbleOsc.connect(rumbleFilter);
      rumbleFilter.connect(this.rumbleGain);
      this.rumbleGain.connect(this.masterGain);

      this.rumbleOsc.start(now);
    } catch {}
  }

  /**
   * Syncs procedural audio events to current elapsed cinematic time (ms).
   * Pure evaluation based on threshold crossing.
   */
  public updateTime(timeMs: number) {
    if (!this.isPlaying || !this.ctx || !this.masterGain || this.isMuted) return;

    // 1400 ms: Warning tone (two soft beeps, 880 Hz, 120 ms)
    if (timeMs >= CRASH_CUTS.warning && !this.firedCues.has("warning")) {
      this.firedCues.add("warning");
      this.playWarningBeeps();
    }

    // 2000 ms: Impact boom, debris crash, cable snap zap
    if (timeMs >= CRASH_CUTS.impact && !this.firedCues.has("impact")) {
      this.firedCues.add("impact");
      this.playImpactBoom();
      this.playDebrisCrash();
      this.playCableSnapZap();
      this.playMetallicScream();
    }

    // 3700 ms: Second impact thud + glass crack, long scrape
    if (timeMs >= CRASH_CUTS.second && !this.firedCues.has("second")) {
      this.firedCues.add("second");
      this.playSecondImpact();
      this.playGlassCrack();
      this.playFloorScrape();
    }

    // 4400 ms: Muffled alarm loop, ringing 6kHz tone fading in
    if (timeMs >= CRASH_CUTS.aftermath && !this.firedCues.has("aftermath")) {
      this.firedCues.add("aftermath");
      this.startMuffledAlarm();
      this.startTinnitus();
    }

    // 5000 ms: Static noise rises, progressive lowpass
    if (timeMs >= CRASH_CUTS.degrade && !this.firedCues.has("degrade")) {
      this.firedCues.add("degrade");
      this.playDegradeStatic();
    }

    // 5800 ms: Soft power-down thunk, all sounds fade out by 6000
    if (timeMs >= 5800 && !this.firedCues.has("powerdown")) {
      this.firedCues.add("powerdown");
      this.playPowerDownThunk();
      this.stopAll(200);
    }
  }

  private playWarningBeeps() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      [0, 0.22].forEach((offset) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now + offset);

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.linearRampToValueAtTime(0.08, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
    } catch {}
  }

  private playImpactBoom() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.4);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(160, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.5);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.03); // 30ms anti-pop ramp
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch {}
  }

  private playDebrisCrash() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.6);
      filter.Q.setValueAtTime(2.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      src.start(now);
      src.stop(now + 0.75);
    } catch {}
  }

  private playCableSnapZap() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(2800, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  private playMetallicScream() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(120, now + 1.6);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(600, now + 0.1);
      filter.frequency.exponentialRampToValueAtTime(240, now + 1.6);
      filter.Q.setValueAtTime(5.0, now);

      gain.gain.setValueAtTime(0.0001, now + 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + 0.1);
      osc.stop(now + 1.7);
    } catch {}
  }

  private playSecondImpact() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  private playGlassCrack() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(3400, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      src.start(now);
      src.stop(now + 0.07);
    } catch {}
  }

  private playFloorScrape() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + 0.7);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      src.start(now);
      src.stop(now + 0.8);
    } catch {}
  }

  private startMuffledAlarm() {
    if (!this.ctx || !this.masterGain || this.alarmOsc) return;
    try {
      const now = this.ctx.currentTime;
      this.alarmOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.alarmGain = this.ctx.createGain();

      this.alarmOsc.type = "square";
      this.alarmOsc.frequency.setValueAtTime(440, now);
      this.alarmOsc.frequency.setValueAtTime(330, now + 0.4);
      this.alarmOsc.frequency.setValueAtTime(440, now + 0.8);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(380, now);

      this.alarmGain.gain.setValueAtTime(0.0001, now);
      this.alarmGain.gain.linearRampToValueAtTime(0.07, now + 0.2);
      this.alarmGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      this.alarmOsc.connect(filter);
      filter.connect(this.alarmGain);
      this.alarmGain.connect(this.masterGain);

      this.alarmOsc.start(now);
      this.alarmOsc.stop(now + 1.45);
    } catch {}
  }

  private startTinnitus() {
    if (!this.ctx || !this.masterGain || this.tinnitusOsc) return;
    try {
      const now = this.ctx.currentTime;
      this.tinnitusOsc = this.ctx.createOscillator();
      this.tinnitusGain = this.ctx.createGain();

      this.tinnitusOsc.type = "sine";
      this.tinnitusOsc.frequency.setValueAtTime(5800, now);

      this.tinnitusGain.gain.setValueAtTime(0.0001, now);
      this.tinnitusGain.gain.linearRampToValueAtTime(0.035, now + 0.6);
      this.tinnitusGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      this.tinnitusOsc.connect(this.tinnitusGain);
      this.tinnitusGain.connect(this.masterGain);

      this.tinnitusOsc.start(now);
      this.tinnitusOsc.stop(now + 1.45);
    } catch {}
  }

  private playDegradeStatic() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      src.start(now);
      src.stop(now + 0.85);
    } catch {}
  }

  private playPowerDownThunk() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.2);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  /**
   * Stops all active voices with gain ramp within fadeTimeMs (<=400ms).
   */
  public stopAll(fadeTimeMs: number = 300) {
    this.isPlaying = false;
    this.firedCues.clear();
    if (!this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const ramp = Math.max(0.03, fadeTimeMs / 1000);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + ramp);

      setTimeout(() => {
        try {
          this.rumbleOsc?.stop();
          this.alarmOsc?.stop();
          this.tinnitusOsc?.stop();
          this.rumbleOsc = null;
          this.alarmOsc = null;
          this.tinnitusOsc = null;
        } catch {}
      }, fadeTimeMs + 50);
    } catch {}
  }
}

export const crashAudio = new CrashAudioEngine();
