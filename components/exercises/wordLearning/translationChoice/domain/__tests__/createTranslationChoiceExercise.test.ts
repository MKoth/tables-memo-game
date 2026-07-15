import { animalsWordList, foodWordList } from '../../../../../../data/wordsData';
import { createTranslationChoiceExercise } from '../createTranslationChoiceExercise';

describe('createTranslationChoiceExercise', () => {
  it('creates one round per word in the list', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    expect(exercise.rounds).toHaveLength(animalsWordList.words.length);
  });

  it('stores the word list reference', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    expect(exercise.wordList).toBe(animalsWordList);
  });

  it('each round has exactly 3 options', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    exercise.rounds.forEach(round => {
      expect(round.options).toHaveLength(3);
    });
  });

  it('each round has exactly one correct option', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    exercise.rounds.forEach(round => {
      const correctOptions = round.options.filter(opt => opt.isCorrect);
      expect(correctOptions).toHaveLength(1);
    });
  });

  it('correct option matches the target word Spanish translation', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    exercise.rounds.forEach((round, index) => {
      const correctOption = round.options.find(opt => opt.isCorrect);
      expect(correctOption).toBeDefined();
      expect(correctOption!.form).toBe(animalsWordList.words[index]!.spanish);
    });
  });

  it('distractors are from the same word list', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    const spanishWords = animalsWordList.words.map(w => w.spanish);
    exercise.rounds.forEach(round => {
      round.options.forEach(opt => {
        expect(spanishWords).toContain(opt.form);
      });
    });
  });

  it('distractors exclude the target word', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    exercise.rounds.forEach((round, index) => {
      const targetSpanish = animalsWordList.words[index]!.spanish;
      const distractors = round.options.filter(opt => !opt.isCorrect);
      distractors.forEach(opt => {
        expect(opt.form).not.toBe(targetSpanish);
      });
    });
  });

  it('each round stores the English prompt and Spanish answer', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList);
    exercise.rounds.forEach((round, index) => {
      expect(round.english).toBe(animalsWordList.words[index]!.english);
      expect(round.spanish).toBe(animalsWordList.words[index]!.spanish);
    });
  });

  it('uses injectable shuffleIndices for deterministic round order', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList, {
      shuffleIndices: () => [5, 3, 0, 4, 1, 2],
    });
    expect(exercise.roundOrder).toEqual([5, 3, 0, 4, 1, 2]);
  });

  it('round order covers every round exactly once', () => {
    const exercise = createTranslationChoiceExercise(animalsWordList, {
      shuffleIndices: count => Array.from({ length: count }, (_, i) => i),
    });
    expect(exercise.roundOrder).toHaveLength(animalsWordList.words.length);
    expect(new Set(exercise.roundOrder).size).toBe(animalsWordList.words.length);
  });

  it('works with different word lists', () => {
    const exercise = createTranslationChoiceExercise(foodWordList);
    expect(exercise.rounds).toHaveLength(foodWordList.words.length);
    expect(exercise.wordList).toBe(foodWordList);
  });
});
