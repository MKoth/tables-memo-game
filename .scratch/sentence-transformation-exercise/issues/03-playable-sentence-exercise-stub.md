Status: ready-for-agent
Blocked by: 01, 02

## Parent

`.scratch/sentence-transformation-exercise/PRD.md`

## What to build

Ship a runnable **sentence transformation exercise** in the dev app. The exercise shows a **sentence row** of jellyfish in the jelly zone (one per token, blank slot as a primary-highlighted `?` jellyfish) with line wrapping and vertical centering for long sentences. Below, the transformation zone reuses existing bubble components fed by the shared word transformation core. **Decorative koi** swim across the full screen — non-interactive, no word labels, no capture or escape wiring.

Wire a sentence exercise shell that owns round-specific state only (not transformation rules). On solve, use a minimal round advance stub (e.g. immediate transition to the next round or a simple fade) — full merge/fly/hold/pop resolution animations are out of scope for this slice. Show a completion message when all rounds finish. Extend the dev app exercise switch to include the sentence transformation exercise alongside table and table transformation exercises.

Tapping non-blank sentence jellyfish plays a click sound only (no translations in v1). Sounds for pop, inflate, success, and error match the undersea theme. Use domain vocabulary from `CONTEXT.md`.

## Acceptance criteria

- [ ] A dedicated **sentence row** jellyfish layer renders sentence prompts with wrapping, vertical centering in the jelly zone, and primary highlight on the blank `?` slot only
- [ ] Transformation zone reuses existing bubble, variant picker, instruction bar, and insert flight components, fed by the shared word transformation core from issue 01
- [ ] Decorative koi render with full-screen swim bounds, no word labels, and no capture/escape interaction
- [ ] Learner can complete all 12 rounds: transform infinitive via letter delete/insert, wrong variants give clear feedback, rounds advance via stub (no merge/fly/hold/pop yet)
- [ ] Rounds are shuffled; every conjugated form appears exactly once per session
- [ ] Tapping non-blank sentence jellyfish plays click sound only; blank slot uses primary tint
- [ ] Completion message shown when all rounds are done
- [ ] Dev app exercise switch includes the sentence transformation exercise as a selectable option
- [ ] No conjugation table grid visible in this exercise

## Blocked by

- `issues/01-extract-shared-word-transformation-core.md`
- `issues/02-sentence-prompts-and-factory.md`
