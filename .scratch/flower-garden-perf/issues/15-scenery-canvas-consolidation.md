Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Consolidate `SceneryShadowLayer` + `BushShaderLayer` into **one bush canvas**. Both layers already read the same inputs (`bushConfigs`, `layoutX`, `layoutY`, `layoutScale` shared values) and draw in the same coordinate space — the shadow pass (bounded rose shadow rects from issue 01) and the bush-shader pass can be siblings in one `<Canvas>` with the shadow drawn first (keeping its z below the bushes) and the bush effect second (keeping its z above shadows, below the substrate).

Final scenery canvas count: 9 → ~4 (background, bush+shadow, substrate, ground scatter).

⚠️ Keep the z-order from issue 01: shadow below bush stems/leaves; do not pull the substrate into this canvas (it stays above the bushes).

## Acceptance criteria

- [ ] One canvas renders shadow pass then bush pass; per-frame draw order is shadow → bushes.
- [ ] Visual output is identical at rest and during drag (shadow below stems, bushes above shadows, substrate untouched).
- [ ] Scenery canvas count is ~4 (down from 9) with this issue alone (background 1, bush+shadow 1, substrate 1, ground scatter 1).
- [ ] The combined canvas keeps `pointerEvents="none"` and the shared-value source is unchanged.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

- .scratch/flower-garden-perf/issues/01-rose-shadows-bounded-rects.md (the shadow pass is being reshaped there; consolidate after it lands)
