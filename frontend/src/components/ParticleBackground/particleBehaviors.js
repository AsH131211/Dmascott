/* ===================================================================
   PARTICLE BEHAVIORS — Physics & force calculations per state
   All operations use pre-allocated scratch variables; zero GC
   =================================================================== */

import { particleConfig as cfg } from './particleConfig.js';
import { STATES } from './particleStateMachine.js';

// ── Pre-allocated scratch vectors (reused every frame) ──
const _dx = { x: 0, y: 0, z: 0 };
const _force = { x: 0, y: 0, z: 0 };

/** Attempt a simple 3D curl-noise-like procedural displacement */
function curlNoise(x, y, z, time, scale) {
  const s = scale;
  const t = time;
  _dx.x = Math.sin(y * s + t * 0.7) * Math.cos(z * s * 0.8 + t * 0.5);
  _dx.y = Math.sin(z * s * 0.9 + t * 0.6) * Math.cos(x * s + t * 0.4);
  _dx.z = Math.sin(x * s * 0.8 + t * 0.8) * Math.cos(y * s * 0.7 + t * 0.3);
  return _dx;
}

/** Smoothstep helper */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ═══════════════════════════════════════════════
// GREET — Scatter → converge to home positions → pulse → settle
// Home positions fill the entire screen so particles are always visible
// ═══════════════════════════════════════════════
export function computeGreetTarget(i, seed, elapsed, totalCount, homeX, homeY, homeZ) {
  const greetProgress = Math.min(1, elapsed / cfg.greetDuration);
  const ease = 1 - Math.pow(1 - greetProgress, 3); // ease-out cubic

  // Target = the particle's home position (spread across the whole viewport)
  const tx = homeX;
  const ty = homeY;
  const tz = homeZ;

  // Pulse brightness at ~70% through
  const pulsePhase = smoothstep(0.5, 0.75, greetProgress) * (1 - smoothstep(0.85, 1.0, greetProgress));

  return { tx, ty, tz, ease, pulse: pulsePhase };
}

export function applyGreetForce(
  px, py, pz, vx, vy, vz, tx, ty, tz, ease, delta
) {
  // Spring toward target with damping
  const spring = cfg.greetSpringDamping;
  const dx = tx - px;
  const dy = ty - py;
  const dz = tz - pz;

  _force.x = dx * spring * ease * 60 * delta;
  _force.y = dy * spring * ease * 60 * delta;
  _force.z = dz * spring * ease * 60 * delta;

  return _force;
}

// ═══════════════════════════════════════════════
// IDLE / AMBIENT — Living Atmosphere (Calm Breathing & Laminar Drift)
// Cohesive, gentle cosmic breathing tide that feels alive and soothing
// ═══════════════════════════════════════════════
export function applyIdleForce(
  px, py, pz, seed, elapsed, delta
) {
  // Slow, natural breathing cycle (gentle expansion & contraction ~7s period)
  const breath = Math.sin(elapsed * 0.85) * 0.035;

  // Gentle horizontal & vertical laminar drift
  const driftX = Math.sin(elapsed * 0.35 + seed * 6.283) * 0.04;
  const driftY = Math.cos(elapsed * 0.28 + seed * 6.283) * 0.03 + 0.01; // subtle buoyant lift
  const driftZ = Math.sin(elapsed * 0.20 + seed * 3.14) * 0.02;

  // Gentle orbit
  const orbitAngle = elapsed * cfg.idleOrbitSpeed * (seed > 0.5 ? 1 : -1);
  const ox = Math.cos(orbitAngle) * 0.015;
  const oy = Math.sin(orbitAngle) * 0.01;

  _force.x = (driftX + ox) * delta * 60;
  _force.y = (driftY + oy) * delta * 60;
  _force.z = driftZ * delta * 60;

  // Soft repulsion from center to keep readability corridor clear
  const distFromCenter = Math.sqrt(px * px + py * py);
  if (distFromCenter < cfg.idleCenterClearRadius && distFromCenter > 0.1) {
    const repel = (1 - distFromCenter / cfg.idleCenterClearRadius) * 0.025 * delta * 60;
    _force.x += (px / distFromCenter) * repel;
    _force.y += (py / distFromCenter) * repel;
  }

  return _force;
}

