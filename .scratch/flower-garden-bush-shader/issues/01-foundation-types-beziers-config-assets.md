Status: ready-for-agent
Parent: .scratch/flower-garden-bush-shader/PRD.md

## What to build

A "make the change easy" prefactor that lands the testable core of the bush-shader feature without any visible rendering changes. This slice adds:

- The data types: `BushConfig`, `StemConfig`, `LeafConfig`, `BushUniforms` (the shape the shader will receive as uniforms).
- Bezier math helpers as pure functions: `bezierPoint(t, p0, p1, p2)`, `bezierTangent(t, p0, p1, p2)`, `bezierNormal(t, p0, p1, p2)`, `leafSide(t, p0, p1, p2)` (returns `+1` for outer arc, `-1` for inner arc, used to pre-compute which leaves draw in front vs behind the stem).
- A `mulberry32` seeded-RNG implementation and a typed RNG interface.
- A `groundBand` helper that derives the bush base placement rect from `useExerciseLayout` (a band at the bottom of the rose-grid zone).
- The seeded `generateBushConfigs` function. Inputs: `{ tableId, nRoses, roseIndices, roseGridPositions, groundBand, stemBaseSpreadRadius, stemBaseWidth, stemTopWidth, leavesPerStemRange, rng }`. Output: a `BushConfig[]` with bush count in `[ceil(nRoses/5), ceil(nRoses/3)]`, random rose partition, randomly placed bush bases inside `groundBand`, per-stem control points on the *outer* side of the base→top line (away from the bush center), per-leaf `t` in `[0.05, 0.95]`, per-leaf `tilt` in `[-π/9, +π/9]`, per-leaf `variant` in `{0..3}`, pre-computed per-leaf `side`. Validates the output (every rose assigned, every base inside `groundBand`, every leaf's `t` and `side` in valid ranges) and throws on any violation.
- A `useBushConfigs` hook that calls `generateBushConfigs` inside `useMemo`, keyed on `table.id`, returning the memoised `BushConfig[]`.
- Asset loading: extend the flower-garden image manifest with the four new sources (`stem.png`, `rose_base.png`, `leaf1–4.png`), extend the `FlowerGardenThemeImages` type with the new image slots, extend `useFlowerGardenThemeAssets` to load them, and extend the `FlowerGardenAssetsProvider` to pass them through.
- Unit tests for `bezierPoint`, `bezierTangent`, `bezierNormal`, `leafSide` (boundary cases: `t=0` and `t=1` give the endpoints; tangent ⊥ normal; `leafSide` is constant for fixed inputs; flipping the control point flips the sign of `leafSide`).
- Unit tests for `generateBushConfigs`: bush count in the right range; all N roses assigned exactly once; every base inside `groundBand`; every leaf's `t` in `[0.05, 0.95]`; every leaf's `side` in `{-1, 1}`; same seed produces identical output; a different seed produces a different but still-valid output; boundary cases (`nRoses = 1`, `19`, `27`).

After this slice, `npm test` exercises all the new pure-function logic in isolation, the loading screen reports ready with the new images included, and the rose-bud shader / rose layer / word-sprite bridge / `Theme` interface are all unchanged. No bush shader, no `BushShaderLayer`, no `FlowerGardenScenery` content yet.

## Acceptance criteria

- [ ] `BushConfig`, `StemConfig`, `LeafConfig`, `BushUniforms` types are defined in the bush-shader scenery folder's `types.ts`.
- [ ] `bezierPoint`, `bezierTangent`, `bezierNormal`, `leafSide` are implemented as pure functions in a bezier math helper module and pass their unit tests.
- [ ] `mulberry32` seeded RNG is implemented and exposed behind a typed RNG interface.
- [ ] `generateBushConfigs` is implemented as a pure function with the inputs and outputs described in the PRD, and it validates its output and throws on any violation.
- [ ] `useBushConfigs` hook is implemented and memoised by `table.id`.
- [ ] `groundBand` helper is implemented and derives the band from `useExerciseLayout`.
- [ ] The flower-garden image manifest declares the four new sources and the `FlowerGardenThemeImages` type is extended.
- [ ] `useFlowerGardenThemeAssets` loads the new images and surfaces them in the ready-assets state.
- [ ] `FlowerGardenAssetsProvider` passes the new images through to the context consumers.
- [ ] `npm test` passes with the new unit tests.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No shader, no `BushShaderLayer`, no `FlowerGardenScenery` content yet — the scenery slot still renders nothing visible. The rose-bud shader, rose layer, word-sprite bridge, and `Theme` interface are unchanged.

## Blocked by

None — can start immediately.
