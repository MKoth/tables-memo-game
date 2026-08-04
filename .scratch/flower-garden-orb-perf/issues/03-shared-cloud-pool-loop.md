Status: ready-for-agent
Parent: .scratch/flower-garden-orb-perf/PRD.md

## What to build

Replace the per-orb cloud pool frame loops with one shared pool manager. Today every letter orb and capture orb owns its own always-on `useFrameCallback` that steps its cloud patch pool and copies the whole pool array (`slice()`) every frame — up to ~10 loops in a word-transformation exercise, each allocating per frame.

Build a single cloud pool loop that steps every registered orb's cloud pool in one pass at the shared clock rate (~20–30fps; cloud fades are 450–1200ms so the lower rate is invisible). Pools mutate in place with a version shared value bumping each step so dependent derived values re-evaluate without per-frame array copies; re-slicing happens only when pool membership changes (spawn/despawn), not per frame. Also consolidate each cloud patch's derived values into a single draw bundle (transform + opacity + size + region selection from the static regions array).

## Acceptance criteria

- [ ] All orb cloud pools step from a single shared frame callback; per-orb cloud loops are gone.
- [ ] Cloud pools mutate in place; no per-frame `slice()` in the cloud hot path (re-slice only on membership change).
- [ ] Cloud patch rendering derives from pool state + version and collapses to one derived value per patch.
- [ ] Cloud patch visuals are unchanged: size, opacity, lifetime, fade in/out, rotation, spawn distribution (letter orbs and capture orb).
- [ ] With N orbs mounted, the always-on frame-callback count no longer scales with N for clouds.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass (cloud pool worklet tests updated for in-place stepping and version behavior).

## Blocked by

None — can start immediately.
