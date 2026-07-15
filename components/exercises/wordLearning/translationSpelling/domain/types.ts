import type { WordList } from '../../../../../data/wordsData';

export type TranslationSpellingRound = {
  english: string;
  spanish: string;
  letterPool: string[];
};

export type TranslationSpellingExercise = {
  wordList: WordList;
  rounds: TranslationSpellingRound[];
  roundOrder: number[];
};

export type CreateTranslationSpellingExerciseOptions = {
  shuffleIndices?: (count: number) => number[];
};
