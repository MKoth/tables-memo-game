export const GRASS_HOLE_MASK_SKSL = `
uniform float2 center;
uniform float2 radius;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform float noiseAmount;
uniform float noiseScale;
uniform float resolutionScale;

float hash21(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + float2(1.0, 0.0));
  float c = hash21(i + float2(0.0, 1.0));
  float d = hash21(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) - 0.5;
}

half4 main(float2 fragCoord) {
  float2 fc = fragCoord / resolutionScale;

  float2 n = (fc - center) / max(radius, 0.001);
  float r = length(n);
  float phi = atan(n.y, n.x);

  float waveOffset = waveAmplitude * sin(waveFrequency * phi);
  float noise = valueNoise(fc * noiseScale);
  float edgeR = 1.0 + waveOffset + noiseAmount * noise;

  float mask = 1.0 - smoothstep(edgeR - 0.005, edgeR + 0.005, r);

  return half4(0, 0, 0, mask);
}
`;

export type GrassHoleMaskConfig = {
  centerX?: number;
  centerY?: number;
  minDiameter?: number;
  maxDiameter?: number;
  waveAmplitude?: number;
  waveLength?: number;
  noiseAmount?: number;
  noiseScale?: number;
};
