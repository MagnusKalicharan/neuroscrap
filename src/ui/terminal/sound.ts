/**
 * sound.ts — Web Audio Procedural Sound Synthesizer for Terminal
 * =============================================================
 * Zero external audio files required. All sounds synthesized in real-time.
 * Features 20-60ms gain ramps (zero click/pop artifacts) and throttled key ticks.
 *
 * Mute sync: terminalSound.syncMuteWithShipAudio(isMuted) must be called by the
 * host (e.g. Game.tsx or AudioSettingsPanel) whenever shipAudio mute state changes.
 * This keeps mute state in sync without a circular import dependency.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;
let lastTickTime = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const terminalSound = {
  setMuted(muted: boolean) {
    isMuted = muted;
    if (masterGain && audioCtx) {
      // 30ms ramp to avoid click/pop artifacts
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.2, audioCtx.currentTime + 0.03);
    }
  },

  isMuted() {
    return isMuted;
  },

  /**
   * Sync mute state with shipAudio (one-way: shipAudio → terminalSound).
   * Call this from Game.tsx / AudioSettingsPanel whenever shipAudio.setMuted()
   * is called, to keep terminal synth sounds in lockstep.
   * Does NOT import shipAudio — avoids circular dependency.
   */
  syncMuteWithShipAudio(shipMuted: boolean) {
    if (isMuted !== shipMuted) {
      terminalSound.setMuted(shipMuted);
    }
  },

  /** Power-on hum: 60Hz mains hum fading in over 300ms */
  playPowerOnHum() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(60, t);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(120, t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(240, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.25);
    osc2.stop(t + 1.25);
  },

  /** Key tick: soft, throttled at 45ms */
  playKeyTick() {
    if (isMuted) return;
    const now = performance.now();
    if (now - lastTickTime < 45) return;
    lastTickTime = now;

    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1250, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.018);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.022);
  },

  /** Select blip: ascending crisp chirp */
  playSelectBlip() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.045);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.052);
  },

  /** Back blip: descending cancellation chirp */
  playBackBlip() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1320, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.045);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.052);
  },

  /** Error buzz: low raspy saw buzz for empty slots */
  playErrorBuzz() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.125);
  },

  /** Upload progress tick */
  playUploadTick() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(2200, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.018);
  },

  /** Success chime: ascending 3-note arpeggio */
  playSuccessChime() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      osc.connect(gain);
      gain.connect(masterGain!);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  },

  /** Eject click: solid mechanical latch sound */
  playEjectClick() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.06);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.075);
  },

  /** Different short mechanical clunk per measuring instrument */
  playToolClunk(toolId: string) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    switch (toolId) {
      case "peak":
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(750, t + 0.04);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.24, t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
      case "average":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.06);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
        osc.start(t);
        osc.stop(t + 0.07);
        break;
      case "width":
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.045);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.055);
        break;
      case "flicker":
        osc.type = "square";
        osc.frequency.setValueAtTime(840, t);
        osc.frequency.exponentialRampToValueAtTime(420, t + 0.035);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        osc.start(t);
        osc.stop(t + 0.045);
        break;
      case "period":
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, t); // D5
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.05);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.start(t);
        osc.stop(t + 0.06);
        break;
      case "color":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(340, t);
        osc.frequency.exponentialRampToValueAtTime(560, t + 0.055);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.24, t + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.start(t);
        osc.stop(t + 0.065);
        break;
      case "noise":
      default:
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.05);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.20, t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.start(t);
        osc.stop(t + 0.06);
        break;
    }

    osc.connect(gain);
    gain.connect(masterGain);
  },

  /** Snap tick: crisp mechanical snap when tool seats on curve */
  playSnapTick() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.02);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.26, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.028);
  },

  /** Jump counter tick: short pop for each rapid jump step */
  playJumpTick(idx: number = 0) {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || !masterGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1100 + (idx % 6) * 90, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.02);
  },
};
