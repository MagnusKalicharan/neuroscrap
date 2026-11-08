/**
 * dataStation.screens.ts — CanvasTexture Screen Renderers for Data Station
 * =========================================================================
 * Generates high-definition, authentic phosphor CRT textures for the Centre,
 * Left Wing, and Right Wing monitors.
 * 
 * Performance & Robustness:
 * - Drawn ONLY on state change (never per frame).
 * - sRGB color space, anisotropy = 8.
 * - Scanlines and soft vignette baked directly into the canvas.
 * - Waits for `document.fonts.ready` so monospace glyphs render crisp and clean.
 */
import * as THREE from "three";

export type StationScreenState =
  | "booting"
  | "idle"
  | "inserted"
  | "uploading"
  | "loaded"
  | "error";

export interface ScreenDataPayload {
  state: StationScreenState;
  batchName?: string;
  uploadProgress?: number; // 0.0 to 1.0
  cellsCount?: number;
  errorMessage?: string;
}

export class DataStationScreenTextures {
  public centerCanvas: HTMLCanvasElement;
  public leftCanvas: HTMLCanvasElement;
  public rightCanvas: HTMLCanvasElement;

  public centerTexture: THREE.CanvasTexture;
  public leftTexture: THREE.CanvasTexture;
  public rightTexture: THREE.CanvasTexture;

  private centerCtx: CanvasRenderingContext2D;
  private leftCtx: CanvasRenderingContext2D;
  private rightCtx: CanvasRenderingContext2D;

  private currentState: StationScreenState = "booting";
  private spinnerIndex = 0;
  private streamSeed = 0;
  private fontsLoaded = false;

