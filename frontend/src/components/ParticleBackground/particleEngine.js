/* ===================================================================
   PARTICLE ENGINE — Three.js scene, renderer, buffer management,
   RAF loop, adaptive quality, and state-driven particle updates
   =================================================================== */

import * as THREE from 'three';
import { particleConfig as cfg } from './particleConfig.js';
import { ParticleStateMachine, STATES } from './particleStateMachine.js';
import { particleVertexShader } from './shaders/particle.vert.js';
import { particleFragmentShader } from './shaders/particle.frag.js';
import {
  applyIdleForce,
  applyAmbientForce,
  applyCursorForce,
  cursorBrightness,
  applyShockwaveForce,
  computeGreetTarget,
  applyGreetForce,
  computeLoadingTarget,
  applyLoadingForce,
  computeWebPullTarget,
  applyWebPullForce,
  computeMcpTarget,
  applyMcpForce,
  applySuccessForce,
  applyErrorForce,
} from './particleBehaviors.js';

export class ParticleEngine {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.points = null;
    this.geometry = null;
    this.material = null;

    this.stateMachine = new ParticleStateMachine();

    // ── Buffer arrays ──
    this.positions = null;
    this.velocities = null;
    this.colors = null;
    this.targetColors = null;
    this.sizes = null;
    this.alphas = null;
    this.seeds = null;
    this.homePositions = null; // Initial scatter positions for greet

    this.particleCount = 0;
    this.activeCount = 0;  // For adaptive quality drawRange
    this.qualityScale = 1.0;

    // ── Cursor ──
    this.cursorWorld = { x: 0, y: 0, z: 0 };
    this.cursorSmooth = { x: 0, y: 0, z: 0 };
    this.cursorNDC = { x: 0, y: 0 };

    // ── Camera drift ──
    this.cameraDrift = { x: 0, y: 0 };

    // ── Shockwave ──
    this.shockwave = { active: false, x: 0, y: 0, z: 0, radius: 0 };

    // ── FPS monitoring ──
    this.fpsFrames = 0;
    this.fpsAccumulator = 0;
    this.lastFps = 60;

    // ── State color targets ──
    this._stateColor = new THREE.Color();
    this._stateColorSecondary = new THREE.Color();

    // ── Animation ──
    this._animId = null;
    this._clock = new THREE.Clock();
    this._canvas = null;
    this._disposed = false;

