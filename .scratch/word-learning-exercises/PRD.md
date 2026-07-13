# Word Learning Exercises

Status: ready-for-agent

## Problem Statement

The app currently offers only conjugation-focused exercises (table transformation, sentence transformation, variant selection) that teach verb forms through transformation mechanics. Learners have no way to practice individual vocabulary words — recognizing translations or spelling Spanish words from memory. This gap means the app serves grammar practice but not vocabulary acquisition, which are complementary skills in language learning.

## Solution

Add two new word-learning exercises that use the existing undersea theme and animation primitives but operate on a new data model (word lists instead of conjugation tables):

1. **Translation choice** — recognize the correct Spanish translation from three jellyfish options
2. **Translation spelling** — spell the Spanish translation letter-by-letter from a shuffled pool

Both exercises present English as the prompt and Spanish as the answer, reuse existing layout zones (koi zone for prompt, jelly zone for interaction), and follow the same session model as conjugation exercises (shuffled rounds, session ends when all words are done).

## User Stories

1. As a Spanish learner, I want to practice recognizing Spanish translations of English words, so that I can build my vocabulary through recognition tasks
2. As a Spanish learner, I want to practice spelling Spanish words from memory, so that I can build my vocabulary through recall tasks
3. As a Spanish learner, I want to see English words displayed as letter bubbles like in other exercises, so that the visual language remains consistent
4. As a Spanish learner, I want to select translations from jellyfish options like in variant selection, so that I can use familiar interaction patterns
5. As a Spanish learner, I want to spell words by tapping letter bubbles like in word transformation, so that I can use familiar interaction patterns
6. As a Spanish learner, I want to see my English prompt word at the top of the screen, so that I can focus on the translation task
7. As a Spanish learner, I want to see translation options or letter pools at the bottom of the screen, so that the interaction area is clearly separated from the prompt
8. As a Spanish learner, I want the screen split vertically in portrait orientation, so that I can see prompt and interaction areas simultaneously
9. As a Spanish learner, I want the screen split horizontally in landscape orientation, so that I can see prompt and interaction areas simultaneously
10. As a Spanish learner, I want decorative koi fish swimming in the background during word exercises, so that the undersea theme remains consistent
11. As a Spanish learner, I want to see three jellyfish options in translation choice, so that I have a reasonable number of choices to evaluate
12. As a Spanish learner, I want the correct translation to be one of three jellyfish, so that I can test my recognition skills
13. As a Spanish learner, I want the two incorrect jellyfish to show other words from the same word list, so that distractors are plausible and from my current study set
14. As a Spanish learner, I want jellyfish to swim in from screen edges like in other exercises, so that the entrance animation is consistent
15. As a Spanish learner, I want jellyfish to exit along their remembered swim-in paths, so that the exit animation is consistent
16. As a Spanish learner, I want to tap a jellyfish to select my translation choice, so that I can submit my answer
17. As a Spanish learner, I want incorrect jellyfish taps to flash red and wait for another tap, so that I can try again without penalty
18. As a Spanish learner, I want the English word to pop and the Spanish word to inflate in the same position when I answer correctly, so that I see a clean word swap
19. As a Spanish learner, I want all jellyfish to exit simultaneously after I answer correctly, so that the screen clears for the next word
20. As a Spanish learner, I want a brief pause after the Spanish word appears, so that I can read and memorize the correct translation
21. As a Spanish learner, I want the Spanish word to pop in a cascade after the pause, so that the round ends with a clear visual cue
22. As a Spanish learner, I want to see shuffled letter bubbles in the jelly zone for translation spelling, so that I can construct the Spanish word
23. As a Spanish learner, I want the letter pool to contain all letters from the Spanish word, so that I can spell it completely
24. As a Spanish learner, I want the letter pool to contain 2-3 extra distractor letters not in the word, so that I must think carefully about each letter choice
25. As a Spanish learner, I want to tap letters from left to right to spell the word, so that I practice the correct letter order
26. As a Spanish learner, I want any instance of a repeated letter to count as correct, so that I'm not penalized for tapping the wrong copy of a duplicate letter
27. As a Spanish learner, I want accented characters (á, é, í, ó, ú, ñ, ü) to be treated as distinct from unaccented versions, so that I learn that accents matter in Spanish
28. As a Spanish learner, I want incorrect letter taps to wiggle red and stay in the pool, so that I can try again
29. As a Spanish learner, I want correct letters to fly from the pool to the Spanish word row, so that I see the word being constructed
30. As a Spanish learner, I want the Spanish word to appear below the English word in the koi zone, so that I can see both prompt and construction simultaneously
31. As a Spanish learner, I want both English and Spanish words centered vertically in the koi zone, so that the layout is balanced
32. As a Spanish learner, I want letter bubbles to inflate with staggered timing and sounds, so that the entrance animation is engaging
33. As a Spanish learner, I want the English word to inflate first, then the letter pool, so that my attention flows from prompt to interaction area
34. As a Spanish learner, I want remaining distractor letters to pop first when I complete the word, so that only the correct letters remain visible
35. As a Spanish learner, I want the English word to pop second, so that the prompt disappears after I've solved it
36. As a Spanish learner, I want the Spanish word to pop third, so that the answer is the last thing I see
37. As a Spanish learner, I want each pop group to finish before the next starts, so that the resolve sequence is clear and readable
38. As a Spanish learner, I want all words in a word list to appear in one session, so that I practice the complete set
39. As a Spanish learner, I want words to appear in random order each session, so that I can't memorize the sequence
40. As a Spanish learner, I want the session to end when all words are done, so that I know I've completed the practice
41. As a Spanish learner, I want to manually restart or exit after a session, so that I control when to practice again
42. As a Spanish learner, I want word lists to contain at least 3 entries, so that translation choice can generate 3 distinct options
43. As a Spanish learner, I want to study word lists organized by topic or theme, so that I can focus on related vocabulary
44. As a Spanish learner, I want word exercises to use the same sound effects as other exercises, so that the audio feedback is consistent
45. As a Spanish learner, I want to toggle sound on/off during word exercises, so that I can practice quietly
46. As a Spanish learner, I want word exercises to work in both portrait and landscape orientations, so that I can practice in any device position
47. As a Spanish learner, I want the layout to adapt automatically when I rotate my device, so that I don't need to restart the exercise
48. As a Spanish learner, I want word exercises to feel like part of the same app as conjugation exercises, so that the learning experience is cohesive

