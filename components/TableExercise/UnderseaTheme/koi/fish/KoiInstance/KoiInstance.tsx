import React from 'react';
import {
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import {
  KOI_FISH_DEFORM_SKSL,
  koiFishDeformUniformDefaults,
} from '../../../shaders/koiFishDeform.sksl';
import { RENDER_BOUNDS_MARGIN } from '../../config/koiInstanceConfig';
import {
  buildKoiUniforms,
  computeKoiBounds,
  readAnimNumber,
} from './koiRenderWorklets';
import type {
  KoiInstanceProps,
  KoiShaderRectProps,
  KoiShadowInstanceProps,
} from './koiInstanceTypes';

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
  fishWScale,
  freeBounds,
  centerXOffset = 0,
  centerYOffset = 0,
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
    const scale = fishWScale?.value ?? 1;
    const scaledFishW = fishW * scale;
    const scaledFishH = fishH * scale;
    const centerX = state.x.value + readAnimNumber(centerXOffset);
    const centerY = state.y.value + readAnimNumber(centerYOffset);
    const turnT = Math.abs(state.turnArc.value);
    const fishHAdj = scaledFishH * (1 + turnT * turnDistort.bulgeGain);
    const penumbraPx = renderMode > 0.5 ? shadowSoftness * fishHAdj * 0.8 : 0;
    return computeKoiBounds(
      swimZoneX,
      swimZoneY,
      swimZoneW,
      swimZoneH,
      scaledFishW,
      scaledFishH,
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
      !(freeBounds?.value ?? false),
    );
  });

  const uniforms = useDerivedValue(() => {
    const scale = fishWScale?.value ?? 1;
    const scaledFishW = fishW * scale;
    const scaledFishH = fishH * scale;
    return buildKoiUniforms(
      swimZoneX,
      swimZoneY,
      swimZoneW,
      swimZoneH,
      scaledFishW,
      scaledFishH,
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
      state.x.value + readAnimNumber(centerXOffset),
      state.y.value + readAnimNumber(centerYOffset),
      renderMode,
      shadowColorUniform,
      shadowOpacity,
      shadowSoftness,
      spotColorUniform,
      bodyColorUniform,
      bodyTintStrength,
      overlayColorUniform,
      overlayStrength,
    );
  });

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

export function KoiShadowInstance({
  offsetX = 0,
  offsetY = 0,
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

export type {
  KoiFishState,
  KoiInstanceProps,
  KoiShadowInstanceProps,
  KoiTailFlexSettings,
  KoiTurnDistortSettings,
} from './koiInstanceTypes';
