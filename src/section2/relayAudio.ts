/**
 * src/section2/relayAudio.ts — Section 2 Procedural Audio Engine
 * ============================================================
 * Pure Web Audio API sound synthesis:
 * - Rising 3-note scan chirp
 * - Scanning charge hum swell
 * - Surge node electrical zap & crackle
 * - Radio static chirp for ORACLE/SCRAP comms
 * Zero external audio files required.
 */

class RelayAudioEngine {
  private ctx: AudioContext | null = null;
  private scanHumOsc: OscillatorNode | null = null;
  private scanHumGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * 3-note rising major chime upon completing a node scan (523 -> 659 -> 784 Hz)
   */
  public playScanSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.075);

      gain.gain.setValueAtTime(0.001, now + idx * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.075 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.075 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.25);
    });
  }

  /**
   * Continuous charging hum swell while holding [E]/[F] to scan
   */
  public startScanCharge() {
    const ctx = this.getContext();
    if (!ctx || this.scanHumOsc) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.9);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    this.scanHumOsc = osc;
    this.scanHumGain = gain;
  }

  public stopScanCharge() {
    if (this.scanHumOsc && this.scanHumGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.scanHumGain.gain.cancelScheduledValues(now);
        this.scanHumGain.gain.setValueAtTime(this.scanHumGain.gain.value, now);
        this.scanHumGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        this.scanHumOsc.stop(now + 0.06);
      } catch {}
      this.scanHumOsc = null;
      this.scanHumGain = null;
    }
  }

  /**
   * Surge crackle zap sound near R3
   */
  public playSurgeZap() {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, ctx.currentTime);
    filter.Q.setValueAtTime(4.0, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  /**
   * Radio chirps for communications
   */
  public playRadioChirp() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1320, now + 0.03);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }
}

export const relayAudio = new RelayAudioEngine();
