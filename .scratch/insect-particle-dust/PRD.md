# PRD: Insect particle dust layer

Status: ready-for-agent
Triage: ready-for-agent

## Problem Statement

The flower-garden theme's roamer zone feels empty during flight. When a roamer variant (butterfly, bee, or bumblebee) flies between field flowers, there is no visual feedback of motion — no dust, no shimmer, nothing that communicates "this insect is airborne." The scenery is rich (bushes, field flowers, earth, grass), the WordSprite layer is polished, and the roamer itself has high-quality wing-flap animation, but the gap between them reads as dead air.

Other exercises in the codebase use particle-like effects for visual polish (metaball merge in round resolution, bubble wobble in word transformation). The user wants a similar effect for the flower-garden roamer layer: a particle-trail dust system that only activates when insects are in the air.

## Solution

A new particle dust layer inserted visually between the Scenery (z=1) and the Roamer (z=2) in the flower-garden theme's layer stack. It renders soft, additive-glowing circles that trail behind flying roamers and fade out as they drift downward. The layer is:

- **Non-interactive** (`pointerEvents="none"`) — it never blocks taps
- **Performance-optimised** — a single Skia shader loops through all particles in one GPU draw call, with particle state managed entirely on the UI thread via a Reanimated worklet
- **Roamer-state-aware** — particles only emit from roamers whose flight state is `FLYING_CRUISE` or `APPROACH_FLOWER` (never from sitting or lifting-off roamers)
- **Configurable per roamer variant** — emission rate, particle colour, and TTL ranges are species-dependent

### Visual specification

- **Particle shape**: Soft gaussian glow circles (additive blending)
- **Size**: 3–7 px diameter, randomised per particle
- **Colour**: Species-dependent — butterfly (warm gold `#FFE4B5`), bee (golden yellow `#FFD700`), bumblebee (warm brown `#DEB887`)
- **Behaviour**: Emit at insect's current position, fall straight down at constant speed (~40 px/s), fade in over 20% of TTL, hold at full opacity, fade out over the last 30% of TTL, then die and recycle
- **TTL**: 1200–2400 ms, randomised per particle
- **Density**: ~4 particles/second per airborne insect, configurable

## User Stories

1. As a learner, I want to see faint glowing particles trailing behind flying insects, so that the roamer zone feels alive and the insects' motion reads clearly against the scenery.

2. As a learner, I want particles to only appear when insects are flying (not sitting on flowers), so that the visual effect reinforces the insect's state rather than distracting from it.

3. As a learner, I want particles to drift downward gently and fade out, so that they look like natural falling pollen dust.

4. As a learner, I want particles to glow softly rather than have hard edges, so that they read as magical/warm ambient effect rather than solid debris.

5. As a developer, I want the particle layer to be non-interactive, so that it never intercepts taps that should reach the roamer or WordSprite layer.

6. As a developer, I want the particle system to not degrade the simulation framerate, so that the roamer physics stays at 30 fps regardless of particle count.

7. As a developer, I want the particle data to flow entirely on the UI thread and GPU, so that the JS thread is never blocked by particle lifecycle.

8. As a developer, I want the particle emission to be configurable per roamer variant (butterfly, bee, bumblebee), so that different insect types can have different particle densities and colours.

9. As a developer, I want the roamer simulation to remain unchanged, so that the particle layer is purely additive and has zero impact on existing flight dynamics.

10. As a developer, I want the particle shader to use the same `<Rect>` + `<Shader>` + uniform arrays pattern established by the rose shadows and metaball shaders, so that the rendering architecture is consistent.

11. As a developer, I want the particle frame loop to be a pure worklet (no `runOnJS`), so that 100% of the per-frame work stays on the UI thread.

12. As a developer, I want the particle system to share the roamer simulation's lifecycle — start when the exercise mounts, pause when the app backgrounds, resume on foreground — so that the particle timing stays coherent with the insect motion.

13. As a tester, I want the particle emission and update logic to be testable as pure functions in Jest, so that I can verify particle lifecycle behaviour without running on a device.

## Implementation Decisions

### 1. New module: `particleDust.sksl.ts`

A SKSL shader module (same pattern as `roseShadows.sksl.ts`, `metaballMerge.sksl.ts`) that renders all particles in one GPU pass. The shader takes:

```
uniform float2 iResolution;            // screen dimensions
uniform float uActiveCount;            // number of active particles this frame
uniform float4 uParticleData[MAX_PARTICLES]; // (x, y, opacity, radius) per particle
uniform float4 uParticleColor[MAX_PARTICLES]; // (r, g, b, _) per particle
```

Compiled at module load time via `Skia.RuntimeEffect.Make()`, with an error throw on failure (same as `compileMetaballEffect()`). `MAX_PARTICLES` is a constant (200), templated into the SKSL string like `MAX_ROSE_SHADOWS` / `MERGE_SHADER_MAX_LETTERS`.

The shader loops through all entries, culls by bounding box (same pattern as `roseShadows.sksl.ts`), and accumulates additive colour:

