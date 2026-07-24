Status: ready-for-agent

# Flower-garden butterfly Roamer

## Problem Statement

The flower-garden theme has a fully-rendered `Scenery` slot (bushes + field flowers, with shaders, configs, and tests in place) and a fully-rendered `WordSprite` slot (rose cells in the table transformation exercises). The roamer slot is wired into the `Theme` contract but renders an empty `View` — there is no creature that free-roams the roamer zone, no creature that can be captured in the translation match exercise, and no creature that gives the flower-garden any of the koi's "life" in the undersea theme.

The asset folder `assets/images/flower_garden_theme/lycaenidae/` already contains 19 PNGs: one body (`lycaenidae_body.png`) and 18 wings (`lycaenidae_left_wing1..9.png`, `lycaenidae_right_wing1..9.png`). These are the visual primitives for the new realisation, and they are not loaded, not registered in the image manifest, and not referenced anywhere. The roamer's empty slot is the seam the work fills.

## Solution

Add a **butterfly** Roamer realisation to the flower-garden theme: a per-instance runtime that owns body+wings image refs, position, angle, wing phases, and a 7-state `flight state`. Each butterfly free-roams the roamer zone (the lower half of the screen) with an erratic trajectory driven by the *difference* between its left and right wing phases — that asymmetry is the per-frame turn source and replaces the koi's `wanderAngle + boundary` model. The roamer sim is per-theme: no shared abstractions across the koi and butterfly paths; the `Roamer` contract is at the `Theme` level, not at the sim level.

A butterfly is composed of one body image and two wing images (left and right) drawn from a fixed 9-variant wing-pair set. The 9 variants are assembled inside a single SkSL shader (one `Rect` per butterfly), with the body and the two wings composited by per-region UV offsets. Wing flapping is a per-side UV-thin / UV-thick stretch driven by `sin(wingPhase)`; the phase difference is the per-frame turn rate. The shader also reveals 6 legs (3 per side, baked into the body image) when the roamer is sitting, with each leg animated by its own `sin(legPhase + legPhaseOffset)` for a tripod gait.

A new piece of scenery: **field flowers**. These are small flower-head images drawn as part of the flower-garden `Scenery` and scattered in the roamer zone at a fixed count (12). They are not WordSprites and never carry words. Each field flower has a single world position (its **flower anchor**) and an `occupant: roamerIndex | null` slot recording the butterfly currently sitting on it, or `null` if free. Roamers never write to any other part of scenery; the occupant slot is the only cross-context data path between Scenery and Roamer. The roamer sim reads the slot to decide whether to land, wait, or pick a new flower; writes it on land and on lift-off.

Sitting on a flower uses a **two-draw-pass** approach over the same runtime: the flying pass and the sitting pass both read the same `positions` array and the same runtime; which pass renders is gated by the runtime's `flight state`. The transition between passes is a one-frame toggle with no coordinate hand-off, so the roamer's position is the same world coordinate across both passes and the two never draw the same butterfly in the same frame. This is the same pattern that resolved the koi's pool→bubble flicker in `releaseCapturedFishWorklet` — the `positions` write on the state transition is what keeps the roamer at the flower anchor when the flying pass takes over again.

The 7-state flat state machine is: `FLYING_IDLE` (flapping in place, small drift on all axes, no target), `FLYING_CRUISE` (wander target + wing-phase steering toward it), `FLYING_TURN` (deliberate heading change to a new wander target — elided into CRUISE for small heading deltas), `APPROACH_FLOWER` (locked path to a specific flower anchor, wing phase still steers), `WAIT_AT_TAKEN_FLOWER` (position holds near the anchor, polls `occupant` for `null`), `SITTING` (on anchor, arc micro-motion and on-place turning, legs visible), `LIFTING_OFF` (scale lerps from sitting to full at the anchor, then transitions to `FLYING_CRUISE`). The 20% flower-pick probability is rolled when the wander target is exhausted: 20% chance the next target is a field flower (state → `APPROACH_FLOWER`), 80% a new wander point (state stays in `FLYING_CRUISE`).

