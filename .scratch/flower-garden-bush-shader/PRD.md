Status: ready-for-agent

# Flower-garden bush-shader scenery

## Problem Statement

The flower-garden theme renders rose cells via `roseBudDeform.sksl` + `CellRoseBud` (the bud, the centre, and the petals), and the roses respond to drag and a motion loop. But the `Scenery` slot of the theme is empty — there is no ground, no stems, no calyx, no foliage. The roses float in space like a grid of disembodied flowers, which breaks the illusion of a garden: there is nothing connecting the roses to anything, nothing behind them, and nothing for the eye to anchor to when the table moves.

The four new asset files (`stem.png`, `rose_base.png`, `leaf1–4.png`) exist already but are not loaded, not rendered, and not part of the theme's image manifest. The `Theme` contract's `scenery` slot is wired to the empty `FlowerGardenScenery` placeholder, so there is a seam ready to fill — but no plan for what goes in it or how it couples to the roses that already move.

## Solution

Fill the `Scenery` slot of the flower-garden theme with a **bush-shader layer** that draws stems, calyces, and leaves behind the roses. Roses are grouped into invisible **bushes** (3–5 stems per bush, 4–6 bushes for the 19-rose `spanishPresentTable2Plural` table, count derived from the table's rose count). Each bush's stems share a base point on a `groundBand` below the rose grid; each stem is a curved tapered band running from the bush base to the calyx at the rose; each stem has 5–9 leaves distributed along it. One SkSL shader effect draws everything for one bush, with three internal draw phases that give each leaf a correct inner/outer z-position against the stem band.

The bush config (count, rose-to-bush assignment, base points, stem control points, leaf positions, inner/outer side pre-computation) is generated once at exercise-session initialisation from a seeded RNG keyed by `table.id`, so the same table re-renders identical bushes. The shader pulls rose `(x, y, scale)` from the existing word-sprite bridge shared values (`layoutX`, `layoutY`, `layoutScale`) every frame, so drag and motion loop propagate to the calyx and (via parallax) to the leaves with no JS roundtrip. No changes to the rose-bud shader, the `Theme` interface, the word-sprite bridge types, or the rose layer.

## User Stories

1. As a learner, I want to see a curved tapered stem connecting each rose to the ground, so that the table reads as a garden of growing roses rather than a grid of floating flowers.
2. As a learner, I want each rose to be seated in a green calyx that follows it as it moves, so that the rose appears rooted rather than pinned to an invisible point.
3. As a learner, I want each stem to be narrow at the ground and wider where it meets the calyx, so that the stem has a natural plant shape.
4. As a learner, I want each stem to curve rather than run straight up, so that the garden looks organic instead of mechanical.
5. As a learner, I want each stem to arc outward from the centre of its bush, so that a bush's stems fan out like a real plant rather than running parallel.
6. As a learner, I want leaves distributed along each stem, so that the stems have foliage and the garden looks alive.
7. As a learner, I want each leaf's tip to point outward from the stem, so that the leaves look attached to the stem rather than pasted on top of it.
8. As a learner, I want some leaves to be hidden behind their stem and some to be in front, so that the leaves have visible depth on the stem rather than all floating on the same plane.
9. As a learner, I want stems to lean slightly differently from each other, so that a bush looks natural rather than uniform.
10. As a learner, I want the same leaves to be visible on every reload of the same table, so that the garden feels stable and I can learn its layout.
11. As a learner, I want the stem, calyx, and leaves to move with the rose as I drag the table, so that the whole plant moves as one and the rose never tears free of its stem.
12. As a learner, I want the leaves near the bottom of a stem to barely move while the leaves near the top move with the rose, so that the plant has a sense of weight (deep leaves anchored, top leaves light).
13. As a learner, I want no first-frame flash of missing stems, so that the garden looks complete the moment the table appears.
14. As a learner, I want the stem rendering to stay performant with 19 roses and 4–6 bushes, so that the table still scrolls smoothly on a mid-tier phone.
15. As a maintainer, I want new glossary terms recorded for the bush, the calyx, the rose stem, the rose leaf, and the leaf side, so that the project vocabulary names what is actually rendered.
16. As a maintainer, I want the bush to be an invisible organisational concept (no image, no shader, no rendering), so that the architecture does not grow a phantom "bush" entity that the shader has to draw.
17. As a maintainer, I want bush count and rose-to-bush assignment decided once at exercise-session initialisation, so that the bushes are stable for the whole session and not re-shuffled mid-round.
18. As a maintainer, I want the bush config to be reproducible from a seeded RNG keyed by table id, so that the same table renders the same bushes every time and the implementation is testable.
19. As a maintainer, I want the bush count to be derived from the table's rose count (not hardcoded per table), so that any conjugation table produces a sensible bush count without per-table config.
20. As a maintainer, I want the per-bush base point to be randomly placed inside a defined `groundBand` rect below the rose grid, so that bush bases are constrained to a sensible area rather than scattered across the screen.
21. As a maintainer, I want the per-stem base point to be a small random offset from its bush's base, so that a bush's stems fan out from a common root area rather than all sharing a single point.
22. As a maintainer, I want one SkSL shader effect per bush (not one per stem), so that each bush's stems and leaves can share a draw order and get correct per-leaf z-ordering.
23. As a maintainer, I want the bush shader to run three internal draw phases (stems, inner-side leaves, outer-side leaves), so that leaves on the inner arc of a stem's curve are hidden by the stem and leaves on the outer arc are in front, without needing multiple fullscreen passes per bush.
24. As a maintainer, I want the leaf side (inner/outer) to be pre-computed at initialisation rather than re-evaluated per pixel, so that the shader does the minimum work per frame.
25. As a maintainer, I want the bush shader to be a thin rendering of the pre-computed bush config, so that the shader carries no per-frame JS state and no per-bush mutable state.
26. As a maintainer, I want the existing word-sprite bridge shared values (`layoutX`, `layoutY`, `layoutScale`) to be the only source of rose positions for the scenery, so that scenery and the rose layer cannot drift out of sync.
27. As a maintainer, I want the bush shader to read the rose's `(x, y, scale)` from the shared values every frame, so that drag, fling, and the motion loop propagate to the calyx and the leaves without any new bridge or callback.
28. As a maintainer, I want the stem's top end to track the rose's centre and the stem's bottom end to stay fixed on the bush base, so that the stem shape re-curves smoothly as the rose moves while the ground anchor never moves.
29. As a maintainer, I want the stem's control point (which defines the arc) to stay constant after initialisation, so that the bush's character is stable across the session and the stem's shape change is driven only by the moving top end.
30. As a maintainer, I want each leaf's position along the stem (`t`) to stay constant after initialisation, so that the leaves stay in the same spots on the stem rather than sliding up and down as the rose moves.
31. As a maintainer, I want each leaf's parallax weight to be a function of its `t` (e.g. `t^2`), so that low leaves barely move and high leaves move with the rose, with no per-leaf tunable parameter.
32. As a maintainer, I want a bezier-math helper module (curve point, tangent, normal, leaf side) that is shared between the JS-side config generator and the shader's SkSL implementation, so that the curve semantics are defined in one place.
33. As a maintainer, I want the new assets (`stem.png`, `rose_base.png`, `leaf1–4.png`) declared in the flower-garden image manifest and loaded by the existing asset hook, so that the scenery renders only after the existing loading screen reports ready.
34. As a maintainer, I want the four leaf image variants used round-robin (or randomly) per leaf, so that the garden has leaf variety rather than all leaves looking identical.
35. As a maintainer, I want the leaf count per stem chosen randomly in 5–9, so that some stems are leafy and some are sparse, giving a natural feel.
36. As a maintainer, I want the leaf orientation to allow a small random tilt (±20°) on top of the outward-radial direction, so that leaves don't all look perfectly perpendicular to their stem.
37. As a maintainer, I want no per-frame JS work for the bush shader once the bush config is generated, so that the scenery has zero CPU cost per frame after init.
38. As a maintainer, I want the scenery to render in a single Skia Canvas with N fullscreen `Rect` children (one per bush), so that the Skia command buffer is minimal and the per-bush uniform set is bound once.
39. As a maintainer, I want the `Theme` interface left unchanged, so that adding scenery to one theme does not change the contract that other themes (or future themes) implement.
40. As a maintainer, I want the word-sprite bridge left unchanged, so that the existing rose-layer tests and the new scenery consume the same shared values without version negotiation.
41. As a maintainer, I want the rose-bud shader left unchanged, so that the calyx lives entirely in the scenery and the rose layer's rendering is untouched.
42. As a maintainer, I want the new `roseBush.sksl` shader to compile once at module load and throw on failure (following the `roseBudDeform.sksl` pattern), so that a shader compile error is caught at import time, not deep in a render call.
43. As a maintainer, I want the `MAX_STEMS_PER_BUSH=5` and `MAX_LEAVES_PER_STEM=9` constants defined alongside the shader, so that the SkSL uniform array sizes are visible at the call site.
44. As a maintainer, I want the bush config generator to validate its output (every rose assigned, every base inside the ground band, every leaf `t` in `[0, 1]`, every stem within bounds), so that a config-generation bug is caught immediately rather than producing visual garbage.
45. As an implementer, I want a pure-function `generateBushConfigs` module that takes `(tableId, nRoses, roseGridPositions, groundBandRect, rng)` and returns `BushConfig[]`, so that the bush config is testable without Skia, Reanimated, or React.
46. As an implementer, I want the seeded RNG to be a small `mulberry32` (or equivalent) implementation, so that the seed→config relationship is reproducible and easy to reason about.
47. As an implementer, I want the bush config to be a plain data type (no class, no methods), so that the shader can receive it as uniform-friendly field arrays without any conversion layer.
48. As an implementer, I want the bush config type to include `bushId`, `baseX`, `baseY`, `stems[]` (each with `roseIndex`, `baseX`, `baseY`, `topX`, `topY`, `controlX`, `controlY`, `baseWidth`, `topWidth`), and `leaves[]` (each with `t`, `side`, `tilt`, `variant`, `size`), so that the shape is documented by the data.
49. As an implementer, I want the rose-bush assignment to be a random partition of rose indices (no spatial clustering, no grid-block assignment), so that the implementation is one shuffle and one chunk.
50. As an implementer, I want the bush-base Y position to be uniformly random inside the `groundBand`'s Y range, and the X to be uniformly random inside the `groundBand`'s X range, so that bushes spread naturally across the ground.
51. As an implementer, I want the stem-base offset from the bush base to be uniformly random inside a disk of configurable radius, so that stems fan out from a common root.
52. As an implementer, I want the stem control point to be the bush base plus a perpendicular offset from the base→top line on the *outer* side (away from the bush center), so that arcs fan outward.
53. As an implementer, I want the stem base width and top width to be configurable constants (e.g. 3–5 px and 15–20 px), so that the taper profile is art-directable without shader edits.
54. As an implementer, I want the leaf's `t` chosen uniformly at random in `[0.05, 0.95]` (excluding the very ends), so that leaves don't sit exactly at the ground or exactly at the calyx.
55. As an implementer, I want the leaf's `variant` chosen uniformly from the four leaf textures, so that no leaf is repeated more than necessary on a single stem.
56. As an implementer, I want the leaf's `tilt` chosen uniformly in `[-20°, +20°]`, so that the leaf orientation has natural variance.
57. As an implementer, I want the leaf's `size` to be a constant (or a small random range) so that leaves have a consistent visual scale.
58. As an implementer, I want the leaf's `side` computed as the sign of the dot product between the leaf's outward direction (perpendicular to the stem tangent at `t`) and the offset from the stem to the bush base, so that the side is the geometric inner/outer of the curve.
59. As an implementer, I want the scenery component to mount in parallel with the rose layer and read the word-sprite bridge via `useExerciseRuntime`, so that both layers see the same shared values from the first frame.
60. As an implementer, I want the scenery component to render inside the existing `Scenery` slot in the theme, with no change to the `Theme` interface or `themeBundle`, so that the integration is purely additive.
61. As an implementer, I want the new assets to be added to `flowerGardenThemeAssets.ts` as `roseBaseImage`, `stemImage`, `leafImages` (array of four), and loaded by `useFlowerGardenThemeAssets`, so that the loading flow is identical to the existing rose-bud assets.
62. As an implementer, I want the loading screen to continue showing the existing flower-garden backdrop while the new assets load, so that there is no visual regression during the longer asset list.
63. As an implementer, I want the `roseBush.sksl` shader's `MAX_STEMS_PER_BUSH` and `MAX_LEAVES_PER_STEM` to match the constants used in the config generator's type, so that the shader compile-time array size matches the runtime data shape.
64. As an implementer, I want the shader uniforms to be a single object rebuilt via `useDerivedValue` per frame, so that the shared-value pipeline is consistent with the existing `CellRoseBud` pattern.
65. As an implementer, I want the bush shader to use six image samplers (`stemTexture`, `calyxTexture`, `leafTexture1..4`), so that it stays well within SkSL's per-effect sampler limit.
66. As an implementer, I want the stem's curved band in the shader to be an SDF: distance from a quadratic bezier curve, with width scaled by `t`, so that the stem looks like a continuous tapered band rather than a series of segments.
67. As an implementer, I want the calyx rendered inside the bush shader at the rose's `(x, y, scale)` position scaled to a fixed fraction of the rose's `bellSize`, so that the calyx moves and scales with the rose.
68. As an implementer, I want the calyx drawn *before* the stems in the shader's phase order, so that a stem that crosses a calyx does not occlude it (calyx is the foreground near the rose).
69. As an implementer, I want the leaves to be drawn in the shader by computing their attachment point on the curve at the leaf's `t`, applying the parallax offset (a function of `t` and the rose's delta from its rest position), placing the leaf image so that its bottom edge is at the attachment point, and rotating it to the tangent + tilt.
70. As an implementer, I want the shader to skip drawing a leaf whose alpha falls below a threshold (e.g. 0.01) so that transparent regions of the leaf texture do not produce visible seams at the stem.
71. As an implementer, I want the shader to early-exit on fully transparent pixels before doing any per-stem or per-leaf math, so that the per-bush fullscreen rect does not pay for fragments that are outside the stems and leaves.
72. As an implementer, I want the shader to read the rose's `layoutX[i]`, `layoutY[i]`, `layoutScale[i]` from the uniform arrays (not from the rose layer's `useDerivedValue`), so that the shader is the sole consumer of those arrays in the scenery.
73. As an implementer, I want the scenery to expose a `pointerEvents="none"` Canvas (following the existing `FlowerGardenScenery` pattern), so that touches pass through to the rose gesture layer unchanged.
74. As an implementer, I want the scenery to be wrapped in `React.memo` (or equivalent) and only re-render when the bush config changes, so that the per-frame work is in the shader, not in React reconciliation.
75. As a tester, I want a unit test suite for the bush config generator that asserts: bush count is in `[ceil(N/5), ceil(N/3)]`; all N roses are assigned to exactly one bush; every bush base is inside the `groundBand` rect; every stem's base is within `R` of its bush base; every leaf's `t` is in `[0.05, 0.95]`; every leaf's `side` is in `{-1, 1}`; the same seed produces the same output; a different seed produces a different (but still valid) output.
76. As a tester, I want a unit test suite for the bezier math helpers that asserts: `bezierPoint(0, p0, p1, p2) == p0`; `bezierPoint(1, p0, p1, p2) == p2`; `bezierTangent` is perpendicular to `bezierNormal`; `leafSide` is constant for a given `(t, p0, p1, p2)`; flipping the control point flips the sign of `leafSide`.
77. As a tester, I want the existing domain test suite (`npm test`) to keep passing unchanged, so that the refactor is provably non-breaking to the mechanics.
78. As a tester, I want a Theme-contract conformance test that asserts the flower-garden theme bundle still satisfies the `Theme` interface (no contract change), and that the new scenery slot is non-null and references the new component, so that the new layer is wired in correctly.
79. As a tester, I want `npx tsc --noEmit`, `npm run lint`, and `npm test` to pass after the feature lands, so that the mechanical changes are verified to be type-safe, lint-clean, and behaviour-preserving.
80. As a future theme author, I want the bush-shader work to be entirely inside the flower-garden theme, with no change to the `Theme` interface or the generic core, so that adding a garden with roses in another theme would be a fresh adapter — not a fork of this code.
81. As a future theme author, I want a clear note in the theme-structure guide about what scenery can do (canvas-based, full-rect-per-effect, shared-value reads), so that a second theme's scenery can follow the same pattern.

