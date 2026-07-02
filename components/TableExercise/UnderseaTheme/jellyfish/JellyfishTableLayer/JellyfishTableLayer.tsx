import React from 'react';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { JellyfishTableLayerInner } from './JellyfishTableLayerInner';
import { DEFAULT_TRANSLATION_DISPLAY_MS } from './constants';
import type { JellyfishTableLayerProps } from './types';

export type { JellyfishSoundKind, JellyfishTableLayerProps } from './types';

/**
 * Thin shell: reads preloaded jellyfish images from context before mounting
 * the stateful inner layer, keeping hook call order unconditional inside each component.
 */
export function JellyfishTableLayer({
  table,
  capturedWord = null,
  bubblePhase,
  onMatchSuccess,
  onJellyfishSound,
  interactive = true,
  onLayoutBridgeChange,
  translationDisplayMs = DEFAULT_TRANSLATION_DISPLAY_MS,
}: JellyfishTableLayerProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const bellImage = images.jellyfishBell;
  const tentacleImage = images.jellyfishTentacles;
  return (
    <JellyfishTableLayerInner
      table={table}
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      capturedWord={capturedWord}
      bubblePhase={bubblePhase}
      onMatchSuccess={onMatchSuccess}
      onJellyfishSound={onJellyfishSound}
      interactive={interactive}
      onLayoutBridgeChange={onLayoutBridgeChange}
      translationDisplayMs={translationDisplayMs}
    />
  );
}