The wing-pair spawn policy is **shuffle 9, deal, then round-robin from a random session offset**: shuffle the 9 pair indices, deal one each to the first 9 butterflies in spawn order; for any overflow the i-th extra butterfly uses pair `(startOffset + i) % 9` where `startOffset` is a random integer in `0..8` rolled once per session. Wings never change after spawn.

## User Stories

### Learner

1. As a learner, I want to see butterflies flying around the roamer zone of a flower-garden exercise, so that the screen feels alive and the garden looks like a real place, not an empty grid.
2. As a learner, I want each butterfly to be unique in wing pattern (so that no two butterflies look exactly alike), so that the visual variety makes the scene interesting.
3. As a learner, I want butterflies to flap their wings while flying, so that the motion reads as a butterfly and not a floating sprite.
4. As a learner, I want each butterfly's two wings to flap slightly out of sync with each other, so that the wing motion looks organic and not mechanical.
5. As a learner, I want butterflies to fly on a slightly erratic, wiggling trajectory, so that they move like real butterflies and not like rigid aircraft.
6. As a learner, I want each butterfly to have a body, two wings, and (when it lands) six legs, so that the creature is anatomically complete and not a sprite missing limbs.
7. As a learner, I want butterflies to land on field flowers in the roamer zone, so that I can see them rest and the field looks occupied.
8. As a learner, I want a sitting butterfly to be smaller and on the flower, not flying past it, so that the resting state is visually distinct from the flying state.
9. As a learner, I want a sitting butterfly to walk around its flower on small arcs, so that the sitting state has life instead of being frozen.
10. As a learner, I want a sitting butterfly to occasionally turn on the spot, so that its orientation changes without it leaving the flower.
11. As a learner, I want a sitting butterfly to lift off after a few seconds, so that the field is not permanently claimed and other butterflies can also land.
12. As a learner, I want two butterflies not to sit on the same flower at the same time, so that a flower is either free or taken, never shared.
13. As a learner, I want a butterfly that arrives at a taken flower to wait briefly near it, so that the field doesn't get cluttered with rejected attempts.
14. As a learner, I want a butterfly that is waiting near a taken flower to land immediately if the sitting butterfly lifts off, so that the waiting roamer opportunistically takes the freed spot.
15. As a learner, I want butterflies to avoid running into the screen edges, so that the sim stays inside the roamer zone and the creatures don't disappear off-screen mid-flight.
16. As a learner, I want butterflies to avoid running into each other, so that the flight paths don't visibly cross and the creatures don't stack on top of one another.
17. As a learner, I want the same table to render the same butterfly colours and positions on every reload, so that the scene is stable across sessions.
18. As a learner, I want butterflies to fade in from the loading screen with no first-frame flash of missing butterflies, so that the scene looks complete the moment it appears.

### Maintainer (architecture)

