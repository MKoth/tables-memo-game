Status: ready-for-agent
Type: task

## Parent

The PRD at `.scratch/variant-selection-exercise/PRD.md`.

## What to build

Complete the round lifecycle on top of the infrastructure from issue 01:

- **Resolve**: on correct selection, the chosen option jellyfish flies from its option-zone position to the blank slot position (translation-only, constant size, ~800ms flight)
- **Blank exit**: the blank `?` jellyfish exits concurrently with the resolve flight along its remembered entrance path
- **Wrong option exit**: the two distractor option jellyfish exit immediately on correct selection along their remembered entrance paths
- **Hold**: ~3 second pause after the correct option has landed, showing the complete sentence with the correct jellyfish in the blank slot
- **Translation on tap**: during hold, tapping the landed correct jellyfish shows a translation overlay for ~1 second (same behavior as the existing sentence transformation exercise)
- **Exit**: all remaining jellyfish (sentence tokens + correct option in blank slot) exit together along their remembered paths
- **Advance**: brief delay (~400ms), then the next round enters with new sentence prompt and 3 new option jellyfish
- **Session complete**: after the last round exits, "All words transformed!" message appears

`VariantSelectionRoundController` is extended to the full lifecycle: `enter → transform → resolve → hold → exit → advance`.

Reuse `ROUND_RESOLVE_FLY_DURATION_MS`, `ROUND_HOLD_DURATION_MS`, `ROUND_ADVANCE_DELAY_MS` timing constants from the sentence transformation exercise.

## Acceptance criteria

- [ ] Correct option flies from option zone position to blank slot (~800ms)
- [ ] Blank `?` jellyfish starts exiting when resolve begins and is gone before the correct option lands
- [ ] Wrong options exit immediately on correct selection
- [ ] ~3 second hold with correct jellyfish in blank slot showing complete sentence
- [ ] Tapping the landed jellyfish during hold shows translation for ~1s
- [ ] All jellyfish exit after hold
- [ ] Next round enters after advance delay
- [ ] Session complete message after final round
- [ ] Round controller unit tests for the full lifecycle (resolve → hold → exit → advance) matching the existing sentence round controller test pattern
- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit` pass

## Blocked by

- `.scratch/variant-selection-exercise/issues/01-round-enter-with-tap-interaction.md` — this slice builds on the domain, hook, and component structure from 01
