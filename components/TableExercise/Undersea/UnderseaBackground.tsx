import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useUnderseaAssetsContext } from './UnderseaAssetsContext';
import { useUnderseaClock } from './UnderseaClockContext';
import { UnderseaSeafloorShaderCanvas } from './UnderseaSeafloorShaderCanvas';
import type { SeaweedVariant, StoneVariant } from './underseaAssets';
import { SeaweedInstance, SeaweedShadowInstance } from './SeaweedInstance';
import { StoneInstance, StoneShadowInstance } from './StoneInstance';

const SEAWEED_BASE_WIDTH = 120;
const SEAWEED_BASE_HEIGHT = 160;
const STONE_BASE_WIDTH = 72;
const STONE_BASE_HEIGHT = 56;
const SHADOW_COLOR = [0.02, 0.06, 0.12] as const;
const SHADOW_OPACITY = 0.70;
const SHADOW_SOFTNESS = 0.06;

const STONE_CONFIGS = [
  { variant: 1 satisfies StoneVariant, xRatio: 0.15, yRatio: 0.15, scale: 1.3, stonePhase: 0.0 },
  { variant: 2 satisfies StoneVariant, xRatio: 0.04, yRatio: 0.22, scale: 1.3, stonePhase: 0.5 },
  { variant: 3 satisfies StoneVariant, xRatio: 0.22, yRatio: 0.28, scale: 1.4, stonePhase: 0.3 },
  { variant: 4 satisfies StoneVariant, xRatio: 0.48, yRatio: 0.56, scale: 1.4, stonePhase: 0.7 },
  { variant: 5 satisfies StoneVariant, xRatio: 0.45, yRatio: 0.40, scale: 1.5, stonePhase: 2.0 },
  { variant: 6 satisfies StoneVariant, xRatio: 0.26, yRatio: 0.47, scale: 1.7, stonePhase: 0.0 },
  { variant: 7 satisfies StoneVariant, xRatio: 0.58, yRatio: 0.48, scale: 1.4, stonePhase: 3.0 },
  { variant: 8 satisfies StoneVariant, xRatio: 0.28, yRatio: 0.20, scale: 1.45, stonePhase: 1.0 },
  { variant: 9 satisfies StoneVariant, xRatio: 0.68, yRatio: 0.63, scale: 1.35, stonePhase: 0.0 },
] as const;

const SEAWEED_CONFIGS = [
  {
    variant: 1 satisfies SeaweedVariant,
    xRatio: 0.2,
    yRatio: 0.18,
    scale: 0.7,
    phase: 0.0,
    currentAngle: 3.14,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 3.0,
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
    yRatio: 0.42,
    scale: 0.7,
    phase: 1.0,
    currentAngle: 3.14,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 4.3,
    beamIntensity: 0.13,
    beamSharpness: 10,
    beamDistortion: 0.02,
    beamSpeed: 0.20,
    beamPhase: 1.2,
    beamTint: [2.8, 2.8, 2.8],
  },
  {
    variant: 3 satisfies SeaweedVariant,
    xRatio: 0.67,
    yRatio: 0.52,
    scale: 0.8,
    phase: 2.0,
    currentAngle: 3.14,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 3.0,
    beamIntensity: 0.13,
    beamSharpness: 10,
    beamDistortion: 0.02,
    beamSpeed: 0.20,
    beamPhase: 0.0,
    beamTint: [2.8, 2.8, 2.8],
  },
] as const;

export function UnderseaBackground() {
  const { width, height } = useWindowDimensions();
  const { images } = useUnderseaAssetsContext();
  const image = images.seafloor;
  const stoneImages = images.stones;
  const seaweedImages = images.seaweed;
  const clock = useUnderseaClock();

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <UnderseaSeafloorShaderCanvas image={image} width={width} height={height} />
      <Canvas style={styles.foregroundCanvas}>
        <Group>
          {STONE_CONFIGS.map((config, index) => {
            const stoneWidth = STONE_BASE_WIDTH * config.scale;
            const stoneHeight = STONE_BASE_HEIGHT * config.scale;
            const stoneImage = stoneImages[config.variant];

            return (
              <StoneShadowInstance
                key={`stone-shadow-${index}`}
                image={stoneImage}
                x={config.xRatio * width}
                y={config.yRatio * height}
                width={stoneWidth}
                height={stoneHeight}
                shadowColor={SHADOW_COLOR}
                shadowOpacity={SHADOW_OPACITY}
                shadowSoftness={SHADOW_SOFTNESS}
              />
            );
          })}
        </Group>
        <Group>
          {STONE_CONFIGS.map((config, index) => {
            const stoneWidth = STONE_BASE_WIDTH * config.scale;
            const stoneHeight = STONE_BASE_HEIGHT * config.scale;
            const stoneImage = stoneImages[config.variant];

            return (
              <StoneInstance
                key={`stone-${index}`}
                image={stoneImage}
                x={config.xRatio * width}
                y={config.yRatio * height}
                width={stoneWidth}
                height={stoneHeight}
                screenWidth={width}
                screenHeight={height}
                clock={clock}
              />
            );
          })}
        </Group>
        <Group>
          {SEAWEED_CONFIGS.map((config, index) => {
            const seaweedWidth = SEAWEED_BASE_WIDTH * config.scale;
            const seaweedHeight = SEAWEED_BASE_HEIGHT * config.scale;
            const seaweedImage = seaweedImages[config.variant];

            return (
              <SeaweedShadowInstance
                key={`seaweed-shadow-${index}`}
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
                clock={clock}
                shadowColor={SHADOW_COLOR}
                shadowOpacity={SHADOW_OPACITY}
                shadowSoftness={SHADOW_SOFTNESS}
              />
            );
          })}
        </Group>
        <Group>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  foregroundCanvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
