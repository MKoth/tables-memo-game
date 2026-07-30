import React, { useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { SkImage } from '@shopify/react-native-skia';
import { ButterflyInstance } from '../roamer/butterfly/ButterflyInstance';
import { BeeInstance } from '../roamer/bee/BeeInstance';
import { BumblebeeInstance } from '../roamer/bumblebee/BumblebeeInstance';
import { ORB_ROAMER_SCALE } from './orbAnimPresets';
import type { RoamerRuntimeEntry, RoamerSpawn } from '../roamer/core/types';

export type CapturedRoamerCanvasProps = {
  entry: RoamerRuntimeEntry;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
  centerX: number;
  centerY: number;
  angle: number;
};

type InstanceProps = React.ComponentType<{
  x: ReturnType<typeof useSharedValue<number>>;
  y: ReturnType<typeof useSharedValue<number>>;
  angle: ReturnType<typeof useSharedValue<number>>;
  wingPhase: ReturnType<typeof useSharedValue<number>>;
  bodyScale: ReturnType<typeof useSharedValue<number>>;
  renderMode: number;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
  legPhases: ReturnType<typeof useSharedValue<number>>[];
  legVisibility: ReturnType<typeof useSharedValue<number>>;
  isPreTakeoff: ReturnType<typeof useSharedValue<number>>;
  spawnLegPhaseOffsets: number[];
}>;

function pickInstance(spawn: RoamerSpawn): InstanceProps {
  if (spawn.species === 'butterfly') {
    return ButterflyInstance as unknown as InstanceProps;
  }
  if (spawn.species === 'bee') {
    return BeeInstance as unknown as InstanceProps;
  }
  return BumblebeeInstance as unknown as InstanceProps;
}

export function CapturedRoamerCanvas({
  entry,
  bodyImage,
  leftWingImage,
  rightWingImage,
  centerX,
  centerY,
  angle,
}: CapturedRoamerCanvasProps) {
  const x = useSharedValue(centerX);
  const y = useSharedValue(centerY);
  const angleSv = useSharedValue(angle);
  const bodyScale = useSharedValue(ORB_ROAMER_SCALE);
  const Instance = useMemo(() => pickInstance(entry.spawn), [entry.spawn]);

  return (
    <Instance
      x={x}
      y={y}
      angle={angleSv}
      wingPhase={entry.runtime.wingPhase}
      bodyScale={bodyScale}
      renderMode={0}
      bodyImage={bodyImage}
      leftWingImage={leftWingImage}
      rightWingImage={rightWingImage}
      legPhases={entry.runtime.legPhases}
      legVisibility={entry.runtime.legVisibility}
      isPreTakeoff={entry.runtime.isPreTakeoff}
      spawnLegPhaseOffsets={entry.spawn.legPhaseOffsets}
    />
  );
}
