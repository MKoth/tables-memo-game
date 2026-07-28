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
  BUMBLEBEE_SKSL,
  bumblebeeUniformDefaults,
} from '../../shaders/bumblebee.sksl';
import {
  BUMBLEBEE_BODY_LENGTH,
  BUMBLEBEE_BODY_THICKNESS,
  BUMBLEBEE_RENDER_BOUNDS_MARGIN,
  BUMBLEBEE_WING_PHASE1_ANGLE,
  BUMBLEBEE_WING_PHASE2_ANGLE,
  BUMBLEBEE_SIT_WING_FOLD_ANGLE,
  BUMBLEBEE_WING_TRANSPARENCY,
  BUMBLEBEE_WING_LENGTH,
  BUMBLEBEE_WING_THICKNESS,
  BUMBLEBEE_SHADOW_OFFSET_SITTING_X,
  BUMBLEBEE_SHADOW_OFFSET_SITTING_Y,
  BUMBLEBEE_SHADOW_OFFSET_FLYING_X,
  BUMBLEBEE_SHADOW_OFFSET_FLYING_Y,
  BUMBLEBEE_SHADOW_SIZE_SITTING,
  BUMBLEBEE_SHADOW_SIZE_FLYING,
  BUMBLEBEE_SHADOW_OPACITY_SITTING,
  BUMBLEBEE_SHADOW_OPACITY_FLYING,
} from './config/bumblebeeSettings';

function compileBumblebeeEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(BUMBLEBEE_SKSL);
  if (!effect) {
    throw new Error('Failed to compile bumblebee shader');
  }
  return effect;
}

const bumblebeeEffect = compileBumblebeeEffect();

const bodyTintUniform: number[] = [1, 1, 1];

export type BumblebeeInstanceProps = {
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

export function BumblebeeInstance({
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
}: BumblebeeInstanceProps) {
  const bodyImageW = bodyImage.width();
  const bodyImageH = bodyImage.height();
  const leftWingImageW = leftWingImage.width();
  const leftWingImageH = leftWingImage.height();
  const rightWingImageW = rightWingImage.width();
  const rightWingImageH = rightWingImage.height();

  const rect = useDerivedValue(() => {
    const bs = bodyScale.value;
    const bodyDisplayW = BUMBLEBEE_BODY_LENGTH * bs;
    const bodyDisplayH = BUMBLEBEE_BODY_THICKNESS * bs;
    const halfW = bodyDisplayW / 2;
    const halfH = bodyDisplayH / 2;

    const bodyAngle = angle.value;
    const cosA = Math.abs(Math.cos(bodyAngle));
    const sinA = Math.abs(Math.sin(bodyAngle));

    const rectHalfW = halfW * cosA + halfH * sinA + BUMBLEBEE_WING_LENGTH * bs;
    const rectHalfH = halfW * sinA + halfH * cosA + BUMBLEBEE_WING_THICKNESS * bs;

    const isSitting = renderMode > 0.5;
    const shadowOffX = isSitting
      ? BUMBLEBEE_SHADOW_OFFSET_SITTING_X
      : BUMBLEBEE_SHADOW_OFFSET_FLYING_X;
    const shadowOffY = isSitting
      ? BUMBLEBEE_SHADOW_OFFSET_SITTING_Y
      : BUMBLEBEE_SHADOW_OFFSET_FLYING_Y;
    const shadowSz = isSitting
      ? BUMBLEBEE_SHADOW_SIZE_SITTING
      : BUMBLEBEE_SHADOW_SIZE_FLYING;

    const shadowOffsetExtra = Math.abs(shadowOffX) + Math.abs(shadowOffY);
    const shadowScaleExtra =
      Math.max(rectHalfW, rectHalfH) * Math.max(0, shadowSz - 1);

    const margin =
      BUMBLEBEE_RENDER_BOUNDS_MARGIN + shadowOffsetExtra + shadowScaleExtra;
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
      ? BUMBLEBEE_SIT_WING_FOLD_ANGLE
      : BUMBLEBEE_WING_PHASE1_ANGLE + normalizedPhase * (BUMBLEBEE_WING_PHASE2_ANGLE - BUMBLEBEE_WING_PHASE1_ANGLE);
    const wingTransparency = isSitting ? 1 : BUMBLEBEE_WING_TRANSPARENCY;

    const legPhasesAdvanced = legPhases.map((sv, i) =>
      Math.sin(sv.value + spawnLegPhaseOffsets[i]!),
    );
    return {
      bodyW: BUMBLEBEE_BODY_LENGTH,
      bodyH: BUMBLEBEE_BODY_THICKNESS,
      bodyCenterX: x.value,
      bodyCenterY: y.value,
      bodyAngle: angle.value,
      bodyScale: bodyScale.value,
      bodyImageW: bodyImageW,
      bodyImageH: bodyImageH,
      wingLeftAngle: wingAngle,
      wingRightAngle: wingAngle,
      wingLength: BUMBLEBEE_WING_LENGTH,
      wingThickness: BUMBLEBEE_WING_THICKNESS,
      wingTransparency,
      wingLeftImageW: leftWingImageW,
      wingLeftImageH: leftWingImageH,
      wingRightImageW: rightWingImageW,
      wingRightImageH: rightWingImageH,
      legVisibility: legVisibility.value,
      legPhasesAdvanced,
      renderMode,
      bodyTint: bodyTintUniform,
      bodyTintStrength: bumblebeeUniformDefaults.bodyTintStrength,
      shadowOffsetX: isSitting
        ? BUMBLEBEE_SHADOW_OFFSET_SITTING_X
        : BUMBLEBEE_SHADOW_OFFSET_FLYING_X,
      shadowOffsetY: isSitting
        ? BUMBLEBEE_SHADOW_OFFSET_SITTING_Y
        : BUMBLEBEE_SHADOW_OFFSET_FLYING_Y,
      shadowSize: isSitting
        ? BUMBLEBEE_SHADOW_SIZE_SITTING
        : BUMBLEBEE_SHADOW_SIZE_FLYING,
      shadowOpacity: isSitting
        ? BUMBLEBEE_SHADOW_OPACITY_SITTING
        : BUMBLEBEE_SHADOW_OPACITY_FLYING,
    };
  });

  return (
    <Rect rect={rect}>
      <Shader source={bumblebeeEffect} uniforms={uniforms}>
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
