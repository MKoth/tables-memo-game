Status: ready-for-agent
Parent: .scratch/flower-garden-orb-perf/PRD.md

## What to build

Consolidate the petal draw path. Each petal currently evaluates five derived values per frame (transform, opacity, tint matrix, plus the sprite's transform and clip rect), and each petal mounts its own GPU `ColorMatrix` node even when no tint is applied.

Rework the petal rendering pipeline so:

- Each petal evaluates exactly one derived value returning a draw bundle (transform + opacity + tint strength).
- The sprite primitive accepts static sizes as plain numbers; when a sprite's size is constant (petals — size never changes), the transform and clip rect are computed once at mount instead of per frame. Dynamic sizes keep derived values.
- The wrong-feedback tint moves from per-petal `ColorMatrix` nodes to one `ColorMatrix` per petal-ring group, mounted only while tint strength is above zero. The tint matrix is identical for every petal in a frame (uniform tint strength and color), so the visual result is unchanged.

## Acceptance criteria

- [ ] Each petal evaluates one derived value per frame (down from five); sprite transform/clip are static for constant-size petals.
- [ ] Exactly one `ColorMatrix` per petal ring, mounted only while wrong-feedback tint is active; it is absent when tint strength is zero.
- [ ] Wrong-answer feedback tints all petals identically to today, with the same shake and ramp timing.
- [ ] Burst scatter and petal visuals are unchanged (enter spiral, idle rotation, burst).
- [ ] FPS during wrong-feedback tinting improves (Dev-menu FPS monitor; GPU shader-pass count per frame drops).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
