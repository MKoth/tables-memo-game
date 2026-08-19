# PRD: Swamp Water Surface — Per-Participant Wave Particles

## Problem

The swamp theme renders seafloor, stones and algae with static voronoi/caustics but lacks underwater motion. Previous attempt used full-screen `makeImageSnapshot()` + `sceneTexture` distortion — caused ghost copy (distorted over undistorted source), floor not distorted (separate Canvas), algae freeze (static snapshot of animated deform), and JS 60→4fps (per-frame GPU readback + `setState`).

## Goal

Implement per-participant water distortion that:
1. Adds base underwater wobble + tint to floor, stones and algae without snapshot, at 60fps
2. Introduces wave particles as distortion fields (lens) — not rendered rings — each particle expands from its center and lenses underlying pixels
3. Distributes wave field evaluation inside each participant shader via shared uniform array, with spatial culling
4. Spawns waves ambiently at random screen positions with auto-expire, tweakable at each stage

## Architecture

- **Wave particle (JS)**: `{ x, y, birthTime, duration, maxRadius, strength, width }` + derived `radius = (iTime - birthTime) * waveSpeed`
- **Delivery**: Fixed uniform array `MAX_WAVES = 8` — `waveCenters[8]`, `waveRadii[8]`, `waveStrengths[8]`, `waveWidths[8]`, `waveCount` — passed to each participant `RuntimeEffect` via `useDerivedValue` (UI thread), no React `setState` per frame
- **Evaluation**: Inside `swampfloor.sksl.ts`, `stone.sksl.ts`, `algaeDeform.sksl.ts` — for each pixel `fragCoord` compute `dist = length(fragCoord - center)`, `edge = abs(dist - radius)`, `influence = exp(-edge*edge/(width*width)) * exp(-dist*decay) * strength`, `dir = normalize(fragCoord - center)`, `displacement += dir * influence`; `sampleCoord = fragCoord + wobble + displacement`; `texture.eval(sampleCoord)`; tint via `mix`
- **Culling**: `if (dist > radius + width*2 + spriteRadius) continue` to skip distant waves (floor uses screen radius)
- **Per-layer multiplier**: `floor 0.6`, `stone 1.0`, `algae 1.3` on `waveStrength` (all get wobble)
- **JS manager**: `useWaveParticles.ts` ambient spawner — every `generationInterval` 1500-2000ms spawn 1-2 waves at random `(x,y)` in screen bounds, evict oldest when full, auto-expire when `age > duration` or `radius > maxRadius`
- **No snapshot**: Single unified `Canvas` or per-instance `Rect Shader` with `ImageShader` child, `iTime` quantized via `useExerciseClockQuantized` where needed

See ADR-0008 for rationale (snapshot rejected, per-participant lens chosen).

## Implementation Stages

### Stage 1: Base Wobble + Tint Per Participant (no waves)
- Inject wobble + tint into floor + stone + algae shaders
- `uniform float2 iResolution, float iTime, float tintR/G/B, tintStrength, wobbleFreq/Amp/Speed`
- Formula: `wobble.x = sin(fragCoord.y*freq + iTime*speed)*amp; wobble.y = cos(fragCoord.x*freq*0.8 + iTime*speed*0.7)*amp*0.6; sampleCoord = fragCoord + wobble;`
- Tweakable: tint color/strength, wobble freq/amp/speed

### Stage 2: Single Wave Particle Lens
- Add single wave uniforms: `waveCenter, waveRadius, waveStrength, waveWidth, waveDecay, waveActive`
- Lens loop for one wave in each participant shader, same displacement math
- JS: single `SharedValue` wave at screen center, `radius = (iTime - birthTime)*speed`
- Tweakable: waveSpeed, width, strength, decay, maxRadius

### Stage 3: Multiple Waves via Uniform Array
- Extend to `MAX_WAVES = 8` arrays, `waveCount`, loop with culling
- JS: `useWaveParticles` with `SharedValue<WaterWave[]>` padded to 8
- Tweakable: MAX_WAVES, waveCount range

### Stage 4: Ambient Manager + Lifecycle
- Manager spawns 1-2 waves every 1500-2000ms at random, auto-expire after 4s / radius>300
- No manual add/remove — ambient only per decision
- Tweakable: generationInterval, spawn count, lifetime, reuse policy

## Out of Scope
- Full-screen `makeImageSnapshot` capture
- Visual wave ring rendering (wave is invisible field)
- Roamer / WordSprite integration
- Audio

## Success Criteria
- Floor, stones, algae each show tint + wobble without ghost copy
- Waves lens stones/floor where they overlap, no undistorted copy underneath
- 60fps with 8 waves, 40+ stones+algae sprites
- All params uniform-driven
