import React, { useMemo } from 'react';
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
  MAX_STONE_VORONOI_LAYERS,
  STONE_UNDERWATER_SKSL,
  stoneUnderwaterDefaults,
} from '../../shaders/stoneUnderwater.sksl';
import {
  SPRITE_SHADOW_SKSL,
  spriteShadowDefaults,
} from '../../shaders/spriteShadow.sksl';

function compileStoneEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(STONE_UNDERWATER_SKSL);
  if (!effect) {
    throw new Error('Failed to compile stone underwater shader');
  }
  return effect;
}

const stoneEffect = compileStoneEffect();

function compileStoneShadowEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(SPRITE_SHADOW_SKSL);
  if (!effect) {
    throw new Error('Failed to compile sprite shadow shader');
  }
  return effect;
}

const stoneShadowEffect = compileStoneShadowEffect();

const {
  switchRate,
  underwaterTint,
  underwaterTintStrength,
  underwaterDepthStrength,
  voronoiCount,
  voronoiScale,
  voronoiIntensity,
  voronoiSharpness,
  voronoiClusterAmp,
  voronoiClusterFreq,
  voronoiTint,
  beamAngle,
  beamIntensity,
  beamSharpness,
  beamDistortion,
  beamSpeed,
  beamPhase,
  beamTint,
  shadowStrength,
  shadowStart,
  shadowEnd,
} = stoneUnderwaterDefaults;

function padArray(arr: readonly number[], fill = 0): number[] {
  return [...arr, ...Array(Math.max(0, MAX_STONE_VORONOI_LAYERS - arr.length)).fill(fill)];
}

function padTintChannel(
  tints: readonly (readonly [number, number, number])[],
  channel: 0 | 1 | 2,
  fill = 1,
): number[] {
  return padArray(
    tints.map((t) => t[channel]),
    fill,
  );
}

const paddedVoronoiScale = padArray(voronoiScale);
const paddedVoronoiIntensity = padArray(voronoiIntensity);
const paddedVoronoiSharpness = padArray(voronoiSharpness);
const paddedVoronoiClusterAmp = padArray(voronoiClusterAmp);
const paddedVoronoiClusterFreq = padArray(voronoiClusterFreq);
const paddedVoronoiTintR = padTintChannel(voronoiTint, 0);
const paddedVoronoiTintG = padTintChannel(voronoiTint, 1);
const paddedVoronoiTintB = padTintChannel(voronoiTint, 2);
const underwaterTintUniform = [...underwaterTint] as [number, number, number];

export type StoneInstanceProps = {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
  screenWidth: number;
  screenHeight: number;
  beamAngle?: number;
  beamIntensity?: number;
  beamSharpness?: number;
  beamDistortion?: number;
  beamSpeed?: number;
  beamPhase?: number;
  beamTint?: readonly [number, number, number];
  shadowStrength?: number;
  clock: SharedValue<number>;
};

export type StoneShadowInstanceProps = {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional override for shadow offset in pixels. */
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
      <Shader source={stoneShadowEffect} uniforms={uniforms}>
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

export function StoneInstance({
  image,
  x,
  y,
  width,
  height,
  screenWidth,
  screenHeight,
  beamAngle: beamAngleProp = beamAngle,
  beamIntensity: beamIntensityProp = beamIntensity,
  beamSharpness: beamSharpnessProp = beamSharpness,
  beamDistortion: beamDistortionProp = beamDistortion,
  beamSpeed: beamSpeedProp = beamSpeed,
  beamPhase: beamPhaseProp = beamPhase,
  beamTint: beamTintProp = beamTint,
  shadowStrength: shadowStrengthProp = shadowStrength,
  clock,
}: StoneInstanceProps) {
  const beamTintUniform = [...beamTintProp] as [number, number, number];

  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1000,
    iResolution: [screenWidth, screenHeight] as [number, number],
    switchRate,
    stoneX: x,
    stoneY: y,
    stoneW: width,
    stoneH: height,
    underwaterTint: underwaterTintUniform,
    underwaterTintStrength,
    underwaterDepthStrength,
    voronoiCount,
    voronoiScale: paddedVoronoiScale,
    voronoiIntensity: paddedVoronoiIntensity,
    voronoiSharpness: paddedVoronoiSharpness,
    voronoiClusterAmp: paddedVoronoiClusterAmp,
    voronoiClusterFreq: paddedVoronoiClusterFreq,
    voronoiTintR: paddedVoronoiTintR,
    voronoiTintG: paddedVoronoiTintG,
    voronoiTintB: paddedVoronoiTintB,
    beamAngle: beamAngleProp,
    beamIntensity: beamIntensityProp,
    beamSharpness: beamSharpnessProp,
    beamDistortion: beamDistortionProp,
    beamSpeed: beamSpeedProp,
    beamPhase: beamPhaseProp,
    beamTint: beamTintUniform,
    shadowStrength: shadowStrengthProp,
    shadowStart,
    shadowEnd,
  }));

  return (
    <Rect x={x} y={y} width={width} height={height}>
      <Shader source={stoneEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={x}
          y={y}
          width={width}
          height={height}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}
