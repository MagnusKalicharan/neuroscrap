/**
 * dataStation.sound.ts — Procedural Sound Synthesis Engine for Data Station
 * =========================================================================
 * 100% self-contained Web Audio API synthesizers for mechanical clicks,
 * CRT electromagnetic whine, data streaming clicks, and musical chimes.
 * Requires zero external audio files and incurs zero network latency.
 */

class DataStationAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private whineOsc: OscillatorNode | null = null;
  private whineGain: GainNode | null = null;
  private isMuted = false;

  private initCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Ambient static / hum sound removed as requested by user.
   */
  startAmbient(): void {
    // Proximity static sound removed
  }

  /**
   * Ambient static / hum distance attenuation removed as requested by user.
   */
  updateDistance(_distance: number): void {
    // Proximity static sound removed
  }

  /**
   * Tactile physical pendrive insert snap & click sound.
   */
  playInsertClick(): void {
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;
    // Fast dual burst: slide and latch
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.04);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Melodic 2-tone acknowledgment mount chirp (880 Hz -> 1320 Hz).
   */
  playMountChirp(): void {
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.07);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    gain.gain.setValueAtTime(0.12, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * High-speed packet transfer tick for streaming bytes.
   */
  playDataStreamTick(): void {
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  /**
   * Triumphant 3-note harmonic chime on upload completion (C5 -> E5 -> G5).
   */
  playLoadedChime(): void {
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.09;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.48);
    });
  }

  /**
   * Harsh descending sawtooth buzz on read/parity error.
   */
  playErrorBuzz(): void {
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.25);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Short muted denial thud when attempting interaction without pendrive.
   */
  playLockedBuzz(): void {
    const ctx = this.initCtx();
    if (!ctx || !this.masterGain || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Graceful fade-out of all active ambient audio nodes on unmount within 400ms.
   */
  dispose(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.humGain) {
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
    }
    if (this.whineGain) {
      this.whineGain.gain.cancelScheduledValues(now);
      this.whineGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
    }

    setTimeout(() => {
      try {
        if (this.humOsc) {
          this.humOsc.stop();
          this.humOsc.disconnect();
          this.humOsc = null;
        }
        if (this.whineOsc) {
          this.whineOsc.stop();
          this.whineOsc.disconnect();
          this.whineOsc = null;
        }
      } catch {
        // Ignore node shutdown errors
      }
    }, 380);
  }
}

export const dataStationAudio = new DataStationAudioEngine();
