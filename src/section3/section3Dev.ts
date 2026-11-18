/**
 * src/section3/section3Dev.ts
 * ============================================================
 * Developer shortcuts and helpers for Section 3 testing.
 * Completes Section 1 & Section 2 and unlocks Section 3 CORE-B.
 */

import { devJumpToSection2Transmission } from "../section2/section2Dev";
import { relayStore } from "../section2/relayStore";
import { RELAY_NODES } from "../section2/nodeData";

/**
 * Instantly completes Section 1 and Section 2:
 * 1. Generates 10 balanced celestial scans, evaluates as representative sample,
 *    and uploads batch BATCH_DEV_AUTO (Section 1 complete).
 * 2. Scans all 6 relays R1..R6, sets transmission line repaired,
 *    and sets diagnosticPassed to true (Section 2 complete).
 * 3. Unlocks CORE-B in the forward cockpit dome for Section 3.
 */
export function devJumpToSection3() {
  // 1. Complete Section 1
  devJumpToSection2Transmission();

  // 2. Complete Section 2
  RELAY_NODES.forEach((node) => {
    relayStore.completeScan(node);
  });

  relayStore.setDiagnosticConfig({
    R1: { mode: "connect" },
    R2: { mode: "connect" },
    R3: { mode: "ignore" },
    R4: { mode: "patch" },
    R5: { mode: "connect" },
    R6: { mode: "connect" },
  });
  relayStore.setDiagnosticPassed(true);
  relayStore.markDialogue("oracleIntro");
  relayStore.markDialogue("allComplete");
}

if (typeof window !== "undefined") {
  (window as any).devJumpToSection3 = devJumpToSection3;
}
