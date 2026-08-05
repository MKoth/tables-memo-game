import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  type SkImage,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import {
  BushShaderBushRect,
} from './BushShaderLayer/BushShaderLayer';
import type { BushConfig } from './BushShaderLayer/types';
import {
  pickStemList,
  resolveSceneryShadowStyle,
} from './SceneryShadowLayer/pickSceneryShadowUniforms';
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

// TEMP EXPERIMENT: flat circle shadows, no leaves, no blur
const SIMPLE_BUD_SHADOW_RADIUS_FRACTION = 0.4;
const SIMPLE_STEM_SHADOW_RADIUS_SCALE = 3;
const SIMPLE_SHADOW_OFFSET_X = 3;
const SIMPLE_SHADOW_OFFSET_Y_TOP = 90;
const SIMPLE_SHADOW_OFFSET_Y_BOTTOM = 4;

type SimpleBudShadowProps = {
  index: number;
  radius: number;
  color: string;
  height: number;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
};

function SimpleBudShadow({
  index,
  radius,
  color,
  height,
  layoutX,
  layoutY,
}: SimpleBudShadowProps) {
  const cx = useDerivedValue(() => (layoutX.value[index] ?? 0) + SIMPLE_SHADOW_OFFSET_X);
  const cy = useDerivedValue(() => {
    const y = layoutY.value[index] ?? 0;
    const t = Math.min(Math.max(height > 0 ? y / height : 0, 0), 1);
    const offsetY =
      SIMPLE_SHADOW_OFFSET_Y_TOP * (1 - t) + SIMPLE_SHADOW_OFFSET_Y_BOTTOM * t;
    return y + offsetY;
  });
  return <Circle cx={cx} cy={cy} r={radius} color={color} />;
}

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
  const budShadows = useMemo(() => {
    return roseBellSizes.map((size, i) => ({
      index: i,
      radius: size * SIMPLE_BUD_SHADOW_RADIUS_FRACTION,
    }));
  }, [roseBellSizes]);
  const shadowColor = useMemo(() => {
    const [r, g, b] = resolved.shadowColor;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${resolved.shadowOpacity})`;
  }, [resolved]);

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
        <Circle
          key={`shadow-stem-${i}`}
          cx={slot.baseX + SIMPLE_SHADOW_OFFSET_X}
          cy={slot.baseY + SIMPLE_SHADOW_OFFSET_Y_BOTTOM}
          r={slot.baseWidth * SIMPLE_STEM_SHADOW_RADIUS_SCALE}
          color={shadowColor}
        />
      ))}
      {budShadows.map(bud => (
        <SimpleBudShadow
          key={`shadow-rose-${bud.index}`}
          index={bud.index}
          radius={bud.radius}
          color={shadowColor}
          height={height}
          layoutX={layoutX}
          layoutY={layoutY}
        />
      ))}
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
