import React from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { KoiCapturedFishCanvas } from '../KoiCapturedFishCanvas';
import { KoiWordBubble } from '../KoiWordBubble';
import type { BubbleAnimState, BurstIntentValue } from '../bubbles/useBubbleAnimation';
import type { KoiFishSimulation } from '../simulation/captureTypes';
import type { KoiRuntimeEntry } from '../simulation/types';

type KoiCaptureOverlayProps = {
  selection: { word: string; fishIndex: number };
  capturedEntry: KoiRuntimeEntry;
  anim: SharedValue<BubbleAnimState>;
  phase: SharedValue<number>;
  escapeActive: SharedValue<boolean>;
  escapeOverlayActive: boolean;
  startBurst: (intent?: BurstIntentValue) => void;
  targetDiameter: number;
  images: Record<'koi1' | 'koi2' | 'koi3', SkImage>;
  masks: Record<'koi1' | 'koi2' | 'koi3', SkImage>;
  renderProps: KoiFishSimulation['renderProps'];
};

export function KoiCaptureOverlay({
  selection,
  capturedEntry,
  anim,
  phase,
  escapeActive,
  escapeOverlayActive,
  startBurst,
  targetDiameter,
  images,
  masks,
  renderProps,
}: KoiCaptureOverlayProps) {
  const capturedFishNode = (
    <KoiCapturedFishCanvas
      entry={capturedEntry}
      anim={anim}
      escapeActive={escapeActive}
      image={images[capturedEntry.spawn.imageKey]!}
      maskImage={masks[capturedEntry.spawn.imageKey]!}
      overlayMaskImage={masks[capturedEntry.spawn.overlayMaskKey]!}
      renderProps={renderProps}
    />
  );

  return (
    <KoiWordBubble
      word={selection.word}
      anim={anim}
      phase={phase}
      escapeActive={escapeActive}
      startBurst={startBurst}
      interactive={!escapeOverlayActive}
      capturedFish={capturedFishNode}
      targetDiameter={targetDiameter}
    />
  );
}
