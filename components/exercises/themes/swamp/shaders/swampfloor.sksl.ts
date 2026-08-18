/**
 * Swamp floor sprites: murky tint + quantized static voronoi caustics.
 * Cells are static per variant; floor(iTime * switchRate) snaps between hash-seeded patterns.
 */
export const MAX_SWAMPFLOOR_VORONOI_LAYERS = 4;

export const SWAMPFLOOR_SKSL = `
uniform float iTime;
uniform float2 iResolution;
uniform float switchRate;
uniform float floorX;
uniform float floorY;
uniform float floorW;
uniform float floorH;
uniform float3 underwaterTint;
uniform float underwaterTintStrength;
uniform float underwaterDepthStrength;
uniform float voronoiCount;
uniform float voronoiScale[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float voronoiIntensity[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float voronoiSharpness[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float voronoiClusterAmp[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float voronoiClusterFreq[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float voronoiTintR[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float voronoiTintG[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float voronoiTintB[${MAX_SWAMPFLOOR_VORONOI_LAYERS}];
uniform float shadowStrength;
uniform float shadowStart;
uniform float shadowEnd;
uniform float aspectRatio;
uniform float floorScale;
uniform shader floorTexture;

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

vec2 voronoiCellOffsetStatic(vec2 g, vec2 f, vec2 cell, float variant) {
  vec2 rnd = hash2(g + cell + vec2(variant * 19.7, variant * 7.3));
  vec2 o = cell + 0.5 + 0.4 * (rnd - 0.5) * 2.0;
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

float staticCaustics(vec2 coord, float variant, float sharpness,
                     float clusterAmp, float clusterFreq) {
  coord = clusterWarp(coord, clusterAmp, clusterFreq);
  vec2 g = floor(coord);
  vec2 f = fract(coord);

  vec2 mr = vec2(0.0);
  float md = 8.0;
  float md2 = 8.0;
  vec2 rs[9];
  vec2 r;

  r = voronoiCellOffsetStatic(g, f, vec2(-1.0, -1.0), variant);
  rs[0] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(0.0, -1.0), variant);
  rs[1] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(1.0, -1.0), variant);
  rs[2] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(-1.0, 0.0), variant);
  rs[3] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(0.0, 0.0), variant);
  rs[4] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(1.0, 0.0), variant);
  rs[5] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(-1.0, 1.0), variant);
  rs[6] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(0.0, 1.0), variant);
  rs[7] = r; updateVoronoiNearest(r, mr, md, md2);
  r = voronoiCellOffsetStatic(g, f, vec2(1.0, 1.0), variant);
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

  float edgeWidth = 0.6 / max(sharpness, 0.001);
  float web = 1.0 - smoothstep(0.0, max(edgeWidth, 0.001), border);
  float junctionFactor = sqrt(md) / sqrt(md2);
  return web * junctionFactor;
}

half4 main(float2 fragCoord) {
  float2 tileCoord = fragCoord * (floorScale / iResolution.x);
  half4 color = floorTexture.eval(tileCoord * iResolution.x);
  if (color.a < 0.01) { return color; }

  float depth = 1.0 - fragCoord.y / iResolution.y;
  half3 tint = half3(underwaterTint);
  half3 deepTint = half3(0.35, 0.55, 0.30);
  half3 withDepth = mix(tint, deepTint, depth * underwaterDepthStrength);
  color.rgb *= mix(half3(1.0), withDepth, underwaterTintStrength);

  vec2 local = (fragCoord - vec2(floorX, floorY)) / vec2(floorW, floorH);
  float variant = floor(iTime * switchRate);

  int layerCount = int(voronoiCount);
  for (int i = 0; i < ${MAX_SWAMPFLOOR_VORONOI_LAYERS}; i++) {
    if (i >= layerCount) { break; }
    vec2 coord = vec2(local.x * aspectRatio, local.y) * voronoiScale[i];
    float layerVariant = variant + float(i) * 3.0;
    float drift = staticCaustics(coord, layerVariant,
      voronoiSharpness[i], voronoiClusterAmp[i], voronoiClusterFreq[i]);
    half beam = half(drift * voronoiIntensity[i] * color.a);
    half3 beamTint = half3(voronoiTintR[i], voronoiTintG[i], voronoiTintB[i]);
    color.rgb = mix(color.rgb, color.rgb * beamTint, beam);
  }

  float contactShadow = smoothstep(shadowStart, shadowEnd, local.y) * shadowStrength * color.a;
  color.rgb *= half(1.0 - contactShadow);

  return color;
}
`;

export const swampfloorDefaults = {
  /** Caustic pattern snaps per second — higher = faster dancing light. */
  switchRate: 7.0,
  /** RGB multiplier for swamp color cast — murky green/brown. */
  underwaterTint: [0.5, 0.7, 0.4] as const,
  /** Swamp tint intensity — 0 = none, 1 = full. */
  underwaterTintStrength: 0.5,
  /** Vertical depth gradient — darker/greener toward top of screen. */
  underwaterDepthStrength: 2,
  /** Stacked voronoi layers (max MAX_SWAMPFLOOR_VORONOI_LAYERS). */
  voronoiCount: 2,
  /** Voronoi cell density per layer in floor-local UV space. */
  voronoiScale: [10.0, 14.0, 20.0],
  /** Caustic beam strength per layer. */
  voronoiIntensity: [0.08, 0.05, 0.03],
  /** Border line width per layer — higher = thinner veins. */
  voronoiSharpness: [2.0, 1.2, 0.6],
  /** Domain warp amplitude per layer. */
  voronoiClusterAmp: [0.8, 0.5, 0.6],
  /** Domain warp frequency per layer. */
  voronoiClusterFreq: [0.08, 0.25, 0.35],
  /** Caustic beam RGB multiplier per layer. */
  voronoiTint: [
    [1.6, 1.8, 1.4],
    [1.6, 1.8, 1.4],
    [1.6, 1.8, 1.4],
  ] as const,
  /** Bottom contact shadow — darkens toward the base of the floor sprite. */
  shadowStrength: 0.4,
  /** Local Y where the shadow gradient begins (0 = top, 1 = bottom). */
  shadowStart: 0.65,
  /** Local Y where the shadow reaches full strength. */
  shadowEnd: 1.0,
  /** Width/height ratio of the sprite — compensates for non-square images. */
  aspectRatio: 20.0,
  /** Texture tiling scale — higher = more tiles across the floor. */
  floorScale: 2.4,
} as const;
