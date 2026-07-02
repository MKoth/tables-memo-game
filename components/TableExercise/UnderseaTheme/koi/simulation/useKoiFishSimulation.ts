import { useCallback, useMemo, useRef } from 'react';
import { KOI_SETTINGS } from '../config/koiFishSettings';
import {
  KOI_BASE_LENGTH,
  KOI_BASE_THICKNESS,
} from '../config/koiInstanceConfig';
import type {
  KoiFishSimulation,
  UseKoiFishSimulationParams,
} from './captureTypes';
import { buildSimBundle, relayoutSimBundle } from './simBundle';
import { useSimFrameLoop } from './useSimFrameLoop';

export function useKoiFishSimulation({
  width,
  height,
  koiRect,
  layoutKey,
  words,
  captureState,
  releaseRequestSv,
  eliminatedFishSv,
  onEscapeOverlayDismiss,
  onEscapeComplete,
  onSpeedIncrease,
}: UseKoiFishSimulationParams): KoiFishSimulation {
  const wordsKey = words.join('\0');
  const bundleRef = useRef<ReturnType<typeof buildSimBundle> | null>(null);

  if (bundleRef.current == null || bundleRef.current.wordsKey !== wordsKey) {
    bundleRef.current = buildSimBundle(words, width, height, koiRect, layoutKey);
  } else if (
    bundleRef.current.layoutKey !== layoutKey ||
    bundleRef.current.width !== width ||
    bundleRef.current.height !== height
  ) {
    relayoutSimBundle(
      bundleRef.current,
      koiRect,
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

  const fishLength = KOI_BASE_LENGTH * KOI_SETTINGS.scale;
  const fishThickness = KOI_BASE_THICKNESS * KOI_SETTINGS.scale;
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
      sourceAngle: KOI_SETTINGS.sourceAngle,
      tailFlex: {
        tailBendScale: KOI_SETTINGS.tailBendScale,
        tailTipBendScale: KOI_SETTINGS.tailTipBendScale,
        headBendScale: KOI_SETTINGS.headBendScale,
      },
      turnDistort: {
        squashGain: KOI_SETTINGS.turnSquashGain,
        bulgeGain: KOI_SETTINGS.turnBulgeGain,
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
  KoiCaptureSharedState,
  KoiFishSimulation,
  UseKoiFishSimulationParams,
} from './captureTypes';

export type { FishRuntime, KoiRuntimeEntry, KoiSpawn } from './types';
