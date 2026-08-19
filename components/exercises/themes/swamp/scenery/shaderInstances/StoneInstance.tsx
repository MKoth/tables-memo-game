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
import {
  MAX_WAVES,
  MAX_WAVES_PER_SPRITE,
} from '../../shaders/waterWaves';

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
  waveCenters: SharedValue<number[]>;
  waveRadii: SharedValue<number[]>;
  waveStrengths: SharedValue<number[]>;
  waveWidths: SharedValue<number[]>;
  waveCount: SharedValue<number>;
  waveDecay: number;
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
  waveCenters: allWaveCenters,
  waveRadii: allWaveRadii,
  waveStrengths: allWaveStrengths,
  waveWidths: allWaveWidths,
  waveCount: allWaveCount,
  waveDecay: stoneWaveDecay,
}: StoneInstanceProps) {
  const uniforms = useDerivedValue(() => {
    'worklet';
    const iTime = clock.value / 1000;
    const spriteX = x + width * 0.5;
    const spriteY = y + height * 0.5;
    const totalWaves = Math.min(allWaveCount.value, MAX_WAVES);
    const centers = allWaveCenters.value;
    const radii = allWaveRadii.value;
    const strengths = allWaveStrengths.value;
    const widths = allWaveWidths.value;

    const scored: { idx: number; distSq: number }[] = [];
    for (let i = 0; i < totalWaves; i++) {
      const cx = centers[i * 2];
      const cy = centers[i * 2 + 1];
      const dx = cx - spriteX;
      const dy = cy - spriteY;
      scored.push({ idx: i, distSq: dx * dx + dy * dy });
    }
    scored.sort((a, b) => a.distSq - b.distSq);
    const closest = scored.slice(0, MAX_WAVES_PER_SPRITE);

    const waveCentersArr: number[] = Array(MAX_WAVES_PER_SPRITE * 2).fill(0);
    const waveRadiiArr: number[] = Array(MAX_WAVES_PER_SPRITE).fill(0);
    const waveStrengthsArr: number[] = Array(MAX_WAVES_PER_SPRITE).fill(0);
    const waveWidthsArr: number[] = Array(MAX_WAVES_PER_SPRITE).fill(0);

    for (let i = 0; i < closest.length; i++) {
      const src = closest[i]!.idx;
      waveCentersArr[i * 2] = centers[src * 2];
      waveCentersArr[i * 2 + 1] = centers[src * 2 + 1];
      waveRadiiArr[i] = radii[src];
      waveStrengthsArr[i] = strengths[src];
      waveWidthsArr[i] = widths[src];
    }

    return {
      iTime,
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
      waveCenters: waveCentersArr,
      waveRadii: waveRadiiArr,
      waveStrengths: waveStrengthsArr,
      waveWidths: waveWidthsArr,
      waveCount: closest.length,
      waveDecay: stoneWaveDecay,
    };
  });

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
