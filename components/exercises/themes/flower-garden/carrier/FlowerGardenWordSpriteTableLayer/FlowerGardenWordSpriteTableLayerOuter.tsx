import React from 'react';
import { useFlowerGardenAssetsContext } from '../../core/providers/FlowerGardenAssetsProvider';
import { useExerciseRuntime } from '../../../../core';
import { FlowerGardenWordSpriteTableLayerInner } from './FlowerGardenWordSpriteTableLayerInner';
import { DEFAULT_TRANSLATION_DISPLAY_MS } from './config/flowerTableLayerConfig';
import type { FlowerWordSpriteTableLayerProps } from './types';

export function FlowerGardenWordSpriteTableLayer({
  table,
  onWordSpriteSound,
  interactive = true,
  translationDisplayMs = DEFAULT_TRANSLATION_DISPLAY_MS,
  highlightedCellIndex = -1,
  extraRevealedBodyIndices,
  controllerRef,
}: FlowerWordSpriteTableLayerProps) {
  const { images } = useFlowerGardenAssetsContext();
  const { captureBridge, onWordSpriteMatchSuccess } = useExerciseRuntime();
  const roseBudImage = images.roseBudImage;
  const roseCenterImage = images.roseCenterImage;
  const petalImages = images.petalImages;
  const rosePetalAtlas = images.rosePetalAtlas;

  if (
    roseBudImage == null ||
    roseCenterImage == null ||
    petalImages == null ||
    petalImages.length !== 6 ||
    rosePetalAtlas == null
  ) {
    return null;
  }

  return (
    <FlowerGardenWordSpriteTableLayerInner
      table={table}
      roseBudImage={roseBudImage}
      roseCenterImage={roseCenterImage}
      petalImages={petalImages}
      rosePetalAtlas={rosePetalAtlas}
      capturedWord={captureBridge?.capturedWord ?? null}
      orbPhase={captureBridge?.orbPhase}
      onMatchSuccess={onWordSpriteMatchSuccess}
      onWordSpriteSound={onWordSpriteSound}
      interactive={interactive}
      translationDisplayMs={translationDisplayMs}
      highlightedCellIndex={highlightedCellIndex}
      extraRevealedBodyIndices={extraRevealedBodyIndices}
      controllerRef={controllerRef}
    />
  );
}
