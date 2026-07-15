import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import {
  useUnderseaThemeAssetsContext,
  useUnderseaThemeLayout,
} from '../../../core';
import type { UnderseaThemeSoundController } from '../../../core/assets/useUnderseaThemeSounds';
import { KoiFishLayer } from '../../../koi/fish/KoiFishLayer';
import { KoiCaptureOverlay } from '../../../koi/capture/KoiCaptureOverlay';
import {
  BurstIntent,
  useBubbleAnimation,
} from '../../../koi/bubbles/useBubbleAnimation';
import { useKoiCaptureSharedState } from '../../../koi/KoiSwimZone/hooks/useKoiCaptureSharedState';
import type {
  KoiCaptureSharedState,
} from '../../../koi/simulation/useKoiFishSimulation';
import {
  useKoiFishSimulation,
} from '../../../koi/simulation/useKoiFishSimulation';
import { BUBBLE_DIAMETER_RATIO } from '../../../koi/KoiSwimZone/types';
import { releaseCapturedFishWorklet } from '../../../koi/capture/releaseFishToPool';
import type { MatchSessionController } from '../domain/matchSessionController';

const MATCH_KOI_Z = 3;
const MATCH_BUBBLE_Z = 5;

export type MatchKoiLayerProps = {
  words: string[];
  sounds?: UnderseaThemeSoundController;
  sessionController?: MatchSessionController;
  triggerEscapeRef?: React.MutableRefObject<(() => void) | null>;
};

export function MatchKoiLayer({
  words,
  sounds,
  sessionController,
  triggerEscapeRef,
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

  const handleBurstEnd = useCallback(
    (intent: number) => {
      const action =
        intent === BurstIntent.Release ? 'release' : 'escape';
      if (action === 'release') {
        sessionController?.release();
      }
      if (action === 'escape') {
        const sel = selectionRef.current;
        if (sel != null) {
          const current = eliminatedFishSv.value;
          if (!current.includes(sel.fishIndex)) {
            eliminatedFishSv.value = [...current, sel.fishIndex];
          }
        }
      }
      cancelTransitionRaf();
      setPoolHiddenFishIndex(null);
      transitionRafRef.current = requestAnimationFrame(() => {
        transitionRafRef.current = null;
        setSelection(null);
      });
    },
    [cancelTransitionRaf, eliminatedFishSv, sessionController],
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

  const startBurst = useCallback(
    (intent: (typeof BurstIntent)[keyof typeof BurstIntent] = BurstIntent.Release) => {
      soundsRef.current?.playBubblePop();
      startBurstRaw(intent);
    },
    [startBurstRaw],
  );

  if (triggerEscapeRef) {
    triggerEscapeRef.current = () => startBurst(BurstIntent.Escape);
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

  const onEscapeOverlayDismissSv = useSharedValue(false);
  const onEscapeCompleteSv = useSharedValue(false);

  const sim = useKoiFishSimulation({
    width,
    height,
    koiRect: swimRect,
    layoutKey: layout.layoutKey,
    words,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss: () => {
      onEscapeOverlayDismissSv.value = true;
    },
    onEscapeComplete: () => {
      onEscapeCompleteSv.value = true;
    },
  });

  releaseContextSv.value = {
    runtimeEntries: sim.runtimeEntries,
    sharedPositions: sim.sharedPositions,
    captureState,
  };

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
          interactive
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
