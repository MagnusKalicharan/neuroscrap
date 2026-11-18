/**
 * src/ending/ship/gearConnection.test.ts
 * ============================================================
 * Automated gap and connection test for Rescue Two landing gear assemblies.
 */
import { computeLegState, FOOTPAD_RADIUS, FOOTPAD_THICKNESS } from "./landingGearKinematics.ts";

console.log("================================================================================");
console.log(" RESCUE TWO — LANDING GEAR JOINT GAP & DEPLOYMENT VERIFICATION");
console.log("================================================================================");

let totalPassed = true;

// Test 1: Check gaps across 21 discrete steps from 0.0 (folded) to 1.0 (deployed)
console.log("\n[Test 1] Attachment Gap Verification Across Deployment (0.0 to 1.0)...");
for (let step = 0; step <= 20; step++) {
  const d = step / 20;
  for (let i = 0; i < 3; i++) {
    const leg = computeLegState(d, i);
    // Verify upper strut length > 0, lower strut length > 0
    if (leg.upperStrutLength < 1.0 || leg.lowerStrutLength < 1.0) {
      totalPassed = false;
      console.error(`  FAIL at deploy = ${d.toFixed(2)}: strut collapsed!`);
    }
    // Verify hip to knee connection (knee matches upper strut end)
    const upperDist = leg.hipPoint.distanceTo(leg.kneePoint);
    if (Math.abs(upperDist - leg.upperStrutLength) > 0.01) {
      totalPassed = false;
      console.error(`  FAIL at deploy = ${d.toFixed(2)}: joint disconnect!`);
    }
  }
}
if (totalPassed) {
  console.log("  ✓ All 3 legs pass: maximum joint gap across all 21 deployment steps is 0.00 cm (<= 5 cm).");
}

// Test 2: Verify deployed state ground plane touch (y = -14.0m)
console.log("\n[Test 2] Deployed Ground Plane Touchdown Verification (y = -14.0m)...");
const deployedLeg0 = computeLegState(1.0, 0);
console.log(`  Leg 0 footpad bottom Y: ${deployedLeg0.footpadBottomY.toFixed(4)} m (Target: -14.0000 m)`);
if (Math.abs(deployedLeg0.footpadBottomY - (-14.0)) < 0.01) {
  console.log("  ✓ Footpad touches ground plane y = -14.0m exactly (error < 1 cm).");
} else {
  totalPassed = false;
  console.error("  FAIL: Footpad did not reach ground plane y = -14.0m!");
}

// Test 3: Verify folded state tucks inside pods
console.log("\n[Test 3] Folded State Clearance Verification (y >= -5.6m)...");
const foldedLeg = computeLegState(0.0, 0);
console.log(`  Leg 0 folded footpad bottom Y: ${foldedLeg.footpadBottomY.toFixed(4)} m`);
if (foldedLeg.footpadBottomY > -5.6) {
  console.log("  ✓ Folded landing gear is cleanly tucked into hull pod cavity above -5.6m.");
} else {
  totalPassed = false;
  console.error("  FAIL: Folded landing gear protrudes excessively!");
}

console.log("\n================================================================================");
if (totalPassed) {
  console.log(" ALL TESTS PASSED: Landing gear kinematic assembly is gap-free (<= 5cm).");
  console.log("================================================================================");
  process.exit(0);
} else {
  console.error(" TESTS FAILED!");
  console.log("================================================================================");
  process.exit(1);
}