## Implementation Decisions

### Target structure

The work is scoped to the flower-garden theme and the `Scenery` slot of the `Theme` contract. New files:

- `shaders/roseBush.sksl.ts` — the SkSL effect, constants (`MAX_STEMS_PER_BUSH=5`, `MAX_LEAVES_PER_STEM=9`), and a `roseBushUniformDefaults` reference object.
- `scenery/BushShaderLayer/` — a folder holding the bush-shader rendering layer:
  - `BushShaderLayer.tsx` — the React component that owns the Skia Canvas, iterates over bush configs, and renders one fullscreen `Rect` per bush with the rose-bush shader effect and per-bush uniforms.
  - `useBushConfigs.ts` — the hook that returns `BushConfig[]` from the table, ground band, and seeded RNG, memoised by `table.id`.
  - `types.ts` — the `BushConfig`, `StemConfig`, `LeafConfig`, and `BushUniforms` data types.
  - `helpers/seededRandom.ts` — a `mulberry32` implementation and a typed RNG interface.
  - `helpers/bezierMath.ts` — pure functions: `bezierPoint(t, p0, p1, p2)`, `bezierTangent(t, p0, p1, p2)`, `bezierNormal(t, p0, p1, p2)`, `leafSide(t, p0, p1, p2)`.
  - `helpers/groundBand.ts` — the helper that derives the `groundBand` rect from `useExerciseLayout` (the bottom band of the rose-grid zone).
