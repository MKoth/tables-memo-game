import { useMemo, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import {
  ROAMER_BUTTERFLY_HIT_RADIUS,
} from '../config/butterflySimConfig';
import {
  ROAMER_BUTTERFLY_BODY_LENGTH,
  ROAMER_BUTTERFLY_BODY_THICKNESS,
} from '../config/butterflySettings';
import { createRng, hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import {
  buildButterflySimBundle,
  relayoutButterflySimBundle,
  type PersistedButterflySimBundle,
} from './butterflySimBundle';
import { useButterflySimFrameLoop } from './useButterflySimFrameLoop';
import type { ButterflyRuntimeEntry, SwimZone } from './types';

export type ButterflySimulation = {
  runtimeEntries: ButterflyRuntimeEntry[];
  sharedPositions: ReturnType<typeof useSharedValue<number[]>>;
  swimZone: SwimZone;
  swimZoneTop: number;
  swimZoneHeight: number;
  swimZoneLeft: number;
  swimZoneWidth: number;
  hitRadius: number;
  renderProps: {
    bodyLength: number;
    bodyThickness: number;
  };
};

export type UseButterflySimulationParams = {
  words: string[];
  width: number;
  height: number;
  roamerRect: ZoneRect;
  layoutKey: string;
  sessionId?: string;
};

export function useButterflySimulation({
  words,
  width,
  height,
  roamerRect,
  layoutKey,
  sessionId = 'default',
}: UseButterflySimulationParams): ButterflySimulation {
  const wordsKey = words.join('\0');
  const seed = useMemo(() => hashSeedString(`butterfly-${sessionId}`), [sessionId]);
  const rng = useMemo(() => createRng(seed), [seed]);

  const bundleRef = useRef<PersistedButterflySimBundle | null>(null);

  if (bundleRef.current == null || bundleRef.current.wordsKey !== wordsKey) {
    bundleRef.current = buildButterflySimBundle(
      words,
      width,
      height,
      roamerRect,
      layoutKey,
      rng,
    );
  } else if (
    bundleRef.current.layoutKey !== layoutKey ||
    bundleRef.current.width !== width ||
    bundleRef.current.height !== height
  ) {
    relayoutButterflySimBundle(
      bundleRef.current,
      roamerRect,
      width,
      height,
      layoutKey,
    );
  }

  const { runtimeEntries, sharedPositions, swimZone } = bundleRef.current;

  useButterflySimFrameLoop(runtimeEntries, swimZone, sharedPositions);

  const renderProps = {
    bodyLength: ROAMER_BUTTERFLY_BODY_LENGTH,
    bodyThickness: ROAMER_BUTTERFLY_BODY_THICKNESS,
  };

  return {
    runtimeEntries,
    sharedPositions,
    swimZone,
    swimZoneTop: swimZone.y,
    swimZoneHeight: swimZone.h,
    swimZoneLeft: swimZone.x,
    swimZoneWidth: swimZone.w,
    hitRadius: ROAMER_BUTTERFLY_HIT_RADIUS,
    renderProps,
  };
}
