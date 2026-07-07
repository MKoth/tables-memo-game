import type { SentencePrompt } from '../../../../../data/tableData';
import type { SentencePromptDisplaySlot } from './types';
import { assertValidBlankIndex } from './validateSentencePrompt';

export function expandSentencePromptSlots(
  prompt: SentencePrompt,
): SentencePromptDisplaySlot[] {
  assertValidBlankIndex(prompt);

  const slots: SentencePromptDisplaySlot[] = [];
  for (let index = 0; index <= prompt.tokens.length; index++) {
    if (index === prompt.blankIndex) {
      slots.push({ kind: 'blank' });
    }
    if (index < prompt.tokens.length) {
      slots.push({ kind: 'token', text: prompt.tokens[index]! });
    }
  }
  return slots;
}
