/**
 * src/section2/evaluateConfig.ts
 * ============================================================
 * Section 2: Relay Line Configuration Evaluator
 * 
 * Evaluates relay network configurations for the signal transmission line.
 * Implements pure evaluation logic and tests shared across Steps 1, 2, and 3.
 */

import { RELAY_NODES, type RelayNodeData } from "./nodeData.ts";

export type RelayMode = "connect" | "ignore" | "patch";

export interface NodeConfig {
  mode: RelayMode;
  patchValue?: number;
}

export type RelayConfig = Record<string, NodeConfig>;

export type FailureType = "surge" | "gap" | "chain" | "estimate";

export interface EvaluationResult {
  ok: boolean;
  failure?: FailureType;
  reason?: string;
  warnings: string[];
  averageUsed?: number;
}

/**
 * Calculates arithmetic average of an array of numbers.
 */
export function averageOf(readings: number[]): number {
  if (readings.length === 0) return 0;
  const sum = readings.reduce((acc, val) => acc + val, 0);
  return sum / readings.length;
}

/**
 * Averages the readings that are currently "connect" or patched, ignoring nulls.
 * With the surge (R3) still connected, it returns ~20,096.
 * With R3 ignored, it returns 120.25.
 */
export function autoFillAverage(config: RelayConfig): number {
  const activeReadings: number[] = [];

  for (const node of RELAY_NODES) {
    const nodeCfg = config[node.id] || { mode: "connect" };
    if (nodeCfg.mode === "connect") {
      if (node.reading !== null) {
        activeReadings.push(node.reading);
      }
    } else if (nodeCfg.mode === "patch") {
      if (typeof nodeCfg.patchValue === "number" && !isNaN(nodeCfg.patchValue)) {
        activeReadings.push(nodeCfg.patchValue);
      }
    }
    // "ignore" excludes the reading from the packet calculation
  }

  return averageOf(activeReadings);
}

/**
 * Pure evaluation function for the relay node configuration.
 * Priority order of reported failures: surge, gap, chain, estimate.
 */
export function evaluateConfig(config: RelayConfig): EvaluationResult {
  const warnings: string[] = [];

  // 1. Collect warnings for healthy nodes set to "ignore" or "patch"
  const healthyNodes = RELAY_NODES.filter((n) => n.kind === "healthy");
  for (const node of healthyNodes) {
    const nodeCfg = config[node.id];
    if (nodeCfg) {
      if (nodeCfg.mode === "ignore") {
        warnings.push(`${node.id}: discarded good data`);
      } else if (nodeCfg.mode === "patch") {
        warnings.push(`${node.id}: overwrote a real reading`);
      }
    }
  }

  // Calculate baseline of healthy nodes: (118 + 121 + 120 + 122) / 4 = 120.25
  const healthyReadings = healthyNodes
    .map((n) => n.reading)
    .filter((r): r is number => r !== null);
  const baselineHealthyAverage = averageOf(healthyReadings); // 120.25
  const tolerance = 3.0;
  const minTolerance = baselineHealthyAverage - tolerance; // 117.25
  const maxTolerance = baselineHealthyAverage + tolerance; // 123.25

  const r3Cfg = config["R3"] || { mode: "connect" };
  const r4Cfg = config["R4"] || { mode: "connect" };

  // Priority 1: SURGE
  // R3 in "connect" mode injects 99,999 V surge
  if (r3Cfg.mode === "connect") {
    return {
      ok: false,
      failure: "surge",
      reason: "Surge injected 99,999 V into the packet.",
      warnings,
      averageUsed: baselineHealthyAverage,
    };
  }

  // Priority 2: GAP
  // R4 has no component, so "connect" mode fails because signal cannot relay through nothing
  if (r4Cfg.mode === "connect") {
    return {
      ok: false,
      failure: "gap",
      reason: "Cannot relay through R4: no component detected.",
      warnings,
      averageUsed: baselineHealthyAverage,
    };
  }

  // Priority 3: CHAIN
  // R4 has no component, so "ignore" mode fails because signal cannot physically cross the gap
  if (r4Cfg.mode === "ignore") {
    return {
      ok: false,
      failure: "chain",
      reason: "Signal cannot physically cross the gap at R4.",
      warnings,
      averageUsed: baselineHealthyAverage,
    };
  }

  // Priority 4: ESTIMATE
  // Check R4 patch value (must be within +-3 V of healthy average [117.25, 123.25])
  if (r4Cfg.mode === "patch") {
    const val = r4Cfg.patchValue;
    if (typeof val !== "number" || isNaN(val)) {
      return {
        ok: false,
        failure: "estimate",
        reason: "No patch value provided for R4.",
        warnings,
        averageUsed: baselineHealthyAverage,
      };
    }
    if (val < minTolerance) {
      return {
        ok: false,
        failure: "estimate",
        reason: "Estimated value is too low.",
        warnings,
        averageUsed: baselineHealthyAverage,
      };
    }
    if (val > maxTolerance) {
      return {
        ok: false,
        failure: "estimate",
        reason: "Estimated value is too high.",
        warnings,
        averageUsed: baselineHealthyAverage,
      };
    }
  }

  // Check R3 patch value if patched (must also be within tolerance)
  if (r3Cfg.mode === "patch") {
    const val = r3Cfg.patchValue;
    if (typeof val !== "number" || isNaN(val)) {
      return {
        ok: false,
        failure: "estimate",
        reason: "No patch value provided for R3.",
        warnings,
        averageUsed: baselineHealthyAverage,
      };
    }
    if (val < minTolerance) {
      return {
        ok: false,
        failure: "estimate",
        reason: "Estimated value for R3 is too low.",
        warnings,
        averageUsed: baselineHealthyAverage,
      };
    }
    if (val > maxTolerance) {
      return {
        ok: false,
        failure: "estimate",
        reason: "Estimated value for R3 is too high.",
        warnings,
        averageUsed: baselineHealthyAverage,
      };
    }
  }

  // All checks passed!
  return {
    ok: true,
    warnings,
    averageUsed: baselineHealthyAverage,
  };
}