## Implementation Decisions

### Data Model

**WordEntry**: A single Spanish–English translation pair with fields `spanish: string` and `english: string`. This is the atomic unit of vocabulary data, analogous to a body cell in conjugation tables.

**WordList**: A named collection of word entries with fields `id: string`, `title: string`, and `words: WordEntry[]`. This serves as the dataset for word-learning exercises, analogous to `TableData` for conjugation exercises. Word lists must contain at least 3 entries to support translation choice distractor generation.

**Translation direction**: Exercises present English as the prompt and Spanish as the answer only. The `WordEntry` model supports both directions but exercises are English → Spanish only.

**Data location**: Word list data lives in `data/wordsData.ts`, parallel to `data/tableData.ts`. Sample data should include multiple word lists covering different vocabulary themes (e.g., animals, food, common verbs, household items).

### Exercise Architecture

**Directory structure**: New `wordLearning/` parent directory under `UnderseaTheme/` containing two subdirectories:
- `wordLearning/translationChoice/` with `components/`, `domain/`, and `hooks/`
- `wordLearning/translationSpelling/` with `components/`, `domain/`, and `hooks/`

This mirrors how `wordTransformation/`, `sentenceTransformation/`, and `variantSelection/` are conjugation-family directories. The parent makes the vocabulary-family boundary explicit and provides a place for shared word-learning code if the two exercises grow shared logic.

**Exercise factories**: Two independent factory functions with no shared base:
- `createTranslationChoiceExercise(wordList)` — produces rounds with 3 shuffled options (1 correct + 2 distractors from same list)
- `createTranslationSpellingExercise(wordList)` — produces rounds with shuffled letter pool (Spanish word letters + 2–3 distractor letters)

Each factory lives in its own `domain/` directory. Factories accept optional `shuffleIndices` parameter for deterministic testing, following the pattern of existing exercise factories.

**Round controllers**: Each exercise has its own round controller as a plain-object finite state machine with injectable `scheduleTimer` dependency, following the pattern of `variantSelectionRoundController` and `sentenceRoundController`.

