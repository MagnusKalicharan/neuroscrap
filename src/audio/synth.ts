/**
 * synth.ts — Procedural Sci-Fi Sound Synthesizers (Web Audio API)
 * ===============================================================
 * 100% mathematical sound synthesis with ZERO external audio files.
 * Pre-renders transient sounds into reusable AudioBuffers for maximum CPU efficiency.
 * Continuous ambiences are built from efficient oscillator and filtered noise graphs.
 */

export type FootstepSurfaceType = "metal" | "grating" | "dirt" | "debris";

// Simple seeded pseudo-random number generator for reproducible noise textures
function createNoiseBuffer(ctx: AudioContext, duration: number, color: "white" | "pink" | "brown" = "white"): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (color === "white") {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
  } else {
    // Brown noise (integrated white noise)
    let lastOut = 0.0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }
  }
  return buffer;
}

// ─────────────────────────────────────────────────────────────
// PROCEDURAL REVERB IMPULSE RESPONSE GENERATOR
// ─────────────────────────────────────────────────────────────
/**
 * Creates an exponentially decaying stereo impulse response.
 * Simulates metal corridors: high frequencies decay faster than lows (darker tail).
 */
export function generateProceduralImpulseResponse(
  ctx: AudioContext,
  duration = 2.2,
  decay = 2.4,
  isExterior = false
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * (isExterior ? 0.35 : duration));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const lpCoeff = isExterior ? 0.85 : 0.985;
  let leftLP = 0;
  let rightLP = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Exponential envelope
    const env = Math.exp((-t * decay) / (isExterior ? 0.18 : 1.0));

    // Darkening factor: filter coefficients tighten as tail ages
    const adaptiveCoeff = lpCoeff * (1 - 0.45 * (i / length));

    const whiteL = (Math.random() * 2 - 1) * env;
    const whiteR = (Math.random() * 2 - 1) * env;

    leftLP = adaptiveCoeff * leftLP + (1 - adaptiveCoeff) * whiteL;
    rightLP = adaptiveCoeff * rightLP + (1 - adaptiveCoeff) * whiteR;

    left[i] = leftLP * 0.7 + whiteL * 0.3;
    right[i] = rightLP * 0.7 + whiteR * 0.3;
  }

  return buffer;
}

// ─────────────────────────────────────────────────────────────
// PRE-RENDERED TRANSIENT AUDIO BUFFERS
// ─────────────────────────────────────────────────────────────

/**
 * Renders 6 distinct variations of footsteps for each of the 4 surface types:
 * - metal: soft rubber-sole compression & dampened deck plate tap (no drum boom)
 * - grating: crisp lightweight mesh tap & subtle hollow chink (dry, fast decay)
 * - dirt: authentic soft powdery sand compression & granular sift (ZERO sines)
 * - debris: loose micro-grit crunch & subtle fragment settle
 */