export function applyAmbientForce(
  px, py, pz, homeX, homeY, homeZ, seed, elapsed, delta
) {
  // Slow, tranquil breathing expansion & contraction
  const breath = Math.sin(elapsed * 0.85) * 0.035;

  // Smooth, buoyant air/cosmic currents
  const driftX = Math.sin(elapsed * 0.32 + seed * 6.283) * 0.035;
  const driftY = Math.cos(elapsed * 0.25 + seed * 6.283) * 0.028 + 0.008;
  const driftZ = Math.sin(elapsed * 0.18 + seed * 3.14) * 0.018;

  // Anchor to home position with gentle breathing displacement
  const targetHomeX = homeX * (1.0 + breath);
  const targetHomeY = homeY * (1.0 + breath);
  const targetHomeZ = homeZ * (1.0 + breath);

  const homeStr = cfg.ambientHomeForce;
  const dhx = targetHomeX - px;
  const dhy = targetHomeY - py;
  const dhz = targetHomeZ - pz;

  _force.x = (driftX + dhx * homeStr) * delta * 60;
  _force.y = (driftY + dhy * homeStr) * delta * 60;
  _force.z = (driftZ + dhz * homeStr) * delta * 60;

  // Soft repulsion from center reading corridor
  const distFromCenter = Math.sqrt(px * px + py * py);
  if (distFromCenter < cfg.idleCenterClearRadius && distFromCenter > 0.1) {
    const repel = (1 - distFromCenter / cfg.idleCenterClearRadius) * 0.025 * delta * 60;
    _force.x += (px / distFromCenter) * repel;
    _force.y += (py / distFromCenter) * repel;
  }

  return _force;
}

// ═══════════════════════════════════════════════
// CURSOR — Soft influence field
// ═══════════════════════════════════════════════
export function applyCursorForce(
  px, py, pz, cursorX, cursorY, cursorZ, delta
) {
  const dx = px - cursorX;
  const dy = py - cursorY;
  const dz = pz - cursorZ;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  _force.x = 0;
  _force.y = 0;
  _force.z = 0;

  if (dist < cfg.interactionRadius && dist > 0.01) {
    const influence = smoothstep(cfg.interactionRadius, 0, dist);
    const strength = cfg.interactionStrength * influence * delta * 60;

    // Repulsion with slight vortex
    const invDist = 1 / dist;
    _force.x = dx * invDist * strength + (-dy * invDist * cfg.cursorVortexStrength * influence * delta * 60);
    _force.y = dy * invDist * strength + (dx * invDist * cfg.cursorVortexStrength * influence * delta * 60);
    _force.z = dz * invDist * strength * 0.3;
  }

  return _force;
}

/** Compute brightness boost from cursor proximity */
export function cursorBrightness(px, py, pz, cursorX, cursorY, cursorZ) {
  const dx = px - cursorX;
  const dy = py - cursorY;
  const dz = pz - cursorZ;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist >= cfg.interactionRadius) return 0;
  return smoothstep(cfg.interactionRadius, 0, dist) * cfg.cursorBrightnessBoost;
}

// ═══════════════════════════════════════════════
// SHOCKWAVE — Radial impulse
// ═══════════════════════════════════════════════
export function applyShockwaveForce(
  px, py, pz, originX, originY, originZ, waveRadius, delta
) {
  const dx = px - originX;
  const dy = py - originY;
  const dz = pz - originZ;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  _force.x = 0;
  _force.y = 0;
  _force.z = 0;

  if (dist > 0.01) {
    // Ring-shaped force band
    const ringWidth = 8;
    const ringCenter = waveRadius;
    const ringDist = Math.abs(dist - ringCenter);
    if (ringDist < ringWidth) {
      const ringInfluence = 1 - ringDist / ringWidth;
      const force = cfg.shockwaveForce * ringInfluence * delta * 60;
      const invDist = 1 / dist;
      _force.x = dx * invDist * force;
      _force.y = dy * invDist * force;
      _force.z = dz * invDist * force;
    }
  }

  return _force;
}

