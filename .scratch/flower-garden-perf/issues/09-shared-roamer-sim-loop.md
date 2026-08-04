Status: ready-for-agent
Parent: .scratch/flower-garden-perf/PRD.md

## What to build

Share **one** roamer simulation frame loop between the main roamer layer and the decorative roamer layer (currently 2 `useRoamerSimFrameLoop`-style instances advance the same sim separately — 2 → 1). The undersea theme runs a single sim loop (`useSimFrameLoop`) that advances all roamer layers.

Scope: find the flower-garden roamer sim loops (main + decorative), hoist the loop to the shared parent that owns both layers, and pass the sim state down to both layers. Behavior (movement, evasion, capture, flight states) must be unchanged — this is purely about one loop advancing both sets of entries.

## Acceptance criteria

- [ ] Exactly one sim frame loop advances both the main and decorative roamer sets.
- [ ] Roamer motion, edge evasion, and capture behavior are unchanged in a table and a word-transformation exercise.
- [ ] The loop still pauses on AppState background (preserve existing `setActive` gating).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.

## Blocked by

None — can start immediately.
