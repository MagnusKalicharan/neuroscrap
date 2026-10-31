"use client";
/**
 * ShipAudio.tsx — Scene Audio Coordinator & Spatial Sound Manager
 * ==============================================================
 * Connects the procedural Web Audio engine (shipAudio.ts) to the Three.js scene:
 *   - Updates listener transform every frame with zero memory allocations
 *   - Manages layered continuous ambiences (zone-aware reactor hum, roof wind, steam, alarm)
 *   - Distance-gated electrical cable buzzers (strictly 6 nearest active loops)
 *   - Dynamic footstep distance accumulator & surface material detection
 *   - Procedural hull creaks (8-25s) and distant thuds scheduler
 *   - Native vanilla DOM overlay for accessibility captions & debug panel ([U] key)
 *   - Completely immune to R3F reconciler interference (returns null to Three.js scene)
 */

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  shipAudio,
  FootstepSurfaceType,
  CaptionEvent,
  AudioQualityPreset,
} from "./shipAudio";
import {
  startMachineHum,
  startWindSound,
  startElectricalBuzz,
  startSteamHiss,
  startAlarmLoop,
  ContinuousLoopControl,
} from "./synth";
import { onSparkBurst, offSparkBurst, SparkEvent } from "../components/ship/sparks";
import { CABLES } from "../components/ship/layout";

export interface VentDef {
  position: [number, number, number];
  closed?: boolean;
}

export interface ShipAudioProps {
  playerPositionRef?: React.RefObject<THREE.Vector3>;
  cameraRef?: React.RefObject<THREE.Camera>;
  quality?: AudioQualityPreset;
  getCablePositions?: () => THREE.Vector3Tuple[] | { [id: string]: THREE.Vector3 };
  isInsideShip?: (pos: THREE.Vector3) => boolean;
  zoneAt?: (pos: THREE.Vector3) => string;
  ventPositions?: VentDef[];
  puddlePositions?: [number, number, number][];
  reducedMotion?: boolean;
  showCaptions?: boolean;
}

export interface FootstepNotification {
  speed: number;
  sprinting: boolean;
  surface: FootstepSurfaceType;
}

// Global hooks for external components
let globalNotifyFootstep: ((info: FootstepNotification) => void) | null = null;
export function notifyFootstep(info: FootstepNotification) {
  globalNotifyFootstep?.(info);
}

export function playInteraction(
  name: "scanner" | "flashlight" | "door" | "lever" | "console" | "pickup" | "locked" | "audiolog",
  position?: [number, number, number]
) {
  switch (name) {
    case "scanner":
      shipAudio.play("scanner", { bus: "ui", volume: 0.85 });
      shipAudio.triggerCaption("[sonar ping echo]", position, 2.0);
      break;
    case "flashlight":
      shipAudio.play("flashlight", { bus: "ui", volume: 0.75 });
      break;
    case "door":
      if (position) shipAudio.playDoorCycle(position[0], position[1], position[2]);
      else shipAudio.play("door", { volume: 0.85 });
      break;
    case "lever":
      shipAudio.play("lever", { position, volume: 1.0, priority: "critical" });
      shipAudio.triggerCaption("[heavy power lever engaged]", position, 2.5);
      break;
    case "console":
      shipAudio.play("console", { position, bus: "ui", volume: 0.8 });
      shipAudio.triggerCaption("[terminal boot tone]", position, 1.8);
      break;
    case "pickup":
      shipAudio.play("pickup", { position, bus: "ui", volume: 0.85 });
      shipAudio.triggerCaption("[item recovered]", position, 2.0);
      break;
    case "locked":
      shipAudio.play("locked", { position, bus: "ui", volume: 0.75 });
      shipAudio.triggerCaption("[access denied]", position, 1.5);
      break;
    case "audiolog":
      shipAudio.play("audiolog", { position, bus: "voice", volume: 0.95, priority: "high" });
      shipAudio.triggerCaption("[audio log playback]", position, 3.0);
      break;
  }
}

