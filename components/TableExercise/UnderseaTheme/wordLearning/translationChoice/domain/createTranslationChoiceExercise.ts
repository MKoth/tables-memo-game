import type { WordList } from '../../../../../../data/wordsData';
import { shuffleIndices as defaultShuffleIndices } from '../../../sentenceTransformation/domain/shuffleIndices';
import { shuffleArray } from '../../shared/shuffleArray';
import { selectTranslationDistractors } from './selectTranslationDistractors';
import type {
  CreateTranslationChoiceExerciseOptions,
  TranslationChoiceExercise,
  TranslationChoiceRound,
} from './types';

export function buildTranslationChoiceRounds(
  wordList: WordList,
): TranslationChoiceRound[] {
  return wordList.words.map((word, index) => {
    const distractors = selectTranslationDistractors(wordList, index);

    const options = [
      { form: word.spanish, isCorrect: true },
      ...distractors.map(form => ({ form, isCorrect: false })),
    ];

    const shuffled = shuffleArray(options);

    return {
      english: word.english,
      spanish: word.spanish,
      options: shuffled,
    };
  });
}

export function createTranslationChoiceExercise(
  wordList: WordList,
  options: CreateTranslationChoiceExerciseOptions = {},
): TranslationChoiceExercise {
  const rounds = buildTranslationChoiceRounds(wordList);
  const roundOrder = (options.shuffleIndices ?? defaultShuffleIndices)(rounds.length);

  return { wordList, rounds, roundOrder };
}
