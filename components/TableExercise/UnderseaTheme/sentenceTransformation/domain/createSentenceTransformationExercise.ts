import type { TableData } from '../../../../../data/tableData';
import {
  createWordTransformationExercise,
  type WordTransformationExercise,
} from '../../wordTransformation/domain';
import { expandSentencePromptSlots } from './expandSentencePromptSlots';
import { shuffleIndices } from './shuffleIndices';
import type {
  CreateSentenceTransformationExerciseOptions,
  SentenceTransformationExercise,
  SentenceTransformationRound,
} from './types';
import { validateSentencePromptsForTable } from './validateSentencePromptsForTable';

export function buildSentenceTransformationRounds(
  table: TableData,
  tableExercise: WordTransformationExercise,
): SentenceTransformationRound[] {
  const prompts = table.bodySentencePrompts!;

  return tableExercise.sequences.map(sequence => {
    const sentencePrompt = prompts[sequence.rowIndex]![sequence.colIndex]!;
    return {
      rowIndex: sequence.rowIndex,
      colIndex: sequence.colIndex,
      sentencePrompt,
      displaySlots: expandSentencePromptSlots(sentencePrompt),
      infinitive: sequence.baseWord,
      conjugatedForm: sequence.targetWord,
      operations: sequence.operations,
    };
  });
}

export function createSentenceTransformationExercise(
  table: TableData,
  options: CreateSentenceTransformationExerciseOptions = {},
): SentenceTransformationExercise {
  validateSentencePromptsForTable(table);

  const tableExercise = createWordTransformationExercise(table);
  const rounds = buildSentenceTransformationRounds(table, tableExercise);
  const roundOrder = (options.shuffleIndices ?? shuffleIndices)(rounds.length);

  return { table, rounds, roundOrder };
}
