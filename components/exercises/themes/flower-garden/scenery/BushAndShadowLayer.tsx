import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  type SkImage,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import {
  BushShaderBushRect,
} from './BushShaderLayer/BushShaderLayer';
import type { BushConfig } from './BushShaderLayer/types';
import {
  pickRoseStaticUniforms,
  pickStemList,
  resolveSceneryShadowStyle,
} from './SceneryShadowLayer/pickSceneryShadowUniforms';
import { RoseShadowLayer } from './SceneryShadowLayer/RoseShadowLayer';
import { StemShadowRect } from './SceneryShadowLayer/StemShadowRect';
import type { SceneryShadowStyle } from './SceneryShadowLayer/types';

export type BushAndShadowLayerProps = {
  bushConfigs: readonly BushConfig[];
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
  layoutScale: SharedValue<number[]> | null;
  roseBellSizes: readonly number[];
  stemImage: SkImage;
  calyxImage: SkImage;
  leafAtlas: SkImage;
  style?: SceneryShadowStyle;
};

function BushAndShadowLayerImpl({
  bushConfigs,
  layoutX,
  layoutY,
  layoutScale,
  roseBellSizes,
  stemImage,
  calyxImage,
  leafAtlas,
  style,
}: BushAndShadowLayerProps) {
  const { width, height } = useWindowDimensions();

  const resolved = useMemo(() => resolveSceneryShadowStyle(style), [style]);
  const stems = useMemo(() => pickStemList(bushConfigs, style), [
    bushConfigs,
    style,
  ]);
  const roseStatic = useMemo(
    () => pickRoseStaticUniforms(style, bushConfigs, roseBellSizes.length),
    [style, bushConfigs, roseBellSizes.length],
  );

  if (width === 0 || height === 0) return null;
  if (
    layoutX == null ||
    layoutY == null ||
    layoutScale == null
  ) {
    return null;
  }
  if (bushConfigs.length === 0) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {stems.map((slot, i) => (
        <StemShadowRect
          key={`shadow-stem-${i}`}
          slot={slot}
          layoutX={layoutX}
          layoutY={layoutY}
          style={resolved}
        />
      ))}
      <RoseShadowLayer
        staticUniforms={roseStatic}
        roseRadiusFraction={resolved.roseRadiusFraction}
        layoutX={layoutX}
        layoutY={layoutY}
        bodySizes={roseBellSizes}
        width={width}
        height={height}
      />
      {bushConfigs.map(bush => (
        <BushShaderBushRect
          key={`bush-${bush.bushId}`}
          bush={bush}
          layoutX={layoutX}
          layoutY={layoutY}
          layoutScale={layoutScale}
          roseBellSizes={roseBellSizes}
          stemImage={stemImage}
          calyxImage={calyxImage}
          leafAtlas={leafAtlas}
        />
      ))}
    </Canvas>
  );
}

export const BushAndShadowLayer = React.memo(BushAndShadowLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
