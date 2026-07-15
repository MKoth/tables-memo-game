/**
 * Top-down seaweed UV displacement with traveling wave and light beam overlay.
 */
export const SEAWEED_DEFORM_SKSL = `
uniform float iTime;
uniform float seaweedX;
uniform float seaweedY;
uniform float seaweedW;
uniform float seaweedH;
uniform float currentAngle;
uniform float waveAmplitude;
uniform float waveFreq;
uniform float waveSpeed;
uniform float phase;
uniform float beamIntensity;
uniform float beamSharpness;
uniform float beamDistortion;
uniform float beamSpeed;
uniform float beamPhase;
uniform float3 beamTint;
uniform float renderMode;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform float2 shadowProj;
uniform float shadowTipSwayGain;
uniform shader seaweedTexture;

half4 main(float2 fragCoord) {
  vec2 uv = (fragCoord - vec2(seaweedX, seaweedY)) / vec2(seaweedW, seaweedH);

  // Fast path: skip wave + beam math for fully transparent pixels.
  // Sample at the unwarped coord first; if empty, return immediately.
  if (renderMode < 0.5) {
    half4 earlyCheck = seaweedTexture.eval(fragCoord);
    if (earlyCheck.a < 0.01) { return earlyCheck; }
  }

  vec2 currentDir = vec2(cos(currentAngle), sin(currentAngle));
  vec2 currentPerp = vec2(-sin(currentAngle), cos(currentAngle));
  float along = dot(uv - 0.5, currentDir);
  float perp = dot(uv - 0.5, currentPerp);

  float edgeFactor = abs(perp) * 2.0;
  float wavePhase = along * waveFreq - iTime * waveSpeed + phase;
  float dPerp = waveAmplitude * sin(wavePhase) * edgeFactor;

  vec2 dispPixels = dPerp * currentPerp * vec2(seaweedW, seaweedH);

  if (renderMode > 0.5) {
    // Shadow pass: anchored at base, projected toward light direction, swaying with the plant.
    float heightFactor = clamp(1.0 - uv.y, 0.0, 1.0);
    float swayGain = 1.0 + shadowTipSwayGain * heightFactor;
    vec2 projShift = shadowProj * heightFactor;

    vec2 shadowDisp = dispPixels * swayGain;
    vec2 sampleCoord = fragCoord - projShift - shadowDisp;

    // 3x3 Gaussian blur over alpha, mirroring koi shadow kernel.
    float step = shadowSoftness * seaweedH * 0.55;
    vec2 dx = vec2(step, 0.0);
    vec2 dy = vec2(0.0, step);

    float accum =
        seaweedTexture.eval(sampleCoord - dx - dy).a * 1.0 +
        seaweedTexture.eval(sampleCoord      - dy).a * 2.0 +
        seaweedTexture.eval(sampleCoord + dx - dy).a * 1.0 +
        seaweedTexture.eval(sampleCoord - dx     ).a * 2.0 +
        seaweedTexture.eval(sampleCoord         ).a * 4.0 +
        seaweedTexture.eval(sampleCoord + dx     ).a * 2.0 +
        seaweedTexture.eval(sampleCoord - dx + dy).a * 1.0 +
        seaweedTexture.eval(sampleCoord      + dy).a * 2.0 +
        seaweedTexture.eval(sampleCoord + dx + dy).a * 1.0;

    float coverage = accum / 16.0;
    float a = coverage * shadowOpacity;
    if (a < 0.004) {
      return half4(0.0);
    }
    return half4(shadowColor * a, a);
  }

  vec2 sampleCoord = fragCoord - dispPixels;

  half4 color = seaweedTexture.eval(sampleCoord);

  // Margin scales with beam width and distortion so the stripe fully clears
  // the image before looping — avoids visible snap at cycle boundaries.
  const float TRAVEL_FRACTION = 0.75;
  const float BEAM_PHASE_OFFSET = 0.5;
  float beamHalfWidth = sqrt(4.605 / max(beamSharpness, 0.001));
  float beamMargin = beamHalfWidth + abs(beamDistortion) * 4.0 + 0.1;
  float beamStart = -0.5 - beamMargin;
  float beamEnd = 0.5 + beamMargin;

  float baseCycle = fract(iTime * beamSpeed + beamPhase);
  float beam = 0.0;

  for (int b = 0; b < 2; b++) {
    float cycle = fract(baseCycle + float(b) * BEAM_PHASE_OFFSET);
    if (cycle <= TRAVEL_FRACTION) {
      float t = cycle / TRAVEL_FRACTION;
      float beamAlong = mix(beamStart, beamEnd, t);
      float distortion = beamDistortion * sin(perp * 12.0 + iTime * 2.0 + float(b) * 1.7);
      float dist = abs(along - beamAlong + distortion);
      beam = max(beam, exp(-dist * dist * beamSharpness));
    }
  }

  half beamStrength = half(beam * beamIntensity * color.a);
  half3 tint = half3(beamTint);
  color.rgb = mix(color.rgb, color.rgb * tint, beamStrength);

  return color;
}
`;

export const seaweedDeformUniformDefaults = {
  /** Wave travel direction in radians — 0 = right, PI/2 = down. */
  currentAngle: 0,
  /** Top/bottom edge wave height as a UV fraction. */
  waveAmplitude: 0.08,
  /** Spatial frequency of the edge wave along the current direction. */
  waveFreq: 10,
  /** How fast the edge wave travels along the current direction. */
  waveSpeed: 2,
  /** Phase offset so instances animate out of sync. */
  phase: 0,
  /** Brightness of the traveling light beam — 0 = disabled. */
  beamIntensity: 0.35,
  /** Beam width — higher = thinner stripe (suggested range 20–200). */
  beamSharpness: 60,
  /** Waviness of the beam edge — 0 = straight line. */
  beamDistortion: 0.015,
  /** How fast the beam travels along the current direction. */
  beamSpeed: 0.4,
  /** Per-instance beam time offset. */
  beamPhase: 0,
  /** RGB multiplier for the beam — warm gold reads as sun rays. */
  beamTint: [1.8, 1.8, 1.8] as const,
  /** 0 = seaweed, 1 = shadow. */
  renderMode: 0,
  /** Shadow tint, matches koi shadow by default. */
  shadowColor: [0.02, 0.06, 0.12] as const,
  /** Shadow alpha multiplier. */
  shadowOpacity: 0.15,
  /** Softens shadow edges in body-perp units. */
  shadowSoftness: 0.45,
  /** Projected tip offset in pixels (down-right). */
  shadowProj: [-30, 30] as const,
  /** Extra sway gain toward the tip. */
  shadowTipSwayGain: 2.6,
} as const;
