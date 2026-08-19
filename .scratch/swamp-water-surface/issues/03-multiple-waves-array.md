Status: ready-for-agent

# Issue 03: Multiple waves via uniform array + culling

## Goal
Extend lens to `MAX_WAVES = 8` uniform array evaluated per pixel with spatial culling.

## Depends on
Issue 02

## Scope
- Extend shaders to array:
```glsl
#define MAX_WAVES 8
uniform float2 waveCenters[MAX_WAVES];
uniform float waveRadii[MAX_WAVES];
uniform float waveStrengths[MAX_WAVES];
uniform float waveWidths[MAX_WAVES];
uniform float waveCount;
uniform float waveDecay;
```
Loop:
```glsl
float2 waveDisp = float2(0.0);
for (int i=0; i<MAX_WAVES; i++) {
  if (float(i) >= waveCount) break;
  float2 center = waveCenters[i];
  float radius = waveRadii[i];
  float strength = waveStrengths[i];
  float width = waveWidths[i];
  float2 toPix = fragCoord - center;
  float dist = length(toPix);
  if (dist > radius + width*4.0 + 60.0) continue; // cull distant
  float2 dir = dist > 0.001 ? normalize(toPix) : float2(0.0);
  float edge = abs(dist - radius);
  float ring = exp(-edge*edge/(width*width));
  float envelope = exp(-dist * waveDecay);
  waveDisp += dir * ring * envelope * strength;
}
```
- Create `waterWaves.sksl.ts` snippet or duplicate loop into each shader file (or extract shared `applyWaterWaves(fragCoord, ...)` function)
- JS: `useWaveParticles.ts` holds `SharedValue<WaterWave[]>` padded to 8, `useDerivedValue` maps to `waveCenters/radii/strengths/widths/count` with `iTime` driving `radius = (iTime - birthTime)*speed`
- Follow `stone.sksl.ts` padding pattern: `padArray` for centers
- Per-layer multiplier applied after loop: `waveDisp *= layerWaveMultiplier` (floor 0.6, stone 1.0, algae 1.3)

## Defaults
```ts
export const multiWaveDefaults = { maxWaves: 8 } as const;
```

## Acceptance
- 2-8 waves simultaneously, overlapping lens sum where they intersect
- Distant waves culled, 60fps with 8 waves
- No snapshot

## Experiment checklist
- [ ] 1 vs 4 vs 8 waves
- [ ] Overlap interference
- [ ] Culling threshold
