# Word learning data foundation

Status: ready-for-agent

## What to build

The shared data model and infrastructure that both word-learning exercises depend on. This is the prerequisite slice — no exercise code yet, just the foundation.

End-to-end behavior: after this slice, the app has a `WordList` data type with sample data, a dedicated zustand store config for word-learning exercises, and the `wordLearning/` directory structure is in place with empty subdirectories for the two exercises.

Specifically:

- `WordEntry` type with `spanish` and `english` string fields
- `WordList` type with `id`, `title`, and `words: WordEntry[]` fields
- Sample word lists in `data/wordsData.ts` — multiple themed lists (e.g., animals, food, common verbs, household items), each with at least 3 entries, including words with accented characters (á, é, í, ó, ú, ñ, ü)
- `WORD_LEARNING_STORE_CONFIG` — a new zustand store configuration for word-learning exercises, separate from `TABLE_EXERCISE_STORE_CONFIG` and `WORD_TRANSFORMATION_STORE_CONFIG`. Exported from the core store module. Tutorial can be minimal or disabled initially.
- `wordLearning/` directory under `UnderseaTheme/` with `translationChoice/` and `translationSpelling/` subdirectories, each containing `components/`, `domain/`, and `hooks/` directories

## Acceptance criteria

- [ ] `WordEntry` and `WordList` types are defined and exported from `data/wordsData.ts`
- [ ] At least 4 sample word lists exist, each with 3+ entries, covering different vocabulary themes
- [ ] Sample data includes Spanish words with accented characters (á, é, í, ó, ú, ñ, ü)
- [ ] `WORD_LEARNING_STORE_CONFIG` is defined and exported from the core store module
- [ ] `wordLearning/translationChoice/` and `wordLearning/translationSpelling/` directories exist with `components/`, `domain/`, and `hooks/` subdirectories
- [ ] Types are importable by downstream exercise code
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes

## Blocked by

None - can start immediately
