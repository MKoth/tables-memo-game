/**
 * Full-screen undersea seafloor: tiled texture sample,
 * waterDrift voronoi webs, and cool underwater tint.
 */
export const MAX_DRIFT_LAYERS = 4;

export const UNDERSEA_SEAFLOOR_BACKGROUND_SKSL = `
uniform float iTime;
uniform float2 iResolution;
uniform float tileScale;
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
uniform float waterDriftIntensityVariation[${MAX_DRIFT_LAYERS}];
uniform float waterDriftFrequencyVariation[${MAX_DRIFT_LAYERS}];
uniform float waterDriftEdgeJunctionStrength[${MAX_DRIFT_LAYERS}];
uniform float waterDriftTintR[${MAX_DRIFT_LAYERS}];
uniform float waterDriftTintG[${MAX_DRIFT_LAYERS}];
uniform float waterDriftTintB[${MAX_DRIFT_LAYERS}];
uniform float waterDriftMoveX[${MAX_DRIFT_LAYERS}];
uniform float waterDriftMoveY[${MAX_DRIFT_LAYERS}];
uniform float waterDriftMoveSpeed[${MAX_DRIFT_LAYERS}];
uniform shader tileTexture;

// Sin-free hash (Dave Hoskins style). Avoids per-pixel sin() which is
// expensive on mobile GPUs; hash2 is evaluated ~10x per pixel.
vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
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

vec2 voronoiCellOffset(vec2 g, vec2 f, vec2 cell, float t, float speed) {
  vec2 rnd = hash2(g + cell);
  vec2 o = cell + 0.5 + 0.4 * sin(t * speed + 6.2831 * rnd);
  return o - f;
}

void updateVoronoiNearest(vec2 r, inout vec2 mr, inout float md, inout float md2) {
  float d = dot(r, r);
  if (d < md) { md2 = md; md = d; mr = r; }
  else if (d < md2) { md2 = d; }
}

float voronoiBorderDist(vec2 mr, vec2 r) {
  vec2 diff = r - mr;
  if (dot(diff, diff) > 0.00001) {
    return dot(0.5 * (mr + r), normalize(diff));
  }
  return 8.0;
}

float waterDriftCaustics(vec2 coord, float t, float speed, float sharpness,
                         float lineVariation, float intensityVariation,
                         float edgeJunctionStrength, float clusterAmp, float clusterFreq) {
  coord = clusterWarp(coord, clusterAmp, clusterFreq);
  vec2 g = floor(coord);
  vec2 f = fract(coord);

  vec2 mr = vec2(0.0);
  float md = 8.0;
  float md2 = 8.0;
  vec2 rs[9];
  vec2 r;

  r = voronoiCellOffset(g, f, vec2(-1.0, -1.0), t, speed);
  rs[0] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(0.0, -1.0), t, speed);
  rs[1] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(1.0, -1.0), t, speed);
  rs[2] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(-1.0, 0.0), t, speed);
  rs[3] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(0.0, 0.0), t, speed);
  rs[4] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(1.0, 0.0), t, speed);
  rs[5] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(-1.0, 1.0), t, speed);
  rs[6] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(0.0, 1.0), t, speed);
  rs[7] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffset(g, f, vec2(1.0, 1.0), t, speed);
  rs[8] = r; updateVoronoiNearest(r, mr, md, md2);

  float border = 8.0;
  border = min(border, voronoiBorderDist(mr, rs[0]));
  border = min(border, voronoiBorderDist(mr, rs[1]));
  border = min(border, voronoiBorderDist(mr, rs[2]));
  border = min(border, voronoiBorderDist(mr, rs[3]));
  border = min(border, voronoiBorderDist(mr, rs[4]));
  border = min(border, voronoiBorderDist(mr, rs[5]));
  border = min(border, voronoiBorderDist(mr, rs[6]));
  border = min(border, voronoiBorderDist(mr, rs[7]));
  border = min(border, voronoiBorderDist(mr, rs[8]));

  vec2 cellRand = hash2(g);
  float lineRand = cellRand.x;
  float intensityRand = cellRand.y;
  float edgeWidth = (0.6 / sharpness) * mix(1.0 - lineVariation * 0.6, 1.0 + lineVariation * 0.6, lineRand);
  float web = 1.0 - smoothstep(0.0, max(edgeWidth, 0.001), border);
  float intensityScale = mix(1.0 - intensityVariation * 0.6, 1.0 + intensityVariation * 0.6, intensityRand);
  float junctionFactor = sqrt(md) / sqrt(md2);
  float junctionScale = mix(1.0 - edgeJunctionStrength, 1.0, junctionFactor);
  return web * intensityScale * junctionScale;
}

half4 main(float2 fragCoord) {
  float t = iTime;
  float2 tileCoord = fragCoord * (tileScale / iResolution.x);
  half4 tex = tileTexture.eval(tileCoord * iResolution.x);

  float depth = 1.0 - fragCoord.y / iResolution.y;
  half3 tint = half3(underwaterTint);
  half3 deepTint = half3(0.55, 0.78, 1.18);
  half3 withDepth = mix(tint, deepTint, depth * underwaterDepthStrength);
  tex.rgb *= mix(half3(1.0), withDepth, underwaterTintStrength);

  int layerCount = int(waterDriftCount);
  for (int i = 0; i < ${MAX_DRIFT_LAYERS}; i++) {
    if (i >= layerCount) { break; }
    vec2 rawCoord = fragCoord * (0.004 * waterDriftScale[i]);
    rawCoord -= vec2(waterDriftMoveX[i], waterDriftMoveY[i]) * t * waterDriftMoveSpeed[i];
    float freqRand = hash2(floor(rawCoord) + vec2(17.3, 41.7)).x;
    float localWaveFreq = waterDriftWaveFreq[i]
      * mix(1.0 - waterDriftFrequencyVariation[i] * 0.6,
            1.0 + waterDriftFrequencyVariation[i] * 0.6, freqRand);
    vec2 waved = warpVoronoiCoord(rawCoord, t,
      waterDriftWaveAmp[i], localWaveFreq, waterDriftWaveSpeed[i]);
    float drift = waterDriftCaustics(waved, t,
      waterDriftSpeed[i], waterDriftSharpness[i], waterDriftLineVariation[i],
      waterDriftIntensityVariation[i], waterDriftEdgeJunctionStrength[i],
      waterDriftClusterAmp[i], waterDriftClusterFreq[i]);
    half beam = half(drift * waterDriftIntensity[i]);
    half3 beamTint = half3(waterDriftTintR[i], waterDriftTintG[i], waterDriftTintB[i]);
    tex.rgb = mix(tex.rgb, tex.rgb * beamTint, beam);
  }

  return tex;
}
`;

