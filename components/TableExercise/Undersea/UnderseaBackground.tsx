import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Blur,
  Canvas,
  Fill,
  Group,
  ImageShader,
  Paint,
  Shader,
  Skia,
  useClock,
  useImage,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import {
  MAX_DRIFT_LAYERS,
  UNDERSEA_SEAFLOOR_BACKGROUND_SKSL,
  underseaSeafloorUniformDefaults,
} from '../../../shaders/underseaSeafloorBackground.sksl';
import { SeaweedInstance } from './SeaweedInstance';

const BLUR_SIGMA = 1.5;
const SEAWEED_BASE_WIDTH = 120;
const SEAWEED_BASE_HEIGHT = 160;
const SEAWEED_GROUND_OFFSET = 20;

const SEAWEED_CONFIGS = [
  {
    xRatio: 0.04,
    scale: 1.0,
    phase: 0.0,
    currentAngle: 10,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 2.0,
  },
] as const;
const {
  tileScale,
  distortionAmpScale,
  distortionFreqScale,
  underwaterTint,
  underwaterTintStrength,
  underwaterDepthStrength,
  waterDriftCount,
  waterDriftScale,
  waterDriftIntensity,
  waterDriftTint,
  waterDriftSpeed,
  waterDriftMoveAngle,
  waterDriftMoveSpeed,
  waterDriftSharpness,
  waterDriftWaveAmp,
  waterDriftWaveFreq,
  waterDriftWaveSpeed,
  waterDriftClusterAmp,
  waterDriftClusterFreq,
  waterDriftLineVariation,
  waterDriftIntensityVariation,
  waterDriftFrequencyVariation,
  waterDriftEdgeJunctionStrength,
} = underseaSeafloorUniformDefaults;

function padArray(arr: readonly number[], fill = 0): number[] {
  return [...arr, ...Array(Math.max(0, MAX_DRIFT_LAYERS - arr.length)).fill(fill)];
}

function padTintChannel(
  tints: readonly (readonly [number, number, number])[],
  channel: 0 | 1 | 2,
  fill = 1,
): number[] {
  return padArray(
    tints.map((t) => t[channel]),
    fill,
  );
}

const paddedWaterDriftScale = padArray(waterDriftScale);
const paddedWaterDriftIntensity = padArray(waterDriftIntensity);
const paddedWaterDriftTintR = padTintChannel(waterDriftTint, 0);
const paddedWaterDriftTintG = padTintChannel(waterDriftTint, 1);
const paddedWaterDriftTintB = padTintChannel(waterDriftTint, 2);
const paddedWaterDriftSpeed = padArray(waterDriftSpeed);
const paddedWaterDriftMoveAngle = padArray(waterDriftMoveAngle);
const paddedWaterDriftMoveSpeed = padArray(waterDriftMoveSpeed);
const paddedWaterDriftSharpness = padArray(waterDriftSharpness);
const paddedWaterDriftWaveAmp = padArray(waterDriftWaveAmp);
const paddedWaterDriftWaveFreq = padArray(waterDriftWaveFreq);
const paddedWaterDriftWaveSpeed = padArray(waterDriftWaveSpeed);
const paddedWaterDriftClusterAmp = padArray(waterDriftClusterAmp);
const paddedWaterDriftClusterFreq = padArray(waterDriftClusterFreq);
const paddedWaterDriftLineVariation = padArray(waterDriftLineVariation);
const paddedWaterDriftIntensityVariation = padArray(waterDriftIntensityVariation);
const paddedWaterDriftFrequencyVariation = padArray(waterDriftFrequencyVariation);
const paddedWaterDriftEdgeJunctionStrength = padArray(waterDriftEdgeJunctionStrength);
const underwaterTintUniform = [...underwaterTint] as [number, number, number];

function compileSeafloorEffect() {
  const effect = Skia.RuntimeEffect.Make(UNDERSEA_SEAFLOOR_BACKGROUND_SKSL);
  if (!effect) {
    throw new Error('Failed to compile undersea seafloor background shader');
  }
  return effect;
}

const seafloorEffect = compileSeafloorEffect();

export function UnderseaBackground() {
  const { width, height } = useWindowDimensions();
  const image = useImage(require('../../../assets/seafloor.png'));
  const seaweedImage = useImage(require('../../../assets/seaweed1.png'));
  const clock = useClock();

  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1500,
    iResolution: [width, height] as [number, number],
    tileScale,
    distortionAmpScale,
    distortionFreqScale,
    underwaterTint: underwaterTintUniform,
    underwaterTintStrength,
    underwaterDepthStrength,
    waterDriftCount,
    waterDriftScale: paddedWaterDriftScale,
    waterDriftIntensity: paddedWaterDriftIntensity,
    waterDriftTintR: paddedWaterDriftTintR,
    waterDriftTintG: paddedWaterDriftTintG,
    waterDriftTintB: paddedWaterDriftTintB,
    waterDriftSpeed: paddedWaterDriftSpeed,
    waterDriftMoveAngle: paddedWaterDriftMoveAngle,
    waterDriftMoveSpeed: paddedWaterDriftMoveSpeed,
    waterDriftSharpness: paddedWaterDriftSharpness,
    waterDriftWaveAmp: paddedWaterDriftWaveAmp,
    waterDriftWaveFreq: paddedWaterDriftWaveFreq,
    waterDriftWaveSpeed: paddedWaterDriftWaveSpeed,
    waterDriftClusterAmp: paddedWaterDriftClusterAmp,
    waterDriftClusterFreq: paddedWaterDriftClusterFreq,
    waterDriftLineVariation: paddedWaterDriftLineVariation,
    waterDriftIntensityVariation: paddedWaterDriftIntensityVariation,
    waterDriftFrequencyVariation: paddedWaterDriftFrequencyVariation,
    waterDriftEdgeJunctionStrength: paddedWaterDriftEdgeJunctionStrength,
  }));

  if (!image || !seaweedImage || width === 0 || height === 0) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group
        layer={
          <Paint>
            <Blur blur={BLUR_SIGMA} mode="decal" />
          </Paint>
        }>
        <Fill>
          <Shader source={seafloorEffect} uniforms={uniforms}>
            <ImageShader
              image={image}
              tx="repeat"
              ty="repeat"
              fit="none"
              width={width}
              height={height}
            />
          </Shader>
        </Fill>
      </Group>
      <Group
        layer={
          <Paint>
            <Blur blur={BLUR_SIGMA} mode="decal" />
          </Paint>
        }>
        {SEAWEED_CONFIGS.map((config, index) => {
          const seaweedWidth = SEAWEED_BASE_WIDTH * config.scale;
          const seaweedHeight = SEAWEED_BASE_HEIGHT * config.scale;

          return (
            <SeaweedInstance
              key={index}
              image={seaweedImage}
              x={config.xRatio * width}
              y={height - seaweedHeight - SEAWEED_GROUND_OFFSET}
              width={seaweedWidth}
              height={seaweedHeight}
              currentAngle={config.currentAngle}
              waveAmplitude={config.waveAmplitude}
              waveFreq={config.waveFreq}
              waveSpeed={config.waveSpeed}
              phase={config.phase}
              clock={clock}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
