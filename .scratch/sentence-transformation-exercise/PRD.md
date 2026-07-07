Status: ready-for-agent

# Sentence Transformation Exercise

## Problem Statement

Learners practicing Spanish verb conjugation in the table transformation exercise transform infinitives into conjugated forms while staring at a full conjugation table. That builds form recognition but not contextual use — they never see *where* a conjugated form belongs in real language.

The learner needs a second exercise variant that keeps the same word transformation mechanic (letter-level delete and insert on bubbles) but replaces the conjugation table with a **sentence prompt**: a short sentence with one **blank slot** where the conjugated form belongs. Solving a round should feel like completing a sentence, not filling a grid cell.

## Solution

Add a **sentence transformation exercise** alongside the existing **table transformation exercise**. Both share a deep **word transformation** core. The sentence variant shows a **sentence row** of jellyfish (one per token, blank slot as a primary-highlighted `?` jellyfish) in the jelly zone, letter bubbles for the infinitive in the transformation zone below, and **decorative koi** swimming across the full screen.

When the learner completes the transformation, a **round resolution** sequence runs: letter bubbles merge into one word bubble, the merged bubble flies to the blank slot while the `?` jellyfish exits simultaneously, the complete sentence holds for ~3 seconds, the solved word jellyfish pops, the row exits offscreen, and the next **round** begins with a mirror fly-in entrance and a new infinitive inflating as bubbles.

v1 targets **`spanishPresentTable2Plural`** with all 12 body cells authored with Spanish **sentence prompts** stored in table data.

## User Stories

1. As a language learner, I want to see a short Spanish sentence with a missing verb, so that I understand the conjugated form in context rather than in isolation.

2. As a language learner, I want the missing verb shown as a highlighted `?` jellyfish, so that I know exactly which word I am producing.

3. As a language learner, I want to transform the infinitive using the same letter bubble operations I already know, so that I do not have to learn a new interaction model.

4. As a language learner, I want to pop letter bubbles to delete and choose variants to insert, so that I can apply the same delete/insert strategy as the table transformation exercise.

5. As a language learner, I want wrong variant choices to give clear feedback, so that I can self-correct without breaking the round.

6. As a language learner, I want my letter bubbles to merge into one word when I finish the transformation, so that the result feels like a single completed verb.

7. As a language learner, I want the completed verb to fly into the sentence, so that I see the word settle into its place in context.

8. As a language learner, I want the `?` jellyfish to leave as my word arrives, so that the swap feels continuous rather than staged.

9. As a language learner, I want a brief pause to read the full sentence after it completes, so that I can register the meaning before moving on.

10. As a language learner, I want the solved verb jellyfish to pop as a success signal, so that completion feels rewarding.

11. As a language learner, I want the sentence row to leave the screen after the pop, so that the transition to the next prompt is clear.

12. As a language learner, I want the next sentence to swim in from the same direction the previous one left, so that round transitions feel consistent.

13. As a language learner, I want the first sentence of a session to use the same fly-in entrance, so that the exercise does not have a special-case opening.

14. As a language learner, I want a new infinitive to inflate as letter bubbles after each sentence arrives, so that I always know what word I am transforming next.

15. As a language learner, I want rounds presented in shuffled order, so that I practice all forms without memorizing sequence.

16. As a language learner, I want every conjugated form in the table to appear exactly once per session, so that coverage matches the table transformation exercise.

17. As a language learner, I want long sentences to wrap onto a second line within the jelly zone, so that readability is preserved on smaller screens.

18. As a language learner, I want wrapped sentences centered vertically in the jelly zone, so that the layout stays balanced.

19. As a language learner, I want decorative koi swimming across the full screen, so that the scene feels alive without distracting from the task.

20. As a language learner, I want koi to be non-interactive in this exercise, so that I do not accidentally trigger capture mechanics meant for other exercises.

21. As a language learner, I want instruction text during delete and insert phases, so that I know what action is expected.

22. As a language learner, I want a completion message when all rounds are done, so that I know the session ended.

23. As a content author, I want sentence prompts stored alongside table data, so that sentences stay tied to the correct conjugated form.

24. As a content author, I want to author sparse tokens with an explicit blank index, so that I do not duplicate placeholder strings in the token list.

25. As a content author, I want validation that every body cell has a sentence prompt when a table is used for this exercise, so that no form is silently skipped.

