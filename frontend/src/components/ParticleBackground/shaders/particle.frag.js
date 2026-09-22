/* ===================================================================
   PARTICLE FRAGMENT SHADER — Soft circular glow particles
   Radial exponential falloff + bright core, additive blending
   =================================================================== */

export const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;

  void main() {
    // Distance from center of point sprite [0..1]
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;

    // Discard pixels outside the circle
    if (d > 1.0) discard;

    // Soft exponential glow falloff
    float glow = exp(-d * d * 3.0);

    // Bright core for that "dust mote" look
    float core = smoothstep(0.3, 0.0, d);

    // Combine color: particle color * glow + white core highlight
    vec3 col = vColor * glow + vec3(1.0) * core * 0.55;

    // Final alpha: glow shape * particle alpha
    float alpha = glow * vAlpha;

    // Clamp very dim particles
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;
