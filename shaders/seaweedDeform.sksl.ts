/**
 * Top-down seaweed UV displacement: traveling wave along top/bottom edges.
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
uniform shader seaweedTexture;

half4 main(float2 fragCoord) {
  vec2 uv = (fragCoord - vec2(seaweedX, seaweedY)) / vec2(seaweedW, seaweedH);

  vec2 currentDir = vec2(cos(currentAngle), sin(currentAngle));
  vec2 currentPerp = vec2(-sin(currentAngle), cos(currentAngle));
  float along = dot(uv - 0.5, currentDir);
  float perp = dot(uv - 0.5, currentPerp);

  float edgeFactor = abs(perp) * 2.0;
  float wavePhase = along * waveFreq - iTime * waveSpeed + phase;
  float dPerp = waveAmplitude * sin(wavePhase) * edgeFactor;

  vec2 dispPixels = dPerp * currentPerp * vec2(seaweedW, seaweedH);
  vec2 sampleCoord = fragCoord - dispPixels;

  return seaweedTexture.eval(sampleCoord);
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
} as const;
