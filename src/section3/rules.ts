/**
 * Section 3: Find the Rescue Beacon — Scoring Rules & Verdict Engine
 * ====================================================================
 * Evaluates 1 or 2 measurement tools to identify which unknown signals
 * stand apart from the 10 known natural scans (black holes, planets, stars).
 *
 * Mathematical Model:
 * For each tool t:
 *   scale_t = max(std of known readings, 0.10 * range of known + unknown readings, 1e-6)
 *   d_t(u)  = (distance from u's reading to nearest known reading) / (scale_t * ref_t), capped at 25.0
 *   ref_t   = max(median over known scans of the leave-one-out NN distance / scale_t, 0.25)
 *
 * One tool:  score(u) = d_t(u)
 * Two tools: score(u) = min(d_a(u), d_b(u))
 * ("A signal counts only if it stands apart on EVERY chosen tool.")
 *
 * Verdict logic:
 *   1. Ties within 5% of the top -> "tied"
 *   2. Top score below 2.0 -> "nothing"
 *   3. Top is the beacon with score ratio to second >= 1.8 -> "found", below 1.8 -> "unclear"
 *   4. Top is a decoy -> "decoy"
 *
 * Banned words: feature, extraction, dimension, cluster, classifier, correlation,
 * anomaly, outlier, novelty.
 */

import type {
  CandidateId,
  CandidateRecord,
  MeasurementId,
  MeasurementModule,
  PairEvaluationResult,
  PairVerdict,
  SectionThreeRecord,
  SingleEvaluationResult,
  SingleVerdict,
} from "./types.ts";
import { BEACON_ID, getCandidateConfig } from "./beaconConfig.ts";
import { createCandidates } from "./candidates.ts";
import { MEASUREMENT_MODULES, getMeasurementById } from "./measurements.ts";
import { getGlossaryEntry } from "./glossary.ts";

export const LINK_CAPACITY = 20; // Maximum numbers carrying across the cracked link
export const SCORE_MIN = 2.0; // Minimum score to be considered standing apart
export const NOVELTY_MIN = SCORE_MIN; // Alias for backward compatibility
export const SEPARATION_MIN = 1.8; // Ratio of highest to second-highest score for clear identification
export const REF_FLOOR = 0.25; // Floor on median LOO distance in scaled units
export const SCORE_CAP = 25.0; // Cap on scaled distance score
export const NOVELTY_CAP = SCORE_CAP; // Alias for backward compatibility
export const REDUNDANT_R_THRESHOLD = 0.85;

export const formatPairRecap = (modAId: MeasurementId, modBId: MeasurementId) =>
  `${getGlossaryEntry(modAId).plainName} + ${getGlossaryEntry(modBId).plainName}`;

export function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) { sumX += x[i]; sumY += y[i]; }
  const meanX = sumX / n, meanY = sumY / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX, dy = y[i] - meanY;
    num += dx * dy; denX += dx * dx; denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/**
 * Computes scale_t for a tool:
 * max(std of known readings, 0.10 * range of known + unknown readings, 1e-6)
 */
export function computeToolScale(knownVals: number[], candVals: number[]): number {
  const n = knownVals.length;
  if (n === 0) return 1.0;
  const mean = knownVals.reduce((a, b) => a + b, 0) / n;
  let varSum = 0;
  for (let i = 0; i < n; i++) {
    varSum += Math.pow(knownVals[i] - mean, 2);
  }
  const std = Math.sqrt(varSum / n);
  const allVals = [...knownVals, ...candVals];
  const range = Math.max(...allVals) - Math.min(...allVals);
  return Math.max(std, 0.10 * range, 1e-6);
}

export const computeDimScale = computeToolScale;

/**
 * Computes ref_t for a tool:
 * max(median over known scans of leave-one-out nearest-neighbour distance / scale_t, 0.25)
 */
export function computeToolRef(
  knownVals: number[],
  scale_t: number,
  refFloorOverride?: number
): number {
  const n = knownVals.length;
  if (n <= 1) return refFloorOverride !== undefined ? refFloorOverride : REF_FLOOR;

  const looDists: number[] = [];
  for (let i = 0; i < n; i++) {
    let minDist = Infinity;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = Math.abs(knownVals[i] - knownVals[j]);
      if (d < minDist) minDist = d;
    }
    looDists.push(minDist / scale_t);
  }

  looDists.sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const medianLOO = n % 2 === 0 ? (looDists[mid - 1] + looDists[mid]) / 2 : looDists[mid];
  const floor = refFloorOverride !== undefined ? refFloorOverride : REF_FLOOR;
  return Math.max(medianLOO, floor);
}