export function renderFootstepBuffers(ctx: AudioContext): Map<string, AudioBuffer[]> {
  const result = new Map<string, AudioBuffer[]>();
  const surfaces: FootstepSurfaceType[] = ["metal", "grating", "dirt", "debris"];
  const sr = ctx.sampleRate;
  const dur = 0.12;
  const len = Math.floor(sr * dur);

  for (const surf of surfaces) {
    const list: AudioBuffer[] = [];
    for (let varIdx = 0; varIdx < 6; varIdx++) {
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      const rnd = (varIdx * 0.173) % 1.0;

      // Filter state for colored noise sculpting
      let lpState = 0;
      let bpState = 0;

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const white = Math.random() * 2 - 1;

        if (surf === "metal") {
          // Spaceship Metal Deck: soft rubber-soled boot impact on heavy plate
          // Low-pass filtered sole contact (350 Hz) + fast-damped composite tap
          lpState = lpState * 0.88 + white * 0.12;
          const soleEnv = Math.exp(-t * 65); // 25-30ms decay
          const soleContact = lpState * soleEnv;

          // Tiny damped mechanical plate tick (dies in 15ms, NO drum resonance)
          const tap = Math.sin(2 * Math.PI * (340 + rnd * 30) * t) * Math.exp(-t * 110) * 0.18;
          data[i] = (soleContact * 0.65 + tap * 0.35) * 0.38;
        } else if (surf === "grating") {
          // Catwalk Grating: crisp sole scuff & subtle hollow mesh tap
          // Band-pass noise around 1300 Hz
          bpState = bpState * 0.72 + white * 0.28;
          const grateEnv = Math.exp(-t * 75); // ~20ms
          const scuff = bpState * grateEnv;

          // Fast hollow mesh ping (decays in 18ms)
          const hollow = (
            Math.sin(2 * Math.PI * (1180 + rnd * 60) * t) * 0.16 +
            Math.sin(2 * Math.PI * (1620 + rnd * 80) * t) * 0.08
          ) * Math.exp(-t * 125);
          data[i] = (scuff * 0.65 + hollow * 0.35) * 0.36;
        } else if (surf === "dirt") {
          // Planet Surface: soft powdery sand / regolith compression (ZERO drums, ZERO tonal hum)
          // Gentle 10ms swell as boot sinks into sand, followed by soft granular sift
          const attack = Math.min(1.0, t / 0.012);
          const sandDecay = Math.exp(-t * 36);
          // Two-pole low-pass filter for powdery sand crunch texture
          lpState = lpState * 0.78 + white * 0.22;
          const sandCrunch = lpState * attack * sandDecay;

          // Subtle secondary grain sift trailing behind heel
          const sift = t > 0.025 ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.025) * 32) * 0.2 : 0;
          data[i] = (sandCrunch * 0.75 + sift * 0.25) * 0.38;
        } else {
          // Debris: loose micro-grit crunch & small fragment settle
          lpState = lpState * 0.82 + white * 0.18;
          const crunchEnv = Math.exp(-t * 50);
          const crunch = lpState * crunchEnv;

          // Tiny staggered micro-flake clicks
          const micro1 = (t > 0.018 && t < 0.035) ? (Math.random() * 2 - 1) * 0.22 : 0;
          const micro2 = (t > 0.042 && t < 0.060) ? (Math.random() * 2 - 1) * 0.15 : 0;
          data[i] = (crunch * 0.65 + micro1 + micro2) * 0.38;
        }
      }
      list.push(buf);
    }
    result.set(surf, list);
  }

  return result;
}

/**
 * Spark Zap: sharp noise burst + downward pitch sweep (50-120 ms)
 */
export function renderSparkZapBuffers(ctx: AudioContext): AudioBuffer[] {
  const list: AudioBuffer[] = [];
  const sr = ctx.sampleRate;
  const dur = 0.11;
  const len = Math.floor(sr * dur);

  for (let v = 0; v < 6; v++) {
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const startFreq = 3400 + (v % 3) * 450;
    const endFreq = 220 + (v % 2) * 60;

    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const progress = t / dur;
      // Exponential downward frequency sweep
      const freq = startFreq * Math.pow(endFreq / startFreq, progress);
      phase += (2 * Math.PI * freq) / sr;

      const saw = (phase % (2 * Math.PI)) / Math.PI - 1;
      const snap = (Math.random() * 2 - 1) * Math.exp(-t * 85);
      const tail = Math.exp(-t * 32);

      data[i] = (saw * 0.4 + snap * 0.6) * tail * 0.95;
    }
    list.push(buf);
  }
  return list;
}

/**
 * Hull Creak/Groan: descending resonant saw sweep with slow vibrato
 */
export function renderHullCreakBuffers(ctx: AudioContext): AudioBuffer[] {
  const list: AudioBuffer[] = [];
  const sr = ctx.sampleRate;
  const dur = 3.8;
  const len = Math.floor(sr * dur);

  for (let v = 0; v < 4; v++) {
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const baseFreq = 54 + v * 6;
    const endFreq = 26 + v * 3;
    const vibRate = 3.8 + v * 0.4;

    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const progress = t / dur;
      const vibrato = Math.sin(2 * Math.PI * vibRate * t) * 4.5;
      const freq = (baseFreq + (endFreq - baseFreq) * progress + vibrato);
      phase += (2 * Math.PI * Math.max(10, freq)) / sr;

      // Resonant harmonic content
      const saw = (phase % (2 * Math.PI)) / Math.PI - 1;
      const sine = Math.sin(phase * 0.5);

      // Smooth attack and long decay envelope
      let env = 1.0;
      if (t < 0.6) env = t / 0.6;
      else env = Math.exp(-(t - 0.6) * 0.75);

      data[i] = (saw * 0.5 + sine * 0.5) * env * 0.7;
    }
    list.push(buf);
  }
  return list;
}

