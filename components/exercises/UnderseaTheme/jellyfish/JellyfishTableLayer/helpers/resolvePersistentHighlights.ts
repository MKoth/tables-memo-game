import type { CellConfig } from './cellConfigBuilders';
import type { PersistentHighlightKind } from '../presets/jellyfishTintPresets';

export function resolvePersistentHighlights(
  cellConfigs: readonly CellConfig[],
  highlightedCellIndex: number,
): ReadonlyMap<number, PersistentHighlightKind> {
  const map = new Map<number, PersistentHighlightKind>();
  if (highlightedCellIndex < 0 || highlightedCellIndex >= cellConfigs.length) {
    return map;
  }

  const target = cellConfigs[highlightedCellIndex];
  if (target == null) {
    return map;
  }

  map.set(target.index, 'target');

  if (target.isHeader) {
    return map;
  }

  const rowHeader = cellConfigs.find(
    cell => cell.isHeader && cell.gridCol === 0 && cell.gridRow === target.gridRow,
  );
  if (rowHeader != null) {
    map.set(rowHeader.index, 'rowHeader');
  }

  const colHeader = cellConfigs.find(
    cell => cell.isHeader && cell.gridRow === 0 && cell.gridCol === target.gridCol,
  );
  if (colHeader != null) {
    map.set(colHeader.index, 'colHeader');
  }

  return map;
}
