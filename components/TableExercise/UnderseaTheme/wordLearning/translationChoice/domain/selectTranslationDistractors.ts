import type { WordList } from '../../../../../../data/wordsData';

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

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled.slice(0, 2);
}
