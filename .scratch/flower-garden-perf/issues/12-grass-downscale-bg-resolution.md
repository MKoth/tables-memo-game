Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

- Downscale `grass-tilable.png` from 800×800 (~2.56 MB) to 512×512 (largest flower-garden GPU texture; ~4× fewer bytes per pixel set).
- Render the flower-garden **background** shaders (the merged earth/grass background from issue 03, and any other full-screen bg pass) at `BACKGROUND_RES = 0.85` resolution, matching the undersea pattern (`UnderseaThemeSeafloorCanvas.tsx:19` — canvas at `width * 0.85` with a `scale: 1 / BACKGROUND_RES` transform).

Slight softening of the background is **user-accepted** (0.85× resolution, foreground sprites unchanged). Foreground sprites (roses, roamers, orbs, clouds) must not be downscaled.

## Acceptance criteria

- [ ] `grass-tilable.png` is replaced by a 512×512 version (or downscaled at load); the texture is the only consumer of the change.
- [ ] Background canvases render at 0.85× with the scale transform, mirroring `UnderseaThemeSeafloorCanvas`; foreground canvases stay at native resolution.
- [ ] Background visuals are slightly softened but clearly identical in composition (user-accepted tolerance).
- [ ] Largest runtime GPU texture is no longer grass-tilable 800×800.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

- .scratch/flower-garden-perf/issues/03-earth-grass-mask-merge.md (the background canvases are being merged first; apply the resolution change to the merged result)
