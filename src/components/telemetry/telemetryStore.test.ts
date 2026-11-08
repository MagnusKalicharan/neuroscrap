import assert from "node:assert";
import { telemetryStore } from "./telemetryStore.ts";

console.log("=== Running Telemetry Pendrive & Sampling Bias Unit Tests ===");

// Reset / format pendrive
telemetryStore.formatPendrive();
assert.strictEqual(telemetryStore.getState().scans.length, 0, "Initial scan count must be 0");
console.log("✔ Test 1: Format pendrive clean state verified.");

// Test 2: Add scans up to max (10)
for (let i = 0; i < 10; i++) {
  const ok = telemetryStore.addScan({
    targetName: "Gargantua Singularity (Black Hole)",
    category: "black_hole",
    gravity: 0.98,
    elevationDeg: 45,
    azimuthDeg: 180,
  });
  assert.strictEqual(ok, true, `Scan ${i + 1} must be added successfully`);
}
assert.strictEqual(telemetryStore.getState().scans.length, 10, "Scans count must reach 10");

// 11th scan must be rejected (buffer full)
const overflowOk = telemetryStore.addScan({
  targetName: "Excess Scan",
  category: "planet",
  gravity: 0.48,
  elevationDeg: 50,
  azimuthDeg: 120,
});
assert.strictEqual(overflowOk, false, "11th scan must be rejected when buffer is full");
console.log("✔ Test 2: Max 10 scans buffer capacity enforced.");

// Test 3: Evaluate 10 Black Hole scans -> MUST BE SAMPLING BIAS
const outcomeBias = telemetryStore.evaluatePendriveData();
assert.strictEqual(outcomeBias, "sampling_bias", "10 Black Hole scans must trigger sampling_bias");
assert.strictEqual(telemetryStore.getState().analysisOutcome, "sampling_bias");
assert.strictEqual(telemetryStore.getState().biasMessage, "You have only taken Black Hole images. The sample is biased.");
assert.strictEqual(telemetryStore.getState().activeDialogueKey, "bias_failure");
console.log("✔ Test 3: Overwhelming Black Hole scans triggers SAMPLING BIAS failure with accurate message.");

// Test 3b: Test 10 Planet scans -> MUST BE SAMPLING BIAS with Planet message
telemetryStore.formatPendrive();
for (let i = 0; i < 10; i++) {
  telemetryStore.addScan({
    targetName: "Gas Giant",
    category: "planet",
    gravity: 0.48,
    elevationDeg: 30,
    azimuthDeg: 90,
  });
}
const outcomePlanetBias = telemetryStore.evaluatePendriveData();
assert.strictEqual(outcomePlanetBias, "sampling_bias");
assert.strictEqual(telemetryStore.getState().biasMessage, "You have only taken Planet images. The sample is biased.");
console.log("✔ Test 3b: 10 Planet scans triggers 'You have only taken Planet images. The sample is biased.'");

// Test 3c: Test 10 Star scans -> MUST BE SAMPLING BIAS with Star message
telemetryStore.formatPendrive();
for (let i = 0; i < 10; i++) {
  telemetryStore.addScan({
    targetName: "Distant Stars",
    category: "stars",
    gravity: 0.02,
    elevationDeg: 60,
    azimuthDeg: 270,
  });
}
const outcomeStarBias = telemetryStore.evaluatePendriveData();
assert.strictEqual(outcomeStarBias, "sampling_bias");
assert.strictEqual(telemetryStore.getState().biasMessage, "You have only taken Star images. The sample is biased.");
console.log("✔ Test 3c: 10 Star scans triggers 'You have only taken Star images. The sample is biased.'");

// Test 4: Format pendrive and test Representative Sample
// 3 Black Hole + 4 Planets + 3 Distant Stars = 10
telemetryStore.formatPendrive();
assert.strictEqual(telemetryStore.getState().scans.length, 0);

// Add 3 Black Hole
for (let i = 0; i < 3; i++) {
  telemetryStore.addScan({
    targetName: "Gargantua Singularity (Black Hole)",
    category: "black_hole",
    gravity: 0.98,
    elevationDeg: 45,
    azimuthDeg: 180,
  });
}
// Add 4 Planets
for (let i = 0; i < 4; i++) {
  telemetryStore.addScan({
    targetName: `Planet Scan ${i + 1}`,
    category: "planet",
    gravity: 0.44,
    elevationDeg: 35,
    azimuthDeg: 90 + i * 15,
  });
}
// Add 3 Distant Stars
for (let i = 0; i < 3; i++) {
  telemetryStore.addScan({
    targetName: `Faint Stellar Void ${i + 1}`,
    category: "stars",
    gravity: 0.02,
    elevationDeg: 60,
    azimuthDeg: 270 + i * 20,
  });
}

assert.strictEqual(telemetryStore.getState().scans.length, 10, "Dataset must contain 10 scans");
const outcomeRep = telemetryStore.evaluatePendriveData();
assert.strictEqual(outcomeRep, "representative_sample", "Balanced 3/4/3 mix must trigger representative_sample");
assert.strictEqual(telemetryStore.getState().analysisOutcome, "representative_sample");
assert.strictEqual(telemetryStore.getState().activeDialogueKey, "representative_success");
console.log("✔ Test 4: Diverse balanced mix (3 BH, 4 Planets, 3 Stars) triggers REPRESENTATIVE SAMPLE success.");

// Test 5: Advance Dialogue
telemetryStore.advanceDialogue();
assert.strictEqual(telemetryStore.getState().dialogueIndex, 1, "Dialogue index must advance to 1");
console.log("✔ Test 5: Dialogue index advance verified.");

console.log("==================================================");
console.log("🎉 ALL TELEMETRY PENDRIVE UNIT TESTS PASSED (5/5)!");
console.log("==================================================");
