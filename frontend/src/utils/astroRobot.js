/* ===================================================================
   ASTROROBOT.JS — Three.js Engine & Astro Bot Mascot with Live Styling API
   =================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class AstroSceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.isDestroyed = false;

    // Masot Mesh Groups
    this.rootGroup = null;
    this.bobGroup = null;
    this.bodyGroup = null;
    this.headGroup = null;
    this.visorMesh = null;
    this.leftHand = null;
    this.rightHand = null;
    this.antennaOrb = null;
    this.antennaPole = null;
    this.thrusterGlowL = null;
    this.thrusterGlowR = null;

    // Materials (Accessible for live styling)
    this.materials = {
      armor: null,
      accent: null,
      glow: null,
      visor: null,
    };

    // Dynamic 2D Canvas Face
    this.faceCanvas = null;
    this.faceCtx = null;
    this.faceTexture = null;

    // Interaction & Animation State
    this.clickableMeshes = [];
    this.currentState = 'idle';
    this.stateTimer = 0;
    this.mouseNDC = { x: 0, y: 0 };
    this.targetRot = { x: 0, y: 0 };
    this.eyeGaze = { x: 0, y: 0 };

    // Blinking
    this.blinkTimer = 0;
    this.nextBlinkInterval = 3.2;
    this.isBlinking = false;
    this.blinkScale = 1.0;

    // Idle Thoughts
    this.idleTimer = 0;
    this.onThought = null;

    // Base Offsets
    this.baseLeftHandPos = new THREE.Vector3(-0.95, 0.95, 0.05);
    this.baseRightHandPos = new THREE.Vector3(0.95, 0.95, 0.05);

    // Bindings
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  init() {
    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setClearColor(0x04060d, 1);

    // 2. Scene with Fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x04060d, 0.016);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 4.5);
    this.camera.lookAt(0, 1.35, 0);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.6;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 12.0;
    this.controls.maxPolarAngle = Math.PI * 0.82;
    this.controls.target.set(0, 1.35, 0);
    this.controls.update();

    // 5. Lights & Environment
    this.setupLights();
    this.createEnvironment();

    // 6. Build Astro Bot
    this.buildRobot();

    // 7. Event Listeners
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });

    // 8. Start Loop
    this.animate();
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0x93c5fd, 0.5);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3.5, 6, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fillLight.position.set(-4, 3, 2);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x0088ff, 2.5, 14);
    rimLight.position.set(0, 3, -3.5);
    this.scene.add(rimLight);

    const upLight = new THREE.PointLight(0x00f2ff, 1.2, 7);
    upLight.position.set(0, -0.2, 1.5);
    this.scene.add(upLight);
  }

  createEnvironment() {
    // Starfield
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x60a5fa),
      new THREE.Color(0xa78bfa),
      new THREE.Color(0x34d399),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 40 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.85,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);

    // Ground Disc with Concentric Neon Rings
    const floorGroup = new THREE.Group();
    const discGeom = new THREE.CircleGeometry(3.5, 64);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x060a14,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.01;
    floorGroup.add(disc);

    const ringGeom = new THREE.RingGeometry(3.3, 3.45, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    floorGroup.add(ring);

    this.scene.add(floorGroup);
  }

  // ─── Face Texture Initialization ─────────────────────────
  initFaceTexture() {
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 512;
    this.faceCanvas.height = 512;
    this.faceCtx = this.faceCanvas.getContext('2d');

    this.faceTexture = new THREE.CanvasTexture(this.faceCanvas);
    this.faceTexture.colorSpace = THREE.SRGBColorSpace;
    this.faceTexture.minFilter = THREE.LinearFilter;
    this.faceTexture.magFilter = THREE.LinearFilter;

    this.renderFace(0);
  }

  renderFace(elapsed = 0) {
    if (!this.faceCtx) return;

    const ctx = this.faceCtx;
    const w = 512;
    const h = 512;

    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Visor glass glare curve
    const grad = ctx.createLinearGradient(0, 0, 0, 180);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    grad.addColorStop(0.5, 'rgba(0, 220, 255, 0.04)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(w / 2, 40, 220, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scanlines
    ctx.fillStyle = 'rgba(0, 240, 255, 0.018)';
    for (let y = 0; y < h; y += 8) {
      ctx.fillRect(0, y, w, 2);
    }

    const baseEyeY = 240;
    const leftEyeX = 175 + this.eyeGaze.x * 32;
    const rightEyeX = 337 + this.eyeGaze.x * 32;
    const eyeY = baseEyeY + this.eyeGaze.y * 24;

    const glowColor = this.currentGlowColor || '#00f2ff';

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;

    switch (this.currentState) {
      case 'happy':
      case 'giggle':
        this.drawHappyEye(leftEyeX, eyeY - 10, glowColor);
        this.drawHappyEye(rightEyeX, eyeY - 10, glowColor);
        this.drawSmileMouth(w / 2 + this.eyeGaze.x * 12, 380, true, glowColor);
        break;

      case 'think':
        this.drawPensiveLeftEye(leftEyeX + 15, eyeY - 15, glowColor);
        this.drawPensiveRightEye(rightEyeX + 15, eyeY - 15, glowColor);
        this.drawCuriousMouth(w / 2 + 10, 385, glowColor);
        break;

      case 'poke':
        this.drawSqueezeEye(leftEyeX, eyeY, false, glowColor);
        this.drawSqueezeEye(rightEyeX, eyeY, true, glowColor);
        this.drawSurprisedMouth(w / 2, 380, 16, glowColor);
        break;

      case 'high_five':
      case 'wink':
        this.drawHappyEye(leftEyeX, eyeY - 8, glowColor);
        this.drawCapsuleEye(rightEyeX, eyeY, 76, 92, 1.0, glowColor);
        this.drawSmileMouth(w / 2, 380, true, glowColor);
        break;

      case 'speaking':
        this.drawCapsuleEye(leftEyeX, eyeY, 74, 94, this.blinkScale, glowColor);
        this.drawCapsuleEye(rightEyeX, eyeY, 74, 94, this.blinkScale, glowColor);
        const mouthOpen = 8 + Math.abs(Math.sin(elapsed * 12)) * 16;
        this.drawSurprisedMouth(w / 2 + this.eyeGaze.x * 10, 380, mouthOpen, glowColor);
        break;

      default:
        this.drawCapsuleEye(leftEyeX, eyeY, 74, 94, this.blinkScale, glowColor);
        this.drawCapsuleEye(rightEyeX, eyeY, 74, 94, this.blinkScale, glowColor);
        this.drawSmileMouth(w / 2 + this.eyeGaze.x * 10, 382, false, glowColor);
        break;
    }

    ctx.restore();

    if (this.faceTexture) {
      this.faceTexture.needsUpdate = true;
    }
  }

  drawCapsuleEye(cx, cy, width, height, scaleY, color) {
    const effH = Math.max(6, height * scaleY);
    const r = Math.min(width / 2, effH / 2);

    this.faceCtx.fillStyle = color;
    this.faceCtx.beginPath();
    this.faceCtx.roundRect(cx - width / 2, cy - effH / 2, width, effH, r);
    this.faceCtx.fill();

    if (scaleY > 0.4) {
      this.faceCtx.save();
      this.faceCtx.shadowBlur = 0;
      this.faceCtx.fillStyle = '#ffffff';
      this.faceCtx.beginPath();
      this.faceCtx.arc(cx + width * 0.18, cy - effH * 0.22, 10, 0, Math.PI * 2);
      this.faceCtx.fill();

      this.faceCtx.beginPath();
      this.faceCtx.arc(cx - width * 0.15, cy + effH * 0.18, 5, 0, Math.PI * 2);
      this.faceCtx.fill();
      this.faceCtx.restore();
    }
  }

  drawHappyEye(cx, cy, color) {
    this.faceCtx.strokeStyle = color;
    this.faceCtx.lineWidth = 18;
    this.faceCtx.lineCap = 'round';
    this.faceCtx.beginPath();
    this.faceCtx.arc(cx, cy + 18, 42, Math.PI * 1.15, Math.PI * 1.85, false);
    this.faceCtx.stroke();
  }

  drawPensiveLeftEye(cx, cy, color) {
    this.faceCtx.fillStyle = color;
    this.faceCtx.beginPath();
    this.faceCtx.roundRect(cx - 36, cy - 36, 74, 65, 24);
    this.faceCtx.fill();
    this.faceCtx.fillStyle = '#ffffff';
    this.faceCtx.beginPath();
    this.faceCtx.arc(cx + 12, cy - 15, 8, 0, Math.PI * 2);
    this.faceCtx.fill();
  }

  drawPensiveRightEye(cx, cy, color) {
    this.faceCtx.fillStyle = color;
    this.faceCtx.beginPath();
    this.faceCtx.roundRect(cx - 36, cy - 20, 74, 48, 20);
    this.faceCtx.fill();
    this.faceCtx.fillStyle = '#ffffff';
    this.faceCtx.beginPath();
    this.faceCtx.arc(cx + 12, cy - 5, 7, 0, Math.PI * 2);
    this.faceCtx.fill();
  }

  drawSqueezeEye(cx, cy, isRight, color) {
    this.faceCtx.strokeStyle = color;
    this.faceCtx.lineWidth = 16;
    this.faceCtx.lineCap = 'round';
    this.faceCtx.beginPath();
    if (!isRight) {
      this.faceCtx.moveTo(cx + 25, cy - 25);
      this.faceCtx.lineTo(cx - 20, cy);
      this.faceCtx.lineTo(cx + 25, cy + 25);
    } else {
      this.faceCtx.moveTo(cx - 25, cy - 25);
      this.faceCtx.lineTo(cx + 20, cy);
      this.faceCtx.lineTo(cx - 25, cy + 25);
    }
    this.faceCtx.stroke();
  }

  drawSmileMouth(cx, cy, big = false, color) {
    this.faceCtx.strokeStyle = color;
    this.faceCtx.lineWidth = big ? 14 : 10;
    this.faceCtx.lineCap = 'round';
    this.faceCtx.beginPath();
    const radius = big ? 36 : 28;
    this.faceCtx.arc(cx, cy - (big ? 10 : 16), radius, Math.PI * 0.18, Math.PI * 0.82, false);
    this.faceCtx.stroke();
  }

  drawSurprisedMouth(cx, cy, radius = 14, color) {
    this.faceCtx.fillStyle = color;
    this.faceCtx.beginPath();
    this.faceCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.faceCtx.fill();
  }

  drawCuriousMouth(cx, cy, color) {
    this.faceCtx.strokeStyle = color;
    this.faceCtx.lineWidth = 10;
    this.faceCtx.lineCap = 'round';
    this.faceCtx.beginPath();
    this.faceCtx.arc(cx, cy, 14, Math.PI * 0.1, Math.PI * 0.9, false);
    this.faceCtx.stroke();
  }

  // ─── Build Robot Mesh ───────────────────────────────────
  buildRobot() {
    this.initFaceTexture();

    this.rootGroup = new THREE.Group();
    this.bobGroup = new THREE.Group();
    this.rootGroup.add(this.bobGroup);

    this.materials.armor = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.12,
      roughness: 0.14,
      envMapIntensity: 1.4,
    });

    this.materials.accent = new THREE.MeshStandardMaterial({
      color: 0x0088ff,
      metalness: 0.88,
      roughness: 0.2,
      envMapIntensity: 1.6,
    });

    this.materials.glow = new THREE.MeshStandardMaterial({
      color: 0x00f2ff,
      emissive: 0x00f2ff,
      emissiveIntensity: 2.4,
      roughness: 0.1,
    });

    this.materials.visor = new THREE.MeshStandardMaterial({
      map: this.faceTexture,
      emissiveMap: this.faceTexture,
      emissive: 0xffffff,
      emissiveIntensity: 1.4,
      metalness: 0.2,
      roughness: 0.15,
    });

    // 1. Torso
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.set(0, 1.05, 0);
    this.bobGroup.add(this.bodyGroup);

    const torsoGeom = new THREE.SphereGeometry(0.68, 36, 32);
    torsoGeom.scale(0.96, 1.1, 0.88);
    const torsoMesh = new THREE.Mesh(torsoGeom, this.materials.armor);
    torsoMesh.castShadow = true;
    this.bodyGroup.add(torsoMesh);
    this.clickableMeshes.push(torsoMesh);

    const waistGeom = new THREE.TorusGeometry(0.58, 0.05, 16, 48);
    waistGeom.scale(1.0, 1.0, 0.9);
    const waistRing = new THREE.Mesh(waistGeom, this.materials.accent);
    waistRing.rotation.x = Math.PI / 2;
    waistRing.position.y = -0.15;
    this.bodyGroup.add(waistRing);

    // Chest Badge
    const badgeGeom = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 32);
    badgeGeom.rotateX(Math.PI / 2);
    const badgeMesh = new THREE.Mesh(badgeGeom, this.materials.accent);
    badgeMesh.position.set(0, 0.14, 0.54);
    this.bodyGroup.add(badgeMesh);

    const badgeCoreGeom = new THREE.SphereGeometry(0.07, 18, 18);
    const badgeCore = new THREE.Mesh(badgeCoreGeom, this.materials.glow);
    badgeCore.position.set(0, 0.14, 0.57);
    this.bodyGroup.add(badgeCore);
    this.clickableMeshes.push(badgeMesh);

    // Back Jetpack
    const jetpackGroup = new THREE.Group();
    jetpackGroup.position.set(0, 0.12, -0.52);
    this.bodyGroup.add(jetpackGroup);

    const packGeom = new THREE.BoxGeometry(0.54, 0.55, 0.22);
    const packMesh = new THREE.Mesh(packGeom, this.materials.armor);
    jetpackGroup.add(packMesh);

    const nozzleGeom = new THREE.CylinderGeometry(0.11, 0.15, 0.22, 24);
    const nozzleL = new THREE.Mesh(nozzleGeom, this.materials.accent);
    nozzleL.position.set(-0.18, -0.32, 0);
    jetpackGroup.add(nozzleL);

    const nozzleR = new THREE.Mesh(nozzleGeom, this.materials.accent);
    nozzleR.position.set(0.18, -0.32, 0);
    jetpackGroup.add(nozzleR);

    // Thruster Glow
    const flameGeom = new THREE.ConeGeometry(0.14, 0.55, 18, 1, true);
    flameGeom.rotateX(Math.PI);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.thrusterGlowL = new THREE.Mesh(flameGeom, flameMat);
    this.thrusterGlowL.position.set(-0.18, -0.58, 0);
    jetpackGroup.add(this.thrusterGlowL);

    this.thrusterGlowR = new THREE.Mesh(flameGeom, flameMat);
    this.thrusterGlowR.position.set(0.18, -0.58, 0);
    jetpackGroup.add(this.thrusterGlowR);

    // 2. Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.05, 0);
    this.bobGroup.add(this.headGroup);

    const helmetGeom = new THREE.SphereGeometry(0.66, 36, 36);
    helmetGeom.scale(1.18, 0.98, 1.05);
    const helmetMesh = new THREE.Mesh(helmetGeom, this.materials.armor);
    helmetMesh.castShadow = true;
    this.headGroup.add(helmetMesh);
    this.clickableMeshes.push(helmetMesh);

    const rimGeom = new THREE.TorusGeometry(0.56, 0.045, 16, 48);
    rimGeom.scale(1.08, 0.85, 0.8);
    const rimMesh = new THREE.Mesh(rimGeom, this.materials.accent);
    rimMesh.position.set(0, -0.02, 0.35);
    this.headGroup.add(rimMesh);

    const screenGeom = new THREE.SphereGeometry(0.60, 32, 32, 0, Math.PI);
    screenGeom.scale(1.08, 0.85, 0.8);
    this.visorMesh = new THREE.Mesh(screenGeom, this.materials.visor);
    this.visorMesh.rotation.y = -Math.PI / 2;
    this.visorMesh.position.set(0, -0.02, 0.34);
    this.headGroup.add(this.visorMesh);
    this.clickableMeshes.push(this.visorMesh);

    // Ears
    const earGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 28);
    earGeom.rotateZ(Math.PI / 2);
    const leftEar = new THREE.Mesh(earGeom, this.materials.armor);
    leftEar.position.set(-0.76, 0, 0);
    this.headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, this.materials.armor);
    rightEar.position.set(0.76, 0, 0);
    this.headGroup.add(rightEar);

    const earRimGeom = new THREE.TorusGeometry(0.21, 0.03, 16, 32);
    earRimGeom.rotateY(Math.PI / 2);
    const leftEarRim = new THREE.Mesh(earRimGeom, this.materials.accent);
    leftEarRim.position.set(-0.78, 0, 0);
    this.headGroup.add(leftEarRim);

    const rightEarRim = new THREE.Mesh(earRimGeom, this.materials.accent);
    rightEarRim.position.set(0.78, 0, 0);
    this.headGroup.add(rightEarRim);

    const earLightGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24);
    earLightGeom.rotateZ(Math.PI / 2);
    const leftEarLight = new THREE.Mesh(earLightGeom, this.materials.glow);
    leftEarLight.position.set(-0.83, 0, 0);
    this.headGroup.add(leftEarLight);

    const rightEarLight = new THREE.Mesh(earLightGeom, this.materials.glow);
    rightEarLight.position.set(0.83, 0, 0);
    this.headGroup.add(rightEarLight);

    // Antenna
    const antennaBaseGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.1, 18);
    const antennaBase = new THREE.Mesh(antennaBaseGeom, this.materials.accent);
    antennaBase.position.set(0, 0.64, 0);
    this.headGroup.add(antennaBase);

    const poleGeom = new THREE.CylinderGeometry(0.02, 0.028, 0.42, 16);
    this.antennaPole = new THREE.Mesh(poleGeom, this.materials.accent);
    this.antennaPole.position.set(0, 0.88, 0);
    this.headGroup.add(this.antennaPole);

    const orbGeom = new THREE.SphereGeometry(0.11, 24, 24);
    this.antennaOrb = new THREE.Mesh(orbGeom, this.materials.glow);
    this.antennaOrb.position.set(0, 1.12, 0);
    this.headGroup.add(this.antennaOrb);

    // 3. Hands
    const handGeom = new THREE.SphereGeometry(0.22, 24, 24);
    handGeom.scale(1.0, 0.85, 1.25);
    const palmGeom = new THREE.SphereGeometry(0.16, 18, 18);
    palmGeom.scale(0.8, 0.5, 0.9);

    this.leftHand = new THREE.Group();
    this.leftHand.position.copy(this.baseLeftHandPos);
    const leftHandArmor = new THREE.Mesh(handGeom, this.materials.armor);
    this.leftHand.add(leftHandArmor);
    const leftHandPalm = new THREE.Mesh(palmGeom, this.materials.accent);
    leftHandPalm.position.set(0, -0.05, 0.08);
    this.leftHand.add(leftHandPalm);
    this.bobGroup.add(this.leftHand);
    this.clickableMeshes.push(leftHandArmor);

    this.rightHand = new THREE.Group();
    this.rightHand.position.copy(this.baseRightHandPos);
    const rightHandArmor = new THREE.Mesh(handGeom, this.materials.armor);
    this.rightHand.add(rightHandArmor);
    const rightHandPalm = new THREE.Mesh(palmGeom, this.materials.accent);
    rightHandPalm.position.set(0, -0.05, 0.08);
    this.rightHand.add(rightHandPalm);
    this.bobGroup.add(this.rightHand);
    this.clickableMeshes.push(rightHandArmor);

    this.scene.add(this.rootGroup);
  }

  // ─── Live Styling API (Called by React BotStyler) ────────
  applyStyle({ armorColor, accentColor, glowColor, metalness, roughness }) {
    if (armorColor && this.materials.armor) {
      this.materials.armor.color.set(armorColor);
    }
    if (accentColor && this.materials.accent) {
      this.materials.accent.color.set(accentColor);
    }
    if (glowColor) {
      this.currentGlowColor = glowColor;
      if (this.materials.glow) {
        this.materials.glow.color.set(glowColor);
        this.materials.glow.emissive.set(glowColor);
      }
      if (this.thrusterGlowL && this.thrusterGlowR) {
        this.thrusterGlowL.material.color.set(glowColor);
        this.thrusterGlowR.material.color.set(glowColor);
      }
    }
    if (metalness !== undefined && this.materials.armor) {
      this.materials.armor.metalness = metalness;
    }
    if (roughness !== undefined && this.materials.armor) {
      this.materials.armor.roughness = roughness;
    }
  }

  setState(state) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.stateTimer = 0;
  }

  getRobotPosition() {
    if (!this.headGroup) return new THREE.Vector3(0, 2.5, 0);
    const pos = new THREE.Vector3();
    this.headGroup.getWorldPosition(pos);
    pos.y += 1.05;
    return pos;
  }

  // ─── Animation Loop ──────────────────────────────────────
  animate() {
    if (this.isDestroyed) return;
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();

    if (this.starField) {
      this.starField.rotation.y += 0.00015;
    }

    this.stateTimer += delta;
    this.idleTimer += delta;

    // Blinking
    this.updateBlinking(delta);

    // Gaze tracking
    this.eyeGaze.x += (this.mouseNDC.x - this.eyeGaze.x) * 6.0 * delta;
    this.eyeGaze.y += (-this.mouseNDC.y - this.eyeGaze.y) * 6.0 * delta;

    // Render 2D canvas face
    this.renderFace(elapsed);

    // Thruster Pulse
    if (this.thrusterGlowL && this.thrusterGlowR) {
      const flicker = 0.65 + Math.sin(elapsed * 18.0) * 0.25;
      this.thrusterGlowL.material.opacity = flicker;
      this.thrusterGlowR.material.opacity = flicker;
    }

    // Antenna Sway
    if (this.antennaPole && this.antennaOrb) {
      const antennaSway = Math.sin(elapsed * 4.0) * 0.05 + this.bobGroup.rotation.z * 0.6;
      this.antennaPole.rotation.z = antennaSway;
      this.antennaOrb.position.x = Math.sin(antennaSway) * 0.42;
    }

    // State Animations
    switch (this.currentState) {
      case 'idle':
        this.animateIdle(elapsed);
        break;
      case 'wave':
        this.animateWave(elapsed);
        if (this.stateTimer > 2.2) this.setState('idle');
        break;
      case 'think':
        this.animateThink(elapsed);
        break;
      case 'happy':
        this.animateHappy(elapsed);
        if (this.stateTimer > 2.0) this.setState('idle');
        break;
      case 'speaking':
        this.animateSpeaking(elapsed);
        break;
      case 'poke':
        this.animatePoke(elapsed);
        if (this.stateTimer > 1.2) this.setState('idle');
        break;
      case 'giggle':
        this.animateGiggle(elapsed);
        if (this.stateTimer > 1.8) this.setState('idle');
        break;
      case 'high_five':
        this.animateHighFive(elapsed);
        if (this.stateTimer > 1.6) this.setState('idle');
        break;
    }

    this.applyCursorTracking(delta);
    this.renderer.render(this.scene, this.camera);
  }

  updateBlinking(delta) {
    this.blinkTimer += delta;
    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.nextBlinkInterval = 2.4 + Math.random() * 3.6;
    }

    if (this.isBlinking) {
      this.blinkScale -= delta * 14.0;
      if (this.blinkScale <= 0.08) {
        this.blinkScale = 0.08;
        this.isBlinking = false;
      }
    } else if (this.blinkScale < 1.0) {
      this.blinkScale += delta * 12.0;
      if (this.blinkScale > 1.0) this.blinkScale = 1.0;
    }
  }

  animateIdle(t) {
    this.bobGroup.position.y = Math.sin(t * 1.8) * 0.12;
    this.bobGroup.rotation.z = Math.sin(t * 1.0) * 0.025;
    this.rootGroup.scale.set(1, 1, 1);

    this.leftHand.position.set(
      this.baseLeftHandPos.x + Math.sin(t * 1.6) * 0.035,
      this.baseLeftHandPos.y + Math.cos(t * 1.8) * 0.05,
      this.baseLeftHandPos.z + Math.sin(t * 1.4) * 0.04
    );
    this.rightHand.position.set(
      this.baseRightHandPos.x - Math.sin(t * 1.6) * 0.035,
      this.baseRightHandPos.y + Math.cos(t * 1.8) * 0.05,
      this.baseRightHandPos.z + Math.sin(t * 1.4) * 0.04
    );
  }

  animateWave(t) {
    const decay = Math.max(0, 1 - this.stateTimer / 2.2);
    this.bobGroup.position.y = Math.sin(t * 2.0) * 0.12 + Math.sin(this.stateTimer * 6) * 0.08 * decay;
    this.bobGroup.rotation.z = -0.12 * decay;

    const waveCycle = Math.sin(this.stateTimer * 14) * 0.35 * decay;
    this.rightHand.position.set(
      this.baseRightHandPos.x + 0.1,
      this.baseRightHandPos.y + 0.85 + Math.sin(this.stateTimer * 10) * 0.05,
      this.baseRightHandPos.z + 0.35
    );
    this.rightHand.rotation.z = -0.5 + waveCycle;
    this.rightHand.rotation.x = 0.2;
    this.headGroup.rotation.z = -0.15 * decay;
  }

  animateThink(t) {
    this.bobGroup.position.y = Math.sin(t * 1.0) * 0.06;
    this.bobGroup.rotation.z = 0.06;
    this.headGroup.rotation.z = 0.18;
    this.headGroup.rotation.x = -0.15;
    this.headGroup.rotation.y = 0.2;

    this.rightHand.position.set(0.35, 1.7, 0.55);
    this.rightHand.rotation.set(-0.4, 0.3, 0.4);
    this.leftHand.position.set(this.baseLeftHandPos.x - 0.05, this.baseLeftHandPos.y - 0.15, this.baseLeftHandPos.z);
  }

  animateSpeaking(t) {
    this.bobGroup.position.y = Math.sin(t * 3.5) * 0.07;
    this.headGroup.rotation.x = Math.sin(t * 4.0) * 0.04;
    this.rightHand.position.set(
      this.baseRightHandPos.x - 0.2 + Math.sin(t * 3.0) * 0.08,
      this.baseRightHandPos.y + 0.2 + Math.cos(t * 3.5) * 0.1,
      this.baseRightHandPos.z + 0.3
    );
    this.leftHand.position.set(
      this.baseLeftHandPos.x + 0.2 - Math.sin(t * 3.0) * 0.08,
      this.baseLeftHandPos.y + 0.1 + Math.sin(t * 3.2) * 0.08,
      this.baseLeftHandPos.z + 0.3
    );
  }

  animateHappy(t) {
    const progress = this.stateTimer;
    const decay = Math.max(0, 1 - progress / 2.0);
    this.bobGroup.position.y = Math.abs(Math.sin(progress * 10)) * 0.45 * decay;

    const squash = 1 + Math.sin(progress * 20) * 0.1 * decay;
    this.rootGroup.scale.set(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5);

    this.bodyGroup.rotation.y = progress * 7 * decay;
    this.headGroup.rotation.y = progress * 7 * decay;

    this.leftHand.position.set(this.baseLeftHandPos.x - 0.2, this.baseLeftHandPos.y + 0.9, this.baseLeftHandPos.z + 0.2);
    this.rightHand.position.set(this.baseRightHandPos.x + 0.2, this.baseRightHandPos.y + 0.9, this.baseRightHandPos.z + 0.2);
  }

  animatePoke(t) {
    const progress = this.stateTimer;
    const decay = Math.max(0, 1 - progress / 1.2);
    this.bobGroup.position.z = -Math.sin(progress * 8) * 0.35 * decay;
    this.bobGroup.position.y = Math.sin(progress * 10) * 0.15 * decay;
    this.headGroup.rotation.x = -0.2 * decay;
  }

  animateGiggle(t) {
    const progress = this.stateTimer;
    const decay = Math.max(0, 1 - progress / 1.8);
    this.bodyGroup.rotation.y = progress * 10 * decay;
    this.headGroup.rotation.y = progress * 10 * decay;
    this.bobGroup.position.y = Math.sin(progress * 25) * 0.08 * decay;
  }

  animateHighFive(t) {
    const progress = this.stateTimer;
    const decay = Math.max(0, 1 - progress / 1.6);
    this.bobGroup.position.z = Math.sin(progress * 5) * 0.25 * decay;
    this.rightHand.position.set(0.6, 1.8, 0.9 * decay);
    this.rightHand.rotation.x = 0.8 * decay;
  }

  applyCursorTracking(delta) {
    if (!this.headGroup || !this.bodyGroup) return;
    if (this.currentState !== 'think' && this.currentState !== 'happy' && this.currentState !== 'giggle') {
      this.targetRot.y = this.mouseNDC.x * 0.42;
      this.targetRot.x = -this.mouseNDC.y * 0.22;

      this.headGroup.rotation.y += (this.targetRot.y - this.headGroup.rotation.y) * 4.2 * delta;
      this.headGroup.rotation.x += (this.targetRot.x - this.headGroup.rotation.x) * 3.8 * delta;
      this.bodyGroup.rotation.y += (this.targetRot.y * 0.35 - this.bodyGroup.rotation.y) * 2.8 * delta;
    }
  }

  onMouseMove(e) {
    this.idleTimer = 0;
    this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  onTouchMove(e) {
    this.idleTimer = 0;
    if (e.touches.length > 0) {
      this.mouseNDC.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
