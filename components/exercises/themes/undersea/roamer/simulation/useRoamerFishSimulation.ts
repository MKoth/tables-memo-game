import { useCallback, useMemo, useRef } from 'react';
import { ROAMER_SETTINGS } from '../config/roamerFishSettings';
import {
  ROAMER_BASE_LENGTH,
  ROAMER_BASE_THICKNESS,
} from '../config/roamerInstanceConfig';
import type {
  RoamerFishSimulation,
  UseRoamerFishSimulationParams,
} from './captureTypes';
import { buildSimBundle, relayoutSimBundle } from './simBundle';
import { useSimFrameLoop } from './useSimFrameLoop';

export function useRoamerFishSimulation({
  width,
  height,
  roamerRect,
  layoutKey,
  words,
  captureState,
  releaseRequestSv,
  eliminatedFishSv,
  onEscapeOverlayDismiss,
  onEscapeComplete,
  onSpeedIncrease,
}: UseRoamerFishSimulationParams): RoamerFishSimulation {
  const wordsKey = words.join('\0');
  const bundleRef = useRef<ReturnType<typeof buildSimBundle> | null>(null);

  if (bundleRef.current == null || bundleRef.current.wordsKey !== wordsKey) {
    bundleRef.current = buildSimBundle(words, width, height, roamerRect, layoutKey);
  } else if (
    bundleRef.current.layoutKey !== layoutKey ||
    bundleRef.current.width !== width ||
    bundleRef.current.height !== height
  ) {
    relayoutSimBundle(
      bundleRef.current,
      roamerRect,
      width,
      height,
      layoutKey,
      captureState.capturedFishIndex.value,
      eliminatedFishSv.value,
    );
  }

  const { runtimeEntries, sharedPositions, swimZone } = bundleRef.current;

  useSimFrameLoop(
    runtimeEntries,
    swimZone,
    width,
    height,
    sharedPositions,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss,
    onEscapeComplete,
    onSpeedIncrease,
  );

  const armCapture = useCallback(
    (fishIndex: number, originX: number, originY: number) => {
      captureState.capturedFishIndex.value = fishIndex;
      captureState.captureOriginX.value = originX;
      captureState.captureOriginY.value = originY;
    },
    [captureState],
  );

  const fishLength = ROAMER_BASE_LENGTH * ROAMER_SETTINGS.scale;
  const fishThickness = ROAMER_BASE_THICKNESS * ROAMER_SETTINGS.scale;
  const swimZoneTop = swimZone.y;
  const swimZoneHeight = swimZone.h;
  const swimZoneLeft = swimZone.x;
  const swimZoneWidth = swimZone.w;
  const hitRadius = fishLength * 0.55 * 1.55;

  const renderProps = useMemo(
    () => ({
      swimZoneX: swimZone.x,
      swimZoneY: swimZone.y,
      swimZoneW: swimZone.w,
      swimZoneH: swimZone.h,
      fishW: fishLength,
      fishH: fishThickness,
      sourceAngle: ROAMER_SETTINGS.sourceAngle,
      tailFlex: {
        tailBendScale: ROAMER_SETTINGS.tailBendScale,
        tailTipBendScale: ROAMER_SETTINGS.tailTipBendScale,
        headBendScale: ROAMER_SETTINGS.headBendScale,
      },
      turnDistort: {
        squashGain: ROAMER_SETTINGS.turnSquashGain,
        bulgeGain: ROAMER_SETTINGS.turnBulgeGain,
      },
    }),
    [swimZone, fishLength, fishThickness],
  );

  return {
    runtimeEntries,
    sharedPositions,
    swimZone,
    armCapture,
    fishLength,
    fishThickness,
    swimZoneTop,
    swimZoneHeight,
    swimZoneLeft,
    swimZoneWidth,
    hitRadius,
    renderProps,
  };
}

export type {
  RoamerCaptureSharedState,
  RoamerFishSimulation,
  UseRoamerFishSimulationParams,
} from './captureTypes';

export type { FishRuntime, RoamerRuntimeEntry, RoamerSpawn } from './types';
