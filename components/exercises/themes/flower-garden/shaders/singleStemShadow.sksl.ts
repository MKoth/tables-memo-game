export const SINGLE_STEM_SHADOW_SKSL = `
uniform float2 lightOffset;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform float stemShadowTopSkew;
uniform float stemShadowTopBlur;
uniform float resolutionScale;
uniform float2 stemBase;
uniform float2 stemTop;
uniform float stemBaseWidth;
uniform float stemTopWidth;

half4 main(float2 fragCoord) {
  float2 fc = fragCoord / resolutionScale;
  float2 a = stemBase;
  float2 b = stemTop + lightOffset;
  float2 effectiveTop = mix(b, a, stemShadowTopSkew);
  float baW = stemBaseWidth;
  float toW = stemTopWidth;
  float maxW = max(baW, toW);
  float2 ba = effectiveTop - a;
  float baLenSq = dot(ba, ba);
  if (baLenSq < 1e-6) {
    return half4(0.0);
  }
  float2 pa = fc - a;
  float h = clamp(dot(pa, ba) / baLenSq, 0.0, 1.0);
  float2 closest = ba * h;
  float dist = length(pa - closest);
  float w = mix(baW, toW, h);
  float soft = mix(shadowSoftness, shadowSoftness + stemShadowTopBlur, h);
  float widx = 1.0 - soft;
  if (dist > w) {
    return half4(0.0);
  }
  float t = 1.0 - smoothstep(w * widx, w, dist);
  float alpha = t * shadowOpacity;
  if (alpha < 0.004) {
    return half4(0.0);
  }
  return half4(shadowColor * alpha, alpha);
}
`;

export const singleStemShadowDefaults = {
  lightOffset: [3, 5] as const,
  shadowColor: [0, 0, 0] as const,
  shadowOpacity: 0.22,
  shadowSoftness: 0.55,
  stemShadowWidthScale: 0.7,
  stemShadowTopSkew: 0.2,
  stemShadowTopBlur: 0.3,
  resolutionScale: 0.5,
} as const;
