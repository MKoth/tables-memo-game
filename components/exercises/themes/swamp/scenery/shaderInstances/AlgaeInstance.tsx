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
  singleWaveDefaults,
  waterWaveLayerMultiplier,
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

const {
  waveSpeed: algaeWaveSpeed,
  waveWidth: algaeWaveWidth,
  waveStrength: algaeWaveStrengthBase,
  waveDecay: algaeWaveDecay,
  waveMaxRadius: algaeWaveMaxRadius,
  waveDuration: algaeWaveDuration,
} = singleWaveDefaults;
const algaeWaveStrength = algaeWaveStrengthBase * waterWaveLayerMultiplier.algae;

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
    const cycle = iTime % (algaeWaveDuration / 1000);
    const rawRadius = cycle * algaeWaveSpeed;
    const waveActive = rawRadius <= algaeWaveMaxRadius ? 1 : 0;
    const waveCenterX = screenWidth > 0 ? screenWidth * 0.5 : x + width * 0.5;
    const waveCenterY = screenHeight > 0 ? screenHeight * 0.5 : y + height * 0.5;
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
      waveCenter: [waveCenterX, waveCenterY] as [number, number],
      waveRadius: rawRadius,
      waveStrength: algaeWaveStrength,
      waveWidth: algaeWaveWidth,
      waveDecay: algaeWaveDecay,
      waveActive,
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
