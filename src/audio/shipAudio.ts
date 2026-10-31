/**
 * shipAudio.ts — Core Procedural Sci-Fi Spatial Audio Engine
 * ==========================================================
 * Professional Web Audio API architecture:
 *   - AudioContext lazily initialized on user interaction / pointer lock
 *   - Hierarchical audio buses: Master -> Compressor/Limiter -> Destination
 *     Sub-buses: Ambience, SFX, UI, Voice
 *   - Voice Management: Up to 24 simultaneous voices with priority voice stealing
 *   - True 3D HRTF Spatial Audio via pooled PannerNodes
 *   - Procedural convolution reverb with smooth Interior <-> Exterior crossfade (0..1)
 *   - Zero allocations in per-frame listener updates
 *   - External file replacement hook (registers .ogg/.mp3 files by sound name)
 *   - Persistent settings (localStorage) & safe loudness limiter (-6 dB threshold)
 */

import * as THREE from "three";
import {
  generateProceduralImpulseResponse,
  renderFootstepBuffers,
  renderSparkZapBuffers,
  renderHullCreakBuffers,
  renderDistantThudBuffers,
  renderWaterDripBuffers,
  renderInteractionBuffers,
  FootstepSurfaceType,
} from "./synth";

export type { FootstepSurfaceType };

// Scratch vectors for zero-allocation listener updates
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export type AudioBusType = "master" | "ambience" | "sfx" | "ui" | "voice";
export type AudioPriority = "low" | "medium" | "high" | "critical" | number;
export type AudioQualityPreset = "low" | "medium" | "high";

export interface PlayOptions {
  position?: [number, number, number] | THREE.Vector3;
  volume?: number;
  pitch?: number; // playbackRate multiplier (1.0 = normal)
  loop?: boolean;
  priority?: AudioPriority;
  bus?: "sfx" | "ambience" | "ui" | "voice";
  sendToReverb?: boolean;
}

export interface SoundHandle {
  id: number;
  name: string;
  stop: (fadeSeconds?: number) => void;
  setPosition: (x: number, y: number, z: number) => void;
  setVolume: (v: number) => void;
  setPitch: (playbackRate: number) => void;
  isPlaying: boolean;
}

interface ActiveVoice {
  id: number;
  name: string;
  source: AudioBufferSourceNode | OscillatorNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  priority: number;
  startTime: number;
  volume: number;
  isLooping: boolean;
  stop: (fadeSeconds?: number) => void;
}

export interface CaptionEvent {
  text: string;
  position?: [number, number, number];
  duration: number;
}

export type AudioEventListener = (...args: any[]) => void;

function priorityToNumber(p?: AudioPriority): number {
  if (typeof p === "number") return p;
  switch (p) {
    case "low": return 1;
    case "medium": return 2;
    case "high": return 3;
    case "critical": return 4;
    default: return 2;
  }
}

