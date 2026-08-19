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
import { MAX_WAVES, singleWaveDefaults } from '../../shaders/waterWaves';

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
  waveDuration: floorWaveDuration,
} = singleWaveDefaults;

const DEMO_WAVE_COUNT = 16;
const DEMO_WAVE_STAGGER_SEC = 0.95;

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
    const waveCount = Math.max(0, Math.min(DEMO_WAVE_COUNT, MAX_WAVES));
    const waveCenters: number[] = Array(MAX_WAVES * 2).fill(0);
    const waveRadii: number[] = Array(MAX_WAVES).fill(0);
    const waveStrengths: number[] = Array(MAX_WAVES).fill(0);
    const waveWidths: number[] = Array(MAX_WAVES).fill(0);
    const durationSec = floorWaveDuration / 1000;
    const stagger = waveCount > 1 ? durationSec / waveCount : 0.95;
    for (let w = 0; w < waveCount; w++) {
      const cx = bgWidth * (0.15 + ((w * 0.37) % 0.7));
      const cy = bgHeight * (0.2 + ((w * 0.53) % 0.6));
      waveCenters[w * 2] = cx;
      waveCenters[w * 2 + 1] = cy;
      const offsetTime = iTime + w * stagger;
      const cyc = offsetTime % durationSec;
      waveRadii[w] = cyc * floorWaveSpeed;
      waveStrengths[w] = floorWaveStrengthBase;
      waveWidths[w] = floorWaveWidth;
    }
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
      waveCenters,
      waveRadii,
      waveStrengths,
      waveWidths,
      waveCount,
      waveDecay: floorWaveDecay,
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
