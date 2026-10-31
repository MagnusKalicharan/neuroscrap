import * as THREE from "three";

/* =====================================================================
   ScrapRobot — Solarpunk Ruined High-Tech Scrap Robot
   Perched atop the moss arch in the Sylva Living World 3D scene.
   Features:
   • Spawns in seamlessly AFTER the Sylva scene scan loads (with drop-in
     landing & optic boot sequence).
   • High-visibility solarpunk materials (pale verdigris sage metal,
     warm copper rust, brass joints, glowing dual-optic lenses).
   • Dedicated lighting & optic projection so the robot is crisp,
     vibrant, and clearly visible against the dark background.
   • 100% accurate 3D cursor tracking (head pans, tilts, and rolls to
     watch the cursor across the entire screen).
   • Idle breathing, antenna wind sway, blinking, proximity excitement,
     and click hop with synthesized audio chirp.
   ===================================================================== */

export interface ScrapRobotInstance {
  group: THREE.Group;
  update: (
    dt: number,
    time: number,
    mouseWorld: THREE.Vector3,
    mouseLive: boolean,
    isSceneScanning: boolean
  ) => void;
  handleClick: (raycaster: THREE.Raycaster) => boolean;
  dispose: () => void;
}

// ── Synthesized Robotic Audio Chirp (Zero External Files) ─────────────
function playRobotChirp(pitchShift = 1.0) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(740 * pitchShift, now);
    osc1.frequency.exponentialRampToValueAtTime(1480 * pitchShift, now + 0.08);
    osc1.frequency.exponentialRampToValueAtTime(1120 * pitchShift, now + 0.18);

    osc2.frequency.setValueAtTime(370 * pitchShift, now);
    osc2.frequency.exponentialRampToValueAtTime(880 * pitchShift, now + 0.12);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.24);
    osc2.stop(now + 0.24);
  } catch {
    // Autoplay restrictions or headless env
  }
}

