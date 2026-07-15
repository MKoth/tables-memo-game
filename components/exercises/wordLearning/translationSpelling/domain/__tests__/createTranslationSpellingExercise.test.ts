import { animalsWordList, foodWordList } from '../../../../../../data/wordsData';
import { createTranslationSpellingExercise } from '../createTranslationSpellingExercise';

describe('createTranslationSpellingExercise', () => {
  it('creates one round per word in the list', () => {
    const exercise = createTranslationSpellingExercise(animalsWordList);
    expect(exercise.rounds).toHaveLength(animalsWordList.words.length);
  });

  it('stores the word list reference', () => {
    const exercise = createTranslationSpellingExercise(animalsWordList);
    expect(exercise.wordList).toBe(animalsWordList);
  });

  it('each round stores the English prompt and Spanish answer', () => {
    const exercise = createTranslationSpellingExercise(animalsWordList);
    exercise.rounds.forEach((round, index) => {
      expect(round.english).toBe(animalsWordList.words[index]!.english);
      expect(round.spanish).toBe(animalsWordList.words[index]!.spanish);
    });
  });

  it('each round has a letter pool containing all Spanish word letters', () => {
    const exercise = createTranslationSpellingExercise(animalsWordList);
    exercise.rounds.forEach((round, index) => {
      const spanishWord = animalsWordList.words[index]!.spanish;
      const spanishLetters = spanishWord.split('');
      spanishLetters.forEach(letter => {
        const poolCount = round.letterPool.filter(l => l === letter).length;
        const wordCount = spanishLetters.filter(l => l === letter).length;
        expect(poolCount).toBeGreaterThanOrEqual(wordCount);
      });
    });
  });

  it('each round has 2-3 distractor letters not in the Spanish word', () => {
    const exercise = createTranslationSpellingExercise(animalsWordList);
    exercise.rounds.forEach((round, index) => {
      const spanishWord = animalsWordList.words[index]!.spanish;
      const targetLetters = new Set(spanishWord.split(''));
      const distractors = round.letterPool.filter(l => !targetLetters.has(l));
      expect(distractors.length).toBeGreaterThanOrEqual(2);
      expect(distractors.length).toBeLessThanOrEqual(3);
    });
  });

  it('uses injectable shuffleIndices for deterministic round order', () => {
    const exercise = createTranslationSpellingExercise(animalsWordList, {
      shuffleIndices: () => [5, 3, 0, 4, 1, 2],
    });
    expect(exercise.roundOrder).toEqual([5, 3, 0, 4, 1, 2]);
  });

  it('round order covers every round exactly once', () => {
    const exercise = createTranslationSpellingExercise(animalsWordList, {
      shuffleIndices: count => Array.from({ length: count }, (_, i) => i),
    });
    expect(exercise.roundOrder).toHaveLength(animalsWordList.words.length);
    expect(new Set(exercise.roundOrder).size).toBe(animalsWordList.words.length);
  });

  it('works with different word lists', () => {
    const exercise = createTranslationSpellingExercise(foodWordList);
    expect(exercise.rounds).toHaveLength(foodWordList.words.length);
    expect(exercise.wordList).toBe(foodWordList);
  });
});
