Status: ready-for-agent
Parent: .scratch/flower-garden-orb-perf/PRD.md

## What to build

Merge the three full-screen Skia canvases in the word-transformation orb layer (word orbs, insert flight, variant picker) into one canvas hosted by the orb layer, and size it to the union of its content rects (word row + variant row + flight corridor, roughly 60–70% of screen) instead of full screen. Skia canvases redraw fully when any animated value inside them changes, so every movement frame currently redraws three full screens; one content-sized canvas redraws a fraction of that.

The three layer components keep their responsibilities but render into the shared canvas (e.g., return Skia children for the parent's canvas); the Pressable hit views stay plain React Native views and are untouched. Z-order and pointer-event behavior must be preserved: canvas draws are below the hit views exactly as today.

## Acceptance criteria

- [ ] Word orbs, insert flight, and variant picker draw into a single canvas; the standalone full-screen canvases are gone.
- [ ] The canvas is sized to the union of its content rects, not full screen.
- [ ] Letter orbs, insert flight, and picker visuals, z-order, and hit areas are identical to today (simulator visual check across a full insert cycle: press variant, flight, word-row relayout, picker pop).
- [ ] UI FPS during insert press + flight (320ms move) improves measurably (Dev-menu FPS monitor before/after).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
