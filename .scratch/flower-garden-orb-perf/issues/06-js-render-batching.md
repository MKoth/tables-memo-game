Status: ready-for-agent
Parent: .scratch/flower-garden-orb-perf/PRD.md

## What to build

Reduce JS-thread work per user action in the word-transformation exercise. Each insert press currently fires several sequential state updates (letters, insert animation state, variant picker items, wrong/hidden/popped item ids, highlighted cell, revealed cells), each triggering a separate React render of the content tree on the JS thread — one of the causes of the JS FPS drop during movement.

Batch the per-press state updates in the word-transformation game logic so each press causes one render pass instead of several. Also memoize the word sprite table layer (and its per-cell markup) so highlight/reveal changes do not re-render the whole table — only the cells whose state actually changed.

## Acceptance criteria

- [ ] Each insert press fires a single batched state update; the multiple sequential renders per press are gone (verify via render counts or JS FPS during presses).
- [ ] The table layer re-renders only what changed when the highlighted/revealed cells update.
- [ ] Game behavior and sequencing are unchanged: letters, picker items, insert flight, wrong feedback, and table highlights behave exactly as today across a full insert cycle.
- [ ] JS FPS during insert presses improves measurably (Dev-menu FPS monitor before/after).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` all pass (existing word-transformation domain tests stay green).

## Blocked by

None — can start immediately.
