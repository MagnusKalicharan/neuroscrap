/**
 * Unit Test for Power Cells Classification & Separability
 *
 * Requirements:
 * (a) Exactly 5 good and 5 bad
 * (b) No single-clue threshold on charge alone or damage alone classifies all 10
 * (c) Brute-force linear separation: at least 30 valid weight/bias settings in [-2, 2]
 *     and specifically w=(1, -0.9), bias=-0.35 classifies all 10 with margin.
 */

import { POWER_CELLS } from "./powerCells.ts";

function runTests() {
  console.log("=== Testing Power Cells Dataset ===\n");

  // Check (a): Exactly 5 good and 5 bad
  const goodCount = POWER_CELLS.filter((c) => c.good).length;
  const badCount = POWER_CELLS.filter((c) => !c.good).length;
  console.log(`[Check A] Distribution: ${goodCount} good, ${badCount} bad.`);
  if (goodCount !== 5 || badCount !== 5) {
    throw new Error(`Expected exactly 5 good and 5 bad, got ${goodCount} good and ${badCount} bad.`);
  }
  console.log("  ✔ Check A Passed: Balanced 5/5 split.\n");

  // Check (b): No single-clue threshold
  // Test charge alone: threshold T such that (charge > T <=> good) or (charge < T <=> good)
  let chargeAloneSolves = false;
  for (let t = 0; t <= 1.0; t += 0.01) {
    const higherGood = POWER_CELLS.every((c) => (c.charge > t) === c.good);
    const lowerGood = POWER_CELLS.every((c) => (c.charge < t) === c.good);
    if (higherGood || lowerGood) {
      chargeAloneSolves = true;
      break;
    }
  }

  // Test damage alone: threshold T such that (damage < T <=> good) or (damage > T <=> good)
  let damageAloneSolves = false;
  for (let t = 0; t <= 1.0; t += 0.01) {
    const lowerGood = POWER_CELLS.every((c) => (c.damage < t) === c.good);
    const higherGood = POWER_CELLS.every((c) => (c.damage > t) === c.good);
    if (lowerGood || higherGood) {
      damageAloneSolves = true;
      break;
    }
  }

  console.log(`[Check B] Single clue classification:`);
  console.log(`  - Can charge alone classify all 10? ${chargeAloneSolves ? "YES (FAIL)" : "NO (PASS)"}`);
  console.log(`  - Can damage alone classify all 10? ${damageAloneSolves ? "YES (FAIL)" : "NO (PASS)"}`);
  if (chargeAloneSolves || damageAloneSolves) {
    throw new Error("A single clue was able to classify all cells; both clues must be necessary!");
  }
  console.log("  ✔ Check B Passed: Neither charge nor damage alone is sufficient.\n");

  // Check (c): Two-clue linear rule brute force
  // w_charge in [-2, 2] step 0.1, w_damage in [-2, 2] step 0.1, bias in [-2, 2] step 0.05
  let solvingSettingsCount = 0;
  const canonicalWCharge = 1.0;
  const canonicalWDamage = -0.9;
  const canonicalBias = -0.35;
  let canonicalSolves = false;
  let canonicalMinMargin = Infinity;

  // Verify canonical rule first
  const margins = POWER_CELLS.map((c) => {
    const score = canonicalWCharge * c.charge + canonicalWDamage * c.damage + canonicalBias;
    const correct = (score > 0) === c.good;
    const margin = c.good ? score : -score;
    return { id: c.id, score, correct, margin };
  });

  canonicalSolves = margins.every((m) => m.correct);
  canonicalMinMargin = Math.min(...margins.map((m) => m.margin));

  console.log(`[Check C] Canonical Rule (w_charge=${canonicalWCharge}, w_damage=${canonicalWDamage}, bias=${canonicalBias}):`);
  console.log(`  - Solves all 10? ${canonicalSolves ? "YES" : "NO"}`);
  console.log(`  - Minimum classification margin: ${canonicalMinMargin.toFixed(4)}`);

  if (!canonicalSolves || canonicalMinMargin <= 0.05) {
    throw new Error(`Canonical rule failed or margin too small: margin=${canonicalMinMargin}`);
  }

  // Brute force grid search
  for (let wc = -20; wc <= 20; wc++) {
    const w_charge = wc / 10;
    for (let wd = -20; wd <= 20; wd++) {
      const w_damage = wd / 10;
      for (let b = -40; b <= 40; b++) {
        const bias = b / 20;
        const allCorrect = POWER_CELLS.every((c) => {
          const score = w_charge * c.charge + w_damage * c.damage + bias;
          return (score > 0) === c.good;
        });
        if (allCorrect) {
          solvingSettingsCount++;
        }
      }
    }
  }

  console.log(`  - Total valid parameter settings found in grid: ${solvingSettingsCount}`);
  if (solvingSettingsCount < 30) {
    throw new Error(`Expected at least 30 solving settings, found ${solvingSettingsCount}`);
  }
  console.log("  ✔ Check C Passed: Canonical setting has strong margin and >30 settings solve the dataset.\n");

  console.log("==================================================");
  console.log("🎉 ALL POWER CELLS VALIDATION CHECKS PASSED (10/10)!");
  console.log("==================================================\n");
}

runTests();
