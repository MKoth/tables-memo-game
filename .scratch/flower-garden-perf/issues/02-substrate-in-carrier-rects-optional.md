Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

**OPTIONAL issue.** Eliminate the remaining full-screen `roseSubstrate` pass by drawing each substrate disc inside its corresponding `CellRoseBud` rect in the carrier layer.

Rationale: the carrier sits above the bushes; within a cell rect the substrate draws before the bud body, so the substrate lands below the bud and above the bushes — preserving the z-order constraint from issue 01 without a full-screen pass. This is a bigger refactor than issue 01 because it crosses the scenery/carrier seam and touches `carrier/FlowerGardenWordSpriteTableLayer/components/CellRoseBud.tsx`.

This issue is tracked but **optional**: it can be deferred or skipped without affecting the rest of the plan. It only makes sense to grab after issue 01 lands (issue 01 already tightens the substrate; this removes it entirely).

## Acceptance criteria

- [ ] The full-screen substrate pass in the scenery is gone; substrate discs render inside their cell rects in the carrier layer.
- [ ] Z-order is preserved: substrate below bud body, above bushes (verified visually on a word-transformation exercise).
- [ ] No visual regression in the substrate appearance at rest or during drag.
- [ ] `CellRoseBud` still renders at the same quality with no extra per-frame work beyond the substrate draw.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.
- [ ] If the refactor turns out to be higher-risk than its perf delta justifies, it may be abandoned — leave the scenery substrate as fixed by issue 01 and mark this issue `wontfix` with a note.

## Blocked by

- .scratch/flower-garden-perf/issues/01-rose-shadows-bounded-rects.md (same area; do not start before the shadow/substrate z-order is fixed)
