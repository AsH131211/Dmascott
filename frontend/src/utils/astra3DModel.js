/* ===================================================================
   ASTRA3DMODEL.JS — High-Fidelity 3D Model of Astra (GECW Tech Fest)
   Sculpted directly from the official 3D design:
   - Chibi aerodynamic helmet with white ceramic armor finish
   - Forehead dark cowl with glowing electric cyan "A✦" crest
   - Backward-swept ear fin antennas with illuminated cyan LED slots
   - Circular earcups with glowing neon concentric rings and "A" logo
   - Front-facing dark curved visor with dynamic 2D canvas animated face:
     * Glowing electric cyan smiling eyes (^ ^)
     * Procedural smooth eyelid blinking
     * Real-time cursor gaze tracking
     * Emotional expressions (Happy, Think, Poke, Wink, Speaking)
     * Side accent indicators (// on left, /// on lower right)
   - Dark neck cowl scarf
   - White chest armor with "ASTRA GECW TECH FEST" decal & cyan seams
   - Flowing dark cape with cyan pixel data accents and "A✦" crest
   - Segmented articulated arms with cyan glow seams & black hands with glowing cyan fingertips
   - Thruster boots with pulsing cyan hover flame exhaust
   =================================================================== */

import * as THREE from 'three';

// ─── Procedural Texture Generators ────────────────────────

export function createFaceTextureCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return { canvas, ctx, texture };
}