/**
 * Computes footstep surface type from player world position
 */
export function surfaceAt(pos: THREE.Vector3 | [number, number, number]): FootstepSurfaceType {
  const x = Array.isArray(pos) ? pos[0] : pos.x;
  const z = Array.isArray(pos) ? pos[2] : pos.z;

  // 1. Central metal catwalk grating running from stern to bridge
  if (Math.abs(x) <= 1.25 && z >= -48 && z <= 38) {
    return "grating";
  }

  // 2. Main ship hull interior
  if (Math.abs(x) <= 6.5 && z >= -48 && z <= 40) {
    // Check if in debris zones near breach edges
    if ((z >= 12 && z <= 17 && Math.abs(x) > 3.5) || (z >= -12 && z <= -7 && Math.abs(x) > 4.0)) {
      return "debris";
    }
    return "metal";
  }

  // 3. Starboard egress loading ramp (heavy metal grating)
  if (x >= 6.5 && x <= 15.0 && z >= 2.0 && z <= 14.0) {
    return "grating";
  }

  // 4. Exterior alien regolith terrain
  return "dirt";
}

// Scratch vector for distance computations
const _posScratch = new THREE.Vector3();

// ─────────────────────────────────────────────────────────────
// MAIN SHIP AUDIO COORDINATOR (R3F COMPONENT)
// ─────────────────────────────────────────────────────────────
export function ShipAudio({
  playerPositionRef,
  cameraRef,
  quality = "high",
  getCablePositions,
  isInsideShip,
  zoneAt,
  ventPositions,
  puddlePositions,
  reducedMotion = false,
  showCaptions = false,
}: ShipAudioProps) {
  const { camera } = useThree();
  const activeCamera = cameraRef?.current || camera;

  // Continuous sound loop controls
  const machineHumRef = useRef<ContinuousLoopControl | null>(null);
  const windSoundRef = useRef<ContinuousLoopControl | null>(null);
  const alarmSoundRef = useRef<ContinuousLoopControl | null>(null);
  const steamVentsRef = useRef<ContinuousLoopControl[]>([]);

  // 6 Nearest Cable Electrical Buzzers
  interface CableBuzzerInstance {
    panner: PannerNode;
    control: ContinuousLoopControl;
    cableId: string;
    position: [number, number, number];
  }
  const cableBuzzersRef = useRef<CableBuzzerInstance[]>([]);

  // Scheduler Timers
  const lastTickTime = useRef(0);
  const nextCreakTime = useRef(performance.now() * 0.001 + 6 + Math.random() * 8);
  const nextThudTime = useRef(performance.now() * 0.001 + 18 + Math.random() * 14);
  const nextDripTime = useRef(performance.now() * 0.001 + 4);

  // Stride distance accumulator for footsteps
  const lastPlayerPos = useRef(new THREE.Vector3());
  const accumulatedDistance = useRef(0);

  // Native DOM UI Elements
  const captionElRef = useRef<HTMLDivElement | null>(null);
  const captionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debugPanelRef = useRef<HTMLDivElement | null>(null);
  const isDebugVisibleRef = useRef(false);
  const captionsEnabledRef = useRef(showCaptions);

  // Telemetry DOM Refs
  const voicesTextRef = useRef<HTMLSpanElement | null>(null);
  const levelBarRef = useRef<HTMLDivElement | null>(null);
  const envTextRef = useRef<HTMLSpanElement | null>(null);
  const zoneTextRef = useRef<HTMLSpanElement | null>(null);

  // Initialize engine quality preset
  useEffect(() => {
    shipAudio.setQuality(quality);
    shipAudio.setReducedMotion(reducedMotion);
  }, [quality, reducedMotion]);

  // Build Native Vanilla DOM HUD Overlay
  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. Caption Pill Element
    const cap = document.createElement("div");
    cap.style.cssText =
      "position:fixed;bottom:96px;left:50%;transform:translateX(-50%);z-index:9999;pointer-events:none;display:none;transition:opacity 0.2s;font-family:monospace;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#67e8f9;padding:6px 16px;border-radius:9999px;background:rgba(2,6,23,0.85);border:1px solid rgba(6,182,212,0.45);box-shadow:0 0 15px rgba(6,182,212,0.25);backdrop-filter:blur(8px);align-items:center;gap:8px;";
    cap.innerHTML = `<span style="width:8px;height:8px;border-radius:9999px;background:#22d3ee;display:inline-block;animation:pulse 1.5s infinite;"></span><span id="ship-audio-caption-text"></span>`;
    document.body.appendChild(cap);
    captionElRef.current = cap;

    // 2. Debug Panel Element [U] key
    const pnl = document.createElement("div");
    pnl.style.cssText =
      "position:fixed;top:56px;right:16px;z-index:9999;width:320px;max-height:85vh;overflow-y:auto;border-radius:12px;background:rgba(2,6,23,0.94);border:1px solid rgba(6,182,212,0.5);padding:16px;font-family:monospace;font-size:12px;color:#a5f3fc;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);backdrop-filter:blur(12px);user-select:none;display:none;";

    pnl.innerHTML = `
      <div style="display:flex;align-items:center;justify-between;padding-bottom:8px;border-bottom:1px solid rgba(6,182,212,0.3);margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:9999px;background:#22d3ee;"></span>
          <span style="font-weight:bold;letter-spacing:0.05em;color:#22d3ee;text-transform:uppercase;font-size:13px;">Ship Audio Engine</span>
        </div>
        <button id="ship-audio-close-btn" style="margin-left:auto;color:#94a3b8;background:rgba(30,41,59,0.6);border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-family:inherit;font-size:11px;">[U] Close</button>
      </div>

      <!-- Telemetry -->
      <div style="background:rgba(15,23,42,0.6);padding:10px;border-radius:8px;border:1px solid rgba(6,182,212,0.2);margin-bottom:12px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#94a3b8;">Active Voices:</span>
          <span id="ship-audio-voices-val" style="color:#67e8f9;font-weight:bold;">0 / 24</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#94a3b8;">Master Level:</span>
          <div style="width:110px;height:8px;background:#1e293b;border-radius:4px;overflow:hidden;">
            <div id="ship-audio-level-bar" style="height:100%;width:0%;background:linear-gradient(to right, #22d3ee, #fbbf24, #f43f5e);transition:width 0.08s;"></div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#94a3b8;">Environment:</span>
          <span id="ship-audio-env-val" style="color:#67e8f9;">Interior Wet (100%)</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#94a3b8;">Active Zone:</span>
          <span id="ship-audio-zone-val" style="color:#fcd34d;font-weight:600;">Cargo Bay</span>
        </div>
      </div>

      <!-- Sliders -->
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px;">
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
            <span>Master Volume</span>
            <span id="ship-audio-master-label">${Math.round(shipAudio.getMasterVolume() * 100)}%</span>
          </div>
          <input id="ship-audio-master-slider" type="range" min="0" max="1" step="0.01" value="${shipAudio.getMasterVolume()}" style="width:100%;accent-color:#22d3ee;cursor:pointer;" />
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
            <span>Ambience Bed</span>
            <span id="ship-audio-ambience-label">${Math.round(shipAudio.getAmbienceVolume() * 100)}%</span>
          </div>
          <input id="ship-audio-ambience-slider" type="range" min="0" max="1" step="0.01" value="${shipAudio.getAmbienceVolume()}" style="width:100%;accent-color:#22d3ee;cursor:pointer;" />
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
            <span>Effects & SFX</span>
            <span id="ship-audio-sfx-label">${Math.round(shipAudio.getSfxVolume() * 100)}%</span>
          </div>
          <input id="ship-audio-sfx-slider" type="range" min="0" max="1" step="0.01" value="${shipAudio.getSfxVolume()}" style="width:100%;accent-color:#22d3ee;cursor:pointer;" />
        </div>
        <div style="display:flex;gap:8px;padding-top:4px;">
          <button id="ship-audio-mute-btn" style="flex:1;padding:4px 8px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#cbd5e1;cursor:pointer;font-weight:bold;font-family:inherit;">MUTE</button>
          <button id="ship-audio-captions-btn" style="flex:1;padding:4px 8px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#cbd5e1;cursor:pointer;font-weight:bold;font-family:inherit;">Captions: OFF</button>
        </div>
      </div>

      <!-- Test Buttons -->
      <div style="border-top:1px solid rgba(6,182,212,0.3);padding-top:10px;">
        <div style="font-size:11px;font-weight:bold;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;">Sound Test Pad</div>
        <div id="ship-audio-btn-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <button data-snd="foot_metal" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Deck Step</button>
          <button data-snd="foot_grate" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Grate Step</button>
          <button data-snd="foot_dirt" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Dirt Step</button>
          <button data-snd="foot_debris" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Debris Step</button>
          <button data-snd="zap" style="padding:4px;background:#0f172a;border:1px solid rgba(217,119,6,0.5);color:#fcd34d;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Spark Zap</button>
          <button data-snd="creak" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Hull Groan</button>
          <button data-snd="thud" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Distant Thump</button>
          <button data-snd="drip" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Water Drip</button>
          <button data-snd="flashlight" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Flashlight</button>
          <button data-snd="scanner" style="padding:4px;background:#0f172a;border:1px solid rgba(6,182,212,0.6);color:#67e8f9;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Sonar Ping</button>
          <button data-snd="door" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Door Cycle</button>
          <button data-snd="console" style="padding:4px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Console Beep</button>
          <button data-snd="lever" style="padding:4px;background:#0f172a;border:1px solid rgba(16,185,129,0.5);color:#6ee7b7;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Lever Clunk</button>
          <button data-snd="pickup" style="padding:4px;background:#0f172a;border:1px solid rgba(234,179,8,0.5);color:#fde047;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Pickup Chime</button>
          <button data-snd="locked" style="padding:4px;background:#0f172a;border:1px solid rgba(244,63,94,0.5);color:#fda4af;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Locked Buzz</button>
          <button data-snd="audiolog" style="padding:4px;background:#0f172a;border:1px solid rgba(168,85,247,0.5);color:#d8b4fe;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;">Synthetic Voice</button>
        </div>
      </div>
    `;

    document.body.appendChild(pnl);
    debugPanelRef.current = pnl;

    // Grab telemetry refs
    voicesTextRef.current = pnl.querySelector("#ship-audio-voices-val");
    levelBarRef.current = pnl.querySelector("#ship-audio-level-bar");
    envTextRef.current = pnl.querySelector("#ship-audio-env-val");
    zoneTextRef.current = pnl.querySelector("#ship-audio-zone-val");

    // Stop propagation so clicking anywhere inside the debug panel never triggers 3D pointer lock
    pnl.addEventListener("click", (e) => e.stopPropagation());
    pnl.addEventListener("mousedown", (e) => e.stopPropagation());
    pnl.addEventListener("mouseup", (e) => e.stopPropagation());
    pnl.addEventListener("pointerdown", (e) => e.stopPropagation());

    // Close Button
    pnl.querySelector("#ship-audio-close-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      isDebugVisibleRef.current = false;
      pnl.style.display = "none";
    });

    // Sliders
    const masterSlider = pnl.querySelector("#ship-audio-master-slider") as HTMLInputElement;
    const masterLabel = pnl.querySelector("#ship-audio-master-label") as HTMLSpanElement;
    masterSlider?.addEventListener("input", (e) => {
      e.stopPropagation();
      shipAudio.resume();
      const v = parseFloat((e.target as HTMLInputElement).value);
      shipAudio.setMasterVolume(v);
      if (masterLabel) masterLabel.textContent = `${Math.round(v * 100)}%`;
    });

    const ambSlider = pnl.querySelector("#ship-audio-ambience-slider") as HTMLInputElement;
    const ambLabel = pnl.querySelector("#ship-audio-ambience-label") as HTMLSpanElement;
    ambSlider?.addEventListener("input", (e) => {
      e.stopPropagation();
      shipAudio.resume();
      const v = parseFloat((e.target as HTMLInputElement).value);
      shipAudio.setAmbienceVolume(v);
      if (ambLabel) ambLabel.textContent = `${Math.round(v * 100)}%`;
    });

    const sfxSlider = pnl.querySelector("#ship-audio-sfx-slider") as HTMLInputElement;
    const sfxLabel = pnl.querySelector("#ship-audio-sfx-label") as HTMLSpanElement;
    sfxSlider?.addEventListener("input", (e) => {
      e.stopPropagation();
      shipAudio.resume();
      const v = parseFloat((e.target as HTMLInputElement).value);
      shipAudio.setSfxVolume(v);
      if (sfxLabel) sfxLabel.textContent = `${Math.round(v * 100)}%`;
    });

    // Mute Button
    const muteBtn = pnl.querySelector("#ship-audio-mute-btn") as HTMLButtonElement;
    muteBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      shipAudio.resume();
      const nextMuted = !shipAudio.isMuted();
      shipAudio.setMuted(nextMuted);
      muteBtn.textContent = nextMuted ? "MUTED" : "MUTE";
      muteBtn.style.color = nextMuted ? "#f43f5e" : "#cbd5e1";
    });

    // Captions Toggle Button
    const capBtn = pnl.querySelector("#ship-audio-captions-btn") as HTMLButtonElement;
    capBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      captionsEnabledRef.current = !captionsEnabledRef.current;
      capBtn.textContent = `Captions: ${captionsEnabledRef.current ? "ON" : "OFF"}`;
      capBtn.style.color = captionsEnabledRef.current ? "#67e8f9" : "#cbd5e1";
    });

    // Button Grid Handlers
    pnl.querySelector("#ship-audio-btn-grid")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shipAudio.resume();
      const target = (e.target as HTMLElement).closest("button");
      if (!target) return;
      const snd = target.dataset.snd;
      if (snd === "foot_metal") shipAudio.playFootstep("metal");
      else if (snd === "foot_grate") shipAudio.playFootstep("grating");
      else if (snd === "foot_dirt") shipAudio.playFootstep("dirt");
      else if (snd === "foot_debris") shipAudio.playFootstep("debris");
      else if (snd === "zap") shipAudio.playSpark(0, 2, 0);
      else if (snd === "creak") shipAudio.play("creak", { volume: 0.9 });
      else if (snd === "thud") shipAudio.play("thud", { volume: 0.8 });
      else if (snd === "drip") shipAudio.play("drip", { volume: 0.6 });
      else if (snd === "flashlight") playInteraction("flashlight");
      else if (snd === "scanner") playInteraction("scanner");
      else if (snd === "door") playInteraction("door", [0, 1.5, -30]);
      else if (snd === "console") playInteraction("console");
      else if (snd === "lever") playInteraction("lever");
      else if (snd === "pickup") playInteraction("pickup");
      else if (snd === "locked") playInteraction("locked");
      else if (snd === "audiolog") playInteraction("audiolog");
    });

    // [U] Key Listener: opens debug panel and unlocks cursor so mouse is immediately free
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyU") {
        isDebugVisibleRef.current = !isDebugVisibleRef.current;
        pnl.style.display = isDebugVisibleRef.current ? "block" : "none";
        if (isDebugVisibleRef.current) {
          shipAudio.resume();
          if (typeof document !== "undefined" && document.pointerLockElement) {
            document.exitPointerLock();
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cap.remove();
      pnl.remove();
    };
  }, []);

  // Subscribe to engine caption events
  useEffect(() => {
    const unsub = shipAudio.on("caption", (ev: CaptionEvent) => {
      if (!captionsEnabledRef.current) return;
      if (ev.position && playerPositionRef?.current) {
        _posScratch.set(ev.position[0], ev.position[1], ev.position[2]);
        if (_posScratch.distanceTo(playerPositionRef.current) > 20) return;
      }
      if (captionElRef.current) {
        const textSpan = captionElRef.current.querySelector("#ship-audio-caption-text");
        if (textSpan) textSpan.textContent = ev.text;
        captionElRef.current.style.display = "flex";
        if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
        captionTimerRef.current = setTimeout(() => {
          if (captionElRef.current) captionElRef.current.style.display = "none";
        }, ev.duration * 1000);
      }
    });
    return () => {
      unsub();
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [playerPositionRef]);

  // Hook up spark bursts from cable system
  useEffect(() => {
    const onBurst = (ev: SparkEvent) => {
      const vol = Math.min(1.0, 0.45 + (ev.intensity || 1.0) * 0.22);
      shipAudio.play("zap", {
        position: ev.position,
        volume: vol,
        pitch: 0.92 + Math.random() * 0.16,
        priority: "high",
      });
      shipAudio.triggerCaption("[sparks crackle]", ev.position, 1.8);
    };

    onSparkBurst(onBurst);
    return () => {
      offSparkBurst(onBurst);
    };
  }, []);

  // Initialize continuous ambient loops once AudioContext is available
  const startAmbiences = useCallback(() => {
    const ctx = shipAudio.getContext();
    if (!ctx || machineHumRef.current) return;

    // 1. Machine Hum Loop
    machineHumRef.current = startMachineHum(ctx, ctx.destination);

    // 2. Wind Through Roof Loop
    windSoundRef.current = startWindSound(ctx, ctx.destination);

    // 3. Cockpit Alarm Siren Loop (positioned at [0, 3, -27], quiet and muffled)
    const alarmPanner = shipAudio.createPanner(0, 3, -27, 2, 25);
    if (alarmPanner) {
      alarmPanner.connect(ctx.destination);
      alarmSoundRef.current = startAlarmLoop(ctx, alarmPanner);
      alarmSoundRef.current.setIntensity(0.05);
    }

    // 4. Broken Steam Vents (Coolant Plume at [0, 2.5, 42]) - faint subtle vapor
    const vents: VentDef[] = ventPositions || [{ position: [0, 2.5, 42], closed: false }];
    vents.forEach((v) => {
      if (v.closed) return;
      const panner = shipAudio.createPanner(v.position[0], v.position[1], v.position[2], 2, 16);
      if (panner) {
        panner.connect(ctx.destination);
        const hiss = startSteamHiss(ctx, panner);
        hiss.setIntensity(0.02);
        steamVentsRef.current.push(hiss);
      }
    });

    // 5. Pre-allocate pool of 6 PannerNodes for nearest cable electrical buzzers
    const faultyCables = CABLES.filter((c) => c.sparks);
    const count = Math.min(6, faultyCables.length);
    for (let i = 0; i < count; i++) {
      const c = faultyCables[i];
      const panner = shipAudio.createPanner(c.endX, c.endY, c.endZ, 1.5, 12);
      if (panner) {
        panner.connect(ctx.destination);
        const buzz = startElectricalBuzz(ctx, panner);
        buzz.setIntensity(0); // initially silent, volume adjusted dynamically by proximity
        cableBuzzersRef.current.push({
          panner,
          control: buzz,
          cableId: c.id,
          position: [c.endX, c.endY, c.endZ],
        });
      }
    }
  }, [ventPositions]);

  // Clean up continuous nodes on unmount
  useEffect(() => {
    return () => {
      machineHumRef.current?.stop();
      windSoundRef.current?.stop();
      alarmSoundRef.current?.stop();
      steamVentsRef.current.forEach((v) => v.stop());
      cableBuzzersRef.current.forEach((b) => b.control.stop());
      machineHumRef.current = null;
      windSoundRef.current = null;
    };
  }, []);

  // Connect global notifyFootstep hook
  useEffect(() => {
    globalNotifyFootstep = (info: FootstepNotification) => {
      shipAudio.playFootstep(info.surface, info.sprinting);
    };
    return () => {
      globalNotifyFootstep = null;
    };
  }, []);

  // Default inside/outside detection using ship hull bounds
  const checkIsInside = useCallback(
    (pos: THREE.Vector3): number => {
      if (isInsideShip) {
        return isInsideShip(pos) ? 1.0 : 0.0;
      }
      // Starboard egress transition zone (x: 6.5 to 14.5, z: 2.0 to 14.0)
      if (pos.x >= 6.5 && pos.x <= 14.5 && pos.z >= 2.0 && pos.z <= 14.0) {
        return Math.max(0, Math.min(1, 1 - (pos.x - 6.5) / 8.0));
      }
      // Main ship hull bounds
      if (Math.abs(pos.x) <= 6.5 && pos.z >= -48 && pos.z <= 40) {
        return 1.0;
      }
      return 0.0;
    },
    [isInsideShip]
  );

  // Zone resolution from coordinate
  const resolveZone = useCallback(
    (pos: THREE.Vector3): string => {
      if (zoneAt) return zoneAt(pos);
      if (Math.abs(pos.x) > 6.8 || pos.z < -48 || pos.z > 42) {
        return "Planet Exterior";
      }
      if (pos.z < -30) return "Bridge & Cockpit";
      if (pos.z < -18) return "Central Corridor";
      if (pos.z < -4) return "Crew Quarters";
      if (pos.z < 22) {
        if (Math.abs(pos.x) < 4.5 && pos.z >= -10 && pos.z <= 14) {
          return "Cargo Bay (Roof Breach)";
        }
        return "Cargo Bay & Staging";
      }
      return "Engine Room & Reactor";
    },
    [zoneAt]
  );

  // Default puddle spots for water drips
  const puddles = useMemo(() => {
    return puddlePositions || [
      [0, 0.05, -6] as [number, number, number],
      [-2.4, 0.05, 8] as [number, number, number],
      [3.1, 0.05, 14] as [number, number, number],
    ];
  }, [puddlePositions]);

  // ══════════════════════════════════════════════════════════════════
  // PER-FRAME UPDATE LOOP: ZERO ALLOCATIONS
  // ══════════════════════════════════════════════════════════════════
  useFrame((_, delta) => {
    // 1. Update 3D listener every frame
    shipAudio.updateListener(activeCamera);

    const now = performance.now() * 0.001;
    const playerPos = playerPositionRef?.current || activeCamera.position;

    // 2. Footstep distance accumulator helper (walking stride 1.6m, sprint 1.1m)
    if (lastPlayerPos.current.lengthSq() > 0) {
      const moved = playerPos.distanceTo(lastPlayerPos.current);
      if (moved > 0.01 && moved < 2.0) {
        accumulatedDistance.current += moved;
        const speed = moved / delta;
        const isSprinting = speed > 4.5;
        const stride = isSprinting ? 1.15 : 1.6;

        if (accumulatedDistance.current >= stride) {
          accumulatedDistance.current = 0;
          const surf = surfaceAt(playerPos);
          shipAudio.playFootstep(surf, isSprinting);
        }
      }
    }
    lastPlayerPos.current.copy(playerPos);

    // 3. Throttled scheduler loop: ticks every 100 ms to avoid per-frame CPU load
    if (now - lastTickTime.current < 0.1) return;
    lastTickTime.current = now;

    // Lazily initialize continuous ambiences when AudioContext first starts
    const ctx = shipAudio.getContext();
    if (ctx && ctx.state === "running" && !machineHumRef.current) {
      startAmbiences();
    }

    // A. Inside / outside detection & Reverb environment crossfade
    const envAmount = checkIsInside(playerPos);
    shipAudio.setEnvironment(envAmount);

    const zoneName = resolveZone(playerPos);

    // B. Machine Hum modulation by zone (velvety, soft, low sub-bass drone)
    if (machineHumRef.current) {
      if (zoneName === "Engine Room & Reactor") {
        machineHumRef.current.setIntensity(0.18);
      } else if (zoneName.startsWith("Cargo Bay")) {
        machineHumRef.current.setIntensity(0.10);
      } else if (zoneName === "Bridge & Cockpit") {
        machineHumRef.current.setIntensity(0.06);
      } else if (zoneName === "Planet Exterior") {
        machineHumRef.current.setIntensity(0.0);
      } else {
        machineHumRef.current.setIntensity(0.08);
      }
    }

    // C. Wind Sound modulation: COMPLETELY REMOVED inside the ship!
    if (windSoundRef.current) {
      if (envAmount > 0.15) {
        // Zero white noise / zero blowing wind inside the ship
        windSoundRef.current.setIntensity(0.0);
      } else {
        // Faint, gentle, low-frequency atmospheric breeze outdoors on the planet
        windSoundRef.current.setIntensity(0.10 * (1 - envAmount));
      }
    }

    // D. Distance-gated Cable Electrical Buzzers (faint 60/120Hz transformer hum, audible only within 3.5m)
    if (cableBuzzersRef.current.length > 0) {
      cableBuzzersRef.current.forEach((buzzer) => {
        _posScratch.set(buzzer.position[0], buzzer.position[1], buzzer.position[2]);
        const dist = playerPos.distanceTo(_posScratch);
        if (dist < 3.5) {
          const proximity = Math.pow(1 - dist / 3.5, 2.0);
          buzzer.control.setIntensity(proximity * 0.08);
        } else {
          buzzer.control.setIntensity(0);
        }
      });
    }

    // E. Hull Creak / Groan Scheduler (every 8 to 25s at randomized hull coordinates)
    if (now >= nextCreakTime.current && envAmount > 0.4) {
      nextCreakTime.current = now + 9 + Math.random() * 16;
      const x = (Math.random() > 0.5 ? 1 : -1) * (7 + Math.random() * 2);
      const z = -30 + Math.random() * 65;
      const y = 2 + Math.random() * 6;
      shipAudio.play("creak", {
        position: [x, y, z],
        volume: 0.65 + Math.random() * 0.25,
        priority: "medium",
      });
      shipAudio.triggerCaption("[hull plates groan]", [x, y, z], 2.2);
    }

    // F. Distant Thud & Debris Rattle Scheduler (every 20 to 45s)
    if (now >= nextThudTime.current) {
      nextThudTime.current = now + 20 + Math.random() * 25;
      const angle = Math.random() * Math.PI * 2;
      const dist = 32 + Math.random() * 20;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;
      shipAudio.play("thud", {
        position: [tx, 0.5, tz],
        volume: 0.7,
        priority: "low",
      });
      shipAudio.triggerCaption("[distant structural thump]", [tx, 0.5, tz], 2.0);
    }

    // G. Water Drip Scheduler (near puddles every 4 to 12s)
    if (now >= nextDripTime.current && puddles.length > 0) {
      nextDripTime.current = now + 4.5 + Math.random() * 6.5;
      const p = puddles[Math.floor(Math.random() * puddles.length)];
      shipAudio.play("drip", {
        position: p,
        volume: 0.5,
        priority: "low",
      });
    }

    // H. Update Debug Stats DOM if visible
    if (isDebugVisibleRef.current) {
      if (voicesTextRef.current) {
        const maxV = shipAudio.getQuality() === "low" ? 12 : shipAudio.getQuality() === "medium" ? 18 : 24;
        voicesTextRef.current.textContent = `${shipAudio.getActiveVoiceCount()} / ${maxV}`;
      }
      if (levelBarRef.current) {
        levelBarRef.current.style.width = `${Math.round(shipAudio.getMasterLevel() * 100)}%`;
      }
      if (envTextRef.current) {
        envTextRef.current.textContent = `${
          envAmount > 0.8 ? "Interior Wet" : envAmount < 0.2 ? "Exterior Dry" : "Breach Blend"
        } (${Math.round(envAmount * 100)}%)`;
      }
      if (zoneTextRef.current) {
        zoneTextRef.current.textContent = zoneName;
      }
    }
  });

  return null;
}
