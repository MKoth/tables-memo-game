Status: ready-for-agent
Type: task

## Parent

The PRD at `.scratch/variant-selection-exercise/PRD.md`.

## What to build

A complete end-to-end vertical slice of the variant selection exercise including:
- Dev switch in `App.tsx` to activate the exercise
- Entry point (`TableVariantSelectionExercise.tsx`) and main component wired to the existing exercise shell, reusing core providers and layout
- Domain types for variant selection rounds
- `selectDistractors` that picks 2 random conjugated forms from the same infinitive column (different pronoun rows) to serve as wrong options alongside the correct one
- `createVariantSelectionExercise` that builds all rounds from a table (one round per body cell, rounds shuffled)
- `VariantSelectionRoundController` with the simplified lifecycle: `enter → transform`
- Game hook that drives round enter: sentence row swims in (reusing `JellyfishSentenceRowLayer`), 3 option jellyfish positioned in the variant picker zone swim in
- Option jellyfish are tappable: correct tap → green tint flash + success sound, wrong tap → red tint flash + error sound, round stays on wrong tap
- Instruction bar shows "Select the correct form" during the transform phase

Reuse existing `planSwimPaths` for all swim paths (sentence tokens, blank slot, and option jellyfish positions together). Reuse `JellyfishInstance` / `CellJellyfish` tint flash mechanism and `JELLYFISH_TINT_PRESETS.success` / `.error` for visual feedback.

`VariantSelectionRoundController` only implements the `enter → transform` transition in this slice; `resolve`, `hold`, `exit`, `advance` are added in the next slice. The round controller should guard against duplicate events identically to the existing `SentenceRoundController`.

## Acceptance criteria

- [ ] Dev switch toggles to the variant selection exercise and the app compiles
- [ ] A round appears with sentence row + 3 option jellyfish swimming in from offscreen
- [ ] Tapping the correct option jellyfish triggers green tint flash + success sound
- [ ] Tapping a wrong option triggers red tint flash + error sound and the round stays on screen
- [ ] Distractors are from the same infinitive column, different pronoun rows, randomly selected
- [ ] All domain logic has unit tests matching existing patterns
- [ ] Round controller guards against duplicate notification calls
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit` pass

## Blocked by

None - can start immediately.