export function drawFaceScreen(ctx, { blinkScale = 1.0, eyeGaze = { x: 0, y: 0 }, state = 'idle', elapsed = 0 }) {
  const w = 512;
  const h = 512;

  // Clear canvas
  ctx.clearRect(0, 0, w, h);

  // 1. OLED Screen Background (with rounded stadium silhouette)
  ctx.save();
  ctx.beginPath();
  const padX = 24;
  const padY = 28;
  const rw = w - padX * 2;
  const rh = h - padY * 2;
  const rad = 80;
  ctx.moveTo(padX + rad, padY);
  ctx.lineTo(padX + rw - rad, padY);
  ctx.quadraticCurveTo(padX + rw, padY, padX + rw, padY + rad);
  ctx.lineTo(padX + rw, padY + rh - rad);
  ctx.quadraticCurveTo(padX + rw, padY + rh, padX + rw - rad, padY + rh);
  ctx.lineTo(padX + rad, padY + rh);
  ctx.quadraticCurveTo(padX, padY + rh, padX, padY + rh - rad);
  ctx.lineTo(padX, padY + rad);
  ctx.quadraticCurveTo(padX, padY, padX + rad, padY);
  ctx.closePath();

  // Fill dark OLED glass
  const bgGrad = ctx.createLinearGradient(0, padY, 0, padY + rh);
  bgGrad.addColorStop(0, '#0a1020');
  bgGrad.addColorStop(0.5, '#040711');
  bgGrad.addColorStop(1, '#020308');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Subtle cyan edge rim
  ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Clip inside screen for reflections & graphics
  ctx.clip();

  // Cyber micro-scanlines
  ctx.fillStyle = 'rgba(0, 240, 255, 0.025)';
  for (let y = padY; y < padY + rh; y += 5) {
    ctx.fillRect(padX, y, rw, 2);
  }

  // Curved glass glare reflection (soft white/cyan specular arc across the top)
  const glareGrad = ctx.createLinearGradient(0, padY, 0, padY + 150);
  glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  glareGrad.addColorStop(0.4, 'rgba(0, 242, 255, 0.07)');
  glareGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glareGrad;
  ctx.beginPath();
  ctx.ellipse(w / 2, padY + 45, rw * 0.45, 60, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // 2. Cyan Eye Accent Hashmarks (two on left, three on lower right)
  ctx.fillStyle = '#00f2ff';
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 10;
  // Left //
  ctx.save();
  ctx.translate(65, 230);
  ctx.rotate(0.2);
  ctx.fillRect(0, 0, 7, 24);
  ctx.fillRect(12, 4, 7, 24);
  ctx.restore();

  // Lower Right ///
  ctx.save();
  ctx.translate(415, 295);
  ctx.rotate(-0.25);
  ctx.fillRect(0, 0, 6, 20);
  ctx.fillRect(10, 0, 6, 20);
  ctx.fillRect(20, 0, 6, 20);
  ctx.restore();

  // Eye Positions with smooth cursor gaze shift
  const baseEyeY = 235;
  const leftEyeX = 175 + eyeGaze.x * 26;
  const rightEyeX = 337 + eyeGaze.x * 26;
  const eyeY = baseEyeY + eyeGaze.y * 18;

  ctx.shadowColor = '#00d0ff';
  ctx.shadowBlur = 28;

  switch (state) {
    case 'think':
      drawPensiveEyes(ctx, leftEyeX, rightEyeX, eyeY);
      drawCuriousMouth(ctx, w / 2 + 10, 365);
      break;

    case 'poke':
      drawSqueezeEye(ctx, leftEyeX, eyeY, false);
      drawSqueezeEye(ctx, rightEyeX, eyeY, true);
      drawSurprisedMouth(ctx, w / 2, 365, 18);
      break;

    case 'high_five':
      // Wink (^ O)
      drawHappyArcEye(ctx, leftEyeX, eyeY - 6, 1.0);
      drawCapsuleEye(ctx, rightEyeX, eyeY, 74, 92, 1.0);
      drawSmileMouth(ctx, w / 2, 365, true);
      break;

    case 'speaking':
      drawHappyArcEye(ctx, leftEyeX, eyeY, blinkScale);
      drawHappyArcEye(ctx, rightEyeX, eyeY, blinkScale);
      const mouthOpen = 10 + Math.abs(Math.sin(elapsed * 14)) * 14;
      drawSurprisedMouth(ctx, w / 2 + eyeGaze.x * 10, 365, mouthOpen);
      break;

    default: // Normal & Happy (Default signature smiling eyes)
      drawHappyArcEye(ctx, leftEyeX, eyeY, blinkScale);
      drawHappyArcEye(ctx, rightEyeX, eyeY, blinkScale);
      drawSmileChevronMouth(ctx, w / 2 + eyeGaze.x * 8, 365);
      break;
  }

  ctx.restore();
}

function drawHappyArcEye(ctx, cx, cy, blinkScale = 1.0) {
  if (blinkScale <= 0.18) {
    // Blinking closed slit
    ctx.save();
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy);
    ctx.lineTo(cx + 38, cy);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  // Outer glowing cyan arc
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 26 * blinkScale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 28, 52, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  // Inner intense bright core highlight
  ctx.strokeStyle = '#f0ffff';
  ctx.lineWidth = 10 * blinkScale;
  ctx.beginPath();
  ctx.arc(cx, cy + 28, 52, Math.PI * 1.25, Math.PI * 1.75, false);
  ctx.stroke();
  ctx.restore();
}

function drawCapsuleEye(ctx, cx, cy, width, height, scaleY) {
  const effH = Math.max(8, height * scaleY);
  ctx.fillStyle = '#00f2ff';
  ctx.beginPath();
  ctx.roundRect(cx - width / 2, cy - effH / 2, width, effH, width / 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + width * 0.18, cy - effH * 0.22, 9, 0, Math.PI * 2);
  ctx.fill();
}

function drawPensiveEyes(ctx, lx, rx, cy) {
  ctx.fillStyle = '#00f2ff';
  ctx.beginPath();
  ctx.roundRect(lx - 34, cy - 34, 70, 60, 20);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(rx - 34, cy - 18, 70, 44, 16);
  ctx.fill();
}

function drawSqueezeEye(ctx, cx, cy, isRight) {
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (!isRight) {
    ctx.moveTo(cx + 25, cy - 25);
    ctx.lineTo(cx - 20, cy);
    ctx.lineTo(cx + 25, cy + 25);
  } else {
    ctx.moveTo(cx - 25, cy - 25);
    ctx.lineTo(cx + 20, cy);
    ctx.lineTo(cx - 25, cy + 25);
  }
  ctx.stroke();
}

function drawSmileChevronMouth(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 6);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx + 16, cy - 6);
  ctx.stroke();
  ctx.restore();
}