- `scenery/FlowerGardenScenery.tsx` — the existing empty component becomes a thin wrapper that renders `<BushShaderLayer />` (no other theme assets are needed; the scenery is bushes).
- `core/assets/flowerGardenThemeAssets.ts` — extended to require the new image sources (`stem.png`, `rose_base.png`, `leaf1–4.png`) and to extend `FlowerGardenThemeImages` with `roseBaseImage: SkImage | null`, `stemImage: SkImage | null`, `leafImages: SkImage[] | null`.
- `core/assets/useFlowerGardenThemeAssets.ts` — extended to load the new images through the existing `loadSkiaImage` path and pass them through the ready-assets state.
- `core/providers/FlowerGardenAssetsProvider.tsx` — extended to pass the new images to the context (the context type is theme-specific; the extension is purely additive).
- `ui/instructions/flowerGardenTutorialTargets.ts` and the tutorial file may need to exclude stems from the spotlight hit-test (the new scenery is `pointerEvents="none"` so this is already handled at the Canvas level; verify on acceptance).

The rose layer (`FlowerGardenWordSpriteTableLayer*`), the rose-bud shader, the `Theme` interface, the `themeBundle`, the word-sprite bridge, the exercise shell, the clock, the store, and the layout are all unchanged.

### Bush config generation (the testable seam)

