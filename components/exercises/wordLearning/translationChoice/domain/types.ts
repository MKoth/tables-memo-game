import type { WordList } from '../../../../../data/wordsData';

export type TranslationChoiceOption = {
  form: string;
  isCorrect: boolean;
};

export type TranslationChoiceRound = {
  english: string;
  spanish: string;
  options: TranslationChoiceOption[];
};

export type TranslationChoiceExercise = {
  wordList: WordList;
  rounds: TranslationChoiceRound[];
  roundOrder: number[];
};

export type CreateTranslationChoiceExerciseOptions = {
  shuffleIndices?: (count: number) => number[];
};