// ── High-Visibility Solarpunk Scrap Metal Canvas Texture ───────────────
function createScrapMetalTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base Solarpunk Oxidized Mint/Sage Metal (Bright & readable)
  ctx.fillStyle = "#b4ccbf";
  ctx.fillRect(0, 0, size, size);

  // Surface gradient (lighter top edge for bevel & edge highlight)
  const baseGrad = ctx.createLinearGradient(0, 0, 0, size);
  baseGrad.addColorStop(0, "rgba(240, 252, 246, 0.65)");
  baseGrad.addColorStop(0.35, "rgba(210, 235, 222, 0.25)");
  baseGrad.addColorStop(1, "rgba(120, 155, 138, 0.45)");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Brushed steel noise lines
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * size;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + Math.random() * 0.2})`;
    ctx.fillRect(0, y, size, 1 + Math.random() * 2);
  }

  // Weathered Verdigris Mottle
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 50;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(130, 185, 160, 0.45)");
    grad.addColorStop(0.6, "rgba(95, 145, 125, 0.2)");
    grad.addColorStop(1, "rgba(95, 145, 125, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm Orange Rust & Burnt Sienna Patina
  const rustColors = ["#c45d2c", "#963d18", "#d97843", "#a8481e"];
  for (let i = 0; i < 55; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 15 + Math.random() * 45;
    const h = 10 + Math.random() * 32;
    ctx.fillStyle = rustColors[Math.floor(Math.random() * rustColors.length)];
    ctx.globalAlpha = 0.7 + Math.random() * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Scratched bare steel highlights
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2.0;
  for (let i = 0; i < 35; i++) {
    const x1 = Math.random() * size;
    const y1 = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (Math.random() - 0.5) * 45, y1 + (Math.random() - 0.5) * 25);
    ctx.stroke();
  }

  // Dark panel seam lines
  ctx.strokeStyle = "rgba(45, 65, 55, 0.65)";
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(30, 140);
  ctx.lineTo(size - 30, 140);
  ctx.moveTo(size / 2, 140);
  ctx.lineTo(size / 2, size - 40);
  ctx.stroke();

  // Technical Markings & Stencil
  ctx.font = "bold 26px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillText("NS//04", 45, 90);

  // Orange Hazard Chevron Indicator
  ctx.fillStyle = "#ffaa00";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(size - 130 + i * 20, 45, 12, 18);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

// ── Main Robot Builder ────────────────────────────────────────────────
export function buildScrapRobot(
  host: THREE.Group,
  perchPos: THREE.Vector3,
  perchNormal: THREE.Vector3
): ScrapRobotInstance {
  const root = new THREE.Group();
  root.position.copy(perchPos);

  // Orthonormal basis for orienting robot on the hill
  const forward = new THREE.Vector3(-0.72, 0.18, 0.66).normalize();
  const up = perchNormal.clone().normalize();
  const right = new THREE.Vector3().crossVectors(up, forward).normalize();
  const adjustedFwd = new THREE.Vector3().crossVectors(right, up).normalize();

  const rotMatrix = new THREE.Matrix4().makeBasis(right, up, adjustedFwd);
  root.setRotationFromMatrix(rotMatrix);
  root.scale.setScalar(0.78); // Clear, readable silhouette on screen

  // Initially hidden — will spawn in when Sylva finishes loading
  root.visible = false;

  // ── Materials ──
  const scrapTex = createScrapMetalTexture();

  // High-visibility solarpunk sage-teal plating
  // Keep metalness low (0.12) so diffuse reflections are vivid without an envMap
  const scrapMat = new THREE.MeshStandardMaterial({
    map: scrapTex,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.12,
    emissive: new THREE.Color(0x18261e),
    emissiveIntensity: 0.25,
  });

  // Gunmetal slate mechanical frame
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x44534b,
    roughness: 0.45,
    metalness: 0.15,
  });

  // Warm industrial brass joints & trim
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xe6bd52,
    roughness: 0.32,
    metalness: 0.22,
  });

  // Blazing Optic Lenses
  const cyanEyeMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: new THREE.Color(0x00ffff),
    emissiveIntensity: 4.5,
    roughness: 0.1,
  });

  const amberEyeMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: new THREE.Color(0xff8800),
    emissiveIntensity: 3.8,
    roughness: 0.15,
  });

  const irisMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const antennaTipMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

  // ── Dedicated Robot Illumination (Ensures Robot Pops Off Dark Background) ──
  // Hemisphere light provides warm sky light from above and green moss bounce from below
  const robotHemi = new THREE.HemisphereLight(0xfffaed, 0x456852, 2.4);
  root.add(robotHemi);

  // Key Spotlight directly highlighting robot's front bevels
  const robotKeyLight = new THREE.DirectionalLight(0xfffaed, 3.2);
  robotKeyLight.position.set(-2, 3.5, 3);
  root.add(robotKeyLight);
  root.add(robotKeyLight.target);
  robotKeyLight.target.position.set(0, 0.25, 0);

  // Fill Light from below (reflecting green solarpunk moss bounce)
  const robotFillLight = new THREE.DirectionalLight(0x7fffb0, 1.4);
  robotFillLight.position.set(2, -2, 2);
  root.add(robotFillLight);
  root.add(robotFillLight.target);
  robotFillLight.target.position.set(0, 0.25, 0);

  // Cyan Eye Beam Spot — casts glowing light pool on the ground
  const eyeSpotLight = new THREE.PointLight(0x00ffff, 2.2, 4.0);
  eyeSpotLight.position.set(-0.08, 0.45, 0.6);
  root.add(eyeSpotLight);

  // ── Pelvis / Base Mount ──
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.set(0, 0.26, 0);
  root.add(pelvisGroup);

  const pelvisMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.14, 0.22),
    darkMat
  );
  pelvisGroup.add(pelvisMesh);

  // ── Head / Chassis Assembly (Rotates to track cursor) ──
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.09, 0.02);
  pelvisGroup.add(neckPivot);

  // Main scrap chassis block (Boxy with rounded retro silhouette)
  const headMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.34, 0.38),
    scrapMat
  );
  headMesh.position.set(0, 0.19, 0);
  headMesh.castShadow = true;
  neckPivot.add(headMesh);

  // Top solar plate / scrap roof reinforcement
  const roofPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.05, 0.3),
    brassMat
  );
  roofPlate.position.set(0, 0.38, -0.01);
  neckPivot.add(roofPlate);

  // Recessed Dark Visor Faceplate
  const visorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.2, 0.04),
    darkMat
  );
  visorMesh.position.set(0, 0.19, 0.18);
  neckPivot.add(visorMesh);

  // ── Left Optic (Primary - Glowing Cyan) ──
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(-0.09, 0.195, 0.19);
  neckPivot.add(leftEyeGroup);

  const leftEyeBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.075, 0.035, 16),
    brassMat
  );
  leftEyeBezel.rotation.x = Math.PI / 2;
  leftEyeGroup.add(leftEyeBezel);

  const leftEyeLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.056, 16, 16),
    cyanEyeMat
  );
  leftEyeLens.position.set(0, 0, 0.012);
  leftEyeGroup.add(leftEyeLens);

  const leftEyeIris = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 12, 12),
    irisMat
  );
  leftEyeIris.position.set(0, 0, 0.052);
  leftEyeGroup.add(leftEyeIris);

  // ── Right Optic (Secondary - Glowing Amber) ──
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(0.09, 0.185, 0.19);
  neckPivot.add(rightEyeGroup);

  const rightEyeBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.058, 0.035, 16),
    brassMat
  );
  rightEyeBezel.rotation.x = Math.PI / 2;
  rightEyeGroup.add(rightEyeBezel);

  const rightEyeLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.044, 16, 16),
    amberEyeMat
  );
  rightEyeLens.position.set(0, 0, 0.01);
  rightEyeGroup.add(rightEyeLens);

  // ── Antenna & Sensor ──
  const antennaRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.009, 0.24, 8),
    brassMat
  );
  antennaRod.position.set(0.15, 0.46, -0.06);
  antennaRod.rotation.z = -0.18;
  antennaRod.rotation.x = -0.1;
  neckPivot.add(antennaRod);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 12, 12),
    antennaTipMat
  );
  antennaTip.position.set(0.18, 0.58, -0.08);
  neckPivot.add(antennaTip);

  // ── Articulated Quadruped Legs ──
  interface LegJoints {
    hip: THREE.Group;
    thigh: THREE.Group;
    shin: THREE.Group;
    foot: THREE.Mesh;
    sideX: number;
    sideZ: number;
  }

  const legs: LegJoints[] = [];

  function createLeg(sideX: number, sideZ: number): LegJoints {
    const hip = new THREE.Group();
    hip.position.set(sideX * 0.12, -0.02, sideZ * 0.1);
    pelvisGroup.add(hip);

    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), brassMat);
    hip.add(socket);

    const thigh = new THREE.Group();
    thigh.rotation.z = sideX * 0.58;
    thigh.rotation.x = sideZ * 0.38;
    hip.add(thigh);

    const thighStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.018, 0.24, 8),
      scrapMat
    );
    thighStrut.position.set(0, -0.11, 0);
    thigh.add(thighStrut);

    const knee = new THREE.Group();
    knee.position.set(0, -0.23, 0);
    thigh.add(knee);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), darkMat);
    knee.add(kneeCap);

    const shin = new THREE.Group();
    shin.rotation.z = -sideX * 1.05;
    shin.rotation.x = -sideZ * 0.5;
    knee.add(shin);

    const shinStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.014, 0.26, 8),
      brassMat
    );
    shinStrut.position.set(0, -0.12, 0);
    shin.add(shinStrut);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.045, 0.02, 10),
      darkMat
    );
    foot.position.set(0, -0.25, 0);
    shin.add(foot);

    return { hip, thigh, shin, foot, sideX, sideZ };
  }

  legs.push(createLeg(1, 1));   // Front-Right
  legs.push(createLeg(-1, 1));  // Front-Left
  legs.push(createLeg(1, -1));  // Rear-Right
  legs.push(createLeg(-1, -1)); // Rear-Left

  host.add(root);

  // ── Spawn & Interaction State Machine ──
  type SpawnState = "dormant" | "spawning" | "booting" | "active";
  let spawnState: SpawnState = "dormant";
  let spawnProgress = 0;

  let targetYaw = -0.35;
  let targetPitch = 0.08;
  let targetRoll = 0;
  let currentYaw = -0.35;
  let currentPitch = 0.08;
  let currentRoll = 0;

  let blinkTimer = 2.5;
  let blinkActive = false;
  let hopTimer = 0;
  let excitement = 0;

  const tempVec = new THREE.Vector3();
  const rayTargetSphere = new THREE.Sphere(new THREE.Vector3(), 0.55);

  function update(
    dt: number,
    time: number,
    mouseWorld: THREE.Vector3,
    mouseLive: boolean,
    isSceneScanning: boolean
  ) {
    // ── 1. Spawn Sequence: Waits for Sylva to load ──
    if (spawnState === "dormant") {
      if (!isSceneScanning) {
        // Sylva has finished scanning & loaded! Begin robot spawn sequence!
        spawnState = "spawning";
        root.visible = true;
        spawnProgress = 0;
        playRobotChirp(1.2);
      } else {
        root.visible = false;
        return;
      }
    }

    if (spawnState === "spawning") {
      spawnProgress += dt * 1.8;
      // Drop-in landing animation onto the moss
      const t = Math.min(spawnProgress, 1.0);
      const easeLanding = Math.sin((t * Math.PI) / 2);
      root.scale.setScalar(0.78 * easeLanding);
      pelvisGroup.position.y = 0.26 + (1 - easeLanding) * 0.6;

      // Eyes power on gradually
      cyanEyeMat.emissiveIntensity = 4.5 * t;
      amberEyeMat.emissiveIntensity = 3.8 * t;

      if (t >= 1.0) {
        spawnState = "booting";
        spawnProgress = 0;
      }
      return;
    }

    if (spawnState === "booting") {
      spawnProgress += dt * 3.0;
      // Head shake on wake-up
      neckPivot.rotation.y = Math.sin(spawnProgress * Math.PI * 2) * 0.25;
      if (spawnProgress >= 1.0) {
        spawnState = "active";
        neckPivot.rotation.y = 0;
      }
      return;
    }

    // ── 2. Active Cursor Tracking (Using Root Inverted Basis) ──
    if (mouseLive && mouseWorld.x < 9000) {
      // World-space vector from head to cursor
      const headWorld = new THREE.Vector3();
      neckPivot.getWorldPosition(headWorld);
      const toMouseWorld = mouseWorld.clone().sub(headWorld);

      // Transform direction vector into root's local orientation space
      const rootInv = root.matrixWorld.clone().invert();
      const toMouseLocal = toMouseWorld.clone().transformDirection(rootInv);

      // In root's local frame: +Z is forward, +X is right, +Y is up
      const horizDist = Math.hypot(toMouseLocal.x, toMouseLocal.z);
      if (horizDist > 0.01) {
        targetYaw = Math.atan2(toMouseLocal.x, toMouseLocal.z);
        targetPitch = Math.atan2(toMouseLocal.y, horizDist);

        // Clamp head rotation to natural ergonomic ranges
        targetYaw = THREE.MathUtils.clamp(targetYaw, -1.35, 1.35);
        targetPitch = THREE.MathUtils.clamp(targetPitch, -0.65, 0.75);

        // Curious head tilt when tracking across
        targetRoll = -targetYaw * 0.18;
      }

      // Proximity Excitement (closer mouse = perkier posture & brighter beacon)
      const distToMouse = toMouseWorld.length();
      const isNear = distToMouse < 600;
      excitement = THREE.MathUtils.lerp(excitement, isNear ? 1 : 0, dt * 5);
    } else {
      // Idle look forward-left towards user's UI
      targetYaw = -0.38 + Math.sin(time * 0.6) * 0.12;
      targetPitch = 0.06 + Math.cos(time * 0.8) * 0.06;
      targetRoll = 0;
      excitement = THREE.MathUtils.lerp(excitement, 0, dt * 3);
    }

    // Smooth head damping
    const damp = 1 - Math.exp(-dt * 10);
    currentYaw += (targetYaw - currentYaw) * damp;
    currentPitch += (targetPitch - currentPitch) * damp;
    currentRoll += (targetRoll - currentRoll) * damp;

    // Apply head rotation
    neckPivot.rotation.y = currentYaw;
    neckPivot.rotation.x = -currentPitch;
    neckPivot.rotation.z = currentRoll;

    // ── 3. Idle Breathing & Motion ──
    const breath = Math.sin(time * 2.4) * 0.014;
    const perk = hopTimer > 0 ? Math.sin(hopTimer * Math.PI) * 0.12 : 0;
    pelvisGroup.position.y = 0.26 + breath + perk;

    // Antenna sway
    antennaRod.rotation.z = -0.18 + Math.sin(time * 3.5) * 0.06 + excitement * 0.1;

    // ── 4. Optic Eye Blinking & Pulsing ──
    blinkTimer -= dt;
    if (blinkTimer <= 0) {
      blinkActive = true;
      if (blinkTimer <= -0.11) {
        blinkActive = false;
        blinkTimer = 3.0 + Math.random() * 4.0;
      }
    }

    const eyeScaleY = blinkActive ? 0.08 : 1.0;
    leftEyeGroup.scale.y = eyeScaleY;
    rightEyeGroup.scale.y = eyeScaleY;

    // Dynamic Eye Illumination
    const pulse = 1.0 + Math.sin(time * 3.0) * 0.25 + excitement * 0.8;
    cyanEyeMat.emissiveIntensity = 4.5 * pulse;
    amberEyeMat.emissiveIntensity = 3.8 * pulse;
    eyeSpotLight.intensity = (2.2 + excitement * 1.5) * (blinkActive ? 0.2 : 1.0);

    // ── 5. Click Hop Decay ──
    if (hopTimer > 0) {
      hopTimer -= dt * 3.2;
      if (hopTimer < 0) hopTimer = 0;
    }
  }

  // ── Click Detection on Robot ──
  function handleClick(raycaster: THREE.Raycaster): boolean {
    if (spawnState !== "active") return false;

    // Try mesh intersection first
    const hits = raycaster.intersectObjects(root.children, true);
    if (hits.length > 0) {
      hopTimer = 1.0; // Trigger cheerful jump
      cyanEyeMat.emissiveIntensity = 7.0;
      playRobotChirp(1.0); // Chirp feedback
      return true;
    }

    // Fallback: world-space bounding sphere
    root.getWorldPosition(rayTargetSphere.center);
    const worldScale = root.getWorldScale(tempVec).x || 1.0;
    rayTargetSphere.center.y += 0.25 * worldScale;
    rayTargetSphere.radius = 0.65 * worldScale;

    if (raycaster.ray.intersectsSphere(rayTargetSphere)) {
      hopTimer = 1.0;
      cyanEyeMat.emissiveIntensity = 7.0;
      playRobotChirp(1.0);
      return true;
    }
    return false;
  }

  function dispose() {
    scrapTex.dispose();
    scrapMat.dispose();
    darkMat.dispose();
    brassMat.dispose();
    cyanEyeMat.dispose();
    amberEyeMat.dispose();
    irisMat.dispose();
    antennaTipMat.dispose();
    host.remove(root);
  }

  return {
    group: root,
    update,
    handleClick,
    dispose,
  };
}

export default buildScrapRobot;
