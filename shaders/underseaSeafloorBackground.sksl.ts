/**
 * Full-screen undersea seafloor: UV water distortion, tiled texture sample,
 * caustic light/shadow, waterDrift voronoi webs, and cool underwater tint.
 */
export const MAX_DRIFT_LAYERS = 4;

export const UNDERSEA_SEAFLOOR_BACKGROUND_SKSL = `
uniform float iTime;
uniform float2 iResolution;
uniform float tileScale;
uniform float distortionAmpScale;
uniform float distortionFreqScale;
uniform float causticPatchScale;
uniform float causticBaseScale;
uniform float causticRangeScale;
uniform float3 underwaterTint;
uniform float underwaterTintStrength;
uniform float underwaterDepthStrength;
uniform float waterDriftCount;
uniform float waterDriftScale[${MAX_DRIFT_LAYERS}];
uniform float waterDriftIntensity[${MAX_DRIFT_LAYERS}];
uniform float waterDriftSpeed[${MAX_DRIFT_LAYERS}];
uniform float waterDriftSharpness[${MAX_DRIFT_LAYERS}];
uniform float waterDriftWaveAmp[${MAX_DRIFT_LAYERS}];
uniform float waterDriftWaveFreq[${MAX_DRIFT_LAYERS}];
uniform float waterDriftWaveSpeed[${MAX_DRIFT_LAYERS}];
uniform float waterDriftClusterAmp[${MAX_DRIFT_LAYERS}];
uniform float waterDriftClusterFreq[${MAX_DRIFT_LAYERS}];
uniform float waterDriftLineVariation[${MAX_DRIFT_LAYERS}];
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

vec2 clusterWarp(vec2 coord, float amp, float freq) {
  float wx = sin(coord.y * freq + coord.x * freq * 0.7) * amp
           + sin(coord.x * freq * 1.3 - coord.y * freq * 0.5) * amp * 0.5;
  float wy = cos(coord.x * freq * 0.9 + coord.y * freq * 1.1) * amp
           + cos(coord.y * freq * 1.5 + coord.x * freq * 0.3) * amp * 0.5;
  return coord + vec2(wx, wy);
}

vec2 warpVoronoiCoord(vec2 coord, float t, float amp, float freq, float speed) {
  float dx = sin(coord.y * freq * 6.28 + t * speed)       * amp
           + sin(coord.x * freq * 3.14 + t * speed * 0.7) * amp * 0.5;
  float dy = cos(coord.x * freq * 6.28 + t * speed * 0.8) * amp
           + cos(coord.y * freq * 4.71 - t * speed * 0.6) * amp * 0.5;
  return coord + vec2(dx, dy);
}

float waterDriftCaustics(vec2 coord, float t, float speed, float sharpness,
                         float lineVariation, float clusterAmp, float clusterFreq) {
  coord = clusterWarp(coord, clusterAmp, clusterFreq);
  vec2 g = floor(coord);
  vec2 f = fract(coord);

  vec2 mr = vec2(0.0);
  float md = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = vec2(float(x), float(y));
      vec2 rnd = hash2(g + cell);
      vec2 o = cell + 0.5 + 0.4 * sin(t * speed + 6.2831 * rnd);
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
      vec2 o = cell + 0.5 + 0.4 * sin(t * speed + 6.2831 * rnd);
      vec2 r = o - f;
      vec2 diff = r - mr;
      if (dot(diff, diff) > 0.00001) {
        border = min(border, dot(0.5 * (mr + r), normalize(diff)));
      }
    }
  }

  float cellRand = hash2(g).x;
  float edgeWidth = (0.6 / sharpness) * mix(1.0 - lineVariation * 0.6, 1.0 + lineVariation * 0.6, cellRand);
  return 1.0 - smoothstep(0.0, max(edgeWidth, 0.001), border);
}

half4 main(float2 fragCoord) {
  float t = iTime;
  float2 warped = distortUV(fragCoord, t);
  float2 tileCoord = warped * (tileScale / iResolution.x);
  half4 tex = tileTexture.eval(tileCoord * iResolution.x);
  tex.rgb *= half3(caustics(fragCoord, t));

  int layerCount = int(waterDriftCount);
  for (int i = 0; i < ${MAX_DRIFT_LAYERS}; i++) {
    if (i >= layerCount) { break; }
    vec2 rawCoord = fragCoord * (0.004 * waterDriftScale[i]);
    vec2 waved = warpVoronoiCoord(rawCoord, t,
      waterDriftWaveAmp[i], waterDriftWaveFreq[i], waterDriftWaveSpeed[i]);
    float drift = waterDriftCaustics(waved, t,
      waterDriftSpeed[i], waterDriftSharpness[i], waterDriftLineVariation[i],
      waterDriftClusterAmp[i], waterDriftClusterFreq[i]);
    tex.rgb += half3(drift * waterDriftIntensity[i]) * half3(0.9, 0.97, 1.0);
  }

  float depth = 1.0 - fragCoord.y / iResolution.y;
  half3 tint = half3(underwaterTint);
  half3 deepTint = half3(0.55, 0.78, 1.18);
  half3 withDepth = mix(tint, deepTint, depth * underwaterDepthStrength);
  tex.rgb *= mix(half3(1.0), withDepth, underwaterTintStrength);
  return tex;
}
`;

/** Tweaking multipliers: 1 = shader defaults. Values >1 strengthen / shrink patches. */
export const underseaSeafloorUniformDefaults = {
  tileScale: 3,
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
  /** RGB multiplier for underwater color cast — lower R, higher B = bluer. */
  underwaterTint: [0.68, 0.84, 1.18] as const,
  /** Underwater tint intensity — 0 = no tint, 1 = full tint. */
  underwaterTintStrength: 0.4,
  /** Vertical depth gradient when tint is active — 0 = uniform tint, 1 = bluer toward top. */
  underwaterDepthStrength: 3,
  /** Number of stacked waterDrift layers (max MAX_DRIFT_LAYERS). */
  waterDriftCount: 3,
  /** WaterDrift voronoi cell density per layer. */
  waterDriftScale: [2.0, 8.0, 10.0],
  /** WaterDrift web brightness (additive) per layer. */
  waterDriftIntensity: [0.1, 0.1, 0.1],
  /** WaterDrift in-place dance speed per layer. */
  waterDriftSpeed: [0.5, 0.8, 1.0],
  /** WaterDrift border line width per layer — higher = thinner veins. */
  waterDriftSharpness: [40, 14, 10],
  /** WaterDrift wave distortion amplitude per layer — 0 = straight. */
  waterDriftWaveAmp: [0.05, 0.12, 0.15],
  /** WaterDrift wave ripple density per layer. */
  waterDriftWaveFreq: [2.0, 0.8, 1.0],
  /** WaterDrift wave animation speed per layer. */
  waterDriftWaveSpeed: [0.6, 3, 5],
  /** WaterDrift domain warp amplitude per layer. */
  waterDriftClusterAmp: [1.2, 0.6, 0.8],
  /** WaterDrift domain warp frequency per layer. */
  waterDriftClusterFreq: [0.05, 0.30, 0.40],
  /** WaterDrift line thickness variation per layer — 0 = uniform. */
  waterDriftLineVariation: [1.0, 0.5, 0.3],
} as const;