function drawSmileMouth(ctx, cx, cy, big = false) {
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = big ? 14 : 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const radius = big ? 34 : 26;
  ctx.arc(cx, cy - (big ? 8 : 14), radius, Math.PI * 0.18, Math.PI * 0.82, false);
  ctx.stroke();
}

function drawSurprisedMouth(ctx, cx, cy, radius = 14) {
  ctx.fillStyle = '#00f2ff';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCuriousMouth(ctx, cx, cy) {
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, 14, Math.PI * 0.1, Math.PI * 0.9, false);
  ctx.stroke();
}

// ─── Procedural Decals ────────────────────────────────────

function createForeheadDecalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark charcoal cowl plate
  ctx.fillStyle = '#0d131f';
  ctx.fillRect(0, 0, 512, 512);

  // Glowing Stylized "A✦" Crest
  ctx.save();
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#00f2ff';
  ctx.fillStyle = '#00f2ff';
  ctx.lineWidth = 32;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Stylized angular "A"
  ctx.beginPath();
  ctx.moveTo(150, 390);
  ctx.lineTo(256, 120);
  ctx.lineTo(362, 390);
  ctx.stroke();

  // Crossbar
  ctx.beginPath();
  ctx.moveTo(190, 290);
  ctx.lineTo(322, 290);
  ctx.stroke();

  // 4-point sparkle star in upper right of A
  const sx = 375;
  const sy = 140;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 36);
  ctx.quadraticCurveTo(sx, sy, sx + 36, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy + 36);
  ctx.quadraticCurveTo(sx, sy, sx - 36, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy - 36);
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createEarDiscDecalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0e1526';
  ctx.fillRect(0, 0, 512, 512);

  // Concentric neon cyan rings
  ctx.save();
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 22;
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(256, 256, 200, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 150, 0, Math.PI * 2);
  ctx.stroke();

  // Inner Stylized "A"
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(170, 350);
  ctx.lineTo(256, 160);
  ctx.lineTo(342, 350);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(200, 280);
  ctx.lineTo(312, 280);
  ctx.stroke();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createChestDecalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 512);

  // "ASTRA" bold text
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 68px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('A S T R A', 256, 180);

  // "GECW TECH FEST" subtitle
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('G E C W', 256, 230);
  ctx.fillText('T E C H   F E S T', 256, 270);

  // Cyan glowing diagonal vents //
  ctx.save();
  ctx.fillStyle = '#00f2ff';
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 12;

  ctx.transform(1, 0, -0.35, 1, 0, 0);
  ctx.fillRect(340, 310, 14, 40);
  ctx.fillRect(364, 310, 14, 40);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCapeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Deep matte navy cape fabric
  ctx.fillStyle = '#080c18';
  ctx.fillRect(0, 0, 512, 512);

  // Cyan glowing pixel grid
  ctx.fillStyle = '#00f2ff';
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 16;

  const pixels = [
    [70, 240, 28], [105, 240, 28], [140, 240, 28],
    [105, 205, 28], [140, 205, 28], [175, 205, 28],
    [140, 170, 28]
  ];
  pixels.forEach(([x, y, s]) => {
    ctx.fillRect(x, y, s, s);
  });

  // Cyber micro text
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('IDEAS', 220, 185);
  ctx.fillText('PEOPLE', 220, 215);
  ctx.fillText('TECHNOLOGY', 220, 245);
  ctx.fillText('BEYOND', 220, 275);

  // Large A✦ crest on cape wing
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 20;
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(330, 420);
  ctx.lineTo(390, 310);
  ctx.lineTo(450, 420);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(350, 380);
  ctx.lineTo(430, 380);
  ctx.stroke();

  // Star sparkle
  ctx.fillStyle = '#00f2ff';
  const sx = 445;
  const sy = 330;
  ctx.beginPath();
  ctx.moveTo(sx, sy - 18);
  ctx.quadraticCurveTo(sx, sy, sx + 18, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy + 18);
  ctx.quadraticCurveTo(sx, sy, sx - 18, sy);
  ctx.quadraticCurveTo(sx, sy, sx, sy - 18);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ─── Build 3D Mascot Mesh Tree ───────────────────────────

