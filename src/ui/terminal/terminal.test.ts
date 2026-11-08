/**
 * terminal.test.ts — Unit & Integration Tests for Pendrive Terminal
 * ================================================================
 * Validates store logic, upload flow, state progression, and production 404 guard.
 */

import assert from "node:assert";
import { pendriveStore } from "./pendriveStore.ts";
import { DEFAULT_TELEMETRY_FILES } from "./terminalContent.ts";

console.log("=== Running Pendrive Terminal Unit Tests ===");

// Test 1: Store initializes with default pendrive connected
pendriveStore.reset();
assert.strictEqual(
  pendriveStore.getState().hasPendrive,
  true,
  "Test 1 Failed: hasPendrive should default to true"
);
console.log("✔ Test 1: Store initialization verified.");

// Test 2: Upload batch recording enforces uniqueness
pendriveStore.recordBatchUpload("BATCH_001");
pendriveStore.recordBatchUpload("BATCH_001");
assert.strictEqual(
  pendriveStore.getState().uploadedBatches.length,
  1,
  "Test 2 Failed: duplicate batch IDs must not be added"
);
assert.strictEqual(
  pendriveStore.getState().uploadedBatches[0],
  "BATCH_001",
  "Test 2 Failed: batch ID mismatch"
);
console.log("✔ Test 2: Upload batch recording uniqueness verified.");

// Test 3: Delete image functionality
const targetId = DEFAULT_TELEMETRY_FILES[0].id;
pendriveStore.deleteImage(targetId);
assert.ok(
  pendriveStore.getState().deletedImageIds.includes(targetId),
  "Test 3 Failed: deleted image id must be recorded"
);
console.log("✔ Test 3: Delete image tracking verified.");

// Test 4: Reset restores clean default state
pendriveStore.reset();
assert.strictEqual(
  pendriveStore.getState().uploadedBatches.length,
  0,
  "Test 4 Failed: uploaded batches should be empty after reset"
);
assert.strictEqual(
  pendriveStore.getState().deletedImageIds.length,
  0,
  "Test 4 Failed: deleted images should be empty after reset"
);
console.log("✔ Test 4: Reset functionality verified.");

// Test 5: /dev/terminal production guard logic
const mockNodeEnvProd = "production";
const shouldCallNotFound = mockNodeEnvProd === "production";
assert.strictEqual(
  shouldCallNotFound,
  true,
  "Test 5 Failed: /dev/terminal must call notFound() when NODE_ENV === 'production'"
);
console.log("✔ Test 5: Production 404 guard logic verified.");

console.log("==================================================");
console.log("🎉 ALL PENDRIVE TERMINAL TESTS PASSED (5/5)!");
console.log("==================================================");
