Status: ready-for-agent
Parent: .scratch/flower-garden-grass-scattering/PRD.md

## What to build

The first visible slice: render grass clusters on screen using the Skia `<Atlas>` component. After this slice, grass clusters are visible across the full screen behind the rose bushes — positioned, angled with cluster bias, skewed (narrow at base, wide at top), sized randomly, and cycling through the 10 grass image variants. No shadows yet.

The `GrassLayer` component owns a single Skia `Canvas` with an `<Atlas>` node. It receives the packed grass atlas `SkImage` (from slice 1's asset loading), the `GrassClusterConfig[]` (from `useGrassConfigs`), and the skew intensity parameter. For each grass element across all clusters:

- The `image` prop is the packed atlas `SkImage`.
- The `sprites` array maps `imageVariant` to the corresponding source rect within the atlas.
- The `transforms` array contains per-element `SkRSXform` values encoding:
  - Position: at the cluster origin offset by the element's incline angle direction times a small visual spread factor.
  - Scale: the element's random `size` as a fraction of the sprite's natural size.
  - Skew: applied as a non-uniform scale (narrow at bottom, wide at top) via the transform, using the `skewIntensity` parameter.
  - Rotation: the element's `inclineAngle` (including cluster bias) so the grass blade leans in its assigned direction.

The `<Atlas>` component is wrapped in a `Group` with `pointerEvents="none"` so touches pass through to the exercise layers (following the existing scenery pattern).

`FlowerGardenScenery` is extended to compose the new layer in the correct z-order:

```
EarthCanvas → GrassLayer → SceneryShadowLayer → BushShaderLayer
```

The grass layer reads the grass atlas image from the `FlowerGardenAssetsProvider` context (same pattern as the bush shader layer reading stem/leaf textures). The layer is wrapped in `React.memo` so the per-frame rendering work is entirely in the Skia command buffer.

After this slice, opening a table exercise in the flower-garden theme shows grass clusters scattered across the soil.

## Acceptance criteria

- [ ] `GrassLayer` component exists and renders a Skia `<Atlas>` from the packed grass atlas and grass config.
- [ ] Each grass element gets the correct image variant via the atlas sprite rects.
- [ ] Each grass element is positioned at the cluster origin, rotated by its `inclineAngle`, and scaled by its random `size`.
- [ ] Perspective skew is applied: grass is narrower at the bottom, wider at the top, controlled by `skewIntensity`.
- [ ] The `<Atlas>` is in a `pointerEvents="none"` container.
- [ ] `FlowerGardenScenery` renders in the order: EarthCanvas → GrassLayer → SceneryShadowLayer → BushShaderLayer.
- [ ] Grass clusters are visible on screen across the full soil area.
- [ ] The grass layer reads the atlas from the `FlowerGardenAssetsProvider` context.
- [ ] No first-frame flash — grass is present from the first render frame.
- [ ] No degeneration in framerate compared to pre-grass rendering.
- [ ] The existing domain test suite keeps passing unchanged.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.

## Blocked by

- `.scratch/flower-garden-grass-scattering/issues/01-foundation-types-config-assets.md`
