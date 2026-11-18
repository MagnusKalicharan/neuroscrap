/**
 * bezier.ts — Cubic Bezier Coordinate Calculation for Packet Travel
 * =================================================================
 * Computes exact spatial positions and tangent rotation angles for packets
 * traveling along the neural network's synaptic curves.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface BezierState {
  x: number;
  y: number;
  angleDeg: number;
}

/**
 * Calculates (x, y) coordinate and tangent angle for a packet at progress t in [0, 1]
 * along the cubic Bezier curve used by the network synapses:
 * P0 = (p1.x, p1.y)
 * P1 = (p1.x + dx, p1.y)
 * P2 = (p2.x - dx, p2.y)
 * P3 = (p2.x, p2.y)
 * where dx = (p2.x - p1.x) * 0.45
 */
export function getBezierPoint(
  p1: Point2D,
  p2: Point2D,
  t: number,
  curvature = 0.45
): BezierState {
  const clampedT = Math.max(0, Math.min(1, t));
  const dx = (p2.x - p1.x) * curvature;

  const p0x = p1.x;
  const p0y = p1.y;

  const p1x = p1.x + dx;
  const p1y = p1.y;

  const p2x = p2.x - dx;
  const p2y = p2.y;

  const p3x = p2.x;
  const p3y = p2.y;

  const u = 1 - clampedT;
  const tt = clampedT * clampedT;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * clampedT;

  // Position
  const x = uuu * p0x + 3 * uu * clampedT * p1x + 3 * u * tt * p2x + ttt * p3x;
  const y = uuu * p0y + 3 * uu * clampedT * p1y + 3 * u * tt * p2y + ttt * p3y;

  // Derivative for tangent orientation angle
  const dxDt =
    3 * uu * (p1x - p0x) + 6 * u * clampedT * (p2x - p1x) + 3 * tt * (p3x - p2x);
  const dyDt =
    3 * uu * (p1y - p0y) + 6 * u * clampedT * (p2y - p1y) + 3 * tt * (p3y - p2y);

  const angleRad = Math.atan2(dyDt, dxDt);
  const angleDeg = (angleRad * 180) / Math.PI;

  return { x, y, angleDeg };
}
