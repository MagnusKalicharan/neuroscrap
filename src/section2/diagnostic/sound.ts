/**
 * src/section2/diagnostic/sound.ts
 * ============================================================
 * Section 2 Transmission Diagnostic Sound Synthesizer
 * 
 * Synthesizes all hardware switch, dial, lever, packet, and CRT sounds
 * in real-time via Web Audio API. Zero external audio file dependencies.
 * Features 20-60ms gain ramps (zero pop/click artifacts) and full fade-out.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;
let lastDialTickTime = 0;
let activeHumOsc: OscillatorNode | null = null;
let activeHumGain: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.24, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const diagnosticSound = {
  setMuted(muted: boolean) {
    isMuted = muted;
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(muted ? 0 : 0.24, audioCtx.currentTime);
    }
  },

  isMuted() {
    return isMuted;
  },

  /** Switch clack per detent: crisp dual-impulse mechanical toggle */
  playSwitchClack() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.045);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(2.2, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.055);
  },

  /** Dial tick: micro-click throttled to max 20 per second (50ms interval) */
  playDialTick() {
    if (isMuted) return;
    const now = performance.now();
    if (now - lastDialTickTime < 50) return;
    lastDialTickTime = now;

    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1850, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.016);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.02);
  },

  /** Auto-fill click and gentle calculator blip */
  playAutoFill() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, t);
    osc1.frequency.setValueAtTime(1320, t + 0.035);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(440, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.095);
    osc2.stop(t + 0.095);
  },

  /** Heavy hardware lever latch and metallic clunk */
  playLeverClunk() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.15);
  },

  /** Test run transmission hum: sweeps upward over ~1.4s */
  startTestHum() {
    if (isMuted) return;
    this.stopTestHum();
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 1.4);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.15);
    gain.gain.linearRampToValueAtTime(0.22, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.45);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 1.5);

    activeHumOsc = osc;
    activeHumGain = gain;
  },

  stopTestHum() {
    if (activeHumGain && audioCtx) {
      try {
        activeHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
        activeHumGain.gain.setValueAtTime(activeHumGain.gain.value, audioCtx.currentTime);
        activeHumGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
      } catch {}
    }
    if (activeHumOsc) {
      try {
        activeHumOsc.stop(audioCtx ? audioCtx.currentTime + 0.05 : 0);
      } catch {}
      activeHumOsc = null;
      activeHumGain = null;
    }
  },

  /** PASS chime: 3-note ascending arpeggio (C5 - E5 - G5) */
  playPassChime() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const startT = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteT = startT + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteT);

      gain.gain.setValueAtTime(0.0001, noteT);
      gain.gain.linearRampToValueAtTime(0.26, noteT + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteT + 0.38);

      osc.connect(gain);
      gain.connect(masterGain!);

      osc.start(noteT);
      osc.stop(noteT + 0.4);
    });
  },

  /** FAIL buzzer: short, low-pitched filtered buzz (110Hz + 116Hz) */
  playFailBuzzer() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = "square";
    osc1.frequency.setValueAtTime(110, t);
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(116, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(460, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.24);
    osc2.stop(t + 0.24);
  },

  /** Single electronic alert beep when dial pegs or auto-fill is over range */
  playOverRangeBeep() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(2200, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.085);
  },

  /** Panel slide whoosh: gentle filtered frequency sweep */
  playPanelSlide() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.18);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.19);
  },

  /** CRT power-on high-pitch coil resonance */
  playCrtPowerOn() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(4200, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.28);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.34);
  },

  /** Smooth fade-out on console exit (within 400ms) */
  fadeOutAndClose() {
    this.stopTestHum();
    if (masterGain && audioCtx) {
      try {
        const t = audioCtx.currentTime;
        masterGain.gain.cancelScheduledValues(t);
        masterGain.gain.setValueAtTime(masterGain.gain.value, t);
        masterGain.gain.linearRampToValueAtTime(0.0001, t + 0.35);
        setTimeout(() => {
          if (masterGain && audioCtx && !isMuted) {
            masterGain.gain.setValueAtTime(0.24, audioCtx.currentTime);
          }
        }, 400);
      } catch {}
    }
  },
};