// ═══════════════════════════════════════════════
// LOADING — Cognitive Focus Halo (The AI is thinking)
// Focused dual-orbital ring with rhythmic thought pulse
// ═══════════════════════════════════════════════
export function computeLoadingTarget(i, seed, elapsed, progress, totalCount) {
  // Particles are divided into an inner neural core ring (65%) and an outer orbital halo (35%)
  const isInnerRing = (i % 3) !== 0;

  const baseRadius = cfg.loadingVortexRadius;
  // Halo breathes with a focused thought pulse
  const pulse = Math.sin(elapsed * cfg.loadingPulseSpeed) * 0.16 + 0.84;
  const speed = cfg.loadingVortexSpeed;

  let tx, ty, tz;

  if (isInnerRing) {
    // Primary revolving halo
    const angle = (i / totalCount) * Math.PI * 4 + elapsed * speed;
    const r = (baseRadius * 0.85 + seed * 4.0) * pulse;
    // Perspective tilt
    tx = Math.cos(angle) * r;
    ty = Math.sin(angle) * r * 0.55;
    tz = Math.sin(angle + elapsed * 1.2) * 6.0;
  } else {
    // Counter-revolving inclined cross-ring (gyroscopic cognitive focus)
    const angle = (i / totalCount) * Math.PI * 4 - elapsed * (speed * 0.85);
    const r = (baseRadius * 1.15 + seed * 5.0) * pulse;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    tx = cosA * r * 0.85;
    ty = sinA * r * 0.7 + Math.cos(elapsed * 2.0 + seed * 3.0) * 2.0;
    tz = sinA * r * 0.5;
  }

  return { tx, ty, tz, pulse };
}

export function applyLoadingForce(
  px, py, pz, tx, ty, tz, delta
) {
  const dx = tx - px;
  const dy = ty - py;
  const dz = tz - pz;

  _force.x = dx * cfg.loadingContractionForce * delta * 60;
  _force.y = dy * cfg.loadingContractionForce * delta * 60;
  _force.z = dz * cfg.loadingContractionForce * delta * 60;

  return _force;
}

// ═══════════════════════════════════════════════
// WEB PULL — Data Cascade / Reading Streams (Streaming text response)
// Horizontal flowing ribbons of light moving across behind text
// ═══════════════════════════════════════════════
export function computeWebPullTarget(i, seed, elapsed, totalCount) {
  // 5 parallel horizontal reading ribbons flowing from left to right
  const laneCount = cfg.readingStreamCount || 5;
  const laneIndex = i % laneCount;

  // Y vertical placement across reading area
  const baseY = -14 + (laneIndex / (laneCount - 1)) * 28;

  // Stream phase flows continuously from left (-50) to right (+50)
  const speed = cfg.webPullSpeed;
  const flowProgress = ((seed + elapsed * speed * 0.35) % 1.0);

  // X travels smoothly across screen
  const startX = -52;
  const endX = 52;
  const tx = startX + flowProgress * (endX - startX);

  // Gentle wave undulation along the stream
  const wave = Math.sin(tx * 0.08 + elapsed * 2.2 + laneIndex * 1.2) * 2.5;
  const ty = baseY + wave;

  // Depth wave
  const tz = Math.sin(tx * 0.06 + elapsed * 1.5) * 4.0;

  return { tx, ty, tz };
}

export function applyWebPullForce(
  px, py, pz, tx, ty, tz, delta
) {
  const dx = tx - px;
  const dy = ty - py;
  const dz = tz - pz;
  const strength = 0.32;

  _force.x = dx * strength * delta * 60;
  _force.y = dy * strength * delta * 60;
  _force.z = dz * strength * delta * 60;

  return _force;
}

