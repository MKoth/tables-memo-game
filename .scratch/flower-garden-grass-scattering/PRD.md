Status: ready-for-agent

# Flower-garden grass scattering

## Problem Statement

The flower-garden theme currently renders a tiled earth texture (soil) behind the bush shader layer (stems, leaves, calyxes, roses) and the shadow layer. The soil is visually bare — a flat repeating texture with no ground cover, no texture variation, and no organic detail. The garden has roses but no grass, which makes the ground look artificial and unfinished. Ten grass PNG assets (`grass1.png`–`grass10.png`) exist in `assets/images/flower_garden_theme/soil/grass/` but are not loaded, not rendered, and not part of the theme's image manifest.

The `Scenery` slot of the `Theme` contract is filled by `FlowerGardenScenery`, which composes the EarthCanvas, the SceneryShadowLayer, and the BushShaderLayer. There is a clear seam to insert a new decorative layer between the EarthCanvas and the SceneryShadowLayer — but there is no plan for how grass clusters are positioned, angled, skewed, shadowed, or configured.

## Solution

Add two new rendering layers between the EarthCanvas (soil) and the SceneryShadowLayer (stem/rose shadows):

- **Grass layer** — a Skia Canvas that renders grass clusters across the full screen via a batched image approach (Skia `Atlas` component). Grass clusters are groups of 3–7 grass elements sharing a common origin point, fanning outward in equally-spaced radial directions, with a horizontal-position-based bias angle added to all elements.
- **Grass shadow layer** — a dedicated Skia Canvas between the grass layer and SceneryShadowLayer. Each grass element casts a shadow rendered from the same atlas texture via a SkSL shadow shader that extracts the image's alpha channel, applies a blur, darkens, and offsets it.

No changes to the `Theme` interface, the theme bundle, the existing SceneryShadowLayer, the BushShaderLayer, the EarthCanvas, the rose layer, the rose-bud shader, or any generic framework piece.

## User Stories

