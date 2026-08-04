Status: ready-for-agent
Parent: .scratch/flower-garden-orb-perf/PRD.md

## What to build

Bound the capture orb canvas to the orb's draw region instead of the full screen. The capture orb canvas (table exercise and translation-match capture orbs) currently covers the whole screen with `absoluteFill` and redraws fully every frame during assemble, idle petal rotation, and burst — exactly the moments when frames drop.

Size the canvas to the orb's bounding box: center ± roughly 1.5× the orb diameter, which covers the idle petal ring radius plus the burst scatter distance (burst scatter reaches ~0.55× diameter from center). Position the canvas so the orb's full motion — enter spiral, idle rotation, burst — remains visible with no clipping.

## Acceptance criteria

- [ ] The capture orb canvas is sized to the orb's bounding box (~3× diameter around the orb center), not full screen.
- [ ] Enter spiral, idle rotation, burst scatter, and the captured roamer + word label all render fully with no clipping (table exercise and translation match).
- [ ] UI FPS during capture-orb assemble and burst improves measurably (Dev-menu FPS monitor before/after).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
