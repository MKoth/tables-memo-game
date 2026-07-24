Status: ready-for-agent
Parent: .scratch/butterfly-roamer/PRD.md

## What to build

A thin vertical slice: butterflies appear on the roamer zone as **static, non-moving images**. No motion, no sim, no state machine, no layer flip — just a `RoamerButterflyLayer` that mounts N `RoamerButterflyInstance` rects at the positions produced by `createButterflySpawnsFromWords` (from issue 01) with hardcoded neutral uniforms (bodyAngle=0, bodyScale=1, wingLeftFlap=0, wingRightFlap=0, legVisibility=0). The shader is built, the per-instance component is built, and the layer is wired into the flower-garden `Theme` bundle so the butterflies are visible on the simulator at the right place.

Concretely:
- The `BUTTERFLY_SKSL` shader source in the new `shaders/butterfly.sksl.ts`. The shader exposes the three image samplers (body, left wing, right wing) and the geometry/wing/leg/render-mode uniforms. For this slice the shader's behaviour is static: it composites the body at the centre, the two wings at the body's wing attachment points, with `legVisibility=0` so no leg regions are visible. The 6 leg UV regions are NOT yet defined in the shader — the shader has placeholder constants for them.
- The shader compiles once at module load and throws on failure (matching the `koiFishDeform.sksl.ts` and `roseBudDeform.sksl.ts` patterns).
- A `butterflyUniformDefaults` reference object (matching the koi's `koiFishDeformUniformDefaults` pattern).
- The `RoamerButterflyInstance` React component: a `<Rect>` per instance wrapping the shader with hardcoded `bodyCenterX`, `bodyCenterY`, `bodyScale=1`, `bodyAngle=0`, `wingLeftFlap=0`, `wingRightFlap=0`, `legVisibility=0`, `renderMode=0`. The component derives the uniforms in `useDerivedValue` so that later slices can swap the hardcoded values for shared values.
- The `RoamerButterflyLayer` React component: a Skia Canvas that calls `createButterflySpawnsFromWords(words, rng)` once (using a seeded RNG from the session) and mounts one `RoamerButterflyInstance` per spawn at the spawn's `xRatio`/`yRatio` projected into the swim zone.
- The `pickRoamerDrawPass(flightState)` pure function returning `'flying' | 'sitting' | 'none'`. For this slice the function is in place but only `FLYING_IDLE` is ever passed to it (it always returns `'flying'`).
- Wire `RoamerButterflyLayer` into `themeBundle.ts` for `roamer.motionZone` and `roamer.decorative` (replacing the empty `View` placeholders). For this slice both slots mount the same component with `interactive: false` and `words: []` (decorative mode).
- Visual smoke test on the simulator only: launch a flower-garden exercise, verify the roamer zone renders N butterflies (e.g. 8) at the seeded positions, all with wings not flapping and legs not visible, each with a distinct wing pair.

## Acceptance criteria

- [ ] `shaders/butterfly.sksl.ts` exists, contains `BUTTERFLY_SKSL`, `butterflyUniformDefaults`, the `ROAMER_BUTTERFLY_*` shader constants (wing pair count, body/wing UV rects, leg regions as placeholder constants), and a compile-once `butterflyEffect`.
- [ ] The shader compiles successfully (verified by an iOS or Android build of the flower-garden theme; the test setup does not run the Skia runtime).
- [ ] The shader composites body + left wing + right wing in `renderMode = 0` with no leg regions visible.
- [ ] The shader uses exactly 3 image samplers and 0 leg region masks (the leg regions are placeholder constants; this slice does not reveal them).
- [ ] `RoamerButterflyInstance.tsx` exists, accepts a `bodyCenterX`, `bodyCenterY`, `bodyScale`, `bodyAngle`, `wingLeftFlap`, `wingRightFlap`, `legVisibility`, `renderMode` prop and the per-instance images (body, leftWing, rightWing), and renders a single `<Rect>` with the shader.
- [ ] `RoamerButterflyLayer.tsx` exists, mounts N instances at the positions from `createButterflySpawnsFromWords` (with a seeded RNG), and renders them in a single Skia Canvas.
- [ ] `pickRoamerDrawPass(flightState)` is implemented as a pure function. For this slice the only call site is the layer's smoke-test path with `FLYING_IDLE`; the function returns `'flying'` for that state.
- [ ] `themeBundle.ts` wires `roamer.motionZone` and `roamer.decorative` to a new component that mounts `RoamerButterflyLayer` in decorative mode.
- [ ] On the simulator, the flower-garden exercise renders N static butterflies in the roamer zone with distinct wing pairs, no wings flapping, no legs visible.
- [ ] `npm test` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No sim, no state machine, no movement, no layer flip, no `FieldFlowerConfig.occupant` writes, no Theme conformance test extension yet. The koi roamer, the field-flower shader, the bush shader, the rose-bud shader, the `Theme` interface, and the word-sprite bridge are unchanged.

## Blocked by

- `.scratch/butterfly-roamer/issues/01-foundation-types-spawn-pure-helpers.md` (needs the data types, the spawn config, the `ROAMER_BUTTERFLY_*` constants, and the asset loading).