/** Tweaking multipliers: 1 = shader defaults. Values >1 strengthen / shrink patches. */
export const underseaSeafloorUniformDefaults = {
  tileScale: 2.4,
  /** RGB multiplier for underwater color cast — lower R, higher B = bluer. */
  underwaterTint: [0.68, 0.84, 1.18] as const,
  /** Underwater tint intensity — 0 = no tint, 1 = full tint. */
  underwaterTintStrength: 0.58,
  /** Vertical depth gradient when tint is active — 0 = uniform tint, 1 = bluer toward top. */
  underwaterDepthStrength: 1.5,
  /** Number of stacked waterDrift layers (max MAX_DRIFT_LAYERS). */
  waterDriftCount: 1,
  /** WaterDrift voronoi cell density per layer. */
  waterDriftScale: [4.0, 6.0, 8.0],
  /** WaterDrift beam strength per layer — 0 = none, 1 = full tint on edges. */
  waterDriftIntensity: [0.23, 0.18, 0.16],
  /** WaterDrift beam RGB multiplier per layer — warm gold reads as sun rays. */
  waterDriftTint: [
    [1.8, 1.8, 1.8],
    [1.8, 1.8, 1.8],
    [1.8, 1.8, 1.8],
  ] as const,
  /** WaterDrift in-place dance speed per layer. */
  waterDriftSpeed: [0.3, 1.0, 3.0],
  /** WaterDrift scroll direction per layer — degrees, 0 = right, 90 = down. */
  waterDriftMoveAngle: [160, 200, 220],
  /** WaterDrift scroll speed per layer — 0 = stationary pattern. */
  waterDriftMoveSpeed: [0.16, 0.6, 1.2],
  /** WaterDrift border line width per layer — higher = thinner veins. */
  waterDriftSharpness: [3, 1, 0.5],
  /** WaterDrift wave distortion amplitude per layer — 0 = straight. */
  waterDriftWaveAmp: [0.03, 0.05, 0.07],
  /** WaterDrift wave ripple density per layer. */
  waterDriftWaveFreq: [2.0, 0.8, 1.0],
  /** WaterDrift wave animation speed per layer. */
  waterDriftWaveSpeed: [0.6, 3, 5],
  /** WaterDrift domain warp amplitude per layer. */
  waterDriftClusterAmp: [1.2, 0.6, 0.8],
  /** WaterDrift domain warp frequency per layer. */
  waterDriftClusterFreq: [0.05, 0.30, 0.40],
  /** WaterDrift line thickness variation per layer — 0 = uniform. */
  waterDriftLineVariation: [0.2, 0.5, 0.3],
  /** WaterDrift brightness variation per layer — 0 = uniform, 1 = ±60% around waterDriftIntensity. */
  waterDriftIntensityVariation: [0.5, 0.3, 0.2],
  /** WaterDrift wave frequency variation per layer — 0 = uniform, 1 = ±60% around waterDriftWaveFreq. */
  waterDriftFrequencyVariation: [0.5, 0.4, 0.3],
  /** WaterDrift edge junction boost per layer — 0 = uniform, 1 = bright at vertices, dim at edge midpoints. */
  waterDriftEdgeJunctionStrength: [0.8, 0.4, 0.3],
  // waterDriftEdgeJunctionStrength: [0, 0, 0],
} as const;
