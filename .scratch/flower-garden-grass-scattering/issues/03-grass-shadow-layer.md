Status: ready-for-agent
Parent: .scratch/flower-garden-grass-scattering/PRD.md

## What to build

Add shadows to the grass clusters by implementing a SkSL shadow shader and a dedicated `GrassShadowLayer` component. After this slice, each grass element casts a visible shadow on the soil — the shadow angle is the element's incline plus a horizontal-offset amplification, the shadow length is proportional to element size, and the shadow opacity is configurable.

The `GrassShadowLayer` component owns a Skia `Canvas` with an `<Atlas>` node using the same packed grass atlas (`SkImage`) as the grass layer, but with a SkSL shadow shader bound as a paint effect. The shader:

- Samples the grass atlas texture at the fragment position.
- Extracts the alpha channel (this gives the shadow its shape from the grass image).
- Applies a Gaussian blur to soften the shadow edges.
- Darkens the result to a shadow colour (semi-transparent black/dark-brown).
- Offsets the shadow by the element's shadow angle and shadow length relative to the grass base position.
- Applies the per-element shadow opacity.

The `<Atlas>` component receives:
- Same `image` (packed grass atlas) as the grass layer.
- Same `sprites` source rects (same `imageVariant` for each element).
- `transforms` offset by the shadow displacement: position + `(sin(shadowAngle) * shadowLength, cos(shadowAngle) * shadowLength)`.
- A `paint` with the shadow shader bound via a child `<Shader>` node.

The shadow uniforms (per-element shadow angle, shadow length, shadow opacity) come from `packGrassShadowUniforms` (slice 1). The shader is compiled once at module load (matching the `roseBudDeform.sksl.ts` and `roseBush.sksl.ts` patterns) and throws on compile failure.

`FlowerGardenScenery` is extended to render the shadow layer between the EarthCanvas and the GrassLayer:

```
EarthCanvas → GrassShadowLayer → GrassLayer → SceneryShadowLayer → BushShaderLayer
```

This z-order means the shadow falls on the soil and the grass renders on top of its own shadow, creating depth.

After this slice, the grass layer + shadow layer together form the complete grass-scattering visual.

## Acceptance criteria

- [ ] `grassShadow.sksl.ts` exists with the SkSL source for the shadow effect (alpha extraction, blur, darken, offset, opacity).
- [ ] The shader compiles once at module load and throws on compile failure.
- [ ] `GrassShadowLayer` component exists and renders a Skia `<Atlas>` with the shadow shader bound.
- [ ] Each grass element casts a shadow offset by `(shadowAngle, shadowLength)` with the correct opacity.
- [ ] Shadow angles are amplified relative to element incline angles: `element.inclineAngle + horizontalOffset * shadowAngleIntensity`. Even at screen centre, no shadow is perfectly vertical.
- [ ] Shadow lengths scale with element size via `shadowLengthRatio`.
- [ ] The shadow layer renders in the correct z-order: EarthCanvas → GrassShadowLayer → GrassLayer → SceneryShadowLayer → BushShaderLayer.
- [ ] The shadow layer reads the packed atlas from the `FlowerGardenAssetsProvider` context.
- [ ] Shadow uniforms are supplied by `packGrassShadowUniforms` from slice 1.
- [ ] The existing domain test suite keeps passing unchanged.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.

## Blocked by

- `.scratch/flower-garden-grass-scattering/issues/01-foundation-types-config-assets.md`

(Note: this slice does NOT depend on slice 2 — it uses the same atlas and config but renders a separate layer. Slices 2 and 3 can be implemented in parallel once slice 1 is complete.)
