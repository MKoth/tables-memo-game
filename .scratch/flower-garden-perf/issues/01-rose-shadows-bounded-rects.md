Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Convert the full-screen `roseShadows` pass to one **bounded shadow rect per rose disc**, transplanting the undersea per-sprite shadow pattern (`spriteShadow.sksl.ts`, `StoneInstance.tsx`). Shadow rects are clipped to the disc's bounding box instead of covering the whole screen with a 64-iteration loop, so fragments outside any rose's shadow never run the loop.

**The rects must be DYNAMIC, not static** — the shadow is not stationary: it follows the rose's cell (`layoutX`/`layoutY` shared values) as the table drags and as the motion loop runs, and some cells (e.g. corners) never move. Each rect's `x/y/w/h` is bound to `useDerivedValue`s that re-read the shared values every frame (RN Skia moves the rect on the UI thread with no React re-render). The in-repo precedent is `StemShadowRect.tsx` in the *same layer*: its rect tracks `layoutX`/`layoutY[roseIndex]` per frame via derived values. Corner cells that don't move get rects whose derived values never change — no special-casing needed.

Per-disc rect math (must match the shader exactly):

- Shadow centre: `c = mix(roseShadowCenter[i] + lightOffset, roseShadowBase[i], stemShadowTopSkew)`, where `roseShadowCenter[i] = (layoutX[i], layoutY[i])` (all from the same shared values the shader reads today).
- Ellipse bbox: semi-axis `r` in x, `r * shadowSquash` in y; the softness falloff (`smoothstep(r * inner, r, dist)`) reaches 0 exactly at `dist = r`, so the bbox is `c ± (r, r * squash)` plus a small epsilon.
- One `Rect` per disc, each with its own single-disc `<Shader>`; `roseShadowCount` becomes 1 per rect (or drop the loop).

Blend-mode caveat: the old full-screen shader took `max(t)` over overlapping discs; per-rect src-over drawing slightly darkens overlap regions where two roses' shadows touch. Check the tightest table spacing on device; if the darkening is visible, fall back to a small union rect for adjacent discs or accept the negligible darkening.

In the same pass, tighten the `roseSubstrate` layer:

- Lower `MAX_ROSE_DISCS` from 40 to the actual rose count for the current table.
- Add an AABB early-out per disc so fragments far outside a disc skip the loop.
- Wrap `RoseSubstrateLayer` in `React.memo` (it is currently the only scenery layer without one).

⚠️ **Z-ORDER CONSTRAINT (do not violate)**: the shadow pass and the substrate pass must stay **separate passes at their current z-positions**. Render order in `FlowerGardenScenery.tsx`: SceneryShadowLayer (below bushes) → BushShaderLayer → RoseSubstrateLayer (above bushes, below rosebud cells in the carrier). Merging them would bury the substrate under the bushes or pop the shadows on top. The shadow stays in `SceneryShadowLayer` at its current z; the substrate stays a full-screen pass at its z.

## Acceptance criteria

- [ ] The full-screen shadow `<Rect>` is replaced by one bounded `<Rect>` per rose disc with **dynamic bounds** (`useDerivedValue` on the same `layoutX`/`layoutY` shared values the shader reads); the rects track the cells during drag and motion-loop, and shadow output is visually identical to today at rest and during drag.
- [ ] Per-rect bbox math matches the shader (centre mix with `lightOffset`/`stemShadowTopSkew`, `r * shadowSquash` y-semi-axis, softness falloff reaches 0 inside the rect).
- [ ] Overlapping-shadow check: at tightest table spacing the per-rect src-over blend is not visibly darker than today's `max(t)` composite (or the accepted fallback is applied).
- [ ] The shadow pass remains in `SceneryShadowLayer` at its current z (below the bushes); no pass is merged or moved.
- [ ] The substrate pass remains a full-screen pass at its z (above bushes, below rosebuds); `MAX_ROSE_DISCS` is lowered to the actual rose count and the disc loop early-outs outside each disc's AABB.
- [ ] `RoseSubstrateLayer` is wrapped in `React.memo` and does not re-render on parent re-renders.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.
- [ ] On-device spot-check: word-transformation exercise renders shadows/substrate identically to pre-change, with the full-screen-pass cost gone.

## Blocked by

None — can start immediately.
