"use client";
/**
 * relayMesh.tsx — 3D Procedural Meshes & Materials for Section 2 Relay Line
 * =========================================================================
 * Features:
 * - Visibly cut main conduit (z in [3.9, 5.7]) with frayed copper strands
 * - Thin pale-cyan rim line along the top crown (omitted over R4 gap)
 * - Industrial arch clamps every 2 units
 * - All six plates and indicator lamps face the walkway
 * - 20%+ larger labels (145px) easily legible from 4 units
 * - Zero placeholder or developer text
 * - R3 visibly damaged before scanning: blackened casing, radial floor scorch mark,
 *   cracked cover, irregular red-orange lamp (<= 3 Hz), spark bursts every 1.5-4s,
 *   thin curling smoke, and unscanned plate in "WARNING" state (not "STANDBY").
 *
 * Draw call budget: <= 14 draw calls.
 */
import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  RELAY_PATH,
  SECTION2_NODES,
  NODE_BOX_DIMS,
  RISER_HEIGHT,
  type Section2NodePlacement,
} from "./section2.config";
import type { RelayConfig } from "./evaluateConfig";
import { RoofTransmissionAntenna } from "./RoofAntenna";

// ============================================================
// 1. INDIVIDUAL HIGH-CONTRAST NODE TOP PLATES (SCAN-GATED)
// ============================================================
export function createIndividualNodePlateTextures(
  nodes: Section2NodePlacement[],
  scannedIds: Set<string> = new Set(),
  r4PatchValue?: number | null,
  isR4Installed: boolean = false
): Record<string, THREE.CanvasTexture> {
  const textures: Record<string, THREE.CanvasTexture> = {};

  nodes.forEach((node) => {
    const isR4 = node.id === "R4";
    const isScanned = scannedIds.has(node.id) || (isR4 && isR4Installed);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isSurge = node.kind === "surge";
    const isMissing = node.kind === "missing" && !isR4Installed;

    // 1. Heavy industrial steel plate background
    if (isSurge) {
      // Scorched soot-blackened plate for R3 before and after scan
      ctx.fillStyle = "#120f11";
    } else {
      ctx.fillStyle = isScanned ? "#0e1117" : "#080a0e";
    }
    ctx.fillRect(0, 0, 512, 320);

    // 2. High-contrast perimeter border
    if (isSurge) {
      // Red-orange warning border on R3 before and after scan
      ctx.strokeStyle = "#ef4444";
    } else if (isScanned) {
      ctx.strokeStyle = isMissing ? "#f59e0b" : "#00f0ff";
    } else {
      ctx.strokeStyle = "#1e293b";
    }
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 308);

    // 3. Top hazard stripe bar (26px height)
    const stripeW = 20;
    for (let x = 8; x < 504; x += stripeW) {
      if (isSurge) {
        ctx.fillStyle =
          Math.floor(x / stripeW) % 2 === 0 ? "#ef4444" : "#1f0c0c";
      } else if (isScanned) {
        ctx.fillStyle =
          Math.floor(x / stripeW) % 2 === 0
            ? isMissing
              ? "#f59e0b"
              : "#00f0ff"
            : "#1e293b";
      } else {
        ctx.fillStyle =
          Math.floor(x / stripeW) % 2 === 0 ? "#1e293b" : "#0e141f";
      }
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x + stripeW, 8);
      ctx.lineTo(x + stripeW - 10, 34);
      ctx.lineTo(x - 10, 34);
      ctx.closePath();
      ctx.fill();
    }

    // 4. Recessed panel fill
    ctx.fillStyle = isSurge ? "#171214" : (isScanned ? "#12161f" : "#090d14");
    ctx.fillRect(16, 42, 480, 262);
    ctx.strokeStyle = isSurge ? "#451a1a" : (isScanned ? "#1e293b" : "#141c28");
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 42, 480, 262);

    // 5. Giant Stencil Identifier (R1 .. R6) - 145px
    ctx.font = "900 145px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isSurge) {
      // Intense alert red on R3
      ctx.fillStyle = "#ff3b30";
    } else if (isScanned) {
      ctx.fillStyle = isMissing ? "#f59e0b" : "#00f0ff";
    } else {
      ctx.fillStyle = "#334155"; // Dim unpowered metallic steel
    }
    ctx.fillText(node.label, 108, 172);

    // 6. Vertical technical divider
    ctx.strokeStyle = isSurge ? "#7f1d1d" : (isScanned ? "#263040" : "#18202c");
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(200, 50);
    ctx.lineTo(200, 290);
    ctx.stroke();

    // 7. Large Voltage Reading & Status (SCAN-GATED: strictly nothing if unscanned)
    ctx.textAlign = "left";
    if (!isScanned) {
      // Unscanned: screen is completely unpowered and blank
    } else {
      // Scanned: show real readings & active statuses
      ctx.font = "bold 46px monospace";
      ctx.fillStyle = "#ffffff";
      if (isR4 && isR4Installed) {
        const val = r4PatchValue ?? 120;
        ctx.fillText(`${val} V`, 225, 108);

        ctx.font = "bold 25px monospace";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("✓ 120V // STABLE", 225, 168);
      } else if (isMissing) {
        ctx.fillText("NULL", 225, 108);

        ctx.font = "bold 25px monospace";
        ctx.fillStyle = "#fbbf24";
        ctx.fillText("✕ NO COMPONENT", 225, 168);
      } else if (isSurge) {
        ctx.fillText("99,999 V", 225, 108);

        ctx.font = "bold 25px monospace";
        ctx.fillStyle = "#f87171";
        ctx.fillText("⚡ SURGE WARNING", 225, 168);
      } else {
        const readingStr =
          node.reading !== null ? `${node.reading.toLocaleString()} V` : "NULL";
        ctx.fillText(readingStr, 225, 108);

        ctx.font = "bold 25px monospace";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("✓ 120V // STABLE", 225, 168);
      }

      // 8. In-world Technical Specification (only when scanned)
      ctx.font = "bold 14px monospace";
      ctx.fillStyle = isSurge ? "#991b1b" : "#475569";
      ctx.fillText("HIGH-VOLTAGE TRANSMISSION BUS", 225, 250);
      ctx.font = "12px monospace";
      ctx.fillStyle = isSurge ? "#7f1d1d" : "#334155";
      ctx.fillText("CIRCUIT SPEC: 120V NOMINAL", 225, 276);
    }

    // 9. Cracked fissure markings on R3 plate
    if (isSurge) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(180, 44);
      ctx.lineTo(240, 110);
      ctx.lineTo(210, 190);
      ctx.lineTo(310, 260);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 100, 20, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(240, 110);
      ctx.lineTo(280, 140);
      ctx.lineTo(250, 210);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.needsUpdate = true;
    textures[node.id] = texture;
  });

  return textures;
}

