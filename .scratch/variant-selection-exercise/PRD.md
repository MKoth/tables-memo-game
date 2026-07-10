Status: ready-for-agent

# Variant Selection Exercise

## Problem Statement

The app has three exercises: table transformation (conjugation table jellyfish + word transformation), word transformation (letter bubbles only), and sentence transformation (sentence prompt + word transformation). All three use the same letter-manipulation core — the learner deletes and inserts letters to build the conjugated form.

There is no exercise that tests recognition of conjugated forms without requiring the learner to spell them out. Learners need a lower-friction mode where they select the correct form from a set of options, allowing them to practice recognition before production.

## Solution

A fourth exercise — the **variant selection exercise** — that presents a sentence prompt with a blank slot and three option jellyfish below it. Each option jellyfish carries a full conjugated form (e.g., *hablamos*, *habláis*, *hablo*). The learner taps the one that correctly fills the blank. No letter manipulation required.

On correct selection, the chosen option jellyfish flies to the blank slot position; the blank `?` jellyfish exits concurrently; the two distractors exit immediately along their remembered swim-in paths. The complete sentence displays for a hold period, then all jellyfish exit and the next round begins.

## User Stories

1. As a learner, I want to see a sentence with a blank, so that I understand the context for the missing conjugated form.
2. As a learner, I want to see three conjugated-form jellyfish as options, so that I can choose the one that fits the blank.
3. As a learner, I want the options to be all conjugated forms of the same infinitive (different pronouns), so that I practice distinguishing between pronoun forms.
4. As a learner, I want the blank slot to be marked with a `?` jellyfish at round enter, so I know where the answer goes.
5. As a learner, I want the correct option to fly to the blank slot when I tap it, so I see the completed sentence.
6. As a learner, I want the blank `?` jellyfish to exit at the same time the correct jellyfish flies in, so the slot is ready when the answer arrives.
7. As a learner, I want the two wrong options to exit immediately when I pick correctly, so only the correct answer is left.
8. As a learner, I want a green tint flash and wobble on the jellyfish when I tap correctly, so I get positive visual feedback.
9. As a learner, I want a red tint flash and wobble on the jellyfish when I tap incorrectly, so I get clear negative feedback.
10. As a learner, I want a success sound on correct tap and a wrong sound on incorrect tap, so the audio matches the visual feedback.
11. As a learner, I want the wrong-tapped jellyfish to remain on screen after a wrong tap (the round does not advance), so I can try again.
12. As a learner, I want the correct jellyfish that has landed in the blank slot to be tappable for a translation, so I can understand the sentence meaning.
13. As a learner, I want to see a translation overlay for ~1 second when I tap a landed correct jellyfish, matching the current sentence transformation exercise behavior.
14. As a learner, I want all jellyfish (sentence tokens, correct option in blank slot) to exit together after the hold period, so the round completes cleanly.
15. As a learner, I want the option jellyfish to swim in from offscreen at the start of each round, matching the sentence token animation style.
16. As a learner, I want the distractors to be randomly selected from the same infinitive column, so I get varied practice across rounds.
17. As a learner, I want the round order to be shuffled, so I don't see the same sequence every session.
18. As a learner, I want to see a progress indicator (e.g., solved count / total count), matching the existing exercise pattern.
19. As a learner, I want an instruction bar to show context like "Select the correct form" during the selection phase.
20. As a learner, I want the exercise to work in both portrait and landscape orientations.
21. As a learner, I want the jellyfish tint colors to match the existing undersea theme (primary/error/success presets).

## Implementation Decisions

### Module structure

A new module `variantSelection/` parallel to `sentenceTransformation/` and `wordTransformation/`:

```
UnderseaTheme/
├── variantSelection/
│   ├── domain/
│   │   ├── types.ts                  # VariantSelectionRound, exercise types
│   │   ├── createVariantSelectionExercise.ts  # Round builder with distractor selection
│   │   ├── selectDistractors.ts      # Picks 2 random distractor rows
│   │   ├── variantSelectionRoundController.ts # Simplified round controller
│   │   ├── roundResolutionTiming.ts   # Timing constants (shared values where possible)
│   │   └── __tests__/
│   ├── hooks/
│   │   └── useVariantSelectionGame.ts # Main game hook
│   └── components/
│       ├── OptionJellyfishLayer/      # Renders 3 option jellyfish
│       └── VariantSelectionResolveFlight/  # Animates winning jellyfish to blank slot
├── UnderseaThemeTableVariantSelectionExercise.tsx  # Top-level component
```

### Entry point

- New file `components/TableExercise/TableVariantSelectionExercise.tsx` (mirrors `TableSentenceTransformationExercise.tsx`)
- New `ACTIVE_EXERCISE` value `'variantSelection'` in `App.tsx`

### Round lifecycle

Simplified lifecycle compared to sentence transformation. Phases: `enter → transform → resolve → hold → exit → advance`. No `merge`, `materialize`, or `pop` phases (jellyfish do not burst).

