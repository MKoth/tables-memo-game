import React, { useMemo } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { BushShaderBushRect } from '../../../scenery/BushShaderLayer/BushShaderLayer';
import { bezierPoint } from '../../../scenery/BushShaderLayer/helpers/bezierMath';
import type { BushConfig } from '../../../scenery/BushShaderLayer/types';
import { MAX_PARALLAX_DELTA } from '../../../shaders/roseBush.sksl';

const RECT_MARGIN = 60;

function computeStemRect(
  bush: BushConfig,
  spawn: { x: number; y: number },
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stem of bush.stems) {
    const base = { x: stem.baseX, y: stem.baseY };
    const control = { x: stem.controlX, y: stem.controlY };
    const top = { x: stem.topX, y: stem.topY };
    minX = Math.min(minX, base.x, control.x, top.x, spawn.x);
    maxX = Math.max(maxX, base.x, control.x, top.x, spawn.x);
    minY = Math.min(minY, base.y, control.y, top.y, spawn.y);
    maxY = Math.max(maxY, base.y, control.y, top.y, spawn.y);
    for (const leaf of stem.leaves) {
      const attachment = bezierPoint(leaf.t, base, control, top);
      const leafHalfSize =
        leaf.size * 1.5 + leaf.t * leaf.t * MAX_PARALLAX_DELTA;
      minX = Math.min(minX, attachment.x - leafHalfSize);
      maxX = Math.max(maxX, attachment.x + leafHalfSize);
      minY = Math.min(minY, attachment.y - leafHalfSize);
      maxY = Math.max(maxY, attachment.y + leafHalfSize);
    }
  }
  return {
    x: minX - RECT_MARGIN,
    y: minY - RECT_MARGIN,
    w: maxX - minX + 2 * RECT_MARGIN,
    h: maxY - minY + 2 * RECT_MARGIN,
  };
}

export type FlowerSentenceRowStemProps = {
  bush: BushConfig;
  spawnX: number;
  spawnY: number;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  roseBellSizes: readonly number[];
  stemImage: SkImage;
  calyxImage: SkImage;
  leafAtlas: SkImage;
};

export function FlowerSentenceRowStem({
  bush,
  spawnX,
  spawnY,
  layoutX,
  layoutY,
  layoutScale,
  roseBellSizes,
  stemImage,
  calyxImage,
  leafAtlas,
}: FlowerSentenceRowStemProps) {
  const rectOverride = useMemo(
    () => computeStemRect(bush, { x: spawnX, y: spawnY }),
    [bush, spawnX, spawnY],
  );

  return (
    <BushShaderBushRect
      bush={bush}
      layoutX={layoutX}
      layoutY={layoutY}
      layoutScale={layoutScale}
      roseBellSizes={roseBellSizes}
      stemImage={stemImage}
      calyxImage={calyxImage}
      leafAtlas={leafAtlas}
      rectOverride={rectOverride}
    />
  );
}