/**
 * Distant Thud & Debris Rattle: low-pass thump with short rattle
 */
export function renderDistantThudBuffers(ctx: AudioContext): AudioBuffer[] {
  const list: AudioBuffer[] = [];
  const sr = ctx.sampleRate;
  const dur = 1.2;
  const len = Math.floor(sr * dur);

  for (let v = 0; v < 4; v++) {
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const thumpFreq = 65 + v * 12;

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const thump = Math.sin(2 * Math.PI * thumpFreq * Math.exp(-t * 4) * t) * Math.exp(-t * 6);
      const rattle = (Math.random() * 2 - 1) * Math.exp(-t * 18) * (t > 0.04 ? 0.3 : 0.05);
      data[i] = (thump * 0.75 + rattle * 0.35) * 0.85;
    }
    list.push(buf);
  }
  return list;
}

/**
 * Water Drip: short sine blip with pitch drop
 */
export function renderWaterDripBuffers(ctx: AudioContext): AudioBuffer[] {
  const list: AudioBuffer[] = [];
  const sr = ctx.sampleRate;
  const dur = 0.16;
  const len = Math.floor(sr * dur);

  for (let v = 0; v < 4; v++) {
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const startF = 1850 + v * 90;
    const endF = 920 + v * 40;

    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const progress = Math.min(1, t / 0.045);
      const freq = startF + (endF - startF) * progress;
      phase += (2 * Math.PI * freq) / sr;
      const blip = Math.sin(phase) * Math.exp(-t * 45);
      data[i] = blip * 0.8;
    }
    list.push(buf);
  }
  return list;
}

/**
 * UI & Interaction sound buffers: scanner, flashlight, door, lever, console, pickup, locked
 */