export function buildAstraCharacter(scene) {
  const root = new THREE.Group();
  const bobGroup = new THREE.Group();
  root.add(bobGroup);

  // Dynamic Floating Flight Pose
  bobGroup.rotation.x = 0.14;
  bobGroup.rotation.z = -0.06;
  bobGroup.rotation.y = 0.12;

  // Materials (PBR with scene.environment for reflections)
  const whiteArmorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fbff,
    roughness: 0.14,
    metalness: 0.08,
    envMapIntensity: 1.6,
  });

  const darkArmorMat = new THREE.MeshStandardMaterial({
    color: 0x0d1322,
    roughness: 0.18,
    metalness: 0.85,
    envMapIntensity: 2.0,
  });

  const cyanGlowMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff,
    emissive: 0x00f2ff,
    emissiveIntensity: 3.5,
    roughness: 0.05,
    envMapIntensity: 0.4,
  });

  const blackJointMat = new THREE.MeshStandardMaterial({
    color: 0x060a12,
    roughness: 0.32,
    metalness: 0.65,
    envMapIntensity: 1.8,
  });

  // Subtle dark seam material for panel lines between armor plates
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x182030,
    roughness: 0.5,
    metalness: 0.4,
    envMapIntensity: 0.6,
  });

  // Face Visor Canvas
  const { canvas: faceCanvas, ctx: faceCtx, texture: faceTexture } = createFaceTextureCanvas();
  drawFaceScreen(faceCtx, { blinkScale: 1.0, eyeGaze: { x: 0, y: 0 }, state: 'idle', elapsed: 0 });
  faceTexture.needsUpdate = true;

  const visorMat = new THREE.MeshStandardMaterial({
    map: faceTexture,
    emissiveMap: faceTexture,
    emissive: 0xffffff,
    emissiveIntensity: 1.6,
    roughness: 0.06,
    metalness: 0.2,
    transparent: true,
    opacity: 0.98,
  });

  // 1. Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.85, 0);
  bobGroup.add(headGroup);

  // Helmet Ceramic Sphere (high-poly for smooth specular)
  const helmetGeom = new THREE.SphereGeometry(0.70, 64, 48);
  helmetGeom.scale(1.18, 0.98, 1.04);
  const helmetMesh = new THREE.Mesh(helmetGeom, whiteArmorMat);
  headGroup.add(helmetMesh);

  // Panel seam ring around helmet equator
  const helmetSeamGeom = new THREE.TorusGeometry(0.72, 0.012, 8, 64);
  helmetSeamGeom.scale(1.18, 0.98, 1.04);
  const helmetSeam = new THREE.Mesh(helmetSeamGeom, seamMat);
  helmetSeam.rotation.x = Math.PI / 2;
  helmetSeam.position.y = 0.02;
  headGroup.add(helmetSeam);

  // Forehead Dark Cowl Plate with "A✦" Crest
  const foreheadGeom = new THREE.PlaneGeometry(0.68, 0.44, 16, 16);
  const fPos = foreheadGeom.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const fx = fPos.getX(i);
    const fy = fPos.getY(i);
    fPos.setZ(i, -0.15 * (fx * fx * 1.5 + fy * fy));
  }
  foreheadGeom.computeVertexNormals();

  const foreheadTex = createForeheadDecalTexture();
  const foreheadMat = new THREE.MeshStandardMaterial({
    map: foreheadTex,
    emissiveMap: foreheadTex,
    emissive: 0xffffff,
    emissiveIntensity: 1.4,
    roughness: 0.22,
    metalness: 0.78,
  });
  const foreheadMesh = new THREE.Mesh(foreheadGeom, foreheadMat);
  foreheadMesh.position.set(0, 0.44, 0.58);
  foreheadMesh.rotation.x = -0.32;
  headGroup.add(foreheadMesh);

  // Front-Facing Curved Visor Screen
  const visorScreenGeom = new THREE.PlaneGeometry(1.08, 0.82, 32, 32);
  const vPos = visorScreenGeom.attributes.position;
  for (let i = 0; i < vPos.count; i++) {
    const vx = vPos.getX(i);
    const vy = vPos.getY(i);
    // Smooth aerodynamic spherical bowl curve
    vPos.setZ(i, -0.18 * (vx * vx * 1.2 + vy * vy * 0.9));
  }
  visorScreenGeom.computeVertexNormals();

  const visorScreenMesh = new THREE.Mesh(visorScreenGeom, visorMat);
  visorScreenMesh.position.set(0, -0.04, 0.65);
  headGroup.add(visorScreenMesh);

  // Visor Frame Bezel (high-poly dark metallic frame)
  const visorBezelGeom = new THREE.TorusGeometry(0.50, 0.046, 20, 64);
  visorBezelGeom.scale(1.06, 0.80, 0.45);
  const visorBezel = new THREE.Mesh(visorBezelGeom, darkArmorMat);
  visorBezel.position.set(0, -0.04, 0.63);
  headGroup.add(visorBezel);

  // Thin cyan accent line just inside the bezel
  const visorAccentGeom = new THREE.TorusGeometry(0.49, 0.014, 12, 64);
  visorAccentGeom.scale(1.04, 0.78, 0.44);
  const visorAccent = new THREE.Mesh(visorAccentGeom, cyanGlowMat);
  visorAccent.position.set(0, -0.04, 0.635);
  headGroup.add(visorAccent);

  // Backward-Swept Ear Fin Antennas (Left & Right — higher poly)
  const earFinGeom = new THREE.CylinderGeometry(0.04, 0.22, 0.95, 8);
  earFinGeom.scale(0.8, 1.0, 0.45);

  // Left Ear Fin
  const earFinL = new THREE.Mesh(earFinGeom, whiteArmorMat);
  earFinL.position.set(-0.76, 0.68, -0.16);
  earFinL.rotation.set(-0.48, 0.18, 0.42);
  headGroup.add(earFinL);

  const earSlotL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.65, 0.05), cyanGlowMat);
  earSlotL.position.set(-0.78, 0.68, -0.15);
  earSlotL.rotation.set(-0.48, 0.18, 0.42);
  headGroup.add(earSlotL);

  // Right Ear Fin
  const earFinR = new THREE.Mesh(earFinGeom, whiteArmorMat);
  earFinR.position.set(0.76, 0.68, -0.16);
  earFinR.rotation.set(-0.48, -0.18, -0.42);
  headGroup.add(earFinR);

  const earSlotR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.65, 0.05), cyanGlowMat);
  earSlotR.position.set(0.78, 0.68, -0.15);
  earSlotR.rotation.set(-0.48, -0.18, -0.42);
  headGroup.add(earSlotR);

  // Circular Ear Cups (with glowing cyan concentric rings & "A" logo — higher poly)
  const earCupGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 48);
  earCupGeom.rotateZ(Math.PI / 2);

  const earDiscTex = createEarDiscDecalTexture();
  const earCupMat = new THREE.MeshStandardMaterial({
    map: earDiscTex,
    emissiveMap: earDiscTex,
    emissive: 0xffffff,
    emissiveIntensity: 1.6,
    metalness: 0.85,
    roughness: 0.18,
  });

  const earBezelGeom = new THREE.TorusGeometry(0.25, 0.04, 16, 32);
  earBezelGeom.rotateY(Math.PI / 2);

  // Left Ear
  const leftEarCup = new THREE.Mesh(earCupGeom, earCupMat);
  leftEarCup.position.set(-0.84, 0.02, -0.02);
  headGroup.add(leftEarCup);

  const leftEarBezel = new THREE.Mesh(earBezelGeom, darkArmorMat);
  leftEarBezel.position.set(-0.84, 0.02, -0.02);
  headGroup.add(leftEarBezel);

  // Right Ear
  const rightEarCup = new THREE.Mesh(earCupGeom, earCupMat);
  rightEarCup.position.set(0.84, 0.02, -0.02);
  headGroup.add(rightEarCup);

  const rightEarBezel = new THREE.Mesh(earBezelGeom, darkArmorMat);
  rightEarBezel.position.set(0.84, 0.02, -0.02);
  headGroup.add(rightEarBezel);

  // 2. Neck Scarf / Cowl
  const scarfGeom = new THREE.TorusGeometry(0.48, 0.14, 20, 36);
  scarfGeom.scale(1.15, 0.9, 1.25);
  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.75,
    metalness: 0.1,
  });
  const scarfMesh = new THREE.Mesh(scarfGeom, scarfMat);
  scarfMesh.rotation.x = Math.PI / 2 + 0.12;
  scarfMesh.position.set(0, 1.28, -0.05);
  bobGroup.add(scarfMesh);

  // 3. Torso & Chest Armor
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 0.85, 0);
  bobGroup.add(bodyGroup);

  const torsoGeom = new THREE.SphereGeometry(0.66, 48, 36);
  torsoGeom.scale(0.95, 1.15, 0.85);
  const torsoMesh = new THREE.Mesh(torsoGeom, whiteArmorMat);
  bodyGroup.add(torsoMesh);

  // Torso mid panel seam
  const torsoSeamGeom = new THREE.TorusGeometry(0.58, 0.01, 8, 48);
  torsoSeamGeom.scale(0.95, 1.0, 0.85);
  const torsoSeam = new THREE.Mesh(torsoSeamGeom, seamMat);
  torsoSeam.rotation.x = Math.PI / 2;
  torsoSeam.position.y = 0.15;
  bodyGroup.add(torsoSeam);

  // Chest Decal Plate ("ASTRA GECW TECH FEST")
  const chestPlateGeom = new THREE.CylinderGeometry(0.40, 0.40, 0.08, 32);
  chestPlateGeom.rotateX(Math.PI / 2);
  const chestTex = createChestDecalTexture();
  const chestMat = new THREE.MeshStandardMaterial({
    map: chestTex,
    roughness: 0.2,
    metalness: 0.2,
  });
  const chestMesh = new THREE.Mesh(chestPlateGeom, chestMat);
  chestMesh.position.set(0, 0.12, 0.52);
  bodyGroup.add(chestMesh);

  // Cyan Energy Side Ribs
  const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.08), cyanGlowMat);
  ribL.position.set(-0.45, 0.1, 0.38);
  ribL.rotation.z = -0.3;
  bodyGroup.add(ribL);

  const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.08), cyanGlowMat);
  ribR.position.set(0.45, 0.1, 0.38);
  ribR.rotation.z = 0.3;
  bodyGroup.add(ribR);

  // 4. Flowing Cape (anchored at shoulders, billowing backwards-left)
  const capeGeom = new THREE.PlaneGeometry(1.4, 1.8, 12, 12);
  const cPos = capeGeom.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    const y = cPos.getY(i);
    const x = cPos.getX(i);
    cPos.setZ(i, -Math.pow((y - 0.9), 2) * 0.4 + Math.sin(x * 3) * 0.15);
  }
  capeGeom.computeVertexNormals();

  const capeTex = createCapeTexture();
  const capeMat = new THREE.MeshStandardMaterial({
    map: capeTex,
    emissiveMap: capeTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    side: THREE.DoubleSide,
    roughness: 0.65,
  });
  const capeMesh = new THREE.Mesh(capeGeom, capeMat);
  capeMesh.position.set(-0.4, 0.2, -0.6);
  capeMesh.rotation.set(0.4, 0.6, -0.35);
  bodyGroup.add(capeMesh);

  // 5. Arms & Hands (Right hand raised forward in friendly wave gesture)
  // Right Arm (Forward Waving)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.72, 0.95, 0.1);
  bobGroup.add(rightArmGroup);

  const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), blackJointMat);
  rightArmGroup.add(shoulderR);

  const upperArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.35, 18), whiteArmorMat);
  upperArmR.position.set(0.12, 0.05, 0.2);
  upperArmR.rotation.set(1.2, -0.4, -0.4);
  rightArmGroup.add(upperArmR);

  const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.38, 18), whiteArmorMat);
  forearmR.position.set(0.28, 0.15, 0.52);
  forearmR.rotation.set(1.6, -0.2, -0.3);
  rightArmGroup.add(forearmR);

  // Cyan Forearm Glow Slot
  const forearmSlotR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.05), cyanGlowMat);
  forearmSlotR.position.set(0.28, 0.22, 0.52);
  forearmSlotR.rotation.set(1.6, -0.2, -0.3);
  rightArmGroup.add(forearmSlotR);

  // Black Hand with Glowing Cyan Fingertips
  const handR = new THREE.Group();
  handR.position.set(0.38, 0.24, 0.78);
  handR.rotation.set(1.4, -0.3, 0.2);
  rightArmGroup.add(handR);

  const palmR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), blackJointMat);
  palmR.scale.set(1.1, 0.7, 1.2);
  handR.add(palmR);

  // Segmented Fingers with Cyan Glowing Pads (3 fingers + thumb spread in wave)
  const fingerGeom = new THREE.CapsuleGeometry(0.035, 0.12, 8, 12);
  const tipGlowGeom = new THREE.SphereGeometry(0.04, 12, 12);

  for (let f = -1; f <= 1; f++) {
    const finger = new THREE.Mesh(fingerGeom, blackJointMat);
    finger.position.set(f * 0.08, 0.04, 0.14);
    finger.rotation.x = -0.3 + f * 0.1;
    handR.add(finger);

    const tip = new THREE.Mesh(tipGlowGeom, cyanGlowMat);
    tip.position.set(f * 0.08, 0.06, 0.23);
    handR.add(tip);
  }

  // Thumb
  const thumb = new THREE.Mesh(fingerGeom, blackJointMat);
  thumb.position.set(-0.13, 0.02, 0.06);
  thumb.rotation.set(-0.2, 0, 0.6);
  handR.add(thumb);
  const thumbTip = new THREE.Mesh(tipGlowGeom, cyanGlowMat);
  thumbTip.position.set(-0.19, 0.03, 0.12);
  handR.add(thumbTip);

  // Left Arm (Relaxed flying pose)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.72, 0.85, -0.05);
  bobGroup.add(leftArmGroup);

  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), blackJointMat);
  leftArmGroup.add(shoulderL);

  const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.35, 18), whiteArmorMat);
  upperArmL.position.set(-0.15, -0.15, -0.08);
  upperArmL.rotation.set(0.3, 0.2, 0.8);
  leftArmGroup.add(upperArmL);

  const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.36, 18), whiteArmorMat);
  forearmL.position.set(-0.35, -0.32, -0.05);
  forearmL.rotation.set(0.5, 0.1, 1.1);
  leftArmGroup.add(forearmL);

  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), blackJointMat);
  handL.position.set(-0.52, -0.45, 0.02);
  leftArmGroup.add(handL);

  // Left hand fingertip glows
  const tipGeomS = new THREE.SphereGeometry(0.035, 10, 10);
  for (let f = -1; f <= 1; f++) {
    const tipL = new THREE.Mesh(tipGeomS, cyanGlowMat);
    tipL.position.set(-0.52 + f * 0.06, -0.48, 0.12);
    leftArmGroup.add(tipL);
  }

  // 6. Legs & Thruster Boots (Dynamic flight pose)
  const legGroup = new THREE.Group();
  legGroup.position.set(0, 0.25, -0.15);
  bobGroup.add(legGroup);

  // Thighs
  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.42, 18), whiteArmorMat);
  thighL.position.set(-0.32, -0.2, -0.18);
  thighL.rotation.set(0.8, -0.2, 0.2);
  legGroup.add(thighL);

  const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.42, 18), whiteArmorMat);
  thighR.position.set(0.32, -0.18, -0.18);
  thighR.rotation.set(0.7, 0.2, -0.2);
  legGroup.add(thighR);

  // Knees (Black joints with cyan accent ring)
  const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), blackJointMat);
  kneeL.position.set(-0.38, -0.44, -0.42);
  legGroup.add(kneeL);

  const kneeRingGeom = new THREE.TorusGeometry(0.155, 0.018, 12, 32);
  const kneeRingL = new THREE.Mesh(kneeRingGeom, cyanGlowMat);
  kneeRingL.position.set(-0.38, -0.44, -0.42);
  kneeRingL.rotation.x = Math.PI / 2;
  legGroup.add(kneeRingL);

  const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), blackJointMat);
  kneeR.position.set(0.38, -0.42, -0.42);
  legGroup.add(kneeR);

  const kneeRingR = new THREE.Mesh(kneeRingGeom, cyanGlowMat);
  kneeRingR.position.set(0.38, -0.42, -0.42);
  kneeRingR.rotation.x = Math.PI / 2;
  legGroup.add(kneeRingR);

  // Boots with Sole Thrusters (higher poly)
  const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.38, 28), whiteArmorMat);
  bootL.position.set(-0.42, -0.72, -0.58);
  bootL.rotation.set(1.2, -0.2, 0.1);
  legGroup.add(bootL);

  // Cyan accent strip on left boot
  const bootStripGeom = new THREE.BoxGeometry(0.025, 0.30, 0.04);
  const bootStripL = new THREE.Mesh(bootStripGeom, cyanGlowMat);
  bootStripL.position.set(-0.42, -0.72, -0.52);
  bootStripL.rotation.set(1.2, -0.2, 0.1);
  legGroup.add(bootStripL);

  const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.38, 28), whiteArmorMat);
  bootR.position.set(0.42, -0.7, -0.58);
  bootR.rotation.set(1.2, 0.2, -0.1);
  legGroup.add(bootR);

  // Cyan accent strip on right boot
  const bootStripR = new THREE.Mesh(bootStripGeom, cyanGlowMat);
  bootStripR.position.set(0.42, -0.7, -0.52);
  bootStripR.rotation.set(1.2, 0.2, -0.1);
  legGroup.add(bootStripR);

  // Glowing Cyan Sole Thruster Rings (higher poly)
  const thrusterRingGeom = new THREE.RingGeometry(0.06, 0.16, 32);
  const thrusterL = new THREE.Mesh(thrusterRingGeom, cyanGlowMat);
  thrusterL.position.set(-0.45, -0.92, -0.66);
  thrusterL.rotation.set(-0.3, 0.2, 0);
  legGroup.add(thrusterL);

  const thrusterR = new THREE.Mesh(thrusterRingGeom, cyanGlowMat);
  thrusterR.position.set(0.45, -0.9, -0.66);
  thrusterR.rotation.set(-0.3, -0.2, 0);
  legGroup.add(thrusterR);

  // Thruster Flame Exhaust Cones
  const flameGeom = new THREE.ConeGeometry(0.18, 0.7, 18, 1, true);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const flameL = new THREE.Mesh(flameGeom, flameMat);
  flameL.position.set(-0.45, -1.25, -0.74);
  flameL.rotation.set(2.8, -0.2, 0);
  legGroup.add(flameL);

  const flameR = new THREE.Mesh(flameGeom, flameMat);
  flameR.position.set(0.45, -1.23, -0.74);
  flameR.rotation.set(2.8, 0.2, 0);
  legGroup.add(flameR);

  scene.add(root);

  return {
    root,
    bobGroup,
    headGroup,
    bodyGroup,
    capeMesh,
    rightArmGroup,
    flameL,
    flameR,
    faceCanvas,
    faceCtx,
    faceTexture,
  };
}
