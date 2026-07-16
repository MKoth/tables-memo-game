import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../../core';
import { RoamerFishLayer } from '../roamerFish/RoamerFishLayer';
import { useBubbleAnimation } from '../bubbles/useBubbleAnimation';
import { BUBBLE_DIAMETER_RATIO } from '../RoamerSwimZone/types';
import { useRoamerCaptureSharedState } from '../RoamerSwimZone/hooks/useRoamerCaptureSharedState';
import {
  useRoamerFishSimulation,
  type RoamerCaptureSharedState,
} from '../simulation/useRoamerFishSimulation';

/** Decorative fish count for the sentence transformation exercise. */
export const DECORATIVE_ROAMER_COUNT = 8;

export type DecorativeRoamerLayerProps = {
  zIndex?: number;
  fishCount?: number;
};

export function DecorativeRoamerLayer({
  zIndex = 2,
  fishCount = DECORATIVE_ROAMER_COUNT,
}: DecorativeRoamerLayerProps) {
  const { width, height } = useWindowDimensions();
  const layout = useExerciseLayout();
  const { images: assetImages } = useUnderseaThemeAssetsContext();
  const images = assetImages.roamer;
  const masks = assetImages.roamerMasks;

  const swimRect = useMemo(
    () => ({ x: 0, y: 0, w: width, h: height }),
    [width, height],
  );
  const words = useMemo(
    () => Array.from({ length: fishCount }, (_, index) => `__decorative_${index}`),
    [fishCount],
  );

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

  const sim = useRoamerFishSimulation({
    width,
    height,
    roamerRect: swimRect,
    layoutKey: layout.layoutKey,
    words,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeOverlayDismiss: () => {},
    onEscapeComplete: () => {},
  });

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, zIndex != null && { zIndex }]}
      pointerEvents="none">
      <RoamerFishLayer
        sim={sim}
        images={images}
        masks={masks}
        interactive={false}
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