The bush config is generated by a pure function with the signature:

```
generateBushConfigs({
  tableId: string,
  nRoses: number,
  roseIndices: readonly number[],
  groundBand: Rect,
  stemBaseSpreadRadius: number,
  stemBaseWidth: number,
  stemTopWidth: number,
  leavesPerStemRange: readonly [number, number],
  rng: () => number,
}): BushConfig[]
```

The function:

- Computes `bushCount` from `nRoses` in `[ceil(nRoses / 5), ceil(nRoses / 3)]` (inclusive), sampled from the RNG. For 19 roses this yields 4–6 bushes.
- Shuffles `roseIndices` and partitions into `bushCount` contiguous slices.
- For each bush, samples a `(x, y)` uniformly inside `groundBand` for the bush base.
- For each stem in a bush: picks a random offset inside a disk of `stemBaseSpreadRadius` around the bush base; looks up the rose's `(restX, restY)` from a passed-in map of rose rest positions; computes the control point as the perpendicular offset from the base→top line on the outer side (the side away from the bush center).
- For each leaf in a stem: samples `t` in `[0.05, 0.95]`, samples `tilt` in `[-π/9, +π/9]`, samples `variant` in `{0, 1, 2, 3}`, samples `size` from a small range or constant; pre-computes `side` via `leafSide(t, base, control, top)`.
- Validates the output: every rose assigned exactly once, every base inside the ground band, every leaf's `t` in `[0.05, 0.95]`, every leaf's `side` in `{-1, 1}`. Throws on any violation (catches init bugs immediately).

