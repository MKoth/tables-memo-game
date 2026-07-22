export const MAX_ROSE_SHADOWS = 64;

export const ROSE_SHADOWS_SKSL = `
uniform float2 lightOffset;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform float shadowSquash;
uniform float stemShadowTopSkew;
uniform float resolutionScale;
uniform float roseShadowCount;
uniform float2 roseShadowCenter[${MAX_ROSE_SHADOWS}];
uniform float roseShadowRadius[${MAX_ROSE_SHADOWS}];
uniform float2 roseShadowBase[${MAX_ROSE_SHADOWS}];

half4 main(float2 fragCoord) {
  float2 fc = fragCoord / resolutionScale;
  float total = 0.0;
  float inner = 1.0 - shadowSoftness;

  for (int i = 0; i < ${MAX_ROSE_SHADOWS}; i++) {
    if (float(i) >= roseShadowCount) break;
    float2 c = mix(roseShadowCenter[i] + lightOffset, roseShadowBase[i], stemShadowTopSkew);
    float r = roseShadowRadius[i];
    float2 d = fc - c;
    if (abs(d.x) > r || abs(d.y) > r) continue;
    float2 ds = float2(d.x, d.y / shadowSquash);
    if (dot(ds, ds) > r * r) continue;
    float dist = length(ds);
    if (dist > r) continue;
    float t = 1.0 - smoothstep(r * inner, r, dist);
    if (t > total) total = t;
  }

  float a = total * shadowOpacity;
  if (a < 0.004) {
    return half4(0.0);
  }
  return half4(shadowColor * a, a);
}
`;

export const roseShadowDefaults = {
  lightOffset: [3, 5] as const,
  shadowColor: [0, 0, 0] as const,
  shadowOpacity: 0.32,
  shadowSoftness: 0.55,
  shadowSquash: 1.0,
  roseRadiusFraction: 0.6,
  resolutionScale: 0.5,
  stemShadowTopSkew: 0.2,
} as const;