  constructor() {
    // 1. Create Offscreen Canvases
    this.centerCanvas = document.createElement("canvas");
    this.centerCanvas.width = 1024;
    this.centerCanvas.height = 768;

    this.leftCanvas = document.createElement("canvas");
    this.leftCanvas.width = 512;
    this.leftCanvas.height = 384;

    this.rightCanvas = document.createElement("canvas");
    this.rightCanvas.width = 512;
    this.rightCanvas.height = 384;

    this.centerCtx = this.centerCanvas.getContext("2d", { alpha: false })!;
    this.leftCtx = this.leftCanvas.getContext("2d", { alpha: false })!;
    this.rightCtx = this.rightCanvas.getContext("2d", { alpha: false })!;

    // 2. Wrap in Three.js CanvasTextures
    this.centerTexture = new THREE.CanvasTexture(this.centerCanvas);
    this.leftTexture = new THREE.CanvasTexture(this.leftCanvas);
    this.rightTexture = new THREE.CanvasTexture(this.rightCanvas);

    // Apply exact texture filtering & anisotropy requirements
    [this.centerTexture, this.leftTexture, this.rightTexture].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
    });

    // 3. Check Font Loading
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(() => {
        this.fontsLoaded = true;
        this.renderAll({ state: this.currentState });
      });
    }

    // Initial render
    this.renderAll({ state: "booting" });
  }

  /**
   * Main render trigger: redrawn ONLY when state changes (or throttled for stream/spinner).
   */
  public renderAll(payload: ScreenDataPayload): void {
    this.currentState = payload.state;
    this.renderCenter(payload);
    this.renderLeft(payload);
    this.renderRight(payload);

    this.centerTexture.needsUpdate = true;
    this.leftTexture.needsUpdate = true;
    this.rightTexture.needsUpdate = true;
  }

  /**
   * Status Bar color corresponding to current state
   */
  public getStatusBarColor(): number {
    switch (this.currentState) {
      case "uploading":
        return 0xffaa00; // Amber
      case "error":
        return 0xff2222; // Red
      case "booting":
      case "idle":
      case "inserted":
      case "loaded":
      default:
        return 0x22c55e; // Green
    }
  }

  // ============================================================
  // 1. CENTRE MONITOR RENDERER (1024 x 768)
  // ============================================================
  private renderCenter(payload: ScreenDataPayload): void {
    const ctx = this.centerCtx;
    const w = 1024;
    const h = 768;

    // Dark phosphor CRT background
    ctx.fillStyle = "#040e06";
    ctx.fillRect(0, 0, w, h);

    if (payload.state === "booting") {
      // Noise / Boot sequence
      this.drawCRTNoise(ctx, w, h, 0.15);
      ctx.font = "bold 32px 'Courier New', monospace";
      ctx.fillStyle = "#22c55e";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 10;
      ctx.fillText("DATA STATION // NEURO-SCRAP", 60, 220);
      ctx.font = "20px 'Courier New', monospace";
      ctx.fillStyle = "#16a34a";
      ctx.fillText("> INITIALIZING TELEMETRY BUS...", 60, 270);
      ctx.fillText("> MOUNTING INTAKE ADAPTER (USB-01)...", 60, 310);
      ctx.fillText("> SYSTEM INTEGRITY: OK", 60, 350);
      this.drawScanlinesAndVignette(ctx, w, h);
      return;
    }

    // Header bar with Cyan rule
    ctx.shadowBlur = 0;
    ctx.font = "bold 28px 'Courier New', monospace";
    ctx.fillStyle = "#00ffff";
    ctx.fillText("DATA STATION // INTAKE ADAPTER", 60, 75);

    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 92);
    ctx.lineTo(w - 60, 92);
    ctx.stroke();

    // Body content based on state
    ctx.font = "22px 'Courier New', monospace";
    ctx.fillStyle = "#2ee85c";
    ctx.shadowColor = "#2ee85c";
    ctx.shadowBlur = 6;

    if (payload.state === "idle") {
      ctx.fillText("> POWER: 9% [CRITICAL DRAIN]", 60, 160);
      ctx.fillText("> INTAKE: AWAITING DATA CHIP", 60, 205);
      ctx.fillText("> ANALYSIS CORES: OFFLINE", 60, 250);
      ctx.fillText("> EGRESS STATUS: READY FOR INTAKE", 60, 295);

      // Prominent Amber Warning Box
      this.drawAmberWarningBox(ctx, 60, 480, w - 120, 160, [
        "! INSERT DATA PENDRIVE TO BEGIN !",
        "SLOT: CENTER CONSOLE PORT // 480 MBPS BUS",
      ]);
    } else if (payload.state === "inserted") {
      const spinners = ["/", "-", "\\", "|"];
      const spin = spinners[this.spinnerIndex % spinners.length];
      this.spinnerIndex++;

      ctx.fillText("> HARDWARE EVENT: USB BUS COMMUNICATING", 60, 160);
      ctx.font = "bold 26px 'Courier New', monospace";
      ctx.fillStyle = "#00ffff";
      ctx.fillText(`PENDRIVE DETECTED // MOUNTING... [ ${spin} ]`, 60, 230);

      ctx.font = "20px 'Courier New', monospace";
      ctx.fillStyle = "#2ee85c";
      ctx.fillText("> ALLOCATING SECURE MEMORY BUFFER...", 60, 290);
      ctx.fillText("> VERIFYING PARITY MATRICES...", 60, 330);
    } else if (payload.state === "uploading") {
      const pct = Math.round((payload.uploadProgress ?? 0.45) * 100);
      const batch = payload.batchName || "BATCH_01_CELESTIAL_TELEMETRY";

      ctx.fillText(`> TARGET: ${batch}`, 60, 160);
      ctx.fillText("> PROTOCOL: ASYMMETRIC BURST TRANSMISSION", 60, 205);
      ctx.fillText(`> PROGRESS: ${pct}% COMPLETED`, 60, 250);

      // Segmented Progress Bar
      this.drawSegmentedBar(ctx, 60, 310, w - 120, 44, pct / 100);

      ctx.font = "18px 'Courier New', monospace";
      ctx.fillStyle = "#22c55e";
      ctx.fillText("WRITING PACKETS TO INTAKE BUFFER... DO NOT REMOVE PENDRIVE", 60, 400);
    } else if (payload.state === "loaded") {
      ctx.font = "bold 26px 'Courier New', monospace";
      ctx.fillStyle = "#2ee85c";
      ctx.fillText("BATCH 01 LOADED // 5 CELLS // AWAITING ANALYSIS", 60, 165);

      ctx.font = "20px 'Courier New', monospace";
      ctx.fillText("> BUFFER STORAGE: ALL 10 TELEMETRY PACKETS COMMITTED", 60, 220);
      ctx.fillText("> PARITY CHECK: 100% CLEAN - ZERO DEFECTS", 60, 260);
      ctx.fillText("> TRAJECTORY SIMULATION: SLINGSHOT VECTOR UNLOCKED", 60, 300);

      // Green Success Banner
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(60, 480, w - 120, 160);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 480, w - 120, 160);

      ctx.fillStyle = "#2ee85c";
      ctx.font = "bold 24px 'Courier New', monospace";
      ctx.fillText("✔ DATASET VERIFIED & COMMITTED TO MEMORY", 90, 545);
      ctx.font = "18px 'Courier New', monospace";
      ctx.fillText("ANALYSIS STATIONS CAN NOW READ EXTRACTED TELEMETRY MATRIX", 90, 595);
    } else if (payload.state === "error") {
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.font = "bold 32px 'Courier New', monospace";
      ctx.fillText("READ ERROR // HARDWARE FAULT", 60, 165);

      ctx.font = "20px 'Courier New', monospace";
      ctx.fillText("> CORRUPTED METADATA ENCOUNTERED ON DEVICE", 60, 225);
      ctx.fillText("> UNABLE TO CALCULATE EXIT TRAJECTORY", 60, 265);

      // Red Warning Box
      ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
      ctx.fillRect(60, 480, w - 120, 160);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 480, w - 120, 160);

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.fillText("! SAMPLING BIAS OR CRC MISMATCH DETECTED !", 90, 550);
      ctx.font = "17px 'Courier New', monospace";
      ctx.fillText("RE-FORMAT PENDRIVE OR RESAMPLE SKY TARGETS", 90, 595);
    }

    this.drawScanlinesAndVignette(ctx, w, h);
  }

  // ============================================================
  // 2. LEFT WING MONITOR RENDERER (512 x 384)
  // ============================================================
  private renderLeft(payload: ScreenDataPayload): void {
    const ctx = this.leftCtx;
    const w = 512;
    const h = 384;

    ctx.fillStyle = "#040e06";
    ctx.fillRect(0, 0, w, h);

    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillStyle = "#00ffff";
    ctx.fillText("SUBSYSTEM BUS", 36, 45);

    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(36, 58);
    ctx.lineTo(w - 36, 58);
    ctx.stroke();

    const isReady = payload.state === "loaded";
    const isBusy = payload.state === "uploading" || payload.state === "inserted";
    const isError = payload.state === "error";

    const subsystems = [
      {
        name: "READER",
        status: isReady ? "READY" : isBusy ? "BUSY" : isError ? "FAULT" : "OFFLINE",
        color: isReady ? "#22c55e" : isBusy ? "#f59e0b" : isError ? "#ef4444" : "#16a34a",
        icon: isReady ? "[✔]" : isBusy ? "[⚡]" : isError ? "[!]" : "[✕]",
      },
      {
        name: "TUNER",
        status: isReady ? "ONLINE" : "OFFLINE",
        color: isReady ? "#22c55e" : "#16a34a",
        icon: isReady ? "[✔]" : "[✕]",
      },
      {
        name: "DECIDER",
        status: isReady ? "ONLINE" : "OFFLINE",
        color: isReady ? "#22c55e" : "#16a34a",
        icon: isReady ? "[✔]" : "[✕]",
      },
    ];

    let y = 120;
    subsystems.forEach((sub) => {
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillStyle = sub.color;
      ctx.fillText(`${sub.icon} ${sub.name.padEnd(9, " ")} ${sub.status}`, 36, y);
      y += 65;
    });

    // Subsystem status tag at bottom
    ctx.font = "14px 'Courier New', monospace";
    ctx.fillStyle = "#22c55e";
    ctx.fillText("BUS ADDRESS: 0x4A // PORT-01", 36, 345);

    this.drawScanlinesAndVignette(ctx, w, h);
  }

  // ============================================================
  // 3. RIGHT WING MONITOR RENDERER (512 x 384)
  // ============================================================
  private renderRight(payload: ScreenDataPayload): void {
    const ctx = this.rightCtx;
    const w = 512;
    const h = 384;

    ctx.fillStyle = "#040e06";
    ctx.fillRect(0, 0, w, h);

    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillStyle = "#00ffff";
    ctx.fillText("STREAM TELEMETRY", 36, 45);

    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(36, 58);
    ctx.lineTo(w - 36, 58);
    ctx.stroke();

    if (payload.state === "uploading") {
      // Live flowing data stream
      this.streamSeed = (this.streamSeed + 1) % 64;
      ctx.font = "14px 'Courier New', monospace";
      ctx.fillStyle = "#2ee85c";

      let sy = 95;
      for (let i = 0; i < 9; i++) {
        const hex = ((this.streamSeed + i * 17) * 2654435761 >>> 0)
          .toString(16)
          .padStart(8, "0")
          .toUpperCase();
        const chk = (i * 3 + 12).toString(16).toUpperCase();
        ctx.fillText(`0x${hex} [PKT #${String(i + 1).padStart(2, "0")}] CRC:${chk}`, 36, sy);
        sy += 26;
      }
    } else if (payload.state === "loaded") {
      // 5 Cells Summary
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = "#22c55e";
      ctx.fillText("STORED TELEMETRY CELLS (5):", 36, 95);

      const cells = [
        "[#1] GARGANTUA_BH    [0.98 G]",
        "[#2] KRONOS_PRIME    [0.48 G]",
        "[#3] IGNIS_IV        [0.38 G]",
        "[#4] STELLAR_VOID_A  [0.02 G]",
        "[#5] STELLAR_VOID_B  [0.02 G]",
      ];
      let cy = 135;
      cells.forEach((c) => {
        ctx.font = "14px 'Courier New', monospace";
        ctx.fillStyle = "#2ee85c";
        ctx.fillText(c, 36, cy);
        cy += 32;
      });
      ctx.font = "13px 'Courier New', monospace";
      ctx.fillStyle = "#16a34a";
      ctx.fillText("ALL CELLS VERIFIED - SLINGSHOT READY", 36, 345);
    } else {
      // Idle Flat Waveform
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.fillStyle = "#16a34a";
      ctx.fillText("SIGNAL: NO CARRIER", 36, 120);

      // Flat idle oscilloscope trace
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(36, 200);
      ctx.lineTo(w - 36, 200);
      ctx.stroke();

      ctx.font = "14px 'Courier New', monospace";
      ctx.fillText("CARRIER FREQUENCY: 1420.405 MHz", 36, 280);
      ctx.fillText("STATUS: LISTENING ON USB BUS", 36, 315);
    }

    this.drawScanlinesAndVignette(ctx, w, h);
  }

  // ============================================================
  // CRT VISUAL FX HELPERS
  // ============================================================
  private drawAmberWarningBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    lines: string[]
  ): void {
    ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#f59e0b";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 8;
    ctx.font = "bold 26px 'Courier New', monospace";
    ctx.fillText(lines[0], x + 35, y + 65);

    if (lines[1]) {
      ctx.font = "18px 'Courier New', monospace";
      ctx.fillText(lines[1], x + 35, y + 115);
    }
  }

  private drawSegmentedBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    pct: number
  ): void {
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    const segments = 24;
    const segW = (w - 8) / segments;
    const filled = Math.round(pct * segments);

    for (let i = 0; i < segments; i++) {
      if (i < filled) {
        ctx.fillStyle = "#2ee85c";
        ctx.fillRect(x + 4 + i * segW + 1, y + 4, segW - 2, h - 8);
      }
    }
  }

  private drawScanlinesAndVignette(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    // 1. Scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1.2);
    }

    // 2. Corner Vignette
    const grad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      w * 0.35,
      w / 2,
      h / 2,
      w * 0.72
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawCRTNoise(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    opacity = 0.1
  ): void {
    const idata = ctx.createImageData(w, h);
    const buf = new Uint32Array(idata.data.buffer);
    const len = buf.length;
    for (let i = 0; i < len; i++) {
      if (Math.random() < opacity) {
        buf[i] = 0xff16a34a; // Green noise grain
      }
    }
    ctx.putImageData(idata, 0, 0);
  }

  public dispose(): void {
    this.centerTexture.dispose();
    this.leftTexture.dispose();
    this.rightTexture.dispose();
  }
}
