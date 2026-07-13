import type { WordList } from '../../../../../../data/wordsData';
import { shuffleIndices as defaultShuffleIndices } from '../../../sentenceTransformation/domain/shuffleIndices';
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

    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

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
