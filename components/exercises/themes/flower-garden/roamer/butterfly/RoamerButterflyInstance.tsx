import React, { useMemo } from 'react';
import {
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkRuntimeEffect,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  BUTTERFLY_SKSL,
  butterflyUniformDefaults,
} from '../../shaders/butterfly.sksl';
import {
  ROAMER_BUTTERFLY_BODY_LENGTH,
  ROAMER_BUTTERFLY_BODY_THICKNESS,
  ROAMER_BUTTERFLY_WING_STRETCH_GAIN,
  ROAMER_BUTTERFLY_WING_THIN_GAIN,
  ROAMER_BUTTERFLY_WING_LENGTH_RATIO,
  ROAMER_BUTTERFLY_WING_WIDTH_RATIO,
  ROAMER_BUTTERFLY_RENDER_BOUNDS_MARGIN,
} from './config/butterflySettings';

function compileButterflyEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(BUTTERFLY_SKSL);
  if (!effect) {
    throw new Error('Failed to compile butterfly shader');
  }
  return effect;
}

const butterflyEffect = compileButterflyEffect();

export type RoamerButterflyInstanceProps = {
  bodyCenterX: number;
  bodyCenterY: number;
  bodyAngle: number;
  bodyScale: number;
  wingLeftFlap: number;
  wingRightFlap: number;
  legVisibility: number;
  renderMode: number;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
};

export function RoamerButterflyInstance({
  bodyCenterX,
  bodyCenterY,
  bodyAngle,
  bodyScale,
  wingLeftFlap,
  wingRightFlap,
  legVisibility,
  renderMode,
  bodyImage,
  leftWingImage,
  rightWingImage,
}: RoamerButterflyInstanceProps) {
  const bodyDisplayW = ROAMER_BUTTERFLY_BODY_LENGTH * bodyScale;
  const bodyDisplayH = ROAMER_BUTTERFLY_BODY_THICKNESS * bodyScale;
  const bodyImageW = bodyImage.width();
  const bodyImageH = bodyImage.height();
  const leftWingImageW = leftWingImage.width();
  const leftWingImageH = leftWingImage.height();
  const rightWingImageW = rightWingImage.width();
  const rightWingImageH = rightWingImage.height();

  const halfW = bodyDisplayW / 2;
  const halfH = bodyDisplayH / 2;

  const leftWingEffLen = halfW * ROAMER_BUTTERFLY_WING_LENGTH_RATIO * (1 + wingLeftFlap * ROAMER_BUTTERFLY_WING_STRETCH_GAIN);
  const leftWingEffW = halfH * ROAMER_BUTTERFLY_WING_WIDTH_RATIO * (1 - wingLeftFlap * ROAMER_BUTTERFLY_WING_THIN_GAIN);
  const rightWingEffLen = halfW * ROAMER_BUTTERFLY_WING_LENGTH_RATIO * (1 + wingRightFlap * ROAMER_BUTTERFLY_WING_STRETCH_GAIN);
  const rightWingEffW = halfH * ROAMER_BUTTERFLY_WING_WIDTH_RATIO * (1 - wingRightFlap * ROAMER_BUTTERFLY_WING_THIN_GAIN);

  const cosA = Math.abs(Math.cos(bodyAngle));
  const sinA = Math.abs(Math.sin(bodyAngle));

  const wingSpanX = Math.max(leftWingEffLen, rightWingEffLen);
  const wingSpanY = Math.max(leftWingEffW, rightWingEffW);

  const rectHalfW = (halfW + wingSpanX) * cosA + (halfH + wingSpanY) * sinA;
  const rectHalfH = (halfW + wingSpanX) * sinA + (halfH + wingSpanY) * cosA;

  const margin = ROAMER_BUTTERFLY_RENDER_BOUNDS_MARGIN;
  const rectX = bodyCenterX - rectHalfW - margin;
  const rectY = bodyCenterY - rectHalfH - margin;
  const rectWidth = Math.max(1, rectHalfW * 2 + margin * 2);
  const rectHeight = Math.max(1, rectHalfH * 2 + margin * 2);

  const uniforms = useMemo(() => ({
    bodyW: bodyDisplayW,
    bodyH: bodyDisplayH,
    bodyCenterX,
    bodyCenterY,
    bodyAngle,
    bodyScale,
    bodyImageW: bodyImageW,
    bodyImageH: bodyImageH,
    wingLeftFlap,
    wingRightFlap,
    wingLeftImageW: leftWingImageW,
    wingLeftImageH: leftWingImageH,
    wingRightImageW: rightWingImageW,
    wingRightImageH: rightWingImageH,
    legVisibility,
    renderMode,
    bodyTint: butterflyUniformDefaults.bodyTint,
    bodyTintStrength: butterflyUniformDefaults.bodyTintStrength,
  }), [
    bodyDisplayW, bodyDisplayH, bodyCenterX, bodyCenterY, bodyAngle, bodyScale,
    bodyImageW, bodyImageH,
    wingLeftFlap, wingRightFlap,
    leftWingImageW, leftWingImageH, rightWingImageW, rightWingImageH,
    legVisibility, renderMode,
  ]);

  const rect = useMemo(() => ({
    x: rectX,
    y: rectY,
    width: rectWidth,
    height: rectHeight,
  }), [rectX, rectY, rectWidth, rectHeight]);

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
