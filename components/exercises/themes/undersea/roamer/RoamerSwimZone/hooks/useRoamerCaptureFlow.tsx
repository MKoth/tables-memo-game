import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { UnderseaThemeSoundController } from '../../../core/assets/useUnderseaThemeSounds';
import type {
  ExerciseOrientation,
  ZoneRect,
} from '../../../../../core/layout/computeExerciseLayout';
import { RoamerCaptureOverlay } from '../../capture/RoamerCaptureOverlay';
import { releaseCapturedFishWorklet } from '../../capture/releaseFishToPool';
import {
  BurstIntent,
  useBubbleAnimation,
  type BurstIntentValue,
} from '../../bubbles/useBubbleAnimation';
import {
  useRoamerFishSimulation,
  type RoamerCaptureSharedState,
} from '../../simulation/useRoamerFishSimulation';
import { BUBBLE_DIAMETER_RATIO, type BubbleSelection } from '../types';
import { useRoamerCaptureSharedState } from './useRoamerCaptureSharedState';
import { useRoamerEscapeFlow } from './useRoamerEscapeFlow';
import { useRoamerRuntimeBridge } from './useRoamerRuntimeBridge';

type UseRoamerCaptureFlowParams = {
  words: string[];
  width: number;
  height: number;
  roamerRect: ZoneRect;
  orientation: ExerciseOrientation;
  layoutKey: string;
  images: Record<'roamer1' | 'roamer2' | 'roamer3', SkImage>;
  masks: Record<'roamer1' | 'roamer2' | 'roamer3', SkImage>;
  sounds?: UnderseaThemeSoundController;
  /** When false, fish swim directly to wordSprite without bubble inflate/pop. */
  bubbleCaptureEnabled?: boolean;
  /** Override bubble travel target (defaults to roamer zone center). */
  bubbleTarget?: {
    centerX: number;
    centerY: number;
    diameter?: number;
  };
};