1. As a learner, I want grass scattered across the whole soil area, so that the garden has ground cover rather than a flat repeating texture.
2. As a learner, I want grass to grow in natural-looking clusters, so that the garden looks organic rather than uniformly planted.
3. As a learner, I want grass blades within a cluster to fan out in different directions, so that each cluster looks like a real plant rather than a bundle of parallel blades.
4. As a learner, I want grass clusters near the left side of the screen to lean left and clusters near the right to lean right, so that the grass has a natural drift response to the scene's perspective.
5. As a learner, I want grass blades to be narrow at the base (near the soil) and wider at the top, so that they look like real grass viewed from above.
6. As a learner, I want grass blades of different shapes and sizes across clusters, so that the garden has visual variety.
7. As a learner, I want every grass cluster to have a different composition (different grass variants, different radial spread), so that no two clusters look identical.
8. As a learner, I want grass clusters to cast visible shadows on the soil, so that the grass has visual depth and sits above the ground.
9. As a learner, I want grass shadows to lean in the same direction as the grass but more pronounced, so that the shadows reinforce the grass's orientation rather than contradicting it.
10. As a learner, I want the grass to look different every time I start a session, so that the garden feels alive and never identical.
11. As a learner, I want grass to render behind the rose stems and their shadows, so that the grass sits naturally on the soil under the bushes.
12. As a learner, I want the grass to be fully rendered from the first frame, so that there is no pop-in of grass after the exercise starts.
13. As a learner, I want the grass to not interfere with touch interactions (tapping roses, dragging the table), so that the decorative layer is purely visual.
14. As a maintainer, I want all grass parameters configurable in a single config object, so that I can art-direct the grass density, size, skew, shadow, and angle without touching the rendering code.
15. As a maintainer, I want the grass config generator to be a pure function, so that it is testable without Skia, React, or Reanimated.
16. As a maintainer, I want grass images assigned via round-robin cycling across clusters, so that repeating patterns are minimised without requiring explicit random tracking.
17. As a maintainer, I want the grass to use Skia's batched image rendering (`Atlas` component), so that many grass instances share a single draw call and texture binding.
18. As a maintainer, I want the grass shadow to be computed by the same atlas texture with a SkSL shader (alpha extraction → blur → darken → offset), so that no separate shadow atlas or pre-rendered shadow assets are needed.
19. As a maintainer, I want the grass shadow to be a separate layer between the grass layer and the existing SceneryShadowLayer, so that grass shadows are isolated from stem/rose shadows and can be toggled or tuned independently.
20. As a maintainer, I want the new grass assets (`grass1.png`–`grass10.png`) loaded through the existing asset manifest and loading hook, so that the existing loading screen gates the grass with the other assets and the `useFlowerGardenThemeAssets` contract is followed.
21. As a maintainer, I want no change to the `Theme` interface, the theme bundle, the existing SceneryShadowLayer, the BushShaderLayer, the EarthCanvas, or any generic framework piece.
22. As a maintainer, I want the grass config to be generated once on mount (using `Math.random`), so that there is no per-frame work for the grass layout and the `useMemo` deps are trivial.
23. As a maintainer, I want the grass shadow angle to be a sum of the element's incline angle and a horizontal-offset amplification, so that no shadow is ever perfectly vertical (even at screen centre).
24. As an implementer, I want a `GrassConfigParams` type holding all 10 tunable parameters, so that the shape is documented by the type and default values live in one place.
25. As an implementer, I want a pure-function `generateGrassConfigs` module with the signature `(screenWidth, screenHeight, rng, params) → GrassClusterConfig[]`, so that the grass config is testable without Skia, Reanimated, or React.
26. As an implementer, I want `GrassClusterConfig` to include `clusterX`, `clusterY`, `clusterBiasAngle`, and `elements[]` (each with `imageVariant: 0–9`, `inclineAngle`, `size`), so that the shader receives a flat uniform-friendly representation.
27. As an implementer, I want each cluster's bias angle computed as `(clusterX / halfScreenWidth) * clusterAngleIntensity`, so that a cluster at the left edge has maximum left bias, screen centre has zero bias, and right edge has maximum right bias.
28. As an implementer, I want each element's incline angle computed as `elementRadialAngle + clusterBiasAngle`, where `elementRadialAngle` is evenly spaced at `360°/N` for the cluster's N elements, so that the fan is symmetric and the cluster bias rotates the entire fan as a unit.
29. As an implementer, I want the grass shadow uniform packing to be a pure function that transforms cluster configs into flat float arrays for the shadow shader, so that the uniform packing is independently testable.
30. As an implementer, I want the shadow angle for each element computed as `element.inclineAngle + (clusterX / halfScreenWidth) * shadowAngleIntensity`, ensuring that even at screen centre the shadow retains the element's own incline direction.
31. As an implementer, I want the shadow length computed as `element.size * shadowLengthRatio`, so that the shadow extends proportionally to the grass element size.
32. As an implementer, I want the grass and grass-shadow layers to render in `pointerEvents="none"` canvases (following the existing scenery pattern), so that touches pass through to the exercise layers.
33. As an implementer, I want the grass images to be packed into a single Skia `Image` atlas texture at load time (by drawing them onto a canvas or by using a pre-packed atlas asset), so that the `Atlas` component can reference one texture with multiple `sprites` rects.
34. As an implementer, I want the 10 grass image sources declared in `flowerGardenThemeAssets.ts` and loaded by `useFlowerGardenThemeAssets` through the existing `loadSkiaImage` path, so that the loading flow matches the existing bush/shadow assets.
35. As a tester, I want a unit test suite for `generateGrassConfigs` that asserts: cluster count equals the requested `clustersPerScreen`; each cluster has between `minGrassPerCluster` and `maxGrassPerCluster` elements; each cluster's bias angle is within expected range given its x-position; each element's incline angle is within expected range; each element's size is within min–max range; grass image variants cycle in round-robin order; the same RNG seed produces the same output.
36. As a tester, I want a unit test suite for the grass shadow uniform packing that asserts: uniform arrays have correct length; shadow angles are amplified relative to element angles; shadow lengths are scaled by `shadowLengthRatio`; unused uniform slots are zeroed.
37. As a tester, I want the existing domain test suite (`npm test`) to keep passing unchanged, proving the feature is non-breaking.
38. As a tester, I want the Theme-contract conformance test to keep passing — the scenery slot is unchanged and the new layers are purely additive internal to `FlowerGardenScenery`.
39. As a tester, I want `npx tsc --noEmit`, `npm run lint`, and `npm test` to pass after the feature lands.

## Implementation Decisions

### Config parameter type

10 tunable parameters in a single `GrassConfigParams` type:

| Parameter | Type | Description |
|---|---|---|
| `clustersPerScreen` | `number` | How many grass clusters to render per session |
| `minGrassPerCluster` | `number` | Minimum grass elements per cluster (default 3) |
| `maxGrassPerCluster` | `number` | Maximum grass elements per cluster (default 7) |
| `clusterAngleIntensity` | `number` | How strongly the cluster's x-position biases its element angles |
| `skewIntensity` | `number` (0–1) | Perspective skew: narrow at base, wide at top |
| `elementMinSize` | `number` | Minimum grass element size in pixels |
| `elementMaxSize` | `number` | Maximum grass element size in pixels |
| `shadowOpacity` | `number` (0–1) | Opacity of the grass shadow |
| `shadowAngleIntensity` | `number` | Amplification factor for shadow angle (adds to element incline) |
| `shadowLengthRatio` | `number` | Shadow length as a multiplier of element size (0.5 = half, 2 = twice) |