```glsl
half4 color = half4(0);
for (int i = 0; i < MAX_PARTICLES; i++) {
  if (float(i) >= uActiveCount) break;
  float4 d = uParticleData[i];
  float2 delta = fragCoord - d.xy;
  float r = d.w;
  if (abs(delta.x) > r || abs(delta.y) > r) continue;
  float dist = length(delta) / r;
  float strength = exp(-dist * dist * 2.0) * d.z;
  float4 pc = uParticleColor[i];
  color += half4(pc.rgb * strength, strength);
}
return color;
```

### 2. New module: `particleConfig.ts`

Constant definitions for the particle system:
- `MAX_PARTICLES = 200` (fixed pool size, recycles slots)
- `EMIT_INTERVAL_MS` per species (default 250ms)
- `PARTICLE_TTL_MIN`, `PARTICLE_TTL_MAX`
- `PARTICLE_DIAMETER_MIN`, `PARTICLE_DIAMETER_MAX`
- `FALL_SPEED` (40 px/s)
- `FADE_IN_FRACTION = 0.2`, `FADE_OUT_FRACTION = 0.3` (of TTL)
- `PARTICLE_COLORS` map: `Record<RoamerSpecies, [number, number, number]>`

### 3. New module: `useParticleFrameLoop.ts`

Frame worklet (Reanimated `useFrameCallback`) that manages the particle pool. Called once per exercise frame (~30fps).

Takes:
- `runtimeEntries: RoamerRuntimeEntry[]` (from the lifted roamer sim)
- Particle pool arrays as `SharedValue<Float32Array>`:
  - `uPos: SharedValue<Float32Array>` — flat array `[x0, y0, op0, r0, x1, y1, op1, r1, ...]`
  - `uCol: SharedValue<Float32Array>` — flat array `[r0, g0, b0, 0, r1, g1, b1, 0, ...]`
  - `uActiveCount: SharedValue<number>`
- Per-frame bookkeeping:
  - `lastEmitTimestamps: SharedValue<number[]>` — one slot per roamer index
  - Particle metadata (age, TTL, species) stored in separate parallel arrays

Worklet logic per frame:
1. For each roamer with `state === FLYING_CRUISE || state === APPROACH_FLOWER`:
   - If `elapsedMs - lastEmitTimestamps[i] >= emitInterval`:
     - Find first dead slot in pool (where `pos[slot*4+2] === 0` or `age >= TTL`)
     - Set `pos[slot*4] = roamer.x`, `pos[slot*4+1] = roamer.y`, `pos[slot*4+2] = 0` (opacity starts at 0), `pos[slot*4+3] = randomRadius`
     - Set `col[slot*4]`, `col[slot*4+1], col[slot*4+2]` from species colour
     - Set `age[slot] = 0`, `TTL[slot] = random(TTL_MIN, TTL_MAX)`
     - `activeCount++`
     - `lastEmitTimestamps[i] = elapsedMs`
2. For each active particle slot:
   - Advance `age[slot] += dt`
   - If `age[slot] >= TTL[slot]`: mark dead, `activeCount--`
   - Compute opacity: piecewise linear from age/TTL
   - Apply fall speed: `pos[slot*4+1] += FALL_SPEED * dt`

### 4. New module: `FlowerGardenParticleLayer.tsx`

React component that wires the worklet, shared values, uniforms, and Canvas.

On mount:
- Creates `SharedValue<Float32Array>` arrays (zeroed, fixed length)
- Creates `useDerivedValue` that maps `uPos`, `uCol`, `uActiveCount` into a uniform object for the shader

Render tree:
```
<View pointerEvents="none" style={position: 'absolute', left/top/right/bottom: 0, zIndex: PARTICLE_Z}>
  <Canvas style={{ flex: 1 }}>
    <Rect x={0} y={0} width={screenWidth} height={screenHeight}>
      <Shader source={particleEffect} uniforms={particleUniforms} />
    </Rect>
  </Canvas>
</View>
```

`PARTICLE_Z = 1.5` — between `SCENERY_Z = 1` and `ROAMER_Z = 2`.

### 5. Lift roamer simulation to `FlowerGardenExerciseContent`

Currently `useRoamerSimulation` lives inside `RoamerLayer`, which means the particle layer cannot access `runtimeEntries`. We lift the simulation into a new `SimAndLayers` sub-component inside `FlowerGardenTableProvider`:

```
FlowerGardenExerciseContent
  └─ FlowerGardenTableProvider
       └─ SimAndLayers (NEW)
            ├─ useExerciseLayout()
            ├─ useRoamerSimulation({ words, width, height, roamerRect, layoutKey })
            ├─ FlowerGardenParticleLayer (runtimeEntries from sim)
            └─ FlowerGardenRoamerMotionZone (receives sim as prop)
                 └─ RoamerLayer (uses sim if provided, else creates own)
```

