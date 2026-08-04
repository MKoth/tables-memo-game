Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Bound the `particleDust` full-screen shader (300-iteration loop) to **active-roamer rects** and cap the particle count:

- Cap `MAX_PARTICLES` from 300 → ~120 (slight softening, user-accepted).
- The dust shader's rect covers only the active roamers' bounding regions instead of the whole screen, so fragments outside the region skip the loop.
- Skip the frame entirely when no roamer emitter is active (`FlightState` check in the existing pool update / frame loop).
- While here, remove the per-frame 2400-float rebuild in `FlowerGardenParticleLayer` (`pool.value` → pre-padded pool) if the pool-shape change makes it natural; otherwise leave it to issue 10.

## Acceptance criteria

- [ ] `MAX_PARTICLES` is ~120; particle visual density is still legible on device (slight softening OK).
- [ ] The dust shader runs only inside active-roamer bounding rects; fragments outside never execute the particle loop.
- [ ] No per-frame dust work when no roamer is emitting (frame skipped).
- [ ] The particle pool logic remains correct across spawn/despawn and roamer capture; existing particle tests pass.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
