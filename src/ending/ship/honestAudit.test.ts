/**
 * src/ending/ship/honestAudit.test.ts
 * ============================================================
 * Standalone unit test executing the 7 Honest Audit checks.
 */
import { runHonestAudit } from "./honestAudit.ts";

console.log("================================================================================");
console.log(" RESCUE TWO — HONEST GEOMETRIC AUDIT SUITE");
console.log("================================================================================");

const audit = runHonestAudit();

audit.checks.forEach((check, index) => {
  const statusStr = check.pass ? "✓ PASS" : "✗ FAIL";
  console.log(`\n[Test ${index + 1}] ${check.name}...`);
  console.log(`  ${statusStr}: ${check.info}`);
});

console.log("\n================================================================================");
console.log(` AUDIT SUMMARY: ${audit.passedCount} / ${audit.totalCount} CHECKS PASSED`);
console.log("================================================================================");

if (audit.allPassed) {
  process.exit(0);
} else {
  process.exit(1);
}