26. As a content author, I want to write natural Spanish sentences for each form in `spanishPresentTable2Plural`, so that v1 is fully playable on day one.

27. As a developer, I want a shared word transformation core extracted from the existing hook, so that table and sentence exercises do not duplicate transformation logic.

28. As a developer, I want the table transformation exercise to remain behavior-identical after the extraction, so that refactoring does not regress the shipped exercise.

29. As a developer, I want the sentence exercise shell to own only round-specific state (entrance, resolution, exit), so that animation concerns stay separated from transformation rules.

30. As a developer, I want a dedicated sentence row jellyfish layer separate from the conjugation table layer, so that layout and lifecycle differ without forking table grid logic.

31. As a developer, I want decorative koi to use full-screen swim bounds in this variant, so that fish roam the entire scene as designed.

32. As a developer, I want koi spawned without word association in this variant, so that fish are purely decorative.

33. As a developer, I want the dev app switch to include the sentence transformation exercise, so that I can run it locally alongside existing exercises.

34. As a developer, I want domain vocabulary from `CONTEXT.md` used consistently in module and type naming, so that the codebase stays navigable.

35. As a language learner, I want tapping non-blank sentence jellyfish to play a click sound only, so that interaction is lightweight and does not expose translations I did not ask for in v1.

36. As a language learner, I want the blank slot jellyfish highlighted with the primary tint, so that it matches the visual language of the target cell in the table transformation exercise.

37. As a language learner, I want bubble and variant picker placement to match the table transformation exercise, so that muscle memory for where to look carries over.

38. As a language learner, I want sounds for pop, inflate, success, and error consistent with the undersea theme, so that audio feedback feels cohesive.

39. As a developer, I want sentence prompt data to derive base infinitive and target conjugated form from existing table columns and body cells, so that prompts cannot drift out of sync with conjugation answers.

40. As a developer, I want the sentence exercise factory to produce the same word operation sequences as the table exercise for the same cell, so that transformation difficulty is identical between exercises.

## Implementation Decisions

### Primary seam (testing)

**One seam:** the extracted **word transformation core** — a module that owns in-round transformation state (active sequence, current word, operation index, mode, letter bubble models, insert animation phase, transitioning flag) and exposes a narrow event interface (letter press, variant select, tick/advance callbacks). Both exercise hooks are thin adapters; tests drive events into the core and assert observable state without mounting React Native views.

This is the highest existing seam we can deepen per ADR-0001. Sentence-specific round phases (entrance, merge-and-fly resolution, hold, pop, exit) live in a separate **round orchestrator** tested through its own phase transitions if not folded into hook integration tests.

Confirm this seam matches expectations before implementation proceeds.

### Architecture (ADR-0001)

Extract a deep shared word transformation core from the existing monolithic hook. Do **not** fork the hook per exercise and do **not** add a `context` mode flag to a single growing hook. Table transformation keeps koi escape on solve; sentence transformation plugs round resolution on solve.

### Table data schema

Extend table data with parallel **sentence prompts** per body cell. Each prompt uses sparse tokens and an explicit blank position:

```typescript
type SentencePrompt = {
  tokens: string[];   // display words; blank slot omitted
  blankIndex: number; // 0..tokens.length inclusive
};
```

- `bodySentencePrompts[row][col]` parallels `body[row][col]`.
- `blankIndex` of `n` means the blank sits after all `n` tokens (e.g. `tokens: ['Nosotros', 'huevos']`, `blankIndex: 1` → "Nosotros ___ huevos").
- Base **infinitive** = column header at `col`. Target **conjugated form** = body cell at `[row][col]`. Operations generated the same way as the table transformation exercise.
- Tables used for this exercise must have a prompt for **every** body cell; missing prompts are a build-time or factory-time error.

### Sentence exercise domain

- Factory builds a **sentence transformation exercise** from table + prompts: ordered rounds (one per body cell), each carrying its sentence prompt, infinitive, conjugated form, and word operation sequence.
- Round order: shuffled indices, same coverage model as table transformation.
- Display expansion: sparse tokens → ordered slots including a blank marker for rendering (`?` jellyfish at `blankIndex`).

### UI layers

