Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Stop the per-frame `pool.value = pool.value.slice()` array copies (3 sites): `useParticleFrameLoop.ts:70-71` (particle pool + emit timestamps) and `useOrbCloudLayer.ts:67` (orb cloud pool, plus the `CloudPatch` consumer). Each slice allocates a fresh array every frame on the JS thread.

Mutate the pool **in place** like the undersea sim does; only re-slice when the pool's membership actually changes (spawn/despawn, roamer capture). The worklet callers must get the same values they read today — verify the consumers (shader uniform builders, `CloudPatch` slot reads) that rely on the identity being refreshed.

## Acceptance criteria

- [ ] No per-frame `slice()` in the particle loop, emit-timestamp loop, or orb-cloud loop; re-slice happens only on membership change.
- [ ] Particle emission, roamer dust, and cloud patches render identically (spawn/despawn still visible; capture still clears the right particles).
- [ ] Consumers that read the pool each frame see current values (in-place mutation propagates).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