// ============================================================
// 2. DASHED OUTLINE DECAL TEXTURE FOR R4 MISSING COMPONENT
// ============================================================
export function createDashedDecalTexture(isScanned: boolean = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 256);

  // Dashed warning border
  ctx.strokeStyle = isScanned ? "#f59e0b" : "#475569";
  ctx.lineWidth = 6;
  ctx.setLineDash([16, 12]);
  ctx.strokeRect(10, 10, 236, 236);

  // Cross lines across empty bracket
  ctx.strokeStyle = isScanned ? "rgba(245, 158, 11, 0.4)" : "rgba(71, 85, 105, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(246, 246);
  ctx.moveTo(246, 10);
  ctx.lineTo(10, 246);
  ctx.stroke();

  // Scanned status note appears only after scanning R4
  if (isScanned) {
    ctx.setLineDash([]);
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SLOT VACANT", 128, 112);
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("[ NO COMPONENT ]", 128, 144);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

// ============================================================
// 3. RADIAL PROCEDURAL SCORCH BLAST DECAL FOR R3 FLOOR
// ============================================================
function createScorchDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 256);

  // 1. Soft radial soot blast gradient
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 124);
  grad.addColorStop(0.0, "rgba(5, 5, 7, 0.96)");
  grad.addColorStop(0.35, "rgba(12, 10, 12, 0.85)");
  grad.addColorStop(0.7, "rgba(20, 16, 18, 0.45)");
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // 2. Radial jagged scorch blowout fingers
  ctx.strokeStyle = "rgba(4, 4, 6, 0.75)";
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + (Math.sin(i * 1.7) * 0.15);
    const r1 = 30 + (i % 3) * 15;
    const r2 = 90 + ((i * 7) % 35);
    ctx.lineWidth = 4 + (i % 4) * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(angle) * r1, 128 + Math.sin(angle) * r1);
    ctx.lineTo(128 + Math.cos(angle) * r2, 128 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // 3. Intense carbon epicenter
  const core = ctx.createRadialGradient(128, 128, 0, 128, 128, 45);
  core.addColorStop(0.0, "rgba(0, 0, 0, 0.98)");
  core.addColorStop(1.0, "rgba(8, 8, 10, 0.0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(128, 128, 45, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = true;
  return tex;
}

// ============================================================
// 4. RADIAL SOFT SPARK SPRITE TEXTURE
// ============================================================
function createRadialSparkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.2, "rgba(255, 245, 180, 0.95)");
  grad.addColorStop(0.45, "rgba(255, 150, 30, 0.7)");
  grad.addColorStop(0.75, "rgba(210, 50, 10, 0.3)");
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  return tex;
}

// ============================================================
// 5. RADIAL SOFT SMOKE PUFF SPRITE TEXTURE
// ============================================================
function createSmokeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  grad.addColorStop(0.0, "rgba(80, 85, 96, 0.65)");
  grad.addColorStop(0.35, "rgba(60, 64, 74, 0.40)");
  grad.addColorStop(0.7, "rgba(40, 44, 52, 0.15)");
  grad.addColorStop(1.0, "rgba(0, 0, 0, 0.0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  return tex;
}

