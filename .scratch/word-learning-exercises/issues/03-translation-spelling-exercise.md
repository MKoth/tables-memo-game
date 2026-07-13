# Translation spelling exercise

Status: ready-for-agent

## What to build

A complete, demoable translation spelling exercise — the learner sees an English word as letter bubbles in the koi zone and spells the Spanish translation letter-by-letter by tapping shuffled letter bubbles in the jelly zone.

End-to-end behavior: the learner opens the exercise, sees an English word inflate letter-by-letter in the koi zone (random stagger with inflate sounds), then the shuffled letter pool inflates below in the jelly zone (same cascade pattern). The Spanish word row appears directly below the English word in the koi zone, both centered vertically. The learner taps letters from left to right. Correct letters fly from the pool to the Spanish word row (reusing existing insert-flight animation). Wrong taps wiggle red and stay in the pool. Accented characters are distinct (á ≠ a). Any instance of a repeated letter is accepted (not index-based). When the word is complete, remaining distractor letters pop in cascade, then the English word pops in cascade, then the Spanish word pops in cascade — fully sequential with ~200ms pause between groups. The next round begins after a brief gap. All words in the list are shuffled and presented in one session.

This is a full vertical slice covering:

- **Domain**: `createTranslationSpellingExercise(wordList)` factory with injectable `shuffleIndices` for testing. Letter pool generation pure function (shuffled target word letters + 2–3 distractor letters from Spanish alphabet minus target letters). Letter matching pure function (left-to-right ordering, any-instance match for repeated letters, exact accent-sensitive character comparison). `translationSpellingRoundController` with 5-phase lifecycle (enter, transform, resolve, exit, advance) and injectable `scheduleTimer`.
- **Hook**: `useTranslationSpellingGame` — bridges the exercise factory and round controller to React, manages English letter bubble state, Spanish word construction row, shuffled letter pool state, letter flight animations, and phase transitions. Uses existing layout system for zone rects.
- **Components**: English letter bubbles in koi zone (reuse letter cascade), Spanish word construction row below English (centered in koi zone), shuffled letter pool in jelly zone (staggered inflate), letter flight from pool to Spanish row (reuse insert-flight animation), sequential resolve cascade (distractors pop → English pops → Spanish pops).
- **Top-level**: `UnderseaThemeWordLearningTranslationSpellingExercise` component wrapping content in `UnderseaThemeExerciseShell` with `WORD_LEARNING_STORE_CONFIG`, following the same provider composition pattern as existing exercises.
- **Tests**: Domain tests for factory (round count, letter pool contents), letter pool generation (all target letters present, 2–3 distractors, distractors not in target), letter matching (left-to-right ordering, any-instance repeated letters, accent sensitivity), round controller (full 5-phase lifecycle with injected timers).
- **Wiring**: Add new `ACTIVE_EXERCISE` value in `App.tsx` for this exercise.

## Acceptance criteria

- [ ] Exercise is demoable end-to-end in the app via `ACTIVE_EXERCISE` switch
- [ ] English word inflates as letter bubbles in koi zone with staggered timing and inflate sounds
- [ ] Shuffled letter pool inflates in jelly zone after English word (same cascade pattern)
- [ ] Spanish word construction row appears below English word in koi zone, both centered
- [ ] Tapping correct letter (matching next expected position left-to-right) flies from pool to Spanish row
- [ ] Any instance of a repeated letter is accepted (e.g., either 'a' in pool works when 'a' is expected)
- [ ] Accented characters are distinct — tapping 'a' when 'á' is expected is wrong
- [ ] Wrong letter tap wiggles red and stays in the pool
- [ ] Letter flight reuses existing insert-flight animation
- [ ] On word completion: remaining distractor letters pop in cascade first
- [ ] Then English word pops in cascade (~200ms pause after distractors finish)
- [ ] Then Spanish word pops in cascade (~200ms pause after English finishes)
- [ ] Next round begins after brief advance gap
- [ ] All words in the list are presented in shuffled order in one session
- [ ] Session ends when all words are done (matches existing exercise completion behavior)
- [ ] Exercise works in both portrait and landscape orientations
- [ ] Decorative koi swim in the background during the exercise
- [ ] Sound toggle works (waterflow, inflate, pop, success, wrong sounds)
- [ ] Factory tests pass (round count, letter pool contents)
- [ ] Letter pool generation tests pass (target letters, distractor count, distractor exclusion)
- [ ] Letter matching tests pass (left-to-right, any-instance, accent-sensitive)
- [ ] Round controller tests pass (full 5-phase lifecycle)
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes

## Blocked by

- 01-word-learning-data-foundation
