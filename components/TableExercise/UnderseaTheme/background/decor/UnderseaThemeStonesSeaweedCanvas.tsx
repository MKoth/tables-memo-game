import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { UnderseaThemeImages } from '../../core/assets/underseaThemeAssets';
import { SeaweedInstance, SeaweedShadowInstance } from './SeaweedInstance';
import { StoneInstance, StoneShadowInstance } from './StoneInstance';
import {
  SEAWEED_BASE_HEIGHT,
  SEAWEED_BASE_WIDTH,
  SEAWEED_CONFIGS,
  SHADOW_COLOR,
  SHADOW_OPACITY,
  SHADOW_SOFTNESS,
  STONE_BASE_HEIGHT,
  STONE_BASE_WIDTH,
  STONE_CONFIGS,
} from './config/stonesSeaweedLayoutConfig';

type UnderseaThemeStonesSeaweedCanvasProps = {
  stoneImages: UnderseaThemeImages['stones'];
  seaweedImages: UnderseaThemeImages['seaweed'];
  width: number;
  height: number;
  clock: SharedValue<number>;
};

export function UnderseaThemeStonesSeaweedCanvas({
  stoneImages,
  seaweedImages,
  width,
  height,
  clock,
}: UnderseaThemeStonesSeaweedCanvasProps) {
  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
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
              shadowOpacity={'shadowOpacity' in config ? config.shadowOpacity : SHADOW_OPACITY}
              shadowSoftness={'shadowSoftness' in config ? config.shadowSoftness : SHADOW_SOFTNESS}
              offsetX={'offsetX' in config ? config.offsetX : undefined}
              offsetY={'offsetY' in config ? config.offsetY : undefined}
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
              beamIntensity={'beamIntensity' in config ? config.beamIntensity : undefined}
              beamPhase={'beamIntensity' in config ? config.stonePhase : undefined}
              shadowStrength={'shadowStrength' in config ? config.shadowStrength : undefined}
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
              shadowOpacity={'shadowOpacity' in config ? config.shadowOpacity : SHADOW_OPACITY}
              shadowSoftness={'shadowSoftness' in config ? config.shadowSoftness : SHADOW_SOFTNESS}
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
