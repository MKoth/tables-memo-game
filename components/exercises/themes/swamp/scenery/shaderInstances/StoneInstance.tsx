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
import { MAX_WAVES, singleWaveDefaults } from '../../shaders/waterWaves';

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

const {
  waveSpeed: stoneWaveSpeed,
  waveWidth: stoneWaveWidth,
  waveStrength: stoneWaveStrengthBase,
  waveDecay: stoneWaveDecay,
  waveDuration: stoneWaveDuration,
} = singleWaveDefaults;

// Tweakable: number of simultaneous waves to display (1..MAX_WAVES). Change to
// experiment with 1 vs 4 vs 8 vs 32 overlapping lenses.
// Limit is MAX_WAVES in waterWaves.ts — bump that first if you want >8.
// Set to 0 to disable wave lens entirely.
const DEMO_WAVE_COUNT = 4;
// Stagger was fixed 0.95s, which aliases when waveCount >> duration/stagger.
// Now distributed evenly: stagger = duration / waveCount
const DEMO_WAVE_STAGGER_SEC = 0.95;

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
  const uniforms = useDerivedValue(() => {
    'worklet';
    const iTime = clock.value / 1000;
    const waveCount = Math.max(0, Math.min(DEMO_WAVE_COUNT, MAX_WAVES));
    const waveCenters: number[] = Array(MAX_WAVES * 2).fill(0);
    const waveRadii: number[] = Array(MAX_WAVES).fill(0);
    const waveStrengths: number[] = Array(MAX_WAVES).fill(0);
    const waveWidths: number[] = Array(MAX_WAVES).fill(0);
    const durationSec = stoneWaveDuration / 1000;
    const stagger = waveCount > 1 ? durationSec / waveCount : DEMO_WAVE_STAGGER_SEC;
    for (let w = 0; w < waveCount; w++) {
      const cx = screenWidth * (0.15 + ((w * 0.37) % 0.7));
      const cy = screenHeight * (0.2 + ((w * 0.53) % 0.6));
      waveCenters[w * 2] = cx;
      waveCenters[w * 2 + 1] = cy;
      const offsetTime = iTime + w * stagger;
      const cyc = offsetTime % durationSec;
      waveRadii[w] = cyc * stoneWaveSpeed;
      waveStrengths[w] = stoneWaveStrengthBase;
      waveWidths[w] = stoneWaveWidth;
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
      waveCenters,
      waveRadii,
      waveStrengths,
      waveWidths,
      waveCount,
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
