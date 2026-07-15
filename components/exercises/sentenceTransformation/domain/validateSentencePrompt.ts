import type { SentencePrompt } from '../../../../data/tableData';

export function assertValidBlankIndex(prompt: SentencePrompt): void {
  if (
    !Number.isInteger(prompt.blankIndex) ||
    prompt.blankIndex < 0 ||
    prompt.blankIndex > prompt.tokens.length
  ) {
    throw new Error(
      `Invalid blankIndex ${prompt.blankIndex} for sentence prompt with ${prompt.tokens.length} tokens`,
    );
  }
}
