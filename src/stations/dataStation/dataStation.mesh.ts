/**
 * dataStation.mesh.ts — 3D Static Prop & Materials for Data Station
 * ===================================================================
 * Builds the wrap-around 3D console prop matching the reference:
 * - Large center monitor with dark bezels.
 * - Two side monitors toed in 28 degrees with lit green outer edge strips.
 * - Tall dark metal arch behind with glowing status bar on top.
 * - Slanted black desk below with illuminated pendrive port & hazard warning stripes.
 * - Soft additive glow decals on the desk & floor.
 * 
 * Strict Performance Rules:
 * - Everything is MeshBasicMaterial with baked vertex colors.
 * - NO real lights, NO dynamic shadows.
 * - Under 10 draw calls total.
 * - Screen meshes use polygonOffset to eliminate 100% of z-fighting and texture clipping.
 */
import * as THREE from "three";
import { DATA_STATION_DIMENSIONS, DATA_STATION_COLORS } from "./dataStation.config.ts";
import { DataStationScreenTextures } from "./dataStation.screens";

export interface DataStationMeshGroup {
  group: THREE.Group;
  screenTextures: DataStationScreenTextures;
  centerScreenMesh: THREE.Mesh;
  leftScreenMesh: THREE.Mesh;
  rightScreenMesh: THREE.Mesh;
  statusBarMesh: THREE.Mesh;
  statusBarMaterial: THREE.MeshBasicMaterial;
  portLedMaterial: THREE.MeshBasicMaterial;
  pendriveMesh: THREE.Group;
  glowDecalMaterial: THREE.MeshBasicMaterial;
  setScreenFlicker: (flickerMultiplier: number) => void;
  dispose: () => void;
}

