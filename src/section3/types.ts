/**
 * Section 3: Find the Rescue Beacon — Data Contracts & Types
 * ============================================================
 * Defines core types for the 10 known telemetry records, the 6 unknown candidate
 * signals, measurement modules, scoring rules, and reactive state.
 *
 * Story:
 * The antenna works. A rescue ship is broadcasting a beacon among 6 unknown signals.
 * The player's 10 known scans show natural objects. A machine differs from nature.
 * The auxiliary reactor (12%) can power only TWO measurement channels.
 *
 * Banned words: feature, extraction, dimension, cluster, classifier, correlation,
 * anomaly, outlier, novelty.
 */

export type CelestialKind = "BH" | "PLANET" | "STARS" | "STAR";

export type CandidateId =
  | "candidate_pulsar"
  | "candidate_flare"
  | "candidate_beacon"
  | "candidate_dark_rock"
  | "candidate_storm"
  | "candidate_blue_glow";

export interface MeasurableRecord {
  signal: number[];
  color: [number, number];
  [key: string]: any;
}

/**
 * Known telemetry scan record (from Section 1 pendrive)
 */
export interface SectionThreeRecord {
  scanId: string;
  orderIndex?: number;
  kind: CelestialKind;
  targetName: string;
  category?: "black_hole" | "planet" | "stars";
  filename?: string;
  signal: number[]; // 64 numbers in [0, 1]
  color: [number, number]; // [red, green]
  thumbnail?: string;
  imageDataUrl?: string;
  thumbnailSvg?: string;
}

/**
 * Unknown candidate signal received by the antenna
 */
export interface CandidateRecord {
  id: CandidateId;
  kind: string;
  label?: string;
  signal: number[]; // 64 numbers in [0, 1]
  color: [number, number]; // [red, green]
  decoyNote?: string;
}

export type MeasurementId =
  | "brightness"
  | "beat"
  | "colour"
  | "jumpiness";

export type PreviewMarkType =
  | "mean-line"
  | "beat-arrows"
  | "colour-bars"
  | "jump-ticks";

export interface PreviewMark {
  type: PreviewMarkType;
  x?: number;
  x2?: number;
  y?: number;
  y2?: number;
  value: number;
  label: string;
  meta?: Record<string, unknown>;
}

export interface MeasurementModule {
  id: MeasurementId;
  label: string;
  shortName?: string;
  plainName?: string;
  icon: string;
  plainDescription: string;
  compute: (record: MeasurableRecord) => number;
  previewMarks: (record: MeasurableRecord) => PreviewMark[];
}

export type PairVerdict =
  | "same"
  | "found"
  | "unclear"
  | "decoy"
  | "tied"
  | "nothing";

export type SingleVerdict = "tied" | "nothing" | "decoy";

export interface CandidateScore {
  id: CandidateId;
  score: number;
  rawVals: number[];
  dList?: number[];
}

export interface PairEvaluationResult {
  ok: boolean;
  verdict: PairVerdict;
  flaggedId?: CandidateId;
  topIsBeacon?: boolean;
  secondId?: CandidateId;
  scores: Record<string, number>;
  beaconRank: number;
  reasons: string[];
  margin?: number;
  topScore?: number;
  secondScore?: number;
  candidateScores?: Array<{
    candidate: CandidateRecord;
    score: number;
    dList: number[];
  }>;
}

export interface SingleEvaluationResult {
  ok: boolean;
  verdict: SingleVerdict;
  flaggedId?: CandidateId;
  topIsBeacon?: boolean;
  secondId?: CandidateId;
  scores: Record<string, number>;
  beaconRank: number;
  reasons: string[];
  topScore?: number;
  secondScore?: number;
  margin?: number;
  candidateScores?: Array<{
    candidate: CandidateRecord;
    score: number;
    dList: number[];
  }>;
}

export interface CandidateConfig {
  id: CandidateId;
  label: string; // "SIGNAL 1" .. "SIGNAL 6" (FIXED display order, NOT beacon first)
  skyDirection: [number, number, number]; // Unit vector in visible sky
  decoyNote: string; // One-line reason for recap / feedback
  isBeacon: boolean;
}

export interface LockAttempt {
  targetId: CandidateId;
  pair: [MeasurementId, MeasurementId] | null;
  verdict: PairVerdict;
  timestamp: number;
}

export interface SectionThreeState {
  examplesViewed: string[];
  toolsApplied: Record<string, Record<MeasurementId, number | boolean>>;
  channels: [MeasurementId | null, MeasurementId | null];
  pairsTried: Array<[MeasurementId, MeasurementId]>;
  locksTried: LockAttempt[];
  bursts: number; // 3 at start
  passed: boolean;
  unknownOpened?: boolean;
  beaconVerified?: boolean;
  transitionDialogueSeen?: boolean;
}
