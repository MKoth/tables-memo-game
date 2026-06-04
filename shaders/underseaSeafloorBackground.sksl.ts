/**
 * Full-screen undersea seafloor: UV water distortion, tiled texture sample,
 * caustic light/shadow, waterDrift voronoi webs, and cool underwater tint.
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
uniform float waterDriftScale;
uniform float waterDriftIntensity;
uniform float waterDriftSpeed;
uniform float waterDriftSharpness;
uniform float waterDriftWaveAmp;
uniform float waterDriftWaveFreq;
uniform float waterDriftWaveSpeed;
uniform float waterDriftClusterAmp;
uniform float waterDriftClusterFreq;
uniform float waterDriftLineVariation;
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

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec2 clusterWarp(vec2 coord) {
  float a = waterDriftClusterAmp;
  float f = waterDriftClusterFreq;
  float wx = sin(coord.y * f + coord.x * f * 0.7) * a
           + sin(coord.x * f * 1.3 - coord.y * f * 0.5) * a * 0.5;
  float wy = cos(coord.x * f * 0.9 + coord.y * f * 1.1) * a
           + cos(coord.y * f * 1.5 + coord.x * f * 0.3) * a * 0.5;
  return coord + vec2(wx, wy);
}

vec2 warpVoronoiCoord(vec2 coord, float t) {
  float a = waterDriftWaveAmp;
  float f = waterDriftWaveFreq;
  float s = waterDriftWaveSpeed;
  float dx = sin(coord.y * f * 6.28 + t * s)       * a
           + sin(coord.x * f * 3.14 + t * s * 0.7) * a * 0.5;
  float dy = cos(coord.x * f * 6.28 + t * s * 0.8) * a
           + cos(coord.y * f * 4.71 - t * s * 0.6) * a * 0.5;
  return coord + vec2(dx, dy);
}

float waterDriftCaustics(vec2 coord, float t) {
  coord = clusterWarp(coord);
  vec2 g = floor(coord);
  vec2 f = fract(coord);

  vec2 mr = vec2(0.0);
  float md = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = vec2(float(x), float(y));
      vec2 rnd = hash2(g + cell);
      vec2 o = cell + 0.5 + 0.4 * sin(t * waterDriftSpeed + 6.2831 * rnd);
      vec2 r = o - f;
      float d = dot(r, r);
      if (d < md) { md = d; mr = r; }
    }
  }

  float border = 8.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 cell = vec2(float(x), float(y));
      vec2 rnd = hash2(g + cell);
      vec2 o = cell + 0.5 + 0.4 * sin(t * waterDriftSpeed + 6.2831 * rnd);
      vec2 r = o - f;
      vec2 diff = r - mr;
      if (dot(diff, diff) > 0.00001) {
        border = min(border, dot(0.5 * (mr + r), normalize(diff)));
      }
    }
  }

  float cellRand = hash2(g).x;
  float edgeWidth = (0.6 / waterDriftSharpness) * mix(1.0 - waterDriftLineVariation * 0.6, 1.0 + waterDriftLineVariation * 0.6, cellRand);
  return 1.0 - smoothstep(0.0, max(edgeWidth, 0.001), border);
}

half4 main(float2 fragCoord) {
  float t = iTime;
  float2 warped = distortUV(fragCoord, t);
  float2 tileCoord = warped * (tileScale / iResolution.x);
  half4 tex = tileTexture.eval(tileCoord * iResolution.x);
  tex.rgb *= half3(caustics(fragCoord, t));
  vec2 driftCoord = warpVoronoiCoord(fragCoord * (0.004 * waterDriftScale), t);
  float drift = waterDriftCaustics(driftCoord, t);
  tex.rgb += half3(drift * waterDriftIntensity) * half3(0.9, 0.97, 1.0);
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
  /** WaterDrift voronoi cell density. */
  waterDriftScale: 2.5,
  /** WaterDrift web brightness (additive). */
  waterDriftIntensity: 0.06,
  /** WaterDrift in-place dance speed. */
  waterDriftSpeed: 0.5,
  /** WaterDrift border line width — higher = thinner veins. */
  waterDriftSharpness: 8,
  /** WaterDrift wave distortion amplitude — higher = more bent lines. 0 = straight. */
  waterDriftWaveAmp: 0.05,
  /** WaterDrift wave ripple density — lower = long smooth curves, higher = tight wiggles. */
  waterDriftWaveFreq: 2.0,
  /** WaterDrift wave animation speed — independent of cell dance speed. */
  waterDriftWaveSpeed: 0.6,
  /** WaterDrift domain warp amplitude — higher = more variation in cell sizes/cluster density. */
  waterDriftClusterAmp: 1.2,
  /** WaterDrift domain warp frequency — lower = broader regions of dense/sparse cells. */
  waterDriftClusterFreq: 0.05,
  /** WaterDrift line thickness variation — 0 = uniform, 1 = high variation between thin and thick. */
  waterDriftLineVariation: 1,
} as const;
