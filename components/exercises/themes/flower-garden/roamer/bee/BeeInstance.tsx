import React from 'react';
import {
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkRuntimeEffect,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import {
  BEE_SKSL,
  beeUniformDefaults,
} from '../../shaders/bee.sksl';
import {
  BEE_BODY_LENGTH,
  BEE_BODY_THICKNESS,
  BEE_RENDER_BOUNDS_MARGIN,
  BEE_WING_PHASE1_ANGLE,
  BEE_WING_PHASE2_ANGLE,
  BEE_SIT_WING_FOLD_ANGLE,
  BEE_WING_TRANSPARENCY,
  BEE_WING_LENGTH,
  BEE_WING_THICKNESS,
  BEE_SHADOW_OFFSET_SITTING_X,
  BEE_SHADOW_OFFSET_SITTING_Y,
  BEE_SHADOW_OFFSET_FLYING_X,
  BEE_SHADOW_OFFSET_FLYING_Y,
  BEE_SHADOW_SIZE_SITTING,
  BEE_SHADOW_SIZE_FLYING,
  BEE_SHADOW_OPACITY_SITTING,
  BEE_SHADOW_OPACITY_FLYING,
} from './config/beeSettings';

function compileBeeEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(BEE_SKSL);
  if (!effect) {
    throw new Error('Failed to compile bee shader');
  }
  return effect;
}

const beeEffect = compileBeeEffect();

const bodyTintUniform: number[] = [1, 1, 1];

export type BeeInstanceProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  wingPhase: SharedValue<number>;
  bodyScale: SharedValue<number>;
  renderMode: number;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
  legPhases: SharedValue<number>[];
  legVisibility: SharedValue<number>;
  spawnLegPhaseOffsets: number[];
};

export function BeeInstance({
  x,
  y,
  angle,
  wingPhase,
  bodyScale,
  renderMode,
  bodyImage,
  leftWingImage,
  rightWingImage,
  legPhases,
  legVisibility,
  spawnLegPhaseOffsets,
}: BeeInstanceProps) {
  const bodyImageW = bodyImage.width();
  const bodyImageH = bodyImage.height();
  const leftWingImageW = leftWingImage.width();
  const leftWingImageH = leftWingImage.height();
  const rightWingImageW = rightWingImage.width();
  const rightWingImageH = rightWingImage.height();

  const rect = useDerivedValue(() => {
    const bs = bodyScale.value;
    const bodyDisplayW = BEE_BODY_LENGTH * bs;
    const bodyDisplayH = BEE_BODY_THICKNESS * bs;
    const halfW = bodyDisplayW / 2;
    const halfH = bodyDisplayH / 2;

    const bodyAngle = angle.value;
    const cosA = Math.abs(Math.cos(bodyAngle));
    const sinA = Math.abs(Math.sin(bodyAngle));

    const rectHalfW = halfW * cosA + halfH * sinA + BEE_WING_LENGTH * bs;
    const rectHalfH = halfW * sinA + halfH * cosA + BEE_WING_THICKNESS * bs;

    const isSitting = renderMode > 0.5;
    const shadowOffX = isSitting
      ? BEE_SHADOW_OFFSET_SITTING_X
      : BEE_SHADOW_OFFSET_FLYING_X;
    const shadowOffY = isSitting
      ? BEE_SHADOW_OFFSET_SITTING_Y
      : BEE_SHADOW_OFFSET_FLYING_Y;
    const shadowSz = isSitting
      ? BEE_SHADOW_SIZE_SITTING
      : BEE_SHADOW_SIZE_FLYING;

    const shadowOffsetExtra = Math.abs(shadowOffX) + Math.abs(shadowOffY);
    const shadowScaleExtra =
      Math.max(rectHalfW, rectHalfH) * Math.max(0, shadowSz - 1);

    const margin =
      BEE_RENDER_BOUNDS_MARGIN + shadowOffsetExtra + shadowScaleExtra;
    return {
      x: x.value - rectHalfW - margin,
      y: y.value - rectHalfH - margin,
      width: Math.max(1, rectHalfW * 2 + margin * 2),
      height: Math.max(1, rectHalfH * 2 + margin * 2),
    };
  });

  const uniforms = useDerivedValue(() => {
    const isSitting = renderMode > 0.5;
    const normalizedPhase = Math.abs(Math.sin(wingPhase.value));
    const wingAngle = isSitting
      ? BEE_SIT_WING_FOLD_ANGLE
      : BEE_WING_PHASE1_ANGLE + normalizedPhase * (BEE_WING_PHASE2_ANGLE - BEE_WING_PHASE1_ANGLE);
    const wingTransparency = isSitting ? 1 : BEE_WING_TRANSPARENCY;

    const legPhasesAdvanced = legPhases.map((sv, i) =>
      Math.sin(sv.value + spawnLegPhaseOffsets[i]!),
    );
    return {
      bodyW: BEE_BODY_LENGTH,
      bodyH: BEE_BODY_THICKNESS,
      bodyCenterX: x.value,
      bodyCenterY: y.value,
      bodyAngle: angle.value,
      bodyScale: bodyScale.value,
      bodyImageW: bodyImageW,
      bodyImageH: bodyImageH,
      wingLeftAngle: wingAngle,
      wingRightAngle: wingAngle,
      wingLength: BEE_WING_LENGTH,
      wingThickness: BEE_WING_THICKNESS,
      wingTransparency,
      wingLeftImageW: leftWingImageW,
      wingLeftImageH: leftWingImageH,
      wingRightImageW: rightWingImageW,
      wingRightImageH: rightWingImageH,
      legVisibility: legVisibility.value,
      legPhasesAdvanced,
      renderMode,
      bodyTint: bodyTintUniform,
      bodyTintStrength: beeUniformDefaults.bodyTintStrength,
      shadowOffsetX: isSitting
        ? BEE_SHADOW_OFFSET_SITTING_X
        : BEE_SHADOW_OFFSET_FLYING_X,
      shadowOffsetY: isSitting
        ? BEE_SHADOW_OFFSET_SITTING_Y
        : BEE_SHADOW_OFFSET_FLYING_Y,
      shadowSize: isSitting
        ? BEE_SHADOW_SIZE_SITTING
        : BEE_SHADOW_SIZE_FLYING,
      shadowOpacity: isSitting
        ? BEE_SHADOW_OPACITY_SITTING
        : BEE_SHADOW_OPACITY_FLYING,
    };
  });

  return (
    <Rect rect={rect}>
      <Shader source={beeEffect} uniforms={uniforms}>
        <ImageShader
          image={bodyImage}
          x={0}
          y={0}
          width={bodyImageW}
          height={bodyImageH}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={leftWingImage}
          x={0}
          y={0}
          width={leftWingImageW}
          height={leftWingImageH}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={rightWingImage}
          x={0}
          y={0}
          width={rightWingImageW}
          height={rightWingImageH}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}
