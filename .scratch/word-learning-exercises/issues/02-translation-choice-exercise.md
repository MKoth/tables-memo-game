# Translation choice exercise

Status: ready-for-agent

## What to build

A complete, demoable translation choice exercise — the learner sees an English word as letter bubbles in the koi zone and selects the correct Spanish translation from three option jellyfish in the jelly zone.

End-to-end behavior: the learner opens the exercise, sees an English word inflate letter-by-letter in the koi zone (random stagger with inflate sounds), while three jellyfish swim in from screen edges carrying Spanish word options (one correct, two distractors from the same word list). The learner taps a jellyfish. Wrong tap flashes red and waits. Correct tap pops the English word, inflates the Spanish word in the same position (clean swap), and all jellyfish exit along their remembered swim-in paths. After a ~3 second hold, the Spanish word pops in a cascade, and the next round begins. All words in the list are shuffled and presented in one session. Session ends when all words are done.

This is a full vertical slice covering:

- **Domain**: `createTranslationChoiceExercise(wordList)` factory with injectable `shuffleIndices` for testing. `selectTranslationDistractors(wordList, targetIndex)` pure function. `translationChoiceRoundController` with 6-phase lifecycle (enter, transform, resolve, hold, exit, advance) and injectable `scheduleTimer`.
- **Hook**: `useTranslationChoiceGame` — bridges the exercise factory and round controller to React, manages letter bubble state, jellyfish swim paths, option state, and phase transitions. Uses existing layout system (`useUnderseaThemeLayout`) for zone rects.
- **Components**: English letter bubbles in koi zone (reuse letter cascade from `letterCascade.ts`), option jellyfish in jelly zone (reuse swim path planner and jellyfish entrance/exit patterns), resolve swap (English pops, Spanish inflates in same position).
- **Top-level**: `UnderseaThemeWordLearningTranslationChoiceExercise` component wrapping content in `UnderseaThemeExerciseShell` with `WORD_LEARNING_STORE_CONFIG`, following the same provider composition pattern as existing exercises.
- **Tests**: Domain tests for factory (round count, distractor sourcing, option correctness, injectable shuffle), round controller (full phase lifecycle with injected timers), and distractor selection (same-list sourcing, target exclusion, minimum list size validation).
- **Wiring**: Add new `ACTIVE_EXERCISE` value in `App.tsx` for this exercise.

## Acceptance criteria

- [ ] Exercise is demoable end-to-end in the app via `ACTIVE_EXERCISE` switch
- [ ] English word inflates as letter bubbles in koi zone with staggered timing and inflate sounds
- [ ] Three option jellyfish swim in from screen edges to jelly zone
- [ ] Correct option is the Spanish translation; two distractors are from the same word list
- [ ] Wrong jellyfish tap flashes red and waits for another tap
- [ ] Correct tap pops English word and inflates Spanish word in the same koi-zone position
- [ ] All jellyfish exit simultaneously along remembered swim-in paths after correct selection
- [ ] ~3 second hold pause after Spanish word appears
- [ ] Spanish word pops in cascade after hold
- [ ] Next round begins after brief advance gap
- [ ] All words in the list are presented in shuffled order in one session
- [ ] Session ends when all words are done (matches existing exercise completion behavior)
- [ ] Exercise works in both portrait and landscape orientations
- [ ] Decorative koi swim in the background during the exercise
- [ ] Sound toggle works (waterflow, inflate, pop, success, wrong sounds)
- [ ] Factory tests pass (round count, distractor sourcing, option correctness)
- [ ] Round controller tests pass (full 6-phase lifecycle)
- [ ] Distractor selection tests pass (same-list sourcing, target exclusion, min size)
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes

## Blocked by

- 01-word-learning-data-foundation