The RNG is a `mulberry32` seeded from `tableId` (so the same table id is deterministic; a different seed produces a different but valid config). The hook `useBushConfigs` calls the function inside `useMemo` keyed on `tableId`, so re-mounts of the same exercise are stable.

### Bezier math (the second testable seam)

Pure functions, no Skia, no React, no shared values:

- `bezierPoint(t, p0, p1, p2)` returns `(1 - t)^2 * p0 + 2(1 - t)t * p1 + t^2 * p2`.
- `bezierTangent(t, p0, p1, p2)` returns the derivative `2(1 - t)(p1 - p0) + 2t(p2 - p1)`, normalised.
- `bezierNormal(t, p0, p1, p2)` returns the tangent rotated by 90°, normalised.
- `leafSide(t, p0, p1, p2)` returns the sign of the dot product of the leaf's outward direction (the bezier normal at `t`) with `(bushBase - controlPoint)`. Positive = outer arc = in front; negative = inner arc = behind.

These functions are reused conceptually by the SkSL shader (the shader implements the same math in GLSL), but the JS implementations are only used at config generation time. The shader's GLSL implementations are not unit-tested; the JS implementations are.

### Shader (the rendering seam)

A single SkSL effect, `ROSE_BUSH_SKSL`, compiled once at module load (matching the `roseBudDeform.sksl.ts` pattern). The shader runs three internal phases per fragment:

1. **Phase 1 — calyces**: for each stem, draw the calyx image at the rose's `(layoutX[i], layoutY[i])` with size `roseScale * 0.5 * roseBellSize`. The calyx is the foreground near the rose, so it is drawn first within the stem block.
2. **Phase 2 — stems**: for each stem, draw the curved tapered band. The shader computes the per-fragment perpendicular distance to the stem's quadratic bezier curve (using the shader-side bezier math), the perpendicular offset (in units of the current width at the closest `t`), and the `t` along the curve. If the offset is within the stem's width and the alpha sample is above the threshold, output the stem texture's colour (modulated by `t` for a natural top-to-bottom gradient).
3. **Phase 3 — leaves**: for each leaf, compute its attachment point on the curve at `t`, apply the parallax offset (`t^2 * deltaRose`), rotate the leaf texture to `tangentAngle + tilt`, and place it with its bottom edge at the attachment point. Inner-side leaves (those with `side < 0`) are drawn first within this phase, outer-side leaves (`side > 0`) are drawn after, so outer leaves occlude inner leaves where they overlap.

The shader uses 6 image samplers: `stemTexture`, `calyxTexture`, `leafTexture1`, `leafTexture2`, `leafTexture3`, `leafTexture4`. The uniform arrays are sized by `MAX_STEMS_PER_BUSH` and `MAX_LEAVES_PER_STEM` (5 and 9 respectively), padded with zeros for any unused slot. The shader's early-exit checks (alpha threshold on a first sample) skip per-stem and per-leaf math for fully transparent fragments.