export function renderInteractionBuffers(ctx: AudioContext): Map<string, AudioBuffer> {
  const map = new Map<string, AudioBuffer>();
  const sr = ctx.sampleRate;

  // 1. Scanner Ping (with delayed filtered echo reflection)
  {
    const dur = 1.4;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const primary = Math.sin(2 * Math.PI * 1280 * t) * Math.exp(-t * 9);
      const echo1 = t > 0.28 ? Math.sin(2 * Math.PI * 960 * (t - 0.28)) * Math.exp(-(t - 0.28) * 7) * 0.35 : 0;
      const echo2 = t > 0.58 ? Math.sin(2 * Math.PI * 720 * (t - 0.58)) * Math.exp(-(t - 0.58) * 6) * 0.18 : 0;
      data[i] = (primary + echo1 + echo2) * 0.75;
    }
    map.set("scanner", buf);
  }

  // 2. Flashlight Click (Crisp mechanical switch impulse)
  {
    const dur = 0.035;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const click = Math.sin(2 * Math.PI * 2200 * Math.exp(-t * 120) * t) * Math.exp(-t * 160);
      const snap = (Math.random() * 2 - 1) * Math.exp(-t * 200);
      data[i] = (click * 0.6 + snap * 0.5) * 0.85;
    }
    map.set("flashlight", buf);
  }

  // 3. Bulkhead Door Motor Whirr + Air Hiss + Clunk
  {
    const dur = 1.1;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Pneumatic hiss
      const hiss = (Math.random() * 2 - 1) * Math.sin(Math.min(Math.PI, t * 3.2)) * 0.25;
      // Motor servo whine
      const motorFreq = 180 + t * 240;
      const motor = Math.sin(2 * Math.PI * motorFreq * t) * 0.28 * Math.exp(-t * 2);
      // Final latch clunk at t = 0.85
      const clunk = t > 0.82 ? Math.sin(2 * Math.PI * 130 * (t - 0.82)) * Math.exp(-(t - 0.82) * 25) * 0.7 : 0;
      data[i] = (hiss + motor + clunk) * 0.85;
    }
    map.set("door", buf);
  }

  // 4. Lever Clunk (Heavy mechanical metal latch impact)
  {
    const dur = 0.45;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const imp1 = Math.sin(2 * Math.PI * 340 * t) * Math.exp(-t * 30);
      const imp2 = t > 0.08 ? Math.sin(2 * Math.PI * 180 * (t - 0.08)) * Math.exp(-(t - 0.08) * 20) * 0.6 : 0;
      const metal = Math.sin(2 * Math.PI * 1420 * t) * Math.exp(-t * 40) * 0.3;
      data[i] = (imp1 + imp2 + metal) * 0.9;
    }
    map.set("lever", buf);
  }

  // 5. Console Boot Beeps (Dual-tone melodic chirp)
  {
    const dur = 0.28;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const tone1 = t < 0.12 ? Math.sin(2 * Math.PI * 1480 * t) * Math.exp(-t * 12) : 0;
      const tone2 = t >= 0.12 ? Math.sin(2 * Math.PI * 1920 * (t - 0.12)) * Math.exp(-(t - 0.12) * 12) : 0;
      data[i] = (tone1 + tone2) * 0.65;
    }
    map.set("console", buf);
  }

  // 6. Pickup Chime (Ascending bright harmonic arpeggio: E5, G#5, B5, E6)
  {
    const dur = 0.65;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const freqs = [659.25, 830.61, 987.77, 1318.51];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let sample = 0;
      for (let note = 0; note < freqs.length; note++) {
        const noteStart = note * 0.08;
        if (t >= noteStart) {
          const dt = t - noteStart;
          sample += Math.sin(2 * Math.PI * freqs[note] * dt) * Math.exp(-dt * 8) * 0.25;
        }
      }
      data[i] = sample * 0.8;
    }
    map.set("pickup", buf);
  }

  // 7. "Locked" Buzz (Dual low error buzz)
  {
    const dur = 0.32;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const active = (t < 0.12) || (t > 0.18 && t < 0.30);
      if (active) {
        // Low square buzz
        const sq = Math.sin(2 * Math.PI * 140 * t) > 0 ? 0.35 : -0.35;
        const sub = Math.sin(2 * Math.PI * 70 * t) * 0.2;
        data[i] = sq + sub;
      } else {
        data[i] = 0;
      }
    }
    map.set("locked", buf);
  }

  // 8. Synthetic Audio Log Voice (Formant filtered bursts + radio static)
  {
    const dur = 2.6;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const syllables = [180, 240, 200, 260, 190, 220, 250];

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Radio static backdrop
      const staticNoise = (Math.random() * 2 - 1) * 0.08;

      // Cadence envelope of "speech" syllables
      const sylIdx = Math.floor(t * 3.5) % syllables.length;
      const sylT = (t * 3.5) % 1.0;
      const sylEnv = Math.sin(sylT * Math.PI);

      if (sylEnv > 0.05 && t < 2.4) {
        const f0 = syllables[sylIdx];
        // Formant simulation (vocal tract resonance peaks)
        const formant1 = Math.sin(2 * Math.PI * f0 * t) * 0.35;
        const formant2 = Math.sin(2 * Math.PI * (f0 * 2.8) * t) * 0.25;
        const formant3 = Math.sin(2 * Math.PI * (f0 * 5.2) * t) * 0.15;
        const voice = (formant1 + formant2 + formant3) * sylEnv;
        data[i] = (voice + staticNoise) * 0.75;
      } else {
        data[i] = staticNoise * 0.5;
      }
    }
    map.set("audiolog", buf);
  }

  return map;
}

// ─────────────────────────────────────────────────────────────
// CONTINUOUS AMBIENCE PROCEDURAL GRAPH GENERATORS
// ─────────────────────────────────────────────────────────────

export interface ContinuousLoopControl {
  setIntensity: (v: number) => void;
  stop: () => void;
}

/**
 * 1. Machine Hum: Warm, gentle sub-bass sine drone (42 and 84 Hz) with soft lowpass filter.
 * 100% free of white noise, hiss, or harsh buzzy partials.
 */