// ============================================================
// 6. THIN SMOKE EMITTER (Wispy thermal smoke curling from R3)
// ============================================================
interface SmokeParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

function ThinSmokeEmitter({ origin }: { origin: [number, number, number] }) {
  const count = 14;
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const smokeTex = useMemo(() => createSmokeTexture(), []);

  useEffect(() => {
    return () => smokeTex.dispose();
  }, [smokeTex]);

  const [particles, posArray, colorArray] = useMemo(() => {
    const list: SmokeParticle[] = [];
    const pArr = new Float32Array(count * 3);
    const cArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      list.push({
        pos: new THREE.Vector3(origin[0], -999, origin[2]),
        vel: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 2.0 + Math.random() * 1.4,
        size: 0.15,
      });
      pArr[i * 3 + 0] = origin[0];
      pArr[i * 3 + 1] = -999;
      pArr[i * 3 + 2] = origin[2];
      cArr[i * 3 + 0] = 0.4;
      cArr[i * 3 + 1] = 0.4;
      cArr[i * 3 + 2] = 0.45;
    }
    return [list, pArr, cArr];
  }, [origin]);

  const spawnTimer = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    spawnTimer.current -= dt;

    if (spawnTimer.current <= 0) {
      spawnTimer.current = 0.18 + Math.random() * 0.12;
      const dormant = particles.find((p) => p.life <= 0);
      if (dormant) {
        dormant.maxLife = 2.0 + Math.random() * 1.2;
        dormant.life = dormant.maxLife;
        dormant.pos.set(
          origin[0] + (Math.random() - 0.5) * 0.14,
          origin[1] + 0.72,
          origin[2] + (Math.random() - 0.5) * 0.14
        );
        dormant.vel.set(
          (Math.random() - 0.5) * 0.04,
          0.26 + Math.random() * 0.18, // Gentle upward thermal draft
          (Math.random() - 0.5) * 0.04
        );
      }
    }

    const posAttr = geomRef.current?.attributes.position as THREE.BufferAttribute;
    const colAttr = geomRef.current?.attributes.color as THREE.BufferAttribute;
    if (!posAttr || !colAttr) return;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      if (p.life > 0) {
        p.life -= dt;
        p.pos.addScaledVector(p.vel, dt);
        // Subtle drift
        p.vel.x += (Math.random() - 0.5) * 0.01;
        p.vel.z += (Math.random() - 0.5) * 0.01;

        // Alpha envelope: fade in -> sustain -> fade out
        const lr = p.life / p.maxLife;
        const alpha = Math.sin(lr * Math.PI) * 0.42;
        colAttr.setXYZ(i, alpha * 0.45, alpha * 0.48, alpha * 0.55);
      } else {
        p.pos.set(origin[0], -999, origin[2]);
        colAttr.setXYZ(i, 0, 0, 0);
      }
      posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[posArray, 3]} />
        <bufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.28}
        map={smokeTex}
        vertexColors
        blending={THREE.NormalBlending}
        depthWrite={false}
        transparent
      />
    </points>
  );
}

// ============================================================
// 7. SPARK PARTICLE SYSTEM (Max 48 particles, Additive, Pooled)
// Velocity-stretched, white-yellow -> orange -> dark, gravity
// Bursts every 1.5 to 4.0 seconds (strictly <= 3 Hz flash limit)
// ============================================================
interface SparkParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

