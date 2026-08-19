Status: ready-for-agent

# Issue 02: Single wave particle lens

## Goal
Add one wave particle as invisible lens distortion field evaluated inside each participant shader.

## Depends on
Issue 01

## Scope
- Define `WaterWave` type in `components/exercises/themes/swamp/shaders/waterWaves.ts`:
```ts
export type WaterWave = { x:number, y:number, birthTime:number, duration:number, maxRadius:number, strength:number, width:number };
```
- Extend participant shaders (`swampfloor.sksl.ts`, `stone.sksl.ts`, `algaeDeform.sksl.ts`) with single-wave lens:
```glsl
uniform float2 waveCenter;
uniform float waveRadius;
uniform float waveStrength;
uniform float waveWidth;
uniform float waveDecay; // 0.001 scale
uniform float waveActive; // 1 or 0
// inside main after wobble:
float2 waveDisp = float2(0.0);
if (waveActive > 0.5) {
  float2 toPix = fragCoord - waveCenter;
  float dist = length(toPix);
  float2 dir = dist > 0.001 ? normalize(toPix) : float2(0.0);
  float edge = abs(dist - waveRadius);
  float ring = exp(-edge*edge / (waveWidth*waveWidth));
  float envelope = exp(-dist * waveDecay);
  waveDisp = dir * ring * envelope * waveStrength;
}
float2 total = wobble + waveDisp;
float2 sampleCoord = fragCoord + total;
```
- JS: `StoneInstance`, `AlgaeInstance`, `SwampThemeFloorCanvas` receive `waveCenter/radius/strength/width/decay/active` via `useDerivedValue` from a `SharedValue<WaterWave>` at screen center initially, `radius = (iTime - birthTime) * waveSpeed` computed on JS or in shader from `birthTime`
- Alternative: pass `waveBirthTime` + `waveSpeed` and compute radius in shader: `radius = (iTime - waveBirthTime) * waveSpeed`

## Defaults
```ts
export const singleWaveDefaults = {
  waveSpeed: 80.0,
  waveWidth: 12.0,
  waveStrength: 4.0,
  waveDecay: 0.0015,
  waveMaxRadius: 300,
  waveDuration: 4000,
} as const;
```

## Acceptance
- Single lens expands from screen center, distorts floor/stones/algae where it overlaps, no copy underneath, strength strongest at ring edge
- Base wobble still works alongside
- No snapshot, 60fps

## Experiment checklist
- [ ] Move waveCenter
- [ ] Tweak waveSpeed 40..150
- [ ] Tweak width 6..24
- [ ] Tweak strength 1..8
