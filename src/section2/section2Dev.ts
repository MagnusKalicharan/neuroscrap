/**
 * src/section2/section2Dev.ts
 * ============================================================
 * Developer shortcuts and helpers for Section 2 testing.
 */

import { telemetryStore, type TelemetryScan } from "../components/telemetry/telemetryStore";
import { pendriveStore } from "../ui/terminal/pendriveStore";
import { relayStore } from "./relayStore";
import { resetAllGameProgress } from "../utils/resetProgress";

/**
 * Fully wipes all saved progress across both sections and restarts Storyline mode from Section 1:
 * - Empties pendrive scans and removes uploaded batch records
 * - Locks Section 2 Transmission
 * - Resets all walkway relays to 0/6 unscanned (plates dark, R4 gap, switches default)
 * - Restores celestial sky photography [E / F]
 */
export function devResetAllProgressToStoryline() {
  resetAllGameProgress();
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
      localStorage.removeItem("neuro_scrap_section3_intro_seen");
      localStorage.removeItem("neuro_scrap_section4_intro_seen");
    } catch {}
  }
  relayStore.reset();
}

export function generateSampleSnapshot(
  category: "black_hole" | "planet" | "stars",
  targetName: string
): string {
  if (typeof document === "undefined") return "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Deep space dark cosmic gradient
    const bg = ctx.createLinearGradient(0, 0, 480, 270);
    bg.addColorStop(0, "#03060a");
    bg.addColorStop(1, "#080d14");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 480, 270);

    // Starfield points
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97 + 13) % 480;
      const sy = (i * 73 + 29) % 270;
      const sr = i % 3 === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    if (category === "black_hole") {
      // Golden relativistic accretion disk
      ctx.save();
      ctx.translate(240, 135);
      ctx.rotate(-0.25);
      const diskGrad = ctx.createRadialGradient(0, 0, 30, 0, 0, 110);
      diskGrad.addColorStop(0, "rgba(255, 220, 120, 0.95)");
      diskGrad.addColorStop(0.4, "rgba(245, 158, 11, 0.85)");
      diskGrad.addColorStop(0.8, "rgba(180, 83, 9, 0.4)");
      diskGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = diskGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 120, 35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer gravitational lensing halo
      const haloGrad = ctx.createRadialGradient(0, 0, 35, 0, 0, 80);
      haloGrad.addColorStop(0, "rgba(255, 230, 150, 0.7)");
      haloGrad.addColorStop(0.6, "rgba(245, 158, 11, 0.35)");
      haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.fill();

      // Pitch black shadow of event horizon
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (category === "planet") {
      // Alien gaseous planet with atmosphere and ring
      ctx.save();
      ctx.translate(240, 135);

      // Angled planetary rings
      ctx.save();
      ctx.rotate(-0.4);
      const ringGrad = ctx.createLinearGradient(-130, 0, 130, 0);
      ringGrad.addColorStop(0, "rgba(180, 160, 120, 0)");
      ringGrad.addColorStop(0.2, "rgba(220, 200, 160, 0.7)");
      ringGrad.addColorStop(0.8, "rgba(220, 200, 160, 0.7)");
      ringGrad.addColorStop(1, "rgba(180, 160, 120, 0)");
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.ellipse(0, 0, 125, 26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Planet sphere with terminator shadow
      const planetGrad = ctx.createRadialGradient(-18, -18, 5, 5, 5, 52);
      planetGrad.addColorStop(0, "#60a5fa");
      planetGrad.addColorStop(0.5, "#1e40af");
      planetGrad.addColorStop(0.85, "#0f172a");
      planetGrad.addColorStop(1, "#020617");
      ctx.fillStyle = planetGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Luminous stellar star cluster
      ctx.save();
      ctx.translate(240, 135);

      const starGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
      starGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
      starGrad.addColorStop(0.2, "rgba(254, 240, 138, 0.85)");
      starGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.4)");
      starGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = starGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.fill();

      // 4-point diffraction spike
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-55, 0);
      ctx.lineTo(55, 0);
      ctx.moveTo(0, -55);
      ctx.lineTo(0, 55);
      ctx.stroke();
      ctx.restore();
    }

    // Camera viewfinder HUD overlay timestamp & reticle
    ctx.strokeStyle = "rgba(0, 255, 200, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, 440, 230);
    ctx.fillStyle = "rgba(0, 255, 200, 0.55)";
    ctx.font = "10px monospace";
    ctx.fillText(`CAM_OPTICAL // ${targetName.toUpperCase()}`, 28, 36);

    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return "";
  }
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
      imageDataUrl: generateSampleSnapshot("black_hole", "Black Hole Singularity"),
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
      imageDataUrl: generateSampleSnapshot("black_hole", "Black Hole Core"),
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
      imageDataUrl: generateSampleSnapshot("black_hole", "Event Horizon"),
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
      imageDataUrl: generateSampleSnapshot("planet", "Gas Giant"),
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
      imageDataUrl: generateSampleSnapshot("planet", "Gas Giant Rings"),
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
      imageDataUrl: generateSampleSnapshot("planet", "Lava Planet"),
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
      imageDataUrl: generateSampleSnapshot("planet", "Ice Planet"),
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
      imageDataUrl: generateSampleSnapshot("stars", "Distant Star Cluster Alpha"),
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
      imageDataUrl: generateSampleSnapshot("stars", "Distant Star Cluster Beta"),
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
      imageDataUrl: generateSampleSnapshot("stars", "Deep Space Stars"),
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

  // If sample was evaluated as biased, images are strictly NOT validated
  if (tState.analysisOutcome === "sampling_bias") {
    return false;
  }

  // Section 1 is complete ONLY when the player has at least 10 scans and uploaded a valid dataset
  return Boolean(
    tState.scans.length >= 10 &&
    pState.section1Complete &&
    pState.uploadedBatches.length > 0 &&
    pState.uploadedBatches.some((b) => b !== "BATCH_DEV_AUTO")
  );
}