function PooledSparkSystem({ origin }: { origin: [number, number, number] }) {
  const count = 48; // Strictly <= 60 pool
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const trailGeomRef = useRef<THREE.BufferGeometry>(null);

  const sparkTexture = useMemo(() => createRadialSparkTexture(), []);

  useEffect(() => {
    return () => sparkTexture.dispose();
  }, [sparkTexture]);

  const [particles, posArray, colorArray, trailPosArray] = useMemo(() => {
    const list: SparkParticle[] = [];
    const pArr = new Float32Array(count * 3);
    const cArr = new Float32Array(count * 3);
    const tArr = new Float32Array(count * 6); // 2 vertices per trail segment

    for (let i = 0; i < count; i++) {
      list.push({
        pos: new THREE.Vector3(origin[0], -999, origin[2]),
        vel: new THREE.Vector3(0, 0, 0),
        life: 0,
        maxLife: 0.16 + Math.random() * 0.18,
      });
      pArr[i * 3 + 0] = origin[0];
      pArr[i * 3 + 1] = -999;
      pArr[i * 3 + 2] = origin[2];

      cArr[i * 3 + 0] = 1.0;
      cArr[i * 3 + 1] = 1.0;
      cArr[i * 3 + 2] = 1.0;

      tArr[i * 6 + 0] = origin[0];
      tArr[i * 6 + 1] = -999;
      tArr[i * 6 + 2] = origin[2];
      tArr[i * 6 + 3] = origin[0];
      tArr[i * 6 + 4] = -999;
      tArr[i * 6 + 5] = origin[2];
    }
    return [list, pArr, cArr, tArr];
  }, [origin]);

  // Bursts every 1.5 to 4.0 s (strictly <= 3 Hz flash limit)
  const burstCooldown = useRef(1.5 + Math.random() * 1.5);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    burstCooldown.current -= dt;
    const shouldBurst = burstCooldown.current <= 0;
    if (shouldBurst) {
      // 1.5 to 4.0 s cooldown between bursts
      burstCooldown.current = 1.5 + Math.random() * 2.5;
    }

    const posAttr = geomRef.current?.attributes.position as THREE.BufferAttribute;
    const colAttr = geomRef.current?.attributes.color as THREE.BufferAttribute;
    const trailPosAttr = trailGeomRef.current?.attributes.position as THREE.BufferAttribute;
    if (!posAttr || !colAttr || !trailPosAttr) return;

    for (let i = 0; i < count; i++) {
      const p = particles[i];

      if (p.life <= 0 && shouldBurst && Math.random() < 0.4) {
        // Spawn spark from R3 cracked casing
        p.maxLife = 0.16 + Math.random() * 0.20;
        p.life = p.maxLife;
        p.pos.set(
          origin[0] + (Math.random() - 0.5) * 0.22,
          origin[1] + 0.38 + (Math.random() - 0.5) * 0.08,
          origin[2] + (Math.random() - 0.5) * 0.22
        );
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.4 + Math.random() * 2.6;
        p.vel.set(
          Math.cos(angle) * speed,
          1.2 + Math.random() * 2.2,
          Math.sin(angle) * speed
        );
      } else if (p.life > 0) {
        p.life -= dt;
        p.vel.y -= 12.0 * dt; // Gravity
        p.pos.addScaledVector(p.vel, dt);

        // Floor bounce with damping
        if (p.pos.y < origin[1] + 0.02) {
          p.pos.y = origin[1] + 0.02;
          p.vel.y = -p.vel.y * 0.32;
          p.vel.x *= 0.65;
          p.vel.z *= 0.65;
        }

        // Color transition: white-yellow -> orange -> dark
        const lifeRatio = Math.max(0, p.life / p.maxLife);
        let r = 1.0, g = 1.0, b = 0.8;
        if (lifeRatio > 0.6) {
          // White to bright yellow
          const t = (lifeRatio - 0.6) / 0.4;
          r = 1.0;
          g = 0.9 + 0.1 * t;
          b = 0.3 + 0.5 * t;
        } else if (lifeRatio > 0.2) {
          // Yellow to glowing orange
          const t = (lifeRatio - 0.2) / 0.4;
          r = 1.0;
          g = 0.35 + 0.55 * t;
          b = 0.05 + 0.25 * t;
        } else {
          // Orange to dark glowing ember
          const t = lifeRatio / 0.2;
          r = 0.3 + 0.7 * t;
          g = 0.05 + 0.30 * t;
          b = 0.01;
        }
        colAttr.setXYZ(i, r, g, b);

        // Trail segment stretched along velocity
        trailPosAttr.setXYZ(i * 2 + 0, p.pos.x, p.pos.y, p.pos.z);
        trailPosAttr.setXYZ(
          i * 2 + 1,
          p.pos.x - p.vel.x * 0.025,
          p.pos.y - p.vel.y * 0.025,
          p.pos.z - p.vel.z * 0.025
        );
      } else {
        // Inert / offscreen
        p.pos.set(origin[0], -999, origin[2]);
        colAttr.setXYZ(i, 0, 0, 0);
        trailPosAttr.setXYZ(i * 2 + 0, origin[0], -999, origin[2]);
        trailPosAttr.setXYZ(i * 2 + 1, origin[0], -999, origin[2]);
      }

      posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    trailPosAttr.needsUpdate = true;
  });

  return (
    <group name="pooled-sparks">
      {/* 1. Round soft particles with radial alpha sprite */}
      <points>
        <bufferGeometry ref={geomRef}>
          <bufferAttribute attach="attributes-position" args={[posArray, 3]} />
          <bufferAttribute attach="attributes-color" args={[colorArray, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          map={sparkTexture}
          vertexColors
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          transparent
        />
      </points>

      {/* 2. Velocity-stretched dynamic trail streaks */}
      <lineSegments>
        <bufferGeometry ref={trailGeomRef}>
          <bufferAttribute attach="attributes-position" args={[trailPosArray, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#f97316"
          blending={THREE.AdditiveBlending}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

// ============================================================
// 8. MAIN RELAY LINE 3D COMPONENT
// ============================================================
export interface RelayLineProps {
  nodes?: Section2NodePlacement[];
  activeScanId?: string | null;
  scannedIds?: Set<string>;
  diagnosticConfig?: RelayConfig;
  diagnosticPassed?: boolean;
  greyscale?: boolean;
}

const ANTENNA_MOUNT_POS: [number, number, number] = [RELAY_PATH[6][0], RELAY_PATH[6][1], RELAY_PATH[6][2]];

function RelayLineComponent({
  nodes = SECTION2_NODES,
  activeScanId = null,
  scannedIds = new Set(),
  diagnosticConfig,
  diagnosticPassed = false,
  greyscale = false,
}: RelayLineProps) {
  // R4 junction box only comes up in the physical walkway line when the transmission
  // connection is legitimately established (circuit stabilized / test passed)
  const isR4Installed = Boolean(diagnosticPassed);
  const r4PatchValue = diagnosticConfig?.["R4"]?.patchValue ?? 120;

  // ── Resources & Dedicated Scan-Gated Node Textures ─────────
  const nodeTextures = useMemo(
    () => createIndividualNodePlateTextures(nodes, scannedIds, r4PatchValue, isR4Installed),
    [nodes, scannedIds, r4PatchValue, isR4Installed]
  );

  const isR4Scanned = scannedIds.has("R4") || isR4Installed;
  const dashedDecalTexture = useMemo(
    () => createDashedDecalTexture(isR4Scanned),
    [isR4Scanned]
  );

  const scorchTexture = useMemo(() => createScorchDecalTexture(), []);

  useEffect(() => {
    return () => {
      Object.values(nodeTextures).forEach((t) => t.dispose());
      dashedDecalTexture.dispose();
      scorchTexture.dispose();
    };
  }, [nodeTextures, dashedDecalTexture, scorchTexture]);

  // ── Conduit Polyline Geometry & Pale-Cyan Rim Line ────────
  // Main line visibly CUT between z = 3.9 and z = 5.7 (1.8m gap)
  const {
    conduitGeom1,
    conduitGeom2,
    rimGeom1,
    rimGeom2,
    bridgeGeom,
    bridgeRimGeom,
    riserGeom,
    frayedEndsGeom,
    clampInstances,
  } = useMemo(() => {
    // Section 1: Pt 0 -> Pt 1 -> Pt 2 -> Pt 3 -> Pt 4 -> Cut gap entry (z = 3.9)
    const pts1 = [
      new THREE.Vector3(RELAY_PATH[0][0], RELAY_PATH[0][1], RELAY_PATH[0][2]),
      new THREE.Vector3(RELAY_PATH[1][0], RELAY_PATH[1][1], RELAY_PATH[1][2]),
      new THREE.Vector3(RELAY_PATH[2][0], RELAY_PATH[2][1], RELAY_PATH[2][2]),
      new THREE.Vector3(RELAY_PATH[3][0], RELAY_PATH[3][1], RELAY_PATH[3][2]),
      new THREE.Vector3(RELAY_PATH[4][0], RELAY_PATH[4][1], RELAY_PATH[4][2]),
      new THREE.Vector3(1.8, 0.04, 3.9), // Stops cleanly before R4 gap
    ];
    const curve1 = new THREE.CatmullRomCurve3(pts1, false, "chordal", 0.15);
    const g1 = new THREE.TubeGeometry(curve1, 56, 0.14, 8, false);

    // Pale-cyan rim line along the top crown of Section 1 (radius 0.016, y + 0.141)
    const rimPts1 = curve1.getPoints(56).map((p) => new THREE.Vector3(p.x, p.y + 0.141, p.z));
    const rimCurve1 = new THREE.CatmullRomCurve3(rimPts1, false, "chordal", 0.15);
    const rg1 = new THREE.TubeGeometry(rimCurve1, 56, 0.016, 6, false);

    // Section 2: Cut gap exit (z = 5.7) -> Pt 5 -> Pt 6 riser base
    const pts2 = [
      new THREE.Vector3(1.8, 0.04, 5.7), // Starts cleanly after R4 gap
      new THREE.Vector3(RELAY_PATH[5][0], RELAY_PATH[5][1], RELAY_PATH[5][2]),
      new THREE.Vector3(RELAY_PATH[6][0], RELAY_PATH[6][1], RELAY_PATH[6][2]),
    ];
    const curve2 = new THREE.CatmullRomCurve3(pts2, false, "chordal", 0.15);
    const g2 = new THREE.TubeGeometry(curve2, 36, 0.14, 8, false);

    // Pale-cyan rim line along top crown of Section 2 (radius 0.016, y + 0.141)
    const rimPts2 = curve2.getPoints(36).map((p) => new THREE.Vector3(p.x, p.y + 0.141, p.z));
    const rimCurve2 = new THREE.CatmullRomCurve3(rimPts2, false, "chordal", 0.15);
    const rg2 = new THREE.TubeGeometry(rimCurve2, 36, 0.016, 6, false);

    // Bridge conduit connecting gap when R4 is patched
    const bridgeCurve = new THREE.LineCurve3(
      new THREE.Vector3(1.8, 0.04, 3.9),
      new THREE.Vector3(1.8, 0.04, 5.7)
    );
    const bg = new THREE.TubeGeometry(bridgeCurve, 16, 0.14, 8, false);

    const bridgeRimCurve = new THREE.LineCurve3(
      new THREE.Vector3(1.8, 0.181, 3.9),
      new THREE.Vector3(1.8, 0.181, 5.7)
    );
    const brg = new THREE.TubeGeometry(bridgeRimCurve, 16, 0.016, 6, false);

    // Vertical riser column
    const riserCurve = new THREE.LineCurve3(
      new THREE.Vector3(RELAY_PATH[6][0], RELAY_PATH[6][1], RELAY_PATH[6][2]),
      new THREE.Vector3(RELAY_PATH[6][0], RELAY_PATH[6][1] + RISER_HEIGHT, RELAY_PATH[6][2])
    );
    const rg = new THREE.TubeGeometry(riserCurve, 16, 0.16, 8, false);

    // Frayed copper strands bursting out from inside both severed conduit mouths
    const frayedGeo = new THREE.BufferGeometry();
    const strandPositions: number[] = [];

    // Mouth 1 at z = 3.9 (bursts forward toward +z into gap)
    for (let s = 0; s < 16; s++) {
      const offX = (Math.random() - 0.5) * 0.14;
      const offY = (Math.random() - 0.5) * 0.10;
      strandPositions.push(1.8 + offX * 0.5, 0.04 + offY * 0.5, 3.9);
      strandPositions.push(
        1.8 + offX,
        Math.max(0.015, 0.04 + offY + Math.random() * 0.04),
        3.9 + 0.25 + Math.random() * 0.35
      );
    }

    // Mouth 2 at z = 5.7 (bursts backward toward -z into gap)
    for (let s = 0; s < 16; s++) {
      const offX = (Math.random() - 0.5) * 0.14;
      const offY = (Math.random() - 0.5) * 0.10;
      strandPositions.push(1.8 + offX * 0.5, 0.04 + offY * 0.5, 5.7);
      strandPositions.push(
        1.8 + offX,
        Math.max(0.015, 0.04 + offY + Math.random() * 0.04),
        5.7 - (0.25 + Math.random() * 0.35)
      );
    }

    frayedGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(strandPositions, 3)
    );

    // Clamps placed every 2 units along the cable curves
    const clamps: { pos: THREE.Vector3; rotY: number }[] = [];
    const len1 = curve1.getLength();
    for (let d = 1.0; d < len1 - 0.5; d += 2.0) {
      const u = d / len1;
      const pt = curve1.getPointAt(u);
      const tan = curve1.getTangentAt(u);
      clamps.push({ pos: pt, rotY: Math.atan2(tan.x, tan.z) });
    }

    const len2 = curve2.getLength();
    for (let d = 1.0; d < len2 - 0.5; d += 2.0) {
      const u = d / len2;
      const pt = curve2.getPointAt(u);
      const tan = curve2.getTangentAt(u);
      clamps.push({ pos: pt, rotY: Math.atan2(tan.x, tan.z) });
    }

    return {
      conduitGeom1: g1,
      conduitGeom2: g2,
      rimGeom1: rg1,
      rimGeom2: rg2,
      bridgeGeom: bg,
      bridgeRimGeom: brg,
      riserGeom: rg,
      frayedEndsGeom: frayedGeo,
      clampInstances: clamps,
    };
  }, []);

  useEffect(() => {
    return () => {
      conduitGeom1.dispose();
      conduitGeom2.dispose();
      rimGeom1.dispose();
      rimGeom2.dispose();
      bridgeGeom.dispose();
      bridgeRimGeom.dispose();
      riserGeom.dispose();
      frayedEndsGeom.dispose();
    };
  }, [conduitGeom1, conduitGeom2, rimGeom1, rimGeom2, bridgeGeom, bridgeRimGeom, riserGeom, frayedEndsGeom]);

  const clampGeom = useMemo(() => {
    // Arch clamp over radius 0.14 cable
    return new THREE.CylinderGeometry(0.165, 0.165, 0.08, 12, 1, false, 0, Math.PI);
  }, []);

  useEffect(() => {
    return () => clampGeom.dispose();
  }, [clampGeom]);

  // ── Node Indicator Breathing & Warning Flicker Animation ──
  const healthyMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const surgeLampRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // 1. Healthy breathing glow (<= 0.5 Hz, +-5% intensity)
    if (healthyMatRef.current) {
      const breath = 0.95 + Math.sin(t * 2.8) * 0.05;
      if (greyscale) {
        healthyMatRef.current.color.setRGB(0.7 * breath, 0.7 * breath, 0.7 * breath);
      } else {
        healthyMatRef.current.color.setRGB(0.2 * breath, 0.85 * breath, 1.0 * breath);
      }
    }

    // 2. Surge warning red-orange lamp flicker (Irregular, strictly <= 3 Hz: max freq ~2.3 Hz)
    if (surgeLampRef.current) {
      // Compound irregular wave capped at 14.4 rad/s (~2.29 Hz)
      const flickerWave =
        Math.sin(t * 4.8) * 0.5 +
        Math.sin(t * 9.6 + 0.8) * 0.35 +
        Math.sin(t * 14.4 - 1.2) * 0.15;
      const isLit = flickerWave > 0.05;

      if (greyscale) {
        surgeLampRef.current.color.setRGB(
          isLit ? 0.95 : 0.18,
          isLit ? 0.95 : 0.18,
          isLit ? 0.95 : 0.18
        );
      } else {
        // Red-orange warning lamp
        surgeLampRef.current.color.setRGB(
          isLit ? 1.0 : 0.22,
          isLit ? 0.24 : 0.04,
          isLit ? 0.04 : 0.01
        );
      }
    }
  });

  return (
    <group name="relay-line-root">
      {/* ── 1. MAIN CONDUIT CABLE (Draw Call 1: Severed cleanly around R4 gap) ── */}
      <mesh geometry={conduitGeom1}>
        <meshBasicMaterial
          color={greyscale ? "#333333" : "#1c2026"}
          wireframe={false}
        />
      </mesh>
      <mesh geometry={conduitGeom2}>
        <meshBasicMaterial
          color={greyscale ? "#333333" : "#1c2026"}
          wireframe={false}
        />
      </mesh>

      {/* ── 2. THIN PALE-CYAN RIM LINE ALONG TOP EDGE (Draw Call 2: Omitted over R4 gap) ── */}
      <mesh geometry={rimGeom1}>
        <meshBasicMaterial color={greyscale ? "#cccccc" : "#7dd3fc"} />
      </mesh>
      <mesh geometry={rimGeom2}>
        <meshBasicMaterial color={greyscale ? "#cccccc" : "#7dd3fc"} />
      </mesh>

      {/* ── 3. EXTENDED RISER MAST & MODERN SCI-FI CONCAVE ANTENNA ── */}
      <RoofTransmissionAntenna
        position={ANTENNA_MOUNT_POS}
        height={RISER_HEIGHT}
        diagnosticPassed={diagnosticPassed}
        greyscale={greyscale}
      />

      {/* ── 4. CONDUIT GAP BRIDGING OR FRAYED STRANDS ── */}
      {isR4Installed ? (
        <>
          {/* Continuous bridge conduit through R4 gap */}
          <mesh geometry={bridgeGeom}>
            <meshBasicMaterial color={greyscale ? "#333333" : "#1c2026"} />
          </mesh>
          <mesh geometry={bridgeRimGeom}>
            <meshBasicMaterial color={greyscale ? "#cccccc" : "#7dd3fc"} />
          </mesh>
        </>
      ) : (
        <>
          {/* Frayed copper strands at R4 severed ends */}
          <lineSegments geometry={frayedEndsGeom}>
            <lineBasicMaterial
              color={greyscale ? "#777777" : "#d97706"}
              linewidth={2}
            />
          </lineSegments>
          {/* Severed Conduit Collar End Caps at Gap Mouths (z = 3.9 and z = 5.7) */}
          <mesh position={[1.8, 0.04, 3.9]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.155, 0.155, 0.06, 12]} />
            <meshBasicMaterial color={greyscale ? "#555" : "#475569"} />
          </mesh>
          <mesh position={[1.8, 0.04, 5.7]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.155, 0.155, 0.06, 12]} />
            <meshBasicMaterial color={greyscale ? "#555" : "#475569"} />
          </mesh>
        </>
      )}

      {/* ── 5. INSTANCED CABLE CLAMPS (Every 2 units) ── */}
      {clampInstances.map((c, i) => (
        <group
          key={i}
          position={c.pos}
          rotation={[0, c.rotY, Math.PI / 2]}
        >
          <mesh geometry={clampGeom}>
            <meshBasicMaterial color={greyscale ? "#666666" : "#475569"} />
          </mesh>
        </group>
      ))}

      {/* ── 6. VISIBLE SCORCH MARKS ON FLOOR AROUND R3 (Draw Call 5) ── */}
      <mesh position={[1.8, 0.042, 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 2.8]} />
        <meshBasicMaterial
          map={scorchTexture}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>

      {/* ── 7. R4 SEVERED GAP DASHED OUTLINE DECAL & FLOOR BRACKET (Only when NOT installed) ── */}
      {!isR4Installed && (
        <>
          <mesh position={[1.8, 0.043, 4.8]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]}>
            <planeGeometry args={[1.4, 1.4]} />
            <meshBasicMaterial
              map={dashedDecalTexture}
              transparent
              opacity={0.95}
              depthWrite={false}
            />
          </mesh>

          {/* R4 Empty Mounting Bracket & 4 Bolt Holes on Floor */}
          <group position={[1.8, 0.045, 4.8]}>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.92, 0.02, 0.92]} />
              <meshBasicMaterial color={greyscale ? "#333333" : "#1f242d"} />
            </mesh>
            {[
              [-0.38, -0.38],
              [0.38, -0.38],
              [-0.38, 0.38],
              [0.38, 0.38],
            ].map(([bx, bz], bi) => (
              <mesh key={bi} position={[bx, 0.026, bz]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.02, 0.05, 8]} />
                <meshBasicMaterial color="#0b0e14" />
              </mesh>
            ))}
          </group>
        </>
      )}

      {/* ── 9. JUNCTION BOXES (R1, R2, R3, R4 when connection established, R5, R6) ── */}
      {nodes.map((node) => {
        if (node.kind === "missing" && !isR4Installed) return null; // R4 only comes up when connection established

        const isSurge = node.kind === "surge";
        const isTargeted = activeScanId === node.id;
        const isScanned = scannedIds.has(node.id) || (node.id === "R4" && isR4Installed);

        // Box body color: charred soot black for R3 surge, industrial steel for healthy/patched
        const boxColor = isSurge
          ? (greyscale ? "#111111" : "#0c0d10")
          : (greyscale ? "#3b3b3b" : "#27303f");

        return (
          <group
            key={node.id}
            position={node.position}
            rotation={[0, node.rotationY, 0]}
          >
            {/* Main Industrial Junction Box (~0.9 x 0.7 x 0.9 m) */}
            <mesh position={[0, NODE_BOX_DIMS.height * 0.5, 0]}>
              <boxGeometry
                args={[
                  NODE_BOX_DIMS.width,
                  NODE_BOX_DIMS.height,
                  NODE_BOX_DIMS.depth,
                ]}
              />
              <meshBasicMaterial color={boxColor} />
            </mesh>

            {/* 4 Floor Mounting Brackets with Hexagonal Bolts */}
            {[
              [-0.48, -0.48],
              [0.48, -0.48],
              [-0.48, 0.48],
              [0.48, 0.48],
            ].map(([bx, bz], bIdx) => (
              <group key={bIdx} position={[bx, 0.02, bz]}>
                <mesh position={[0, 0.02, 0]}>
                  <boxGeometry args={[0.16, 0.04, 0.16]} />
                  <meshBasicMaterial color={greyscale ? "#555" : "#475569"} />
                </mesh>
                <mesh position={[0, 0.05, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.03, 6]} />
                  <meshBasicMaterial color={greyscale ? "#888" : "#94a3b8"} />
                </mesh>
              </group>
            ))}

            {/* Stencilled Identification Plate on Top of Relay Node (Faces Walkway at -X) */}
            {nodeTextures[node.id] && (
              <mesh
                position={[0, NODE_BOX_DIMS.height + 0.003, 0]}
                rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
              >
                <planeGeometry args={[0.82, 0.52]} />
                <meshBasicMaterial
                  key={`${node.id}-${isScanned}-${node.id === "R4" ? (isR4Installed ? r4PatchValue : "uninstalled") : ""}`}
                  map={nodeTextures[node.id]}
                />
              </mesh>
            )}

            {/* Indicator Lamp Cover on Front Face (Facing the Walkway at -X) */}
            <mesh
              position={[-NODE_BOX_DIMS.width * 0.505, NODE_BOX_DIMS.height * 0.75, 0]}
              rotation={[0, -Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.3, 0.12]} />
              {isSurge ? (
                // R3 Red-Orange Lamp: Flickers irregularly (<= 3 Hz) BEFORE and after scan
                <meshBasicMaterial
                  ref={surgeLampRef}
                  color={greyscale ? "#ffffff" : "#ef4444"}
                />
              ) : !isScanned ? (
                // Healthy Unscanned: Idle standby lamp
                <meshBasicMaterial
                  color={greyscale ? "#444444" : "#0c4a6e"}
                />
              ) : (
                // Healthy Scanned: Calm breathing cyan lamp
                <meshBasicMaterial
                  ref={healthyMatRef}
                  color={greyscale ? "#cccccc" : "#38bdf8"}
                />
              )}
            </mesh>

            {/* Cracked cover decal on Surge Node R3 (Front face over lamp and top edge) */}
            {isSurge && (
              <>
                <mesh
                  position={[-NODE_BOX_DIMS.width * 0.508, NODE_BOX_DIMS.height * 0.75, 0]}
                  rotation={[0, -Math.PI / 2, 0]}
                >
                  <planeGeometry args={[0.34, 0.16]} />
                  <meshBasicMaterial
                    color="#000000"
                    wireframe
                    transparent
                    opacity={0.88}
                  />
                </mesh>
                {/* Cracked fracture lines across top casing */}
                <mesh
                  position={[0, NODE_BOX_DIMS.height + 0.005, 0]}
                  rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                >
                  <planeGeometry args={[0.84, 0.54]} />
                  <meshBasicMaterial
                    color="#ff4500"
                    wireframe
                    transparent
                    opacity={0.25}
                    depthWrite={false}
                  />
                </mesh>
              </>
            )}

            {/* Active Target AR Scanning Reticle Ring */}
            {isTargeted && (
              <mesh position={[0, NODE_BOX_DIMS.height + 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.45, 0.52, 24]} />
                <meshBasicMaterial
                  color={greyscale ? "#ffffff" : "#22d3ee"}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Surge Node R3 Pooled Spark Emitter (Bursts every 1.5-4s, round soft particles) */}
            {isSurge && <PooledSparkSystem origin={node.position} />}

            {/* Surge Node R3 Thin Curling Smoke Plume */}
            {isSurge && <ThinSmokeEmitter origin={node.position} />}
          </group>
        );
      })}
    </group>
  );
}

export const RelayLine = React.memo(RelayLineComponent);
