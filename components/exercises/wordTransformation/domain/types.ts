import type { TableData } from '../../../../data/tableData';

export const OPERATION_TYPES = {
  DELETE: 'delete',
  INSERT: 'insert',
} as const;

export type OperationType = (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

export type Operation = {
  type: OperationType;
  /** Position in the evolving word where the op applies. */
  index: number;
  /** The characters being deleted (delete) or inserted (insert). */
  text: string;
  /** Number of chars to remove — delete only. */
  length?: number;
  /** Candidate strings to choose from — insert only (includes the correct one). */
  variants?: string[];
};

export type DiffOp =
  | { type: 'delete'; index: number; length: number; text: string }
  | { type: 'insert'; index: number; text: string };

export type WordOperationSequence = {
  rowIndex: number;
  colIndex: number;
  /** Flat wordSprite cell index of the target body cell. */
  cellIndex: number;
  baseWord: string;
  targetWord: string;
  operations: Operation[];
};

export type WordTransformationExercise = {
  table: TableData;
  sequences: WordOperationSequence[];
};
