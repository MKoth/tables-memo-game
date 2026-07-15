import type { WordList } from '../../../../../data/wordsData';
import { shuffleArray } from '../../../core/shared/shuffleArray';

export function selectTranslationDistractors(
  wordList: WordList,
  targetIndex: number,
): string[] {
  if (wordList.words.length < 3) {
    throw new Error(
      `selectTranslationDistractors: word list "${wordList.id}" has ${wordList.words.length} entries but requires at least 3`,
    );
  }

  const candidates: string[] = [];
  for (let i = 0; i < wordList.words.length; i++) {
    if (i !== targetIndex) {
      candidates.push(wordList.words[i]!.spanish);
    }
  }

  return shuffleArray(candidates).slice(0, 2);
}
