import {
  animalsWordList,
  foodWordList,
  commonVerbsWordList,
  householdWordList,
  type WordList,
} from '../wordsData';

const ALL_WORD_LISTS: WordList[] = [
  animalsWordList,
  foodWordList,
  commonVerbsWordList,
  householdWordList,
];

describe('sample word lists', () => {
  it('has at least 4 word lists', () => {
    expect(ALL_WORD_LISTS.length).toBeGreaterThanOrEqual(4);
  });

  it.each(ALL_WORD_LISTS.map((list, i) => [i, list]))(
    'word list %s has at least 3 entries',
    (_index, list) => {
      expect((list as WordList).words.length).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(ALL_WORD_LISTS.map((list, i) => [i, list]))(
    'word list %s has unique id',
    (_index, list) => {
      expect((list as WordList).id).toBeTruthy();
      expect(typeof (list as WordList).id).toBe('string');
    },
  );

  it.each(ALL_WORD_LISTS.map((list, i) => [i, list]))(
    'word list %s has non-empty title',
    (_index, list) => {
      expect((list as WordList).title.length).toBeGreaterThan(0);
    },
  );

  it('covers different vocabulary themes', () => {
    const ids = new Set(ALL_WORD_LISTS.map((list) => list.id));
    expect(ids.size).toBe(ALL_WORD_LISTS.length);
  });

  it('includes words with accented characters', () => {
    const allWords = ALL_WORD_LISTS.flatMap((list) =>
      list.words.map((w) => w.spanish),
    );
    const accentedPattern = /[áéíóúñü]/;
    const hasAccented = allWords.some((word) => accentedPattern.test(word));
    expect(hasAccented).toBe(true);
  });

  it('every word entry has non-empty spanish and english', () => {
    for (const list of ALL_WORD_LISTS) {
      for (const entry of list.words) {
        expect(entry.spanish.length).toBeGreaterThan(0);
        expect(entry.english.length).toBeGreaterThan(0);
      }
    }
  });
});