### Target structure

New files within the flower-garden theme, following the existing `BushShaderLayer/` pattern:

- `scenery/GrassLayer/types.ts` — `GrassConfigParams`, `GrassClusterConfig`, `GrassElementConfig` types.
- `scenery/GrassLayer/generateGrassConfigs.ts` — pure function producing `GrassClusterConfig[]` from screen dimensions, RNG, and params.
- `scenery/GrassLayer/useGrassConfigs.ts` — hook wrapping the generator in `useMemo` with `Math.random`; generates once on mount.
- `scenery/GrassLayer/GrassLayer.tsx` — Skia Canvas with an `<Atlas>` component rendering the grass instances from the packed atlas texture. The component takes the grass atlas image, the config array, and per-instance transforms.
- `scenery/GrassLayer/GrassShadowLayer.tsx` — Skia Canvas with an `<Atlas>` component using the same grass atlas texture but with a SkSL shadow shader applied (alpha channel → blur → darken → offset). Receives packed shadow uniforms (angles, lengths, opacities).
- `scenery/GrassLayer/packGrassShadowUniforms.ts` — pure function that transforms `GrassClusterConfig[]` into flat uniform arrays for the shadow shader.
- `shaders/grassShadow.sksl.ts` — SkSL effect that samples the grass atlas, extracts the alpha channel, applies a Gaussian blur, darkens to shadow colour, offsets by the shadow angle/distance, and applies opacity.
- `scenery/FlowerGardenScenery.tsx` — extended to compose the new layers in the correct z-order: EarthCanvas → GrassShadowLayer → GrassLayer → SceneryShadowLayer → BushShaderLayer.

Modified files:
- `core/assets/flowerGardenThemeAssets.ts` — add 10 grass image sources under `soil.grass1`–`soil.grass10` and extend `FlowerGardenThemeImages` with `grassImages: SkImage[] | null` and `grassAtlasImage: SkImage | null`.
- `core/assets/useFlowerGardenThemeAssets.ts` — load the grass images through the existing `loadSkiaImage` path and pack them into a single atlas `SkImage` (by drawing each onto a shared canvas).

### Grass config generation (the testable seam)

The grass config is generated by a pure function:

```ts
function generateGrassConfigs(screenWidth: number, screenHeight: number, rng: () => number, params: GrassConfigParams): GrassClusterConfig[]
```

The function:
- Determines the number of clusters from `params.clustersPerScreen`.
- For each cluster, picks a uniform random `(x, y)` across the full screen.
- Computes `clusterBiasAngle = (x / (screenWidth / 2)) * params.clusterAngleIntensity`.
- Samples `nElements` uniformly in `[params.minGrassPerCluster, params.maxGrassPerCluster]`.
- For each element in the cluster: computes `elementRadialAngle = (i / nElements) * 2π`, then `inclineAngle = elementRadialAngle + clusterBiasAngle`; selects the grass image variant via round-robin cycling across all clusters; samples size uniformly in `[params.elementMinSize, params.elementMaxSize]`.

The function uses `Math.random` at runtime. For testing, a controlled RNG is injected via the `rng` parameter.

### Grass atlas texture

The 10 individual grass PNGs are packed into a single Skia `SkImage` atlas at load time. The packing approach is:
- Determine the maximum grass image dimensions.
- Create a canvas of sufficient size (e.g., a horizontal strip or a 2×5 grid) and draw each grass image into its slot.
- Store the resulting `SkImage` as `grassAtlasImage` and the per-slot source rects as `grassSpriteRects: SkRect[]`.
- The `Atlas` component uses `grassAtlasImage` as its `image` prop and `grassSpriteRects[imageVariant]` as per-instance sprite rects.

This could also be done as a pre-packed build-time asset if the atlas is static.

### Shadow shader

