import {
  findBlankSlotIndex,
  displaySlotsWithSolvedWord,
} from '../sentenceRowDisplay';
import type { SentencePromptDisplaySlot } from '../types';

describe('findBlankSlotIndex', () => {
  it('returns 0 for a single blank slot', () => {
    const slots: SentencePromptDisplaySlot[] = [{ kind: 'blank' }];
    expect(findBlankSlotIndex(slots)).toBe(0);
  });

  it('returns the index of the first blank in mixed slots', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'Yo' },
      { kind: 'blank' },
      { kind: 'token', text: 'casa.' },
    ];
    expect(findBlankSlotIndex(slots)).toBe(1);
  });

  it('returns -1 when there is no blank slot', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'Todos' },
      { kind: 'token', text: 'bailan.' },
    ];
    expect(findBlankSlotIndex(slots)).toBe(-1);
  });

  it('returns the first blank when there are multiple blanks', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'blank' },
      { kind: 'token', text: 'y' },
      { kind: 'blank' },
    ];
    expect(findBlankSlotIndex(slots)).toBe(0);
  });

  it('returns -1 for an empty array', () => {
    expect(findBlankSlotIndex([])).toBe(-1);
  });
});

describe('displaySlotsWithSolvedWord', () => {
  it('replaces the blank slot with a token containing the solved word', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'Yo' },
      { kind: 'blank' },
      { kind: 'token', text: 'hoy.' },
    ];
    const result = displaySlotsWithSolvedWord(slots, 1, 'como');
    expect(result).toEqual([
      { kind: 'token', text: 'Yo' },
      { kind: 'token', text: 'como' },
      { kind: 'token', text: 'hoy.' },
    ]);
  });

  it('leaves non-blank slots unchanged', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'Ella' },
      { kind: 'blank' },
    ];
    const result = displaySlotsWithSolvedWord(slots, 1, 'habla');
    expect(result[0]).toEqual({ kind: 'token', text: 'Ella' });
  });

  it('returns a new array without mutating the original', () => {
    const slots: SentencePromptDisplaySlot[] = [{ kind: 'blank' }];
    const result = displaySlotsWithSolvedWord(slots, 0, 'test');
    expect(result).not.toBe(slots);
    expect(slots[0]).toEqual({ kind: 'blank' });
  });

  it('returns slots unchanged when blankIndex does not point to a blank', () => {
    const slots: SentencePromptDisplaySlot[] = [
      { kind: 'token', text: 'keep' },
    ];
    const result = displaySlotsWithSolvedWord(slots, 0, 'test');
    expect(result).toEqual(slots);
  });
});
