import type { TableData } from '../../../../../data/tableData';
import { expandSentencePromptSlots } from '../../sentenceTransformation/domain/expandSentencePromptSlots';
import { shuffleIndices } from '../../sentenceTransformation/domain/shuffleIndices';
import { createWordTransformationExercise } from '../../wordTransformation/domain';
import { selectDistractors } from './selectDistractors';
import type {
  CreateVariantSelectionExerciseOptions,
  VariantSelectionExercise,
  VariantSelectionRound,
} from './types';

export function buildVariantSelectionRounds(table: TableData): VariantSelectionRound[] {
  const wordExercise = createWordTransformationExercise(table);
  const prompts = table.bodySentencePrompts!;

  return wordExercise.sequences.map(sequence => {
    const rowIndex = sequence.rowIndex;
    const colIndex = sequence.colIndex;
    const sentencePrompt = prompts[rowIndex]![colIndex]!;
    const correctForm = sequence.targetWord;
    const distractors = selectDistractors(table.body, rowIndex, colIndex);

    const options = [
      { form: correctForm, isCorrect: true },
      ...distractors.map(form => ({ form, isCorrect: false })),
    ];

    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

    return {
      rowIndex,
      colIndex,
      sentencePrompt,
      displaySlots: expandSentencePromptSlots(sentencePrompt),
      infinitive: sequence.baseWord,
      conjugatedForm: correctForm,
      options: shuffled,
    };
  });
}

export function createVariantSelectionExercise(
  table: TableData,
  options: CreateVariantSelectionExerciseOptions = {},
): VariantSelectionExercise {
  const rounds = buildVariantSelectionRounds(table);
  const roundOrder = (options.shuffleIndices ?? shuffleIndices)(rounds.length);

  return { table, rounds, roundOrder };
}
