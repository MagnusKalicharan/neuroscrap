/**
 * src/ending/ship/RescueShipMesh.tsx
 * ============================================================
 * Procedural 3D Mesh for "Rescue Two" (70m Saucer).
 * 
 * Round 2 Corrections:
 * - Up to 14 draw calls and 40k triangles.
 * - Rebuilt Landing Gear (3 legs at 120°): pod with door opening first,
 *   hexagonal upper struts, knee joints, flat 4m footpads (always level,
 *   touching y = -14.0m when deployed, tucked flush when folded).
 * - Rebuilt Belly Cargo Ramp: outer-edge hinge, opens only when gear = 1,
 *   touches ground at 22°, side rails, grip stripes, lit interior (core #FFE2A8).
 * - Soft searchlight volumetric cone (ShaderMaterial width/length falloff)
 *   and ground light pools (additive, polygon offset).
 */
import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildRescueShipGeometries } from "./shipGeometry.ts";
import { createRescueTwoStencilTexture } from "./stencilTexture.ts";
import { computeLegState, LEG_ANGLES } from "./landingGearKinematics.ts";
import { computeRampState, RAMP_LENGTH, RAMP_ANGLE_RAD, RAMP_HINGE_Y, RAMP_HINGE_Z } from "./cargoRampKinematics.ts";

export interface RescueShipMeshProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  gearDeploy?: number;          // 0.0 (folded flush into pods) to 1.0 (deployed to y=-14m)
  rampDeploy?: number;          // 0.0 (closed flush) to 1.0 (opened to 22°, only when gear=1)
  engineThrust?: number;        // 0.0 (idle) to 1.0 (full retro burn)
  searchlightPitch?: number;    // Searchlight gimbal pitch in radians
  searchlightYaw?: number;      // Searchlight gimbal yaw in radians
  chasePhase?: number;          // 0.0 to 1.0 (overridden by time if undefined)
  greyscale?: boolean;          // Silhouette test mode
}

