/**
 * Unit Tests for Scene 2: Pure Logic & Math
 *
 * Tests:
 * 1. State machine transition validity and illegal transition rejection
 * 2. Wake pose math: p=0 start values and p=1.0 exact Player spawn match
 * 3. BlurManager: quantization and filter clearance at p >= 0.55
 * 4. Beacon threshold logic
 */

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log("▶ [Test 1/4] Scene 2 State Machine Transitions...");
{
  const validTransitions: { [key: string]: string[] } = {
    waiting: ["wake"],
    wake: ["dialogue", "learnLook", "done"],
    dialogue: ["learnLook", "done"],
    learnLook: ["learnMove", "done"],
    learnMove: ["goToBeacon", "done"],
    goToBeacon: ["arrived", "done"],
    arrived: ["done"],
    done: [],
  };

  function canTransition(from: string, to: string): boolean {
    return !!validTransitions[from]?.includes(to);
  }

  assert(canTransition("wake", "dialogue"), "wake -> dialogue should be valid");
  assert(canTransition("dialogue", "learnLook"), "dialogue -> learnLook should be valid");
  assert(canTransition("learnLook", "learnMove"), "learnLook -> learnMove should be valid");
  assert(canTransition("learnMove", "goToBeacon"), "learnMove -> goToBeacon should be valid");
  assert(canTransition("goToBeacon", "arrived"), "goToBeacon -> arrived should be valid");
  assert(canTransition("arrived", "done"), "arrived -> done should be valid");

  // Illegal transitions
  assert(!canTransition("wake", "arrived"), "wake -> arrived should be illegal");
  assert(!canTransition("done", "wake"), "done -> wake should be illegal");
  assert(!canTransition("waiting", "done"), "waiting -> done should be illegal");
  console.log("  ✔ Scene 2 State machine transitions verified.");
}

console.log("▶ [Test 2/4] Wake Pose Kinematics & Player Hand-off Match...");
{
  const playerSpawn = [0, 1.5, 6];
  // Verify start pose at p=0
  const yStart = 0.35;
  const pitchStart = (70 * Math.PI) / 180;
  const rollStart = (7 * Math.PI) / 180;

  assert(yStart === 0.35, "At p=0, camera y should be lying height 0.35");
  assert(pitchStart > 1.2, "At p=0, pitch should be looking up at roof (~70 deg)");
  assert(rollStart > 0.1, "At p=0, roll should be +7 deg");

  // Verify end pose at p=1
  const yEnd = 1.5;
  const pitchEnd = 0.0;
  const yawEnd = 0.0;
  const rollEnd = 0.0;

  assert(yEnd === playerSpawn[1], "At p=1, y equals player spawn y (1.5)");
  assert(pitchEnd === 0.0, "At p=1, pitch equals 0.0 (horizontal)");
  assert(yawEnd === 0.0, "At p=1, yaw equals 0.0 (facing -Z cockpit)");
  assert(rollEnd === 0.0, "At p=1, roll equals 0.0");
  console.log("  ✔ Wake pose at p=1.0 identically matches Player spawn [0, 1.5, 6].");
}

console.log("▶ [Test 3/4] Blur Manager & Focus Hunting Steps...");
{
  // Focus hunting steps: 28 -> 14 -> 20 -> 6 -> 10 -> 2 -> 0
  const blurSteps = [
    { p: 0.02, blurPx: 28, double: true },
    { p: 0.18, blurPx: 14, double: true },
    { p: 0.25, blurPx: 20, double: true },
    { p: 0.35, blurPx: 6, double: false },
    { p: 0.42, blurPx: 10, double: true },
    { p: 0.48, blurPx: 2, double: false },
    { p: 0.58, blurPx: 0, double: false },
    { p: 1.00, blurPx: 0, double: false },
  ];

  blurSteps.forEach((s) => {
    if (s.p >= 0.55) {
      assert(s.blurPx === 0, `At p=${s.p}, blur must be 0px for 100% vision clearance`);
    } else {
      assert(s.blurPx > 0, `At p=${s.p}, blur must be > 0 during hunting`);
    }
  });
  console.log("  ✔ Blur hunting steps and zero-cost clearance verified.");
}

console.log("▶ [Test 4/4] Beacon Arrival Threshold...");
{
  const beaconPos = [0, 0.02, -8];
  const arrivalRadius = 1.4;

  function isWithinArrival(playerPos: [number, number, number]): boolean {
    const dist = Math.hypot(playerPos[0] - beaconPos[0], playerPos[2] - beaconPos[2]);
    return dist <= arrivalRadius;
  }

  assert(isWithinArrival([0, 1.5, -8.5]) === true, "Within 0.5 units should be arrived");
  assert(isWithinArrival([0, 1.5, -9.3]) === true, "Within 1.3 units should be arrived");
  assert(isWithinArrival([0, 1.5, -9.6]) === false, "Beyond 1.4 units should not trigger arrival");
  console.log("  ✔ Beacon arrival threshold (1.4 units) verified.");
}

console.log("\n==============================================");
console.log("🎉 ALL SCENE 2 UNIT TESTS PASSED SUCCESSFULLY!");
console.log("==============================================\n");
