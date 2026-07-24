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
  ROAMER_BUTTERFLY_WING_STRETCH_GAIN,
  ROAMER_BUTTERFLY_WING_THIN_GAIN,
  ROAMER_BUTTERFLY_WING_LENGTH,
  ROAMER_BUTTERFLY_WING_WIDTH,
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
  const bodyW = bodyImage.width();
  const bodyH = bodyImage.height();
  const leftWingW = leftWingImage.width();
  const leftWingH = leftWingImage.height();
  const rightWingW = rightWingImage.width();
  const rightWingH = rightWingImage.height();

  const halfW = (bodyW * bodyScale) / 2;
  const halfH = (bodyH * bodyScale) / 2;

  const leftWingEffLen = ROAMER_BUTTERFLY_WING_LENGTH * (1 + wingLeftFlap * ROAMER_BUTTERFLY_WING_STRETCH_GAIN);
  const leftWingEffW = ROAMER_BUTTERFLY_WING_WIDTH * (1 - wingLeftFlap * ROAMER_BUTTERFLY_WING_THIN_GAIN);
  const rightWingEffLen = ROAMER_BUTTERFLY_WING_LENGTH * (1 + wingRightFlap * ROAMER_BUTTERFLY_WING_STRETCH_GAIN);
  const rightWingEffW = ROAMER_BUTTERFLY_WING_WIDTH * (1 - wingRightFlap * ROAMER_BUTTERFLY_WING_THIN_GAIN);

  const cosA = Math.abs(Math.cos(bodyAngle));
  const sinA = Math.abs(Math.sin(bodyAngle));

  const wingSpanX = Math.max(leftWingEffLen, rightWingEffLen) * halfW;
  const wingSpanY = Math.max(leftWingEffW, rightWingEffW) * halfH;

  const rectHalfW = (halfW + wingSpanX) * cosA + (halfH + wingSpanY) * sinA;
  const rectHalfH = (halfW + wingSpanX) * sinA + (halfH + wingSpanY) * cosA;

  const margin = ROAMER_BUTTERFLY_RENDER_BOUNDS_MARGIN;
  const rectX = bodyCenterX - rectHalfW - margin;
  const rectY = bodyCenterY - rectHalfH - margin;
  const rectWidth = Math.max(1, rectHalfW * 2 + margin * 2);
  const rectHeight = Math.max(1, rectHalfH * 2 + margin * 2);

  const uniforms = useMemo(() => ({
    bodyW,
    bodyH,
    bodyCenterX,
    bodyCenterY,
    bodyAngle,
    bodyScale,
    bodyImageW: bodyW,
    bodyImageH: bodyH,
    wingLeftFlap,
    wingRightFlap,
    wingLeftImageW: leftWingW,
    wingLeftImageH: leftWingH,
    wingRightImageW: rightWingW,
    wingRightImageH: rightWingH,
    legVisibility,
    renderMode,
    bodyTint: butterflyUniformDefaults.bodyTint,
    bodyTintStrength: butterflyUniformDefaults.bodyTintStrength,
  }), [
    bodyW, bodyH, bodyCenterX, bodyCenterY, bodyAngle, bodyScale,
    wingLeftFlap, wingRightFlap,
    leftWingW, leftWingH, rightWingW, rightWingH,
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
          width={bodyW}
          height={bodyH}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={leftWingImage}
          x={0}
          y={0}
          width={leftWingW}
          height={leftWingH}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={rightWingImage}
          x={0}
          y={0}
          width={rightWingW}
          height={rightWingH}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}
