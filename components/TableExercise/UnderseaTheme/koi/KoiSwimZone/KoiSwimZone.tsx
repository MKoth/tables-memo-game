import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { KoiFishLayer } from '../fish/KoiFishLayer';
import { useKoiCaptureFlow } from './hooks/useKoiCaptureFlow';
import type { KoiSwimZoneProps } from './types';

export type { KoiCaptureBridge, KoiSwimZoneProps } from './types';

export function KoiSwimZone({
  words,
  interactive: interactiveProp = true,
  sounds,
}: KoiSwimZoneProps) {
  const { width, height } = useWindowDimensions();
  const layout = useUnderseaThemeLayout();
  const { koiRect, orientation, layoutKey } = layout;
  const { images: assetImages } = useUnderseaThemeAssetsContext();
  const images = assetImages.koi;
  const masks = assetImages.koiMasks;

  const {
    sim,
    selection,
    poolHiddenFishIndex,
    eliminatedFishIndices,
    eliminatedFishSv,
    handleFishSelect,
  } = useKoiCaptureFlow({
    words,
    width,
    height,
    koiRect,
    orientation,
    layoutKey,
    images,
    masks,
    sounds,
  });

  if (words.length === 0 || width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <KoiFishLayer
        sim={sim}
        images={images}
        masks={masks}
        capturedFishIndex={poolHiddenFishIndex}
        eliminatedFishSv={eliminatedFishSv}
        eliminatedFishIndices={eliminatedFishIndices}
        interactive={interactiveProp && selection === null}
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