19. As a maintainer, I want a **butterfly** to be a realisation of the existing `Roamer` contract (ADR-0003), so that the flower-garden theme's roamer slot is filled without any new top-level abstraction.
20. As a maintainer, I want the butterfly sim to live entirely inside the flower-garden theme folder, so that the koi sim is not coupled to the butterfly sim and a future theme can add its own roamer independently.
21. As a maintainer, I want field flowers to be part of the flower-garden `Scenery` with one extra field (`occupant: roamerIndex | null`), so that the roamer sim can read and write the occupant slot without invading any other piece of scenery.
22. As a maintainer, I want the occupant slot to be the only data the roamer sim writes to scenery, so that the cross-context coupling between Scenery and Roamer is one named field.
23. As a maintainer, I want a single SkSL shader effect to draw a butterfly (body + two wings + 6 leg regions), so that a butterfly is one `Rect` per instance and the Skia command buffer is minimal.
24. As a maintainer, I want the shader to use exactly three image samplers (body, left wing, right wing), so that the sampler count stays well within SkSL's per-effect limit and the asset pipeline is simple.
25. As a maintainer, I want the same SkSL effect to handle the flying pass and the sitting pass (with different uniform values), so that the shader is the only place that knows how a butterfly looks in any state.
26. As a maintainer, I want the flying and sitting draw passes to be two Skia `Rect`s consuming the same runtime shared values, gated by `flight state`, so that the transition between passes is a one-frame toggle with no coordinate hand-off.
27. As a maintainer, I want the layer-flip pattern to be the same pattern that resolved the koi's pool→bubble flicker (`releaseCapturedFishWorklet`), so that the project's existing knowledge transfers to the butterfly.
28. As a maintainer, I want the wing-pair spawn policy to be a pure function with seeded-RNG determinism, so that the same session re-renders the same butterfly set and the implementation is testable.
29. As a maintainer, I want the 7-state machine to be a reducer-style pure function over `(state, dt, conditions)`, so that the transition table is testable and the worklet is a thin call site.
30. As a maintainer, I want the state machine to be a flat list of 7 states (no parent/child sub-machines), so that the transitions are named and the simulation logic is straightforward.
31. As a maintainer, I want a constant `ROAMER_BUTTERFLY_WING_PAIR_COUNT = 9` and a constant `ROAMER_BUTTERFLY_BUTTERFLY_SITTING_FLOWER_COUNT = 12` (or equivalent), so that the spawn policy and the field-flower count are visible at the call site.
32. As a maintainer, I want the 6 leg phases to be independent shared values per leg, so that the leg motion is per-leg and not a global cycle.
33. As a maintainer, I want a `ROAMER_BUTTERFLY_*` naming prefix for all new constants in the flower-garden roamer config, so that they don't collide with the undersea roamer's `ROAMER_*` constants.
34. As a maintainer, I want the new assets to be added to the flower-garden image manifest as `lycaenidaeBodyImage`, `lycaenidaeWingLeftImages: SkImage[]` (9), `lycaenidaeWingRightImages: SkImage[]` (9), and loaded by the existing asset hook, so that the loading flow is identical to the other flower-garden assets.
35. As a maintainer, I want the existing `FieldFlowerConfig` type to gain an `occupant: number | null` field, so that the roamer sim can read and write the slot directly off the existing scenery record.
36. As a maintainer, I want the `FieldFlowerConfig` occupant slot to be written by the roamer sim and read by the roamer sim; no scenery code reads it, so that the field has exactly one read-write owner.
37. As a maintainer, I want the 6 leg-phase regions in the body image to be defined by a per-leg UV rect in the shader's source, so that adding a new butterfly body layout only changes one constant block in the shader.
38. As a maintainer, I want the shader to early-exit on alpha threshold before doing per-region math, so that the per-butterfly fullscreen rect doesn't pay for fully transparent fragments.
39. As a maintainer, I want the new `butterfly.sksl.ts` shader to compile once at module load and throw on failure (matching the `koiFishDeform.sksl.ts` and `roseBudDeform.sksl.ts` patterns), so that a shader compile error is caught at import time.

### Maintainer (testing)

40. As a tester, I want the wing-pair allocator to be a pure function with seeded-RNG determinism, so that the "9 unique, then round-robin from random offset" rule is testable in isolation.
41. As a tester, I want the butterfly spawn config generator to be a pure function with seeded-RNG determinism, so that per-session butterfly positions, colours, and wing pairs are reproducible.
42. As a tester, I want the state-machine reducer to be a pure function, so that the full transition table is testable without worklets, shared values, or React.
43. As a tester, I want the field-flower target picker to be a pure function (`pickFieldFlowerTarget(roamers, configs, rng)`), so that the 20% probability and the no-duplicate-target-per-cycle rule are testable.
44. As a tester, I want the wait-poll observer (`pollsOccupantForFree`) to be a pure function, so that the "wait near anchor, take when free" behaviour is testable without shared values.
45. As a tester, I want the layer-pass selector (`pickRoamerDrawPass(flightState)`) to be a pure function over the 7-state enum, so that the "flying pass vs sitting pass" decision is testable in isolation.
46. As a tester, I want the existing flower-garden test pattern (seeded RNG, pure functions, `describe`/`it`/`expect`, no React render harness) to apply to all the new code, so that the new tests slot into the project's established testing posture.
47. As a tester, I want the existing `Theme` contract conformance test to keep passing and to assert that the flower-garden roamer slot is non-null, so that the integration is regression-tested.
48. As a tester, I want `npx tsc --noEmit`, `npm run lint`, and `npm test` to pass after the feature lands, so that the mechanical changes are verified to be type-safe, lint-clean, and behaviour-preserving.
49. As a tester, I want the existing full domain test suite to keep passing unchanged, so that nothing in the mechanics or the existing visuals has been disturbed.
50. As a tester, I want the shader behaviour (wing flap, sitting scale, leg reveal) to be visually verified on the simulator, not unit-tested, matching the project's established testing posture for SkSL effects.

