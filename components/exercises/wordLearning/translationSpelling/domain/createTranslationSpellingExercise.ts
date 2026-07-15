import type { WordList } from '../../../../../data/wordsData';
import { shuffleIndices as defaultShuffleIndices } from '../../../sentenceTransformation/domain/shuffleIndices';
import { generateLetterPool } from './generateLetterPool';
import type {
  CreateTranslationSpellingExerciseOptions,
  TranslationSpellingExercise,
  TranslationSpellingRound,
} from './types';

export function buildTranslationSpellingRounds(
  wordList: WordList,
): TranslationSpellingRound[] {
  return wordList.words.map(word => ({
    english: word.english,
    spanish: word.spanish,
    letterPool: generateLetterPool(word.spanish),
  }));
}

export function createTranslationSpellingExercise(
  wordList: WordList,
  options: CreateTranslationSpellingExerciseOptions = {},
): TranslationSpellingExercise {
  const rounds = buildTranslationSpellingRounds(wordList);
  const roundOrder = (options.shuffleIndices ?? defaultShuffleIndices)(rounds.length);

  return { wordList, rounds, roundOrder };
}
