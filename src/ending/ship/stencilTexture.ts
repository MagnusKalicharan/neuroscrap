/**
 * src/ending/ship/stencilTexture.ts
 * ============================================================
 * Procedural canvas texture generator for "RESCUE TWO" hull markings,
 * panel seams, contrast paint stripes, and hazard chevrons.
 * Upgraded to 2048x512 with anisotropy 8 as specified in Stage A corrections.
 */
import * as THREE from "three";

export function createRescueTwoStencilTexture(greyscale = false): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    // SSR fallback: 1x1 dummy
    const data = new Uint8Array([207, 200, 188, 255]);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.needsUpdate = true;
    return tex as any;
  }

  const width = 2048;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // 1. Base Warm Light Grey Gunmetal Plate (#CFC8BC)
  ctx.fillStyle = "#cfc8bc";
  ctx.fillRect(0, 0, width, height);

  // Subtle metallic micro-noise grain
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 16;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain * 0.95));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain * 0.85));
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Dark Engraved Panel Seams (Curved and latitudinal panel lines)
  ctx.strokeStyle = "rgba(40, 36, 32, 0.55)";
  ctx.lineWidth = 3;

  // Longitudinal panel lines (every 64px)
  for (let x = 64; x < width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Latitudinal panel lines
  const latSeams = [40, 95, 145, 235, 275, 310, 380, 440];
  for (const y of latSeams) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Dark Amber Contrast Paint Stripe on Upper Rim (Y: 150 to 225)
  const dorsalStripeY = 152;
  const dorsalStripeH = 76;
  ctx.fillStyle = "#9a3412"; // Deep industrial amber / burnt orange
  ctx.fillRect(0, dorsalStripeY, width, dorsalStripeH);

  // Border trim on amber stripe
  ctx.strokeStyle = "#431407";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, dorsalStripeY);
  ctx.lineTo(width, dorsalStripeY);
  ctx.moveTo(0, dorsalStripeY + dorsalStripeH);
  ctx.lineTo(width, dorsalStripeY + dorsalStripeH);
  ctx.stroke();

  // 4. Stencil Text: "RESCUE TWO" on Upper Rim (Port & Starboard)
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const upperCenterY = dorsalStripeY + dorsalStripeH * 0.42;
  const subCenterY = dorsalStripeY + dorsalStripeH * 0.80;

  for (const xRatio of [0.25, 0.75]) {
    const cx = width * xRatio;

    // Bold stencil identification
    ctx.font = "900 46px 'Courier New', monospace";
    ctx.fillStyle = "#0c0a09"; // Crisp near-black carbon
    ctx.fillText("RESCUE TWO", cx, upperCenterY);

    // Subtle edge highlight on stencil text
    ctx.strokeStyle = "rgba(254, 243, 199, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeText("RESCUE TWO", cx, upperCenterY);

    // Registry subtitle
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "#fef3c7"; // Warm cream amber
    ctx.fillText("MEDEVAC DIVISION // FLEET-02", cx, subCenterY);
  }

  // 5. Ventral Underside Amber Contrast Stripe (Y: 315 to 375)
  const ventralStripeY = 315;
  const ventralStripeH = 60;
  ctx.fillStyle = "#7c2d12"; // Dark amber-brown
  ctx.fillRect(0, ventralStripeY, width, ventralStripeH);

  ctx.strokeStyle = "#431407";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, ventralStripeY);
  ctx.lineTo(width, ventralStripeY);
  ctx.moveTo(0, ventralStripeY + ventralStripeH);
  ctx.lineTo(width, ventralStripeY + ventralStripeH);
  ctx.stroke();

  // 6. Underside Text: Smaller "RESCUE TWO" & Hull Registry Number
  for (const xRatio of [0.25, 0.75]) {
    const cx = width * xRatio;

    ctx.font = "900 32px 'Courier New', monospace";
    ctx.fillStyle = "#0c0a09";
    ctx.fillText("RESCUE TWO", cx, ventralStripeY + ventralStripeH * 0.38);

    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = "#fde68a";
    ctx.fillText("HULL NO. 77402 // DEEP EXTRACTION", cx, ventralStripeY + ventralStripeH * 0.75);
  }

  // 7. Equator Warning Indicators (Y: 245 to 265)
  ctx.fillStyle = "#d97706";
  for (let x = 32; x < width; x += 128) {
    ctx.fillRect(x, 248, 20, 14);
  }

  // 8. Hazard Chevrons (Bottom band for cargo ramp / access flanges)
  const chevronY = 460;
  const chevronH = 38;
  ctx.fillStyle = "#b45309"; // Warm amber
  ctx.fillRect(0, chevronY, width, chevronH);

  ctx.fillStyle = "#18181b"; // Dark black stripes
  ctx.beginPath();
  for (let x = -40; x < width + 60; x += 40) {
    ctx.moveTo(x, chevronY);
    ctx.lineTo(x + 20, chevronY);
    ctx.lineTo(x, chevronY + chevronH);
    ctx.lineTo(x - 20, chevronY + chevronH);
  }
  ctx.fill();

  ctx.restore();

  // If in Greyscale Silhouette Mode, desaturate entire canvas to pure monochrome
  if (greyscale) {
    const finalImg = ctx.getImageData(0, 0, width, height);
    const d = finalImg.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
    }
    ctx.putImageData(finalImg, 0, 0);
  }

  // Create CanvasTexture with anisotropy = 8
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