    // ── Reduced motion ──
    this._reducedMotion = cfg.prefersReducedMotion;
  }

  // ═══════════════════════════════════════════════════════
  // INIT — Create renderer, scene, camera, particles
  // ═══════════════════════════════════════════════════════
  init(canvas) {
    this._canvas = canvas;
    this._disposed = false;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.maxPixelRatio));
    this.renderer.setClearColor(cfg.clearColor, 1);

    // ── Scene ──
    this.scene = new THREE.Scene();

    // ── Camera ──
    this.camera = new THREE.PerspectiveCamera(
      cfg.fov, width / height, cfg.nearPlane, cfg.farPlane
    );
    this.camera.position.set(0, 0, cfg.cameraZ);
    this.camera.lookAt(0, 0, 0);

    // ── Particles ──
    this.particleCount = cfg.isMobile ? cfg.mobileCount : cfg.desktopCount;
    this.activeCount = this.particleCount;
    this._createParticles();

    // ── Events ──
    this._bindEvents();

    // ── Start ──
    this._clock.start();
    this.stateMachine.setState(STATES.GREET);
    this._animate();
  }

  // ═══════════════════════════════════════════════════════
  // CREATE PARTICLES — Geometry + ShaderMaterial + Buffers
  // ═══════════════════════════════════════════════════════
  _createParticles() {
    const count = this.particleCount;

    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.targetColors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.seeds = new Float32Array(count);
    this.homePositions = new Float32Array(count * 3);

    // Initialize particles scattered wide (for GREET to converge from)
    const idleColor = new THREE.Color(cfg.colors.idle.primary);
    const idleSecondary = new THREE.Color(cfg.colors.idle.secondary);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = pseudoRandom(i);
      this.seeds[i] = seed;

      // Home positions: fill the entire viewport area
      // Distributed uniformly across the visible frustum
      const hx = (pseudoRandom(i + count) * 2 - 1) * cfg.ambientFieldWidth;
      const hy = (pseudoRandom(i + count * 2) * 2 - 1) * cfg.ambientFieldHeight;
      const hz = (pseudoRandom(i + count * 3) * 2 - 1) * cfg.ambientFieldDepth;

      this.homePositions[i3] = hx;
      this.homePositions[i3 + 1] = hy;
      this.homePositions[i3 + 2] = hz;

      // Start positions: scattered even wider for the greet animation
      const scatterScale = 1.6;
      this.positions[i3] = hx * scatterScale + (pseudoRandom(i + count * 4) - 0.5) * 40;
      this.positions[i3 + 1] = hy * scatterScale + (pseudoRandom(i + count * 5) - 0.5) * 40;
      this.positions[i3 + 2] = hz * scatterScale + (pseudoRandom(i + count * 6) - 0.5) * 20;

      // Zero velocity
      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      // Color: blend between primary and secondary
      const mix = seed;
      const c = idleColor.clone().lerp(idleSecondary, mix);
      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;
      this.targetColors[i3] = c.r;
      this.targetColors[i3 + 1] = c.g;
      this.targetColors[i3 + 2] = c.b;

      // Size + alpha
      this.sizes[i] = cfg.particleSizeBase + seed * cfg.particleSizeVariance;
      this.alphas[i] = 0.05 + seed * 0.3; // Start very dim for greet fade-in
    }

    // ── Geometry ──
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));

    this.geometry.setDrawRange(0, this.activeCount);

    // ── Material ──
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uStateIntensity: { value: 0 },
        uDepthFadeNear: { value: cfg.depthFadeNear },
        uDepthFadeFar: { value: cfg.depthFadeFar },
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    // ── Points ──
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  // ═══════════════════════════════════════════════════════
  // EVENT BINDING — Document-level pointer tracking
  // ═══════════════════════════════════════════════════════
  _bindEvents() {
    this._onMouseMove = (e) => {
      this.cursorNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.cursorNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    this._onClick = (e) => {
      // Project click to 3D for shockwave
      this.cursorNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.cursorNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._updateCursorWorldPosition();
      this.triggerShockwave();
    };

    this._onTouchMove = (e) => {
      if (e.touches.length > 0) {
        this.cursorNDC.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        this.cursorNDC.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    };

    this._onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cfg.maxPixelRatio));
      this.material.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    };

    document.addEventListener('mousemove', this._onMouseMove, { passive: true });
    document.addEventListener('click', this._onClick);
    document.addEventListener('touchmove', this._onTouchMove, { passive: true });
    window.addEventListener('resize', this._onResize);
  }

  // ═══════════════════════════════════════════════════════
  // CURSOR PROJECTION — NDC to world-space on z=0 plane
  // ═══════════════════════════════════════════════════════
  _updateCursorWorldPosition() {
    // Simple projection onto z=0 plane using camera
    const halfFov = (cfg.fov / 2) * (Math.PI / 180);
    const z = this.camera.position.z;
    const planeHeight = 2 * z * Math.tan(halfFov);
    const planeWidth = planeHeight * this.camera.aspect;

    this.cursorWorld.x = this.cursorNDC.x * planeWidth * 0.5 + this.camera.position.x;
    this.cursorWorld.y = this.cursorNDC.y * planeHeight * 0.5 + this.camera.position.y;
    this.cursorWorld.z = 0;
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC API — Called by particleEvents
  // ═══════════════════════════════════════════════════════
  setState(state) {
    this.stateMachine.setState(state);
    this._updateStateColors(state);
  }

  triggerShockwave(x, y) {
    if (x !== undefined && y !== undefined) {
      // Project screen coords
      this.cursorNDC.x = (x / window.innerWidth) * 2 - 1;
      this.cursorNDC.y = -(y / window.innerHeight) * 2 + 1;
      this._updateCursorWorldPosition();
    }
    this.shockwave.active = true;
    this.shockwave.x = this.cursorSmooth.x;
    this.shockwave.y = this.cursorSmooth.y;
    this.shockwave.z = 0;
    this.shockwave.radius = 0;
  }

  setProgress(p) {
    this.stateMachine.setProgress(p);
  }

  setInteraction(x, y, z) {
    this.cursorWorld.x = x;
    this.cursorWorld.y = y;
    this.cursorWorld.z = z || 0;
  }

  setActionType(type) {
    this.stateMachine.setActionType(type);
    // Set branch angle based on type hash
    let hash = 0;
    for (let i = 0; i < (type || '').length; i++) {
      hash = ((hash << 5) - hash + type.charCodeAt(i)) | 0;
    }
    cfg.mcpBranchAngle = (Math.abs(hash) % 628) / 100;
  }

  setWebSource(/* position */) {
    // Could add dynamic web source points; not critical
  }

  // ═══════════════════════════════════════════════════════
  // STATE COLORS — Update target colors for state
  // ═══════════════════════════════════════════════════════
  _updateStateColors(state) {
    let colorSet;
    switch (state) {
      case STATES.LOADING:    colorSet = cfg.colors.loading; break;
      case STATES.WEB_PULL:   colorSet = cfg.colors.web; break;
      case STATES.MCP_ACTION: colorSet = cfg.colors.mcp; break;
      case STATES.SUCCESS:    colorSet = cfg.colors.success; break;
      case STATES.ERROR:      colorSet = cfg.colors.error; break;
      default:                colorSet = cfg.colors.idle; break;
    }

    this._stateColor.setHex(colorSet.primary);
    this._stateColorSecondary.setHex(colorSet.secondary);

    // Set target colors for smooth transition
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const mix = this.seeds[i];
      const r = this._stateColor.r + (this._stateColorSecondary.r - this._stateColor.r) * mix;
      const g = this._stateColor.g + (this._stateColorSecondary.g - this._stateColor.g) * mix;
      const b = this._stateColor.b + (this._stateColorSecondary.b - this._stateColor.b) * mix;
      this.targetColors[i3] = r;
      this.targetColors[i3 + 1] = g;
      this.targetColors[i3 + 2] = b;
    }
  }

  // ═══════════════════════════════════════════════════════
  // ANIMATION LOOP
  // ═══════════════════════════════════════════════════════
  _animate() {
    if (this._disposed) return;
    this._animId = requestAnimationFrame(() => this._animate());

    const delta = Math.min(this._clock.getDelta(), 0.05); // Cap delta
    const elapsed = this._clock.getElapsedTime();

    // ── FPS monitoring ──
    this.fpsFrames++;
    this.fpsAccumulator += delta;
    if (this.fpsAccumulator >= cfg.fpsCheckInterval) {
      this.lastFps = this.fpsFrames / this.fpsAccumulator;
      this.fpsFrames = 0;
      this.fpsAccumulator = 0;
      this._adaptQuality();
    }

    // ── State machine ──
    this.stateMachine.update(delta, elapsed);
    const state = this.stateMachine.currentState;
    const stateElapsed = this.stateMachine.stateElapsed;
    const transition = this.stateMachine.getTransitionEase();

    // ── Cursor smooth ──
    this._updateCursorWorldPosition();
    const cursorLerp = 5.0 * delta;
    this.cursorSmooth.x += (this.cursorWorld.x - this.cursorSmooth.x) * cursorLerp;
    this.cursorSmooth.y += (this.cursorWorld.y - this.cursorSmooth.y) * cursorLerp;
    this.cursorSmooth.z += (this.cursorWorld.z - this.cursorSmooth.z) * cursorLerp;

    // ── Shockwave ──
    if (this.shockwave.active) {
      this.shockwave.radius += cfg.shockwaveSpeed * delta;
      if (this.shockwave.radius > cfg.shockwaveMaxRadius) {
        this.shockwave.active = false;
      }
    }

    // ── Camera drift ──
    const driftMotion = this._reducedMotion ? 0.1 : 1;
    this.cameraDrift.x = Math.sin(elapsed * cfg.cameraDriftSpeed * 0.7) * cfg.cameraDriftAmount * driftMotion;
    this.cameraDrift.y = Math.cos(elapsed * cfg.cameraDriftSpeed) * cfg.cameraDriftAmount * 0.5 * driftMotion;

    this.camera.position.x = this.cursorNDC.x * cfg.cameraParallaxStrength * cfg.cameraZ + this.cameraDrift.x;
    this.camera.position.y = this.cursorNDC.y * cfg.cameraParallaxStrength * cfg.cameraZ * 0.6 + this.cameraDrift.y;
    this.camera.position.z = cfg.cameraZ;
    this.camera.lookAt(0, 0, 0);

    // ── State intensity for shader ──
    let stateIntensity = 0;
    if (state === STATES.LOADING || state === STATES.WEB_PULL || state === STATES.MCP_ACTION) {
      stateIntensity = transition;
    } else if (state === STATES.SUCCESS) {
      stateIntensity = 1 - (stateElapsed / cfg.successPulseDuration);
    } else if (state === STATES.ERROR) {
      stateIntensity = Math.sin(stateElapsed / cfg.errorDuration * Math.PI) * 0.6;
    } else if (state === STATES.GREET) {
      stateIntensity = Math.min(1, stateElapsed / cfg.greetDuration) * 0.5;
    }

    // ── Update particles ──
    this._updateParticles(state, stateElapsed, elapsed, delta, transition);

    // ── Update uniforms ──
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uStateIntensity.value = stateIntensity;

    // ── Render ──
    this.renderer.render(this.scene, this.camera);
  }

  // ═══════════════════════════════════════════════════════
  // UPDATE PARTICLES — Per-frame physics
  // ═══════════════════════════════════════════════════════
  _updateParticles(state, stateElapsed, elapsed, delta, transition) {
    const count = this.activeCount;
    const pos = this.positions;
    const vel = this.velocities;
    const col = this.colors;
    const tcol = this.targetColors;
    const alphas = this.alphas;
    const seeds = this.seeds;
    const homes = this.homePositions;
    const damping = cfg.velocityDamping;
    const motionScale = this._reducedMotion ? 0.15 : 1;

    const cx = this.cursorSmooth.x;
    const cy = this.cursorSmooth.y;
    const cz = this.cursorSmooth.z;

    // Only a fraction of particles form shapes; the rest stay ambient
    const activeThreshold = Math.floor(count * cfg.activeParticleRatio);
    // Is this a state where particles should form a shape?
    const isShapeState = (
      state === STATES.LOADING ||
      state === STATES.WEB_PULL ||
      state === STATES.MCP_ACTION
    );

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = seeds[i];
      let px = pos[i3];
      let py = pos[i3 + 1];
      let pz = pos[i3 + 2];
      let vx = vel[i3];
      let vy = vel[i3 + 1];
      let vz = vel[i3 + 2];

      const hx = homes[i3];
      const hy = homes[i3 + 1];
      const hz = homes[i3 + 2];

      // Is this particle an "active" one that forms shapes,
      // or an "ambient" one that keeps floating?
      const isActive = isShapeState && (i < activeThreshold);

      // ── Compute state-specific force ──
      let fx = 0, fy = 0, fz = 0;

      switch (state) {
        case STATES.GREET: {
          // ALL particles converge to their home positions
          const target = computeGreetTarget(i, seed, stateElapsed, count, hx, hy, hz);
          const spring = applyGreetForce(px, py, pz, vx, vy, vz, target.tx, target.ty, target.tz, target.ease, delta);
          fx = spring.x;
          fy = spring.y;
          fz = spring.z;
          alphas[i] = 0.15 + target.ease * 0.5 + target.pulse * 0.3;
          break;
        }

        case STATES.IDLE: {
          // ALL particles: ambient drift near home
          const ambient = applyAmbientForce(px, py, pz, hx, hy, hz, seed, elapsed, delta);
          fx = ambient.x * motionScale;
          fy = ambient.y * motionScale;
          fz = ambient.z * motionScale;
          alphas[i] = 0.35 + seed * 0.45;
          break;
        }

        case STATES.LOADING: {
          if (isActive) {
            // Active particles form the vortex
            const target = computeLoadingTarget(i, seed, elapsed, this.stateMachine.progress, activeThreshold);
            const force = applyLoadingForce(px, py, pz, target.tx, target.ty, target.tz, delta);
            fx = force.x;
            fy = force.y;
            fz = force.z;
            alphas[i] = (0.3 + seed * 0.5) * target.pulse;
          } else {
            // Ambient particles keep floating
            const ambient = applyAmbientForce(px, py, pz, hx, hy, hz, seed, elapsed, delta);
            fx = ambient.x * motionScale;
            fy = ambient.y * motionScale;
            fz = ambient.z * motionScale;
            alphas[i] = 0.2 + seed * 0.3;
          }
          break;
        }

        case STATES.WEB_PULL: {
          if (isActive) {
            // Active particles form directional streams
            const target = computeWebPullTarget(i, seed, elapsed, activeThreshold);
            const force = applyWebPullForce(px, py, pz, target.tx, target.ty, target.tz, delta);
            fx = force.x;
            fy = force.y;
            fz = force.z;
            alphas[i] = 0.3 + seed * 0.5;
          } else {
            // Ambient particles keep floating
            const ambient = applyAmbientForce(px, py, pz, hx, hy, hz, seed, elapsed, delta);
            fx = ambient.x * motionScale;
            fy = ambient.y * motionScale;
            fz = ambient.z * motionScale;
            alphas[i] = 0.2 + seed * 0.3;
          }
          break;
        }

        case STATES.MCP_ACTION: {
          if (isActive) {
            // Active particles form core + orbital
            const target = computeMcpTarget(i, seed, elapsed, this.stateMachine.progress, activeThreshold);
            const force = applyMcpForce(px, py, pz, target.tx, target.ty, target.tz, delta);
            fx = force.x;
            fy = force.y;
            fz = force.z;
            alphas[i] = target.isCoreParticle ? (0.6 + seed * 0.4) : (0.25 + seed * 0.45);
          } else {
            // Ambient particles keep floating
            const ambient = applyAmbientForce(px, py, pz, hx, hy, hz, seed, elapsed, delta);
            fx = ambient.x * motionScale;
            fy = ambient.y * motionScale;
            fz = ambient.z * motionScale;
            alphas[i] = 0.2 + seed * 0.3;
          }
          break;
        }

        case STATES.SUCCESS: {
          // ALL particles get success pulse + ambient drift
          const force = applySuccessForce(px, py, pz, stateElapsed, delta);
          const ambient = applyAmbientForce(px, py, pz, hx, hy, hz, seed, elapsed, delta);
          fx = force.x + ambient.x * 0.3;
          fy = force.y + ambient.y * 0.3;
          fz = force.z + ambient.z * 0.3;
          const brightness = Math.max(0, 1 - stateElapsed / cfg.successPulseDuration);
          alphas[i] = 0.35 + seed * 0.45 + brightness * cfg.successBrightnessBoost;
          break;
        }

        case STATES.ERROR: {
          // ALL particles get error disturbance + ambient drift
          const force = applyErrorForce(px, py, pz, seed, stateElapsed, delta);
          const ambient = applyAmbientForce(px, py, pz, hx, hy, hz, seed, elapsed, delta);
          fx = force.x + ambient.x * 0.2;
          fy = force.y + ambient.y * 0.2;
          fz = force.z + ambient.z * 0.2;
          alphas[i] = 0.3 + seed * 0.4;
          break;
        }

        default: {
          // Fallback: ambient
          const ambient = applyAmbientForce(px, py, pz, hx, hy, hz, seed, elapsed, delta);
          fx = ambient.x * motionScale;
          fy = ambient.y * motionScale;
          fz = ambient.z * motionScale;
          alphas[i] = 0.35 + seed * 0.45;
          break;
        }
      }

      // ── Cursor interaction (always active except during greet) ──
      if (state !== STATES.GREET) {
        const cursorF = applyCursorForce(px, py, pz, cx, cy, cz, delta);
        fx += cursorF.x * motionScale;
        fy += cursorF.y * motionScale;
        fz += cursorF.z * motionScale;

        // Cursor brightness boost
        const cBright = cursorBrightness(px, py, pz, cx, cy, cz);
        if (cBright > 0) {
          alphas[i] = Math.min(1, alphas[i] + cBright);
        }
      }

      // ── Shockwave ──
      if (this.shockwave.active) {
        const sw = applyShockwaveForce(
          px, py, pz,
          this.shockwave.x, this.shockwave.y, this.shockwave.z,
          this.shockwave.radius, delta
        );
        fx += sw.x * motionScale;
        fy += sw.y * motionScale;
        fz += sw.z * motionScale;
      }

      // ── Integrate velocity ──
      vx = (vx + fx) * damping;
      vy = (vy + fy) * damping;
      vz = (vz + fz) * damping;

      // ── Integrate position ──
      px += vx;
      py += vy;
      pz += vz;

      // ── Write back ──
      pos[i3] = px;
      pos[i3 + 1] = py;
      pos[i3 + 2] = pz;
      vel[i3] = vx;
      vel[i3 + 1] = vy;
      vel[i3 + 2] = vz;

      // ── Smooth color transition ──
      const colorLerp = 3.0 * delta;
      col[i3] += (tcol[i3] - col[i3]) * colorLerp;
      col[i3 + 1] += (tcol[i3 + 1] - col[i3 + 1]) * colorLerp;
      col[i3 + 2] += (tcol[i3 + 2] - col[i3 + 2]) * colorLerp;
    }

    // ── Mark buffers dirty ──
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }

  // ═══════════════════════════════════════════════════════
  // ADAPTIVE QUALITY — FPS-based particle count reduction
  // ═══════════════════════════════════════════════════════
  _adaptQuality() {
    if (this.lastFps < cfg.fpsLowThreshold && this.qualityScale > cfg.minQuality) {
      this.qualityScale *= cfg.qualityReduceStep;
    } else if (this.lastFps > cfg.fpsHighThreshold && this.qualityScale < 1.0) {
      this.qualityScale = Math.min(1.0, this.qualityScale * cfg.qualityRestoreStep);
    }

    this.activeCount = Math.floor(this.particleCount * this.qualityScale);
    this.geometry.setDrawRange(0, this.activeCount);
  }

  // ═══════════════════════════════════════════════════════
  // DISPOSE — Clean shutdown
  // ═══════════════════════════════════════════════════════
  dispose() {
    this._disposed = true;
    if (this._animId) cancelAnimationFrame(this._animId);

    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('resize', this._onResize);

    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.renderer) this.renderer.dispose();

    this.scene = null;
    this.camera = null;
    this.points = null;
  }
}

// ── Deterministic pseudo-random ──
function pseudoRandom(i) {
  let x = Math.sin(i * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