| Phase | What happens |
|---|---|
| `enter` | Sentence row and 3 option jellyfish swim in from offscreen |
| `transform` | Learner taps an option. Wrong tap → error flash + sound, round stays. Correct tap → success flash + sound |
| `resolve` | Correct option flies from its slot to the blank slot position. Blank `?` jellyfish exits concurrently. Two wrong options exit immediately |
| `hold` | Complete sentence visible with correct jellyfish in blank slot. ~3 seconds |
| `exit` | All jellyfish (sentence tokens, correct one in blank slot) exit along their remembered paths |
| `advance` | Brief delay, then next round `enter` |

### Distractor selection

`selectDistractors()` takes a table and a target cell `(rowIndex, colIndex)`. It collects all conjugated forms from the same column (same infinitive), excludes the target row, and picks 2 at random. This ensures:
- All 3 options are forms of the same infinitive
- The correct one is always present
- Distractors vary across rounds

### Reuse of existing code

- `planSwimPaths` — reused for all jellyfish (sentence tokens, blank slot, option jellyfish). Slot centers for option jellyfish are added to the same slot list so they get distributed across allowed edges.
- `JellyfishSentenceRowLayer` — reused for sentence row rendering. Extended or wrapped to also show the 3 option jellyfish.
- `JellyfishInstance` / `CellJellyfish` — used for option jellyfish, with the same tint flash/wobble mechanism.
- `JELLYFISH_TINT_PRESETS.success` / `.error` — used for correct/wrong tap feedback.
- `computeSentenceRowLayout` — reused for sentence row positions.
- Existing sound hooks (`playSuccessClick`, `playWrongClick`, etc.).

### Blank slot sizing

The blank slot's footprint is sized at round enter to match the correct answer's option jellyfish bell diameter. This ensures the correct jellyfish can fly in at full size without visual clipping.

### Resolve flight

The correct option jellyfish's `(x, y)` position is animated from its option-zone slot position to the blank slot position using a Reanimated `withTiming`. No scaling change — just translation. Duration matches `ROUND_RESOLVE_FLY_DURATION_MS` (800ms, reused from sentence transformation).

### Translation on tap

During the `hold` phase, the correct jellyfish in the blank slot is tappable. Tapping shows a translation overlay for ~1 second, matching the existing `TransformationRoundResolutionBubble` translation behavior.

### Swim paths for options

Option jellyfish swim in / out exactly like sentence token jellyfish. Their slot centers are added to the slot center list passed to `planSwimPaths`, so they get distributed across the same allowed edges. The two wrong options exit immediately on correct selection by reversing their enter path. The winning option does not exit via its own path — it first flies to the blank slot, then exits with the row during `exit` phase using the blank slot's exit path.

## Testing Decisions

### What makes a good test

Test external behavior, not implementation details. Pure domain logic (state transitions, data construction) is the highest-value target. Avoid testing animation details or component rendering.

### Seam 1: Round controller (highest seam)

Test the `VariantSelectionRoundController` state machine the same way as `sentenceRoundController.test.ts` — inject a mock `scheduleTimer`, assert phase transitions, guard against duplicate events, and verify the session-complete signal. The simplified lifecycle (`enter → transform → resolve → hold → exit → advance`) is the core of the exercise logic.

Prior art: `sentenceTransformation/domain/__tests__/sentenceRoundController.test.ts`

### Seam 2: Domain round builder

Test `createVariantSelectionExercise` and `selectDistractors`:
- Round count matches table dimensions
- Each round has exactly 3 options
- The correct form is always among the 3 options
- Distractors are from the same infinitive column, different pronoun rows
- Distractors are random (seeded test)
- Round order is shuffled

Prior art: `sentenceTransformation/domain/__tests__/sentenceTransformationDomain.test.ts`

### Seam 3: Option layout

Test that 3 option jellyfish positions are computed correctly in the variant picker zone. This could extend an existing layout test.

Prior art: `core/layout/__tests__/underseaExerciseLayout.test.ts`

## Out of Scope

- Sound asset creation (existing sounds are reused)
- New jellyfish shader work (existing tint presets and wobble configs are reused)
- New background or decorative elements
- Analytics or session tracking
- Different distractor strategies beyond "random from same infinitive" (e.g., most-confusable-first)
- Configuration of option count (always 3)
- Accessibility features beyond existing patterns
- Multi-blank sentences (always one blank slot per prompt)

## Further Notes

- No changes to the word transformation core — this exercise bypasses it entirely.
- The `wordTransformation/` module is not imported by the variant selection exercise.
- The `sentenceTransformation/domain/swimPathPlanner.ts` is shared, not copied.
- The existing `planSwimPaths` function distributes slots across allowed edges; adding 3 option jellyfish slots means 8+ total slots which distributes well without crossing trajectories.
- Orientation handling: `planSwimPaths` already gates allowed edges by orientation. No additional orientation logic needed.
