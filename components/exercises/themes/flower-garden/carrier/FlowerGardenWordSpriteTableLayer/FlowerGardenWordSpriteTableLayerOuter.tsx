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
  const petalImages = images.petalImages;

  if (roseBudImage == null || petalImages == null || petalImages.length !== 6) {
    return null;
  }

  return (
    <FlowerGardenWordSpriteTableLayerInner
      table={table}
      roseBudImage={roseBudImage}
      petalImages={petalImages}
      interactive={interactive}
      highlightedCellIndex={highlightedCellIndex}
      controllerRef={controllerRef}
    />
  );
}
