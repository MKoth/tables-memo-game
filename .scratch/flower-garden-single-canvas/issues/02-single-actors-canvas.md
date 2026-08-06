Status: ready-for-agent
Parent: .scratch/flower-garden-single-canvas/PRD.md

## What to build

Consolidate the three orb-related canvases of the flower-garden word-transformation scene (word letter orbs, variant picker, insert flight) into one dynamic actors canvas driven by a single scene-state shared value. Today each of the three layers mounts its own canvas and its own per-orb animation plumbing (~18 shared values + 5 derived values per orb, ~180 for the scene); a letter press can still ripple through per-element React reconciliation.

This slice replaces those layers with one actor renderer: a scene-state shared value holds the current actor list (word letter orbs, picker items, insert flight orb) with positions, statuses, and phase timings; a single derived value reads the existing quantized scene clock and computes every actor pose per tick, reusing the existing orb pose worklet math unchanged; enter/exit cascades and insert flights become time-based fields on the scene state rather than component mounts. Taps continue to resolve against scene-state actors through the gesture layer from the prerequisite slice; sounds fire at the same moments via the established UI-thread-to-JS scheduling pattern. Letters remain Skia Glyphs (shader-rendered text is explicitly rejected).

The theme's dead word-transformation visual contract (per-layer word orbs / insert flight / variant picker / letter orb entries) is replaced by a single scene visual receiving the scene-state shared value and press callbacks; the conformance test is extended to the new contract and the stale per-layer components are deleted. Scenery, table-layer, and roamer canvases stay separate — they keep their own redraw frequencies.

## Acceptance criteria

- [ ] One actors canvas replaces the three orb-related canvases; the actor list is drawn from the scene-state shared value each tick of the quantized clock (one draw pass per tick for all actors).
- [ ] All actor poses are computed by a single derived value using the existing orb pose worklets unchanged; per-orb shared values, reactions, and derived values are gone.
- [ ] Enter/exit cascades and insert flights run as time-based scene state; no component mounts or unmounts happen during play.
- [ ] Taps (word orbs and picker items) resolve against scene-state actors through the gesture layer; accessibility roles/labels preserved; sounds fire at the same moments as before.
- [ ] The theme's word-transformation contract exposes a single scene visual; the conformance test covers it; the stale per-layer contract and components are deleted.
- [ ] Visual output is identical to the end of the prerequisite slice at rest, during interaction, and across an orientation reflow (simulator comparison).
- [ ] On-device metrics: JS thread idle during play; actor count in scene state matches expected orbs; one draw pass per tick.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

- .scratch/flower-garden-single-canvas/issues/01-remove-react-churn.md (the shared-value snapshot sync, stable orb identity, and the worklet hit-test gesture are building blocks of this slice).
