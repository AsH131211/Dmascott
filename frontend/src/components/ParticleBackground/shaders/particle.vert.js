/* ===================================================================
   PARTICLE VERTEX SHADER — GPU particle rendering
   Soft glowing circular particles with depth attenuation & twinkle
   =================================================================== */

export const particleVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aSeed;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uStateIntensity;
  uniform float uDepthFadeNear;
  uniform float uDepthFadeFar;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;

  void main() {
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float dist = -mvPosition.z;

    // Depth-based alpha fade
    float depthFade = smoothstep(uDepthFadeFar, uDepthFadeNear, dist);

    // Subtle twinkling per particle using seed + time
    float twinkle = sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 6.2831) * 0.18 + 0.82;

    // Alpha combines: attribute alpha, depth, twinkle, state boost
    vAlpha = aAlpha * depthFade * twinkle * (1.0 + uStateIntensity * 0.3);
    vDepth = depthFade;

    // Size: base * attribute * depth attenuation * pixel ratio
    float attenuation = 55.0 / max(dist, 1.0);
    gl_PointSize = aSize * uPixelRatio * attenuation * (1.0 + uStateIntensity * 0.2);
    gl_PointSize = max(gl_PointSize, 1.5);

    gl_Position = projectionMatrix * mvPosition;
  }
`;
