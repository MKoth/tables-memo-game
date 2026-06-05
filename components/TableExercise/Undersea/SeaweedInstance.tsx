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
  SEAWEED_DEFORM_SKSL,
  seaweedDeformUniformDefaults,
} from '../../../shaders/seaweedDeform.sksl';

function compileSeaweedEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(SEAWEED_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile seaweed deform shader');
  }
  return effect;
}

const seaweedEffect = compileSeaweedEffect();

export type SeaweedInstanceProps = {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
  currentAngle: number;
  waveAmplitude: number;
  waveFreq: number;
  waveSpeed: number;
  phase: number;
  beamIntensity?: number;
  beamSharpness?: number;
  beamDistortion?: number;
  beamSpeed?: number;
  beamPhase?: number;
  beamTint?: readonly [number, number, number];
  clock: SharedValue<number>;
};

export function SeaweedInstance({
  image,
  x,
  y,
  width,
  height,
  currentAngle,
  waveAmplitude,
  waveFreq,
  waveSpeed,
  phase,
  beamIntensity = seaweedDeformUniformDefaults.beamIntensity,
  beamSharpness = seaweedDeformUniformDefaults.beamSharpness,
  beamDistortion = seaweedDeformUniformDefaults.beamDistortion,
  beamSpeed = seaweedDeformUniformDefaults.beamSpeed,
  beamPhase = seaweedDeformUniformDefaults.beamPhase,
  beamTint = seaweedDeformUniformDefaults.beamTint,
  clock,
}: SeaweedInstanceProps) {
  const beamTintUniform = [...beamTint] as [number, number, number];

  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1000,
    seaweedX: x,
    seaweedY: y,
    seaweedW: width,
    seaweedH: height,
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
  }));

  return (
    <Rect x={x} y={y} width={width} height={height}>
      <Shader source={seaweedEffect} uniforms={uniforms}>
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
