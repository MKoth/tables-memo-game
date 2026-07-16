import React from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { RoamerCapturedFishCanvas } from './RoamerCapturedFishCanvas';
import { RoamerWordBubble } from '../bubbles/RoamerWordBubble';
import type { BubbleAnimState, BurstIntentValue } from '../bubbles/bubbleAnimTypes';
import type { RoamerImageKey } from '../config/roamerFishSettings';
import type { RoamerFishSimulation } from '../simulation/captureTypes';
import type { RoamerRuntimeEntry } from '../simulation/types';

type RoamerCaptureOverlayProps = {
  selection: { word: string; fishIndex: number };
  capturedEntry: RoamerRuntimeEntry;
  anim: SharedValue<BubbleAnimState>;
  phase: SharedValue<number>;
  escapeActive: SharedValue<boolean>;
  escapeOverlayActive: boolean;
  startBurst: (intent?: BurstIntentValue) => void;
  targetDiameter: number;
  images: Record<RoamerImageKey, SkImage>;
  masks: Record<RoamerImageKey, SkImage>;
  renderProps: RoamerFishSimulation['renderProps'];
};

export function RoamerCaptureOverlay({
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
}: RoamerCaptureOverlayProps) {
  const capturedFishNode = (
    <RoamerCapturedFishCanvas
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
    <RoamerWordBubble
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
