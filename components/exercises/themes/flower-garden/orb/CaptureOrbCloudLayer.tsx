import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { CloudPatch } from './CloudPatch';
import { createOrbCloudLayerConfig } from './orbCloudPresets';
import { useOrbCloudLayer } from './useOrbCloudLayer';

export type CaptureOrbCloudLayerProps = {
  centerX: number;
  centerY: number;
  diameter: number;
  phase: SharedValue<number>;
  images: ReadonlyArray<SkImage>;
};

export function CaptureOrbCloudLayer({
  centerX,
  centerY,
  diameter,
  phase,
  images,
}: CaptureOrbCloudLayerProps) {
  const { width, height } = useWindowDimensions();

  const aspects = useMemo(
    () =>
      images.map(image => {
        const imageWidth = image.width();
        const imageHeight = image.height();
        return imageHeight > 0 ? imageWidth / imageHeight : 1;
      }),
    [images],
  );

  const config = useMemo(
    () => createOrbCloudLayerConfig({ centerX, centerY, diameter, imageCount: images.length }),
    [centerX, centerY, diameter, images.length],
  );

  const { pool, layerOpacity } = useOrbCloudLayer(config, phase);

  if (width === 0 || height === 0 || images.length === 0) {
    return null;
  }

  const patches = [];
  for (let i = 0; i < config.patchCount; i++) {
    patches.push(<CloudPatch key={i} index={i} pool={pool} images={images} aspects={aspects} />);
  }

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group opacity={layerOpacity}>{patches}</Group>
    </Canvas>
  );
}
