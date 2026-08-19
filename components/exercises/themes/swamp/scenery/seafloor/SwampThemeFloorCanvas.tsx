import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useExerciseClock } from '../../../../core';
import {
  MAX_SWAMPFLOOR_VORONOI_LAYERS,
  SWAMPFLOOR_SKSL,
  swampfloorDefaults,
} from '../../shaders/swampfloor.sksl';
import {
  singleWaveDefaults,
  waterWaveLayerMultiplier,
} from '../../shaders/waterWaves';

const BACKGROUND_RES = 0.85;
const DEG_TO_RAD = Math.PI / 180;

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
  floorScale,
  wobbleFreq,
  wobbleAmp,
  wobbleSpeed,
} = swampfloorDefaults;

function padArray(arr: readonly number[], fill = 0): number[] {
  return [...arr, ...Array(Math.max(0, MAX_SWAMPFLOOR_VORONOI_LAYERS - arr.length)).fill(fill)];
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
  waveSpeed: floorWaveSpeed,
  waveWidth: floorWaveWidth,
  waveStrength: floorWaveStrengthBase,
  waveDecay: floorWaveDecay,
  waveMaxRadius: floorWaveMaxRadius,
  waveDuration: floorWaveDuration,
} = singleWaveDefaults;
const floorWaveStrength = floorWaveStrengthBase * waterWaveLayerMultiplier.floor;

function compileSwampFloorEffect() {
  const effect = Skia.RuntimeEffect.Make(SWAMPFLOOR_SKSL);
  if (!effect) {
    throw new Error('Failed to compile swamp floor shader');
  }
  return effect;
}

const swampFloorEffect = compileSwampFloorEffect();

type SwampThemeFloorCanvasProps = {
  image: SkImage;
  width: number;
  height: number;
  clock?: import('react-native-reanimated').SharedValue<number>;
};

export function SwampThemeFloorCanvas({
  image,
  width,
  height,
  clock: clockProp,
}: SwampThemeFloorCanvasProps) {
  const fallbackClock = useExerciseClock();
  const clock = clockProp ?? fallbackClock;
  const bgWidth = Math.max(1, Math.round(width * BACKGROUND_RES));
  const bgHeight = Math.max(1, Math.round(height * BACKGROUND_RES));

  const uniforms = useDerivedValue(() => {
    'worklet';
    const iTime = clock.value / 1000;
    const cycle = iTime % (floorWaveDuration / 1000);
    const rawRadius = cycle * floorWaveSpeed;
    const waveActive = rawRadius <= floorWaveMaxRadius ? 1 : 0;
    return {
      iTime,
      iResolution: [bgWidth, bgHeight] as [number, number],
      switchRate,
      floorX: 0,
      floorY: 0,
      floorW: bgWidth,
      floorH: bgHeight,
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
      shadowStrength,
      shadowStart,
      shadowEnd,
      aspectRatio: bgWidth / bgHeight,
      floorScale,
      wobbleFreq,
      wobbleAmp,
      wobbleSpeed,
      waveCenter: [bgWidth * 0.5, bgHeight * 0.5] as [number, number],
      waveRadius: rawRadius,
      waveStrength: floorWaveStrength,
      waveWidth: floorWaveWidth,
      waveDecay: floorWaveDecay,
      waveActive,
    };
  });

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <Canvas
      style={[
        styles.canvas,
        {
          width: bgWidth,
          height: bgHeight,
          transform: [{ scale: 1 / BACKGROUND_RES }],
        },
      ]}>
      <Fill>
        <Shader source={swampFloorEffect} uniforms={uniforms}>
          <ImageShader
            image={image}
            tx="repeat"
            ty="repeat"
            fit="none"
            width={bgWidth}
            height={bgHeight}
          />
        </Shader>
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
});