- **Sentence row layer** in jelly zone: horizontal layout with line wrapping; multi-line block vertically centered in zone; primary highlight on blank slot only.
- **Transformation zone** unchanged: letter bubbles, variant picker, instruction bar, insert flight — reuse existing components fed by the shared core.
- **Decorative koi layer**: full-screen swim bounds; non-interactive; fish without word labels; no capture or escape wiring.
- **No** conjugation table grid in this exercise.

### Round lifecycle state machine

Phases for the sentence shell (orthogonal to transformation core in-round play):

1. **Enter** — sentence row jellyfish fly in from offscreen (including session start).
2. **Transform** — shared core active; bubbles interactive.
3. **Merge** — letter bubbles unite into one word bubble ("meatloaf" effect).
4. **Resolve** — merged bubble flies to blank slot; `?` jellyfish exits simultaneously; bubble becomes a word jellyfish in the row.
5. **Hold** — ~3000 ms with complete sentence visible.
6. **Pop** — solved word jellyfish pops (success sound).
7. **Exit** — entire row flies offscreen.
8. **Advance** — next round → Enter; infinitive letter bubbles inflate.

### Round resolution timing

- Hold duration: ~3 seconds (configurable constant).
- Swap timing: simultaneous (`?` exit begins as merged bubble begins moving).

### v1 content scope

- Table: `spanishPresentTable2Plural` only (12 body cells).
- Author all 12 Spanish sentence prompts in table data as part of this effort.

### Table transformation regression

Refactoring to extract the shared core must preserve existing table transformation exercise behavior (highlighted cell, koi escape dispatch, revealed cells, shuffle order, animations).

### Dev entry point

Extend the app dev exercise switch to include sentence transformation alongside table and table transformation exercises.

## Testing Decisions

**What makes a good test:** assert externally observable behavior through module interfaces — state after events, factory outputs, validation errors — not implementation details like internal timer refs or Reanimated worklet internals. Animation timing can use injected clock/schedulers where the core exposes them.

**Modules to test:**

1. **Word transformation core** (priority) — letter press advances delete mode; variant select advances insert mode; completing all operations fires completion callback with correct sequence; sequential insert paths; wrong variant handling; shuffle order produces each sequence once.
2. **Sentence prompt validation and display expansion** — sparse tokens + blankIndex render slots; invalid blankIndex rejected; missing prompt for any body cell throws.
3. **Sentence transformation exercise factory** — 12 rounds for v1 table; each round links prompt to correct infinitive/conjugated form/operations; operation sequences match table transformation factory for same cell.
4. **Round orchestrator** (if extracted) — phase transitions on completion signal: merge → resolve → hold → pop → exit → enter next; hold duration respected with fake timers.

**Prior art:** Jest is configured (`npm test`); only `__tests__/App.test.tsx` exists today (smoke render). Domain pure functions in word transformation (`generateWordOperations`, `createWordTransformationExercise`) are the best precedent for new unit tests — no RN mount required. Follow that style for core and factory tests.

**Explicitly not required in v1 tests:** pixel-level animation assertions, Skia canvas snapshots, koi simulation physics, gesture handler integration tests.

## Out of Scope

- English translations or glosses on sentence jellyfish tap (v1: click sound only).
- Sentence prompts for tables other than `spanishPresentTable2Plural`.
- Sentence transformation tutorial / instruction walkthrough (table transformation tutorial placeholder pattern may remain unused here).
- Author-defined round order (only shuffled in v1).
- Tap-to-dismiss during round hold (fixed ~3 s timeout only).
- Koi capture, word-labelled fish, or koi escape in this exercise.
- Conjugation table grid visibility during sentence exercise.
- Localisation infrastructure beyond Spanish sentence content.
- Production navigation / exercise picker UI (dev switch is sufficient for v1).

## Further Notes

- Domain glossary: `CONTEXT.md`. Architecture: `docs/adr/0001-shared-word-transformation-core.md`.
- "Meatloaf" is the informal name for the letter-bubble merge into a single word bubble before fly-to-slot; not a domain term.
- Long sentences should prefer single line when width allows; wrapping is automatic based on jelly zone width.
- Z-order guidance: decorative koi behind sentence row and bubble layers; bubbles remain above koi for readability (mirror table transformation z-index intent).
- Content quality for the 12 authored sentences is human judgment — prompts should be grammatical Spanish and use the correct pronoun context for each row header, but need not literally repeat the pronoun token if natural usage differs (author discretion within validation that blank accepts the body cell form).
