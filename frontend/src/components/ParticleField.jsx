/* ===================================================================
   PARTICLEFIELD.JSX — Backwards-compatible re-export
   Original starfield replaced by the full 3D particle engine
   =================================================================== */

export { ParticleBackground as ParticleField } from './ParticleBackground/ParticleBackground.jsx';

// Also re-export the event API for convenience
export { particleEngine } from './ParticleBackground/particleEvents.js';
