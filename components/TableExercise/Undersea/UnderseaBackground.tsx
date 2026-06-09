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

const SEAWEED_VARIANTS = {
  1: require('../../../assets/seaweed1.png'),
  2: require('../../../assets/seaweed2.png'),
  3: require('../../../assets/seaweed3.png'),
} as const;

type SeaweedVariant = keyof typeof SEAWEED_VARIANTS;

const SEAWEED_CONFIGS = [
  {
    variant: 1 satisfies SeaweedVariant,
    xRatio: 0.2,
    yRatio: 0.2,
    scale: 0.8,
    phase: 0.0,
    currentAngle: 3.14,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 2.0,
    beamIntensity: 0.13,
    beamSharpness: 10,
    beamDistortion: 0.02,
    beamSpeed: 0.20,
    beamPhase: 0.0,
    beamTint: [2.8, 2.8, 2.8],
  },
  {
    variant: 2 satisfies SeaweedVariant,
    xRatio: 0.45,
    yRatio: 0.45,
    scale: 0.8,
    phase: 1.0,
    currentAngle: 3.14,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 2.0,
    beamIntensity: 0.13,
    beamSharpness: 10,
    beamDistortion: 0.02,
    beamSpeed: 0.20,
    beamPhase: 1.2,
    beamTint: [2.8, 2.8, 2.8],
  },
  {
    variant: 3 satisfies SeaweedVariant,
    xRatio: 0.7,
    yRatio: 0.6,
    scale: 0.8,
    phase: 2.0,
    currentAngle: 3.14,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 2.0,
    beamIntensity: 0.13,
    beamSharpness: 10,
    beamDistortion: 0.02,
    beamSpeed: 0.20,
    beamPhase: 0.0,
    beamTint: [2.8, 2.8, 2.8],
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
  const seaweed1 = useImage(SEAWEED_VARIANTS[1]);
  const seaweed2 = useImage(SEAWEED_VARIANTS[2]);
  const seaweed3 = useImage(SEAWEED_VARIANTS[3]);
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

  if (!image || !seaweed1 || !seaweed2 || !seaweed3 || width === 0 || height === 0) {
    return null;
  }

  const seaweedImages = { 1: seaweed1, 2: seaweed2, 3: seaweed3 };

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
          const seaweedImage = seaweedImages[config.variant];

          return (
            <SeaweedInstance
              key={index}
              image={seaweedImage}
              x={config.xRatio * width}
              y={config.yRatio * height}
              width={seaweedWidth}
              height={seaweedHeight}
              currentAngle={config.currentAngle}
              waveAmplitude={config.waveAmplitude}
              waveFreq={config.waveFreq}
              waveSpeed={config.waveSpeed}
              phase={config.phase}
              beamIntensity={config.beamIntensity}
              beamSharpness={config.beamSharpness}
              beamDistortion={config.beamDistortion}
              beamSpeed={config.beamSpeed}
              beamPhase={config.beamPhase}
              beamTint={config.beamTint}
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
