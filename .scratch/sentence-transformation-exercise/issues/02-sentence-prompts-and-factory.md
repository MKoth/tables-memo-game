Status: ready-for-agent
Blocked by: 01

## Parent

`.scratch/sentence-transformation-exercise/PRD.md`

## What to build

Extend table data with **sentence prompts** parallel to body cells. Each prompt uses sparse tokens and an explicit blank position (`tokens: string[]`, `blankIndex: number`). Author all 12 Spanish sentence prompts for `spanishPresentTable2Plural`. Base infinitive and target conjugated form derive from existing column headers and body cells — prompts must not drift out of sync with conjugation answers.

Add validation (every body cell must have a prompt when a table is used for the sentence transformation exercise; invalid `blankIndex` rejected) and display expansion (sparse tokens → ordered render slots including a blank marker). Build a **sentence transformation exercise factory** that produces shuffled rounds (one per body cell), each linking its sentence prompt, infinitive, conjugated form, and word operation sequence. Operation sequences must match the table transformation factory for the same cell.

Add unit tests for validation, display expansion, and factory output parity. Use domain vocabulary from `CONTEXT.md`.

## Acceptance criteria

- [ ] `SentencePrompt` type and `bodySentencePrompts[row][col]` field exist on table data, parallel to `body[row][col]`
- [ ] All 12 body cells in `spanishPresentTable2Plural` have authored, grammatical Spanish sentence prompts with correct pronoun context for each row
- [ ] Validation rejects invalid `blankIndex` and throws when any body cell is missing a sentence prompt for a table used by this exercise
- [ ] Display expansion converts sparse tokens + `blankIndex` into ordered slots including a blank marker for rendering
- [ ] Sentence transformation exercise factory produces 12 rounds with shuffled order; each round links the correct prompt, infinitive, conjugated form, and word operation sequence
- [ ] For every body cell, the factory's operation sequence matches the table transformation factory's sequence for that cell
- [ ] Unit tests cover validation errors, display expansion, round count, shuffle coverage (each form once), and operation parity

## Blocked by

- `issues/01-extract-shared-word-transformation-core.md`
