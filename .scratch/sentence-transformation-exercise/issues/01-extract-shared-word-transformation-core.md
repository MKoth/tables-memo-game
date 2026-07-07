Status: ready-for-agent
Blocked by:

## Parent

`.scratch/sentence-transformation-exercise/PRD.md`

## What to build

Extract a deep **word transformation core** from the monolithic `useWordTransformationGame` hook. The core owns in-round transformation state (active sequence, current word, operation index, mode, letter bubble models, insert animation phase, transitioning flag) and exposes a narrow event interface (letter press, variant select, tick/advance callbacks). Refactor the table transformation exercise hook into a thin adapter that delegates transformation rules to the core and keeps only table-specific concerns (highlighted cell, revealed cells, koi escape on solve).

Add unit tests that drive events into the core and assert observable state — no React Native mount required. After extraction, the table transformation exercise must remain behavior-identical to its current shipped behavior.

Architecture follows ADR-0001 (`docs/adr/0001-shared-word-transformation-core.md`). Use domain vocabulary from `CONTEXT.md`.

## Acceptance criteria

- [ ] A word transformation core module exists with a narrow event interface (letter press, variant select, advance/tick) and exposes observable in-round state (current word, mode, operation index, letter models, variant picker state, transitioning flag)
- [ ] `useWordTransformationGame` is refactored into a thin adapter over the core; table-specific state (highlighted cell, revealed cells, koi escape dispatch) stays in the adapter
- [ ] Unit tests cover core behavior: delete mode advances on letter press; insert mode advances on variant select; wrong variant gives feedback without breaking the round; completing all operations fires completion with the correct sequence; sequential insert paths work
- [ ] Table transformation exercise is behavior-identical after refactor: highlighted target cell, koi escape on solve, revealed cells, shuffled round order with each form once per session, bubble/variant picker placement, instruction text, sounds
- [ ] No `context: 'table' | 'sentence'` mode flag in a single growing hook; no forked duplicate hook for the sentence exercise

## Blocked by

None — can start immediately.