// ═══════════════════════════════════════════════
// MCP ACTION — Core activation + orbital energy
// ═══════════════════════════════════════════════
export function computeMcpTarget(i, seed, elapsed, progress, totalCount) {
  const phase = (i / totalCount);

  // Core particles (inner 30%) cluster tightly
  if (phase < 0.3) {
    const coreAngle = elapsed * cfg.mcpOrbitSpeed + seed * 6.28;
    const coreR = cfg.mcpCoreRadius * seed * 0.5;
    return {
      tx: Math.cos(coreAngle) * coreR,
      ty: Math.sin(coreAngle) * coreR * 0.8,
      tz: Math.sin(coreAngle * 0.5 + seed * 3.14) * coreR * 0.3,
      isCoreParticle: true,
    };
  }

  // Orbital ring particles
  const orbitAngle = phase * Math.PI * 2 + elapsed * cfg.mcpOrbitSpeed * 0.7;
  const orbitR = cfg.mcpCoreRadius + 8 + seed * 12;
  const vertPhase = Math.sin(orbitAngle * 2 + elapsed) * 3;

  // Energy branch extending outward
  const branchT = smoothstep(0.3, 0.6, phase);
  const branchAngle = cfg.mcpBranchAngle + elapsed * 0.3;
  const branchExtend = branchT * 20 * (0.5 + progress * 0.5);

  const baseX = Math.cos(orbitAngle) * orbitR;
  const baseY = Math.sin(orbitAngle) * orbitR * 0.6 + vertPhase;
  const baseZ = Math.sin(orbitAngle * 1.5) * orbitR * 0.2;

  // Blend toward branch direction for outer particles
  const branchBlend = smoothstep(0.6, 0.9, phase) * 0.6;

  return {
    tx: baseX + Math.cos(branchAngle) * branchExtend * branchBlend,
    ty: baseY + Math.sin(branchAngle) * branchExtend * branchBlend * 0.5,
    tz: baseZ,
    isCoreParticle: false,
  };
}

export function applyMcpForce(
  px, py, pz, tx, ty, tz, delta
) {
  const dx = tx - px;
  const dy = ty - py;
  const dz = tz - pz;
  const strength = 0.28;

  _force.x = dx * strength * delta * 60;
  _force.y = dy * strength * delta * 60;
  _force.z = dz * strength * delta * 60;

  return _force;
}

// ═══════════════════════════════════════════════
// SUCCESS — Expanding spherical pulse
// ═══════════════════════════════════════════════
export function applySuccessForce(
  px, py, pz, elapsed, delta
) {
  const dist = Math.sqrt(px * px + py * py + pz * pz);
  const normalizedTime = Math.min(1, elapsed / cfg.successPulseDuration);

  // Expanding wave
  const waveRadius = normalizedTime * 40;
  const ringDist = Math.abs(dist - waveRadius);
  const ringWidth = 10;

  _force.x = 0;
  _force.y = 0;
  _force.z = 0;

  if (ringDist < ringWidth && dist > 0.1) {
    const influence = (1 - ringDist / ringWidth) * (1 - normalizedTime);
    const expandForce = cfg.successExpandForce * influence * delta * 60;
    const invDist = 1 / dist;
    _force.x = px * invDist * expandForce;
    _force.y = py * invDist * expandForce;
    _force.z = pz * invDist * expandForce;
  }

  return _force;
}

// ═══════════════════════════════════════════════
// ERROR — Contraction + jitter
// ═══════════════════════════════════════════════
export function applyErrorForce(
  px, py, pz, seed, elapsed, delta
) {
  const dist = Math.sqrt(px * px + py * py + pz * pz);
  const normalizedTime = Math.min(1, elapsed / cfg.errorDuration);

  // Contract inward
  const contractionPhase = Math.sin(normalizedTime * Math.PI);

  _force.x = 0;
  _force.y = 0;
  _force.z = 0;

  if (dist > 0.1) {
    const pullStrength = cfg.errorContractionForce * contractionPhase * delta * 60;
    const invDist = 1 / dist;
    _force.x = -px * invDist * pullStrength;
    _force.y = -py * invDist * pullStrength;
    _force.z = -pz * invDist * pullStrength;
  }

  // Jitter
  const jitterDecay = 1 - normalizedTime;
  const jitter = cfg.errorJitterStrength * jitterDecay * delta * 60;
  _force.x += (Math.sin(elapsed * 47 + seed * 100) - 0.5) * jitter;
  _force.y += (Math.sin(elapsed * 53 + seed * 200) - 0.5) * jitter;
  _force.z += (Math.sin(elapsed * 61 + seed * 300) - 0.5) * jitter;

  return _force;
}
