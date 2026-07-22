import type { SharedValue } from 'react-native-reanimated';
import type { SkImage } from '@shopify/react-native-skia';
import type { BushConfig } from '../BushShaderLayer/types';

export type SceneryShadowStyle = {
  lightOffset?: readonly [number, number];
  shadowColor?: readonly [number, number, number];
  shadowOpacity?: number;
  shadowSoftness?: number;
  roseRadiusFraction?: number;
  stemShadowWidthScale?: number;
  stemShadowTopSkew?: number;
  stemShadowTopBlur?: number;
};

export type SceneryShadowLayerProps = {
  bushConfigs: readonly BushConfig[];
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
  bodySizes: readonly number[];
  style?: SceneryShadowStyle;
  offscreenScale?: number;
  offscreenImage?: SharedValue<SkImage | null>;
};
