Status: ready-for-agent

# Issue 04: Ambient wave manager (auto spawn + expire)

## Goal
Ambient random wave generation with auto-expire, no manual add/remove.

## Depends on
Issue 03

## Scope
- Create `components/exercises/themes/swamp/scenery/useWaveParticles.ts`:
```ts
export type WaterWave = { x:number, y:number, birthTime:number, duration:number, maxRadius:number, strength:number, width:number };
export function useWaveParticles(config: {
  maxWaves: number,
  generationInterval: number, // 1500
  minPerCycle: number, // 1
  maxPerCycle: number, // 2
  waveSpeed: number,
  waveWidth: number,
  waveStrength: number,
  waveDecay: number,
  maxRadius: number,
  duration: number,
  screenBounds: { width:number, height:number },
  clock: SharedValue<number>,
}): {
  waveCenters: SharedValue<number[]>, // flat 2*MAX_WAVES
  waveRadii: SharedValue<number[]>,
  waveStrengths: SharedValue<number[]>,
  waveWidths: SharedValue<number[]>,
  waveCount: SharedValue<number>,
}
```
- Use `useDerivedValue` + JS timer (`setInterval` or `useFrameCallback` throttled) to spawn: pick `n = random(minPerCycle, maxPerCycle)`, `x = random(0,width)`, `y = random(0,height)`, `birthTime = clock.value/1000`, push to array, evict oldest if full
- Each frame compute `radius = (iTime - birthTime)*waveSpeed`, if `radius > maxRadius` or `age > duration/1000` remove wave (filter active)
- Wire to `SwampThemeSceneryBackground.tsx` — pass derived wave uniforms to `SwampThemeFloorCanvas`, `StoneInstance`, `AlgaeInstance` (or via context)
- No manual API per decision

## Defaults
```ts
export const waveManagerDefaults = {
  generationInterval: 1800,
  minPerCycle: 1,
  maxPerCycle: 2,
  waveSpeed: 80,
  waveWidth: 12,
  waveStrength: 4.0,
  waveDecay: 0.0015,
  maxRadius: 280,
  duration: 4000,
  maxWaves: 8,
} as const;
```

## Acceptance
- Waves appear ambiently every ~1.8s at random positions, expand and fade, auto-removed without pop
- No snapshot, 60fps, all params tweakable

## Experiment checklist
- [ ] generationInterval 800..3000
- [ ] spawn count 1..3
- [ ] duration 2s..6s
- [ ] maxRadius 150..400
