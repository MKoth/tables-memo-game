import { useMemo } from 'react';
import type { TableData } from '../../../../../../data/tableData';
import { useExerciseLayout } from '../../../../core';
import { createRng, hashSeedString } from './helpers/seededRandom';
import {
  generateBushConfigs,
  type GenerateBushConfigsInput,
} from './generateBushConfigs';
import { computeGroundBand } from './groundBand';
import { computeRoseRestPositions } from './roseRestPositions';
import type { BushConfig } from './types';

export const DEFAULT_STEM_BASE_SPREAD_RADIUS = 22;
export const DEFAULT_STEM_BASE_WIDTH = 3;
export const DEFAULT_STEM_TOP_WIDTH = 18;
export const DEFAULT_LEAVES_PER_STEM_RANGE: readonly [number, number] = [5, 9];

export type UseBushConfigsOptions = {
  stemBaseSpreadRadius?: number;
  stemBaseWidth?: number;
  stemTopWidth?: number;
  leavesPerStemRange?: readonly [number, number];
};

export function useBushConfigs(
  table: TableData | null,
  options: UseBushConfigsOptions = {},
): BushConfig[] {
  const { spriteRect, screenHeight } = useExerciseLayout();
  const stemBaseSpreadRadius = options.stemBaseSpreadRadius ?? DEFAULT_STEM_BASE_SPREAD_RADIUS;
  const stemBaseWidth = options.stemBaseWidth ?? DEFAULT_STEM_BASE_WIDTH;
  const stemTopWidth = options.stemTopWidth ?? DEFAULT_STEM_TOP_WIDTH;
  const leavesPerStemRange = options.leavesPerStemRange ?? DEFAULT_LEAVES_PER_STEM_RANGE;
  const tableId = table?.id ?? null;

  return useMemo(() => {
    if (table == null || tableId == null) return [];
    const nRoses = table.body.length * (table.body[0]?.length ?? 0);
    const roseGridPositions = computeRoseRestPositions(table, spriteRect, screenHeight);
    const groundBand = computeGroundBand(spriteRect, screenHeight);
    const input: GenerateBushConfigsInput = {
      tableId,
      nRoses,
      roseIndices: Array.from({ length: nRoses }, (_, i) => i),
      roseGridPositions,
      groundBand,
      stemBaseSpreadRadius,
      stemBaseWidth,
      stemTopWidth,
      leavesPerStemRange,
      rng: createRng(hashSeedString(tableId)),
    };
    return generateBushConfigs(input);
  }, [
    table,
    tableId,
    spriteRect,
    screenHeight,
    stemBaseSpreadRadius,
    stemBaseWidth,
    stemTopWidth,
    leavesPerStemRange,
  ]);
}
