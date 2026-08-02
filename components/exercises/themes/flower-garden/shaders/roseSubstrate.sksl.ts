export const MAX_ROSE_DISCS = 40;
export const SUBSTRATE_COVERING_SIZE = 200;

export const ROSE_SUBSTRATE_SKSL = `
uniform float roseCount;
uniform float roseCenterX[${MAX_ROSE_DISCS}];
uniform float roseCenterY[${MAX_ROSE_DISCS}];
uniform float roseScale[${MAX_ROSE_DISCS}];
uniform float roseDiscRadius[${MAX_ROSE_DISCS}];
uniform float3 roseTint[${MAX_ROSE_DISCS}];
uniform float substrateRadius;
uniform float substrateOpacity;
uniform float substrateFade;
uniform float substrateTintStrength;
uniform shader substrateTexture;

const float SUBSTRATE_COVERING = ${SUBSTRATE_COVERING_SIZE}.0;

half4 main(float2 fragCoord) {
  half4 color = half4(0.0);
  int n = int(roseCount);
  float halfCovering = SUBSTRATE_COVERING * 0.5;

  for (int i = 0; i < ${MAX_ROSE_DISCS}; i++) {
    if (i >= n) break;
    float subR = roseDiscRadius[i] * roseScale[i] * substrateRadius;
    if (subR < 0.5) continue;
    float2 subCenter = float2(roseCenterX[i], roseCenterY[i]);
    float2 subD = fragCoord - subCenter;
    if (abs(subD.x) > subR || abs(subD.y) > subR) continue;
    float subDist = length(subD);
    if (subDist > subR) continue;
    float2 subEval = float2(halfCovering) + (subD / subR) * halfCovering;
    half4 subColor = substrateTexture.eval(subEval);
    half subLum = max(max(subColor.r, subColor.g), subColor.b);
    subColor.rgb = mix(subColor.rgb, half3(roseTint[i]) * subLum, half(substrateTintStrength));
    float subFadeStart = subR * (1.0 - clamp(substrateFade, 0.0, 0.95));
    float subFade = 1.0 - smoothstep(subFadeStart, subR, subDist);
    float subAlpha = subColor.a * substrateOpacity * subFade;
    color = subColor * subAlpha + color * (1.0 - subAlpha);
  }

  return color;
}
`;

export const roseSubstrateUniformDefaults = {
  substrateRadius: 0.7,
  substrateOpacity: 1.0,
  substrateFade: 0.15,
  substrateTintStrength: 1.0,
} as const;