`RoamerLayer` gains an optional `sim` prop. If provided, it skips its internal `useRoamerSimulation` call. `FlowerGardenRoamerMotionZone` passes the prop through. `FlowerGardenDecorativeRoamerLayer` is unaffected (it uses a separate `sessionId='decorative'` sim).

### 6. Non-modifications

The following are NOT modified:
- `Theme.ts` (theme contract) — the particle layer is flower-garden-specific, not a generic exercise concern
- All undersea theme files
- `FlowerGardenDecorativeRoamerLayer` — decorative roamers do not emit particles
- Scenery files (field flowers, bushes, earth, grass)
- WordSprite table layer
- Any exercise core files
- The roamer simulation itself (collision avoidance, flight state machine, occupant slots)

## Testing Decisions

### Good tests verify particle lifecycle logic, not rendering

The particle system has three layers: (1) pure simulation logic, (2) worklet wiring to shared values, (3) shader rendering. We test (1) as pure functions. We do not test (2) and (3) in Jest — the worklet and shader are integration points that are either exercised by the app or tested in manual/visual regression.

### Module to test: particle lifecycle pure function

Extract a pure function `updateParticlePool` that takes plain JS objects:

```ts
function updateParticlePool(
  pool: ParticleInternal[],
  roamerStates: Array<{ x: number; y: number; flightState: number; species: RoamerSpecies }>,
  config: RoamerParticleConfig,
  dt: number,
  elapsedMs: number,
  rng: () => number,
): void
```

This is testable in Jest with no React Native or Reanimated dependencies. It is the highest seam that captures all particle lifecycle logic (emission decision, initialization, per-frame update, death/recycle).

**What to test:**
- Particles only emit from roamer states `FLYING_CRUISE` and `APPROACH_FLOWER` (not `SITTING`, `FLYING_IDLE`, `LIFTING_OFF`)
- Emission respects configured interval (no emission if not enough time has passed)
- Particle initial position matches roamer position
- Particle colour matches species colour from config
- Particle radius and TTL are within configured ranges
- Opacity follows piecewise fade curve (0→1 over fade-in fraction, 1→0 over fade-out fraction)
- Particle Y advances by fall speed × dt
- Particle is recycled when age ≥ TTL (slot becomes `active === false`)
- Optimal particle reuse: when a particle dies, the next emission reuses its slot
- Determinism: same seed + same inputs = same emissions and updates
- RNG is consumed only for per-particle random values (radius, TTL)

### Prior art

| Test | Pattern |
|---|---|
| `stepFlightStateMachine.test.ts` | Pure state machine function, `makeState()` + `makeContext()` factories with overrides |
| `createRoamerSpawns.test.ts` | Seeded RNG injection, determinism tests, same-seed/different-seed pairs |
| `wingPhaseModel.test.ts` | Mock `{ value: v }` objects for SharedValue, call pure `updateRoamer` |
| `pickFieldFlowerTarget.test.ts` | `rollValue` parameter replaces random call, edge value tests |
| `pickWanderAngle.test.ts` | Deterministic via `sin(phase)`, sweep tests |

### What is NOT tested

- The worklet integration (`useParticleFrameLoop`) — runs on UI thread, impractical in Jest
- Shader compilation — tested implicitly via module-level `Skia.RuntimeEffect.Make()` throw
- Visual rendering — manual/device testing only
- Interaction with other layers (z-ordering, pointer events) — manual/device testing

## Out of Scope

- **Other themes** — The undersea theme is not getting a particle dust effect. If the koi fish need a similar effect later, it would be a separate PRD following the same architecture pattern.
- **Decorative roamers** — No particles from decorative roamers. They are background-only and do not carry words.
- **Particle physics beyond fall** — No horizontal wind, no collision with scenery, no bounce, no rotation. Particles simply fall straight down.
- **Tap interaction** — Particles are never interactive.
- **Performance tuning beyond bounded pool** — The fixed 200-particle pool prevents unbounded memory growth. No LOD (level-of-detail) system, no particle merging.
- **Shader fallback** — Single `<Rect>` + `<Shader>`. If the SKSL uniform array size limit is hit on a specific GPU model, a fallback to per-particle Skia `<Circle>` components can be added later as a separate issue.
- **Accessibility** — No accessibility labels on particles (they are purely cosmetic).

## Further Notes

- ADR-0005 (butterfly roamer) established that the roamer sim is per-theme and should not be shared. The particle layer follows that pattern — it is flower-garden-specific and lives under `themes/flower-garden/roamer/particles/`.
- The `<Rect>` + `<Shader>` pattern and uniform array approach are directly inherited from `roseShadows.sksl.ts` (64-instance loop with bounding-box culling) and `metaballMerge.sksl.ts` (10-element uniform array, single draw call).
- The uniform limits for 200 particles × 2 `float4` arrays (1600 floats total) are expected to compile on modern mobile GPUs. If a device fails to compile, `Skia.RuntimeEffect.Make()` will throw at the module level — the error is surfaced immediately on exercise load, not silently.