/**
 * Evaluates a single tool (1D) or two tools (2D).
 */
export function computeScoring(
  knownRecords: SectionThreeRecord[],
  candidates: CandidateRecord[],
  modA: MeasurementModule,
  modB: MeasurementModule | null = null,
  refFloorOverride?: number
) {
  const is2D = modB !== null && modA.id !== modB.id;
  const tools = is2D ? [modA, modB] : [modA];

  const dValues: Record<string, number[]> = {};
  for (const c of candidates) {
    dValues[c.id] = [];
  }

  for (const tool of tools) {
    const kVals = knownRecords.map((r) => tool.compute(r));
    const uVals = candidates.map((c) => tool.compute(c));
    const scale_t = computeToolScale(kVals, uVals);
    const ref_t = computeToolRef(kVals, scale_t, refFloorOverride);

    for (let i = 0; i < candidates.length; i++) {
      const uId = candidates[i].id;
      const uVal = uVals[i];
      let nearestDist = Infinity;
      for (const kv of kVals) {
        const d = Math.abs(uVal - kv);
        if (d < nearestDist) nearestDist = d;
      }
      const dt = Math.min(SCORE_CAP, (nearestDist / scale_t) / ref_t);
      dValues[uId].push(dt);
    }
  }

  const candidateScores = candidates.map((cand) => {
    const dList = dValues[cand.id];
    const score = dList.length === 1 ? dList[0] : Math.min(dList[0], dList[1]);
    return {
      candidate: cand,
      score,
      dList,
    };
  });

  // Sort descending by score
  candidateScores.sort((a, b) => b.score - a.score);

  const top = candidateScores[0];
  const second = candidateScores[1];
  const topScore = top.score;
  const secondScore = second ? second.score : 0;
  const ratio = secondScore > 1e-6 ? topScore / secondScore : (topScore > 0 ? 99.0 : 1.0);

  // Verdict logic from prompt:
  // ties within 5% of the top -> "tied"
  // top score below 2.0 -> "nothing"
  // top is the beacon with score ratio to second >= 1.8 -> "found", below 1.8 -> "unclear"
  // top is a decoy -> "decoy"
  let verdict: PairVerdict;
  if (topScore > 0 && secondScore >= 0.95 * topScore) {
    verdict = "tied";
  } else if (topScore < SCORE_MIN) {
    verdict = "nothing";
  } else if (top.candidate.id === BEACON_ID) {
    verdict = ratio >= SEPARATION_MIN ? "found" : "unclear";
  } else {
    verdict = "decoy";
  }

  return {
    verdict,
    top,
    second,
    topScore,
    secondScore,
    ratio,
    candidateScores,
  };
}

/**
 * Evaluates a pair of measurement modules (2D).
 */
export function evaluatePair(
  modA: MeasurementModule,
  modB: MeasurementModule,
  knownRecords: SectionThreeRecord[],
  candidatesList?: CandidateRecord[],
  refFloorOverride?: number
): PairEvaluationResult {
  const candidates = candidatesList || createCandidates();
  const reasons: string[] = [];
  const scores: Record<string, number> = {};

  const scoring = computeScoring(
    knownRecords,
    candidates,
    modA,
    modA.id === modB.id ? null : modB,
    refFloorOverride
  );

  for (const cs of scoring.candidateScores) {
    scores[cs.candidate.id] = Number(cs.score.toFixed(2));
  }

  const top = scoring.top;
  const second = scoring.second;
  const topIsBeacon = top.candidate.id === BEACON_ID;
  const beaconRank = scoring.candidateScores.findIndex((c) => c.candidate.id === BEACON_ID) + 1;

  if (modA.id === modB.id) {
    const entryA = getGlossaryEntry(modA.id);
    reasons.push(`Both channels use ${entryA.plainName}. It acts as a single tool.`);
  }

  if (scoring.verdict === "found") {
    reasons.push(
      `SIGNAL 3 stands apart clearly on both tools with a margin of ${scoring.ratio.toFixed(2)}x over second.`
    );
  } else if (scoring.verdict === "unclear") {
    reasons.push(
      `SIGNAL 3 stands out, but not far enough ahead of ${second?.candidate.label || "second signal"} (margin ${scoring.ratio.toFixed(2)}x).`
    );
  } else if (scoring.verdict === "tied") {
    reasons.push(
      `Multiple signals score within 5% of each other. The readings are tied.`
    );
  } else if (scoring.verdict === "nothing") {
    reasons.push(`No signal stands apart from the known scans on both tools.`);
  } else if (scoring.verdict === "decoy") {
    const decoyConf = getCandidateConfig(top.candidate.id as CandidateId);
    if (decoyConf && decoyConf.decoyNote) {
      reasons.push(decoyConf.decoyNote);
    } else {
      reasons.push(`${top.candidate.label || top.candidate.id} stands apart, but it is a decoy.`);
    }
  }

  return {
    ok: scoring.verdict === "found",
    verdict: scoring.verdict,
    flaggedId: top.candidate.id as CandidateId,
    topIsBeacon,
    secondId: second ? (second.candidate.id as CandidateId) : undefined,
    scores,
    beaconRank,
    reasons,
    margin: scoring.ratio,
    topScore: scoring.topScore,
    secondScore: scoring.secondScore,
    candidateScores: scoring.candidateScores,
  };
}