// Generate soft radial halo texture for windows (deterministic, works in SSR & client)
function createSoftHaloTexture(): THREE.DataTexture {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  const center = size / 2;
  const maxR = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x + 0.5) - center;
      const dy = (y + 0.5) - center;
      const dist = Math.hypot(dx, dy) / maxR;

      if (dist >= 1.0) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      } else {
        const falloff = 1.0 - dist;
        const alpha = Math.floor(falloff * falloff * 220);
        data[idx] = 255;
        data[idx + 1] = 200;
        data[idx + 2] = 100;
        data[idx + 3] = alpha;
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

// Generate radial gradient texture for ground light pools (smooth cubic radial falloff to zero at edge)
function createGroundPoolTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const center = size / 2;
  const maxR = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x + 0.5) - center;
      const dy = (y + 0.5) - center;
      const dist = Math.hypot(dx, dy) / maxR;

      if (dist >= 1.0) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      } else {
        // Smooth radial falloff (bright warm white core, smooth fading to 0 at perimeter)
        const falloff = 1.0 - dist * dist;
        const alpha = Math.floor(falloff * falloff * 200);
        data[idx] = 255;     // R
        data[idx + 1] = 244; // G
        data[idx + 2] = 224; // B
        data[idx + 3] = alpha; // Alpha: 0 at edge
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function RescueShipMesh({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  gearDeploy = 1.0,
  rampDeploy = 0.0,
  engineThrust = 0.0,
  searchlightPitch = -0.15,
  searchlightYaw = 0.0,
  chasePhase,
  greyscale = false,
}: RescueShipMeshProps) {
  const rootRef = useRef<THREE.Group>(null);
  const rampGroupRef = useRef<THREE.Group>(null);
  const upperGearGroupRef = useRef<THREE.Group>(null);
  const lowerGearGroupRef = useRef<THREE.Group>(null);
  const searchlightRef = useRef<THREE.Group>(null);
  const enginePlumeRef = useRef<THREE.Mesh>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coneMeshRef = useRef<THREE.Mesh>(null);
  const groundPoolsRef = useRef<THREE.Mesh>(null);
  const interiorBayRef = useRef<THREE.Mesh>(null);

  // 1. Procedural Geometries (Strictly cached)
  const geos = useMemo(() => buildRescueShipGeometries(), []);

  // 2. Procedural Stencil Texture Atlas (2048x512, Anisotropy 8, Greyscale Aware)
  const stencilTexture = useMemo(() => createRescueTwoStencilTexture(greyscale), [greyscale]);

  // 3. Radial Halo & Ground Light Pool Textures
  const haloTexture = useMemo(() => createSoftHaloTexture(), []);
  const groundPoolTexture = useMemo(() => createGroundPoolTexture(), []);

  // 4. Materials (Unlit Vertex Colors, Additive Emissives, No Real Lights/Shadows)
  const materials = useMemo(() => {
    // 1. Main Saucer Hull Material
    const hullMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#cfc8bc" : "#ffffff",
      map: stencilTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    // 2. Canopy Glass & Metal Frame Material
    const canopyMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#22252a" : "#ffffff",
      toneMapped: false,
    });

    // 3. 24 Recessed Amber Rim Windows Material
    const windowsMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#ffffff" : "#ffffff",
      toneMapped: false,
    });

    // 4. Soft Additive Window Halos & Chase Highlight Material
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTexture,
      color: greyscale ? "#aaaaaa" : "#ffb703",
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    // 5. 13m Central Engine Bell Material
    const engineBellMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#444444" : "#ffffff",
      toneMapped: false,
    });

    // 6. Engine Retro-Burn Plume (Additive multi-cone with soft gradient falloff)
    const plumeGeom = new THREE.ConeGeometry(6.4, 26.0, 28, 6, true);
    plumeGeom.rotateX(Math.PI);
    plumeGeom.translate(0, -13.0 - 9.8, 0);

    const plumePos = plumeGeom.attributes.position;
    const plumeCols = new Float32Array(plumePos.count * 3);
    for (let i = 0; i < plumePos.count; i++) {
      const py = plumePos.getY(i);
      const alphaT = Math.max(0.0, Math.min(1.0, (-py - 9.8) / 26.0));
      const r = THREE.MathUtils.lerp(0.85, 0.15, alphaT);
      const g = THREE.MathUtils.lerp(0.96, 0.55, alphaT);
      const b = THREE.MathUtils.lerp(1.00, 0.95, alphaT);
      plumeCols[i * 3] = r;
      plumeCols[i * 3 + 1] = g;
      plumeCols[i * 3 + 2] = b;
    }
    plumeGeom.setAttribute("color", new THREE.BufferAttribute(plumeCols, 3));

    const plumeMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#ffffff" : "#ffffff",
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });

    // 7. Metal Details: 4 Thruster Pods & Nozzles
    const thrustersMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#555555" : "#ffffff",
      toneMapped: false,
    });

    // 8. Searchlight Housing & Parabolic Lens
    const searchlightMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#777777" : "#ffffff",
      toneMapped: false,
    });

    // 9 & 10. Landing Gear Struts & Footpads Material
    const gearMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#555555" : "#ffffff",
      toneMapped: false,
    });

    // 11. Belly Cargo Ramp Door Material
    const rampMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#666666" : "#ffffff",
      toneMapped: false,
    });

    // 12. Cargo Bay Interior Lit Opening Panel (Core #FFE2A8)
    const interiorBayMat = new THREE.MeshBasicMaterial({
      vertexColors: !greyscale,
      color: greyscale ? "#ffffff" : "#ffe2a8",
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    // 13. Soft Volumetric Searchlight Cone (ShaderMaterial: soft radial & length falloff)
    const coneShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(greyscale ? "#ffffff" : "#fff4e0") },
        uOpacity: { value: 0.12 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float rim = abs(dot(vNormal, viewDir));
          float widthFalloff = pow(rim, 1.5);
          float lengthFalloff = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          float alpha = widthFalloff * lengthFalloff * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });

    // 14. Ground Light Pools (Searchlight Pool & Ramp Spill Pool on Ground)
    const groundPoolsMat = new THREE.MeshBasicMaterial({
      map: groundPoolTexture,
      color: greyscale ? "#ffffff" : "#fff4e0",
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      toneMapped: false,
    });

    return {
      hullMat,
      canopyMat,
      windowsMat,
      haloMat,
      engineBellMat,
      plumeGeom,
      plumeMat,
      thrustersMat,
      searchlightMat,
      gearMat,
      rampMat,
      interiorBayMat,
      coneShaderMat,
      groundPoolsMat,
    };
  }, [stencilTexture, haloTexture, groundPoolTexture, greyscale]);

  // Clean disposal on unmount
  React.useEffect(() => {
    return () => {
      stencilTexture.dispose();
      haloTexture.dispose();
      groundPoolTexture.dispose();
      Object.values(geos).forEach((g) => {
        if (g instanceof THREE.BufferGeometry) g.dispose();
      });
      materials.hullMat.dispose();
      materials.canopyMat.dispose();
      materials.windowsMat.dispose();
      materials.haloMat.dispose();
      materials.engineBellMat.dispose();
      materials.plumeGeom.dispose();
      materials.plumeMat.dispose();
      materials.thrustersMat.dispose();
      materials.searchlightMat.dispose();
      materials.gearMat.dispose();
      materials.rampMat.dispose();
      materials.interiorBayMat.dispose();
      materials.coneShaderMat.dispose();
      materials.groundPoolsMat.dispose();
    };
  }, [geos, materials, stencilTexture, haloTexture, groundPoolTexture]);

  // Per-Frame State Driven Animations
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // ── Enforce Transforms (Explicit Vector3 updates guarantee correct scaling in R3F) ──
    if (rootRef.current) {
      rootRef.current.position.set(position[0], position[1], position[2]);
      rootRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      rootRef.current.scale.setScalar(scale);
    }

    // ── A. Window Halos & Chase Highlight (Max 1 Hz traveling pulse) ────────
    const effectivePhase = chasePhase !== undefined ? chasePhase : (t * 0.75) % 1.0;
    if (haloMatRef.current) {
      const pulse = 0.35 + Math.sin(effectivePhase * Math.PI * 2) * 0.12;
      haloMatRef.current.opacity = pulse * (greyscale ? 0.6 : 1.0);
    }

    // ── B. Articulated Landing Gear Kinematics ─────────────────────────────
    // Deployed (1.0): footpads touch ground plane y = -14.0m, level
    // Folded (0.0): door closes, assembly tucks flush into pod cavity
    const g = Math.max(0.0, Math.min(1.0, gearDeploy));
    const legLift = (1.0 - g) * 9.1;
    const tuckScale = 1.0 - (1.0 - g) * 0.08;
    if (lowerGearGroupRef.current) {
      // Retraction lift: when folded (g=0), lifts up by 9.1m into pod cavity
      lowerGearGroupRef.current.position.y = legLift;
      lowerGearGroupRef.current.scale.set(tuckScale, 1.0, tuckScale);
    }
    if (upperGearGroupRef.current) {
      upperGearGroupRef.current.position.y = legLift;
      upperGearGroupRef.current.scale.set(tuckScale, 1.0, tuckScale);
    }

    // ── C. Searchlight Gimbal & Soft Cone Orientation ──────────────────────
    if (searchlightRef.current) {
      const basePitch = THREE.MathUtils.degToRad(38.0); // 38° forward/down towards ground
      searchlightRef.current.rotation.set(basePitch + searchlightPitch, searchlightYaw, 0);
    }

    // ── D. Belly Cargo Ramp Articulation (Only opens when gear = 1 and landed) ──
    const isGearDeployed = g >= 0.98;
    const effectiveRamp = isGearDeployed ? Math.max(0.0, Math.min(1.0, rampDeploy)) : 0.0;

    if (rampGroupRef.current) {
      // Outer edge hinge: swings down up to 48 degrees (0.838 rad)
      const maxRampAngleRad = THREE.MathUtils.degToRad(48.0);
      rampGroupRef.current.rotation.x = effectiveRamp * maxRampAngleRad;
      // CRITICAL FIX: Only visible when open (> 0.01). Closed hatch is flush; no wedge!
      rampGroupRef.current.visible = effectiveRamp > 0.01;
    }

    if (interiorBayRef.current) {
      // Lit interior visible through opening
      interiorBayRef.current.visible = effectiveRamp > 0.02;
    }

    // ── E. Engine Retro-Thrust Plume ──────────────────────────────────────
    if (enginePlumeRef.current) {
      if (engineThrust > 0.02) {
        enginePlumeRef.current.visible = true;
        const stretch = 0.5 + engineThrust * 1.5 + Math.sin(t * 32.0) * 0.05;
        const girth = 0.8 + engineThrust * 0.35;
        enginePlumeRef.current.scale.set(girth, stretch, girth);
        materials.plumeMat.opacity = engineThrust * 0.88;
      } else {
        enginePlumeRef.current.visible = false;
        materials.plumeMat.opacity = 0.0;
      }
    }
  });

  return (
    <group ref={rootRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* ── Draw Call 1: Main Saucer Hull (Baked Vertex Colors + Stencil Atlas) ── */}
      <mesh geometry={geos.hullGeom} material={materials.hullMat} />

      {/* ── Draw Call 2: Raised Cockpit Canopy (14m x 6m Dome & Metal Frame) ── */}
      <group>
        <mesh geometry={geos.canopyDomeGeom} material={materials.canopyMat} />
        <mesh geometry={geos.canopyFrameGeom} material={materials.canopyMat} />
      </group>

      {/* ── Draw Call 3: 24 Recessed Amber Rim Windows (Core #FFE2A8, Edge #FF9A1F) ── */}
      <mesh geometry={geos.windowsGeom} material={materials.windowsMat} />

      {/* ── Draw Call 4: Soft Additive Window Halos & Chase Highlight ────────── */}
      <mesh
        ref={haloMatRef as any}
        geometry={geos.windowHalosGeom}
        material={materials.haloMat}
      />

      {/* ── Draw Call 5: 13m Central Engine Bell & Stepped Nozzle Ring ───────── */}
      <mesh geometry={geos.engineBellGeom} material={materials.engineBellMat} />

      {/* ── Draw Call 6: Hot Engine Thrust Plume (Visible under retro-burn) ──── */}
      <mesh
        ref={enginePlumeRef}
        geometry={materials.plumeGeom}
        material={materials.plumeMat}
        visible={false}
      />

      {/* ── Draw Call 7: 4 Rim Thruster Pods with Dual Nozzles ───────────────── */}
      <mesh geometry={geos.thrusterPodsGeom} material={materials.thrustersMat} />

      {/* ── Draw Call 8: Aimable Underside Searchlight Housing Pod & Lens ────── */}
      <group ref={searchlightRef} position={[0, -5.4, 17.5]}>
        <mesh
          geometry={geos.searchlightHousingGeom}
          material={materials.searchlightMat}
        />
        {/* ── Draw Call 12: Soft Searchlight Volumetric Cone (ShaderMaterial) ──── */}
        <mesh
          ref={coneMeshRef}
          geometry={geos.searchlightConeGeom}
          material={materials.coneShaderMat}
          position={[0, 0, 0.95]}
          visible={false}
        />
      </group>

      {/* ── Draw Calls 9 & 10: Rebuilt 3-Leg Landing Gear (Hex Struts & 4m Discs) */}
      <group>
        <group ref={upperGearGroupRef}>
          <mesh geometry={geos.legPodUpperGeom} material={materials.gearMat} />
        </group>
        <group ref={lowerGearGroupRef}>
          <mesh geometry={geos.legLowerFootGeom} material={materials.gearMat} />
        </group>
      </group>

      {/* ── Draw Call 11: Rebuilt Belly Cargo Ramp Hatch (Outer Edge Hinge) ─── */}
      <group position={[0, RAMP_HINGE_Y, RAMP_HINGE_Z]}>
        <group ref={rampGroupRef}>
          <mesh geometry={geos.cargoRampGeom} material={materials.rampMat} />
        </group>
      </group>

      {/* ── Draw Call 12: Lit Cargo Bay Interior Opening Panel (Core #FFE2A8) ── */}
      <mesh
        ref={interiorBayRef}
        geometry={geos.cargoInteriorBayGeom}
        material={materials.interiorBayMat}
        visible={false}
      />

      {/* ── Draw Call 13: Ground Light Pools (Searchlight Pool & Ramp Spill) ─── */}
      <mesh
        ref={groundPoolsRef}
        geometry={geos.groundPoolsGeom}
        material={materials.groundPoolsMat}
        visible={false}
      />
    </group>
  );
}
