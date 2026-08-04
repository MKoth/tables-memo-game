Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Convert flower-garden asset loading from all-or-nothing (~28 sequential await barriers) to **progressive loading with partial-render callbacks** (~3 barriers), mirroring `useUnderseaThemeAssets.ts` (progressive readiness stages).

Load priority order:

1. earth + grass + bush/stem/calyx/leaf backgrounds (what the scenery needs to be non-blank),
2. field-flower images,
3. ground-scatter images (clover/ground details last).

The loading screen must keep working, and the scenery must be able to render partially (with the not-yet-loaded groups absent or replaced by already-loaded lower-priority placeholders) rather than holding everything hostage to the last asset. No visual regression at the end of loading (final state identical to today).

## Acceptance criteria

- [ ] Loading is staged: ~3 await barriers instead of ~28; each stage reports progress through the existing loading-screen plumbing.
- [ ] The scenery renders (background + bushes) once stage 1 completes, before field flowers and ground scatter arrive.
- [ ] Each stage's images are individually guarded (a failed stage warns in `__DEV__` and degrades gracefully, per the existing image-load error handling).
- [ ] Final loaded state is identical to today's all-or-nothing state.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

- .scratch/flower-garden-perf/issues/11-texture-atlas.md (the atlas changes which image sources are loaded; do the loading-flow restructure after the source list settles)