### Translation Choice Exercise

**Round phases** (6-phase lifecycle):
1. `enter` — English letter bubbles inflate in koi zone (random stagger with sounds), option jellyfish swim in to jelly zone
2. `transform` — user taps a jellyfish; wrong = red flash, wait for another tap
3. `resolve` — English bubbles pop, Spanish word inflates in same koi-zone position (clean swap), all jellyfish exit simultaneously along remembered swim-in paths
4. `hold` — ~3 second reading pause for the Spanish word
5. `exit` — Spanish letter bubbles pop in cascade
6. `advance` — brief gap before next round

**Distractor generation**: Two incorrect Spanish words drawn from other entries in the same word list, excluding the target entry. The word list must contain at least 3 entries for a valid round.

**Visual layout**: English word as letter bubbles in koi zone (top in portrait, left in landscape). Three option jellyfish in jelly zone (bottom in portrait, right in landscape). On correct selection, English pops and Spanish inflates in the same position — no flight animation needed.

### Translation Spelling Exercise

**Round phases** (5-phase lifecycle):
1. `enter` — English word inflates in koi zone, shuffled letter bubbles appear in jelly zone (staggered inflate, same cascade logic as English word)
2. `transform` — user taps letters left-to-right; wrong = red wiggle; correct letters fly from pool to Spanish word row using existing insert-flight animation
3. `resolve` — remaining distractor letters pop (cascade), then English word pops (cascade), then Spanish word pops (cascade), fully sequential with ~200ms pause between groups
4. `exit` — screen clears
5. `advance` — next round

**Letter pool generation**: Shuffled array containing all letters from the Spanish word plus 2–3 distractor letters not present in the target word. Distractor letters are selected algorithmically from the Spanish alphabet minus the target word's letters.

**Letter matching**: Left-to-right ordering required. Tapping any instance of a repeated letter counts as correct (not index-based, letter-to-letter comparison). Accented characters (á, é, í, ó, ú, ñ, ü) are treated as distinct from unaccented versions — exact character match only.

**Visual layout**: English word as letter bubbles in koi zone. Spanish word being constructed appears directly below English word in the same zone, both centered vertically. Shuffled letter pool in jelly zone below. Correct letters fly from pool to Spanish word row (short upward flight).

### Shared Infrastructure

**Layout system**: Reuse existing `useUnderseaThemeLayout()` as-is. Koi zone shows English prompt (and Spanish construction row for spelling). Jelly zone holds interactive elements (jellyfish or letter pool). No new layout provider needed.

**Store configuration**: New `WORD_LEARNING_STORE_CONFIG` for zustand store, separate from conjugation exercise configs. Word-learning exercises have no conjugation table or sentence row, so their tutorial flow and initial state differ.

**Animation reuse**: 
- Letter cascade enter/exit from `letterCascade.ts`
- Insert-flight animation for letter-to-word-row flight in spelling
- Jellyfish swim paths and entrance/exit from existing swim path planner
- Decorative koi layer from `DecorativeKoiLayer`

**Session flow**: All entries in a word list are shuffled at exercise creation time and presented as rounds in one session. Session ends when all words are done. No automatic restart, no summary screen — matches existing exercise completion behavior.

**Orientation handling**: Existing layout system handles orientation automatically. Portrait: koi zone top, jelly zone bottom. Landscape: koi zone left, jelly zone right. Two rows (English + Spanish) in koi zone reflow within whatever rect dimensions the layout provides.

### Top-Level Exercise Components

Two new top-level components following the pattern of existing exercises:
- `UnderseaThemeWordLearningTranslationChoiceExercise` — wraps content in `UnderseaThemeExerciseShell` with `WORD_LEARNING_STORE_CONFIG`
- `UnderseaThemeWordLearningTranslationSpellingExercise` — wraps content in `UnderseaThemeExerciseShell` with `WORD_LEARNING_STORE_CONFIG`

Each component follows the same provider composition pattern: `UnderseaThemeExerciseShell` → `UnderseaThemeRuntimeProvider` → `UnderseaThemeClockProvider` → exercise-specific content.

## Testing Decisions

### Testing Philosophy

