import type { TableData } from '../../../../../../data/tableData';
import type { ZoneRect } from '../../../../core';
import {
  computeLayoutPositions,
  computeWordSpriteSizing,
  type LayoutBounds,
  type LayoutParticle,
} from '../../../undersea/carrier/WordSpriteTableLayer/layout/computeWordSpriteLayout';
import {
  buildFlowerLayoutParticles,
  createFlowerCellConfigs,
} from '../../carrier/FlowerGardenWordSpriteTableLayer/helpers/flowerCellConfigBuilders';
import type { Point2D } from './helpers/bezierMath';

export function computeRoseRestPositions(
  table: TableData,
  spriteRect: ZoneRect,
  screenHeight: number,
): Point2D[] {
  const nGridCols = table.colHeaders.length + 1;
  const nGridRows = table.rowHeaders.length + 1;

  const sizing = computeWordSpriteSizing({
    zoneWidth: spriteRect.w,
    zoneHeight: spriteRect.h,
    nGridCols,
    nGridRows,
  });

  const cellConfigs = createFlowerCellConfigs(table, sizing);
  const layoutParticles: LayoutParticle[] = buildFlowerLayoutParticles(cellConfigs);

  const layoutBounds: LayoutBounds = {
    width: spriteRect.w,
    height: screenHeight,
    nGridCols,
    nGridRows,
    zoneLeft: spriteRect.x,
    zoneTop: spriteRect.y,
    zoneHeight: spriteRect.h,
    scaleMin: sizing.scaleMin,
    scaleMax: sizing.scaleMax,
    edgeSqueeze: sizing.edgeSqueeze,
    spreadBoost: sizing.spreadBoost,
  };

  const layout = computeLayoutPositions(layoutParticles, layoutBounds, 0, 0);
  return layout.xs.map((x, i) => ({ x, y: layout.ys[i] ?? 0 }));
}
