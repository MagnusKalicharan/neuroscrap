/**
 * Scene 1 Boot Sequence Cues
 *
 * Deterministic timeline schedule mapping milliseconds to discrete cues.
 * All cues are monotonic and photosensitive-safe.
 */

import type { TimelineCueDefinition } from "./timeline.ts";

export interface TerminalLinePayload {
  lineId: string;
  icon: string;
  iconType: "sys" | "warn" | "danger" | "wait" | "success";
  prefix: string;
  value?: string;
  valueEffect?: "flicker_3x" | "amber_glow" | "red_flicker" | "corrupt" | "pulse_cyan";
  typeSpeedCharsPerSec?: number;
}

export const SCENE1_BOOT_DURATION_MS = 15500;

export const SCENE1_CUES: TimelineCueDefinition[] = [
  // 0.0s — Initial dark boot, hum bed start, faint cursor blink
  {
    id: "cue_00_hum_cursor",
    at: 0,
    type: "hum_start",
    payload: { cursorBlink: true },
  },

  // 0.8s — SCRAP-07 // MAINTENANCE UNIT types in (~45 chars/s)
  {
    id: "cue_08_scrap_id",
    at: 800,
    type: "type_line",
    payload: {
      lineId: "line_scrap_id",
      icon: "[✓]",
      iconType: "sys",
      prefix: "SCRAP-07 // MAINTENANCE UNIT",
      typeSpeedCharsPerSec: 45,
    } as TerminalLinePayload,
  },

  // 2.0s — POWER ............ 12% (12% flickers 3 times)
  {
    id: "cue_20_power",
    at: 2000,
    type: "type_line",
    payload: {
      lineId: "line_power",
      icon: "[▲]",
      iconType: "warn",
      prefix: "POWER ............ ",
      value: "12%",
      valueEffect: "flicker_3x",
      typeSpeedCharsPerSec: 50,
    } as TerminalLinePayload,
  },

  // 3.2s — NEURAL CORE ...... 3%  [!] (the [!] glows amber)
  {
    id: "cue_32_neural",
    at: 3200,
    type: "type_line",
    payload: {
      lineId: "line_neural",
      icon: "[▲]",
      iconType: "warn",
      prefix: "NEURAL CORE ...... ",
      value: "3%  [!]",
      valueEffect: "amber_glow",
      typeSpeedCharsPerSec: 50,
    } as TerminalLinePayload,
  },

  // 4.4s — VISION ........... DAMAGED (the word flickers red once)
  {
    id: "cue_44_vision",
    at: 4400,
    type: "type_line",
    payload: {
      lineId: "line_vision",
      icon: "[✕]",
      iconType: "danger",
      prefix: "VISION ........... ",
      value: "DAMAGED",
      valueEffect: "red_flicker",
      typeSpeedCharsPerSec: 50,
    } as TerminalLinePayload,
  },

  // 5.4s — MEMORY ........... CORRUPTED
  {
    id: "cue_54_memory",
    at: 5400,
    type: "type_line",
    payload: {
      lineId: "line_memory",
      icon: "[✕]",
      iconType: "danger",
      prefix: "MEMORY ........... ",
      value: "CORRUPTED",
      valueEffect: "corrupt",
      typeSpeedCharsPerSec: 50,
    } as TerminalLinePayload,
  },

  // 6.4s — LOCATING ORACLE ..........
  {
    id: "cue_64_locating",
    at: 6400,
    type: "type_line",
    payload: {
      lineId: "line_oracle",
      icon: "[...]",
      iconType: "wait",
      prefix: "LOCATING ORACLE ..........",
      typeSpeedCharsPerSec: 40,
    } as TerminalLinePayload,
  },

  // 8.0s — SIGNAL FOUND (radio blip sound; thin cyan line pulses)
  {
    id: "cue_80_signal",
    at: 8000,
    type: "signal_found",
    payload: {
      lineId: "line_signal",
      icon: "[✓]",
      iconType: "success",
      prefix: "SIGNAL FOUND // FREQ: 1420.405 MHz",
      valueEffect: "pulse_cyan",
      typeSpeedCharsPerSec: 50,
    } as TerminalLinePayload,
  },

  // 9.2s — In-Engine 3D Crash Cinematic (6.0s duration)
  {
    id: "cue_92_crash_start",
    at: 9200,
    type: "crash_cinematic_start",
    payload: { durationMs: 6000 },
  },

  // 15.2s — Crash Cinematic finishes, cut to black
  {
    id: "cue_152_crash_end",
    at: 15200,
    type: "crash_cinematic_end",
  },

  // 15.5s — Cut to hold state: REBOOTING... with 3 pulsing dots
  {
    id: "cue_155_hold_rebooting",
    at: 15500,
    type: "hold_rebooting",
    payload: { text: "REBOOTING..." },
  },
];
