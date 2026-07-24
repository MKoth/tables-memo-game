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
  BUTTERFLY_SKSL,
  butterflyUniformDefaults,
} from '../../shaders/butterfly.sksl';
import {
  ROAMER_BUTTERFLY_BODY_LENGTH,
  ROAMER_BUTTERFLY_BODY_THICKNESS,
  ROAMER_BUTTERFLY_RENDER_BOUNDS_MARGIN,
  ROAMER_BUTTERFLY_WING_LENGTH_RATIO,
  ROAMER_BUTTERFLY_WING_STRETCH_GAIN,
} from './config/butterflySettings';

function compileButterflyEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(BUTTERFLY_SKSL);
  if (!effect) {
    throw new Error('Failed to compile butterfly shader');
  }
  return effect;
}

const butterflyEffect = compileButterflyEffect();

const bodyTintUniform: number[] = [1, 1, 1];

export type RoamerButterflyInstanceProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  wingPhase: SharedValue<number>;
  renderMode: number;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
};

export function RoamerButterflyInstance({
  x,
  y,
  angle,
  wingPhase,
  renderMode,
  bodyImage,
  leftWingImage,
  rightWingImage,
}: RoamerButterflyInstanceProps) {
  const bodyImageW = bodyImage.width();
  const bodyImageH = bodyImage.height();
  const leftWingImageW = leftWingImage.width();
  const leftWingImageH = leftWingImage.height();
  const rightWingImageW = rightWingImage.width();
  const rightWingImageH = rightWingImage.height();
  const leftWingAspect = leftWingImageW / leftWingImageH;
  const rightWingAspect = rightWingImageW / rightWingImageH;

  const rect = useDerivedValue(() => {
    const bodyScale = 1;
    const bodyDisplayW = ROAMER_BUTTERFLY_BODY_LENGTH * bodyScale;
    const bodyDisplayH = ROAMER_BUTTERFLY_BODY_THICKNESS * bodyScale;
    const halfW = bodyDisplayW / 2;
    const halfH = bodyDisplayH / 2;

    const wingFlap = Math.sin(wingPhase.value);
    const contract = 1 - Math.abs(wingFlap) * ROAMER_BUTTERFLY_WING_STRETCH_GAIN;
    const leftWingEffLen = halfW * ROAMER_BUTTERFLY_WING_LENGTH_RATIO * 0.25 * contract;
    const rightWingEffLen = halfW * ROAMER_BUTTERFLY_WING_LENGTH_RATIO * 0.25 * contract;
    const wingHalfH = halfH * 1.2;

    const bodyAngle = angle.value;
    const cosA = Math.abs(Math.cos(bodyAngle));
    const sinA = Math.abs(Math.sin(bodyAngle));

    const wingSpanX = Math.max(leftWingEffLen, rightWingEffLen);
    const wingSpanY = wingHalfH;

    const rectHalfW = (halfW + wingSpanX) * cosA + (halfH + wingSpanY) * sinA;
    const rectHalfH = (halfW + wingSpanX) * sinA + (halfH + wingSpanY) * cosA;

    const margin = ROAMER_BUTTERFLY_RENDER_BOUNDS_MARGIN;
    return {
      x: x.value - rectHalfW - margin,
      y: y.value - rectHalfH - margin,
      width: Math.max(1, rectHalfW * 2 + margin * 2),
      height: Math.max(1, rectHalfH * 2 + margin * 2),
    };
  });

  const uniforms = useDerivedValue(() => {
    const wingFlap = Math.sin(wingPhase.value);
    return {
      bodyW: ROAMER_BUTTERFLY_BODY_LENGTH,
      bodyH: ROAMER_BUTTERFLY_BODY_THICKNESS,
      bodyCenterX: x.value,
      bodyCenterY: y.value,
      bodyAngle: angle.value,
      bodyScale: 1,
      bodyImageW: bodyImageW,
      bodyImageH: bodyImageH,
      wingLeftFlap: wingFlap,
      wingRightFlap: wingFlap,
      wingLeftImageW: leftWingImageW,
      wingLeftImageH: leftWingImageH,
      wingRightImageW: rightWingImageW,
      wingRightImageH: rightWingImageH,
      wingLeftAspect: leftWingAspect,
      wingRightAspect: rightWingAspect,
      legVisibility: 0,
      renderMode,
      bodyTint: bodyTintUniform,
      bodyTintStrength: butterflyUniformDefaults.bodyTintStrength,
    };
  });

  return (
    <Rect rect={rect}>
      <Shader source={butterflyEffect} uniforms={uniforms}>
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
