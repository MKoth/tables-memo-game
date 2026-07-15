import React from 'react';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeRuntime } from '../../core/providers/UnderseaThemeRuntimeProvider';
import { JellyfishTableLayerInner } from './JellyfishTableLayerInner';
import { DEFAULT_TRANSLATION_DISPLAY_MS } from './config/jellyfishTableLayerConfig';
import type { JellyfishTableLayerProps } from './types';

export type {
  JellyfishSoundKind,
  JellyfishTableLayerController,
  JellyfishTableLayerProps,
} from './types';

/**
 * Thin shell: reads preloaded jellyfish images from context before mounting
 * the stateful inner layer, keeping hook call order unconditional inside each component.
 */
export function JellyfishTableLayer({
  table,
  onJellyfishSound,
  interactive = true,
  translationDisplayMs = DEFAULT_TRANSLATION_DISPLAY_MS,
  highlightedCellIndex = -1,
  extraRevealedBodyIndices,
  controllerRef,
}: JellyfishTableLayerProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const { captureBridge, onJellyfishMatchSuccess } = useUnderseaThemeRuntime();
  const bellImage = images.jellyfishBell;
  const tentacleImage = images.jellyfishTentacles;

  return (
    <JellyfishTableLayerInner
      table={table}
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      capturedWord={captureBridge?.capturedWord ?? null}
      bubblePhase={captureBridge?.bubblePhase}
      onMatchSuccess={onJellyfishMatchSuccess}
      onJellyfishSound={onJellyfishSound}
      interactive={interactive}
      translationDisplayMs={translationDisplayMs}
      highlightedCellIndex={highlightedCellIndex}
      extraRevealedBodyIndices={extraRevealedBodyIndices}
      controllerRef={controllerRef}
    />
  );
}
