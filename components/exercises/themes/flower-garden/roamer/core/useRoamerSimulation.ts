import { useMemo, useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';
import { createRng, hashSeedString } from '../../scenery/BushShaderLayer/helpers/seededRandom';
import type { ZoneRect } from '../../../../core/layout/computeExerciseLayout';
import {
  buildRoamerSimBundle,
  relayoutRoamerSimBundle,
  type PersistedRoamerSimBundle,
} from './roamerSimBundle';
import { useRoamerSimFrameLoop } from './useRoamerSimFrameLoop';
import type { RoamerRuntimeEntry, SwimZone } from './types';
import { useFlowerGardenTableContext } from '../../scenery/flowerGardenTableContext';

export type RoamerSimulation = {
  runtimeEntries: RoamerRuntimeEntry[];
  sharedPositions: ReturnType<typeof useSharedValue<number[]>>;
  swimZone: SwimZone;
  swimZoneTop: number;
  swimZoneHeight: number;
  swimZoneLeft: number;
  swimZoneWidth: number;
  fieldFlowerAnchorsX: number[];
  fieldFlowerAnchorsY: number[];
  occupantSlots: ReturnType<typeof useSharedValue<number[]>>;
};

export type UseRoamerSimulationParams = {
  words: string[];
  width: number;
  height: number;
  roamerRect: ZoneRect;
  layoutKey: string;
  sessionId?: string;
  capturedRoamerIndex?: SharedValue<number>;
  orbCaptureCenterX?: number;
  orbCaptureCenterY?: number;
  orbCaptureRadius?: number;
  onRoamerEscaped?: (roamerIndex: number) => void;
};

export function useRoamerSimulation({
  words,
  width,
  height,
  roamerRect,
  layoutKey,
  sessionId = 'default',
  capturedRoamerIndex,
  orbCaptureCenterX = 0,
  orbCaptureCenterY = 0,
  orbCaptureRadius = 0,
  onRoamerEscaped,
}: UseRoamerSimulationParams): RoamerSimulation {
  const capturedIdx = capturedRoamerIndex ?? useSharedValue(-1);
  const wordsKey = words.join('\0');
  const seed = useMemo(() => hashSeedString(`roamer-${sessionId}`), [sessionId]);
  const rng = useMemo(() => createRng(seed), [seed]);

  const { fieldFlowerConfigs, flowerSwingBoosts } = useFlowerGardenTableContext();
  const configs = fieldFlowerConfigs ?? [];

  const fieldFlowerAnchorsX = useMemo(() => configs.map(c => c.headerX), [configs]);
  const fieldFlowerAnchorsY = useMemo(() => configs.map(c => c.headerY), [configs]);
  const flowerSwingAmplitudes = useMemo(() => configs.map(c => c.swingAmplitude), [configs]);
  const flowerSwingSpeeds = useMemo(() => configs.map(c => c.swingSpeed), [configs]);
  const flowerSwingPhases = useMemo(() => configs.map(c => c.swingPhase), [configs]);
  const flowerSwingAngles = useMemo(() => configs.map(c => c.swingAngle), [configs]);

  const bundleRef = useRef<PersistedRoamerSimBundle | null>(null);

  if (bundleRef.current == null || bundleRef.current.wordsKey !== wordsKey) {
    bundleRef.current = buildRoamerSimBundle(
      words,
      width,
      height,
      roamerRect,
      layoutKey,
      rng,
      fieldFlowerAnchorsX,
      fieldFlowerAnchorsY,
    );
  } else if (
    bundleRef.current.layoutKey !== layoutKey ||
    bundleRef.current.width !== width ||
    bundleRef.current.height !== height
  ) {
    relayoutRoamerSimBundle(
      bundleRef.current,
      roamerRect,
      width,
      height,
      layoutKey,
    );
  }

  const { runtimeEntries, sharedPositions, swimZone, occupantSlots } = bundleRef.current;

  useRoamerSimFrameLoop(
    runtimeEntries,
    swimZone,
    sharedPositions,
    fieldFlowerAnchorsX,
    fieldFlowerAnchorsY,
    occupantSlots,
    flowerSwingAmplitudes,
    flowerSwingSpeeds,
    flowerSwingPhases,
    flowerSwingAngles,
    flowerSwingBoosts,
    capturedIdx,
    orbCaptureCenterX,
    orbCaptureCenterY,
    orbCaptureRadius,
    onRoamerEscaped,
  );

  return {
    runtimeEntries,
    sharedPositions,
    swimZone,
    swimZoneTop: swimZone.y,
    swimZoneHeight: swimZone.h,
    swimZoneLeft: swimZone.x,
    swimZoneWidth: swimZone.w,
    fieldFlowerAnchorsX,
    fieldFlowerAnchorsY,
    occupantSlots,
  };
}
