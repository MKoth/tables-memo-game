import { useMemo, useRef } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { ROAMER_BUTTERFLY_SITTING_FLOWER_COUNT } from '../config/butterflySimConfig';
import {
  ROAMER_BUTTERFLY_HIT_RADIUS,
} from '../config/butterflySimConfig';
import {
  ROAMER_BUTTERFLY_BODY_LENGTH,
  ROAMER_BUTTERFLY_BODY_THICKNESS,
} from '../config/butterflySettings';
import { createRng, hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { generateFieldFlowerConfigs } from '../../../scenery/FieldFlowerShaderLayer/generateFieldFlowerConfigs';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import {
  buildButterflySimBundle,
  relayoutButterflySimBundle,
  type PersistedButterflySimBundle,
} from './butterflySimBundle';
import { useButterflySimFrameLoop } from './useButterflySimFrameLoop';
import type { ButterflyRuntimeEntry, SwimZone } from './types';

const FIELD_FLOWER_SEED = 'field-flower-scenery-v1';

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
  fieldFlowerAnchorsX: number[];
  fieldFlowerAnchorsY: number[];
  occupantSlots: ReturnType<typeof useSharedValue<number[]>>;
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

  const fieldFlowerAnchors = useMemo(() => {
    if (width === 0 || height === 0) return { x: [] as number[], y: [] as number[] };
    const flowerRng = createRng(hashSeedString(FIELD_FLOWER_SEED));
    const configs = generateFieldFlowerConfigs({
      screenWidth: width,
      screenHeight: height,
      rng: flowerRng,
      count: ROAMER_BUTTERFLY_SITTING_FLOWER_COUNT,
      minLeaves: 3,
      maxLeaves: 7,
      lowerScreenFraction: 0.4,
      minDistance: 190,
      minFlowerSize: 45,
      maxFlowerSize: 65,
      minLeafLength: 30,
      maxLeafLength: 45,
      minLeafWidth: 25,
      maxLeafWidth: 32,
      stemBaseWidth: 5,
      stemTopWidth: 12,
      offsetX: 0,
      offsetY: 0,
      offsetScale: 1,
      clusterShadowOffsetX: 0,
      clusterShadowOffsetY: -10,
      flowerTopShadowOffsetX: 0,
      flowerTopShadowOffsetY: -30,
      bottomPadding: 60,
    });
    return {
      x: configs.map(c => c.headerX),
      y: configs.map(c => c.headerY),
    };
  }, [width, height]);

  const fieldFlowerAnchorsX = fieldFlowerAnchors.x;
  const fieldFlowerAnchorsY = fieldFlowerAnchors.y;

  const bundleRef = useRef<PersistedButterflySimBundle | null>(null);

  if (bundleRef.current == null || bundleRef.current.wordsKey !== wordsKey) {
    bundleRef.current = buildButterflySimBundle(
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
    relayoutButterflySimBundle(
      bundleRef.current,
      roamerRect,
      width,
      height,
      layoutKey,
    );
  }

  const { runtimeEntries, sharedPositions, swimZone, occupantSlots } = bundleRef.current;

  useButterflySimFrameLoop(
    runtimeEntries,
    swimZone,
    sharedPositions,
    fieldFlowerAnchorsX,
    fieldFlowerAnchorsY,
    occupantSlots,
  );

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
    fieldFlowerAnchorsX,
    fieldFlowerAnchorsY,
    occupantSlots,
  };
}
