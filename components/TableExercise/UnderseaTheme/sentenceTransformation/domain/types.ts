import type { SentencePrompt, TableData } from '../../../../../data/tableData';
import type { Operation } from '../../wordTransformation/domain/types';

export type SentencePromptDisplaySlot =
  | { kind: 'token'; text: string }
  | { kind: 'blank' };

export type SentenceTransformationRound = {
  rowIndex: number;
  colIndex: number;
  sentencePrompt: SentencePrompt;
  displaySlots: SentencePromptDisplaySlot[];
  infinitive: string;
  conjugatedForm: string;
  operations: Operation[];
};

export type SentenceTransformationExercise = {
  table: TableData;
  rounds: SentenceTransformationRound[];
  /** Shuffled indices into rounds — same coverage model as table transformation. */
  roundOrder: number[];
};

export type CreateSentenceTransformationExerciseOptions = {
  shuffleIndices?: (count: number) => number[];
};
