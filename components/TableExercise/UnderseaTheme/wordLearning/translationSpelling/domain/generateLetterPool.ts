import { shuffleArray } from '../../shared/shuffleArray';

const SPANISH_ALPHABET = 'abcdefghijklmnñopqrstuvwxyzáéíóúü';
const DISTRACTOR_COUNT = 3;

export function generateLetterPool(spanishWord: string): string[] {
  const targetLetters = spanishWord.split('');
  const targetLetterSet = new Set(targetLetters);

  const available: string[] = [];
  for (const char of SPANISH_ALPHABET) {
    if (!targetLetterSet.has(char)) {
      available.push(char);
    }
  }

  const distractors = shuffleArray(available).slice(0, DISTRACTOR_COUNT);
  return shuffleArray([...targetLetters, ...distractors]);
}
