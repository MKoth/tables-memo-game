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
import { RENDER_BOUNDS_MARGIN } from '../../config/roamerInstanceConfig';
import {
  buildRoamerUniforms,
  computeRoamerBounds,
  readAnimNumber,
} from './roamerRenderWorklets';
import type {
  RoamerInstanceProps,
  RoamerShaderRectProps,
  RoamerShadowInstanceProps,
} from './roamerInstanceTypes';

function compileRoamerEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(KOI_FISH_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile roamer fish deform shader');
  }
  return effect;
}

const roamerEffect = compileRoamerEffect();

const {
  shadowColor: defaultShadowColor,
  shadowOpacity: defaultShadowOpacity,
  shadowSoftness: defaultShadowSoftness,
} = koiFishDeformUniformDefaults;

function RoamerShaderRect({
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
  fishIndex,
  escapeActive,
  capturedFishIndexSv,
  centerXOffset = 0,
  centerYOffset = 0,
  renderMode,
  shadowColor,
  shadowOpacity,
  shadowSoftness,
}: RoamerShaderRectProps) {
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

  const escapeFreeBounds = useDerivedValue(() => {
    if (
      escapeActive == null ||
      capturedFishIndexSv == null ||
      fishIndex == null
    ) {
      return false;
    }
    return escapeActive.value && capturedFishIndexSv.value === fishIndex;
  });

  const bounds = useDerivedValue(() => {
    const scale = fishWScale?.value ?? 1;
    const scaledFishW = fishW * scale;
    const scaledFishH = fishH * scale;
    const centerX = state.x.value + readAnimNumber(centerXOffset);
    const centerY = state.y.value + readAnimNumber(centerYOffset);
    const turnT = Math.abs(state.turnArc.value);
    const fishHAdj = scaledFishH * (1 + turnT * turnDistort.bulgeGain);
    const penumbraPx = renderMode > 0.5 ? shadowSoftness * fishHAdj * 0.8 : 0;
    const unclamped = (freeBounds?.value ?? false) || escapeFreeBounds.value;
    return computeRoamerBounds(
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
      !unclamped,
    );
  });

  const uniforms = useDerivedValue(() => {
    const scale = fishWScale?.value ?? 1;
    const scaledFishW = fishW * scale;
    const scaledFishH = fishH * scale;
    return buildRoamerUniforms(
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
      <Shader source={roamerEffect} uniforms={uniforms}>
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

export function RoamerInstance(props: RoamerInstanceProps) {
  return (
    <RoamerShaderRect
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

export function RoamerShadowInstance({
  offsetX = 0,
  offsetY = 0,
  shadowColor = defaultShadowColor,
  shadowOpacity = defaultShadowOpacity,
  shadowSoftness = defaultShadowSoftness,
  ...props
}: RoamerShadowInstanceProps) {
  return (
    <RoamerShaderRect
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
  RoamerFishState,
  RoamerInstanceProps,
  RoamerShadowInstanceProps,
  RoamerTailFlexSettings,
  RoamerTurnDistortSettings,
} from './roamerInstanceTypes';
