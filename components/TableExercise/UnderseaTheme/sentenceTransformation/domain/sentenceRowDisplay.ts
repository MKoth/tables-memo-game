import type { SentencePromptDisplaySlot } from './types';

export function findBlankSlotIndex(slots: SentencePromptDisplaySlot[]): number {
  return slots.findIndex((slot) => slot.kind === 'blank');
}

export function displaySlotsWithSolvedWord(
  slots: SentencePromptDisplaySlot[],
  blankIndex: number,
  solvedWord: string,
): SentencePromptDisplaySlot[] {
  return slots.map((slot, index) =>
    index === blankIndex && slot.kind === 'blank'
      ? { kind: 'token', text: solvedWord }
      : slot,
  );
}
