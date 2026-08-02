import type { TableData } from '../../../../../../../data/tableData';
import type { WordSpriteSizing, LayoutParticle } from '../../../../undersea/carrier/WordSpriteTableLayer/layout/computeWordSpriteLayout';
import type { FlowerCellConfig } from '../types';

export function createFlowerCellConfigs(
  table: TableData,
  sizing: WordSpriteSizing,
): FlowerCellConfig[] {
  const configs: FlowerCellConfig[] = [];
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
    });
  });

  body.forEach((row, r) => {
    row.forEach((cell, c) => {
      configs.push({
        key: `body-${r}-${c}`,
        index: configs.length,
        gridCol: c + 1,
        gridRow: r + 1,
        isHeader: false,
        label: cell,
        translation: bodyTranslations[r]?.[c] ?? '',
        bellSize: bodyBellSize,
      });
    });
  });

  return configs;
}

export function sortFlowerDrawOrder(configs: FlowerCellConfig[]): FlowerCellConfig[] {
  return [...configs].sort((a, b) => {
    if (a.isHeader !== b.isHeader) {
      return a.isHeader ? 1 : -1;
    }
    return a.gridRow * 1000 + a.gridCol - (b.gridRow * 1000 + b.gridCol);
  });
}

export function buildFlowerLayoutParticles(configs: FlowerCellConfig[]): LayoutParticle[] {
  return configs.map(c => ({
    gridCol: c.gridCol,
    gridRow: c.gridRow,
    bellRadius: c.bellSize / 2,
  }));
}
