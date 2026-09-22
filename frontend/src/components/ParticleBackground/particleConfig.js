/* ===================================================================
   PARTICLE CONFIG — Tunable parameters for the 3D particle system
   =================================================================== */

// Detect mobile / low-power device
const isMobile = typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);

const prefersReducedMotion = typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const particleConfig = {
  // ── Particle Counts ──
  desktopCount: 8000,
  mobileCount: 3000,
  isMobile,
  prefersReducedMotion,

  // ── Rendering ──
  maxPixelRatio: isMobile ? 1.25 : 1.75,
  clearColor: 0x010208,
  fov: 65,
  nearPlane: 0.1,
  farPlane: 600,

  // ── Particle Appearance (Glowing circular dust motes) ──
  particleSizeBase: 4.5,
  particleSizeVariance: 3.0,
  depthFadeNear: 5.0,
  depthFadeFar: 200.0,

  // ── Camera ──
  cameraZ: 60,
  cameraParallaxStrength: 0.025,
  cameraDriftSpeed: 0.05,
  cameraDriftAmount: 2.0,

  // ── Idle Behavior ──
  idleDriftSpeed: 0.22,
  idleOrbitSpeed: 0.012,
  idleNoiseScale: 0.015,
  idleNoiseSpeed: 0.12,
  idleCenterClearRadius: 9,

  // ── Cursor Interaction ──
  interactionRadius: 16.0,
  interactionStrength: 0.55,
  interactionFalloff: 2.0,
  cursorBrightnessBoost: 0.55,
  cursorVortexStrength: 0.25,
  cursorTrailDecay: 0.92,

  // ── Shockwave ──
  shockwaveSpeed: 55.0,
  shockwaveForce: 14.0,
  shockwaveDecay: 0.88,
  shockwaveMaxRadius: 70.0,

  // ── State Behaviors (Physical & Relatable) ──
  greetDuration: 2.5,
  greetScatterRadius: 80,
  greetTargetRadius: 25,
  greetSpringDamping: 0.14,

  // Thinking: Updraft Cyclone
  loadingVortexSpeed: 2.2,
  loadingVortexRadius: 22,
  loadingCycloneSpeed: 2.4,
  loadingCycloneRadius: 20,
  loadingUpdraftSpeed: 1.5,
  loadingPulseSpeed: 2.2,
  loadingContractionForce: 0.32,

  // Streaming: Reading Stream (horizontal ribbons)
  readingStreamCount: 5,
  readingStreamWidth: 55,
  readingStreamHeight: 28,
  readingStreamSpeed: 0.65,
  readingStreamWobble: 1.2,

  // Backwards compatibility aliases
  webPullStreamCount: 5,
  webPullSourceRadius: 55,
  webPullSpeed: 0.65,
  webPullAcceleration: 2.0,

  mcpCoreRadius: 8,
  mcpOrbitSpeed: 2.0,
  mcpBranchAngle: 0,
  mcpEnergySpeed: 0.8,

  // Success: Joyful Buoyant Upward Gust
  successPulseDuration: 1.4,
  successExpandForce: 8.0,
  successUpdraftForce: 12.0,
  successBrightnessBoost: 0.85,

  // Error: Flutter Jitter & Shivering Descent
  errorDuration: 1.1,
  errorContractionForce: 3.5,
  errorJitterStrength: 1.8,
  errorDescentForce: 4.0,

  // ── Transition ──
  stateTransitionSpeed: 2.5,
  velocityDamping: 0.90,

  // ── Colors (Luminous Origami Parchment Palette) ──
  colors: {
    idle:     { primary: 0x93bbfc, secondary: 0x5b9bf8, accent: 0xe0edff }, // luminous celestial paper
    loading:  { primary: 0x818cf8, secondary: 0x6366f1, accent: 0xc7d2fe }, // thoughtful warm indigo
    web:      { primary: 0x38bdf8, secondary: 0x0284c7, accent: 0xbae6fd }, // stream cyan
    mcp:      { primary: 0xc084fc, secondary: 0x9333ea, accent: 0xf3e8ff }, // creative violet
    success:  { primary: 0x4ade80, secondary: 0x16a34a, accent: 0xdcfce7 }, // vibrant success mint
    error:    { primary: 0xf87171, secondary: 0xdc2626, accent: 0xfee2e2 }, // warm coral alert
  },

  // ── Adaptive Quality ──
  fpsLowThreshold: 42,
  fpsHighThreshold: 55,
  fpsCheckInterval: 1.0,
  qualityReduceStep: 0.85,
  qualityRestoreStep: 1.05,
  minQuality: 0.3,

  // ── Distribution & Ambient Field ──
  fieldRadius: 55,
  fieldDepthRange: 40,

  activeParticleRatio: 0.5,
  ambientFieldWidth: 65,
  ambientFieldHeight: 40,
  ambientFieldDepth: 25,
  ambientHomeForce: 0.02,
};
