import React, { useMemo } from 'react';
import {
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import {
  SPRITE_SHADOW_SKSL,
  spriteShadowDefaults,
} from '../../shaders/spriteShadow.sksl';

function compileShadowEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(SPRITE_SHADOW_SKSL);
  if (!effect) {
    throw new Error('Failed to compile sprite shadow shader');
  }
  return effect;
}

const shadowEffect = compileShadowEffect();

export type StoneShadowInstanceProps = {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  shadowColor?: readonly [number, number, number];
  shadowOpacity?: number;
  shadowSoftness?: number;
};

export function StoneShadowInstance({
  image,
  x,
  y,
  width,
  height,
  offsetX = spriteShadowDefaults.offset[0],
  offsetY = spriteShadowDefaults.offset[1],
  shadowColor = spriteShadowDefaults.shadowColor,
  shadowOpacity = spriteShadowDefaults.shadowOpacity,
  shadowSoftness = spriteShadowDefaults.shadowSoftness,
}: StoneShadowInstanceProps) {
  const spriteX = x;
  const spriteY = y;
  const spriteW = width;
  const spriteH = height;
  const shadowColorUniform = [...shadowColor] as [number, number, number];

  const bounds = {
    x: spriteX - Math.abs(offsetX) - shadowSoftness * spriteH * 2,
    y: spriteY - Math.abs(offsetY) - shadowSoftness * spriteH * 2,
    width: spriteW + Math.abs(offsetX) * 2 + shadowSoftness * spriteH * 4,
    height: spriteH + Math.abs(offsetY) * 2 + shadowSoftness * spriteH * 4,
  };

  const uniforms = useMemo(
    () => ({
      spriteX,
      spriteY,
      spriteW,
      spriteH,
      offset: [offsetX, offsetY] as [number, number],
      shadowColor: shadowColorUniform,
      shadowOpacity,
      shadowSoftness,
    }),
    [
      spriteX,
      spriteY,
      spriteW,
      spriteH,
      offsetX,
      offsetY,
      shadowColorUniform,
      shadowOpacity,
      shadowSoftness,
    ],
  );

  return (
    <Rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height}>
      <Shader source={shadowEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={spriteX}
          y={spriteY}
          width={spriteW}
          height={spriteH}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}
