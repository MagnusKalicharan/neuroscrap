/**
 * Procedural Web Audio Synth for Scene 1
 *
 * 100% synthesized (zero external audio files).
 * Uses gain ramps on every start/stop (20-60ms) to eliminate clicks and pops.
 * Employs a master limiter (DynamicsCompressorNode) for volume safety.
 * Gracefully operates when audio context is blocked or suspended.
 */

class Scene1SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  // Continuous sound nodes
  private humOsc1: OscillatorNode | null = null;
  private humOsc2: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private isHumming: boolean = false;

  private activeNodes: Set<{ stop?: (time?: number) => void; disconnect?: () => void }> = new Set();

  private volume: number = 0.8;
  private isMuted: boolean = false;

  private lastTypeTickTime: number = 0;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = localStorage.getItem("scene1_audio_muted");
        if (savedMute !== null) this.isMuted = savedMute === "true";
        const savedVol = localStorage.getItem("scene1_audio_volume");
        if (savedVol !== null) this.volume = Math.max(0, Math.min(1, parseFloat(savedVol) || 0.8));
      } catch {
        // Fallback to defaults if localStorage is unavailable
      }
    }
  }

  /**
   * Initializes and resumes the AudioContext synchronously inside user gesture handler.
   */
  public initAndResume(): boolean {
    if (typeof window === "undefined") return false;

    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return false;
        this.ctx = new AudioContextClass();

        // Master Limiter / Compressor to avoid any loud peaks or clipping
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-4, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(16, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.08, this.ctx.currentTime);
        this.limiter.connect(this.ctx.destination);

        // Master Gain
        this.masterGain = this.ctx.createGain();
        const effectiveGain = this.isMuted ? 0 : this.volume;
        this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        // Master fade-in 0.5s
        this.masterGain.gain.linearRampToValueAtTime(effectiveGain, this.ctx.currentTime + 0.5);
        this.masterGain.connect(this.limiter);

        // Pre-create 1s white noise buffer for procedural crash & scrape sounds
        const bufferSize = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } catch {
        return false;
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return true;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.volume;
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(target, now + 0.04);
    }
    try {
      localStorage.setItem("scene1_audio_volume", this.volume.toString());
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.volume;
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(target, now + 0.04);
    }
    try {
      localStorage.setItem("scene1_audio_muted", this.isMuted ? "true" : "false");
    } catch {}
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isAudioRunning(): boolean {
    if (this.isMuted) return true;
    if (!this.ctx) return true;
    return this.ctx.state === "running" || this.ctx.state === "suspended";
  }

  // ─────────────────────────────────────────────────────────────
  // PROCEDURAL SOUND GENERATORS
  // ─────────────────────────────────────────────────────────────

  /** UI Hover Tick: soft, snappy, non-intrusive */
  public playHoverTick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.03);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  /** UI Play Click */
  public playClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  /** Power-Down Thunk: low mechanical power thud + bass drop */
  public playPowerDownThunk() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // Sub-bass sweep
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.45);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch {}
  }

  /** Start Electrical Hum Bed */
  public startHumBed() {
    if (!this.ctx || !this.masterGain || this.isHumming) return;
    try {
      const now = this.ctx.currentTime;
      this.isHumming = true;

      this.humOsc1 = this.ctx.createOscillator();
      this.humOsc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      this.humGain = this.ctx.createGain();

      this.humOsc1.type = "sine";
      this.humOsc1.frequency.setValueAtTime(58, now);

      this.humOsc2.type = "triangle";
      this.humOsc2.frequency.setValueAtTime(116, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(140, now);

      // Smooth fade in over 600ms
      this.humGain.gain.setValueAtTime(0.0001, now);
      this.humGain.gain.linearRampToValueAtTime(0.05, now + 0.6);

      this.humOsc1.connect(filter);
      this.humOsc2.connect(filter);
      filter.connect(this.humGain);
      this.humGain.connect(this.masterGain);

      this.humOsc1.start(now);
      this.humOsc2.start(now);
    } catch {}
  }

  /** Stop Electrical Hum Bed */
  public stopHumBed() {
    if (!this.isHumming || !this.ctx || !this.humGain) return;
    try {
      const now = this.ctx.currentTime;
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);

      const osc1 = this.humOsc1;
      const osc2 = this.humOsc2;
      setTimeout(() => {
        try {
          osc1?.stop();
          osc2?.stop();
          osc1?.disconnect();
          osc2?.disconnect();
        } catch {}
      }, 350);

      this.humOsc1 = null;
      this.humOsc2 = null;
      this.humGain = null;
      this.isHumming = false;
    } catch {}
  }

  /**
   * Typewriter Tick: very soft tick per 2 characters.
   * Throttled, random pitch +-5%, max 25 ticks/sec.
   */
  public playTypeTick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const nowMs = performance.now();
    // Maximum 25 ticks per second (minimum 40ms interval)
    if (nowMs - this.lastTypeTickTime < 40) return;
    this.lastTypeTickTime = nowMs;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch +-5% random variation
      const jitter = 1 + (Math.random() * 0.1 - 0.05);
      const freq = 2100 * jitter;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch {}
  }

  /** Radio Blip Sound */
  public playRadioBlip() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1420, now);
      osc.frequency.setValueAtTime(1860, now + 0.06);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  /**
   * Crash Flash Sound Beat:
   * Low rumble, metal scrape, 2 spark zaps, muffled alarm fading out.
   */
  public playCrashSequence() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // 1. Low Rumble
      const rumbleOsc = this.ctx.createOscillator();
      const rumbleFilter = this.ctx.createBiquadFilter();
      const rumbleGain = this.ctx.createGain();

      rumbleOsc.type = "triangle";
      rumbleOsc.frequency.setValueAtTime(65, now);
      rumbleOsc.frequency.exponentialRampToValueAtTime(32, now + 2.0);

      rumbleFilter.type = "lowpass";
      rumbleFilter.frequency.setValueAtTime(110, now);

      rumbleGain.gain.setValueAtTime(0.0001, now);
      rumbleGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      rumbleOsc.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(this.masterGain);

      rumbleOsc.start(now);
      rumbleOsc.stop(now + 2.3);

      // 2. Metal Scrape (Noise sweep)
      if (this.noiseBuffer) {
        const scrapeSource = this.ctx.createBufferSource();
        scrapeSource.buffer = this.noiseBuffer;
        const scrapeFilter = this.ctx.createBiquadFilter();
        const scrapeGain = this.ctx.createGain();

        scrapeFilter.type = "bandpass";
        scrapeFilter.frequency.setValueAtTime(450, now);
        scrapeFilter.frequency.exponentialRampToValueAtTime(220, now + 1.2);
        scrapeFilter.Q.setValueAtTime(4.0, now);

        scrapeGain.gain.setValueAtTime(0.0001, now);
        scrapeGain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        scrapeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        scrapeSource.connect(scrapeFilter);
        scrapeFilter.connect(scrapeGain);
        scrapeGain.connect(this.masterGain);

        scrapeSource.start(now);
        scrapeSource.stop(now + 1.5);
      }

      // 3. Two Spark Zaps (at t=0.2s and t=0.9s)
      this.scheduleSparkZap(now + 0.2);
      this.scheduleSparkZap(now + 0.9);

      // 4. Muffled Warning Alarm (Square wave pulsed through low-pass)
      const alarmOsc = this.ctx.createOscillator();
      const alarmFilter = this.ctx.createBiquadFilter();
      const alarmGain = this.ctx.createGain();

      alarmOsc.type = "square";
      alarmOsc.frequency.setValueAtTime(420, now + 0.25);
      alarmOsc.frequency.setValueAtTime(320, now + 0.65);
      alarmOsc.frequency.setValueAtTime(420, now + 1.05);
      alarmOsc.frequency.setValueAtTime(320, now + 1.45);

      alarmFilter.type = "lowpass";
      alarmFilter.frequency.setValueAtTime(480, now);

      alarmGain.gain.setValueAtTime(0.0001, now);
      alarmGain.gain.setValueAtTime(0.0001, now + 0.2);
      alarmGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      alarmGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      alarmOsc.connect(alarmFilter);
      alarmFilter.connect(alarmGain);
      alarmGain.connect(this.masterGain);

      alarmOsc.start(now + 0.2);
      alarmOsc.stop(now + 2.1);
    } catch {}
  }

  private scheduleSparkZap(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(2600, time);
      osc.frequency.exponentialRampToValueAtTime(180, time + 0.06);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.09, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.08);
    } catch {}
  }

  /** Boot Chime */
  public playBootChime() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.08 + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.3);
      });
    } catch {}
  }

  /**
   * Fade all sounds out smoothly over 400ms (used on skip and unmount).
   */
  public fadeOutAll(durationMs: number = 400) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const rampTime = durationMs / 1000;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + rampTime);

      setTimeout(() => {
        this.stopHumBed();
      }, durationMs);
    } catch {}
  }
}

export const scene1Sound = new Scene1SoundEngine();
