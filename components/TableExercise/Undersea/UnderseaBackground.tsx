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
