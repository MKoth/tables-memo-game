Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Merge the 3 `GroundScatterShaderLayer` canvases into **1 canvas** (same shader/draw style — they differ only in config set), reduce `DEFAULT_CLOVER_COUNT` from 250 to ~120, and add viewport culling so scatter elements outside the visible rect are skipped by the generator/draw (slight softening of scatter density — user-accepted).

## Acceptance criteria

- [ ] Exactly one ground-scatter canvas renders what the 3 canvases rendered; canvas count drops by 2.
- [ ] Clover/scatter density is ~120 default; scatter still reads as a natural ground cover on device (slight softening OK).
- [ ] Scatter elements outside the viewport are culled (no draw work, no config slots).
- [ ] `generateGroundScatterConfigs` output invariants still hold under the count reduction and culling; existing ground-scatter tests pass; new tests cover culling boundaries.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