### Motion coupling

The shader receives `layoutX`, `layoutY`, `layoutScale` as uniform arrays of size `MAX_STEMS_PER_BUSH`. The `useBushConfigs` hook returns the rest positions (computed at init from the same `useExerciseLayout` data the rose layer uses), and the bush shader's `useDerivedValue` reads the current positions from the shared values every frame. The delta `(layoutX[i] - restX[i], layoutY[i] - restY[i])` is used to:

- Re-anchor the stem's top end to the rose's current position (the stem's `topX/topY` are runtime values, not pre-computed).
- Compute the leaf parallax offset (`t^2 * delta.x`, `t^2 * delta.y`) added to each leaf's attachment point.

The shader does not need to recompute the control point (it's constant), the leaf `t`, the leaf `tilt`, or the leaf `side` (all constant after init). The bezier math in the shader handles the moving top end naturally.

### Asset loading

The four new PNGs are added to `flowerGardenThemeAssets.ts` as `require(...)` sources, alongside the existing petal/bud/centre sources. The asset hook `useFlowerGardenThemeAssets` loads them via `loadSkiaImage` in parallel with the existing assets, reports progress, and stores them in the `FlowerGardenThemeImages` shape. The `FlowerGardenAssetsProvider` passes the extended image set through. The scenery component reads the new images from the provider context and passes them to the bush shader.

If any of the new assets fail to load, the existing image-load error handling applies (a console warning in `__DEV__`, the scenery silently returns null until ready). The existing loading screen is shown while the new assets load, so there is no UI for a missing asset — the user just sees the loading screen for slightly longer.

### Integration with the rose layer

The rose layer (`FlowerGardenWordSpriteTableLayer*`) publishes `layoutX`, `layoutY`, `layoutScale` shared values via the `WordSpriteLayoutBridge` (this happens in `FlowerGardenWordSpriteTableLayerInner.tsx:147–164`). The scenery component consumes the same shared values via `useExerciseRuntime()` and passes them to the bush shader. No new bridge types, no new shared values, no contract change.

The scenery mounts at the same time as the rose layer (both inside the `ExerciseShell`). The bush config is computed in `useMemo` keyed on `tableId` and the rose-grid layout, so it is stable across re-renders that do not change the table.

### What does NOT change

- The `Theme` interface (ADR-0003).
- The `themeBundle.ts` wiring.
- The `WordSpriteLayoutBridge` type or the word-sprite bridge contract.
- The `roseBudDeform.sksl.ts` shader or the `CellRoseBud` component.
- The exercise shell, clock, store, layout engine, runtime providers, or asset interface.
- The data layer (table data, word lists, sentence prompts).
- The undersea theme, the word-transformation mechanic, the sentence-transformation mechanic, the variant-selection mechanic, or any of the word-learning mechanics.
- The `CONTEXT.md` terms that already exist (we add new terms, not change existing ones).

## Testing Decisions

- **A good test asserts external behaviour through a seam, not implementation detail.** All bush config decisions are stable, observable facts about the produced `BushConfig[]` — bush count in a range, every rose assigned, every base inside the ground band, every leaf `t` in range, every leaf `side` a sign, same seed → same output. The bezier math helpers are pure functions whose outputs are defined by their inputs. Neither test needs Skia, Reanimated, or React.

- **Primary new seam (highest, pure function):** `generateBushConfigs`. Test the invariants listed in user story 75. Test that the same seed is deterministic. Test that a different seed is still valid (re-shuffles within the constraints, never breaks them). Test the boundary cases: `nRoses = 1` (one bush), `nRoses = 19` (the canonical case), `nRoses = 27` (the larger table), `nRoses` at the upper bound of the bush count formula. Test that validation throws on a manually-constructed invalid config (e.g. a leaf with `t = 1.5`).

- **Secondary new seam (pure functions):** the bezier math helpers. Test the boundary cases: `t = 0` returns `p0`, `t = 1` returns `p2`, tangent is perpendicular to normal, `leafSide` is constant for fixed inputs, flipping the control point flips the sign of `leafSide`, `leafSide = 0` is impossible for a non-degenerate curve (i.e. no control point collinear with the base→top line at `t = 0` or `t = 1`).

- **Prior art:** the existing domain test suite under `__tests__/` follows the same pattern — pure-function tests for `sentenceRowDisplay`, `swimPathPlanner`, `distractorSelectors`, `letterCascade`, `insertAnimationTiming`, `shuffleIndices`, and the round controllers. The new tests slot into the same pattern and use the same `describe` / `it` / `expect` shape.

- **Existing seam (regression net):** the full domain test suite must keep passing. This proves that nothing in the mechanics or the existing visuals changed. No existing test should need its expectations adjusted — the rose layer is untouched.

- **Existing seam (theme conformance):** the existing Theme-contract conformance test (introduced under ADR-0003) must keep passing. The new scenery slot is non-null and references the new component. This is the only test that touches the integration; everything else is unit-level.

- **No new React Native render harness.** No new Skia unit tests, no new gesture-level tests, no new Reanimated worklet tests. Visual verification is on the simulator. This matches the project's established testing posture (per ADR-0003, the React-Native render tree is out of scope for unit tests).

- **Verification gates:** `npx tsc --noEmit`, `npm run lint`, and `npm test` must all pass after the feature lands.

## Out of Scope

- Implementing a second theme.
- Adding a visible bush-base image, trunk, or soil (the bush is invisible by design).
- Animating the stem on entry or round change (stems appear with the roses on first frame and stay).
- A sway or wind animation on the leaves (parallax follows the rose, but there is no idle motion).
- Behaviour changes to the existing rose-bud shader, the rose layer, the word-sprite bridge, the `Theme` interface, or any generic framework piece.
- Changes to the data layer (no new table or word data).
- A new React Native render-level test harness or Skia unit tests.
- A separate `groundBand` per table (one band per theme; per-table config is not needed).
- Bush-to-bush z-ordering (bushes never overlap in screen space, so within-bush z-ordering is the only z that matters).
- Sound effects for stem, calyx, or leaf rendering (the existing sound set is unchanged).
- Localisation or copy changes (no user-facing strings in this feature).

## Further Notes

- The ADR for this feature is `docs/adr/0004-flower-garden-bush-shader-architecture.md` and should be referenced from the theme-structure guide alongside ADR-0003.
- The bush config generator is the load-bearing seam. If we ever need to art-direct bush layouts per table (a "designer mode"), the change is one alternative implementation of `generateBushConfigs` — the shader, the bezier math, the motion coupling, and the test surface all stay the same.
- The shader-side bezier math is duplicated in SkSL for runtime evaluation. If the JS bezier math changes, the shader must change in lockstep. A comment in the shader notes the dependency.
- The `MAX_STEMS_PER_BUSH = 5` and `MAX_LEAVES_PER_STEM = 9` constants are derived from the user's stated ranges (3–5 stems per bush, 5–9 leaves per stem). Increasing them is a shader compile-time cost (larger uniform arrays), not a runtime cost.
- The bush config is regenerated only on `tableId` change. A user switching exercises (which re-mounts the shell and re-runs the table) will see new bushes; a user reloading the same exercise will see the same bushes.
- The shader compiles once at module load and throws on failure, matching the `roseBudDeform.sksl.ts` pattern. A shader compile error is caught at import time, not deep in a render call.
- The new assets do not change the loading screen's appearance — the existing flower-garden backdrop renders while they load. The only user-visible effect is a slightly longer loading time proportional to the four new PNGs.
- This PRD does not change the rose-bud shader, the rose layer, or any mechanic. It is purely additive to the scenery.
