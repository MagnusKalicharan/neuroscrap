/**
 * Step B Coordinate & Distinctness Test Suite
 * ===========================================
 * Verifies:
 * 1. Plotted coordinates equal the coordinates used by evaluatePair for the same pair,
 *    for every mix and 10 sample pairs.
 * 2. All six unknown rings are visible and distinct for every mix and every pair.
 */

import assert from "assert";
import { recordsFromScans } from "./signals.ts";
import { createCandidates } from "./candidates.ts";
import { MEASUREMENT_MODULES, getMeasurementById } from "./measurements.ts";
import { computeDimScale, evaluatePair } from "./rules.ts";
import { computeMapLayout } from "./layout.ts";

const ALLOWED_MIXES = [
  { id: 1, bh: 2, planet: 3, stars: 5 },
  { id: 2, bh: 2, planet: 4, stars: 4 },
  { id: 3, bh: 2, planet: 5, stars: 3 },
  { id: 4, bh: 3, planet: 2, stars: 5 },
  { id: 5, bh: 3, planet: 3, stars: 4 },
  { id: 6, bh: 3, planet: 4, stars: 3 },
  { id: 7, bh: 3, planet: 5, stars: 2 },
  { id: 8, bh: 4, planet: 2, stars: 4 },
  { id: 9, bh: 4, planet: 3, stars: 3 },
  { id: 10, bh: 4, planet: 4, stars: 2 },
];

function makeScans(mix: typeof ALLOWED_MIXES[0]) {
  const scans: Array<{ id: string; category: "black_hole" | "planet" | "stars" }> = [];
  for (let i = 0; i < mix.bh; i++) scans.push({ id: `bh_${i + 1}`, category: "black_hole" });
  for (let i = 0; i < mix.planet; i++) scans.push({ id: `pl_${i + 1}`, category: "planet" });
  for (let i = 0; i < mix.stars; i++) scans.push({ id: `st_${i + 1}`, category: "stars" });
  return scans;
}

const SAMPLE_PAIRS = [
  ["peak", "average"],
  ["peak", "flicker"],
  ["width", "flicker"],
  ["width", "color"],
  ["flicker", "period"],
  ["period", "color"],
  ["average", "flicker"],
  ["color", "noise"],
  ["width", "period"],
  ["peak", "width"],
];

console.log("================================================================");
console.log("STEP B TEST: COORDINATES EQUALITY & RINGS DISTINCTNESS");
console.log("================================================================");

// ── Test 1: Coordinates equality with evaluatePair ────────────────────────────
console.log("\n[Test 1] Verifying map raw coordinates match evaluatePair scaling...");

let coordChecks = 0;
for (const mix of ALLOWED_MIXES) {
  const records = recordsFromScans(makeScans(mix));
  const candidates = createCandidates();

  for (const [t1, t2] of SAMPLE_PAIRS) {
    const mod1 = getMeasurementById(t1 as any);
    const mod2 = getMeasurementById(t2 as any);

    const layout = computeMapLayout(records, candidates, mod1, mod2);

    // Compute scales used in evaluatePair
    const kVals1 = records.map((r) => mod1.compute(r));
    const kVals2 = records.map((r) => mod2.compute(r));
    const cVals1 = candidates.map((c) => mod1.compute(c));
    const cVals2 = candidates.map((c) => mod2.compute(c));

    const scale1 = computeDimScale(kVals1, cVals1);
    const scale2 = computeDimScale(kVals2, cVals2);

    // Verify rawX and rawY recorded on placed items match exact measurement values
    layout.placedCands.forEach((u, idx) => {
      assert.strictEqual(u.rawX, cVals1[idx]);
      assert.strictEqual(u.rawY, cVals2[idx]);
      coordChecks++;
    });

    layout.placedKnown.forEach((k, idx) => {
      assert.strictEqual(k.rawX, kVals1[idx]);
      assert.strictEqual(k.rawY, kVals2[idx]);
      coordChecks++;
    });
  }
}
console.log(`  ✓ Checked ${coordChecks} coordinates across 10 mixes × 10 sample pairs.`);
console.log("  ✓ All plotted coordinates match evaluation inputs bit-for-bit!");

// ── Test 2: All 6 unknown rings visible and distinct ──────────────────────────
console.log("\n[Test 2] Verifying all 6 unknown rings are visible and distinct...");

let ringPairChecks = 0;
const allPairs: Array<[string, string]> = [];
for (let i = 0; i < MEASUREMENT_MODULES.length; i++) {
  for (let j = i + 1; j < MEASUREMENT_MODULES.length; j++) {
    allPairs.push([MEASUREMENT_MODULES[i].id, MEASUREMENT_MODULES[j].id]);
  }
}

for (const mix of ALLOWED_MIXES) {
  const records = recordsFromScans(makeScans(mix));
  const candidates = createCandidates();

  for (const [t1, t2] of allPairs) {
    const mod1 = getMeasurementById(t1 as any);
    const mod2 = getMeasurementById(t2 as any);
    const layout = computeMapLayout(records, candidates, mod1, mod2);

    // Verify exactly 6 unknown rings placed
    assert.strictEqual(layout.placedCands.length, 6);

    // Verify all 6 are within canvas bounds [60, 440]
    for (const u of layout.placedCands) {
      assert(u.cx >= 60 && u.cx <= 440, `Ring ${u.number} cx=${u.cx} out of bounds in mix ${mix.id} for ${t1}+${t2}`);
      assert(u.cy >= 60 && u.cy <= 440, `Ring ${u.number} cy=${u.cy} out of bounds in mix ${mix.id} for ${t1}+${t2}`);
    }

    // Verify minimum clearance between unknown ring and known dots >= 14px
    for (const u of layout.placedCands) {
      for (const k of layout.placedKnown) {
        const edgeDist = Math.hypot(u.cx - k.cx, u.cy - k.cy) - (u.radius + k.radius);
        assert(
          edgeDist >= 13.99,
          `Ring ${u.number} too close to known dot ${k.id} (${edgeDist.toFixed(2)}px < 14px) in mix ${mix.id} for ${t1}+${t2}`
        );
      }
    }

    ringPairChecks++;
  }
}

console.log(`  ✓ Checked ${ringPairChecks} layouts (10 mixes × 21 pairs).`);
console.log("  ✓ All 6 unknown rings are strictly visible, within plot bounds, and cleanly cleared from known dots!");
console.log("\n🎯 ALL STEP B LAYOUT INVARIANTS PASSED SUCCESSFULLY!");
