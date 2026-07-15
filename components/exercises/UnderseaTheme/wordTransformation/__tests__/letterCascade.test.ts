import {
  buildCascadeRevealOrder,
  computeCascadeCompleteDelayMs,
  mapLettersWithCascade,
} from '../letterCascade';
import {
  BUBBLE_BURST_DURATION_MS,
  WORD_LETTER_ENTER_DURATION_MS,
  WORD_LETTER_ENTER_STAGGER_MS,
  WORD_LETTER_EXIT_STAGGER_MS,
} from '../insertAnimationTiming';

const identityShuffle = (count: number) => Array.from({ length: count }, (_, index) => index);

describe('buildCascadeRevealOrder', () => {
  it('returns an empty order for zero-length words', () => {
    expect(buildCascadeRevealOrder(0, identityShuffle)).toEqual([]);
  });

  it('returns shuffled indices for the word length', () => {
    expect(buildCascadeRevealOrder(4, identityShuffle)).toEqual([0, 1, 2, 3]);
  });

  it('delegates shuffling to the injected shuffle function', () => {
    const shuffleIndices = jest.fn(identityShuffle);

    buildCascadeRevealOrder(3, shuffleIndices);

    expect(shuffleIndices).toHaveBeenCalledWith(3);
  });
});

describe('mapLettersWithCascade', () => {
  it('maps enter cascade delays from reveal order', () => {
    const letters = mapLettersWithCascade({
      word: 'abc',
      keyPrefix: 'round-1',
      phase: 'enter',
      order: [2, 0, 1],
    });

    expect(letters).toEqual([
      {
        key: 'round-1:0',
        char: 'a',
        position: 0,
        popped: false,
        wrong: false,
        enterDelayMs: WORD_LETTER_ENTER_STAGGER_MS,
      },
      {
        key: 'round-1:1',
        char: 'b',
        position: 1,
        popped: false,
        wrong: false,
        enterDelayMs: 2 * WORD_LETTER_ENTER_STAGGER_MS,
      },
      {
        key: 'round-1:2',
        char: 'c',
        position: 2,
        popped: false,
        wrong: false,
        enterDelayMs: 0,
      },
    ]);
  });

  it('maps exit cascade delays and marks letters popped', () => {
    const letters = mapLettersWithCascade({
      word: 'go',
      keyPrefix: 3,
      phase: 'exit',
      order: [1, 0],
    });

    expect(letters).toEqual([
      {
        key: '3:0',
        char: 'g',
        position: 0,
        popped: true,
        wrong: false,
        popDelayMs: WORD_LETTER_EXIT_STAGGER_MS,
      },
      {
        key: '3:1',
        char: 'o',
        position: 1,
        popped: true,
        wrong: false,
        popDelayMs: 0,
      },
    ]);
  });

  it('merges letter state from the core snapshot during enter', () => {
    const letters = mapLettersWithCascade({
      word: 'ab',
      keyPrefix: 'seq',
      phase: 'enter',
      order: [0, 1],
      getLetterState: (position) =>
        position === 1 ? { popped: true, wrong: true, skipEnter: true } : undefined,
    });

    expect(letters[1]).toMatchObject({
      popped: true,
      wrong: true,
      skipEnter: true,
    });
  });
});

describe('computeCascadeCompleteDelayMs', () => {
  it('returns zero when there are no letters to cascade', () => {
    expect(computeCascadeCompleteDelayMs(0, 'enter')).toBe(0);
    expect(computeCascadeCompleteDelayMs(0, 'exit')).toBe(0);
  });

  it('computes enter and exit completion delays from stagger constants', () => {
    expect(computeCascadeCompleteDelayMs(3, 'enter')).toBe(
      2 * WORD_LETTER_ENTER_STAGGER_MS + WORD_LETTER_ENTER_DURATION_MS,
    );
    expect(computeCascadeCompleteDelayMs(3, 'exit')).toBe(
      2 * WORD_LETTER_EXIT_STAGGER_MS + BUBBLE_BURST_DURATION_MS,
    );
  });
});
