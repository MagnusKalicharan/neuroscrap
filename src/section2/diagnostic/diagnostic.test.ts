/**
 * src/section2/diagnostic/diagnostic.test.ts
 * ============================================================
 * Unit Tests for Section 2 Step 2: Transmission Diagnostic Console
 * 
 * Tests evaluation parity, auto-fill calculation traps, tolerances,
 * event emission, and enforces zero banned words in source files.
 * Run with: node --experimental-strip-types src/section2/diagnostic/diagnostic.test.ts
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateConfig,
  autoFillAverage,
  averageOf,
  type RelayConfig,
} from "../evaluateConfig.ts";
import { RELAY_NODES } from "../nodeData.ts";
import { section2Events } from "../section2Events.ts";

console.log("=== Running Section 2 Diagnostic Console Unit Tests ===");

function makeConfig(overrides: RelayConfig = {}): RelayConfig {
  const cfg: RelayConfig = {};
  for (const node of RELAY_NODES) {
    cfg[node.id] = { mode: "connect" };
  }
  return { ...cfg, ...overrides } as RelayConfig;
}

// 1. All connect -> FAIL surge
{
  const config = makeConfig();
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.failure, "surge");
  assert.ok(res.reason?.includes("99,999 V"));
  console.log("✔ Test 1: All connect correctly fails with 'surge'.");
}

// 2. R3 ignore + R4 connect -> FAIL gap
{
  const config = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "connect" },
  });
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.failure, "gap");
  console.log("✔ Test 2: R3 ignore + R4 connect fails with 'gap'.");
}

// 3. R3 ignore + R4 ignore -> FAIL chain
{
  const config = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "ignore" },
  });
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.failure, "chain");
  console.log("✔ Test 3: R3 ignore + R4 ignore fails with 'chain'.");
}

// 4. R3 ignore + R4 patch 120 -> PASS
{
  const config = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "patch", patchValue: 120 },
  });
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.failure, undefined);
  console.log("✔ Test 4: R3 ignore + R4 patch 120 correctly passes.");
}

// 5. Boundary tolerances: 118 and 123 pass; 117 and 124 fail estimate
{
  const cfg118 = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "patch", patchValue: 118 },
  });
  assert.strictEqual(evaluateConfig(cfg118).ok, true);

  const cfg123 = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "patch", patchValue: 123 },
  });
  assert.strictEqual(evaluateConfig(cfg123).ok, true);

  const cfg117 = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "patch", patchValue: 117 },
  });
  const res117 = evaluateConfig(cfg117);
  assert.strictEqual(res117.ok, false);
  assert.strictEqual(res117.failure, "estimate");
  assert.ok(res117.reason?.includes("too low"));

  const cfg124 = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "patch", patchValue: 124 },
  });
  const res124 = evaluateConfig(cfg124);
  assert.strictEqual(res124.ok, false);
  assert.strictEqual(res124.failure, "estimate");
  assert.ok(res124.reason?.includes("too high"));

  console.log("✔ Test 5: Tolerances verified (118, 123 pass; 117, 124 fail with estimate too low/high).");
}

// 6. Teaching trap: R3 connect + R4 autoFill -> ~20,096
{
  const trapConfig = makeConfig(); // all connect, R3 is 99999
  const autoVal = autoFillAverage(trapConfig);
  const roundedTrap = Math.round(autoVal);
  assert.strictEqual(roundedTrap, 20096);
  assert.ok(roundedTrap > 150, "Auto-fill with R3 connected must exceed dial max of 150 V");

  // Evaluating with R4 patched to 20096 still fails with surge because R3 is connected
  const evalTrap = evaluateConfig({
    ...trapConfig,
    R4: { mode: "patch", patchValue: roundedTrap },
  });
  assert.strictEqual(evalTrap.ok, false);
  assert.strictEqual(evalTrap.failure, "surge");
  console.log("✔ Test 6: Teaching trap verified (auto-fill yields 20,096, exceeds dial, fails with surge).");
}

// 7. R3 ignore, then autoFill -> 120 (120.25 rounded)
{
  const cleanConfig = makeConfig({ R3: { mode: "ignore" } });
  const cleanAutoVal = autoFillAverage(cleanConfig);
  const roundedClean = Math.round(cleanAutoVal);
  assert.strictEqual(roundedClean, 120);

  const evalClean = evaluateConfig({
    ...cleanConfig,
    R4: { mode: "patch", patchValue: roundedClean },
  });
  assert.strictEqual(evalClean.ok, true);
  console.log("✔ Test 7: Auto-fill after R3 ignored yields 120 and passes.");
}

// 8. Alternate solution: R3 patch 120 + R4 patch 120 -> PASS without discarded data warning
{
  const altConfig = makeConfig({
    R3: { mode: "patch", patchValue: 120 },
    R4: { mode: "patch", patchValue: 120 },
  });
  const resAlt = evaluateConfig(altConfig);
  assert.strictEqual(resAlt.ok, true);
  assert.strictEqual(resAlt.warnings.length, 0);
  console.log("✔ Test 8: Alternate solution (R3 patch 120 + R4 patch 120) passes without warnings.");
}

// 9. Healthy node ignored -> PASS with warning "discarded good data"
{
  const warnConfig = makeConfig({
    R1: { mode: "ignore" },
    R3: { mode: "ignore" },
    R4: { mode: "patch", patchValue: 120 },
  });
  const resWarn = evaluateConfig(warnConfig);
  assert.strictEqual(resWarn.ok, true);
  assert.ok(resWarn.warnings.some((w) => w.includes("R1: discarded good data")));
  console.log("✔ Test 9: Discarding healthy node generates warning.");
}

// 10. Typed event emission test
{
  let received = false;
  const unsubscribe = section2Events.on("diagnostic-passed", (payload) => {
    received = true;
    assert.ok(payload.config);
  });
  section2Events.emit("diagnostic-passed", {
    config: makeConfig(),
    attempts: [],
  });
  assert.strictEqual(received, true);
  unsubscribe();
  console.log("✔ Test 10: section2Events diagnostic-passed emission and listener verified.");
}

// 11. Banned words verification in src/section2/diagnostic/
{
  const bannedWords = ["imputation", "missing value"];
  const diagDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
  const files = fs.readdirSync(diagDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".css"));

  let foundBanned = false;
  for (const file of files) {
    if (file === "diagnostic.test.ts") continue; // skip this test file definition
    const content = fs.readFileSync(path.join(diagDir, file), "utf-8").toLowerCase();
    for (const word of bannedWords) {
      // Regex word boundary check (to distinguish "mean" from "meaning")
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(content)) {
        console.error(`❌ Banned word '${word}' found in ${file}!`);
        foundBanned = true;
      }
    }
  }

  assert.strictEqual(foundBanned, false, "Forbidden words must not appear in diagnostic source files!");
  console.log("✔ Test 11: Banned words audit PASSED (zero occurrences of imputation, missing value).");
}

console.log("==================================================");
console.log("🎉 ALL SECTION 2 DIAGNOSTIC UNIT TESTS PASSED (11/11)!");
console.log("==================================================");