export function startMachineHum(ctx: AudioContext, destination: AudioNode): ContinuousLoopControl {
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(42, ctx.currentTime);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(84, ctx.currentTime);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(80, ctx.currentTime);
  filter.Q.setValueAtTime(1.0, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, ctx.currentTime);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc1.start();
  osc2.start();

  return {
    setIntensity: (v: number) => {
      const t = ctx.currentTime;
      // Gentle, quiet, non-intrusive ambient presence
      gain.gain.linearRampToValueAtTime(Math.max(0.0, v * 0.12), t + 0.3);
      filter.frequency.linearRampToValueAtTime(65 + v * 30, t + 0.3);
    },
    stop: () => {
      try {
        osc1.stop();
        osc2.stop();
        gain.disconnect();
      } catch {}
    },
  };
}

/**
 * 2. Wind / Exterior Atmosphere: Soft, deep rolling desert breeze (active only outdoors).
 */
export function startWindSound(ctx: AudioContext, destination: AudioNode): ContinuousLoopControl {
  const noiseBuf = createNoiseBuffer(ctx, 4.0, "brown");
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(140, ctx.currentTime);
  filter.Q.setValueAtTime(1.0, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0, ctx.currentTime); // silent by default inside ship

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  noise.start();

  return {
    setIntensity: (v: number) => {
      const t = ctx.currentTime;
      gain.gain.linearRampToValueAtTime(Math.max(0.0, v * 0.12), t + 0.4);
      filter.frequency.linearRampToValueAtTime(120 + v * 60, t + 0.4);
    },
    stop: () => {
      try {
        noise.stop();
        gain.disconnect();
      } catch {}
    },
  };
}

/**
 * 3. Steam/Pipe Hiss: Barely audible gentle vapor whisper near coolant conduits.
 */
export function startSteamHiss(ctx: AudioContext, destination: AudioNode): ContinuousLoopControl {
  const noiseBuf = createNoiseBuffer(ctx, 3.0, "pink");
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;

  const bpFilter = ctx.createBiquadFilter();
  bpFilter.type = "bandpass";
  bpFilter.frequency.setValueAtTime(1200, ctx.currentTime);
  bpFilter.Q.setValueAtTime(1.2, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.02, ctx.currentTime);

  noise.connect(bpFilter);
  bpFilter.connect(gain);
  gain.connect(destination);

  noise.start();

  return {
    setIntensity: (v: number) => {
      gain.gain.linearRampToValueAtTime(Math.max(0.0, v * 0.04), ctx.currentTime + 0.2);
    },
    stop: () => {
      try {
        noise.stop();
        gain.disconnect();
      } catch {}
    },
  };
}

/**
 * 4. Electrical Buzz: Deep 60/120 Hz sine transformer hum (zero white noise crackle).
 */
export function startElectricalBuzz(ctx: AudioContext, destination: AudioNode): ContinuousLoopControl {
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(60, ctx.currentTime);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(120, ctx.currentTime);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(180, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0, ctx.currentTime);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc1.start();
  osc2.start();

  return {
    setIntensity: (v: number) => {
      gain.gain.linearRampToValueAtTime(Math.max(0.0, v * 0.08), ctx.currentTime + 0.15);
    },
    stop: () => {
      try {
        osc1.stop();
        osc2.stop();
        gain.disconnect();
      } catch {}
    },
  };
}

/**
 * 5. Alarm: Slow two-tone siren muffled by a lowpass, looping, quiet
 */
export function startAlarmLoop(ctx: AudioContext, destination: AudioNode): ContinuousLoopControl {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ctx.currentTime);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(580, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, ctx.currentTime);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start();

  // Two-tone cadence interval
  let high = true;
  const interval = setInterval(() => {
    if (ctx.state === "closed") {
      clearInterval(interval);
      return;
    }
    high = !high;
    osc.frequency.setValueAtTime(high ? 440 : 352, ctx.currentTime);
  }, 650);

  return {
    setIntensity: (v: number) => {
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, v * 0.18), ctx.currentTime + 0.2);
    },
    stop: () => {
      clearInterval(interval);
      try {
        osc.stop();
        gain.disconnect();
      } catch {}
    },
  };
}
