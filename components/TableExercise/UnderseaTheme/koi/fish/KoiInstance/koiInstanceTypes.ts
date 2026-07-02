import type { SharedValue } from 'react-native-reanimated';

export type KoiFishState = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  amplitude: SharedValue<number>;
  turnArc: SharedValue<number>;
  wavePhase: SharedValue<number>;
  finSquashLeft: SharedValue<number>;
  finSquashRight: SharedValue<number>;
  finVariantLeft: SharedValue<number>;
  finVariantRight: SharedValue<number>;
};

export type KoiTailFlexSettings = {
  tailBendScale: number;
  tailTipBendScale: number;
  headBendScale: number;
};

export type KoiTurnDistortSettings = {
  squashGain: number;
  bulgeGain: number;
};

export type KoiRenderBaseProps = {
  image: import('@shopify/react-native-skia').SkImage;
  maskImage: import('@shopify/react-native-skia').SkImage;
  overlayMaskImage: import('@shopify/react-native-skia').SkImage;
  spotColor: readonly [number, number, number];
  bodyColor: readonly [number, number, number];
  bodyTintStrength: number;
  overlayColor: readonly [number, number, number];
  overlayStrength: number;
  swimZoneX: number;
  swimZoneY: number;
  swimZoneW: number;
  swimZoneH: number;
  fishW: number;
  fishH: number;
  sourceAngle?: number;
  tailFlex: KoiTailFlexSettings;
  turnDistort: KoiTurnDistortSettings;
  phase: number;
  state: KoiFishState;
  /** Multiplier applied to fishW/fishH each frame (e.g. bubble capture scale). */
  fishWScale?: SharedValue<number>;
  /** When true, render bounds follow the fish anywhere on screen (escape mode). */
  freeBounds?: SharedValue<boolean>;
};

export type KoiInstanceProps = KoiRenderBaseProps;

export type KoiShadowInstanceProps = KoiRenderBaseProps & {
  offsetX?: number | SharedValue<number>;
  offsetY?: number | SharedValue<number>;
  shadowColor?: readonly [number, number, number];
  shadowOpacity?: number;
  shadowSoftness?: number;
};

export type KoiBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type KoiUniforms = {
  swimZoneX: number;
  swimZoneY: number;
  swimZoneW: number;
  swimZoneH: number;
  fishX: number;
  fishY: number;
  fishW: number;
  fishH: number;
  fishAngle: number;
  sourceAngle: number;
  waveAmplitude: number;
  tailBendScale: number;
  tailTipBendScale: number;
  headBendScale: number;
  wavePhase: number;
  phase: number;
  turnArc: number;
  finSquashLeft: number;
  finSquashRight: number;
  finVariantLeft: number;
  finVariantRight: number;
  imageWidth: number;
  imageHeight: number;
  renderMode: number;
  shadowColor: [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
  spotColor: [number, number, number];
  bodyColor: [number, number, number];
  bodyTintStrength: number;
  overlayColor: [number, number, number];
  overlayStrength: number;
};

export type KoiShaderRectProps = KoiRenderBaseProps & {
  centerXOffset?: number | SharedValue<number>;
  centerYOffset?: number | SharedValue<number>;
  renderMode: number;
  shadowColor: readonly [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
};
