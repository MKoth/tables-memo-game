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

function compileAlgaeEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ALGAE_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile algae deform shader');
  }
  return effect;
}

const algaeEffect = compileAlgaeEffect();

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
  clock,
}: AlgaeInstanceProps) {
  const beamTintUniform = [...beamTint] as [number, number, number];

  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1000,
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
  }));

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
