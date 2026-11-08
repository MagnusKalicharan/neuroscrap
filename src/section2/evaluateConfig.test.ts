/**
 * src/section2/evaluateConfig.test.ts
 * ============================================================
 * Unit Tests for Section 2 Relay Evaluation Logic
 * 
 * Verifies rules (a) through (h) as specified in Section 2, Step 1 design.
 * Run with: npm run test:relay
 */

import assert from "node:assert";
import {
  evaluateConfig,
  autoFillAverage,
  averageOf,
  type RelayConfig,
} from "./evaluateConfig.ts";
import { RELAY_NODES } from "./nodeData.ts";

console.log("=== Running Section 2 Relay Configuration Tests ===");

function makeConfig(overrides: RelayConfig = {}): RelayConfig {
  const cfg: RelayConfig = {};
  for (const node of RELAY_NODES) {
    cfg[node.id] = { mode: "connect" };
  }
  return { ...cfg, ...overrides } as RelayConfig;
}

// (a) all "connect" -> failure "surge"
{
  const config = makeConfig();
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, false, "(a) Expected failure");
  assert.strictEqual(res.failure, "surge", "(a) Expected failure 'surge'");
  console.log("✔ (a) All 'connect' correctly reported failure 'surge'.");
}

// (b) R3 ignore, R4 connect -> failure "gap"
{
  const config = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "connect" },
  });
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, false, "(b) Expected failure");
  assert.strictEqual(res.failure, "gap", "(b) Expected failure 'gap'");
  console.log("✔ (b) R3 ignore + R4 connect correctly reported failure 'gap'.");
}

// (c) R3 ignore + R4 ignore -> failure "chain"
{
  const config = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "ignore" },
  });
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, false, "(c) Expected failure");
  assert.strictEqual(res.failure, "chain", "(c) Expected failure 'chain'");
  console.log("✔ (c) R3 ignore + R4 ignore correctly reported failure 'chain'.");
}

// (d) R3 ignore + R4 patch 120 -> ok; patch 118 and 123 -> ok; patch 117 and 124 -> failure "estimate"
{
  // patch 120 -> ok
  {
    const config = makeConfig({
      R3: { mode: "ignore" },
      R4: { mode: "patch", patchValue: 120 },
    });
    const res = evaluateConfig(config);
    assert.strictEqual(res.ok, true, "(d) Patch 120 should be ok");
    assert.strictEqual(res.failure, undefined);
  }

  // patch 118 -> ok
  {
    const config = makeConfig({
      R3: { mode: "ignore" },
      R4: { mode: "patch", patchValue: 118 },
    });
    const res = evaluateConfig(config);
    assert.strictEqual(res.ok, true, "(d) Patch 118 should be ok");
  }

  // patch 123 -> ok
  {
    const config = makeConfig({
      R3: { mode: "ignore" },
      R4: { mode: "patch", patchValue: 123 },
    });
    const res = evaluateConfig(config);
    assert.strictEqual(res.ok, true, "(d) Patch 123 should be ok");
  }

  // patch 117 -> failure "estimate" (too low)
  {
    const config = makeConfig({
      R3: { mode: "ignore" },
      R4: { mode: "patch", patchValue: 117 },
    });
    const res = evaluateConfig(config);
    assert.strictEqual(res.ok, false, "(d) Patch 117 should fail");
    assert.strictEqual(res.failure, "estimate", "(d) Patch 117 should fail with 'estimate'");
    assert(res.reason?.toLowerCase().includes("low"), "Hint should indicate too low");
  }

  // patch 124 -> failure "estimate" (too high)
  {
    const config = makeConfig({
      R3: { mode: "ignore" },
      R4: { mode: "patch", patchValue: 124 },
    });
    const res = evaluateConfig(config);
    assert.strictEqual(res.ok, false, "(d) Patch 124 should fail");
    assert.strictEqual(res.failure, "estimate", "(d) Patch 124 should fail with 'estimate'");
    assert(res.reason?.toLowerCase().includes("high"), "Hint should indicate too high");
  }

  console.log("✔ (d) Boundary tolerances verified: 118, 120, 123 pass; 117, 124 fail with 'estimate'.");
}

// (e) R3 patch 120 + R4 patch 120 -> ok (alternate solution)
{
  const config = makeConfig({
    R3: { mode: "patch", patchValue: 120 },
    R4: { mode: "patch", patchValue: 120 },
  });
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, true, "(e) Alternate solution R3 patch 120 + R4 patch 120 should be ok");
  assert.strictEqual(res.failure, undefined);
  console.log("✔ (e) Alternate solution (R3 patch 120 + R4 patch 120) confirmed ok.");
}

// (f) R3 connect + R4 patch 120 -> failure "surge"
{
  const config = makeConfig({
    R3: { mode: "connect" },
    R4: { mode: "patch", patchValue: 120 },
  });
  const res = evaluateConfig(config);
  assert.strictEqual(res.ok, false, "(f) R3 connect should fail even if R4 is patched");
  assert.strictEqual(res.failure, "surge", "(f) Failure priority must be 'surge'");
  console.log("✔ (f) R3 connect + R4 patch 120 correctly prioritized failure 'surge'.");
}

// (g) autoFillAverage with R3 connected is about 20,096, and with R3 ignored it is 120.25
{
  const cfgConnected = makeConfig({
    R3: { mode: "connect" },
    R4: { mode: "connect" },
  });
  const avgConnected = autoFillAverage(cfgConnected);
  assert(Math.abs(avgConnected - 20096) < 0.5, `(g) Expected ~20,096, got ${avgConnected}`);

  const cfgIgnored = makeConfig({
    R3: { mode: "ignore" },
    R4: { mode: "connect" },
  });
  const avgIgnored = autoFillAverage(cfgIgnored);
  assert.strictEqual(avgIgnored, 120.25, `(g) Expected 120.25, got ${avgIgnored}`);

  console.log(`✔ (g) autoFillAverage: connected = ${avgConnected.toFixed(2)} (~20,096 trap), ignored = ${avgIgnored.toFixed(2)} (clean 120.25).`);
}

// (h) brute force R4 patch 90..150 step 1 with R3 ignored: exactly the integers 118..123 pass
{
  const passingIntegers: number[] = [];
  for (let v = 90; v <= 150; v++) {
    const config = makeConfig({
      R3: { mode: "ignore" },
      R4: { mode: "patch", patchValue: v },
    });
    const res = evaluateConfig(config);
    if (res.ok) {
      passingIntegers.push(v);
    }
  }

  const expected = [118, 119, 120, 121, 122, 123];
  assert.deepStrictEqual(passingIntegers, expected, `(h) Expected [118..123], got ${JSON.stringify(passingIntegers)}`);
  console.log(`✔ (h) Brute force range 90..150: exactly integers ${JSON.stringify(passingIntegers)} pass.`);
}

console.log("==================================================");
console.log("🎉 ALL SECTION 2 CONFIGURATION TESTS PASSED (8/8)!");
console.log("==================================================");