### Future theme author

51. As a future theme author, I want the roamer work to be entirely inside the flower-garden theme folder, with no change to the `Theme` interface or the generic core, so that adding a garden-with-birds theme would be a fresh adapter, not a fork of this code.
52. As a future theme author, I want a clear note in the theme-structure guide about the "one folder per roamer realisation" pattern, so that a second theme's roamer can follow the same pattern.

## Implementation Decisions

### Target structure

The work is scoped to the flower-garden theme and the `roamer` slot of the `Theme` contract. New folders and modules:

- `shaders/butterfly.sksl.ts` — the SkSL effect, constants (`ROAMER_BUTTERFLY_WING_PAIR_COUNT = 9`, `ROAMER_BUTTERFLY_LEG_COUNT = 6`, body-UV and wing-UV constants, leg-region UV rects), and a `butterflyUniformDefaults` reference object. One shader effect handles both the flying pass and the sitting pass (a `renderMode` uniform selects which).
- `roamer/butterfly/` — a folder holding the butterfly realisation, mirroring the koi's `roamer/roamerFish/` layout:
  - `RoamerButterflyLayer.tsx` — the React component that owns the Skia Canvas, iterates over butterfly runtimes, and renders two `Rect`s per butterfly (flying pass and sitting pass, gated by the runtime's `flight state`). Shadow pass uses the same pattern as the koi shadow.
  - `RoamerButterflyInstance/` — the per-butterfly `Rect` that wraps the SkSL shader with the per-instance uniforms (body image, left wing image, right wing image, leg phases, wing phases, scale, flight state, render mode, time).
  - `simulation/` — split into:
    - `types.ts` — `ButterflyState`, `ButterflyRuntime`, `ButterflySpawn`, `FlightState` enum.
    - `butterflyStateMachine.ts` — the pure-function reducer over `(state, dt, conditions)` that returns the next state and any new timers.
    - `butterflySimWorklets.ts` — the worklet that wraps the reducer for use in the per-frame loop.
    - `createButterflyRuntime.ts` — the factory that builds a `ButterflyRuntime` from a `ButterflySpawn` (creates the shared values, picks the initial phase, applies the initial state).
    - `createButterflySpawns.ts` — the spawn generator: `createRandomVisualSpawn(rng)`, `createButterflySpawnsFromWords(words, rng)`. Uses the wing-pair allocator.
    - `wingPairAllocator.ts` — the pure function `assignWingPairIndices(n, rng)` returning `number[]` of length `n` with the "shuffle 9, deal, then round-robin from random offset" rule.
    - `useButterflySimulation.ts` — the hook that returns `{ runtimeEntries, sharedPositions, renderProps, hitRadius, ... }` like the koi's `useRoamerFishSimulation`.
  - `config/` — split into:
    - `butterflySettings.ts` — the shared sim settings (frequencies, amplitudes, durations, sit/leg phase defaults, swim zone margins).
    - `butterflySimConfig.ts` — the state-machine constants (state ids, transition table, timer ranges, 20% probability constant, 9-pair count).
    - `butterflyInstanceConfig.ts` — the per-instance rendering constants (rect bounds, layer-flip margin, hit radius).
  - `gestures/` — `useButterflyTapGesture` for capture (later) and `useButterflySittingTapGesture` for the sitting pass (later, when capture is wired in).
- `roamer/FlowerGardenRoamerMotionZone.tsx` — the existing empty component becomes a thin wrapper that mounts `<RoamerButterflyLayer />` inside the existing roamer zone.
- `roamer/FlowerGardenDecorativeRoamerLayer.tsx` — the existing empty component becomes a thin wrapper that mounts `<RoamerButterflyLayer />` for decoration (with `interactive: false`).
- `core/assets/flowerGardenThemeAssets.ts` — extended to require the 19 new image sources (1 body + 9 left wings + 9 right wings) and to extend `FlowerGardenThemeImages` with the new image slots.
- `core/assets/useFlowerGardenThemeAssets.ts` — extended to load the new images through the existing `loadSkiaImage` path and pass them through the ready-assets state.
- `core/providers/FlowerGardenAssetsProvider.tsx` — extended to pass the new images to the context.
- `scenery/FieldFlowerShaderLayer/types.ts` — `FieldFlowerConfig` gains an `occupant: number | null` field. The shader itself is unchanged.
- `themeBundle.ts` — the `roamer.motionZone`, `roamer.decorative`, and (later) `roamer.matchLayer` slots are wired to the new butterfly components.

The `Theme` interface (ADR-0003), the `themeBundle` typing, the exercise shell, the clock, the store, the layout engine, the runtime providers, the word-sprite bridge, the koi roamer (ADR-0002), the koi shader, and the existing rose / bush / field-flower shaders are all unchanged in their behaviour. The only additions to existing files are the `FieldFlowerConfig.occupant` field and the asset manifest extension.

### Wing-pair spawn policy (the testable seam, primary)

A pure function:

```
assignWingPairIndices(n: number, rng: () => number): number[]
```

- If `n <= 9`: produce a uniform shuffle of `[0..9)` truncated to `n`. No duplicates.
- If `n > 9`: produce a uniform shuffle of `[0..9)`. The first 9 of the input get the shuffled indices in order. Indices 9..n-1 get `(startOffset + (i - 9)) % 9` where `startOffset` is a single random integer in `[0..9)` rolled once.
- Deterministic for a seeded RNG.
- Validates: every output is in `[0..9)`, no element appears more than 9 times.

The function is called by `createButterflySpawnsFromWords` (and any decorative spawn) once per session, with the same RNG seed. The same session re-renders the same wing pairs. Two sessions produce different wing pairs (because the RNG is fresh per session).

The full spawn config (`createRandomVisualSpawn(rng)`) is a separate pure function that picks `xRatio`, `yRatio`, `phase`, `initialAngle`, `wingLeftPhaseOffset`, `wingRightPhaseOffset`, `wingLeftFreq`, `wingRightFreq`, `legPhaseOffsets[6]`. Both functions compose.

### State machine (the testable seam, secondary)

A pure-function reducer:

```
stepFlightStateMachine(state: FlightState, ctx: FlightContext, dt: number): { nextState: FlightState, ... }
```

where `FlightContext` carries `wingPhases`, `legPhases`, `anchorX`, `anchorY`, `fieldFlowerConfigs`, `positionX`, `positionY`, `angle`, `rng`, `dt`. The reducer:

- Returns the next `FlightState` and any new timers / wander targets / chosen field flower.
- Implements the transition table for all 7 states.
- Rolls the 20% flower-pick probability at the wander-target-exhaustion trigger.
- Polls `occupant` of the targeted flower's config on each tick when in `WAIT_AT_TAKEN_FLOWER`.
- Advances wing phases by `wingFrequency * dt` when in any flying state.
- Holds wing phases constant when in any sitting state.
- Advances leg phases by `legFrequency * dt` only when in `SITTING` and either arc-moving or on-place-turning.
- Lerps position to anchor on `APPROACH_FLOWER → SITTING` and on `LIFTING_OFF → FLYING_CRUISE`.

The reducer is wrapped by `updateButterfly`, a worklet that reads/writes the `ButterflyRuntime`'s shared values. The reducer is the testable surface; the worklet is a thin call site.

### Layer-flip draw (the rendering seam)

Each roamer has two `Rect` children: the flying pass `Rect` and the sitting pass `Rect`. Both pass the same `state` shared values. The flying pass's `Rect` has `opacity` set by `useDerivedValue` from the runtime's `flight state` — `0` for any non-flying state, `1` otherwise. The sitting pass's `Rect` has `opacity` set the other way — `1` for `WAIT_AT_TAKEN_FLOWER`, `SITTING`, `LIFTING_OFF`, `0` otherwise. The Skia Canvas composites both; only one is non-zero in any given frame.

The `pickRoamerDrawPass(flightState)` pure function returns `'flying' | 'sitting' | 'none'` for any state and is unit-tested. The opacity-from-state is a `useDerivedValue` consuming `pickRoamerDrawPass(state)`.

### Shader (the rendering seam, untestable at unit level)

A single SkSL effect, `BUTTERFLY_SKSL`, compiled once at module load (matching the `koiFishDeform.sksl.ts` pattern). The shader exposes the following uniforms:

- Image samplers: `bodyTexture`, `leftWingTexture`, `rightWingTexture`.
- Geometry: `bodyW`, `bodyH`, `bodyCenterX`, `bodyCenterY`, `bodyAngle`, `bodyScale` (lerps from `1.0` to `0.6` on sit, back on lift-off).
- Wings: `wingLeftFlap`, `wingRightFlap` (the per-side `sin(wingPhase)` value, in `[-1, 1]`), `wingLeftPhase`, `wingRightPhase` (for the steering-rate calculation on the JS side, not the shader).
- Legs: `legVisibility` (lerps from `0` to `1` on sit, back on lift-off), `legPhases[6]`, `legPhasesAdvanced[6]` (the per-leg `sin(legPhase + legPhaseOffset)` values, computed in JS from the runtime's `legPhase[]` shared values).
- Render mode: `renderMode` — `0` for flying pass, `1` for sitting pass, `2` for shadow. Shadow uses the body's silhouette only (no wings, no legs).
- Colour tints: `bodyTint` (the body image is itself colourful in the assets, so a tint may not be needed; if needed, `bodyTintStrength`).

The shader does:
- Phase 1: composite the body image at `(bodyCenterX, bodyCenterY)` with `bodyScale` and `bodyAngle`. Mask regions outside the body silhouette with alpha 0.
- Phase 2: composite the left wing image at the body's left-wing attachment point, with the UV-thin/thick stretch driven by `wingLeftFlap`. The wing's perp axis is `1 + wingLeftFlap * wingFlapAmount`; the along axis is `1 - wingLeftFlap * wingAlongThinAmount`. Mirror for the right wing.
- Phase 3 (only when `renderMode === 1`): reveal each of the 6 leg regions. For each leg, compute the per-leg mask from the body's UV space (6 fixed regions in `legUVRects[6]`), apply the per-leg bend `sin(legPhases[i] + legPhaseOffsets[i]) * legBendAmount`, modulate the mask alpha by `legVisibility`. The 6 legs step with a half-phase offset to the opposite leg on the same side (front-left antiphase to front-right, mid-left antiphase to mid-right, back-left antiphase to back-right), producing a tripod gait.

The shader uses 3 image samplers (body, left wing, right wing) plus the per-leg UV rects encoded in the shader source as constants. Early-exit checks (alpha threshold on a first sample) skip per-region math for fully transparent fragments.

### Wing-as-steering integration (the sim seam)

The `updateButterfly` worklet, on each frame:
- Advances `wingPhaseLeft` and `wingPhaseRight` by their respective `wingFrequency * dt`.
- Computes the per-frame turn rate: `omega = (rightPhase - leftPhase) * wingSteeringGain * dt`.
- Lerps `angle` by `omega`.
- Lerps `position` by `(cos(angle), sin(angle)) * speed * dt`.
- Polls the spatial-hash for neighbour roamer positions; applies an overlap-weighted heading steer (same pattern as the koi's existing separation) without changing the wing-phase model.
- Polls the screen edge; applies a boundary turn offset (same pattern as the koi's `updateFish`).
- On wander-target exhaustion, calls `pickNextWanderTarget` or `pickFieldFlowerTarget` based on the 20% roll.

The wing phase difference is the *primary* turn source for butterflies. Boundary and neighbour separation are *small additive* heading nudges on top, exactly as the koi uses them. The visual effect: butterflies weave slightly while flying forward, with the wing asymmetry doing the visible steering and the boundary/neighbour nudges preventing the butterfly from leaving the screen or stacking on others.

### Sitting motion (the sim seam)

While in `SITTING`, position and angle are derived from the flower's anchor and a slow `sitPhase` accumulator:
- `positionX = anchorX + cos(sitPhase) * sitArcRadius`.
- `positionY = anchorY + sin(sitPhase) * sitArcRadius * 0.5` (squashed to make the arc wider than tall, like a butterfly walking on a flat flower).
- `sitPhase += sitArcSpeed * dt` (very slow, one full arc every ~8s).
- `angle = ...` (lerps directly to the desired on-place turn target without an arc; the sitting roamer turns like a top).
- `bodyScale` lerps from `1.0` to `0.6` over `sitTransitionMs` on enter, back to `1.0` on exit.

### Integration with the field-flower slot

The `FieldFlowerConfig.occupant` field is `number | null` (the sitting roamer's index) or `null` (free). The roamer sim:
- On `APPROACH_FLOWER → SITTING`: writes `roamerIndex` to the targeted flower's `occupant` slot.
- On `LIFTING_OFF` (start): writes `null` to the flower the roamer was on (clear the slot).
- On `WAIT_AT_TAKEN_FLOWER` (entry): reads the targeted flower's `occupant` slot; if it equals `roamerIndex` (e.g. the slot just became free), transitions to `SITTING`.

The shader and the scenery draw code are unchanged. The occupant slot has exactly one read-write owner (the roamer sim), so the cross-context coupling is one named field on one existing type.

### Asset loading

The 19 new PNGs are added to `flowerGardenThemeAssets.ts` as `require(...)` sources, alongside the existing petal/bud/centre/stem/leaf/flower sources. The asset hook `useFlowerGardenThemeAssets` loads them via `loadSkiaImage` in parallel with the existing assets, reports progress, and stores them in the `FlowerGardenThemeImages` shape. The `FlowerGardenAssetsProvider` passes the extended image set through. The butterfly shader receives the body image and the two wing images (one from each of the 9-variant arrays, indexed by `wingPairIndex`).

If any of the new assets fail to load, the existing image-load error handling applies (a console warning in `__DEV__`, the scenery silently returns null until ready). The existing loading screen is shown while the new assets load, so there is no UI for a missing asset — the user just sees the loading screen for slightly longer.

### What does NOT change

- The `Theme` interface (ADR-0003).
- The koi roamer, the koi shader, the koi sim, or the koi gestures (ADR-0002).
- The word-sprite bridge contract.
- The `FieldFlowerShaderLayer` shader (only the `FieldFlowerConfig` type gains a field; the shader is unchanged).
- The bush-shader layer (ADR-0004) and the rose-bud shader.
- The exercise shell, clock, store, layout engine, runtime providers, or asset interface.
- The data layer (table data, word lists, sentence prompts).
- The undersea theme, the word-transformation mechanic, the sentence-transformation mechanic, the variant-selection mechanic, or any of the word-learning mechanics.
- The `CONTEXT.md` terms that already exist (we add new terms, not change existing ones — but new terms are added in this PRD's companion work).

## Testing Decisions

- **A good test asserts external behaviour through a seam, not implementation detail.** All butterfly sim decisions are stable, observable facts about the produced outputs — the wing-pair allocator produces a valid permutation, the state-machine reducer transitions correctly, the field-flower target picker respects the 20% probability and the no-duplicate rule, the layer-pass selector returns the right pass for the right state. None of these tests need Skia, Reanimated, React, or a render harness.

- **Primary new seam (highest, pure function):** `assignWingPairIndices`. Test: for `n <= 9`, every output is unique and in `[0..9)`; for `n > 9`, the first 9 are a permutation of `[0..9)` and indices 9..n-1 are `(startOffset + (i-9)) % 9`; same seed → same output; different seed → still valid (re-shuffled, not broken).

- **Secondary new seam (pure function):** the state-machine reducer. Test: every transition in the documented transition table fires for the documented trigger; the 20% probability is honoured (over many trials, ~20% of wander-target-exhaustion events pick a flower); the `WAIT_AT_TAKEN_FLOWER` state polls the occupant slot and transitions to `SITTING` when it becomes `null`; the `APPROACH_FLOWER → SITTING` transition writes the roamer index to the flower's `occupant` slot; the `LIFTING_OFF` transition clears the slot.

- **Tertiary new seam (pure function):** `pickFieldFlowerTarget(roamers, configs, rng)` and `pickRoamerDrawPass(flightState)`. Test: the 20% trigger is honoured; a target is not picked twice in a row by the same roamer without an intervening change; the layer-pass selector returns `'flying'` for any of the four `FLYING_*` or `APPROACH_FLOWER` states, `'sitting'` for `WAIT_AT_TAKEN_FLOWER` / `SITTING` / `LIFTING_OFF`.

- **Prior art:** the existing test suite under `__tests__/` follows the same pattern — pure-function tests for `generateFieldFlowerConfigs`, `generateBushConfigs`, the bezier math helpers, `matchSessionController`, `wordSpriteRoaming`, the round controllers. The new tests slot into the same `describe` / `it` / `expect` shape and use the same `jest.mock` setup for `react-native-reanimated` and `@shopify/react-native-skia` (the `themeContractConformance.test.ts` mocks are a known-working reference).

- **Existing seam (regression net):** the full domain test suite must keep passing. This proves that nothing in the mechanics or the existing visuals changed. No existing test should need its expectations adjusted.

- **Existing seam (theme conformance):** the existing `Theme`-contract conformance test (`themeContractConformance.test.ts`) must keep passing. Extend it with a single new assertion: the flower-garden theme's `roamer.motionZone`, `roamer.decorative`, and `roamer.matchLayer` slots are non-null. This is the only test that touches the integration; everything else is unit-level.

- **No new React Native render harness.** No new Skia unit tests, no new gesture-level tests, no new Reanimated worklet tests. Visual verification is on the simulator. This matches the project's established testing posture (per ADR-0003, the React-Native render tree is out of scope for unit tests).

- **Verification gates:** `npx tsc --noEmit`, `npm run lint`, and `npm test` must all pass after the feature lands.

## Out of Scope

- Capturing a butterfly (the tap-to-capture flow, the bubble, the match-lifecycle). The user explicitly noted "we dont work on tapping so far". The `RoamerButterflyLayer` accepts an `interactive: boolean` flag that is `true` for match mode and `false` for decoration, but the tap path is not implemented; the gesture layer files are scaffolded but empty. A later PRD picks this up.
- Translating the 20% probability into a per-second event rate (it is implemented as per-wander-target-exhaustion, not as a per-second timer).
- Tapping a flower directly to force a sitting butterfly to lift off.
- Animating the leg-bend amount beyond a single `sin()` — a future PR could refine to a more anatomical 4-bar linkage.
- Per-butterfly colour variation (the assets are already colourful; no random tint is applied). If a tint is wanted, it goes in a future PR.
- A second roamer realisation (e.g. a dragonfly for a future theme).
- A separate "wait near a taken flower" particle or visual indicator (the wait state is visible as a butterfly hovering near the flower — no extra UI).
- Sound effects for butterfly movements.
- Localisation or copy changes (no user-facing strings in this feature beyond what the existing `tutorial.copy` already has).

## Further Notes

- The ADR for this feature is `docs/adr/0005-flower-garden-butterfly-roamer.md` and should be referenced from the theme-structure guide alongside ADR-0003 and ADR-0004.
- The wing-pair allocator is the load-bearing seam. If we ever need art-directed wing pairs (a "designer mode" for fixed pairs per session), the change is one alternative implementation of `assignWingPairIndices` — the shader, the sim, the spawn config, and the test surface all stay the same.
- The shader's leg-region UV rects are baked into the shader source as constants. If the body asset ever changes shape, the constants in the shader must be updated and the asset must keep the same UV convention.
- The `FieldFlowerConfig.occupant` field is owned by the roamer sim but lives on the scenery type. The Scenery module exports the type; the roamer module imports it. This is the one place where the layering is intentionally inverted from "scenery → roamer" to "roamer → scenery" — a deliberate trade-off documented in the ADR.
- The shader compiles once at module load and throws on failure, matching `koiFishDeform.sksl.ts` and `roseBudDeform.sksl.ts`. A shader compile error is caught at import time, not deep in a render call.
- The new assets do not change the loading screen's appearance — the existing flower-garden backdrop renders while they load. The only user-visible effect is a slightly longer loading time proportional to the 19 new PNGs.
- This PRD is a per-theme addition. It does not change the koi roamer, the mechanics, or the contract.
