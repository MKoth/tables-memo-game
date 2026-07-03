import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { UnderseaThemeSoundController } from '../../../core/assets/useUnderseaThemeSounds';
import type {
  UnderseaThemeOrientation,
  ZoneRect,
} from '../../../core/layout/computeUnderseaThemeLayout';
import { KoiCaptureOverlay } from '../../capture/KoiCaptureOverlay';
import { releaseCapturedFishWorklet } from '../../capture/releaseFishToPool';
import {
  BurstIntent,
  useBubbleAnimation,
  type BurstIntentValue,
} from '../../bubbles/useBubbleAnimation';
import {
  useKoiFishSimulation,
  type KoiCaptureSharedState,
} from '../../simulation/useKoiFishSimulation';
import { BUBBLE_DIAMETER_RATIO, type BubbleSelection } from '../types';
import { useKoiCaptureSharedState } from './useKoiCaptureSharedState';
import { useKoiEscapeFlow } from './useKoiEscapeFlow';
import { useKoiRuntimeBridge } from './useKoiRuntimeBridge';

type UseKoiCaptureFlowParams = {
  words: string[];
  width: number;
  height: number;
  koiRect: ZoneRect;
  orientation: UnderseaThemeOrientation;
  layoutKey: string;
  images: Record<'koi1' | 'koi2' | 'koi3', SkImage>;
  masks: Record<'koi1' | 'koi2' | 'koi3', SkImage>;
  sounds?: UnderseaThemeSoundController;
  /** Override bubble travel target (defaults to koi zone center). */
  bubbleTarget?: {
    centerX: number;
    centerY: number;
    diameter?: number;
  };
};

export function useKoiCaptureFlow({
  words,
  width,
  height,
  koiRect,
  orientation,
  layoutKey,
  images,
  masks,
  sounds,
  bubbleTarget,
}: UseKoiCaptureFlowParams) {
  const [selection, setSelection] = useState<BubbleSelection | null>(null);
  const [escapeOverlayActive, setEscapeOverlayActive] = useState(false);
  const [poolHiddenFishIndex, setPoolHiddenFishIndex] = useState<number | null>(null);
  const transitionRafRef = useRef<number | null>(null);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const shared = useKoiCaptureSharedState(width);
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

  const defaultTargetDiameter = Math.min(koiRect.w, koiRect.h) * BUBBLE_DIAMETER_RATIO;
  const defaultTargetCenterX = koiRect.x + koiRect.w * 0.5;
  const defaultTargetCenterY = koiRect.y + koiRect.h * 0.5;
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
    selection != null,
    requestReleaseWorklet,
  );

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release) => {
      soundsRef.current?.playBubblePop();
      startBurstRaw(intent);
    },
    [startBurstRaw],
  );

  const captureState = useMemo<KoiCaptureSharedState>(
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

  const sim = useKoiFishSimulation({
    width,
    height,
    koiRect,
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

  useKoiEscapeFlow({
    ...shared,
    width,
    height,
    koiRect,
    orientation,
    layoutKey,
    targetCenterX,
    targetCenterY,
    phase,
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
    selection != null && capturedEntry != null ? (
      <KoiCaptureOverlay
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
    ) : null;

  useKoiRuntimeBridge({
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

      const positions = sim.sharedPositions.value;
      const originX = positions[fishIndex * 2] ?? 0;
      const originY = positions[fishIndex * 2 + 1] ?? 0;

      handleFishSelect(word, fishIndex, originX, originY);
      return true;
    },
    [getFishIndexForWord, handleFishSelect, sim.sharedPositions],
  );

  const dispatchEscapeTo = useCallback(
    (targetX: number, targetY: number, hitIdx = -1) => {
      handleMatchSuccess(targetX, targetY, hitIdx);
    },
    [handleMatchSuccess],
  );

  return {
    sim,
    selection,
    poolHiddenFishIndex,
    eliminatedFishIndices,
    eliminatedFishSv,
    handleFishSelect,
    handleMatchSuccess,
    getFishIndexForWord,
    armCaptureByWord,
    dispatchEscapeTo,
  };
}