Tests should verify external behavior, not implementation details. Domain logic (factories, round controllers, pure functions) is tested directly. React components are not tested — they are thin shells over domain logic. All tests use injectable dependencies (shuffling, timers) for determinism.

### Test Seams

**Exercise factories** (`createTranslationChoiceExercise`, `createTranslationSpellingExercise`):
- Pure functions with injectable `shuffleIndices` parameter
- Test round count matches word list size
- Test round order coverage (all words appear exactly once)
- Test distractor sourcing (same list, excluding target)
- Test option correctness (1 correct, 2 distractors for choice; all letters + distractors for spelling)
- Prior art: `variantSelectionDomain.test.ts`, `sentenceTransformationDomain.test.ts`

**Round controllers** (`translationChoiceRoundController`, `translationSpellingRoundController`):
- State machines with injectable `scheduleTimer` dependency
- Test full phase lifecycle transitions (enter → transform → resolve → hold → exit → advance)
- Test timer firing advances phases correctly
- Test callbacks fire at correct phase boundaries
- Prior art: `variantSelectionRoundController.test.ts`, `sentenceRoundController.test.ts`

**Distractor selection** (`selectTranslationDistractors`):
- Pure function taking word list and target index
- Test returns 2 distractors from same list
- Test excludes target entry
- Test throws or validates when list has < 3 entries
- Prior art: `selectDistractors.test.ts`

**Letter pool generation** (for spelling):
- Pure function taking Spanish word
- Test returns shuffled array containing all target word characters
- Test includes 2–3 distractor letters not in target word
- Test distractor letters are from Spanish alphabet
- Prior art: `generateOperations.test.ts` (pure function testing pattern)

**Letter matching** (for spelling):
- Pure function taking tapped letter, expected position, and target word
- Test left-to-right ordering enforcement
- Test any-instance matching for repeated letters (e.g., "casa" accepts either 'a' when 'a' is expected)
- Test accent-sensitive comparison ('a' ≠ 'á')
- Prior art: `wordTransformationCore.test.ts` (interaction logic testing)

### Test Data

Tests use sample word lists from `data/wordsData.ts` as fixtures, following the pattern of using `spanishPresentTable2Plural` from `data/tableData.ts` in existing tests.

## Out of Scope

- **Reverse translation direction** (Spanish → English) — exercises are English → Spanish only
- **Bidirectional translation mode** — not implemented
- **Session chunking** — all words in one session, no pagination or continuation
- **Completion summary screen** — session ends without stats or recap
- **Auto-restart** — learner manually restarts or exits
- **Progress tracking** — no persistence of completed words or accuracy
- **Spaced repetition** — no algorithm for prioritizing difficult words
- **Word categories or difficulty levels** — word lists are flat collections
- **Audio pronunciation** — no spoken word playback
- **Hints or partial reveals** — no assistance during exercises
- **Multi-word phrases** — exercises operate on single words only
- **Typing with keyboard** — spelling uses letter bubble taps only
- **Timer or speed challenges** — no time pressure mechanics

## Further Notes

**Minimum word list size**: Word lists must contain at least 3 entries to support translation choice distractor generation. Consider validating this at exercise creation time and throwing a clear error for undersized lists.

**Distractor letter selection**: For translation spelling, distractor letters should be selected from the Spanish alphabet (a-z, á, é, í, ó, ú, ñ, ü) excluding letters in the target word. Consider avoiding visually similar letters (e.g., 'l' vs '1', 'o' vs '0') to prevent confusion, though this is a refinement that can be added later.

**Accent character rendering**: Ensure letter bubbles render accented characters correctly at the same size as unaccented characters. Test with words like "canción", "niño", "vergüenza" to verify visual consistency.

**Performance with large word lists**: Word lists with 50+ entries will create 50+ rounds per session. Monitor performance and consider chunking if sessions become too long, though this is out of scope for initial implementation.

**Shared word-learning code**: If the two exercises grow shared logic (e.g., common hooks, utilities), consider extracting to `wordLearning/shared/` directory. Initial implementation keeps them independent to avoid premature abstraction.

**Exercise switching**: The `ACTIVE_EXERCISE` switch in `App.tsx` will need new values for the two word-learning exercises. Consider a more scalable exercise selection mechanism if the exercise count continues to grow.
