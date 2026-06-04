/**
 * Full-screen undersea seafloor: UV water distortion, tiled texture sample,
 * caustic light/shadow, and cool underwater tint.
 */
export const UNDERSEA_SEAFLOOR_BACKGROUND_SKSL = `
uniform float iTime;
uniform float2 iResolution;
uniform float tileScale;
uniform float distortionAmpScale;
uniform float distortionFreqScale;
uniform float causticPatchScale;
uniform float causticBaseScale;
uniform float causticRangeScale;
uniform shader tileTexture;

const float DISTORTION_AMP = 8.0;
const float DISTORTION_FREQ = 0.0055;
const float CAUSTIC_FREQ = 0.005;
const float CAUSTIC_BASE = 0.72;
const float CAUSTIC_RANGE = 0.29;

vec2 distortUV(vec2 coord, float t) {
  float amp = DISTORTION_AMP * distortionAmpScale;
  float f = DISTORTION_FREQ * distortionFreqScale;
  float dx = sin(coord.y * f * 6.28 + t * 0.5) * amp
           + sin(coord.x * f * 4.0 + t * 0.3) * amp * 0.4;
  float dy = cos(coord.x * f * 6.28 + t * 0.4) * amp
           + cos(coord.y * f * 3.5 - t * 0.6) * amp * 0.4;
  return coord + vec2(dx, dy);
}

float caustics(vec2 coord, float t) {
  vec2 p = coord * (CAUSTIC_FREQ * causticPatchScale);
  float w1 = sin(p.x * 3.1 + p.y * 1.7 + t * 0.9);
  float w2 = sin(p.x * 1.9 - p.y * 4.2 + t * 0.7 + w1 * 1.5);
  float w3 = sin((p.x + p.y) * 2.8 + t * 1.2 + w2 * 1.2);
  float v = (w1 + w2 + w3) / 3.0;
  return CAUSTIC_BASE * causticBaseScale
       + (v + 1.0) * CAUSTIC_RANGE * causticRangeScale;
}

half4 main(float2 fragCoord) {
  float t = iTime;
  float2 warped = distortUV(fragCoord, t);
  float2 tileCoord = warped * (tileScale / iResolution.x);
  half4 tex = tileTexture.eval(tileCoord * iResolution.x);
  tex.rgb *= half3(caustics(fragCoord, t));
  tex.rgb *= half3(0.82, 0.93, 1.05);
  return tex;
}
`;

/** Tweaking multipliers: 1 = shader defaults. Values >1 strengthen / shrink patches. */
export const underseaSeafloorUniformDefaults = {
  tileScale: 3.0,
  /** Distortion displacement strength (DISTORTION_AMP). */
  distortionAmpScale: 0.6,
  /** Distortion wave density — higher = smaller ripples (DISTORTION_FREQ). */
  distortionFreqScale: 0.6,
  /** Caustic patch size — higher = smaller light/shadow patches (CAUSTIC_FREQ). */
  causticPatchScale: 0.6,
  /** Overall caustic brightness floor (CAUSTIC_BASE). */
  causticBaseScale: 1,
  /** Caustic contrast / highlight strength (CAUSTIC_RANGE). */
  causticRangeScale: 1,
} as const;
