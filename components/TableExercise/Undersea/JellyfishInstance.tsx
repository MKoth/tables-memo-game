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
  JELLYFISH_DEFORM_SKSL,
  jellyfishDeformUniformDefaults,
} from '../../../shaders/jellyfishDeform.sksl';

function compileJellyfishEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(JELLYFISH_DEFORM_SKSL);
  if (!effect) {
    throw new Error('Failed to compile jellyfish deform shader');
  }
  return effect;
}

const jellyfishEffect = compileJellyfishEffect();

type JellyfishLayerProps = {
  image: SkImage;
  /** Centered square size in px. */
  size: number;
  /** Sprite center on screen. */
  centerX: number;
  centerY: number;
  phase: number;
  pulseSpeed: number;
  pivotR: number;
  relaxAmp: number;
  contractAmp: number;
  pushDur: number;
  waveAmp: number;
  waveLobes: number;
  waveSpeed: number;
  swirlAmp: number;
  swirlFreq: number;
  opacity: number;
  clock: SharedValue<number>;
};

function JellyfishLayer({
  image,
  size,
  centerX,
  centerY,
  phase,
  pulseSpeed,
  pivotR,
  relaxAmp,
  contractAmp,
  pushDur,
  waveAmp,
  waveLobes,
  waveSpeed,
  swirlAmp,
  swirlFreq,
  opacity,
  clock,
}: JellyfishLayerProps) {
  const x = centerX - size / 2;
  const y = centerY - size / 2;

  const uniforms = useDerivedValue(() => ({
    jellyX: x,
    jellyY: y,
    jellyW: size,
    jellyH: size,
    iTime: clock.value / 1000,
    phase,
    pulseSpeed,
    pivotR,
    relaxAmp,
    contractAmp,
    pushDur,
    waveAmp,
    waveLobes,
    waveSpeed,
    swirlAmp,
    swirlFreq,
    edgeStart: jellyfishDeformUniformDefaults.edgeStart,
    opacity,
  }));

  return (
    <Rect x={x} y={y} width={size} height={size}>
      <Shader source={jellyfishEffect} uniforms={uniforms}>
        <ImageShader
          image={image}
          x={x}
          y={y}
          width={size}
          height={size}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
      </Shader>
    </Rect>
  );
}

export type JellyfishInstanceProps = {
  bellImage: SkImage;
  tentacleImage: SkImage;
  centerX: number;
  centerY: number;
  /** Bell square size in px; tentacles are scaled relative to this. */
  bellSize: number;
  /** Tentacle square size as a multiple of bellSize. */
  tentacleSizeRatio?: number;
  phase?: number;
  pulseSpeed?: number;
  pivotR?: number;
  relaxAmp?: number;
  contractAmp?: number;
  pushDur?: number;
  bellWaveAmp?: number;
  bellWaveLobes?: number;
  waveSpeed?: number;
  tentacleSwirlAmp?: number;
  tentacleSwirlFreq?: number;
  bellOpacity?: number;
  tentacleOpacity?: number;
  clock: SharedValue<number>;
};

export function JellyfishInstance({
  bellImage,
  tentacleImage,
  centerX,
  centerY,
  bellSize,
  tentacleSizeRatio = 1.35,
  phase = jellyfishDeformUniformDefaults.phase,
  pulseSpeed = jellyfishDeformUniformDefaults.pulseSpeed,
  pivotR = jellyfishDeformUniformDefaults.pivotR,
  relaxAmp = jellyfishDeformUniformDefaults.relaxAmp,
  contractAmp = jellyfishDeformUniformDefaults.contractAmp,
  pushDur = jellyfishDeformUniformDefaults.pushDur,
  bellWaveAmp = jellyfishDeformUniformDefaults.waveAmp,
  bellWaveLobes = jellyfishDeformUniformDefaults.waveLobes,
  waveSpeed = jellyfishDeformUniformDefaults.waveSpeed,
  tentacleSwirlAmp = 0.06,
  tentacleSwirlFreq = jellyfishDeformUniformDefaults.swirlFreq,
  bellOpacity = 0.88,
  tentacleOpacity = 0.85,
  clock,
}: JellyfishInstanceProps) {
  const tentacleSize = bellSize * tentacleSizeRatio;

  return (
    <>
      <JellyfishLayer
        image={tentacleImage}
        size={tentacleSize}
        centerX={centerX}
        centerY={centerY}
        phase={phase}
        pulseSpeed={pulseSpeed}
        pivotR={pivotR}
        relaxAmp={relaxAmp}
        contractAmp={contractAmp}
        pushDur={pushDur}
        waveAmp={0}
        waveLobes={bellWaveLobes}
        waveSpeed={waveSpeed}
        swirlAmp={tentacleSwirlAmp}
        swirlFreq={tentacleSwirlFreq}
        opacity={tentacleOpacity}
        clock={clock}
      />
      <JellyfishLayer
        image={bellImage}
        size={bellSize}
        centerX={centerX}
        centerY={centerY}
        phase={phase}
        pulseSpeed={pulseSpeed}
        pivotR={pivotR}
        relaxAmp={relaxAmp}
        contractAmp={contractAmp}
        pushDur={pushDur}
        waveAmp={bellWaveAmp}
        waveLobes={bellWaveLobes}
        waveSpeed={waveSpeed}
        swirlAmp={0}
        swirlFreq={tentacleSwirlFreq}
        opacity={bellOpacity}
        clock={clock}
      />
    </>
  );
}
