/**
 * Section 3: 2D Evidence Map Layout Engine
 * =========================================
 * Pure deterministic layout calculator for 2D evidence map:
 * - Fits axes to knowns + candidates with 10% pad margin.
 * - Unknown signals: drawn as hollow rings with the number 1 to 6 inside, always on top.
 * - Known scans: class-shaped dots without always-on text labels.
 * - Clusters co-located/close records into a beeswarm strip (<= 14 px) with count badge.
 * - Enforces >= 14px clearance between every known dot and every unknown ring (moves knowns, never unknowns).
 * - Places cluster count badges ("x3") without overlapping dots, badges, or plot edges.
 */

import type { CandidateRecord, MeasurementModule, SectionThreeRecord } from "./types.ts";

export interface PlacedKnown {
  id: string;
  targetName: string;
  kind: string;
  cx: number;
  cy: number;
  baseX: number;
  baseY: number;
  radius: number;
  clusterIdx?: number;
  clusterSize?: number;
  rawX: number;
  rawY?: number;
}

export interface PlacedCandidate {
  id: string;
  number: number;
  kind: string;
  cx: number;
  cy: number;
  radius: number;
  rawX: number;
  rawY?: number;
}

export interface CountBadge {
  id: string;
  text: string;
  count: number;
  cx: number;
  cy: number;
  clusterIdxs: number[];
  bbox: { x: number; y: number; w: number; h: number };
}

export interface ClusterBracket {
  x1: number;
  x2: number;
  y: number;
  count: number;
}

export interface MapLayoutResult {
  placedKnown: PlacedKnown[];
  placedCands: PlacedCandidate[];
  countBadges: CountBadge[];
  brackets: ClusterBracket[];
  plotBounds: {
    plotMinX: number;
    plotMaxX: number;
    plotMinY: number;
    plotMaxY: number;
  };
}

export function rectOverlapArea(
  r1: { x: number; y: number; w: number; h: number },
  r2: { x: number; y: number; w: number; h: number }
): number {
  const xOv = Math.max(0, Math.min(r1.x + r1.w, r2.x + r2.w) - Math.max(r1.x, r2.x));
  const yOv = Math.max(0, Math.min(r1.y + r1.h, r2.y + r2.h) - Math.max(r1.y, r2.y));
  return xOv * yOv;
}

