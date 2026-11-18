/**
 * heatmapColors.ts — High-Performance Diverging Color Scale for Neural Heatmaps
 * =============================================================================
 * Diverging scale:
 *   -1.0: Amber (#FF9A1F, [255, 154, 31])
 *    0.0: Dark Haze (#0B1F2A, [11, 31, 42])
 *   +1.0: Cyan (#19F0FF, [25, 240, 255])
 *
 * Pre-computes a 512-entry RGBA lookup table (LUT) for zero-allocation
 * microsecond ImageData rendering.
 */

// RGB definitions: Retro Phosphor CRT Palette (Green & Amber dual tube)
const AMBER = [255, 183, 0];    // -1.0: Warm Phosphor Amber (#FFB700)
const VOID = [3, 13, 5];        //  0.0: Deep CRT Dark Green Void (#030D05)
const GREEN = [46, 232, 92];    // +1.0: Bright Phosphor CRT Green (#2EE85C)

const LUT_SIZE = 512;
const LUT_HALF = 256;
const COLOR_LUT = new Uint8ClampedArray(LUT_SIZE * 4);

// Initialize LUT at module load
for (let i = 0; i < LUT_SIZE; i++) {
  // val in [-1.0, 1.0]
  const val = (i - LUT_HALF) / LUT_HALF;
  let r = VOID[0];
  let g = VOID[1];
  let b = VOID[2];

  if (val < 0) {
    const t = Math.min(1, Math.abs(val));
    r = Math.round(VOID[0] + (AMBER[0] - VOID[0]) * t);
    g = Math.round(VOID[1] + (AMBER[1] - VOID[1]) * t);
    b = Math.round(VOID[2] + (AMBER[2] - VOID[2]) * t);
  } else if (val > 0) {
    const t = Math.min(1, val);
    r = Math.round(VOID[0] + (GREEN[0] - VOID[0]) * t);
    g = Math.round(VOID[1] + (GREEN[1] - VOID[1]) * t);
    b = Math.round(VOID[2] + (GREEN[2] - VOID[2]) * t);
  }

  const offset = i * 4;
  COLOR_LUT[offset] = r;
  COLOR_LUT[offset + 1] = g;
  COLOR_LUT[offset + 2] = b;
  COLOR_LUT[offset + 3] = 255;
}

/**
 * Returns RGBA color tuple for scalar value in [-1, 1].
 */
export function getHeatmapColor(val: number): [number, number, number, number] {
  const clamped = Math.max(-1, Math.min(1, val));
  const lutIdx = Math.round((clamped + 1) * (LUT_HALF - 0.5));
  const offset = lutIdx * 4;
  return [
    COLOR_LUT[offset],
    COLOR_LUT[offset + 1],
    COLOR_LUT[offset + 2],
    COLOR_LUT[offset + 3],
  ];
}

/**
 * Renders a Float32Array grid directly into a 2D canvas via ImageData.
 * If discretize is true, outputs either pure -1 (Amber) or +1 (Cyan).
 */
export function renderGridToCanvas(
  grid: Float32Array,
  canvas: HTMLCanvasElement,
  resolution: number,
  discretize = false
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (canvas.width !== resolution || canvas.height !== resolution) {
    canvas.width = resolution;
    canvas.height = resolution;
  }

  const imgData = ctx.createImageData(resolution, resolution);
  const data = imgData.data;
  const numPixels = resolution * resolution;

  for (let i = 0; i < numPixels; i++) {
    let val = grid[i];
    if (discretize) {
      val = val >= 0 ? 1 : -1;
    }
    const clamped = Math.max(-1, Math.min(1, val));
    const lutIdx = Math.round((clamped + 1) * (LUT_HALF - 0.5));
    const lutOffset = lutIdx * 4;
    const pxOffset = i * 4;

    data[pxOffset] = COLOR_LUT[lutOffset];
    data[pxOffset + 1] = COLOR_LUT[lutOffset + 1];
    data[pxOffset + 2] = COLOR_LUT[lutOffset + 2];
    data[pxOffset + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}