export class ShipAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Audio Bus Gain Nodes
  private masterGain: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private uiBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Reverb & Environmental Filters
  private convolverInterior: ConvolverNode | null = null;
  private convolverExterior: ConvolverNode | null = null;
  private reverbWetGainInterior: GainNode | null = null;
  private reverbWetGainExterior: GainNode | null = null;
  private environmentFilter: BiquadFilterNode | null = null;
  private currentEnvAmount = 1.0; // 1.0 = deep interior, 0.0 = outer planet surface

  // Voice tracking & voice stealing
  private nextVoiceId = 1;
  private activeVoices = new Map<number, ActiveVoice>();
  private maxVoices = 24;
  private qualityPreset: AudioQualityPreset = "high";

  // Pre-rendered procedural AudioBuffers
  private footstepBuffers = new Map<string, AudioBuffer[]>();
  private sparkZapBuffers: AudioBuffer[] = [];
  private hullCreakBuffers: AudioBuffer[] = [];
  private distantThudBuffers: AudioBuffer[] = [];
  private waterDripBuffers: AudioBuffer[] = [];
  private interactionBuffers = new Map<string, AudioBuffer>();

  // External audio file registry (replaces procedural sounds by name)
  private externalBuffers = new Map<string, AudioBuffer>();

  // Volume & Settings State (Subtle, balanced ambient level)
  private masterVol = 0.85;
  private ambienceVol = 0.25;
  private sfxVol = 0.80;
  private voiceVol = 0.90;
  private isMutedState = false;
  private reducedMotion = false;

  // Event Listeners (captions, voiceCount, level, etc.)
  private listeners = new Map<string, Set<AudioEventListener>>();

  constructor() {
    this.loadPersistedSettings();
    if (typeof window !== "undefined") {
      // Auto-suspend on tab hide, auto-resume when tab returns
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) {
          if (this.ctx.state === "running") this.ctx.suspend().catch(() => {});
        } else {
          if (this.ctx.state === "suspended" && !this.isMutedState) {
            this.ctx.resume().catch(() => {});
          }
        }
      });
    }
  }

  // ──────────────────────── INITIALIZATION ────────────────────────
  public init() {
    if (this.isInitialized || typeof window === "undefined") return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // 1. Master Dynamics Compressor / Limiter (-6 dB threshold, safe loudness)
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(14, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.limiter.connect(this.ctx.destination);

      // 2. Master AnalyserNode for audio level VU metering
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      // 3. Master Gain Node (ramps up over 0.5s to prevent pops)
      this.masterGain = this.ctx.createGain();
      const initialVol = this.isMutedState ? 0.0001 : this.masterVol;
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(initialVol, this.ctx.currentTime + 0.5);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.limiter);

      // 4. Sub-buses
      this.ambienceBus = this.ctx.createGain();
      this.ambienceBus.gain.setValueAtTime(this.ambienceVol, this.ctx.currentTime);
      this.ambienceBus.connect(this.masterGain);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxBus.connect(this.masterGain);

      this.uiBus = this.ctx.createGain();
      this.uiBus.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.uiBus.connect(this.masterGain);

      this.voiceBus = this.ctx.createGain();
      this.voiceBus.gain.setValueAtTime(this.voiceVol, this.ctx.currentTime);
      this.voiceBus.connect(this.masterGain);

      // 5. Environmental Lowpass Filter (9 kHz inside, 18 kHz outside)
      this.environmentFilter = this.ctx.createBiquadFilter();
      this.environmentFilter.type = "lowpass";
      this.environmentFilter.frequency.setValueAtTime(9000, this.ctx.currentTime);
      this.environmentFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
      this.environmentFilter.connect(this.masterGain);

      // 6. Dual Procedural Convolution Reverbs (Interior wet long, Exterior dry short)
      this.convolverInterior = this.ctx.createConvolver();
      this.convolverInterior.buffer = generateProceduralImpulseResponse(this.ctx, 2.2, 2.4, false);

      this.convolverExterior = this.ctx.createConvolver();
      this.convolverExterior.buffer = generateProceduralImpulseResponse(this.ctx, 0.4, 6.0, true);

      this.reverbWetGainInterior = this.ctx.createGain();
      this.reverbWetGainInterior.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.convolverInterior.connect(this.reverbWetGainInterior);
      this.reverbWetGainInterior.connect(this.environmentFilter);

      this.reverbWetGainExterior = this.ctx.createGain();
      this.reverbWetGainExterior.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.convolverExterior.connect(this.reverbWetGainExterior);
      this.reverbWetGainExterior.connect(this.masterGain);

      // 7. Synchronously Pre-Render all procedural AudioBuffers
      this.footstepBuffers = renderFootstepBuffers(this.ctx);
      this.sparkZapBuffers = renderSparkZapBuffers(this.ctx);
      this.hullCreakBuffers = renderHullCreakBuffers(this.ctx);
      this.distantThudBuffers = renderDistantThudBuffers(this.ctx);
      this.waterDripBuffers = renderWaterDripBuffers(this.ctx);
      this.interactionBuffers = renderInteractionBuffers(this.ctx);

      this.isInitialized = true;
    } catch (e) {
      console.warn("ShipAudioEngine init error:", e);
    }
  }

  /**
   * Resumes AudioContext on user gesture (Play button / pointer lock)
   */
  public resume(): Promise<void> {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      return this.ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  public getContext(): AudioContext | null {
    if (!this.isInitialized) this.init();
    return this.ctx;
  }

  // ──────────────────────── LISTENER & SPATIAL AUDIO ────────────────────────
  /**
   * Updates 3D audio listener position and orientation each frame with ZERO allocations.
   */
  public updateListener(camera: THREE.Camera) {
    if (!this.ctx || this.ctx.state !== "running") return;

    camera.getWorldDirection(_forward);
    const pos = camera.position;
    const listener = this.ctx.listener;
    const t = this.ctx.currentTime;

    if (listener.positionX) {
      listener.positionX.setValueAtTime(pos.x, t);
      listener.positionY.setValueAtTime(pos.y, t);
      listener.positionZ.setValueAtTime(pos.z, t);
      listener.forwardX.setValueAtTime(_forward.x, t);
      listener.forwardY.setValueAtTime(_forward.y, t);
      listener.forwardZ.setValueAtTime(_forward.z, t);
      listener.upX.setValueAtTime(_up.x, t);
      listener.upY.setValueAtTime(_up.y, t);
      listener.upZ.setValueAtTime(_up.z, t);
    } else {
      listener.setPosition(pos.x, pos.y, pos.z);
      listener.setOrientation(_forward.x, _forward.y, _forward.z, _up.x, _up.y, _up.z);
    }
  }

  /**
   * Creates an HRTF or Equalpower PannerNode tailored to the current quality preset.
   */
  public createPanner(
    x: number,
    y: number,
    z: number,
    refDist = 2.0,
    maxDist = 60.0
  ): PannerNode | null {
    if (!this.ctx) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = this.qualityPreset === "low" ? "equalpower" : "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = refDist;
    panner.maxDistance = maxDist;
    panner.rolloffFactor = 1.4;
    panner.coneInnerAngle = 360;

    const t = this.ctx.currentTime;
    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, t);
      panner.positionY.setValueAtTime(y, t);
      panner.positionZ.setValueAtTime(z, t);
    } else {
      panner.setPosition(x, y, z);
    }
    return panner;
  }

  // ──────────────────────── REVERB & ENVIRONMENT CROSSFADE ────────────────────────
  /**
   * Crossfades reverb and lowpass filter between Interior (1.0) and Exterior (0.0) over 0.8s.
   */
  public setEnvironment(amount: number) {
    if (!this.ctx) return;
    const clamped = Math.max(0, Math.min(1, amount));
    if (Math.abs(clamped - this.currentEnvAmount) < 0.02) return;
    this.currentEnvAmount = clamped;

    const t = this.ctx.currentTime;
    const dur = 0.8;

    // Filter: 18 kHz outside -> 9 kHz inside
    const targetFreq = 18000 - clamped * 9000;
    if (this.environmentFilter) {
      this.environmentFilter.frequency.cancelScheduledValues(t);
      this.environmentFilter.frequency.linearRampToValueAtTime(targetFreq, t + dur);
    }

    // Interior reverb: wetness ramps up with interior depth
    if (this.reverbWetGainInterior) {
      this.reverbWetGainInterior.gain.cancelScheduledValues(t);
      this.reverbWetGainInterior.gain.linearRampToValueAtTime(0.35 * clamped, t + dur);
    }

    // Exterior reverb: dry subtle echo
    if (this.reverbWetGainExterior) {
      this.reverbWetGainExterior.gain.cancelScheduledValues(t);
      this.reverbWetGainExterior.gain.linearRampToValueAtTime(0.08 * (1 - clamped), t + dur);
    }

    this.emit("environmentChange", clamped);
  }

  public getEnvironment(): number {
    return this.currentEnvAmount;
  }

  // ──────────────────────── VOICE MANAGEMENT & PLAYBACK ────────────────────────
  /**
   * Resolves the AudioBuffer for a given sound name (checking external registry first, then procedural).
   */
  private resolveBuffer(name: string): AudioBuffer | null {
    // 1. External loaded audio file override (.ogg/.mp3)
    if (this.externalBuffers.has(name)) {
      return this.externalBuffers.get(name)!;
    }

    // 2. Procedural interaction & UI sounds
    if (this.interactionBuffers.has(name)) {
      return this.interactionBuffers.get(name)!;
    }

    // 3. Transient arrays (random variation pick)
    if (name === "zap" || name === "spark") {
      const idx = Math.floor(Math.random() * this.sparkZapBuffers.length);
      return this.sparkZapBuffers[idx] || null;
    }
    if (name === "creak" || name === "groan") {
      const idx = Math.floor(Math.random() * this.hullCreakBuffers.length);
      return this.hullCreakBuffers[idx] || null;
    }
    if (name === "thud" || name === "rattle") {
      const idx = Math.floor(Math.random() * this.distantThudBuffers.length);
      return this.distantThudBuffers[idx] || null;
    }
    if (name === "drip" || name === "water") {
      const idx = Math.floor(Math.random() * this.waterDripBuffers.length);
      return this.waterDripBuffers[idx] || null;
    }

    // 4. Footsteps by surface (e.g. "footstep_metal", "footstep_grating", "footstep_dirt", "footstep_debris")
    if (name.startsWith("footstep_")) {
      const surf = name.replace("footstep_", "") as FootstepSurfaceType;
      const list = this.footstepBuffers.get(surf);
      if (list && list.length > 0) {
        const idx = Math.floor(Math.random() * list.length);
        return list[idx];
      }
    }

    return null;
  }

  /**
   * Enforces voice limits through priority-based voice stealing.
   */
  private enforceVoiceLimit(incomingPriority: number) {
    if (this.activeVoices.size < this.maxVoices) return;

    let candidate: ActiveVoice | null = null;
    let minScore = Infinity;

    // Search for lowest priority voice, then quietest / oldest
    this.activeVoices.forEach((voice) => {
      // Don't steal critical voices unless incoming is also critical
      if (voice.priority >= 4 && incomingPriority < 4) return;
      const score = voice.priority * 1000 + voice.volume * 100 + (this.ctx!.currentTime - voice.startTime);
      if (score < minScore) {
        minScore = score;
        candidate = voice;
      }
    });

    if (candidate) {
      (candidate as ActiveVoice).stop(0.04);
    }
  }

  /**
   * Master play API: plays any procedural or registered sound with spatial positioning,
   * priority voice stealing, pitch randomization, and reverb send.
   */
  public play(name: string, options: PlayOptions = {}): SoundHandle {
    if (!this.isInitialized) this.init();
    if (!this.ctx || this.isMutedState) {
      return this.createDummyHandle(name);
    }

    // Automatically resume if suspended
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    const buffer = this.resolveBuffer(name);
    if (!buffer) {
      return this.createDummyHandle(name);
    }

    const priority = priorityToNumber(options.priority);
    this.enforceVoiceLimit(priority);

    const voiceId = this.nextVoiceId++;
    const t = this.ctx.currentTime;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = !!options.loop;

    // Pitch variation: pitch multiplier or +/- 6% variation for footsteps
    let rate = options.pitch ?? 1.0;
    if (this.reducedMotion && options.volume && options.volume > 0.8) {
      options.volume = 0.8;
    }
    source.playbackRate.setValueAtTime(rate, t);

    // Voice Gain Node
    const voiceGain = this.ctx.createGain();
    const targetVol = options.volume ?? 1.0;
    voiceGain.gain.setValueAtTime(targetVol, t);

    // Routing: Source -> VoiceGain -> (Panner) -> Bus & (Reverb)
    source.connect(voiceGain);

    let panner: PannerNode | undefined;
    if (options.position) {
      const pos = Array.isArray(options.position)
        ? options.position
        : [options.position.x, options.position.y, options.position.z];
      panner = this.createPanner(pos[0], pos[1], pos[2]) || undefined;
      if (panner) {
        voiceGain.connect(panner);
      }
    }

    const destinationNode = panner || voiceGain;

    // Select bus
    const busType = options.bus || "sfx";
    let busNode = this.sfxBus;
    if (busType === "ambience") busNode = this.ambienceBus;
    else if (busType === "ui") busNode = this.uiBus;
    else if (busType === "voice") busNode = this.voiceBus;

    if (busNode) {
      destinationNode.connect(busNode);
    }

    // Send to Reverb Convolver if requested (or default for interior sound effects)
    if (options.sendToReverb !== false && this.convolverInterior && this.convolverExterior) {
      destinationNode.connect(this.convolverInterior);
      destinationNode.connect(this.convolverExterior);
    }

    // Voice cleanup handler
    let isPlaying = true;
    const cleanup = () => {
      if (!isPlaying) return;
      isPlaying = false;
      this.activeVoices.delete(voiceId);
      this.emit("voiceCount", this.activeVoices.size);
      try {
        source.disconnect();
        voiceGain.disconnect();
        if (panner) panner.disconnect();
      } catch {}
    };

    source.onended = cleanup;

    const stopFn = (fadeSec = 0.05) => {
      if (!isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      voiceGain.gain.cancelScheduledValues(now);
      voiceGain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
      setTimeout(() => {
        try {
          source.stop();
        } catch {}
        cleanup();
      }, fadeSec * 1000 + 10);
    };

    const activeVoice: ActiveVoice = {
      id: voiceId,
      name,
      source,
      gainNode: voiceGain,
      pannerNode: panner,
      priority,
      startTime: t,
      volume: targetVol,
      isLooping: !!options.loop,
      stop: stopFn,
    };

    this.activeVoices.set(voiceId, activeVoice);
    this.emit("voiceCount", this.activeVoices.size);

    source.start(t);

    // Return control handle
    const handle: SoundHandle = {
      id: voiceId,
      name,
      isPlaying: true,
      stop: stopFn,
      setPosition: (x: number, y: number, z: number) => {
        if (!panner || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (panner.positionX) {
          panner.positionX.setValueAtTime(x, now);
          panner.positionY.setValueAtTime(y, now);
          panner.positionZ.setValueAtTime(z, now);
        } else {
          panner.setPosition(x, y, z);
        }
      },
      setVolume: (v: number) => {
        if (!this.ctx) return;
        voiceGain.gain.linearRampToValueAtTime(Math.max(0.0001, v), this.ctx.currentTime + 0.05);
      },
      setPitch: (newRate: number) => {
        if (!this.ctx) return;
        source.playbackRate.setValueAtTime(Math.max(0.1, newRate), this.ctx.currentTime);
      },
    };

    return handle;
  }

  private createDummyHandle(name: string): SoundHandle {
    return {
      id: -1,
      name,
      isPlaying: false,
      stop: () => {},
      setPosition: () => {},
      setVolume: () => {},
      setPitch: () => {},
    };
  }

  // ──────────────────────── EXTERNAL AUDIO FILE LOADER HOOK ────────────────────────
  /**
   * Registers a pre-loaded AudioBuffer under a sound name.
   * Allows .ogg / .mp3 files to seamlessly replace any procedural sound by name.
   */
  public registerAudioBuffer(name: string, buffer: AudioBuffer) {
    this.externalBuffers.set(name, buffer);
  }

  /**
   * Asynchronously loads and decodes an external audio file (.ogg/.mp3) to replace a sound.
   */
  public async loadAudioFile(name: string, url: string): Promise<AudioBuffer> {
    if (!this.ctx) this.init();
    if (!this.ctx) throw new Error("AudioContext unavailable");

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.registerAudioBuffer(name, audioBuffer);
    return audioBuffer;
  }

  // ──────────────────────── EVENT & CAPTION SYSTEM ────────────────────────
  public on(event: string, callback: AudioEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: AudioEventListener) {
    this.listeners.get(event)?.delete(callback);
  }

  public emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error("Audio event callback error:", e);
      }
    });
  }

  /**
   * Emits accessibility caption text if within audible range.
   */
  public triggerCaption(text: string, position?: [number, number, number], duration = 2.0) {
    this.emit("caption", { text, position, duration });
  }

  // ──────────────────────── SETTINGS, VOLUME & ANALYSER ────────────────────────
  public setMasterVolume(v: number) {
    this.masterVol = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx && !this.isMutedState) {
      this.masterGain.gain.linearRampToValueAtTime(this.masterVol, this.ctx.currentTime + 0.05);
    }
    this.persistSettings();
  }

  public getMasterVolume(): number {
    return this.masterVol;
  }

  public setMuted(muted: boolean) {
    this.isMutedState = muted;
    if (this.masterGain && this.ctx) {
      const target = muted ? 0.0001 : this.masterVol;
      this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.08);
    }
    this.persistSettings();
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setAmbienceVolume(v: number) {
    this.ambienceVol = Math.max(0, Math.min(1, v));
    if (this.ambienceBus && this.ctx) {
      this.ambienceBus.gain.linearRampToValueAtTime(this.ambienceVol, this.ctx.currentTime + 0.05);
    }
    this.persistSettings();
  }

  public getAmbienceVolume(): number {
    return this.ambienceVol;
  }

  public setSfxVolume(v: number) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.linearRampToValueAtTime(this.sfxVol, this.ctx.currentTime + 0.05);
    }
    this.persistSettings();
  }

  public getSfxVolume(): number {
    return this.sfxVol;
  }

  public setQuality(quality: AudioQualityPreset) {
    this.qualityPreset = quality;
    if (quality === "low") this.maxVoices = 12;
    else if (quality === "medium") this.maxVoices = 18;
    else this.maxVoices = 24;
  }

  public getQuality(): AudioQualityPreset {
    return this.qualityPreset;
  }

  public setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  public getActiveVoiceCount(): number {
    return this.activeVoices.size;
  }

  /**
   * Returns current master audio output level (0.0 to 1.0) for visual VU meters.
   */
  public getMasterLevel(): number {
    if (!this.analyser || !this.ctx || this.isMutedState) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128;
      sum += val * val;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 2.8);
  }

  private persistSettings() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "ship_audio_settings",
          JSON.stringify({
            master: this.masterVol,
            ambience: this.ambienceVol,
            sfx: this.sfxVol,
            muted: this.isMutedState,
          })
        );
      }
    } catch {}
  }

  private loadPersistedSettings() {
    try {
      if (typeof localStorage !== "undefined") {
        const item = localStorage.getItem("ship_audio_settings");
        if (item) {
          const s = JSON.parse(item);
          if (typeof s.master === "number") this.masterVol = s.master;
          if (typeof s.ambience === "number") this.ambienceVol = Math.min(0.35, s.ambience);
          if (typeof s.sfx === "number") this.sfxVol = s.sfx;
          if (typeof s.muted === "boolean") this.isMutedState = s.muted;
        }
      }
    } catch {}
  }

  // ──────────────────────── BACKWARD COMPATIBILITY HELPERS ────────────────────────
  public playSpark(x: number, y: number, z: number) {
    this.play("zap", {
      position: [x, y, z],
      volume: 0.9,
      pitch: 0.95 + Math.random() * 0.1,
      priority: "high",
    });
    this.triggerCaption("[sparks crackle]", [x, y, z], 1.8);
  }

  public playFootstep(surface: FootstepSurfaceType = "metal", isSprint = false) {
    const pitch = (isSprint ? 0.94 : 1.0) + (Math.random() - 0.5) * 0.10;
    // Balanced, subtle, non-distracting step volume sitting gently in the mix
    const vol = (isSprint ? 0.30 : 0.20) * (0.92 + Math.random() * 0.16);
    this.play(`footstep_${surface}`, {
      volume: vol,
      pitch,
      priority: "low",
      sendToReverb: surface === "metal" || surface === "grating",
    });
  }

  public playFlashlightClick() {
    this.play("flashlight", { volume: 0.7, bus: "ui" });
  }

  public playConsoleBeep() {
    this.play("console", { volume: 0.8, bus: "ui" });
  }

  public playDoorCycle(x: number, y: number, z: number, willOpen = true) {
    this.play("door", {
      position: [x, y, z],
      volume: 0.85,
      pitch: willOpen ? 1.05 : 0.95,
      priority: "high",
    });
    this.triggerCaption(willOpen ? "[bulkhead door opens]" : "[bulkhead door closes]", [x, y, z], 2.2);
  }

  public playPowerRestoreSequence() {
    this.play("lever", { volume: 1.0, priority: "critical" });
    this.triggerCaption("[reactor turbine spins up]", undefined, 3.5);
  }

  public dispose() {
    this.activeVoices.forEach((v) => v.stop(0.01));
    this.activeVoices.clear();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close();
    }
    this.isInitialized = false;
  }
}

// Global Singleton Instance
export const shipAudio = new ShipAudioEngine();
