Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Batch field flowers per `FieldFlowerRect` shader call. The flower shaders are already written for batching — uniform arrays sized `MAX_FIELD_FLOWERS=8` / `MAX_LEAVES_PER_FLOWER` — but each rect currently submits `count=1` and rebuilds ~21 fresh padded arrays per flower per frame at 20 Hz.

Two changes:

- Submit up to `MAX_FIELD_FLOWERS` flowers per shader call (batch configs that share a flower type into one rect), using the real count uniform instead of `1`.
- Pre-pad the uniform arrays at **module scope** (like the undersea theme's module-level pre-padded constants, cf. `UnderseaThemeSeafloorCanvas.tsx` / `StoneInstance.tsx`) and fill values in place, so no per-frame array allocations remain in the 20 Hz `useDerivedValue`.

## Acceptance criteria

- [ ] One shader call can render up to `MAX_FIELD_FLOWERS` flowers; the count uniform reflects the batched count, not 1.
- [ ] Per-frame uniform building allocates no arrays (module-scope pre-padded buffers mutated in place).
- [ ] Field-flower rendering (swing, boost, leaf variation, shadows) is visually identical at rest and under the 20 Hz clock.
- [ ] Existing field-flower config tests pass; new unit tests cover the batch-padding helper (padded size, fill order, count clamp).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