A single SkSL effect, `GRASS_SHADOW_SKSL`, compiled once at module load (matching the `roseBudDeform.sksl.ts` pattern). The shader samples the same grass atlas texture, extracts the alpha channel, applies a blur (via a simple box-blur or Skia's built-in blur), darkens the result to a configurable shadow colour, offsets it by the shadow angle and length, and applies the per-element shadow opacity.

Each grass element in the shadow layer's `<Atlas>` has:
- Same sprite rect as the grass layer (same image variant).
- A transform that offsets the sprite by `(sin(shadowAngle) * shadowLength, cos(shadowAngle) * shadowLength)` relative to the grass element's base position.
- The shadow shader bound via a `Shader` node or paint effect.

### Z-order composition in FlowerGardenScenery

The `FlowerGardenScenery` rendering stack becomes:

```
FlowerGardenScenery (View, pointerEvents=none)
  ├── FlowerGardenEarthCanvas (tiled soil)
  ├── GrassShadowLayer (Skia Canvas, Atlas + shadow shader)
  ├── GrassLayer (Skia Canvas, Atlas with grass images)
  ├── SceneryShadowLayer (existing stem/rose shadows)
  └── BushShaderLayer (existing rose bushes)
```

### What does NOT change

- The `Theme` interface (ADR-0003).
- The `themeBundle.ts` wiring.
- The existing `SceneryShadowLayer` — stem and rose shadows are unchanged.
- The existing `BushShaderLayer` — rose stems, leaves, calyxes are unchanged.
- The `FlowerGardenEarthCanvas` — soil texture is unchanged.
- The rose layer (`FlowerGardenWordSpriteTableLayer*`), the rose-bud shader, the word-sprite bridge, the exercise shell, clock, store, layout engine, runtime providers, or asset interface.
- The data layer (table data, word lists, sentence prompts).
- The undersea theme or any mechanics.
- The `CONTEXT.md` terms that already exist (grass terms are additive, not changes).

## Testing Decisions

- **A good test asserts external behaviour through a seam, not implementation detail.** All grass config decisions are stable, observable facts about the produced `GrassClusterConfig[]` — cluster count, element count per cluster, bias angle range, incline angle range, size range, round-robin sequence. The shadow uniform packing is a deterministic transformation of configs into flat arrays. Neither test needs Skia, Reanimated, or React.

- **Primary new seam (pure function):** `generateGrassConfigs`. Test that the cluster count equals `clustersPerScreen`; each cluster has between `minGrassPerCluster` and `maxGrassPerCluster` elements; each cluster's `clusterBiasAngle` has the correct sign for left/right positions and is zero at centre; each element's `inclineAngle` is `elementRadialAngle + clusterBiasAngle`; each element's `size` is within `[elementMinSize, elementMaxSize]`; the `imageVariant` cycles round-robin across all elements and clusters; the same RNG seed produces identical output.

- **Secondary new seam (pure function):** `packGrassShadowUniforms`. Test that the output arrays have the expected length; each shadow angle equals `element.inclineAngle + (clusterX / halfWidth) * shadowAngleIntensity`; each shadow length equals `element.size * shadowLengthRatio`; unused uniform slots are zeroed.

- **Prior art:** the existing `generateBushConfigs.test.ts` and `pickBushMotionUniforms.test.ts` follow the same patterns — `buildInput()` helper with defaults, `collectAll*()` helpers, iteration-based assertions in `for` loops, seed-comparison tests, array-padding checks. The new tests slot into the same pattern and use the same `describe` / `it` / `expect` shape.

- **Existing seam (regression net):** the full domain test suite (`npm test`) must keep passing. This proves that nothing in the mechanics or existing visuals changed.

- **Existing seam (theme conformance):** the existing Theme-contract conformance test must keep passing. The scenery slot is unchanged; the new layers are purely additive internal to `FlowerGardenScenery`.

- **No new React Native render harness.** No new Skia unit tests, no new gesture-level tests, no new Reanimated worklet tests. Visual verification is on the simulator. This matches the project's established testing posture.

- **Verification gates:** `npx tsc --noEmit`, `npm run lint`, and `npm test` must all pass after the feature lands.

## Out of Scope

- Animating grass (sway, wind, idle motion) — grass is static once rendered.
- Grass reacting to roses or rose motion — grass is a purely decorative soil layer, independent of the rose layer.
- Grass reacting to touch or drag — the canvases are `pointerEvents="none"`.
- Per-table or per-session grass configuration — the config params are theme-level constants, not data-driven.
- Changes to the existing `SceneryShadowLayer`, `BushShaderLayer`, `EarthCanvas`, rose layer, rose-bud shader, word-sprite bridge, `Theme` interface, or any generic framework piece.
- Changes to the data layer.
- Sound effects for grass rendering.
- A separate shadow atlas or pre-rendered shadow assets — shadows are computed by the shader from the same grass atlas texture.
- Implementating a second theme's grass.

## Further Notes

- The grass config (like the bush config) is unstable between sessions because it uses `Math.random`. This is intentional — the user wants organic variety each session. If deterministic grass is ever needed, the change is one parameter (passing a seeded RNG instead of `Math.random`).
- The `GrassConfigParams` defaults should produce a visually pleasing density on a medium-sized phone screen (~390×844 logical points). Artists can tune per-device or per-theme.
- The 10 grass PNGs are assumed to have transparent backgrounds (alpha channel). The shadow shader relies on this alpha channel for the shadow shape.
- The atlas packing approach (drawing 10 images into one `SkImage` at load time) adds a one-time load cost but enables single-draw-call rendering for all grass instances. If the load-time cost is too high, a pre-packed atlas PNG can be added to the repo instead.
- No new ADR is needed — the design is purely additive, easy to reverse, and follows existing patterns without introducing new architectural constraints.
