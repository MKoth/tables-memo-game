import React, { useCallback, useLayoutEffect } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  computeOffScreenEscapeTarget,
  escapeExitEdgeCode,
  type UnderseaThemeOrientation,
  type ZoneRect,
} from '../../../core/layout/computeUnderseaThemeLayout';
import { BubblePhase } from '../../bubbles/useBubbleAnimation';
import type { KoiCaptureSharedStateBundle } from './useKoiCaptureSharedState';
import type { BubbleSelection } from '../types';

type UseKoiEscapeFlowParams = KoiCaptureSharedStateBundle & {
  width: number;
  height: number;
  koiRect: ZoneRect;
  orientation: UnderseaThemeOrientation;
  layoutKey: string;
  targetCenterX: number;
  targetCenterY: number;
  phase: SharedValue<number>;
  bubbleCaptureEnabled?: boolean;
  selection: BubbleSelection | null;
  setSelection: (value: BubbleSelection | null) => void;
  setEscapeOverlayActive: (value: boolean) => void;
  setPoolHiddenFishIndex: (value: number | null) => void;
  cancelTransitionRaf: () => void;
  soundsRef: React.MutableRefObject<
    import('../../../core/assets/useUnderseaThemeSounds').UnderseaThemeSoundController | undefined
  >;
  sim: {
    runtimeEntries: import('../../simulation/types').KoiRuntimeEntry[];
    sharedPositions: SharedValue<number[]>;
  };
};

export function useKoiEscapeFlow({
  width,
  height,
  koiRect,
  orientation,
  layoutKey,
  targetCenterX,
  targetCenterY,
  phase,
  bubbleCaptureEnabled = true,
  selection,
  setSelection,
  setEscapeOverlayActive,
  setPoolHiddenFishIndex,
  cancelTransitionRaf,
  soundsRef,
  sim,
  capturedFishIndexSv,
  escapeActiveSv,
  escapeStageSv,
  escapeTargetXSv,
  escapeTargetYSv,
  offScreenTargetXSv,
  offScreenTargetYSv,
  escapeExitEdgeSv,
  escapeCompleteTriggeredSv,
  escapeOverlayDismissTriggeredSv,
  setEliminatedFishIndices,
  eliminatedFishSv,
  fishCountRef,
  onEscapeOverlayDismissRef,
  onEscapeCompleteRef,
}: UseKoiEscapeFlowParams) {
  const handleEscapeOverlayDismiss = useCallback(() => {
    if (!bubbleCaptureEnabled) {
      const fishIndex = capturedFishIndexSv.value;
      if (fishIndex >= 0) {
        setPoolHiddenFishIndex(fishIndex);
      }
    }
    setSelection(null);
    setEscapeOverlayActive(false);
  }, [
    bubbleCaptureEnabled,
    capturedFishIndexSv,
    setEscapeOverlayActive,
    setPoolHiddenFishIndex,
    setSelection,
  ]);

  const handleEscapeComplete = useCallback(() => {
    const fishIndex = capturedFishIndexSv.value;
    cancelTransitionRaf();

    if (fishIndex >= 0) {
      const current = eliminatedFishSv.value;
      if (!current.includes(fishIndex)) {
        eliminatedFishSv.value = [...current, fishIndex];
      }
      if (!bubbleCaptureEnabled) {
        setPoolHiddenFishIndex(fishIndex);
      }
    }

    escapeActiveSv.value = false;
    escapeStageSv.value = 0;
    escapeCompleteTriggeredSv.value = false;
    escapeOverlayDismissTriggeredSv.value = false;
    capturedFishIndexSv.value = -1;
    phase.value = BubblePhase.None;

    if (fishIndex >= 0) {
      setEliminatedFishIndices(prev => {
        const next = prev.includes(fishIndex) ? prev : [...prev, fishIndex];
        if (next.length === fishCountRef.current) {
          soundsRef.current?.playFanfare();
        }
        return next;
      });
    }

    if (bubbleCaptureEnabled) {
      setPoolHiddenFishIndex(null);
    }
    setEscapeOverlayActive(false);
    setSelection(null);
  }, [
    bubbleCaptureEnabled,
    cancelTransitionRaf,
    capturedFishIndexSv,
    eliminatedFishSv,
    escapeActiveSv,
    escapeStageSv,
    escapeCompleteTriggeredSv,
    escapeOverlayDismissTriggeredSv,
    fishCountRef,
    phase,
    setEliminatedFishIndices,
    setEscapeOverlayActive,
    setPoolHiddenFishIndex,
    setSelection,
    soundsRef,
  ]);

  onEscapeOverlayDismissRef.current = handleEscapeOverlayDismiss;
  onEscapeCompleteRef.current = handleEscapeComplete;

  useLayoutEffect(() => {
    const escape = computeOffScreenEscapeTarget(koiRect, width, height, orientation);
    offScreenTargetXSv.value = escape.x;
    offScreenTargetYSv.value = escape.y;
    escapeExitEdgeSv.value = escapeExitEdgeCode(escape.exitEdge);

    if (!escapeActiveSv.value) {
      return;
    }

    const bubblePhase = phase.value;
    if (escapeStageSv.value === 1 || bubblePhase === BubblePhase.Burst) {
      escapeTargetXSv.value = escape.x;
      escapeTargetYSv.value = escape.y;
      if (bubblePhase === BubblePhase.Burst) {
        escapeStageSv.value = 1;
      }
      escapeCompleteTriggeredSv.value = false;
      escapeOverlayDismissTriggeredSv.value = false;
      return;
    }

    if (
      bubbleCaptureEnabled &&
      (bubblePhase === BubblePhase.Idle || bubblePhase === BubblePhase.Enter)
    ) {
      escapeTargetXSv.value = targetCenterX;
      escapeTargetYSv.value = targetCenterY;
    }
  }, [
    bubbleCaptureEnabled,
    escapeActiveSv,
    escapeCompleteTriggeredSv,
    escapeOverlayDismissTriggeredSv,
    escapeExitEdgeSv,
    escapeStageSv,
    escapeTargetXSv,
    escapeTargetYSv,
    koiRect,
    layoutKey,
    offScreenTargetXSv,
    offScreenTargetYSv,
    orientation,
    phase,
    targetCenterX,
    targetCenterY,
    width,
    height,
  ]);

  useLayoutEffect(() => {
    if (selection == null) {
      return;
    }
    const fishIndex = selection.fishIndex;
    const entry = sim.runtimeEntries[fishIndex];
    if (entry == null) {
      return;
    }
    const bubblePhase = phase.value;
    if (
      bubblePhase === BubblePhase.Idle ||
      bubblePhase === BubblePhase.Burst
    ) {
      entry.runtime.x.value = targetCenterX;
      entry.runtime.y.value = targetCenterY;
      const pos = sim.sharedPositions.value.slice();
      pos[fishIndex * 2] = targetCenterX;
      pos[fishIndex * 2 + 1] = targetCenterY;
      sim.sharedPositions.value = pos;
    }
  }, [
    escapeActiveSv,
    layoutKey,
    phase,
    selection,
    sim.runtimeEntries,
    sim.sharedPositions,
    targetCenterX,
    targetCenterY,
  ]);

  return {
    handleEscapeOverlayDismiss,
    handleEscapeComplete,
  };
}
