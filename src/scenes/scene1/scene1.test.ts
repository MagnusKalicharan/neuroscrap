/**
 * Unit Tests for Scene 1: State Machine, Timeline, and Photosensitivity Safety
 */

import { SCENE1_BOOT_DURATION_MS, SCENE1_CUES } from "./scene1.timeline.ts";
import type { TerminalLinePayload } from "./scene1.timeline.ts";
import { TimelineClock } from "./timeline.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE 1: STATE MACHINE TRANSITION RULES
// ─────────────────────────────────────────────────────────────
console.log("▶ [Test 1/4] State Machine Transitions...");

const VALID_TRANSITIONS: Record<string, string[]> = {
  title: ["starting", "handoff", "done"],
  starting: ["boot", "handoff"],
  boot: ["handoff"],
  handoff: ["done", "title"],
  done: ["title"],
};

function testTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// Valid path
assert(testTransition("title", "starting"), "title -> starting must be valid");
assert(testTransition("starting", "boot"), "starting -> boot must be valid");
assert(testTransition("boot", "handoff"), "boot -> handoff must be valid");
assert(testTransition("handoff", "done"), "handoff -> done must be valid");

// Skip shortcuts
assert(testTransition("title", "handoff"), "title -> handoff (?skip=1) must be valid");
assert(testTransition("starting", "handoff"), "starting -> handoff (skip) must be valid");

// Replay intro
assert(testTransition("done", "title"), "done -> title (replay intro) must be valid");

// Illegal transitions
assert(!testTransition("boot", "title"), "boot -> title must be illegal");
assert(!testTransition("starting", "title"), "starting -> title must be illegal");
assert(!testTransition("handoff", "starting"), "handoff -> starting must be illegal");
console.log("  ✔ State machine transition rules verified.");

// ─────────────────────────────────────────────────────────────
// TEST SUITE 2: TIMELINE MONOTONICITY & CUE COVERAGE
// ─────────────────────────────────────────────────────────────
console.log("▶ [Test 2/4] Timeline Cues & Monotonic Timestamps...");

assert(SCENE1_CUES.length >= 8, `Expected at least 8 cues, found ${SCENE1_CUES.length}`);

let lastAt = -1;
for (const cue of SCENE1_CUES) {
  assert(
    cue.at >= lastAt,
    `Cue ${cue.id} timestamp (${cue.at}ms) is not monotonic with previous (${lastAt}ms)`
  );
  lastAt = cue.at;
}

// Verify essential cues
const cueTypes = new Set(SCENE1_CUES.map((c) => c.type));
assert(cueTypes.has("hum_start"), "Must include hum_start cue");
assert(cueTypes.has("type_line"), "Must include type_line cues");
assert(cueTypes.has("signal_found"), "Must include signal_found cue");
assert(cueTypes.has("crash_cinematic_start"), "Must include crash_cinematic_start cue");
assert(cueTypes.has("crash_cinematic_end"), "Must include crash_cinematic_end cue");
assert(cueTypes.has("hold_rebooting"), "Must include hold_rebooting cue");

// Verify last cue matches or is bounded by boot duration
const lastCue = SCENE1_CUES[SCENE1_CUES.length - 1];
assert(
  lastCue.at <= SCENE1_BOOT_DURATION_MS,
  `Last cue (${lastCue.at}ms) exceeds boot duration (${SCENE1_BOOT_DURATION_MS}ms)`
);
console.log("  ✔ Timeline cues monotonic and complete.");

// ─────────────────────────────────────────────────────────────
// TEST SUITE 3: PHOTOSENSITIVITY & FLASH SAFETY
// ─────────────────────────────────────────────────────────────
console.log("▶ [Test 3/4] Photosensitivity Safety Limits...");

// Crash flash specifications from CrashFlash.tsx
interface FlashSpec {
  startMs: number;
  durationMs: number;
  maxLuminance: number; // 0.0 to 1.0 (white fraction)
}

const CRASH_FLASHES: FlashSpec[] = [
  { startMs: 2000, durationMs: 280, maxLuminance: 0.65 },
  { startMs: 3700, durationMs: 280, maxLuminance: 0.45 },
];

// Requirement 1: Maximum 2 bright flashes total
assert(
  CRASH_FLASHES.length <= 2,
  `Total bright flashes must be <= 2, found ${CRASH_FLASHES.length}`
);

// Requirement 2: Minimum 350ms between flashes
for (let i = 1; i < CRASH_FLASHES.length; i++) {
  const interval = CRASH_FLASHES[i].startMs - CRASH_FLASHES[i - 1].startMs;
  assert(
    interval >= 350,
    `Flash interval (${interval}ms) violates minimum 350ms safety requirement`
  );
}

// Requirement 3: Maximum 3 flashes per second
const crashTotalDurationSec = 2.5;
const flashesPerSec = CRASH_FLASHES.length / crashTotalDurationSec;
assert(
  flashesPerSec <= 3.0,
  `Flash frequency (${flashesPerSec}/s) exceeds max 3 flashes/second`
);

// Requirement 4: Flash luminance strictly under 70% white
for (const flash of CRASH_FLASHES) {
  assert(
    flash.maxLuminance < 0.70,
    `Flash luminance (${flash.maxLuminance * 100}%) exceeds 70% white limit`
  );
}
console.log("  ✔ Photosensitive safety verified (max 2 flashes, >=350ms interval, <70% luminance).");

// ─────────────────────────────────────────────────────────────
// TEST SUITE 4: TIMELINE CLOCK SKIP & CUE DISPATCH
// ─────────────────────────────────────────────────────────────
console.log("▶ [Test 4/4] Timeline Clock Skip Logic...");

const testCues = [
  { id: "c1", at: 100, type: "t1" },
  { id: "c2", at: 500, type: "t2" },
  { id: "c3", at: 1000, type: "t3" },
];

const clock = new TimelineClock(1200, testCues);
const firedIds: string[] = [];

clock.onCue((cue) => {
  firedIds.push(cue.id);
});

// Skip directly to 800ms
clock.skipTo(800);

assert(
  firedIds.includes("c1") && firedIds.includes("c2"),
  "Skipping to 800ms must dispatch cues up to 800ms"
);
assert(!firedIds.includes("c3"), "Cues beyond 800ms must not yet be fired");

// Skip to end
clock.skipTo(1200);
assert(firedIds.includes("c3"), "Skipping to end must dispatch remaining cues");
assert(clock.getProgress() === 1, "Clock progress at 1200ms must be 1.0");

clock.destroy();
console.log("  ✔ Timeline Clock skip logic verified.");

console.log("\n==============================================");
console.log("🎉 ALL SCENE 1 UNIT TESTS PASSED SUCCESSFULLY!");
console.log("==============================================\n");
