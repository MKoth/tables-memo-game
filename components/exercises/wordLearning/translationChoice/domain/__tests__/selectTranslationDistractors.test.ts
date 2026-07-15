import { animalsWordList, type WordList, createWordList } from '../../../../../../data/wordsData';
import { selectTranslationDistractors } from '../selectTranslationDistractors';

describe('selectTranslationDistractors', () => {
  it('returns exactly 2 distractors', () => {
    const distractors = selectTranslationDistractors(animalsWordList, 0);
    expect(distractors).toHaveLength(2);
  });

  it('returns Spanish words from the same word list', () => {
    const distractors = selectTranslationDistractors(animalsWordList, 0);
    const spanishWords = animalsWordList.words.map(w => w.spanish);
    distractors.forEach(word => {
      expect(spanishWords).toContain(word);
    });
  });

  it('excludes the target entry', () => {
    const targetIndex = 2;
    const targetSpanish = animalsWordList.words[targetIndex]!.spanish;
    const distractors = selectTranslationDistractors(animalsWordList, targetIndex);
    expect(distractors).not.toContain(targetSpanish);
  });

  it('returns distinct distractors', () => {
    const distractors = selectTranslationDistractors(animalsWordList, 0);
    expect(new Set(distractors).size).toBe(2);
  });

  it('works for different target indices', () => {
    for (let i = 0; i < animalsWordList.words.length; i++) {
      const distractors = selectTranslationDistractors(animalsWordList, i);
      expect(distractors).toHaveLength(2);
      expect(distractors).not.toContain(animalsWordList.words[i]!.spanish);
    }
  });

  it('throws when word list has fewer than 3 entries', () => {
    const smallList: WordList = {
      id: 'small',
      title: 'Small',
      words: [
        { spanish: 'gato', english: 'cat' },
        { spanish: 'perro', english: 'dog' },
      ],
    };
    expect(() => selectTranslationDistractors(smallList, 0)).toThrow();
  });

  it('works with a minimal 3-entry word list', () => {
    const minimalList = createWordList('minimal', 'Minimal', [
      { spanish: 'uno', english: 'one' },
      { spanish: 'dos', english: 'two' },
      { spanish: 'tres', english: 'three' },
    ]);
    const distractors = selectTranslationDistractors(minimalList, 0);
    expect(distractors).toHaveLength(2);
    expect(distractors).not.toContain('uno');
    expect(distractors).toContain('dos');
    expect(distractors).toContain('tres');
  });
});
