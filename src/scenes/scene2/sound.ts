/**
 * Procedural Web Audio Synth for Scene 2: Eyes Open and First Controls
 *
 * 100% synthesized Web Audio API (zero external audio files).
 * - Boot hum sweeping up
 * - Servo whirs for standing
 * - Radio formant voice + crackle & static bursts
 * - Tinnitus high sine tone fading out
 * - Footstep thuds on metal
 * - Positional beacon hum
 * - Arrival chime (positive pentatonic chord)
 * - Safe gain ramps (20-60ms) on all starts/stops to prevent pops.
 */

class Scene2SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  // Continuous sound nodes
  private tinnitusOsc: OscillatorNode | null = null;
  private tinnitusGain: GainNode | null = null;

  private beaconOsc: OscillatorNode | null = null;
  private beaconGain: GainNode | null = null;

  private isMuted: boolean = false;
  private volume: number = 0.8;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = localStorage.getItem("scene1_audio_muted");
        if (savedMute !== null) this.isMuted = savedMute === "true";
        const savedVol = localStorage.getItem("scene1_audio_volume");
        if (savedVol !== null) this.volume = Math.max(0, Math.min(1, parseFloat(savedVol) || 0.8));
      } catch {}
    }
  }

  public initAndResume(): boolean {
    if (typeof window === "undefined") return false;

    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return false;
        this.ctx = new AudioContextClass();

        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-3, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(16, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.08, this.ctx.currentTime);
        this.limiter.connect(this.ctx.destination);

        this.masterGain = this.ctx.createGain();
        const effectiveGain = this.isMuted ? 0 : this.volume;
        this.masterGain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
        this.masterGain.connect(this.limiter);

        // 2-second white noise buffer for radio crackle and servo noise
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

    return this.ctx?.state === "running";
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : this.volume, now + 0.05);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.05);
    }
  }

  /**
   * Start high tinnitus tone that slowly fades out as vision clears (disabled to prevent unwanted tones)
   */
  public startTinnitus() {
    // Disabled to eliminate humming/ringing tones
  }

  /**
   * Boot-up power hum sweeping up
   */
  public playBootHum() {
    if (!this.initAndResume() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 2.5);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.12, now + 2.0);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 3.1);
    } catch {}
  }

  /**
   * Servo whir during body rising (p in 0.55 .. 0.80)
   */
  public playServoWhir() {
    if (!this.initAndResume() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(320, now + 1.2);
      osc.frequency.linearRampToValueAtTime(220, now + 2.2);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.2);
      gain.gain.linearRampToValueAtTime(0.14, now + 1.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.4);
    } catch {}
  }

  /**
   * Metallic rise thuds
   */
  public playRiseThud(intensity: number = 1.0) {
    if (!this.initAndResume() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.25 * intensity, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }

  /**
   * Radio voice burst & static (ORACLE speech)
   */
  public playRadioVoiceBurst() {
    if (!this.initAndResume() || !this.ctx || !this.masterGain || !this.noiseBuffer) return;

    try {
      const now = this.ctx.currentTime;
      // White noise static burst
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(2400, now);
      noiseFilter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.4);

      // Synthesized formant vocal hum
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);

      const formant = this.ctx.createBiquadFilter();
      formant.type = "bandpass";
      formant.frequency.setValueAtTime(1100, now);
      formant.Q.setValueAtTime(5.0, now);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      oscGain.gain.linearRampToValueAtTime(0.06, now + 0.3);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(formant);
      formant.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.55);
    } catch {}
  }

  /**
   * Subtitle type tick
   */
  public playTypeTick() {
    if (!this.initAndResume() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(900 + Math.random() * 200, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.015, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  /**
   * Footstep metal click
   */
  public playFootstep() {
    if (!this.initAndResume() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(140 + Math.random() * 30, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  /**
   * Beacon hum disabled per user preference
   */
  public updateBeaconHum(_distance: number, _isActive: boolean) {
    if (this.beaconOsc) {
      try {
        this.beaconOsc.stop();
        this.beaconOsc.disconnect();
      } catch {}
      this.beaconOsc = null;
      this.beaconGain = null;
    }
  }

  /**
   * Arrival chime: Soft positive pentatonic chord
   */
  public playArrivalChime() {
    if (!this.initAndResume() || !this.ctx || !this.masterGain) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteOsc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        noteOsc.type = "sine";
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);

        const startTime = now + idx * 0.08;
        noteGain.gain.setValueAtTime(0.0001, startTime);
        noteGain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        noteOsc.connect(noteGain);
        noteGain.connect(this.masterGain);
        noteOsc.start(startTime);
        noteOsc.stop(startTime + 1.3);
      });
    } catch {}
  }

  /**
   * Fade out everything on scene finish or skip
   */
  public fadeOutAll(durationMs: number = 400) {
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + durationMs / 1000);
    }

    setTimeout(() => {
      this.tinnitusOsc?.stop();
      this.tinnitusOsc?.disconnect();
      this.tinnitusGain?.disconnect();
      this.tinnitusOsc = null;
      this.tinnitusGain = null;

      this.beaconOsc?.stop();
      this.beaconOsc?.disconnect();
      this.beaconGain?.disconnect();
      this.beaconOsc = null;
      this.beaconGain = null;

      // Restore volume setting for future scenes
      if (this.ctx && this.masterGain && !this.isMuted) {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    }, durationMs + 50);
  }
}

export const scene2Sound = new Scene2SoundEngine();
