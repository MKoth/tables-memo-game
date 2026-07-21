Status: ready-for-agent
Parent: .scratch/flower-garden-bush-shader/PRD.md

## What to build

The first visible end-to-end slice: write the SkSL shader, the `BushShaderLayer` component, and wire it into the existing `FlowerGardenScenery` slot. After this slice, the garden is fully visible at rest — every rose has a curved tapered stem running from a bush base on the ground, a green calyx tucked behind the rose, and 5–9 leaves distributed along each stem with correct inner/outer z-ordering.

The shader is one SkSL effect per bush compiled once at module load (matching the `roseBudDeform.sksl.ts` pattern). Six image samplers: `stemTexture`, `calyxTexture`, `leafTexture1..4`. Uniform arrays sized by `MAX_STEMS_PER_BUSH=5` and `MAX_LEAVES_PER_STEM=9`, padded with zeros for unused slots. The shader runs three internal draw phases per fragment:

1. **Calyses** — for each stem, draw the calyx image at the rose's rest position (from the uniform `restX[i]`, `restY[i]`) scaled to a fixed fraction of the rose's `bellSize`. Calyces are drawn first within the stem block so a stem that crosses a calyx does not occlude it.
2. **Stems** — for each stem, draw the curved tapered band. The shader computes the per-fragment perpendicular distance to the stem's quadratic bezier curve (GLSL-side bezier math matching the JS-side `bezierMath` module), the perpendicular offset scaled by the current width at the closest `t`, and the `t` along the curve. If the offset is within the stem's width and the alpha sample is above a threshold, output the stem texture's colour. Linear taper: `baseWidth` at `t=0`, `topWidth` at `t=1`. Texture `V = t`, `U = perpendicular-offset / width`.
3. **Leaves** — for each leaf, compute the attachment point on the curve at the leaf's `t`, place the leaf image with its bottom edge at the attachment point, rotate it to `tangentAngle + tilt`, and sample the leaf texture (chosen by `variant`). Inner-side leaves (those with `side < 0`) are drawn first within this phase, outer-side leaves (`side > 0`) after, so outer leaves occlude inner leaves where they overlap.

Early-exit checks: skip per-stem and per-leaf math for fragments where the first sample's alpha is below `0.01`. This keeps the per-bush fullscreen `Rect` from paying for fragments outside the stems and leaves.

The `BushShaderLayer` component owns a single Skia `Canvas` and renders one fullscreen `Rect` per bush (with the same shader effect but per-bush uniforms). The component uses `useDerivedValue` to rebuild the uniforms each frame (matching the `CellRoseBud` pattern). The `useBushConfigs` hook from slice 1 supplies the bush configs. For this slice, the uniforms use the **rest** rose positions (no motion coupling yet — the calyx sits at the rose's rest cell, the stem connects to the rest position, leaves parallax weight is zero).

`FlowerGardenScenery` becomes a thin wrapper that renders `<BushShaderLayer />`. No other theme assets needed — the scenery is bushes. The `pointerEvents="none"` pattern is preserved on the Canvas (matching the existing `FlowerGardenScenery` style). The scenery renders inside the existing `Scenery` slot in the theme, with no change to the `Theme` interface or `themeBundle`.

## Acceptance criteria

- [ ] `roseBush.sksl.ts` exists with the SkSL source, the `MAX_STEMS_PER_BUSH=5` and `MAX_LEAVES_PER_STEM=9` constants, and a `roseBushUniformDefaults` reference object.
- [ ] The shader compiles once at module load and throws on compile failure (matching the `roseBudDeform.sksl.ts` pattern).
- [ ] `BushShaderLayer` component exists, owns a Skia `Canvas`, and renders one fullscreen `Rect` per bush with the shader effect and per-bush uniforms.
- [ ] `FlowerGardenScenery` is no longer empty — it renders `<BushShaderLayer />` with `pointerEvents="none"`.
- [ ] The garden is visible at rest: every rose has a curved tapered stem running from a bush base on the ground, a calyx behind the rose, and 5–9 leaves distributed along each stem.
- [ ] Stems curve outward from the bush center (control point on the outer side of the base→top line).
- [ ] Leaves are z-ordered correctly: a leaf on the inner arc of its stem is hidden by the stem band, a leaf on the outer arc is in front of the stem band.
- [ ] The same `tableId` produces the same bushes on every reload (deterministic seeded RNG).
- [ ] The shader reads from the config generator's output (no hardcoded bush configs).
- [ ] No new shared values, no new bridge types, no new store, no new `Theme` interface members.
- [ ] The existing domain test suite keeps passing unchanged.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.

## Blocked by

- `.scratch/flower-garden-bush-shader/issues/01-foundation-types-beziers-config-assets.md`
