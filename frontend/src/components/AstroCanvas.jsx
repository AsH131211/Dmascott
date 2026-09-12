/* ===================================================================
   ASTROCANVAS.JSX — Full 3D Viewport with Astra Mascot & Holodeck Scene
   =================================================================== */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildAstraCharacter, drawFaceScreen } from '../utils/astra3DModel';

export function AstroCanvas({
  actionTrigger,
  onMascotClick,
  onRobotPosUpdate,
}) {
  const canvasRef = useRef(null);
  const actionTriggerRef = useRef(actionTrigger);
  actionTriggerRef.current = actionTrigger;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.setClearColor(0x030509, 1);

    // Generate a procedural environment cubemap for realistic PBR reflections
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileCubemapShader();
    const envScene = new THREE.Scene();
    // Gradient hemisphere sky for soft studio-like reflections
    const envTop = new THREE.Color(0x0a1628);
    const envMid = new THREE.Color(0x0e2040);
    const envBot = new THREE.Color(0x020408);
    envScene.background = new THREE.Color(0x060c18);
    // Soft key and fill lights baked into the env
    const envKeyLight = new THREE.DirectionalLight(0xffffff, 5);
    envKeyLight.position.set(4, 6, 3);
    envScene.add(envKeyLight);
    const envFillLight = new THREE.DirectionalLight(0x38bdf8, 3);
    envFillLight.position.set(-3, 2, 4);
    envScene.add(envFillLight);
    const envRimLight = new THREE.DirectionalLight(0x0088ff, 4);
    envRimLight.position.set(0, 3, -5);
    envScene.add(envRimLight);
    // Small white sphere to create specular highlight reflection
    const reflSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reflSphere.position.set(2, 4, 3);
    envScene.add(reflSphere);
    const envRT = pmremGen.fromScene(envScene, 0.04);
    const envMap = envRT.texture;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030509, 0.012);
    scene.environment = envMap;

    const camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.0, 6.8);
    camera.lookAt(0, 0.9, 0);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.panSpeed = 0.6;
    controls.minDistance = 3.0;
    controls.maxDistance = 14.0;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.target.set(0, 0.9, 0);
    controls.update();

    // Studio Lighting — 3-point setup for polished ceramic highlight
    const ambient = new THREE.AmbientLight(0x8eadd4, 0.45);
    scene.add(ambient);

    // Key Light: Strong warm-white directional from upper-right
    const keyLight = new THREE.DirectionalLight(0xfff8f0, 3.2);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    // Fill Light: Cool blue from left
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-5, 3, 3);
    scene.add(fillLight);

    // Rim / Back Light: Strong blue halo edge light
    const rimLight = new THREE.PointLight(0x0077ee, 4.5, 20);
    rimLight.position.set(0, 3.5, -4.5);
    scene.add(rimLight);

    // Under-glow: cyan thruster ambience from below
    const upLight = new THREE.PointLight(0x00f2ff, 2.2, 10);
    upLight.position.set(0, -0.6, 1.0);
    scene.add(upLight);

    // Accent spot: subtle overhead
    const topSpot = new THREE.SpotLight(0xffffff, 1.5, 18, Math.PI * 0.35, 0.6);
    topSpot.position.set(0, 8, 0);
    topSpot.target.position.set(0, 1, 0);
    scene.add(topSpot);
    scene.add(topSpot.target);

    // Starfield
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const palette = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0x60a5fa),
      new THREE.Color(0x00f2ff),
      new THREE.Color(0xa855f7),
      new THREE.Color(0xffffff),
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 35 + Math.random() * 110;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i3 + 2] = radius * Math.cos(phi);

      const c = palette[Math.floor(Math.random() * palette.length)];
      starColors[i3] = c.r;
      starColors[i3 + 1] = c.g;
      starColors[i3 + 2] = c.b;
    }

    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.9,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);

    // Data Dust Particles
    const dustCount = 220;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      dustPositions[i3] = (Math.random() - 0.5) * 12;
      dustPositions[i3 + 1] = (Math.random() - 0.5) * 8 + 1;
      dustPositions[i3 + 2] = (Math.random() - 0.5) * 8;
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x00f2ff,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustParticles = new THREE.Points(dustGeom, dustMat);
    scene.add(dustParticles);

    // Ground Disc with Concentric Neon Rings
    const floorGroup = new THREE.Group();
    floorGroup.position.set(0, -0.5, 0);

    const discGeom = new THREE.CircleGeometry(5.0, 80);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x050910,
      metalness: 0.9,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9,
      envMap,
      envMapIntensity: 0.4,
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.rotation.x = -Math.PI / 2;
    floorGroup.add(disc);

    // Outer ring
    const ringGeom = new THREE.RingGeometry(4.8, 4.95, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    floorGroup.add(ring);

    // Inner accent ring
    const innerRingGeom = new THREE.RingGeometry(2.4, 2.5, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    floorGroup.add(innerRing);
    scene.add(floorGroup);

    // Build Astra 3D Mascot!
    const astra = buildAstraCharacter(scene);

    // Interaction & Animation State
    const clock = new THREE.Clock();
    let mouseNDC = { x: 0, y: 0 };
    let eyeGaze = { x: 0, y: 0 };
    let blinkTimer = 0;
    let isBlinking = false;
    let blinkScale = 1.0;
    let currentAnimState = 'idle';

    // Track mouse & raycast hover
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const onMouseMove = (e) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseVec.set(mouseNDC.x, mouseNDC.y);

      raycaster.setFromCamera(mouseVec, camera);
      const intersects = raycaster.intersectObject(astra.root, true);
      canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    };
    window.addEventListener('mousemove', onMouseMove);

    // Click on canvas to poke Astra
    const onPointerUp = (e) => {
      mouseVec.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(mouseVec, camera);
      const intersects = raycaster.intersectObject(astra.root, true);
      if (intersects.length > 0 && onMascotClick) {
        onMascotClick();
      }
    };
    canvas.addEventListener('pointerup', onPointerUp);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const currentAnimState = actionTriggerRef.current || 'idle';

      controls.update();

      // Slow space rotation
      starField.rotation.y += 0.00015;
      dustParticles.rotation.y -= 0.0002;

      // Floating Hover Levitation Physics (Sinusoidal Bob)
      let bobY = Math.sin(elapsed * 1.8) * 0.12;
      if (currentAnimState === 'poke') {
        bobY += Math.abs(Math.sin(elapsed * 14)) * 0.28;
      } else if (currentAnimState === 'happy' || currentAnimState === 'high_five') {
        bobY += Math.sin(elapsed * 8) * 0.16;
      }
      astra.bobGroup.position.y = bobY;
      astra.bobGroup.rotation.z = -0.06 + Math.sin(elapsed * 0.9) * 0.025;

      // Cape Flutter in the Wind
      if (astra.capeMesh) {
        astra.capeMesh.rotation.z = -0.35 + Math.sin(elapsed * 4.2) * 0.08;
        astra.capeMesh.rotation.x = 0.4 + Math.cos(elapsed * 3.5) * 0.06;
      }

      // Waving Arm Animation (Right arm waves gently when speaking/happy/waving)
      if (astra.rightArmGroup) {
        const waveSpeed = currentAnimState === 'wave' || currentAnimState === 'speaking' || currentAnimState === 'high_five' ? 12.0 : 2.5;
        const waveAngle = Math.sin(elapsed * waveSpeed) * (currentAnimState === 'wave' ? 0.35 : 0.18);
        astra.rightArmGroup.rotation.z = waveAngle;
        astra.rightArmGroup.rotation.y = Math.sin(elapsed * 3.0) * 0.08;
      }

      // Thruster Flame Pulsing
      if (astra.flameL && astra.flameR) {
        const flicker = 0.65 + Math.sin(elapsed * 18.0) * 0.25;
        astra.flameL.material.opacity = flicker;
        astra.flameR.material.opacity = flicker;
        const scale = 1.0 + Math.sin(elapsed * 12.0) * 0.15;
        astra.flameL.scale.set(scale, 1.0 + Math.cos(elapsed * 15.0) * 0.2, scale);
        astra.flameR.scale.set(scale, 1.0 + Math.cos(elapsed * 15.0) * 0.2, scale);
      }

      // Head & Gaze Tracking
      if (astra.headGroup) {
        const targetRotY = mouseNDC.x * 0.35;
        const targetRotX = -mouseNDC.y * 0.22;
        astra.headGroup.rotation.y += (targetRotY - astra.headGroup.rotation.y) * 4.0 * delta;
        astra.headGroup.rotation.x += (targetRotX - astra.headGroup.rotation.x) * 3.5 * delta;
      }

      // Gaze shift on the visor screen
      eyeGaze.x += (mouseNDC.x - eyeGaze.x) * 6.0 * delta;
      eyeGaze.y += (-mouseNDC.y - eyeGaze.y) * 6.0 * delta;

      // Procedural Natural Blinking
      blinkTimer += delta;
      if (!isBlinking && blinkTimer >= 3.2) {
        isBlinking = true;
        blinkTimer = 0;
      }
      if (isBlinking) {
        blinkScale -= delta * 14.0;
        if (blinkScale <= 0.08) {
          blinkScale = 0.08;
          isBlinking = false;
        }
      } else if (blinkScale < 1.0) {
        blinkScale += delta * 12.0;
        if (blinkScale > 1.0) blinkScale = 1.0;
      }

      // Render Dynamic 2D Canvas Face Visor
      drawFaceScreen(astra.faceCtx, {
        blinkScale,
        eyeGaze,
        state: currentAnimState,
        elapsed,
      });
      astra.faceTexture.needsUpdate = true;

      // Speech bubble target tracking
      if (onRobotPosUpdate && astra.headGroup) {
        const headWorldPos = new THREE.Vector3();
        astra.headGroup.getWorldPosition(headWorldPos);
        headWorldPos.y += 1.05;

        const vector = headWorldPos.clone();
        vector.project(camera);

        const halfW = window.innerWidth / 2;
        const halfH = window.innerHeight / 2;
        onRobotPosUpdate({
          x: vector.x * halfW + halfW,
          y: -(vector.y * halfH) + halfH,
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} id="three-canvas" />;
}
