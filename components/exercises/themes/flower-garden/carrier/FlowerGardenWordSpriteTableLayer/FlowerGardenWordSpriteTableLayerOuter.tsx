import React from 'react';
import { useFlowerGardenAssetsContext } from '../../core/providers/FlowerGardenAssetsProvider';
import { FlowerGardenWordSpriteTableLayerInner } from './FlowerGardenWordSpriteTableLayerInner';
import type { FlowerWordSpriteTableLayerProps } from './types';

export function FlowerGardenWordSpriteTableLayer({
  table,
  interactive = true,
  highlightedCellIndex = -1,
  controllerRef,
}: FlowerWordSpriteTableLayerProps) {
  const { images } = useFlowerGardenAssetsContext();
  const roseBudImage = images.roseBudImage;

  if (roseBudImage == null) {
    return null;
  }

  return (
    <FlowerGardenWordSpriteTableLayerInner
      table={table}
      roseBudImage={roseBudImage}
      interactive={interactive}
      highlightedCellIndex={highlightedCellIndex}
      controllerRef={controllerRef}
    />
  );
}
