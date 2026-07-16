import React from 'react';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseRuntime } from '../../../../core';
import { WordSpriteTableLayerInner } from './WordSpriteTableLayerInner';
import { DEFAULT_TRANSLATION_DISPLAY_MS } from './config/wordSpriteTableLayerConfig';
import type { WordSpriteTableLayerProps } from './types';

export type {
  WordSpriteSoundKind,
  WordSpriteTableLayerController,
  WordSpriteTableLayerProps,
} from './types';

/**
 * Thin shell: reads preloaded wordSprite images from context before mounting
 * the stateful inner layer, keeping hook call order unconditional inside each component.
 */
export function WordSpriteTableLayer({
  table,
  onWordSpriteSound,
  interactive = true,
  translationDisplayMs = DEFAULT_TRANSLATION_DISPLAY_MS,
  highlightedCellIndex = -1,
  extraRevealedBodyIndices,
  controllerRef,
}: WordSpriteTableLayerProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const { captureBridge, onWordSpriteMatchSuccess } = useExerciseRuntime();
  const bellImage = images.wordSpriteBell;
  const tentacleImage = images.wordSpriteTentacles;

  return (
    <WordSpriteTableLayerInner
      table={table}
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      capturedWord={captureBridge?.capturedWord ?? null}
      bubblePhase={captureBridge?.bubblePhase}
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
