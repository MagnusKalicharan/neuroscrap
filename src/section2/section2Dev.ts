/**
 * src/section2/section2Dev.ts
 * ============================================================
 * Developer shortcuts and helpers for Section 2 testing.
 */

import { telemetryStore, type TelemetryScan } from "../components/telemetry/telemetryStore";
import { pendriveStore } from "../ui/terminal/pendriveStore";
import { relayStore } from "./relayStore";

/**
 * Fully wipes all saved progress across both sections and restarts Storyline mode from Section 1:
 * - Empties pendrive scans and removes uploaded batch records
 * - Locks Section 2 Transmission
 * - Resets all walkway relays to 0/6 unscanned (plates dark, R4 gap, switches default)
 * - Restores celestial sky photography [E / F]
 */
export function devResetAllProgressToStoryline() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("neuro_scrap_section2_relay");
      localStorage.removeItem("neuroscrap_pendrive_store_v1");
      localStorage.removeItem("neuroscrap_telemetry_pendrive_v1");
    } catch {}
  }
  telemetryStore.formatPendrive();
  pendriveStore.reset();
  relayStore.reset();
}

/**
 * Resets Section 2 Transmission only back to 0/6 progress without affecting Section 1:
 * - Relays: 0/6 scanned, plates dark, R4 gap in floor
 * - Terminal: all switches connect, unpatched, test lever standby
 */
export function devResetSection2Only() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("neuro_scrap_section2_relay");
    } catch {}
  }
  relayStore.reset();
}

/**
 * Instantly completes Phase 1 (Data Intake) and jumps directly to Section 2:
 * Generates 10 balanced celestial scans, evaluates dataset as representative,
 * marks batch uploaded, deactivates sky photography, and unlocks Section 2 transmission
 * in a 100% UNTOUCHED/FRESH state (0/6 scanned, plates dark, R4 gap, nothing prefilled).
 */
export function devJumpToSection2Transmission() {
  devResetAllProgressToStoryline();
  const sampleScans: TelemetryScan[] = [
    {
      id: "scan_bh_1",
      filename: "BH_01.DAT",
      targetName: "Black Hole Singularity",
      category: "black_hole",
      gravity: 0.98,
      azimuthDeg: 180,
      elevationDeg: 45,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_bh_2",
      filename: "BH_02.DAT",
      targetName: "Black Hole Core",
      category: "black_hole",
      gravity: 0.98,
      azimuthDeg: 185,
      elevationDeg: 48,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_bh_3",
      filename: "BH_03.DAT",
      targetName: "Event Horizon",
      category: "black_hole",
      gravity: 0.98,
      azimuthDeg: 175,
      elevationDeg: 42,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_pl_1",
      filename: "PL_01.DAT",
      targetName: "Gas Giant",
      category: "planet",
      gravity: 0.48,
      azimuthDeg: 90,
      elevationDeg: 30,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_pl_2",
      filename: "PL_02.DAT",
      targetName: "Gas Giant Rings",
      category: "planet",
      gravity: 0.48,
      azimuthDeg: 95,
      elevationDeg: 32,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_pl_3",
      filename: "PL_03.DAT",
      targetName: "Lava Planet",
      category: "planet",
      gravity: 0.38,
      azimuthDeg: 120,
      elevationDeg: 25,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_pl_4",
      filename: "PL_04.DAT",
      targetName: "Ice Planet",
      category: "planet",
      gravity: 0.42,
      azimuthDeg: 140,
      elevationDeg: 35,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_st_1",
      filename: "ST_01.DAT",
      targetName: "Distant Star Cluster Alpha",
      category: "stars",
      gravity: 0.02,
      azimuthDeg: 270,
      elevationDeg: 60,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_st_2",
      filename: "ST_02.DAT",
      targetName: "Distant Star Cluster Beta",
      category: "stars",
      gravity: 0.02,
      azimuthDeg: 285,
      elevationDeg: 65,
      timestamp: new Date().toISOString(),
    },
    {
      id: "scan_st_3",
      filename: "ST_03.DAT",
      targetName: "Deep Space Stars",
      category: "stars",
      gravity: 0.02,
      azimuthDeg: 300,
      elevationDeg: 55,
      timestamp: new Date().toISOString(),
    },
  ];

  telemetryStore.formatPendrive();
  sampleScans.forEach((s) => telemetryStore.addScan(s));
  telemetryStore.evaluatePendriveData();
  pendriveStore.recordBatchUpload("BATCH_DEV_AUTO");
  relayStore.reset();
  relayStore.setActiveStationTab("diagnostic");
}

export const devSkipImagesAndUnlockSection2 = devJumpToSection2Transmission;

export function isImagesValidated(): boolean {
  const pState = pendriveStore.getState();
  const tState = telemetryStore.getState();
  return (
    pState.uploadedBatches.length > 0 ||
    tState.analysisOutcome === "representative_sample"
  );
}
