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
  MAX_STONE_VORONOI_LAYERS,
  STONE_SKSL,
  stoneDefaults,
} from '../../shaders/stone.sksl';

function compileStoneEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(STONE_SKSL);
  if (!effect) {
    throw new Error('Failed to compile stone shader');
  }
  return effect;
}

const stoneEffect = compileStoneEffect();

function padArray(arr: readonly number[], fill = 0): number[] {
  return [...arr, ...Array(Math.max(0, MAX_STONE_VORONOI_LAYERS - arr.length)).fill(fill)];
}

function padTintChannel(
  tints: readonly (readonly [number, number, number])[],
  channel: 0 | 1 | 2,
  fill = 1,
): number[] {
  return padArray(
    tints.map(t => t[channel]),
    fill,
  );
}

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
  shadowStrength,
  shadowStart,
  shadowEnd,
  wobbleFreq,
  wobbleAmp,
  wobbleSpeed,
} = stoneDefaults;

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
  shadowStrength?: number;
  clock: SharedValue<number>;
};

export function StoneInstance({
  image,
  x,
  y,
  width,
  height,
  screenWidth,
  screenHeight,
  shadowStrength: shadowStrengthProp = shadowStrength,
  clock,
}: StoneInstanceProps) {
  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1000,
    iResolution: [screenWidth, screenHeight] as [number, number],
    switchRate,
    floorX: x,
    floorY: y,
    floorW: width,
    floorH: height,
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
    shadowStrength: shadowStrengthProp,
    shadowStart,
    shadowEnd,
    aspectRatio: width / height,
    wobbleFreq,
    wobbleAmp,
    wobbleSpeed,
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
