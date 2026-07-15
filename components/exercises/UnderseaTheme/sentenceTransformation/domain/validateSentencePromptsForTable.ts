import type { TableData } from '../../../../../data/tableData';
import { assertValidBlankIndex } from './validateSentencePrompt';

export function validateSentencePromptsForTable(table: TableData): void {
  const prompts = table.bodySentencePrompts;
  if (prompts == null) {
    throw new Error(
      `Table "${table.id}" is missing bodySentencePrompts required for the sentence transformation exercise`,
    );
  }

  if (prompts.length !== table.body.length) {
    throw new Error(
      `Table "${table.id}" bodySentencePrompts dimensions do not match body: expected ${table.body.length} rows, got ${prompts.length}`,
    );
  }

  for (let rowIndex = 0; rowIndex < table.body.length; rowIndex++) {
    const promptRow = prompts[rowIndex];
    const bodyRow = table.body[rowIndex]!;
    if (promptRow.length !== bodyRow.length) {
      throw new Error(
        `Table "${table.id}" bodySentencePrompts dimensions do not match body at row ${rowIndex}: expected ${bodyRow.length} columns, got ${promptRow.length}`,
      );
    }

    for (let colIndex = 0; colIndex < bodyRow.length; colIndex++) {
      const prompt = promptRow[colIndex];
      if (prompt == null) {
        throw new Error(
          `Table "${table.id}" is missing a sentence prompt at body cell [${rowIndex}][${colIndex}]`,
        );
      }
      assertValidBlankIndex(prompt);
    }
  }
}
