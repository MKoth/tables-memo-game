import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import {
  pickRoseStaticUniforms,
  pickStemList,
  resolveSceneryShadowStyle,
} from './pickSceneryShadowUniforms';
import { RoseShadowLayer } from './RoseShadowLayer';
import { StemShadowRect } from './StemShadowRect';
import type { SceneryShadowLayerProps } from './types';

function SceneryShadowLayerImpl({
  bushConfigs,
  layoutX,
  layoutY,
  bodySizes,
  style,
}: SceneryShadowLayerProps) {
  const { width, height } = useWindowDimensions();

  const resolved = useMemo(() => resolveSceneryShadowStyle(style), [style]);
  const stems = useMemo(() => pickStemList(bushConfigs, style), [
    bushConfigs,
    style,
  ]);
  const roseStatic = useMemo(
    () => pickRoseStaticUniforms(style, bushConfigs, bodySizes.length),
    [style, bushConfigs, bodySizes.length],
  );

  if (width === 0 || height === 0) return null;
  if (stems.length === 0 && bodySizes.length === 0) return null;

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {stems.map((slot, i) => (
        <StemShadowRect
          key={i}
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
        bodySizes={bodySizes}
        width={width}
        height={height}
      />
    </Canvas>
  );
}

export const SceneryShadowLayer = React.memo(SceneryShadowLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
