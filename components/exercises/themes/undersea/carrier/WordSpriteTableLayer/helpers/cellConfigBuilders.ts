import type { TableData } from '../../../../../../../data/tableData';
import type { WordSpriteSizing, LayoutParticle } from '../layout/computeWordSpriteLayout';
import {
  HEADER_COL_A,
  HEADER_COL_B,
  HEADER_ROW_A,
  HEADER_ROW_B,
  rollBodyTint,
  rollLabelColors,
  sr,
  type TintSpawn,
} from './tintPalette';

export type CellConfig = {
  key: string;
  index: number;
  gridCol: number;
  gridRow: number;
  isHeader: boolean;
  label: string;
  translation: string;
  bellSize: number;
  phase: number;
  pulseSpeed: number;
  labelFillColor: string;
  labelStrokeColor: string;
} & TintSpawn;

export function createCellConfigs(table: TableData, sizing: WordSpriteSizing): CellConfig[] {
  const configs: CellConfig[] = [];
  const { rowHeaders, colHeaders, body, rowHeaderTranslations, colHeaderTranslations, bodyTranslations } =
    table;
  const { bodyBellSize, headerBellSize } = sizing;

  colHeaders.forEach((verb, c) => {
    configs.push({
      key: `hcol-${c}`,
      index: configs.length,
      gridCol: c + 1,
      gridRow: 0,
      isHeader: true,
      label: verb,
      translation: colHeaderTranslations[c] ?? '',
      bellSize: headerBellSize,
      phase: sr(0, c + 1) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(10, c) * 2.0,
      tintMode: 1,
      tintStrength: 0.9,
      tintA: HEADER_ROW_A,
      tintB: HEADER_ROW_B,
      tintC: HEADER_ROW_B,
      animatedTint: true,
      tintWaveSpeed: 0.25 + sr(20, c) * 0.35,
      ...rollLabelColors(HEADER_ROW_A, HEADER_ROW_B, HEADER_ROW_B, c, 901),
    });
  });

  rowHeaders.forEach((pronoun, r) => {
    configs.push({
      key: `hrow-${r}`,
      index: configs.length,
      gridCol: 0,
      gridRow: r + 1,
      isHeader: true,
      label: pronoun,
      translation: rowHeaderTranslations[r] ?? '',
      bellSize: headerBellSize,
      phase: sr(r + 1, 0) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(r, 10) * 2.0,
      tintMode: 1,
      tintStrength: 0.9,
      tintA: HEADER_COL_A,
      tintB: HEADER_COL_B,
      tintC: HEADER_COL_B,
      animatedTint: true,
      tintWaveSpeed: 0.25 + sr(r, 20) * 0.35,
      ...rollLabelColors(HEADER_COL_A, HEADER_COL_B, HEADER_COL_B, r, 902),
    });
  });

  body.forEach((row, r) => {
    row.forEach((cell, c) => {
      const tint = rollBodyTint(r, c);
      configs.push({
        key: `body-${r}-${c}`,
        index: configs.length,
        gridCol: c + 1,
        gridRow: r + 1,
        isHeader: false,
        label: cell,
        translation: bodyTranslations[r]?.[c] ?? '',
        bellSize: bodyBellSize,
        phase: sr(r + 5, c + 7) * Math.PI * 2,
        pulseSpeed: 2.0 + sr(r, c + 33) * 2.2,
        ...tint,
        ...rollLabelColors(tint.tintA, tint.tintB, tint.tintC, r + 500, c + 700),
      });
    });
  });

  return configs;
}

export function sortDrawOrder(configs: CellConfig[]): CellConfig[] {
  return [...configs].sort((a, b) => {
    if (a.isHeader !== b.isHeader) {
      return a.isHeader ? 1 : -1;
    }
    return a.gridRow * 1000 + a.gridCol - (b.gridRow * 1000 + b.gridCol);
  });
}

export function buildLayoutParticles(configs: CellConfig[]): LayoutParticle[] {
  return configs.map(c => ({
    gridCol: c.gridCol,
    gridRow: c.gridRow,
    bellRadius: c.bellSize / 2,
  }));
}
