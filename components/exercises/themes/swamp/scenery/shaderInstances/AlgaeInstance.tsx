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
import { MAX_WAVES, singleWaveDefaults } from '../../shaders/waterWaves';

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

const {
  waveSpeed: algaeWaveSpeed,
  waveWidth: algaeWaveWidth,
  waveStrength: algaeWaveStrengthBase,
  waveDecay: algaeWaveDecay,
  waveDuration: algaeWaveDuration,
} = singleWaveDefaults;

const DEMO_WAVE_COUNT = 4;
const DEMO_WAVE_STAGGER_SEC = 0.95;

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
}: AlgaeInstanceProps) {
  const beamTintUniform = [...beamTint] as [number, number, number];

  const uniforms = useDerivedValue(() => {
    'worklet';
    const iTime = clock.value / 1000;
    const waveCount = Math.max(0, Math.min(DEMO_WAVE_COUNT, MAX_WAVES));
    const waveCenters: number[] = Array(MAX_WAVES * 2).fill(0);
    const waveRadii: number[] = Array(MAX_WAVES).fill(0);
    const waveStrengths: number[] = Array(MAX_WAVES).fill(0);
    const waveWidths: number[] = Array(MAX_WAVES).fill(0);
    const durationSec = algaeWaveDuration / 1000;
    const stagger = waveCount > 1 ? durationSec / waveCount : 0.95;
    for (let w = 0; w < waveCount; w++) {
      const cx = screenWidth > 0 ? screenWidth * (0.15 + ((w * 0.37) % 0.7)) : x + width * 0.5;
      const cy = screenHeight > 0 ? screenHeight * (0.2 + ((w * 0.53) % 0.6)) : y + height * 0.5;
      waveCenters[w * 2] = cx;
      waveCenters[w * 2 + 1] = cy;
      const offsetTime = iTime + w * stagger;
      const cyc = offsetTime % durationSec;
      waveRadii[w] = cyc * algaeWaveSpeed;
      waveStrengths[w] = algaeWaveStrengthBase;
      waveWidths[w] = algaeWaveWidth;
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
      waveCenters,
      waveRadii,
      waveStrengths,
      waveWidths,
      waveCount,
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