/**
 * Evaluates a single measurement module (1D).
 */
export function evaluateSingle(
  mod: MeasurementModule,
  knownRecords: SectionThreeRecord[],
  candidatesList?: CandidateRecord[],
  refFloorOverride?: number
): SingleEvaluationResult {
  const candidates = candidatesList || createCandidates();
  const reasons: string[] = [];
  const scores: Record<string, number> = {};

  const scoring = computeScoring(knownRecords, candidates, mod, null, refFloorOverride);

  for (const cs of scoring.candidateScores) {
    scores[cs.candidate.id] = Number(cs.score.toFixed(2));
  }

  const top = scoring.top;
  const second = scoring.second;
  const topIsBeacon = top.candidate.id === BEACON_ID;
  const beaconRank = scoring.candidateScores.findIndex((c) => c.candidate.id === BEACON_ID) + 1;

  let singleVerdict: SingleVerdict;
  if (scoring.verdict === "tied") {
    singleVerdict = "tied";
    reasons.push(`Signals score within 5% of each other on ${mod.plainName || mod.label}.`);
  } else if (scoring.verdict === "nothing") {
    singleVerdict = "nothing";
    reasons.push(`No signal stands out on ${mod.plainName || mod.label}.`);
  } else {
    singleVerdict = "decoy";
    const decoyConf = getCandidateConfig(top.candidate.id as CandidateId);
    if (decoyConf && decoyConf.decoyNote) {
      reasons.push(decoyConf.decoyNote);
    } else {
      reasons.push(`${top.candidate.label || top.candidate.id} stands out, but one tool is not enough.`);
    }
  }

  return {
    ok: false,
    verdict: singleVerdict,
    flaggedId: top.candidate.id as CandidateId,
    topIsBeacon,
    secondId: second ? (second.candidate.id as CandidateId) : undefined,
    scores,
    beaconRank,
    reasons,
    topScore: scoring.topScore,
    secondScore: scoring.secondScore,
    margin: scoring.ratio,
    candidateScores: scoring.candidateScores,
  };
}

/**
 * Evaluates raw waveforms attempt across the cracked link.
 */
export function evaluateRaw(
  knownRecords: SectionThreeRecord[],
  candidatesList?: CandidateRecord[],
  linkBandwidth: number = LINK_CAPACITY
): { ok: false; reason: string; needed: number; capacity: number } {
  const totalPoints = knownRecords.length * 64;
  return {
    ok: false,
    reason: `TRANSMISSION FAILED: Raw waveforms require ${totalPoints} numbers. Cracked link capacity is ${linkBandwidth}.`,
    needed: totalPoints,
    capacity: linkBandwidth,
  };
}

/**
 * Headless helper to generate all 6 pairs report.
 */
export function allPairsReport(
  knownRecords: SectionThreeRecord[],
  candidatesList?: CandidateRecord[]
) {
  const candidates = candidatesList || createCandidates();
  const reports: Array<{
    pair: [MeasurementId, MeasurementId];
    label: string;
    result: PairEvaluationResult;
  }> = [];

  const modules = MEASUREMENT_MODULES;
  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const modA = modules[i];
      const modB = modules[j];
      const result = evaluatePair(modA, modB, knownRecords, candidates);
      reports.push({
        pair: [modA.id, modB.id],
        label: `${modA.label} + ${modB.label}`,
        result,
      });
    }
  }

  return reports;
}

/**
 * Headless helper to evaluate all single tools.
 */
export function singleReport(
  knownRecords: SectionThreeRecord[],
  candidatesList?: CandidateRecord[]
) {
  const candidates = candidatesList || createCandidates();
  return MEASUREMENT_MODULES.map((mod) => ({
    module: mod,
    result: evaluateSingle(mod, knownRecords, candidates),
  }));
}
