import {
  allWordLists,
  createWordList,
} from '../../../../../../../data/wordsData';
import type { WordList } from '../../../../../../../data/wordsData';
import { sampleMatchSession } from '../sampleMatchSession';

const ALL_LISTS: WordList[] = allWordLists;

describe('sampleMatchSession', () => {
  it('returns 8 distinct entries from the merged pool', () => {
    const session = sampleMatchSession(ALL_LISTS);
    expect(session).toHaveLength(8);
    const entries = session.map(e => `${e.spanish}:${e.english}`);
    expect(new Set(entries).size).toBe(8);
  });

  it('no two sampled entries share the same spanish', () => {
    const session = sampleMatchSession(ALL_LISTS);
    const spanish = session.map(e => e.spanish);
    expect(new Set(spanish).size).toBe(8);
  });

  it('no two sampled entries share the same english', () => {
    const session = sampleMatchSession(ALL_LISTS);
    const english = session.map(e => e.english);
    expect(new Set(english).size).toBe(8);
  });

  it('all sampled entries come from the merged pool', () => {
    const session = sampleMatchSession(ALL_LISTS);
    const poolSpanish = new Set(ALL_LISTS.flatMap(wl => wl.words.map(w => w.spanish)));
    const poolEnglish = new Set(ALL_LISTS.flatMap(wl => wl.words.map(w => w.english)));
    for (const entry of session) {
      expect(poolSpanish.has(entry.spanish)).toBe(true);
      expect(poolEnglish.has(entry.english)).toBe(true);
    }
  });

  it('is deterministic under injectable shuffleIndices', () => {
    const session = sampleMatchSession(ALL_LISTS, 8, {
      shuffleIndices: count => Array.from({ length: count }, (_, i) => i),
    });
    const session2 = sampleMatchSession(ALL_LISTS, 8, {
      shuffleIndices: count => Array.from({ length: count }, (_, i) => i),
    });
    expect(session).toEqual(session2);
  });

  it('uses first 8 when shuffleIndices returns identity permutation', () => {
    const session = sampleMatchSession(ALL_LISTS, 8, {
      shuffleIndices: count => Array.from({ length: count }, (_, i) => i),
    });
    const pool = ALL_LISTS.flatMap(wl => wl.words);
    expect(session).toEqual(pool.slice(0, 8));
  });

  it('respects custom sample size', () => {
    const session = sampleMatchSession(ALL_LISTS, 4);
    expect(session).toHaveLength(4);
  });

  it('throws when pool is too small', () => {
    const tinyList = createWordList('tiny', 'Tiny', [
      { spanish: 'a', english: 'a' },
      { spanish: 'b', english: 'b' },
      { spanish: 'c', english: 'c' },
    ]);
    expect(() => sampleMatchSession([tinyList], 4)).toThrow(
      'sampleMatchSession: pool has 3 entries but needs at least 4',
    );
  });

  it('resamples when guard rejects a colliding sample', () => {
    const collidingList = createWordList('test', 'Test', [
      { spanish: 'a', english: 'x' },
      { spanish: 'b', english: 'x' },
      { spanish: 'c', english: 'y' },
      { spanish: 'd', english: 'z' },
      { spanish: 'e', english: 'w' },
      { spanish: 'f', english: 'v' },
      { spanish: 'g', english: 'u' },
      { spanish: 'h', english: 't' },
      { spanish: 'i', english: 's' },
    ]);

    let callCount = 0;
    const session = sampleMatchSession([collidingList], 8, {
      shuffleIndices: (count: number) => {
        callCount++;
        if (callCount === 1) {
          return Array.from({ length: count }, (_, i) => i);
        }
        const indices = Array.from({ length: count }, (_, i) => i);
        [indices[1], indices[8]] = [indices[8]!, indices[1]!];
        return indices;
      },
    });

    expect(callCount).toBe(2);
    expect(session).toHaveLength(8);
    const english = session.map(e => e.english);
    expect(new Set(english).size).toBe(8);
  });
});
