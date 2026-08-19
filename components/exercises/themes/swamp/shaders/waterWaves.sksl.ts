import { MAX_WAVES } from './waterWaves';

export const WATER_WAVES_UNIFORMS_SKSK = `
uniform float2 waveCenters[${MAX_WAVES}];
uniform float waveRadii[${MAX_WAVES}];
uniform float waveStrengths[${MAX_WAVES}];
uniform float waveWidths[${MAX_WAVES}];
uniform float waveCount;
uniform float waveDecay;
`;

export const WATER_WAVE_LOOP_SKSK = `
// Per-pixel water lens from MAX_WAVES array, with spatial culling.
// Expects fragCoord in screen space, waveDecay uniform, and waveDisp already declared.
for (int i=0; i<${MAX_WAVES}; i++) {
  if (float(i) >= waveCount) break;
  float2 center = waveCenters[i];
  float radius = waveRadii[i];
  float strength = waveStrengths[i];
  float width = waveWidths[i];
  float2 toPix = fragCoord - center;
  float dist = length(toPix);
  if (dist > radius + width*4.0 + 60.0) continue;
  float2 dir = dist > 0.001 ? normalize(toPix) : float2(0.0);
  float edge = abs(dist - radius);
  float ww = max(width, 0.001);
  float ring = exp(-edge*edge / (ww*ww));
  float envelope = exp(-dist * waveDecay);
  waveDisp += dir * ring * envelope * strength;
}
`;
