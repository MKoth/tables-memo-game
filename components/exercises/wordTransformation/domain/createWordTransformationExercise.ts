import type { TableData } from '../../../../data/tableData';
import { generateWordOperations } from './generateOperations';
import type {
  Operation,
  WordOperationSequence,
  WordTransformationExercise,
} from './types';

/**
 * Flat jellyfish cell index for a body cell.
 * Cell configs are built as: all column headers, then all row headers, then
 * body cells in row-major order (see createCellConfigs).
 */
export function bodyCellIndex(
  table: TableData,
  rowIndex: number,
  colIndex: number,
): number {
  const nCols = table.colHeaders.length;
  const nRows = table.rowHeaders.length;
  return nCols + nRows + rowIndex * nCols + colIndex;
}

export function createWordTransformationExercise(
  table: TableData,
): WordTransformationExercise {
  let allTableOperations: Operation[] = [];

  table.body.forEach((row) => {
    row.forEach((cell, colIndex) => {
      const baseWord = table.colHeaders[colIndex];
      const targetWord = cell;
      const operations = generateWordOperations(baseWord, targetWord);
      allTableOperations = allTableOperations.concat(operations);
    });
  });

  const sequences: WordOperationSequence[] = [];

  table.body.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const baseWord = table.colHeaders[colIndex];
      const targetWord = cell;
      const operations = generateWordOperations(
        baseWord,
        targetWord,
        allTableOperations,
      );

      sequences.push({
        rowIndex,
        colIndex,
        cellIndex: bodyCellIndex(table, rowIndex, colIndex),
        baseWord,
        targetWord,
        operations,
      });
    });
  });

  return { table, sequences };
}
