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
  ALGAE_DEFORM_SKSL,
  algaeDeformDefaults,
} from '../../shaders/algaeDeform.sksl';
import {
  MAX_WAVES,
  MAX_WAVES_PER_SPRITE,
} from '../../shaders/waterWaves';

function compileAlgaeEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ALGAE_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile algae deform shader');
  }
  return effect;
}

const algaeEffect = compileAlgaeEffect();

const {
  wobbleFreq: algaeWobbleFreq,
  wobbleAmp: algaeWobbleAmp,
  wobbleSpeed: algaeWobbleSpeed,
} = algaeDeformDefaults;

export type AlgaeInstanceProps = {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
  currentAngle?: number;
  waveAmplitude?: number;
  waveFreq?: number;
  waveSpeed?: number;
  phase?: number;
  beamIntensity?: number;
  beamSharpness?: number;
  beamDistortion?: number;
  beamSpeed?: number;
  beamPhase?: number;
  beamTint?: readonly [number, number, number];
  screenWidth?: number;
  screenHeight?: number;
  clock: SharedValue<number>;
  waveCenters: SharedValue<number[]>;
  waveRadii: SharedValue<number[]>;
  waveStrengths: SharedValue<number[]>;
  waveWidths: SharedValue<number[]>;
  waveCount: SharedValue<number>;
  waveDecay: number;
};

export function AlgaeInstance({
  image,
  x,
  y,
  width,
  height,
  currentAngle = algaeDeformDefaults.currentAngle,
  waveAmplitude = algaeDeformDefaults.waveAmplitude,
  waveFreq = algaeDeformDefaults.waveFreq,
  waveSpeed = algaeDeformDefaults.waveSpeed,
  phase = algaeDeformDefaults.phase,
  beamIntensity = algaeDeformDefaults.beamIntensity,
  beamSharpness = algaeDeformDefaults.beamSharpness,
  beamDistortion = algaeDeformDefaults.beamDistortion,
  beamSpeed = algaeDeformDefaults.beamSpeed,
  beamPhase = algaeDeformDefaults.beamPhase,
  beamTint = algaeDeformDefaults.beamTint,
  screenWidth = 0,
  screenHeight = 0,
  clock,
  waveCenters: allWaveCenters,
  waveRadii: allWaveRadii,
  waveStrengths: allWaveStrengths,
  waveWidths: allWaveWidths,
  waveCount: allWaveCount,
  waveDecay: algaeWaveDecay,
}: AlgaeInstanceProps) {
  const beamTintUniform = [...beamTint] as [number, number, number];

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
      algaeX: x,
      algaeY: y,
      algaeW: width,
      algaeH: height,
      currentAngle,
      waveAmplitude,
      waveFreq,
      waveSpeed,
      phase,
      beamIntensity,
      beamSharpness,
      beamDistortion,
      beamSpeed,
      beamPhase,
      beamTint: beamTintUniform,
      renderMode: 0,
      shadowColor: algaeDeformDefaults.shadowColor,
      shadowOpacity: algaeDeformDefaults.shadowOpacity,
      wobbleFreq: algaeWobbleFreq,
      wobbleAmp: algaeWobbleAmp,
      wobbleSpeed: algaeWobbleSpeed,
      waveCenters: waveCentersArr,
      waveRadii: waveRadiiArr,
      waveStrengths: waveStrengthsArr,
      waveWidths: waveWidthsArr,
      waveCount: closest.length,
      waveDecay: algaeWaveDecay,
    };
  });

  return (
    <Rect x={x} y={y} width={width} height={height}>
      <Shader source={algaeEffect} uniforms={uniforms}>
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
