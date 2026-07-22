Status: ready-for-agent
Parent: .scratch/flower-garden-grass-scattering/PRD.md

## What to build

A "make the change easy" prefactor that lands the testable core of the grass-scattering feature without any visible rendering changes. This slice adds:

- The data types: `GrassConfigParams` (the 10 tunable parameters: `clustersPerScreen`, `minGrassPerCluster`, `maxGrassPerCluster`, `clusterAngleIntensity`, `skewIntensity`, `elementMinSize`, `elementMaxSize`, `shadowOpacity`, `shadowAngleIntensity`, `shadowLengthRatio`), `GrassClusterConfig` (with `clusterX`, `clusterY`, `clusterBiasAngle`, `elements[]`), and `GrassElementConfig` (with `imageVariant: 0–9`, `inclineAngle`, `size`).
- A default config object with sensible values for a medium phone screen.
- The `generateGrassConfigs` pure function: takes `(screenWidth, screenHeight, rng, params)` and returns `GrassClusterConfig[]`. For each cluster: picks uniform random `(x, y)` across the full screen; computes `clusterBiasAngle = (x / halfWidth) * clusterAngleIntensity`; samples N elements uniformly in `[minGrassPerCluster, maxGrassPerCluster]`; assigns each element a radial angle evenly at `360°/N`, adds the cluster bias to get `inclineAngle`; cycles grass image variants round-robin across all clusters; samples size uniformly in `[elementMinSize, elementMaxSize]`.
- The `useGrassConfigs` hook that calls `generateGrassConfigs` inside `useMemo` with `Math.random`, generating once on mount and regenerating on screen dimension change.
- The `packGrassShadowUniforms` pure function: takes `(configs, screenWidth, screenHeight, params)` and returns flat arrays for the shadow shader — per-element shadow angle (element incline + horizontal-offset amplification), shadow length (element size × shadowLengthRatio), and shadow opacity. Pads to fixed array sizes for shader uniform slots.
- Asset loading: extend the flower-garden image manifest with the 10 grass sources (`grass1.png`–`grass10.png` under `soil.grass`), extend `FlowerGardenThemeImages` with `grassImages: SkImage[] | null` and `grassAtlasImage: SkImage | null`, extend `useFlowerGardenThemeAssets` to load them, and create a packing step that draws the 10 individual grass `SkImage`s into a single atlas `SkImage` for use by the `<Atlas>` component.
- Unit tests for `generateGrassConfigs`: cluster count equals `clustersPerScreen`; each cluster's element count is within `[minGrassPerCluster, maxGrassPerCluster]`; cluster bias angle has correct sign for left/right positions and is zero at centre; each element's incline angle is `elementRadialAngle + clusterBiasAngle`; each element's size is within range; image variants cycle round-robin; same RNG seed produces identical output.
- Unit tests for `packGrassShadowUniforms`: output arrays have expected length; each shadow angle equals `element.inclineAngle + (clusterX / halfWidth) * shadowAngleIntensity`; each shadow length equals `element.size * shadowLengthRatio`; unused uniform slots are zeroed.

After this slice, `npm test` exercises all the new pure-function logic in isolation, the loading screen reports ready with the new grass images included, and no visible rendering change — the `FlowerGardenScenery` slot still renders the existing EarthCanvas, SceneryShadowLayer, and BushShaderLayer only.

## Acceptance criteria

- [ ] `GrassConfigParams`, `GrassClusterConfig`, `GrassElementConfig` types are defined with the 10 configurable parameters.
- [ ] Default config object exists with sensible values for a medium phone screen.
- [ ] `generateGrassConfigs` is implemented as a pure function with the specified inputs and outputs.
- [ ] `useGrassConfigs` hook is implemented, generating configs once on mount via `Math.random`.
- [ ] `packGrassShadowUniforms` is implemented as a pure function with flat array outputs padded to fixed shader sizes.
- [ ] The flower-garden image manifest declares the 10 grass sources under `soil.grass` and `FlowerGardenThemeImages` is extended with `grassImages` and `grassAtlasImage`.
- [ ] `useFlowerGardenThemeAssets` loads the 10 grass images and packs them into a single atlas `SkImage`.
- [ ] Unit tests for `generateGrassConfigs` cover cluster count, element count range, bias angle sign, incline angle composition, size range, round-robin cycling, and seed determinism.
- [ ] Unit tests for `packGrassShadowUniforms` cover array lengths, shadow angle computation, shadow length scaling, and padding.
- [ ] `npm test` passes with the new unit tests.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] No visible rendering change — the `FlowerGardenScenery` slot renders the same layers as before.

## Blocked by

None — can start immediately.
