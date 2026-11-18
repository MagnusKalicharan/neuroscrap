/**
 * Section 3: The Feature Lab - Measurement Modules
 * ================================================
 * Defines the 4 measurement modules used to inspect raw telemetry curves:
 * BRIGHTNESS, BEAT, COLOUR, and JUMPINESS.
 *
 * Rules:
 * - Pure functions operating solely on raw signal waveforms and colors.
 * - ZERO references to forbidden scan metadata fields.
 * - ZERO forbidden words in player text.
 */

import type {
  MeasurableRecord,
  MeasurementId,
  MeasurementModule,
  PreviewMark,
} from "./types.ts";
import { MEASUREMENT_GLOSSARY } from "./glossary.ts";

export const BRIGHTNESS_MODULE: MeasurementModule = {
  id: "brightness",
  label: MEASUREMENT_GLOSSARY.brightness.shortName,
  shortName: MEASUREMENT_GLOSSARY.brightness.shortName,
  plainName: MEASUREMENT_GLOSSARY.brightness.plainName,
  icon: MEASUREMENT_GLOSSARY.brightness.icon,
  plainDescription: MEASUREMENT_GLOSSARY.brightness.oneLiner,
  compute: (record: MeasurableRecord): number => {
    let sum = 0;
    for (let i = 0; i < record.signal.length; i++) {
      sum += record.signal[i];
    }
    return sum / record.signal.length;
  },
  previewMarks: (record: MeasurableRecord): PreviewMark[] => {
    const val = BRIGHTNESS_MODULE.compute(record);
    return [
      {
        type: "mean-line",
        y: val,
        value: val,
        label: `BRIGHTNESS ${val.toFixed(2)}`,
      },
    ];
  },
};

export const BEAT_MODULE: MeasurementModule = {
  id: "beat",
  label: MEASUREMENT_GLOSSARY.beat.shortName,
  shortName: MEASUREMENT_GLOSSARY.beat.shortName,
  plainName: MEASUREMENT_GLOSSARY.beat.plainName,
  icon: MEASUREMENT_GLOSSARY.beat.icon,
  plainDescription: MEASUREMENT_GLOSSARY.beat.oneLiner,
  compute: (record: MeasurableRecord): number => {
    const s = record.signal;
    const N = s.length;
    if (N < 25) return 0;

    // 16-point moving average detrending
    const ma = new Array(N);
    for (let i = 0; i < N; i++) {
      const start = Math.max(0, i - 8);
      const end = Math.min(N - 1, i + 7);
      let sum = 0;
      for (let j = start; j <= end; j++) sum += s[j];
      ma[i] = sum / (end - start + 1);
    }

    const d = new Array(N);
    let dMean = 0;
    for (let i = 0; i < N; i++) {
      d[i] = s[i] - ma[i];
      dMean += d[i];
    }
    dMean /= N;
    for (let i = 0; i < N; i++) d[i] -= dMean;

    let varTotal = 0;
    for (let i = 0; i < N; i++) varTotal += d[i] * d[i];
    if (varTotal < 1e-12) return 0.0;

    const acf = new Array(26).fill(0);
    for (let k = 3; k <= 25; k++) {
      let num = 0;
      let d1Sq = 0;
      let d2Sq = 0;
      for (let i = 0; i < N - k; i++) {
        num += d[i] * d[i + k];
        d1Sq += d[i] * d[i];
        d2Sq += d[i + k] * d[i + k];
      }
      const denom = Math.sqrt(d1Sq * d2Sq);
      acf[k] = denom > 1e-12 ? num / denom : 0;
    }

    let maxPeak = 0;
    for (let k = 4; k <= 24; k++) {
      if (acf[k] > acf[k - 1] && acf[k] >= acf[k + 1]) {
        if (acf[k] > maxPeak) maxPeak = acf[k];
      }
    }

    return Math.max(0, Math.min(1, maxPeak));
  },
  previewMarks: (record: MeasurableRecord): PreviewMark[] => {
    const val = BEAT_MODULE.compute(record);
    const s = record.signal;
    const N = s.length;

    // Find best lag for visualization
    const ma = new Array(N);
    for (let i = 0; i < N; i++) {
      const start = Math.max(0, i - 8);
      const end = Math.min(N - 1, i + 7);
      let sum = 0;
      for (let j = start; j <= end; j++) sum += s[j];
      ma[i] = sum / (end - start + 1);
    }
    const d = new Array(N);
    let dMean = 0;
    for (let i = 0; i < N; i++) {
      d[i] = s[i] - ma[i];
      dMean += d[i];
    }
    dMean /= N;
    for (let i = 0; i < N; i++) d[i] -= dMean;

    const acf = new Array(26).fill(0);
    for (let k = 3; k <= 25; k++) {
      let num = 0;
      let d1Sq = 0;
      let d2Sq = 0;
      for (let i = 0; i < N - k; i++) {
        num += d[i] * d[i + k];
        d1Sq += d[i] * d[i];
        d2Sq += d[i + k] * d[i + k];
      }
      const denom = Math.sqrt(d1Sq * d2Sq);
      acf[k] = denom > 1e-12 ? num / denom : 0;
    }

    let bestLag = 8;
    let maxP = -1;
    for (let k = 4; k <= 24; k++) {
      if (acf[k] > acf[k - 1] && acf[k] >= acf[k + 1]) {
        if (acf[k] > maxP) {
          maxP = acf[k];
          bestLag = k;
        }
      }
    }

    return [
      {
        type: "beat-arrows",
        x: 0,
        x2: bestLag,
        value: val,
        label: `BEAT ${val.toFixed(2)} (LAG ${bestLag})`,
      },
    ];
  },
};

