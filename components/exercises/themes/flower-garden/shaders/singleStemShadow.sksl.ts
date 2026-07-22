import { MAX_LEAVES_PER_STEM } from '../scenery/BushShaderLayer/types';

export const MAX_STEM_SHADOW_LEAVES = MAX_LEAVES_PER_STEM;

export const SINGLE_STEM_SHADOW_SKSL = `
uniform float2 lightOffset;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform float stemShadowTopSkew;
uniform float stemShadowTopBlur;
uniform float leafShadowOpacity;
uniform float leafShadowRadiusFraction;
uniform float leafShadowSoftness;
uniform float resolutionScale;
uniform float2 stemBase;
uniform float2 stemTop;
uniform float2 stemControl;
uniform float stemBaseWidth;
uniform float stemTopWidth;
uniform float leafCount;
uniform float leafT[${MAX_STEM_SHADOW_LEAVES}];
uniform float leafSize[${MAX_STEM_SHADOW_LEAVES}];

float2 bezierPoint(float t, float2 p0, float2 p1, float2 p2) {
  float u = 1.0 - t;
  return u * u * p0 + 2.0 * u * t * p1 + t * t * p2;
}

half4 main(float2 fragCoord) {
  float2 fc = fragCoord / resolutionScale;
  half4 color = half4(0.0);

  float2 topB = stemTop + lightOffset;
  float2 effectiveTop = mix(topB, stemBase, stemShadowTopSkew);
  float2 effectiveControl = mix(stemControl, stemBase, stemShadowTopSkew);

  for (int i = 0; i < ${MAX_STEM_SHADOW_LEAVES}; i++) {
    if (float(i) >= leafCount) break;
    float2 attachment = bezierPoint(leafT[i], stemBase, effectiveControl, effectiveTop);
    float r = max(leafSize[i] * leafShadowRadiusFraction, 0.5);
    float2 d = fc - attachment;
    if (dot(d, d) > r * r) continue;
    float soft = clamp(leafShadowSoftness, 0.0, 0.99);
    float inner = r * (1.0 - soft);
    float dist = length(d);
    if (dist > r) continue;
    float t = 1.0 - smoothstep(inner, r, dist);
    float alpha = t * leafShadowOpacity;
    if (alpha < 0.004) continue;
    color = half4(shadowColor * alpha, alpha) + color * (1.0 - alpha);
  }

  float baW = stemBaseWidth;
  float toW = stemTopWidth;
  float2 ba = effectiveTop - stemBase;
  float baLenSq = dot(ba, ba);
  if (baLenSq >= 1e-6) {
    float2 pa = fc - stemBase;
    float h = clamp(dot(pa, ba) / baLenSq, 0.0, 1.0);
    float2 closest = ba * h;
    float2 pd = pa - closest;
    float w = mix(baW, toW, h);
    if (dot(pd, pd) <= w * w) {
      float soft = mix(shadowSoftness, shadowSoftness + stemShadowTopBlur, h);
      float widx = 1.0 - soft;
      float dist = length(pd);
      float stemT = 1.0 - smoothstep(w * widx, w, dist);
      float stemAlpha = stemT * shadowOpacity;
      if (stemAlpha >= 0.004) {
        color = half4(shadowColor * stemAlpha, stemAlpha) + color * (1.0 - stemAlpha);
      }
    }
  }

  return color;
}
`;

export const singleStemShadowDefaults = {
  lightOffset: [3, 5] as const,
  shadowColor: [0, 0, 0] as const,
  shadowOpacity: 0.45,
  shadowSoftness: 0.55,
  stemShadowWidthScale: 0.7,
  stemShadowTopSkew: 0.2,
  stemShadowTopBlur: 0.3,
  leafShadowOpacity: 0.40,
  leafShadowRadiusFraction: 0.45,
  leafShadowSoftness: 0.6,
  resolutionScale: 0.5,
} as const;