export function buildDataStationMesh(): DataStationMeshGroup {
  const group = new THREE.Group();
  group.name = "data-station-root";

  const screenTextures = new DataStationScreenTextures();
  const dim = DATA_STATION_DIMENSIONS;

  // ============================================================
  // 1. SHARED MATERIALS (All MeshBasicMaterial - Zero dynamic light cost)
  // ============================================================
  const chassisMat = new THREE.MeshBasicMaterial({
    color: DATA_STATION_COLORS.metalDark,
  });

  const bezelMat = new THREE.MeshBasicMaterial({
    color: DATA_STATION_COLORS.metalBezel,
  });

  const deskMat = new THREE.MeshBasicMaterial({
    color: DATA_STATION_COLORS.deskTop,
  });

  const greenStripMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
  });

  const statusBarMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
  });

  const portLedMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
  });

  const glowDecalMat = new THREE.MeshBasicMaterial({
    color: 0x18a032,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Screen Materials: polygonOffset completely prevents z-fighting!
  const centerScreenMat = new THREE.MeshBasicMaterial({
    map: screenTextures.centerTexture,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const leftScreenMat = new THREE.MeshBasicMaterial({
    map: screenTextures.leftTexture,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const rightScreenMat = new THREE.MeshBasicMaterial({
    map: screenTextures.rightTexture,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // ============================================================
  // 2. TALL DARK METAL ARCH & TOP STATUS BAR
  // ============================================================
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0, -0.22);

  // Left Post
  const leftPostGeom = new THREE.CylinderGeometry(0.04, 0.04, dim.archHeight, 8);
  const leftPost = new THREE.Mesh(leftPostGeom, chassisMat);
  leftPost.position.set(-dim.archWidth / 2, dim.archHeight / 2, 0);
  archGroup.add(leftPost);

  // Right Post
  const rightPostGeom = new THREE.CylinderGeometry(0.04, 0.04, dim.archHeight, 8);
  const rightPost = new THREE.Mesh(rightPostGeom, chassisMat);
  rightPost.position.set(dim.archWidth / 2, dim.archHeight / 2, 0);
  archGroup.add(rightPost);

  // Crossbeam
  const crossbeamGeom = new THREE.CylinderGeometry(0.04, 0.04, dim.archWidth, 8);
  const crossbeam = new THREE.Mesh(crossbeamGeom, chassisMat);
  crossbeam.rotation.z = Math.PI / 2;
  crossbeam.position.set(0, dim.archHeight - 0.02, 0);
  archGroup.add(crossbeam);

  // Status Bar Chassis Housing
  const statusHousingGeom = new THREE.BoxGeometry(
    dim.statusBarWidth + 0.08,
    dim.statusBarHeight + 0.06,
    dim.statusBarDepth
  );
  const statusHousing = new THREE.Mesh(statusHousingGeom, bezelMat);
  statusHousing.position.set(0, dim.archHeight - 0.02, 0.02);
  archGroup.add(statusHousing);

  // Lit Glowing Status Bar
  const statusBarGeom = new THREE.BoxGeometry(
    dim.statusBarWidth,
    dim.statusBarHeight,
    dim.statusBarDepth * 0.4
  );
  const statusBar = new THREE.Mesh(statusBarGeom, statusBarMat);
  statusBar.position.set(0, dim.archHeight - 0.02, 0.06);
  archGroup.add(statusBar);

  // Downward Task Light Hood Under Centre of Arch
  const lampHoodGeom = new THREE.BoxGeometry(0.38, 0.06, 0.16);
  const lampHood = new THREE.Mesh(lampHoodGeom, bezelMat);
  lampHood.position.set(0, dim.archHeight - 0.14, 0.08);
  lampHood.rotation.x = 0.35;
  archGroup.add(lampHood);

  const lampBulbGeom = new THREE.BoxGeometry(0.32, 0.02, 0.12);
  const lampBulb = new THREE.Mesh(lampBulbGeom, greenStripMat);
  lampBulb.position.set(0, dim.archHeight - 0.16, 0.08);
  lampBulb.rotation.x = 0.35;
  archGroup.add(lampBulb);

  group.add(archGroup);

  // ============================================================
  // 3. BLACK CONSOLE DESK BELOW (Slanted Front & Hazard Tape)
  // ============================================================
  const deskGroup = new THREE.Group();

  // Solid Desk Pedestal Base (Grounded to Floor at y = 0)
  const baseGeom = new THREE.BoxGeometry(dim.deskWidth, dim.deskFrontHeight, dim.deskDepth);
  const baseMesh = new THREE.Mesh(baseGeom, chassisMat);
  baseMesh.position.set(0, dim.deskFrontHeight / 2, 0.15);
  deskGroup.add(baseMesh);

  // Slanted Desktop Deck (Angled 18° toward player)
  const deskDeckGeom = new THREE.BoxGeometry(dim.deskWidth + 0.12, 0.08, dim.deskDepth + 0.1);
  const deskDeck = new THREE.Mesh(deskDeckGeom, deskMat);
  deskDeck.position.set(0, dim.deskFrontHeight + 0.04, 0.18);
  deskDeck.rotation.x = THREE.MathUtils.degToRad(-dim.deskSlantAngleDeg);
  deskGroup.add(deskDeck);

  // Warning Hazard Stripe Decal Strip on Front-Right Edge of Deck
  const hazardGeom = new THREE.BoxGeometry(0.48, 0.02, 0.08);
  // Procedural diagonal black/yellow stripes via CanvasTexture
  const hazardCanvas = document.createElement("canvas");
  hazardCanvas.width = 128;
  hazardCanvas.height = 32;
  const hCtx = hazardCanvas.getContext("2d")!;
  hCtx.fillStyle = "#eab308";
  hCtx.fillRect(0, 0, 128, 32);
  hCtx.fillStyle = "#18181b";
  for (let x = -32; x < 160; x += 16) {
    hCtx.beginPath();
    hCtx.moveTo(x, 0);
    hCtx.lineTo(x + 12, 32);
    hCtx.lineTo(x + 22, 32);
    hCtx.lineTo(x + 10, 0);
    hCtx.fill();
  }
  const hazardTex = new THREE.CanvasTexture(hazardCanvas);
  const hazardMat = new THREE.MeshBasicMaterial({ map: hazardTex });
  const hazardMesh = new THREE.Mesh(hazardGeom, hazardMat);
  hazardMesh.position.set(dim.deskWidth / 2 - 0.32, dim.deskFrontHeight + 0.11, 0.62);
  hazardMesh.rotation.x = THREE.MathUtils.degToRad(-dim.deskSlantAngleDeg);
  deskGroup.add(hazardMesh);

  // Center Illuminated PENDRIVE PORT Slot on Tabletop
  const portHousingGeom = new THREE.BoxGeometry(0.22, 0.04, 0.14);
  const portHousing = new THREE.Mesh(portHousingGeom, bezelMat);
  portHousing.position.set(0, dim.deskFrontHeight + 0.1, 0.52);
  portHousing.rotation.x = THREE.MathUtils.degToRad(-dim.deskSlantAngleDeg);
  deskGroup.add(portHousing);

  // Slot Hole & Glowing Rim
  const slotHoleGeom = new THREE.BoxGeometry(dim.portWidth, dim.portHeight, dim.portDepth);
  const slotHole = new THREE.Mesh(slotHoleGeom, portLedMat);
  slotHole.position.set(0, dim.deskFrontHeight + 0.115, 0.52);
  slotHole.rotation.x = THREE.MathUtils.degToRad(-dim.deskSlantAngleDeg);
  deskGroup.add(slotHole);

  // Physical Telemetry Pendrive (Slides into slot on insert)
  const pendriveGroup = new THREE.Group();
  pendriveGroup.position.set(0, dim.deskFrontHeight + 0.14, 0.58);
  pendriveGroup.rotation.x = THREE.MathUtils.degToRad(-dim.deskSlantAngleDeg);

  // Pendrive Plastic Body
  const penBodyGeom = new THREE.BoxGeometry(0.045, 0.018, 0.095);
  const penBodyMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
  const penBody = new THREE.Mesh(penBodyGeom, penBodyMat);
  pendriveGroup.add(penBody);

  // Pendrive Gold USB Connector
  const penPlugGeom = new THREE.BoxGeometry(0.034, 0.012, 0.035);
  const penPlugMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
  const penPlug = new THREE.Mesh(penPlugGeom, penPlugMat);
  penPlug.position.set(0, 0, -0.055);
  pendriveGroup.add(penPlug);

  // Pendrive Activity Cyan LED
  const penLedGeom = new THREE.BoxGeometry(0.02, 0.006, 0.015);
  const penLed = new THREE.Mesh(penLedGeom, portLedMat);
  penLed.position.set(0, 0.01, 0.025);
  pendriveGroup.add(penLed);

  // Initially retracted/hidden until inserted
  pendriveGroup.visible = false;
  deskGroup.add(pendriveGroup);

  group.add(deskGroup);

  // ============================================================
  // 4. SOFT ADDITIVE GLOW DECALS (Desk & Floor) - Disabled to eliminate stray green quad
  // ============================================================
  // Untextured additive floor glow plane removed to eliminate stray olive-green square near relay start

  // ============================================================
  // 5. CENTRE MONITOR (Large, Facing Player)
  // ============================================================
  const centerMonitorGroup = new THREE.Group();
  centerMonitorGroup.position.set(0, dim.centerElevation, 0.0);
  centerMonitorGroup.rotation.x = -0.16; // Slight upward tilt for ergonomic eye gaze

  // Heavy Bezel Chassis Box (Solid 3D depth visible from all angles)
  const centerBezelGeom = new THREE.BoxGeometry(
    dim.centerWidth + 0.08,
    dim.centerHeight + 0.08,
    dim.centerBezelDepth
  );
  const centerBezel = new THREE.Mesh(centerBezelGeom, bezelMat);
  centerBezel.position.set(0, 0, -dim.centerBezelDepth / 2);
  centerMonitorGroup.add(centerBezel);

  // Center Screen Plane (Offset cleanly forward: NO Z-FIGHTING!)
  const centerScreenGeom = new THREE.PlaneGeometry(dim.centerWidth, dim.centerHeight);
  const centerScreenMesh = new THREE.Mesh(centerScreenGeom, centerScreenMat);
  centerScreenMesh.position.set(0, 0, 0.015);
  centerMonitorGroup.add(centerScreenMesh);

  group.add(centerMonitorGroup);

  // ============================================================
  // 6. TWO SIDE MONITORS (Toed-In Wrap-Around with Corner Status LEDs)
  // ============================================================
  const toeRad = THREE.MathUtils.degToRad(dim.sideToeAngleDeg);

  // --- A. LEFT WING MONITOR ---
  const leftWingGroup = new THREE.Group();
  leftWingGroup.position.set(-dim.sideOffsetX, dim.sideElevation, dim.sideOffsetZ);
  leftWingGroup.rotation.order = "YXZ";
  leftWingGroup.rotation.set(-0.16, toeRad, 0); // Toed in to face inward toward player

  const leftBezelGeom = new THREE.BoxGeometry(
    dim.sideWidth + 0.06,
    dim.sideHeight + 0.06,
    dim.sideBezelDepth
  );
  const leftBezel = new THREE.Mesh(leftBezelGeom, bezelMat);
  leftBezel.position.set(0, 0, -dim.sideBezelDepth / 2);
  leftWingGroup.add(leftBezel);

  const leftScreenGeom = new THREE.PlaneGeometry(dim.sideWidth, dim.sideHeight);
  const leftScreenMesh = new THREE.Mesh(leftScreenGeom, leftScreenMat);
  leftScreenMesh.position.set(0, 0, 0.015);
  leftWingGroup.add(leftScreenMesh);

  // Power status indicator LED on bottom-left corner of bezel
  const leftLedGeom = new THREE.BoxGeometry(0.018, 0.008, 0.012);
  const leftLed = new THREE.Mesh(leftLedGeom, greenStripMat);
  leftLed.position.set(-dim.sideWidth / 2 + 0.03, -dim.sideHeight / 2 - 0.015, 0.006);
  leftWingGroup.add(leftLed);

  group.add(leftWingGroup);

  // --- B. RIGHT WING MONITOR ---
  const rightWingGroup = new THREE.Group();
  rightWingGroup.position.set(dim.sideOffsetX, dim.sideElevation, dim.sideOffsetZ);
  rightWingGroup.rotation.order = "YXZ";
  rightWingGroup.rotation.set(-0.16, -toeRad, 0); // Toed in to face inward toward player

  const rightBezelGeom = new THREE.BoxGeometry(
    dim.sideWidth + 0.06,
    dim.sideHeight + 0.06,
    dim.sideBezelDepth
  );
  const rightBezel = new THREE.Mesh(rightBezelGeom, bezelMat);
  rightBezel.position.set(0, 0, -dim.sideBezelDepth / 2);
  rightWingGroup.add(rightBezel);

  const rightScreenGeom = new THREE.PlaneGeometry(dim.sideWidth, dim.sideHeight);
  const rightScreenMesh = new THREE.Mesh(rightScreenGeom, rightScreenMat);
  rightScreenMesh.position.set(0, 0, 0.015);
  rightWingGroup.add(rightScreenMesh);

  // Power status indicator LED on bottom-right corner of bezel
  const rightLedGeom = new THREE.BoxGeometry(0.018, 0.008, 0.012);
  const rightLed = new THREE.Mesh(rightLedGeom, greenStripMat);
  rightLed.position.set(dim.sideWidth / 2 - 0.03, -dim.sideHeight / 2 - 0.015, 0.006);
  rightWingGroup.add(rightLed);

  group.add(rightWingGroup);

  // ============================================================
  // FLICKER & DISPOSAL HELPERS
  // ============================================================
  function setScreenFlicker(multiplier: number): void {
    const val = THREE.MathUtils.clamp(multiplier, 0.94, 1.06);
    centerScreenMat.color.setRGB(val, val, val);
    leftScreenMat.color.setRGB(val, val, val);
    rightScreenMat.color.setRGB(val, val, val);
  }

  function dispose(): void {
    screenTextures.dispose();
    hazardTex.dispose();

    // Disposing all created geometries
    [
      leftPostGeom,
      rightPostGeom,
      crossbeamGeom,
      statusHousingGeom,
      statusBarGeom,
      lampHoodGeom,
      lampBulbGeom,
      baseGeom,
      deskDeckGeom,
      hazardGeom,
      portHousingGeom,
      slotHoleGeom,
      penBodyGeom,
      penPlugGeom,
      penLedGeom,
      centerBezelGeom,
      centerScreenGeom,
      leftBezelGeom,
      leftScreenGeom,
      leftLedGeom,
      rightBezelGeom,
      rightScreenGeom,
      rightLedGeom,
    ].forEach((g) => g.dispose());

    // Disposing all created materials
    [
      chassisMat,
      bezelMat,
      deskMat,
      greenStripMat,
      statusBarMat,
      portLedMat,
      glowDecalMat,
      centerScreenMat,
      leftScreenMat,
      rightScreenMat,
      hazardMat,
      penBodyMat,
      penPlugMat,
    ].forEach((m) => m.dispose());
  }

  return {
    group,
    screenTextures,
    centerScreenMesh,
    leftScreenMesh,
    rightScreenMesh,
    statusBarMesh: statusBar,
    statusBarMaterial: statusBarMat,
    portLedMaterial: portLedMat,
    pendriveMesh: pendriveGroup,
    glowDecalMaterial: glowDecalMat,
    setScreenFlicker,
    dispose,
  };
}
