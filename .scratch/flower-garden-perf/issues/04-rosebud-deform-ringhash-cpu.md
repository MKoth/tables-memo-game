Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Precompute the `ringHash` in `roseBudDeform.sksl.ts` (currently a `sin`-based hash inside the 4×16 petal loop, up to 128 `sin`/pixel) **on the CPU** and pass the per-ring values as uniforms, mirroring how the undersea theme precomputes per-sprite values and feeds them as uniform arrays.

The shader's petal loop must end up with no `sin`/`cos` per pixel; all ring-dependent terms come from the uniform arrays built once per frame (or once per config change) in `CellRoseBud`'s `useDerivedValue`. Visual output must be identical — the precomputed values are the same numbers the hash produced, just computed on the CPU instead of per fragment.

## Acceptance criteria

- [ ] `roseBudDeform` takes per-ring hash values as uniforms; the petal loop contains no `sin`/`cos` calls.
- [ ] The uniform values are computed on the CPU in `CellRoseBud` (per-frame via `useDerivedValue`, matching the existing uniform-building pattern).
- [ ] Petal rendering is visually identical at rest, during drag, and under the motion loop.
- [ ] Uniform array sizes stay within the existing per-effect limits.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
