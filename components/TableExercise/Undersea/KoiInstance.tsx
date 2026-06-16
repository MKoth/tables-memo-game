import React from 'react';
import {
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import {
  KOI_BODY_FIT_SCALE,
  KOI_FIN_OUTER,
  KOI_FISH_DEFORM_SKSL,
  koiFishDeformUniformDefaults,
} from '../../../shaders/koiFishDeform.sksl';

function compileKoiEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(KOI_FISH_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile koi fish deform shader');
  }
  return effect;
}

const koiEffect = compileKoiEffect();

const {
  shadowColor: defaultShadowColor,
  shadowOpacity: defaultShadowOpacity,
  shadowSoftness: defaultShadowSoftness,
} = koiFishDeformUniformDefaults;

const defaultShadowColorUniform = [...defaultShadowColor] as [number, number, number];

/** Extra px around the analytic fish AABB so bent fins/tails are not clipped. */
const RENDER_BOUNDS_MARGIN = 10;

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

type KoiRenderBaseProps = {
  image: SkImage;
  maskImage: SkImage;
  overlayMaskImage: SkImage;
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
};

export type KoiInstanceProps = KoiRenderBaseProps;

function computeKoiBounds(
  swimZoneX: number,
  swimZoneY: number,
  swimZoneW: number,
  swimZoneH: number,
  fishW: number,
  fishH: number,
  tailBendScale: number,
  tailTipBendScale: number,
  headBendScale: number,
  squashGain: number,
  bulgeGain: number,
  state: KoiFishState,
  centerX: number,
  centerY: number,
  margin: number,
  penumbraPx: number,
) {
  'worklet';
  const turnT = Math.abs(state.turnArc.value);
  const fishWAdj = fishW / (1 + turnT * squashGain);
  const fishHAdj = fishH * (1 + turnT * bulgeGain);
  const maxWaveDisp =
    Math.abs(state.amplitude.value) * (tailBendScale + tailTipBendScale + headBendScale);
  const bendMargin = Math.abs(state.turnArc.value) + maxWaveDisp;
  const basePerpExtent = 0.5 / KOI_BODY_FIT_SCALE;
  const perpLimit = Math.max(basePerpExtent, 0.5 + bendMargin);
  const halfAlong = fishWAdj * 0.5;
  const halfPerp = fishHAdj * Math.max(perpLimit, KOI_FIN_OUTER + 0.02);
  const angle = state.angle.value;
  const cosA = Math.abs(Math.cos(angle));
  const sinA = Math.abs(Math.sin(angle));
  const halfW = halfAlong * cosA + halfPerp * sinA;
  const halfH = halfAlong * sinA + halfPerp * cosA;
  const totalMargin = margin + penumbraPx;

  const minX = Math.max(swimZoneX, centerX - halfW - totalMargin);
  const minY = Math.max(swimZoneY, centerY - halfH - totalMargin);
  const maxX = Math.min(swimZoneX + swimZoneW, centerX + halfW + totalMargin);
  const maxY = Math.min(swimZoneY + swimZoneH, centerY + halfH + totalMargin);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildKoiUniforms(
  swimZoneX: number,
  swimZoneY: number,
  swimZoneW: number,
  swimZoneH: number,
  fishW: number,
  fishH: number,
  sourceAngle: number,
  tailBendScale: number,
  tailTipBendScale: number,
  headBendScale: number,
  squashGain: number,
  bulgeGain: number,
  phase: number,
  state: KoiFishState,
  imageWidth: number,
  imageHeight: number,
  fishX: number,
  fishY: number,
  renderMode: number,
  shadowColor: [number, number, number],
  shadowOpacity: number,
  shadowSoftness: number,
  spotColor: [number, number, number],
  bodyColor: [number, number, number],
  bodyTintStrength: number,
  overlayColor: [number, number, number],
  overlayStrength: number,
) {
  'worklet';
  const turnT = Math.abs(state.turnArc.value);
  const fishWAdj = fishW / (1 + turnT * squashGain);
  const fishHAdj = fishH * (1 + turnT * bulgeGain);

  return {
    swimZoneX,
    swimZoneY,
    swimZoneW,
    swimZoneH,
    fishX,
    fishY,
    fishW: fishWAdj,
    fishH: fishHAdj,
    fishAngle: state.angle.value,
    sourceAngle,
    waveAmplitude: state.amplitude.value,
    tailBendScale,
    tailTipBendScale,
    headBendScale,
    wavePhase: state.wavePhase.value,
    phase,
    turnArc: state.turnArc.value,
    finSquashLeft: state.finSquashLeft.value,
    finSquashRight: state.finSquashRight.value,
    finVariantLeft: state.finVariantLeft.value,
    finVariantRight: state.finVariantRight.value,
    imageWidth,
    imageHeight,
    renderMode,
    shadowColor,
    shadowOpacity,
    shadowSoftness,
    spotColor,
    bodyColor,
    bodyTintStrength,
    overlayColor,
    overlayStrength,
  };
}

type KoiShaderRectProps = KoiRenderBaseProps & {
  centerXOffset: number;
  centerYOffset: number;
  renderMode: number;
  shadowColor: readonly [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
};

function KoiShaderRect({
  image,
  maskImage,
  overlayMaskImage,
  spotColor,
  bodyColor,
  bodyTintStrength,
  overlayColor,
  overlayStrength,
  swimZoneX,
  swimZoneY,
  swimZoneW,
  swimZoneH,
  fishW,
  fishH,
  sourceAngle = koiFishDeformUniformDefaults.sourceAngle,
  tailFlex,
  turnDistort,
  phase,
  state,
  centerXOffset,
  centerYOffset,
  renderMode,
  shadowColor,
  shadowOpacity,
  shadowSoftness,
}: KoiShaderRectProps) {
  const imageWidth = image.width();
  const imageHeight = image.height();
  const maskWidth = maskImage.width();
  const maskHeight = maskImage.height();
  const overlayMaskWidth = overlayMaskImage.width();
  const overlayMaskHeight = overlayMaskImage.height();
  const shadowColorUniform = [...shadowColor] as [number, number, number];
  const spotColorUniform = [...spotColor] as [number, number, number];
  const bodyColorUniform = [...bodyColor] as [number, number, number];
  const overlayColorUniform = [...overlayColor] as [number, number, number];

  const bounds = useDerivedValue(() => {
    const centerX = state.x.value + centerXOffset;
    const centerY = state.y.value + centerYOffset;
    const turnT = Math.abs(state.turnArc.value);
    const fishHAdj = fishH * (1 + turnT * turnDistort.bulgeGain);
    const penumbraPx = renderMode > 0.5 ? shadowSoftness * fishHAdj * 0.8 : 0;
    return computeKoiBounds(
      swimZoneX,
      swimZoneY,
      swimZoneW,
      swimZoneH,
      fishW,
      fishH,
      tailFlex.tailBendScale,
      tailFlex.tailTipBendScale,
      tailFlex.headBendScale,
      turnDistort.squashGain,
      turnDistort.bulgeGain,
      state,
      centerX,
      centerY,
      RENDER_BOUNDS_MARGIN,
      penumbraPx,
    );
  });

  const uniforms = useDerivedValue(() =>
    buildKoiUniforms(
      swimZoneX,
      swimZoneY,
      swimZoneW,
      swimZoneH,
      fishW,
      fishH,
      sourceAngle,
      tailFlex.tailBendScale,
      tailFlex.tailTipBendScale,
      tailFlex.headBendScale,
      turnDistort.squashGain,
      turnDistort.bulgeGain,
      phase,
      state,
      imageWidth,
      imageHeight,
      state.x.value + centerXOffset,
      state.y.value + centerYOffset,
      renderMode,
      shadowColorUniform,
      shadowOpacity,
      shadowSoftness,
      spotColorUniform,
      bodyColorUniform,
      bodyTintStrength,
      overlayColorUniform,
      overlayStrength,
    ),
  );

  return (
    <Rect rect={bounds}>
      <Shader source={koiEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={0}
          y={0}
          width={imageWidth}
          height={imageHeight}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={maskImage}
          x={0}
          y={0}
          width={maskWidth}
          height={maskHeight}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={overlayMaskImage}
          x={0}
          y={0}
          width={overlayMaskWidth}
          height={overlayMaskHeight}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}

export function KoiInstance(props: KoiInstanceProps) {
  return (
    <KoiShaderRect
      {...props}
      centerXOffset={0}
      centerYOffset={0}
      renderMode={0}
      shadowColor={defaultShadowColor}
      shadowOpacity={defaultShadowOpacity}
      shadowSoftness={0}
    />
  );
}

export type KoiShadowInstanceProps = KoiRenderBaseProps & {
  offsetX: number;
  offsetY: number;
  shadowColor?: readonly [number, number, number];
  shadowOpacity?: number;
  shadowSoftness?: number;
};

export function KoiShadowInstance({
  offsetX,
  offsetY,
  shadowColor = defaultShadowColor,
  shadowOpacity = defaultShadowOpacity,
  shadowSoftness = defaultShadowSoftness,
  ...props
}: KoiShadowInstanceProps) {
  return (
    <KoiShaderRect
      {...props}
      centerXOffset={offsetX}
      centerYOffset={offsetY}
      renderMode={1}
      shadowColor={shadowColor}
      shadowOpacity={shadowOpacity}
      shadowSoftness={shadowSoftness}
    />
  );
}
