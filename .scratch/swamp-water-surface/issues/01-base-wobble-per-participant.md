Status: ready-for-agent

# Issue 01: Base wobble + tint per participant (no snapshot)

## Goal
Inject base underwater wobble + tint into swamp participant shaders without `makeImageSnapshot`, restoring 60fps and fixing floor/algae miss and ghost copy.

## Scope
- Extend `swampfloor.sksl.ts` to sample `floorTexture.eval(sampleCoord)` where `sampleCoord = fragCoord + wobble` before voronoi/tint (keep existing voronoi/tint logic, add wobble before sampling)
- Extend `stone.sksl.ts` similarly: `sampleCoord = fragCoord + wobble; color = stoneTexture.eval(sampleCoord)`
- Extend `algaeDeform.sksl.ts` similarly (or keep its existing wave deform and add water wobble on top)
- Create `waterWobble.sksl.ts` snippet or inline wobble uniforms into each shader
- Wire `SwampThemeFloorCanvas.tsx`, `StoneInstance.tsx`, `AlgaeInstance.tsx` via `useDerivedValue(()=>({iTime: clock.value/1000, iResolution, tintR/G/B, tintStrength, wobbleFreq/Amp/Speed}))` — use `useExerciseClock` / `useExerciseClockQuantized` as needed
- Unify `SwampThemeSceneryBackground.tsx` to single `Canvas` or keep per-instance `Canvas` but remove `WaterSurface` snapshot wrapper — ensure floor+stones+algae share same `Canvas` hierarchy or same clock so wobble is coherent

## Shader uniforms
```glsl
uniform float2 iResolution;
uniform float iTime;
uniform float tintR, tintG, tintB;
uniform float tintStrength;
uniform float wobbleFreq;
uniform float wobbleAmp;
uniform float wobbleSpeed;
```

Wobble:
```glsl
float2 wobble;
wobble.x = sin(fragCoord.y * wobbleFreq + iTime * wobbleSpeed) * wobbleAmp;
wobble.y = cos(fragCoord.x * wobbleFreq * 0.8 + iTime * wobbleSpeed * 0.7) * wobbleAmp * 0.6;
float2 sampleCoord = fragCoord + wobble;
half4 col = floorTexture.eval(sampleCoord * (floorScale / iResolution.x)); // floor: keep tiling
// or stoneTexture.eval(sampleCoord)
col.rgb *= mix(half3(1.0), half3(tintR,tintG,tintB), tintStrength);
```

Per-layer multiplier (optional):
```ts
floor: wobbleAmp*0.6, stone: *1.0, algae: *1.3  // or shared amp and shader multiplies
```

## Defaults
```ts
export const waterWobbleDefaults = {
  tintR: 0.75, tintG: 0.85, tintB: 0.70,
  tintStrength: 0.25,
  wobbleFreq: 0.008,
  wobbleAmp: 2.0,
  wobbleSpeed: 0.5,
} as const;
```

## Acceptance
- Floor, stones, algae all show subtle wobble + tint, no ghost copy, no zoom
- Algae retains its deform animation plus wobble
- 60fps, no `makeImageSnapshot`, no `setState` loop
- Params tweakable via uniforms

## Experiment checklist
- [ ] Tweak wobbleAmp 0.5..5
- [ ] Tweak wobbleFreq 0.002..0.02
- [ ] Tweak tintStrength 0..0.5
