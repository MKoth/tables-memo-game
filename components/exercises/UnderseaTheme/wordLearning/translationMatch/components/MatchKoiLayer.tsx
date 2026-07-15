import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  useUnderseaThemeAssetsContext,
  useUnderseaThemeLayout,
} from '../../../core';
import type { UnderseaThemeSoundController } from '../../../core/assets/useUnderseaThemeSounds';
import { KoiFishLayer } from '../../../koi/fish/KoiFishLayer';
import { KoiCaptureOverlay } from '../../../koi/capture/KoiCaptureOverlay';
import {
  BubblePhase,
  BurstIntent,
  useBubbleAnimation,
} from '../../../koi/bubbles/useBubbleAnimation';
import type { KeepOutDisk } from '../domain/jellyfishRoaming';
import { useKoiCaptureSharedState } from '../../../koi/KoiSwimZone/hooks/useKoiCaptureSharedState';
import type {
  KoiCaptureSharedState,
  KoiFishSimulation,
} from '../../../koi/simulation/useKoiFishSimulation';
import {
  useKoiFishSimulation,
} from '../../../koi/simulation/useKoiFishSimulation';
import { BUBBLE_DIAMETER_RATIO } from '../../../koi/KoiSwimZone/types';
import { releaseCapturedFishWorklet } from '../../../koi/capture/releaseFishToPool';
import type { MatchSessionController } from '../domain/matchSessionController';
import type { KoiTapData } from '../jellyfish/useCombinedMatchGestures';

const MATCH_KOI_Z = 3;
const MATCH_BUBBLE_Z = 5;

export type MatchKoiLayerProps = {
  words: string[];
  sounds?: UnderseaThemeSoundController;
  sessionController?: MatchSessionController;
  triggerEscapeRef?: React.MutableRefObject<(() => void) | null>;
  tapDataRef?: React.MutableRefObject<KoiTapData | null>;
  interactive?: boolean;
  keepOutDiskSv?: SharedValue<KeepOutDisk | null>;
};

