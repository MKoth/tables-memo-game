Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Merge the earth fill, the grass fill, and the `grassHoleMask` into **one background shader + one canvas** (currently: `FlowerGardenEarthCanvas.tsx` + `FlowerGardenGrassCanvas.tsx` + the mask in `shaders/grassHoleMask.sksl.ts` = 3 full-screen passes and 2 canvases).

The merged shader `mix()`es the earth texture outside the noise hole and the grass texture inside it, so a single fragment program produces the current earth-through-grass-hole look. Net effect: −2 full-screen passes, −1 canvas, with no visual loss.

Do not touch the shadow or substrate passes (their z-order is governed by issue 01).

## Acceptance criteria

- [ ] Exactly one background canvas and one background shader render what the earth canvas, grass canvas, and hole mask rendered before.
- [ ] The merged output is visually identical to today's earth/grass/hole composite at rest and during table drag.
- [ ] The scenery canvas count drops by 1 (9 → 8) with this issue alone.
- [ ] The earth and grass image samplers are bound to the same textures as today (asset pipeline unchanged).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