export function useRoamerCaptureFlow({
  words,
  width,
  height,
  roamerRect,
  orientation,
  layoutKey,
  images,
  masks,
  sounds,
  bubbleCaptureEnabled = true,
  bubbleTarget,
}: UseRoamerCaptureFlowParams) {
  const [selection, setSelection] = useState<BubbleSelection | null>(null);
  const pendingDirectCaptureRef = useRef<{
    word: string;
    fishIndex: number;
  } | null>(null);
  const [escapeOverlayActive, setEscapeOverlayActive] = useState(false);
  const [poolHiddenFishIndex, setPoolHiddenFishIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const shared = useRoamerCaptureSharedState(width);
  const {
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
    fishCountRef,
    onEscapeOverlayDismissRef,
    onEscapeCompleteRef,
  } = shared;

  const onSpeedIncrease = useCallback(() => {
    soundsRef.current?.playRandomSplash();
  }, []);

  const defaultTargetDiameter = Math.min(roamerRect.w, roamerRect.h) * BUBBLE_DIAMETER_RATIO;
  const defaultTargetCenterX = roamerRect.x + roamerRect.w * 0.5;
  const defaultTargetCenterY = roamerRect.y + roamerRect.h * 0.5;
  const targetDiameter = bubbleTarget?.diameter ?? defaultTargetDiameter;
  const targetCenterX = bubbleTarget?.centerX ?? defaultTargetCenterX;
  const targetCenterY = bubbleTarget?.centerY ?? defaultTargetCenterY;

  const bubbleConfig = useMemo(
    () => ({
      originX: selection?.originX ?? 0,
      originY: selection?.originY ?? 0,
      targetCenterX,
      targetCenterY,
      targetDiameter,
    }),
    [selection?.originX, selection?.originY, targetCenterX, targetCenterY, targetDiameter],
  );

  const cancelTransitionRaf = useCallback(() => {
    if (transitionRafRef.current != null) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelTransitionRaf(), [cancelTransitionRaf]);

  useEffect(() => {
    if (
      poolHiddenFishIndex != null &&
      eliminatedFishIndices.includes(poolHiddenFishIndex)
    ) {
      setPoolHiddenFishIndex(null);
    }
  }, [eliminatedFishIndices, poolHiddenFishIndex]);

  const handleBurstEnd = useCallback(
    (intent: number) => {
      if (intent === BurstIntent.Escape) {
        return;
      }

      cancelTransitionRaf();
      setPoolHiddenFishIndex(null);
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setSelection(null);
      });
    },
    [cancelTransitionRaf],
  );

  const requestReleaseWorklet = useCallback(() => {
    'worklet';
    const ctx = releaseContextSv.value;
    if (ctx == null) {
      releaseRequestSv.value = 1;
      return;
    }

    const fishIndex = ctx.captureState.capturedFishIndex.value;
    const entry = fishIndex >= 0 ? ctx.runtimeEntries[fishIndex] : null;
    if (entry != null) {
      releaseCapturedFishWorklet(
        fishIndex,
        entry.runtime,
        ctx.sharedPositions,
        ctx.captureState,
      );
    }
  }, [releaseContextSv, releaseRequestSv]);

  const { anim, phase, enterProgress, startBurst: startBurstRaw } = useBubbleAnimation(
    bubbleConfig,
    handleBurstEnd,
    bubbleCaptureEnabled && selection != null,
    requestReleaseWorklet,
  );

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release) => {
      soundsRef.current?.playBubblePop();
      startBurstRaw(intent);
    },
    [startBurstRaw],
  );

  const captureState = useMemo<RoamerCaptureSharedState>(
    () => ({
      capturedFishIndex: capturedFishIndexSv,
      captureOriginX: captureOriginXSv,
      captureOriginY: captureOriginYSv,
      bubbleAnim: anim,
      bubblePhase: phase,
      enterProgress,
      escapeActive: escapeActiveSv,
      escapeStage: escapeStageSv,
      escapeTargetX: escapeTargetXSv,
      escapeTargetY: escapeTargetYSv,
      offScreenTargetX: offScreenTargetXSv,
      offScreenTargetY: offScreenTargetYSv,
      escapeExitEdge: escapeExitEdgeSv,
      escapeCompleteTriggered: escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggered: escapeOverlayDismissTriggeredSv,
    }),
    [
      anim,
      phase,
      enterProgress,
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
    ],
  );

  const sim = useRoamerFishSimulation({
    width,
    height,
    roamerRect,
    layoutKey,
    words,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss: () => onEscapeOverlayDismissRef.current(),
    onEscapeComplete: () => onEscapeCompleteRef.current(),
    onSpeedIncrease,
  });
  fishCountRef.current = sim.runtimeEntries.length;

  useRoamerEscapeFlow({
    ...shared,
    width,
    height,
    roamerRect,
    orientation,
    layoutKey,
    targetCenterX,
    targetCenterY,
    phase,
    bubbleCaptureEnabled,
    selection,
    setSelection,
    setEscapeOverlayActive,
    setPoolHiddenFishIndex,
    cancelTransitionRaf,
    soundsRef,
    sim,
  });

  releaseContextSv.value = {
    runtimeEntries: sim.runtimeEntries,
    sharedPositions: sim.sharedPositions,
    captureState,
  };

  const handleMatchSuccess = useCallback(
    (targetX: number, targetY: number, _hitIdx: number) => {
      escapeTargetXSv.value = targetX;
      escapeTargetYSv.value = targetY;
      escapeStageSv.value = 0;
      escapeCompleteTriggeredSv.value = false;
      escapeOverlayDismissTriggeredSv.value = false;
      escapeActiveSv.value = true;
      setEscapeOverlayActive(true);
      startBurst(BurstIntent.Escape);
    },
    [
      escapeActiveSv,
      escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggeredSv,
      escapeStageSv,
      escapeTargetXSv,
      escapeTargetYSv,
      startBurst,
    ],
  );

  const handleFishSelect = useCallback(
    (word: string, fishIndex: number, originX: number, originY: number) => {
      if (!bubbleCaptureEnabled) {
        return;
      }

      cancelTransitionRaf();
      soundsRef.current?.playBubbleInflate();
      sim.armCapture(fishIndex, originX, originY);
      setPoolHiddenFishIndex(null);
      setEscapeOverlayActive(false);
      escapeActiveSv.value = false;
      escapeStageSv.value = 0;
      escapeCompleteTriggeredSv.value = false;
      escapeOverlayDismissTriggeredSv.value = false;
      setSelection({ word, fishIndex, originX, originY });
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setPoolHiddenFishIndex(fishIndex);
      });
    },
    [
      bubbleCaptureEnabled,
      cancelTransitionRaf,
      escapeActiveSv,
      escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggeredSv,
      escapeStageSv,
      sim,
    ],
  );

  const capturedEntry =
    selection != null ? sim.runtimeEntries[selection.fishIndex] : null;

  const bubbleOverlay =
    bubbleCaptureEnabled && selection != null && capturedEntry != null ?
      <RoamerCaptureOverlay
        selection={selection}
        capturedEntry={capturedEntry}
        anim={anim}
        phase={phase}
        escapeActive={escapeActiveSv}
        escapeOverlayActive={escapeOverlayActive}
        startBurst={startBurst}
        targetDiameter={targetDiameter}
        images={images}
        masks={masks}
        renderProps={sim.renderProps}
      />
    : null;

  useRoamerRuntimeBridge({
    selection,
    phase,
    escapeOverlayActive,
    handleMatchSuccess,
    bubbleOverlay,
    sim,
    eliminatedFishSv,
  });

  const getFishIndexForWord = useCallback(
    (word: string) => sim.runtimeEntries.findIndex((entry) => entry.spawn.word === word),
    [sim.runtimeEntries],
  );

  const armCaptureByWord = useCallback(
    (word: string) => {
      const fishIndex = getFishIndexForWord(word);
      if (fishIndex < 0) {
        return false;
      }

      if (!bubbleCaptureEnabled) {
        pendingDirectCaptureRef.current = { word, fishIndex };
        return true;
      }

      const positions = sim.sharedPositions.value;
      const originX = positions[fishIndex * 2] ?? 0;
      const originY = positions[fishIndex * 2 + 1] ?? 0;

      handleFishSelect(word, fishIndex, originX, originY);
      return true;
    },
    [bubbleCaptureEnabled, getFishIndexForWord, handleFishSelect, sim.sharedPositions],
  );

  const dispatchEscapeTo = useCallback(
    (targetX: number, targetY: number, hitIdx = -1) => {
      if (!bubbleCaptureEnabled) {
        const pending = pendingDirectCaptureRef.current;
        if (pending == null) {
          return;
        }

        const { fishIndex } = pending;
        const positions = sim.sharedPositions.value;
        const originX = positions[fishIndex * 2] ?? 0;
        const originY = positions[fishIndex * 2 + 1] ?? 0;

        cancelTransitionRaf();
        sim.armCapture(fishIndex, originX, originY);
        pendingDirectCaptureRef.current = null;

        escapeTargetXSv.value = targetX;
        escapeTargetYSv.value = targetY;
        escapeStageSv.value = 0;
        escapeCompleteTriggeredSv.value = false;
        escapeOverlayDismissTriggeredSv.value = false;
        escapeActiveSv.value = true;
        return;
      }

      handleMatchSuccess(targetX, targetY, hitIdx);
    },
    [
      bubbleCaptureEnabled,
      cancelTransitionRaf,
      escapeActiveSv,
      escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggeredSv,
      escapeStageSv,
      escapeTargetXSv,
      escapeTargetYSv,
      handleMatchSuccess,
      sim,
    ],
  );

  return {
    sim,
    selection,
    poolHiddenFishIndex,
    escapeActiveSv,
    capturedFishIndexSv,
    eliminatedFishIndices,
    eliminatedFishSv,
    handleFishSelect,
    handleMatchSuccess,
    getFishIndexForWord,
    armCaptureByWord,
    dispatchEscapeTo,
  };
}
