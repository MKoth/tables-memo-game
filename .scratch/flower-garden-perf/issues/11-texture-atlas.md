Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Pack the 21 cloud textures + 21 orb petal textures (42 separate `ImageShader` binds) into **one texture atlas** (42 binds → 1). Build the atlas image (packed into a grid) at asset-load time, and change the cloud/petal layers to sample regions of the single atlas texture.

Perf impact: 42→1 texture bind per frame plus a much smaller GPU texture-set (142 → ~101 overall runtime textures). The cloud and orb petal visuals must be identical — the atlas is a pure repacking.

## Acceptance criteria

- [ ] One atlas texture replaces the 42 individual cloud/petal textures; the atlas is built deterministically (same inputs → same packing) so rendering is stable across sessions.
- [ ] Cloud patches and orb petals sample the correct atlas regions; visuals are identical to today.
- [ ] The image manifest/loader is updated so the 42 assets are loaded once and packed once (no double loading).
- [ ] Runtime GPU texture count drops by ~41 from this issue (verified by instrumented texture logging).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
