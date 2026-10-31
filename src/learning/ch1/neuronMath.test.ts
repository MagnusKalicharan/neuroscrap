import { SCENARIOS, DEFAULT_WEIGHTS, KNOWN_SOLUTION } from './scenarios.ts';
import { computeNeuron, evaluateAllCases, round } from './neuronMath.ts';
import type { Weights } from './neuronMath.ts';

export function runAllTests() {
  console.log('====================================================');
  console.log('🧪 CHAPTER 1: NEURON MATH & SOLVABILITY TEST SUITE');
  console.log('====================================================\n');

  let passedAll = true;

  // Test (a): Check default weights
  console.log('--- Test (a): Default Weights Behavior ---');
  const defaultEval = evaluateAllCases(SCENARIOS, DEFAULT_WEIGHTS);
  console.log(`Default weights: w1=${DEFAULT_WEIGHTS.w1}, w2=${DEFAULT_WEIGHTS.w2}, w3=${DEFAULT_WEIGHTS.w3}, b=${DEFAULT_WEIGHTS.b}`);
  console.log(`Default score: ${defaultEval.score} / ${defaultEval.total}`);

  const case2 = defaultEval.evaluations.find(e => e.scenario.id === 2);
  const case3 = defaultEval.evaluations.find(e => e.scenario.id === 3);

  if (defaultEval.score >= 6) {
    console.error('❌ FAIL: Default weights should NOT pass all 6 cases.');
    passedAll = false;
  } else {
    console.log('✓ PASS: Default weights do not pass all 6 cases.');
  }

  if (case2 && !case2.passed) {
    console.log('✓ PASS: Default weights correctly fail Case 2 (Toxic fog).');
  } else {
    console.error('❌ FAIL: Default weights should fail Case 2.');
    passedAll = false;
  }

  if (case3 && !case3.passed) {
    console.log('✓ PASS: Default weights correctly fail Case 3 (Radiation storm).');
  } else {
    console.error('❌ FAIL: Default weights should fail Case 3.');
    passedAll = false;
  }

  // Test (b): Confirm known solution passes all 6
  console.log('\n--- Test (b): Known Solution Verification ---');
  const solutionEval = evaluateAllCases(SCENARIOS, KNOWN_SOLUTION);
  console.log(`Known solution: w1=${KNOWN_SOLUTION.w1}, w2=${KNOWN_SOLUTION.w2}, w3=${KNOWN_SOLUTION.w3}, b=${KNOWN_SOLUTION.b}`);
  console.log(`Known solution score: ${solutionEval.score} / ${solutionEval.total}`);

  solutionEval.evaluations.forEach(ev => {
    const s = ev.scenario;
    const res = ev.result;
    console.log(`  Case ${s.id} (${s.name}): inputs=(${s.inputs.air}, ${s.inputs.temp}, ${s.inputs.radiation}) -> sum=${res.sum} -> ${res.decision} [Expected ${s.expected}] ${ev.passed ? '✓' : '❌'}`);
  });

  if (solutionEval.allPassed) {
    console.log('✓ PASS: Known solution passes 6/6 cases.');
  } else {
    console.error('❌ FAIL: Known solution did not pass all 6 cases.');
    passedAll = false;
  }

  // Test (d): Check no case has sum exactly 0 for known solution
  console.log('\n--- Test (d): Non-Zero Sum Threshold Check ---');
  let zeroSumFound = false;
  solutionEval.evaluations.forEach(ev => {
    if (Math.abs(ev.result.sum) < 0.001) {
      console.error(`❌ FAIL: Case ${ev.scenario.id} has sum == 0.`);
      zeroSumFound = true;
    }
  });
  if (!zeroSumFound) {
    console.log('✓ PASS: No case produces an ambiguous sum of exactly 0.0.');
  } else {
    passedAll = false;
  }

  // Test (c): Brute-force parameter grid search over [-2, 2] step 0.1
  console.log('\n--- Test (c): Brute-Force Solution Count Search ---');
  console.log('Searching parameter space: w1, w2, w3, b in [-2.0, 2.0] step 0.1...');
  const t0 = Date.now();

  const values: number[] = [];
  for (let i = -20; i <= 20; i++) {
    values.push(round(i * 0.1, 1));
  }

  let validSolutionCount = 0;
  const sampleSolutions: Weights[] = [];

  for (const w1 of values) {
    for (const w2 of values) {
      for (const w3 of values) {
        for (const b of values) {
          const weights: Weights = { w1, w2, w3, b };
          let allMatch = true;
          for (let i = 0; i < SCENARIOS.length; i++) {
            const sc = SCENARIOS[i];
            const sum = round(sc.inputs.air * w1 + sc.inputs.temp * w2 + sc.inputs.radiation * w3 + b, 2);
            const decision = sum > 0 ? 'OPEN' : 'SHUT';
            if (decision !== sc.expected) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            validSolutionCount++;
            if (sampleSolutions.length < 5) {
              sampleSolutions.push(weights);
            }
          }
        }
      }
    }
  }

  const durationMs = Date.now() - t0;
  console.log(`Grid search completed in ${durationMs}ms.`);
  console.log(`Total valid solutions found: ${validSolutionCount}`);
  console.log('Sample working solutions:');
  sampleSolutions.forEach((s, idx) => {
    console.log(`  [${idx + 1}] w1=${s.w1}, w2=${s.w2}, w3=${s.w3}, b=${s.b}`);
  });

  if (validSolutionCount >= 50) {
    console.log(`✓ PASS: Found ${validSolutionCount} valid solutions (requirement: >= 50).`);
  } else {
    console.error(`❌ FAIL: Found only ${validSolutionCount} valid solutions (< 50).`);
    passedAll = false;
  }

  console.log('\n====================================================');
  if (passedAll) {
    console.log('🎉 ALL CHAPTER 1 TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('💥 SOME TESTS FAILED.');
    process.exit(1);
  }
  console.log('====================================================\n');
}

runAllTests();
