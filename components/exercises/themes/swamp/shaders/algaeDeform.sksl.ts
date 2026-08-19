/**
 * Algae UV displacement with traveling wave and light beam overlay.
 * renderMode 0 = normal algae, renderMode 1 = shadow pass (dark tinted silhouette).
 */
export const ALGAE_DEFORM_SKSL = `
uniform float iTime;
uniform float algaeX;
uniform float algaeY;
uniform float algaeW;
uniform float algaeH;
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
uniform shader algaeTexture;

half4 main(float2 fragCoord) {
  vec2 uv = (fragCoord - vec2(algaeX, algaeY)) / vec2(algaeW, algaeH);

  half4 earlyCheck = algaeTexture.eval(fragCoord);
  if (earlyCheck.a < 0.01) { return earlyCheck; }

  vec2 currentDir = vec2(cos(currentAngle), sin(currentAngle));
  vec2 currentPerp = vec2(-sin(currentAngle), cos(currentAngle));
  float along = dot(uv - 0.5, currentDir);
  float perp = dot(uv - 0.5, currentPerp);

  float edgeFactor = abs(perp) * 2.0;
  float wavePhase = along * waveFreq - iTime * waveSpeed + phase;
  float dPerp = waveAmplitude * sin(wavePhase) * edgeFactor;

  vec2 dispPixels = dPerp * currentPerp * vec2(algaeW, algaeH);
  vec2 sampleCoord = fragCoord - dispPixels;

  half4 color = algaeTexture.eval(sampleCoord);

  if (renderMode > 0.5) {
    float a = color.a * shadowOpacity;
    if (a < 0.004) {
      return half4(0.0);
    }
    return half4(shadowColor * a, a);
  }

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

export const algaeDeformDefaults = {
  currentAngle: 3.14,
  waveAmplitude: 0.015,
  waveFreq: 10,
  waveSpeed: 5.0,
  phase: 0,
  beamIntensity: 0.13,
  beamSharpness: 10,
  beamDistortion: 0.02,
  beamSpeed: 0.20,
  beamPhase: 0,
  beamTint: [2.4, 2.6, 2.2] as const,
  renderMode: 0,
  shadowColor: [0.02, 0.06, 0.01] as const,
  shadowOpacity: 0.65,
} as const;
