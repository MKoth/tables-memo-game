import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import {
  useUnderseaThemeAssetsContext,
  useUnderseaThemeLayout,
} from '../../../core';
import { KoiFishLayer } from '../../../koi/fish/KoiFishLayer';
import { useKoiCaptureSharedState } from '../../../koi/KoiSwimZone/hooks/useKoiCaptureSharedState';
import { useBubbleAnimation } from '../../../koi/bubbles/useBubbleAnimation';
import {
  useKoiFishSimulation,
  type KoiCaptureSharedState,
} from '../../../koi/simulation/useKoiFishSimulation';
import { BUBBLE_DIAMETER_RATIO } from '../../../koi/KoiSwimZone/types';

const MATCH_KOI_Z = 3;

export type MatchKoiLayerProps = {
  words: string[];
  zIndex?: number;
};

export function MatchKoiLayer({ words, zIndex = MATCH_KOI_Z }: MatchKoiLayerProps) {
  const { width, height } = useWindowDimensions();
  const layout = useUnderseaThemeLayout();
  const { images: assetImages } = useUnderseaThemeAssetsContext();
  const images = assetImages.koi;
  const masks = assetImages.koiMasks;

  const swimRect = useMemo(
    () => ({ x: 0, y: 0, w: width, h: height }),
    [width, height],
  );

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
    eliminatedFishSv,
  } = shared;

  const bubbleConfig = useMemo(
    () => ({
      originX: 0,
      originY: 0,
      targetCenterX: width * 0.5,
      targetCenterY: height * 0.5,
      targetDiameter: Math.min(width, height) * BUBBLE_DIAMETER_RATIO,
    }),
    [width, height],
  );

  const { anim, phase, enterProgress } = useBubbleAnimation(
    bubbleConfig,
    () => {},
    false,
    () => {},
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
      capturedFishIndexSv,
      captureOriginXSv,
      captureOriginYSv,
      enterProgress,
      escapeActiveSv,
      escapeCompleteTriggeredSv,
      escapeExitEdgeSv,
      escapeOverlayDismissTriggeredSv,
      escapeStageSv,
      escapeTargetXSv,
      escapeTargetYSv,
      offScreenTargetXSv,
      offScreenTargetYSv,
      phase,
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

  const handleFishSelect = (_word: string, _fishIndex: number, _originX: number, _originY: number) => {};

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, zIndex != null && { zIndex }]}
      pointerEvents="box-none">
      <KoiFishLayer
        sim={sim}
        images={images}
        masks={masks}
        interactive
        onFishSelect={handleFishSelect}
      />
    </View>
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
