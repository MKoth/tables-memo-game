import type { SentencePrompt, TableData } from '../../../../data/tableData';
import type { SentencePromptDisplaySlot } from '../../sentenceTransformation/domain/types';

export type VariantSelectionOption = {
  form: string;
  isCorrect: boolean;
};

export type VariantSelectionRound = {
  rowIndex: number;
  colIndex: number;
  sentencePrompt: SentencePrompt;
  displaySlots: SentencePromptDisplaySlot[];
  infinitive: string;
  conjugatedForm: string;
  options: VariantSelectionOption[];
};

export type VariantSelectionExercise = {
  table: TableData;
  rounds: VariantSelectionRound[];
  roundOrder: number[];
};

export type CreateVariantSelectionExerciseOptions = {
  shuffleIndices?: (count: number) => number[];
};
