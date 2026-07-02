import { useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

export function useKoiCaptureSharedState(initialWidth: number) {
  const [eliminatedFishIndices, setEliminatedFishIndices] = useState<number[]>([]);

  const releaseRequestSv = useSharedValue(0);
  const releaseContextSv = useSharedValue<{
    runtimeEntries: import('../../simulation/captureTypes').KoiFishSimulation['runtimeEntries'];
    sharedPositions: import('../../simulation/captureTypes').KoiFishSimulation['sharedPositions'];
    captureState: import('../../simulation/captureTypes').KoiCaptureSharedState;
  } | null>(null);
  const capturedFishIndexSv = useSharedValue(-1);
  const captureOriginXSv = useSharedValue(0);
  const captureOriginYSv = useSharedValue(0);
  const escapeActiveSv = useSharedValue(false);
  const escapeStageSv = useSharedValue(0);
  const escapeTargetXSv = useSharedValue(0);
  const escapeTargetYSv = useSharedValue(0);
  const offScreenTargetXSv = useSharedValue(initialWidth * 0.5);
  const offScreenTargetYSv = useSharedValue(-120 * 1.5);
  const escapeExitEdgeSv = useSharedValue(0);
  const escapeCompleteTriggeredSv = useSharedValue(false);
  const escapeOverlayDismissTriggeredSv = useSharedValue(false);
  const eliminatedFishSv = useSharedValue<number[]>([]);

  const fishCountRef = useRef(0);
  const onEscapeOverlayDismissRef = useRef<() => void>(() => {});
  const onEscapeCompleteRef = useRef<() => void>(() => {});

  useEffect(() => {
    eliminatedFishSv.value = eliminatedFishIndices;
  }, [eliminatedFishIndices, eliminatedFishSv]);

  return {
    capturedFishIndexSv,
    captureOriginXSv,
    captureOriginYSv,
    escapeActiveSv,
    escapeStageSv,
    escapeTargetXSv,
    escapeTargetYSv,
    offScreenTargetXSv,
    offScreenTargetYSv,
    escapeExitEdgeSv,
    escapeCompleteTriggeredSv,
    escapeOverlayDismissTriggeredSv,
    releaseRequestSv,
    releaseContextSv,
    eliminatedFishSv,
    eliminatedFishIndices,
    setEliminatedFishIndices,
    fishCountRef,
    onEscapeOverlayDismissRef,
    onEscapeCompleteRef,
  };
}

export type KoiCaptureSharedStateBundle = ReturnType<typeof useKoiCaptureSharedState>;
