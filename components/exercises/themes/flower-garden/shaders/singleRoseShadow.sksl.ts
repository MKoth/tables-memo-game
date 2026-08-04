export const SINGLE_ROSE_SHADOW_SKSL = `
uniform float2 lightOffset;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform float shadowSquash;
uniform float stemShadowTopSkew;
uniform float resolutionScale;
uniform float2 roseCenter;
uniform float roseRadius;
uniform float2 roseBase;

half4 main(float2 fragCoord) {
  float2 fc = fragCoord / resolutionScale;
  float inner = 1.0 - shadowSoftness;
  float2 c = mix(roseCenter + lightOffset, roseBase, stemShadowTopSkew);
  float r = roseRadius;
  float2 d = fc - c;
  if (abs(d.x) > r || abs(d.y) > r) return half4(0.0);
  float2 ds = float2(d.x, d.y / shadowSquash);
  if (dot(ds, ds) > r * r) return half4(0.0);
  float dist = length(ds);
  if (dist > r) return half4(0.0);
  float t = 1.0 - smoothstep(r * inner, r, dist);
  float a = t * shadowOpacity;
  if (a < 0.004) return half4(0.0);
  return half4(shadowColor * a, a);
}
`;

export const roseShadowDefaults = {
  lightOffset: [3, 5] as const,
  shadowColor: [0, 0, 0] as const,
  shadowOpacity: 0.55,
  shadowSoftness: 0.55,
  shadowSquash: 1.0,
  roseRadiusFraction: 0.6,
  resolutionScale: 1.0,
  stemShadowTopSkew: 0.2,
} as const;