export function MatchKoiLayer({
  words,
  sounds,
  sessionController,
  triggerEscapeRef,
  tapDataRef,
  interactive = true,
  keepOutDiskSv,
}: MatchKoiLayerProps) {
  const { width, height } = useWindowDimensions();
  const layout = useUnderseaThemeLayout();
  const { images: assetImages } = useUnderseaThemeAssetsContext();
  const images = assetImages.koi;
  const masks = assetImages.koiMasks;

  const [selection, setSelection] = useState<{
    word: string;
    fishIndex: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [poolHiddenFishIndex, setPoolHiddenFishIndex] = useState<number | null>(
    null,
  );
  const transitionRafRef = useRef<number | null>(null);
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const shared = useKoiCaptureSharedState(width);
  const {
    capturedFishIndexSv,
    captureOriginXSv,
    captureOriginYSv,
    releaseRequestSv,
    releaseContextSv,
    eliminatedFishSv,
    escapeActiveSv,
    escapeStageSv,
    escapeTargetXSv,
    escapeTargetYSv,
    offScreenTargetXSv,
    offScreenTargetYSv,
    escapeExitEdgeSv,
    escapeCompleteTriggeredSv,
    escapeOverlayDismissTriggeredSv,
  } = shared;

  const swimRect = useMemo(
    () => ({ x: 0, y: 0, w: width, h: height }),
    [width, height],
  );

  const cancelTransitionRaf = useCallback(() => {
    if (transitionRafRef.current != null) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelTransitionRaf(), [cancelTransitionRaf]);

  const targetCenterX = width * 0.5;
  const targetCenterY = height * 0.5;
  const targetDiameter = Math.min(width, height) * BUBBLE_DIAMETER_RATIO;

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

  const simRef = useRef<KoiFishSimulation>(null!);

  const handleBurstEnd = useCallback(
    (intent: number) => {
      if (intent === BurstIntent.Escape) {
        return;
      }
      sessionController?.release();
      cancelTransitionRaf();
      setPoolHiddenFishIndex(null);
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setSelection(null);
      });
    },
    [cancelTransitionRaf, sessionController],
  );

  const {
    anim,
    phase,
    enterProgress,
    startBurst: startBurstRaw,
  } = useBubbleAnimation(
    bubbleConfig,
    handleBurstEnd,
    selection != null,
    requestReleaseWorklet,
  );

  useAnimatedReaction(
    () => phase.value,
    (currentPhase, prevPhase) => {
      if (keepOutDiskSv == null) {
        return;
      }
      if (currentPhase === BubblePhase.Idle) {
        keepOutDiskSv.value = {
          centerX: targetCenterX,
          centerY: targetCenterY,
          radius: targetDiameter * 1.0,
        };
      } else if (prevPhase != null && prevPhase === BubblePhase.Idle && currentPhase !== BubblePhase.Idle) {
        keepOutDiskSv.value = null;
      }
    },
    [keepOutDiskSv, targetCenterX, targetCenterY, targetDiameter],
  );

  const startBurst = useCallback(
    (intent: (typeof BurstIntent)[keyof typeof BurstIntent] = BurstIntent.Release) => {
      soundsRef.current?.playBubblePop();
      startBurstRaw(intent);
    },
    [startBurstRaw],
  );

  if (triggerEscapeRef) {
    triggerEscapeRef.current = () => {
      const margin = 400;
      const edge = Math.floor(Math.random() * 4);
      let tx: number;
      let ty: number;
      switch (edge) {
        case 0:
          tx = width * 0.5;
          ty = -margin;
          break;
        case 1:
          tx = width * 0.5;
          ty = height + margin;
          break;
        case 2:
          tx = -margin;
          ty = height * 0.5;
          break;
        default:
          tx = width + margin;
          ty = height * 0.5;
          break;
      }
      escapeTargetXSv.value = tx;
      escapeTargetYSv.value = ty;
      offScreenTargetXSv.value = tx;
      offScreenTargetYSv.value = ty;
      escapeExitEdgeSv.value = edge;
      escapeStageSv.value = 1;
      escapeCompleteTriggeredSv.value = false;
      escapeOverlayDismissTriggeredSv.value = false;
      escapeActiveSv.value = true;
      startBurst(BurstIntent.Escape);
    };
  }

  const captureState = useMemo<KoiCaptureSharedState>(
    () => ({
      capturedFishIndex: capturedFishIndexSv,
      captureOriginX: captureOriginXSv,
      captureOriginY: captureOriginYSv,
      bubbleAnim: anim,
      bubblePhase: phase,
      enterProgress,
      escapeActive: shared.escapeActiveSv,
      escapeStage: shared.escapeStageSv,
      escapeTargetX: shared.escapeTargetXSv,
      escapeTargetY: shared.escapeTargetYSv,
      offScreenTargetX: shared.offScreenTargetXSv,
      offScreenTargetY: shared.offScreenTargetYSv,
      escapeExitEdge: shared.escapeExitEdgeSv,
      escapeCompleteTriggered: shared.escapeCompleteTriggeredSv,
      escapeOverlayDismissTriggered: shared.escapeOverlayDismissTriggeredSv,
    }),
    [
      anim,
      capturedFishIndexSv,
      captureOriginXSv,
      captureOriginYSv,
      enterProgress,
      phase,
      shared.escapeActiveSv,
      shared.escapeCompleteTriggeredSv,
      shared.escapeExitEdgeSv,
      shared.escapeOverlayDismissTriggeredSv,
      shared.escapeStageSv,
      shared.escapeTargetXSv,
      shared.escapeTargetYSv,
      shared.offScreenTargetXSv,
      shared.offScreenTargetYSv,
    ],
  );

  const handleEscapeOverlayDismiss = useCallback(() => {
    cancelTransitionRaf();
    transitionRafRef.current = requestAnimationFrame(() => {
      transitionRafRef.current = null;
      setSelection(null);
    });
  }, [cancelTransitionRaf]);

  const handleEscapeComplete = useCallback(() => {
    const fishIndex = capturedFishIndexSv.value;
    if (fishIndex >= 0) {
      const current = eliminatedFishSv.value;
      if (!current.includes(fishIndex)) {
        eliminatedFishSv.value = [...current, fishIndex];
      }
    }
    escapeActiveSv.value = false;
    escapeStageSv.value = 0;
    escapeCompleteTriggeredSv.value = false;
    escapeOverlayDismissTriggeredSv.value = false;
    capturedFishIndexSv.value = -1;
    phase.value = BubblePhase.None;
    cancelTransitionRaf();
    setPoolHiddenFishIndex(null);
    transitionRafRef.current = requestAnimationFrame(() => {
      transitionRafRef.current = null;
      setSelection(null);
    });
  }, [
    cancelTransitionRaf,
    capturedFishIndexSv,
    eliminatedFishSv,
    escapeActiveSv,
    escapeCompleteTriggeredSv,
    escapeOverlayDismissTriggeredSv,
    escapeStageSv,
    phase,
  ]);

  const sim = useKoiFishSimulation({
    width,
    height,
    koiRect: swimRect,
    layoutKey: layout.layoutKey,
    words,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss: handleEscapeOverlayDismiss,
    onEscapeComplete: handleEscapeComplete,
  });

  releaseContextSv.value = {
    runtimeEntries: sim.runtimeEntries,
    sharedPositions: sim.sharedPositions,
    captureState,
  };
  simRef.current = sim;

  const handleFishSelect = useCallback(
    (word: string, fishIndex: number, originX: number, originY: number) => {
      if (sessionController != null) {
        const captured = sessionController.captureFish(fishIndex, word);
        if (!captured) {
          return;
        }
      }

      cancelTransitionRaf();
      soundsRef.current?.playBubbleInflate();
      sim.armCapture(fishIndex, originX, originY);
      setPoolHiddenFishIndex(null);
      setSelection({ word, fishIndex, originX, originY });
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setPoolHiddenFishIndex(fishIndex);
      });
    },
    [cancelTransitionRaf, sessionController, sim],
  );

  if (tapDataRef) {
    tapDataRef.current = {
      positionsSv: sim.sharedPositions,
      count: sim.runtimeEntries.length,
      hitRadius: sim.hitRadius,
      eliminatedFishSv,
      words,
      onFishSelect: handleFishSelect,
      bubbleAnim: anim,
      bubblePhase: phase,
      escapeActiveSv: shared.escapeActiveSv,
      startBurst,
    };
  }

  const capturedEntry =
    selection != null ? sim.runtimeEntries[selection.fishIndex] : null;

  const bubbleOverlay =
    selection != null && capturedEntry != null ? (
      <KoiCaptureOverlay
        selection={selection}
        capturedEntry={capturedEntry}
        anim={anim}
        phase={phase}
        escapeActive={shared.escapeActiveSv}
        escapeOverlayActive={false}
        startBurst={startBurst}
        targetDiameter={targetDiameter}
        images={images}
        masks={masks}
        renderProps={sim.renderProps}
      />
    ) : null;

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <>
      <View
        style={[styles.container, { zIndex: MATCH_KOI_Z }]}
        pointerEvents="box-none">
        <KoiFishLayer
          sim={sim}
          images={images}
          masks={masks}
          interactive={interactive}
          capturedFishIndex={poolHiddenFishIndex}
          onFishSelect={handleFishSelect}
        />
      </View>
      {bubbleOverlay != null && (
        <View
          style={[styles.container, { zIndex: MATCH_BUBBLE_Z }]}
          pointerEvents="box-none">
          {bubbleOverlay}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'visible',
  },
});
