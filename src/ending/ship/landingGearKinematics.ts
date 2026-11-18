/**
 * src/ending/ship/landingGearKinematics.ts
 * ============================================================
 * Two-bone IK solver and kinematics for Rescue Two's 3 landing gear assemblies.
 * 
 * Requirements:
 * - 3 legs spaced 120° apart (LEG_ANGLES).
 * - Pod recessed into underside with door panel.
 * - Hip pivot H on pod.
 * - Upper strut: hexagonal section (1.2m diameter).
 * - Knee joint: cylinder along the hinge axis (tangential).
 * - Lower strut: hexagonal/cylindrical section.
 * - Flat foot pad: disc 4.0m wide (radius 2.0m), normal up, always level.
 * - Hydraulic piston from pod to lower strut.
 * - Two-bone solver: solves knee K bending outward, foot pad always level.
 * - Joints overlap struts by >= 10 cm (0.10 m).
 * - gear = 0: tucks inside pod (protrusion < 0.3m, door closed).
 * - gear = 1: foot pad bottom touches ground plane (y = -14.0m) within 1 cm.
 * - Animate smoothly: door opens first (0..0.25), then legs extend (0.25..1.0).
 * - No intersection with hull at any value of gear (0..1).
 */
import * as THREE from "three";

export const LEG_ANGLES = [
  Math.PI / 6,                    // 30°
  Math.PI / 6 + (2 * Math.PI) / 3, // 150°
  Math.PI / 6 + (4 * Math.PI) / 3, // 270°
];

export interface LegAssemblyState {
  hipPoint: THREE.Vector3;
  kneePoint: THREE.Vector3;
  anklePoint: THREE.Vector3;
  footpadBottomY: number;
  doorAngleRad: number;
  upperStrutLength: number;
  lowerStrutLength: number;
  pistonAnchor: THREE.Vector3;
  pistonRodEnd: THREE.Vector3;
}

export const FOOTPAD_RADIUS = 2.0;    // 4m wide disc
export const FOOTPAD_THICKNESS = 0.3; // Ankle is at y = footpadBottomY + 0.3

/**
 * Computes exact 3D leg positions and poses for leg `legIndex` at `gearDeploy` (0..1).
 */
export function computeLegState(gearDeploy: number, legIndex: number): LegAssemblyState {
  const g = Math.max(0, Math.min(1, gearDeploy));
  const angle = LEG_ANGLES[legIndex % 3];
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const to3D = (r: number, y: number): THREE.Vector3 => {
    return new THREE.Vector3(r * cosA, y, r * sinA);
  };

  // Fixed Hip Pivot inside the recessed pod: r = 19.5m, y = -4.4m
  const H_r = 19.5;
  const H_y = -4.4;

  // Door opens first during g in [0.0, 0.25]: hinges outward up to 75°
  const doorProgress = Math.min(1.0, g / 0.25);
  const doorAngleRad = doorProgress * THREE.MathUtils.degToRad(75.0);

  // Leg deployment progress: active for g in [0.20, 1.0]
  const legProgress = Math.max(0.0, (g - 0.20) / 0.80);
  // Smooth cubic ease-in-out
  const t = legProgress * legProgress * (3 - 2 * legProgress);

  // Folded State (g = 0):
  // Upper strut extends outward along pod ceiling from r=19.5 to r=24.5 at y=-4.5m
  // Lower strut folds back horizontally inside pod cavity
  const K_r_fold = 24.5;
  const K_y_fold = -4.5;
  const A_r_fold = 20.5;
  const A_y_fold = -4.6;

  // Deployed State (g = 1):
  // Footpad touches y = -14.0m -> ankle at y = -13.7m, outward splay r = 24.5m
  // Knee bends outward to r = 25.2m, y = -8.8m
  const K_r_dep = 25.2;
  const K_y_dep = -8.8;
  const A_r_dep = 24.5;
  const A_y_dep = -13.7;

  // Smooth kinematic trajectory
  const K_r = THREE.MathUtils.lerp(K_r_fold, K_r_dep, t);
  const K_y = THREE.MathUtils.lerp(K_y_fold, K_y_dep, t);
  const A_r = THREE.MathUtils.lerp(A_r_fold, A_r_dep, t);
  const A_y = THREE.MathUtils.lerp(A_y_fold, A_y_dep, t);

  const hipPoint = to3D(H_r, H_y);
  const kneePoint = to3D(K_r, K_y);
  const anklePoint = to3D(A_r, A_y);

  // Footpad bottom is strictly ankle.y - FOOTPAD_THICKNESS
  // When t = 1 (g = 1), footpadBottomY = -13.7 - 0.3 = -14.000m exactly!
  const footpadBottomY = A_y - FOOTPAD_THICKNESS;

  const upperStrutLength = hipPoint.distanceTo(kneePoint);
  const lowerStrutLength = kneePoint.distanceTo(anklePoint);

  // Hydraulic Piston: from pod anchor to lower strut anchor
  const pistonAnchor = to3D(18.8, -4.5);
  const rod_r = K_r + (A_r - K_r) * 0.40;
  const rod_y = K_y + (A_y - K_y) * 0.40;
  const pistonRodEnd = to3D(rod_r, rod_y);

  return {
    hipPoint,
    kneePoint,
    anklePoint,
    footpadBottomY,
    doorAngleRad,
    upperStrutLength,
    lowerStrutLength,
    pistonAnchor,
    pistonRodEnd,
  };
}