export const COLOUR_MODULE: MeasurementModule = {
  id: "colour",
  label: MEASUREMENT_GLOSSARY.colour.shortName,
  shortName: MEASUREMENT_GLOSSARY.colour.shortName,
  plainName: MEASUREMENT_GLOSSARY.colour.plainName,
  icon: MEASUREMENT_GLOSSARY.colour.icon,
  plainDescription: MEASUREMENT_GLOSSARY.colour.oneLiner,
  compute: (record: MeasurableRecord): number => {
    const [r, g] = record.color;
    const total = r + g;
    return total === 0 ? 0.5 : r / total;
  },
  previewMarks: (record: MeasurableRecord): PreviewMark[] => {
    const val = COLOUR_MODULE.compute(record);
    return [
      {
        type: "colour-bars",
        value: val,
        label: `COLOUR LEAN ${val.toFixed(2)}`,
      },
    ];
  },
};

export const JUMPINESS_MODULE: MeasurementModule = {
  id: "jumpiness",
  label: MEASUREMENT_GLOSSARY.jumpiness.shortName,
  shortName: MEASUREMENT_GLOSSARY.jumpiness.shortName,
  plainName: MEASUREMENT_GLOSSARY.jumpiness.plainName,
  icon: MEASUREMENT_GLOSSARY.jumpiness.icon,
  plainDescription: MEASUREMENT_GLOSSARY.jumpiness.oneLiner,
  compute: (record: MeasurableRecord): number => {
    let sum = 0;
    const n = record.signal.length;
    if (n < 2) return 0;
    for (let i = 0; i < n - 1; i++) {
      sum += Math.abs(record.signal[i + 1] - record.signal[i]);
    }
    return sum / (n - 1);
  },
  previewMarks: (record: MeasurableRecord): PreviewMark[] => {
    const val = JUMPINESS_MODULE.compute(record);
    return [
      {
        type: "jump-ticks",
        value: val,
        label: `JUMPINESS ${val.toFixed(3)}`,
      },
    ];
  },
};

export const MEASUREMENT_MODULES: MeasurementModule[] = [
  BRIGHTNESS_MODULE,
  BEAT_MODULE,
  COLOUR_MODULE,
  JUMPINESS_MODULE,
];

export function getMeasurementById(id: MeasurementId | string): MeasurementModule {
  const found = MEASUREMENT_MODULES.find((m) => m.id === id);
  if (!found) {
    console.warn(`[measurements] Unknown measurement ID: "${id}". Falling back to ${MEASUREMENT_MODULES[0].id}.`);
    return MEASUREMENT_MODULES[0];
  }
  return found;
}

export function measureAll(record: MeasurableRecord): Record<MeasurementId, number> {
  return {
    brightness: BRIGHTNESS_MODULE.compute(record),
    beat: BEAT_MODULE.compute(record),
    colour: COLOUR_MODULE.compute(record),
    jumpiness: JUMPINESS_MODULE.compute(record),
  };
}
