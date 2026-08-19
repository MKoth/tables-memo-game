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

export type AlgaeShadowInstanceProps = {
  image: SkImage;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  shadowColor?: readonly [number, number, number];
  shadowOpacity?: number;
  currentAngle?: number;
  waveAmplitude?: number;
  waveFreq?: number;
  waveSpeed?: number;
  phase?: number;
  clock: SharedValue<number>;
};

export function AlgaeShadowInstance({
  image,
  x,
  y,
  width,
  height,
  offsetX = -20,
  offsetY = 20,
  shadowColor = algaeDeformDefaults.shadowColor,
  shadowOpacity = algaeDeformDefaults.shadowOpacity,
  currentAngle = algaeDeformDefaults.currentAngle,
  waveAmplitude = algaeDeformDefaults.waveAmplitude,
  waveFreq = algaeDeformDefaults.waveFreq,
  waveSpeed = algaeDeformDefaults.waveSpeed,
  phase = algaeDeformDefaults.phase,
  clock,
}: AlgaeShadowInstanceProps) {
  const shadowColorUniform = [...shadowColor] as [number, number, number];

  // Shift the entire rect by offset — shadow renders at a displaced position
  const shiftedX = x + offsetX;
  const shiftedY = y + offsetY;

  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1000,
    algaeX: shiftedX,
    algaeY: shiftedY,
    algaeW: width,
    algaeH: height,
    currentAngle,
    waveAmplitude,
    waveFreq,
    waveSpeed,
    phase,
    beamIntensity: 0,
    beamSharpness: algaeDeformDefaults.beamSharpness,
    beamDistortion: algaeDeformDefaults.beamDistortion,
    beamSpeed: algaeDeformDefaults.beamSpeed,
    beamPhase: algaeDeformDefaults.beamPhase,
    beamTint: algaeDeformDefaults.beamTint,
    renderMode: 1,
    shadowColor: shadowColorUniform,
    shadowOpacity,
    wobbleFreq: algaeDeformDefaults.wobbleFreq,
    wobbleAmp: algaeDeformDefaults.wobbleAmp,
    wobbleSpeed: algaeDeformDefaults.wobbleSpeed,
    waveCenter: [0, 0] as [number, number],
    waveRadius: 0,
    waveStrength: 0,
    waveWidth: 12,
    waveDecay: 0.0015,
    waveActive: 0,
  }));

  return (
    <Rect x={shiftedX} y={shiftedY} width={width} height={height}>
      <Shader source={algaeEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={shiftedX}
          y={shiftedY}
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
