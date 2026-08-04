import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { AtlasRegion } from '../core/assets/textureAtlas/packTextureAtlas';
import { CloudPatch } from './CloudPatch';
import { createOrbCloudLayerConfig } from './orbCloudPresets';
import { useOrbCloudLayer } from './useOrbCloudLayer';

export type CaptureOrbCloudLayerProps = {
  centerX: number;
  centerY: number;
  diameter: number;
  phase: SharedValue<number>;
  atlas: SkImage | null;
  regions: ReadonlyArray<AtlasRegion>;
};

export function CaptureOrbCloudLayer({
  centerX,
  centerY,
  diameter,
  phase,
  atlas,
  regions,
}: CaptureOrbCloudLayerProps) {
  const { width, height } = useWindowDimensions();

  const config = useMemo(
    () => createOrbCloudLayerConfig({ centerX, centerY, diameter, imageCount: regions.length }),
    [centerX, centerY, diameter, regions.length],
  );

  const { pool, layerOpacity } = useOrbCloudLayer(config, phase);

  if (width === 0 || height === 0 || atlas == null || regions.length === 0) {
    return null;
  }

  const patches = [];
  for (let i = 0; i < config.patchCount; i++) {
    patches.push(<CloudPatch key={i} index={i} pool={pool} atlas={atlas} regions={regions} />);
  }

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group opacity={layerOpacity}>{patches}</Group>
    </Canvas>
  );
}
