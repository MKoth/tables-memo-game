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

const BLUR_SIGMA = 1.5;
const {
  tileScale,
  distortionAmpScale,
  distortionFreqScale,
  causticPatchScale,
  causticBaseScale,
  causticRangeScale,
  waterDriftCount,
  waterDriftScale,
  waterDriftIntensity,
  waterDriftSpeed,
  waterDriftSharpness,
  waterDriftWaveAmp,
  waterDriftWaveFreq,
  waterDriftWaveSpeed,
  waterDriftClusterAmp,
  waterDriftClusterFreq,
  waterDriftLineVariation,
} = underseaSeafloorUniformDefaults;

function padArray(arr: readonly number[], fill = 0): number[] {
  return [...arr, ...Array(Math.max(0, MAX_DRIFT_LAYERS - arr.length)).fill(fill)];
}

const paddedWaterDriftScale = padArray(waterDriftScale);
const paddedWaterDriftIntensity = padArray(waterDriftIntensity);
const paddedWaterDriftSpeed = padArray(waterDriftSpeed);
const paddedWaterDriftSharpness = padArray(waterDriftSharpness);
const paddedWaterDriftWaveAmp = padArray(waterDriftWaveAmp);
const paddedWaterDriftWaveFreq = padArray(waterDriftWaveFreq);
const paddedWaterDriftWaveSpeed = padArray(waterDriftWaveSpeed);
const paddedWaterDriftClusterAmp = padArray(waterDriftClusterAmp);
const paddedWaterDriftClusterFreq = padArray(waterDriftClusterFreq);
const paddedWaterDriftLineVariation = padArray(waterDriftLineVariation);

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
  const clock = useClock();

  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1500,
    iResolution: [width, height] as [number, number],
    tileScale,
    distortionAmpScale,
    distortionFreqScale,
    causticPatchScale,
    causticBaseScale,
    causticRangeScale,
    waterDriftCount,
    waterDriftScale: paddedWaterDriftScale,
    waterDriftIntensity: paddedWaterDriftIntensity,
    waterDriftSpeed: paddedWaterDriftSpeed,
    waterDriftSharpness: paddedWaterDriftSharpness,
    waterDriftWaveAmp: paddedWaterDriftWaveAmp,
    waterDriftWaveFreq: paddedWaterDriftWaveFreq,
    waterDriftWaveSpeed: paddedWaterDriftWaveSpeed,
    waterDriftClusterAmp: paddedWaterDriftClusterAmp,
    waterDriftClusterFreq: paddedWaterDriftClusterFreq,
    waterDriftLineVariation: paddedWaterDriftLineVariation,
  }));

  if (!image || width === 0 || height === 0) {
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