export function computeMapLayout(
  records: SectionThreeRecord[],
  candidates: CandidateRecord[],
  modX: MeasurementModule,
  modY: MeasurementModule | null = null
): MapLayoutResult {
  const kValsX = records.map((r) => modX.compute(r));
  const cValsX = candidates.map((c) => modX.compute(c));
  const allX = [...kValsX, ...cValsX];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const spanX = Math.max(1e-4, maxX - minX);
  const padX = spanX * 0.10;
  const plotMinX = minX - padX;
  const plotMaxX = maxX + padX;
  const toPxX = (v: number) => 60 + ((v - plotMinX) / (plotMaxX - plotMinX)) * 380;

  let kValsY: number[] = [];
  let cValsY: number[] = [];
  let plotMinY = 0;
  let plotMaxY = 1;
  let toPxY: (v: number) => number;

  if (modY) {
    kValsY = records.map((r) => modY.compute(r));
    cValsY = candidates.map((c) => modY.compute(c));
    const allY = [...kValsY, ...cValsY];
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const spanY = Math.max(1e-4, maxY - minY);
    const padY = spanY * 0.10;
    plotMinY = minY - padY;
    plotMaxY = maxY + padY;
    toPxY = (v: number) => 440 - ((v - plotMinY) / (plotMaxY - plotMinY)) * 380;
  } else {
    // 1D layout: Y centered at 250
    toPxY = () => 250;
  }

  // 1. Unknown candidates (Initial positions from measurements)
  const UNKNOWN_RADIUS = 14;
  const placedCands: PlacedCandidate[] = candidates.map((c, i) => {
    const cx = Math.round(toPxX(cValsX[i]));
    const cy = Math.round(toPxY(modY ? cValsY[i] : 0));
    return {
      id: c.id,
      number: i + 1,
      kind: c.kind,
      cx,
      cy,
      radius: UNKNOWN_RADIUS,
      rawX: cValsX[i],
      rawY: modY ? cValsY[i] : undefined,
    };
  });

  // 1b. Separation between candidate rings: keep at least 24px between all rings
  const MIN_RING_DIST = 24.0;
  for (let pass = 0; pass < 30; pass++) {
    let anyMoved = false;
    for (let i = 0; i < placedCands.length; i++) {
      for (let j = i + 1; j < placedCands.length; j++) {
        const u1 = placedCands[i];
        const u2 = placedCands[j];
        const dx = u2.cx - u1.cx;
        const dy = u2.cy - u1.cy;
        const d = Math.hypot(dx, dy);
        if (d < MIN_RING_DIST) {
          anyMoved = true;
          const pushNeeded = (MIN_RING_DIST - d) / 2 + 0.6;
          if (!modY || modX.id === modY.id) {
            // In 1D or diagonal same-tool, shift vertically along Y to keep X reading intact
            const dirY = dy !== 0 ? Math.sign(dy) : (i < j ? -1 : 1);
            u1.cy = Math.max(60, Math.min(440, Math.round(u1.cy - dirY * pushNeeded)));
            u2.cy = Math.max(60, Math.min(440, Math.round(u2.cy + dirY * pushNeeded)));
          } else {
            // In 2D, push along separation vector
            const nx = d > 0.01 ? dx / d : 0;
            const ny = d > 0.01 ? dy / d : (i < j ? -1 : 1);
            u1.cx = Math.max(60, Math.min(440, Math.round(u1.cx - nx * pushNeeded)));
            u1.cy = Math.max(60, Math.min(440, Math.round(u1.cy - ny * pushNeeded)));
            u2.cx = Math.max(60, Math.min(440, Math.round(u2.cx + nx * pushNeeded)));
            u2.cy = Math.max(60, Math.min(440, Math.round(u2.cy + ny * pushNeeded)));
          }
        }
      }
    }
    if (!anyMoved) break;
  }

  // 2. Known scans initial positions
  const KNOWN_RADIUS = 6;
  const knownItems = records.map((r, i) => ({
    id: r.scanId,
    targetName: r.targetName,
    kind: r.kind,
    baseX: Math.round(toPxX(kValsX[i])),
    baseY: Math.round(toPxY(modY ? kValsY[i] : 0)),
    rawX: kValsX[i],
    rawY: modY ? kValsY[i] : undefined,
  }));

  // 3. Deterministic clustering for known items: group points with distance < 18px
  const clusters: number[][] = [];
  const assigned = new Set<number>();
  for (let i = 0; i < knownItems.length; i++) {
    if (assigned.has(i)) continue;
    const cluster = [i];
    assigned.add(i);
    for (let j = i + 1; j < knownItems.length; j++) {
      if (assigned.has(j)) continue;
      const d = Math.hypot(
        knownItems[i].baseX - knownItems[j].baseX,
        knownItems[i].baseY - knownItems[j].baseY
      );
      if (d < 18) {
        cluster.push(j);
        assigned.add(j);
      }
    }
    clusters.push(cluster);
  }

  const placedKnown: PlacedKnown[] = knownItems.map((k) => ({
    ...k,
    cx: k.baseX,
    cy: k.baseY,
    radius: KNOWN_RADIUS,
  }));

  const brackets: ClusterBracket[] = [];

  // Deterministically spread clusters so EVERY known dot is visible and countable
  for (const cluster of clusters) {
    const K = cluster.length;
    if (K <= 1) continue;

    if (!modY) {
      // 1D: spread along Y (vertical beeswarm)
      const step = 16;
      const startY = -((K - 1) * step) / 2;
      const midX = placedKnown[cluster[0]].baseX;
      for (let idx = 0; idx < K; idx++) {
        const itemIdx = cluster[idx];
        placedKnown[itemIdx].cx = midX;
        placedKnown[itemIdx].cy = Math.round(250 + startY + idx * step);
        placedKnown[itemIdx].clusterIdx = idx;
        placedKnown[itemIdx].clusterSize = K;
      }
    } else {
      // 2D: spread in a clean deterministic ring constellation around centroid
      let midX = 0;
      let midY = 0;
      for (const idx of cluster) {
        midX += placedKnown[idx].baseX;
        midY += placedKnown[idx].baseY;
      }
      midX = Math.round(midX / K);
      midY = Math.round(midY / K);

      const R = Math.max(12, 6 + K * 2.2);
      for (let idx = 0; idx < K; idx++) {
        const itemIdx = cluster[idx];
        const theta = -Math.PI / 2 + (2 * Math.PI * idx) / K;
        placedKnown[itemIdx].cx = Math.max(60, Math.min(440, Math.round(midX + R * Math.cos(theta))));
        placedKnown[itemIdx].cy = Math.max(60, Math.min(440, Math.round(midY + R * Math.sin(theta))));
        placedKnown[itemIdx].clusterIdx = idx;
        placedKnown[itemIdx].clusterSize = K;
      }
    }
  }

  // 4. Clearance enforcement: ensure at least 14px between any known dot and any unknown ring
  // Center-to-center distance must be >= (KNOWN_RADIUS + UNKNOWN_RADIUS + 14) = 6 + 14 + 14 = 34px
  const REQUIRED_EDGE_CLEARANCE = 14.0;
  const TARGET_CENTER_DIST = KNOWN_RADIUS + UNKNOWN_RADIUS + REQUIRED_EDGE_CLEARANCE + 1.5; // 35.5px

  const testAngles = [
    0,
    Math.PI / 2,
    Math.PI,
    -Math.PI / 2,
    Math.PI / 4,
    (3 * Math.PI) / 4,
    -Math.PI / 4,
    (-3 * Math.PI) / 4,
  ];

  for (let pass = 0; pass < 8; pass++) {
    for (const k of placedKnown) {
      for (const u of placedCands) {
        const dx = k.cx - u.cx;
        const dy = k.cy - u.cy;
        const dist = Math.hypot(dx, dy);
        if (dist - (k.radius + u.radius) < REQUIRED_EDGE_CLEARANCE) {
          // Find the best angle that keeps k inside [60, 440] and furthest from all unknowns
          let bestX = k.cx;
          let bestY = k.cy;
          let maxMinDist = -1;

          const baseAngle = dist > 0.01 ? Math.atan2(dy, dx) : Math.PI / 2;
          const candidateAngles = [baseAngle, ...testAngles];

          for (const ang of candidateAngles) {
            const candX = Math.round(u.cx + Math.cos(ang) * TARGET_CENTER_DIST);
            const candY = Math.round(u.cy + Math.sin(ang) * TARGET_CENTER_DIST);

            if (candX >= 60 && candX <= 440 && candY >= 60 && candY <= 440) {
              let minUdist = Infinity;
              for (const otherU of placedCands) {
                const d =
                  Math.hypot(candX - otherU.cx, candY - otherU.cy) -
                  (k.radius + otherU.radius);
                if (d < minUdist) minUdist = d;
              }
              if (minUdist >= REQUIRED_EDGE_CLEARANCE) {
                bestX = candX;
                bestY = candY;
                break;
              }
              if (minUdist > maxMinDist) {
                maxMinDist = minUdist;
                bestX = candX;
                bestY = candY;
              }
            }
          }

          k.cx = bestX;
          k.cy = bestY;
        }
      }
    }
  }

  // 4b. Disperse identical/stacked known scans so every single celestial dot is distinct and countable
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let i = 0; i < placedKnown.length; i++) {
      for (let j = i + 1; j < placedKnown.length; j++) {
        const k1 = placedKnown[i];
        const k2 = placedKnown[j];
        const dx = k2.cx - k1.cx;
        const dy = k2.cy - k1.cy;
        const d = Math.hypot(dx, dy);
        if (d < 13.0) {
          moved = true;
          const pushNeeded = (13.0 - d) / 2 + 0.6;
          let nx = d > 0.01 ? dx / d : (i % 2 === 0 ? 1 : -1);
          let ny = d > 0.01 ? dy / d : (j % 2 === 0 ? 1 : -1);
          if (!modY) {
            nx = 0;
            ny = dy !== 0 ? Math.sign(dy) : (i < j ? -1 : 1);
          }
          k1.cx = Math.max(60, Math.min(440, Math.round(k1.cx - nx * pushNeeded)));
          k1.cy = Math.max(60, Math.min(440, Math.round(k1.cy - ny * pushNeeded)));
          k2.cx = Math.max(60, Math.min(440, Math.round(k2.cx + nx * pushNeeded)));
          k2.cy = Math.max(60, Math.min(440, Math.round(k2.cy + ny * pushNeeded)));
        }
      }
    }
    // Re-verify clearance against unknown candidate rings (keep at least 14px edge clearance)
    for (const k of placedKnown) {
      for (const u of placedCands) {
        const edge = Math.hypot(k.cx - u.cx, k.cy - u.cy) - (k.radius + u.radius);
        if (edge < REQUIRED_EDGE_CLEARANCE) {
          const dx = k.cx - u.cx;
          const dy = k.cy - u.cy;
          const d = Math.hypot(dx, dy);
          const push = REQUIRED_EDGE_CLEARANCE - edge + 1.0;
          const nx = d > 0.01 ? dx / d : 1;
          const ny = d > 0.01 ? dy / d : 0;
          k.cx = Math.max(60, Math.min(440, Math.round(k.cx + nx * push)));
          k.cy = Math.max(60, Math.min(440, Math.round(k.cy + ny * push)));
        }
      }
    }
    if (!moved) break;
  }

  // 5. Count badges for clusters (K > 1)
  const BADGE_W = 24;
  const BADGE_H = 14;
  const countBadges: CountBadge[] = [];

  for (const cluster of clusters) {
    const K = cluster.length;
    if (K <= 1) continue;

    const midX = Math.round(placedKnown[cluster[0]].cx);
    const midY = Math.round(placedKnown[cluster[0]].cy);

    const offsets = [
      { dx: 0, dy: 16 },
      { dx: 0, dy: -16 },
      { dx: 18, dy: 0 },
      { dx: -18, dy: 0 },
      { dx: 0, dy: 24 },
      { dx: 0, dy: -24 },
    ];

    let chosenX = midX;
    let chosenY = midY + 16;
    let bestOverlap = Infinity;

    for (const off of offsets) {
      const bx = Math.max(60 + BADGE_W / 2, Math.min(440 - BADGE_W / 2, midX + off.dx));
      const by = Math.max(60 + BADGE_H / 2, Math.min(440 - BADGE_H / 2, midY + off.dy));

      const badgeBox = {
        x: bx - BADGE_W / 2,
        y: by - BADGE_H / 2,
        w: BADGE_W,
        h: BADGE_H,
      };

      let overlap = 0;
      for (const u of placedCands) {
        const uBox = {
          x: u.cx - u.radius,
          y: u.cy - u.radius,
          w: u.radius * 2,
          h: u.radius * 2,
        };
        overlap += rectOverlapArea(badgeBox, uBox);
      }

      for (let i = 0; i < placedKnown.length; i++) {
        if (cluster.includes(i)) continue;
        const k = placedKnown[i];
        const kBox = {
          x: k.cx - k.radius,
          y: k.cy - k.radius,
          w: k.radius * 2,
          h: k.radius * 2,
        };
        overlap += rectOverlapArea(badgeBox, kBox);
      }

      for (const b of countBadges) {
        overlap += rectOverlapArea(badgeBox, b.bbox);
      }

      const ratio = overlap / (BADGE_W * BADGE_H);
      if (ratio === 0) {
        chosenX = bx;
        chosenY = by;
        bestOverlap = 0;
        break;
      }
      if (ratio < bestOverlap) {
        bestOverlap = ratio;
        chosenX = bx;
        chosenY = by;
      }
    }

    countBadges.push({
      id: `badge_cluster_${cluster[0]}`,
      text: `x${K}`,
      count: K,
      cx: chosenX,
      cy: chosenY,
      clusterIdxs: cluster,
      bbox: {
        x: chosenX - BADGE_W / 2,
        y: chosenY - BADGE_H / 2,
        w: BADGE_W,
        h: BADGE_H,
      },
    });
  }

  return {
    placedKnown,
    placedCands,
    countBadges,
    brackets,
    plotBounds: { plotMinX, plotMaxX, plotMinY, plotMaxY },
  };
}
