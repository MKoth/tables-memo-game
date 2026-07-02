import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { SeaweedVariant, StoneVariant, UnderseaThemeImages } from '../../core/assets/underseaThemeAssets';
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
  {
    variant: 'starfish1' satisfies StoneVariant,
    xRatio: 0.63,
    yRatio: 0.73,
    scale: 1.8,
    stonePhase: 0.2,
    shadowOpacity: 0.86,
    shadowSoftness: 0.03,
    offsetX: -1,
    offsetY: 3,
    beamIntensity: 0.11,
    beamPhase: 0.4,
    shadowStrength: 0.2,
  },
  {
    variant: 'starfish2' satisfies StoneVariant,
    xRatio: 0.11,
    yRatio: 0.81,
    scale: 1.9,
    stonePhase: 1.1,
    shadowOpacity: 0.86,
    shadowSoftness: 0.03,
    offsetX: -1,
    offsetY: 3,
    beamIntensity: 0.10,
    beamPhase: 1.8,
    shadowStrength: 0.2,
  },
  {
    variant: 'starfish3' satisfies StoneVariant,
    xRatio: 0.62,
    yRatio: 0.14,
    
    scale: 1.7,
    stonePhase: 2.4,
    shadowOpacity: 0.86,
    shadowSoftness: 0.03,
    offsetX: -1,
    offsetY: 3,
    beamIntensity: 0.12,
    beamPhase: 2.6,
    shadowStrength: 0.2,
  },
  {
    variant: 'seashell1' satisfies StoneVariant,
    xRatio: 0.39,
    yRatio: 0.11,
    scale: 1.1,
    stonePhase: 0.6,
    shadowOpacity: 0.55,
    shadowSoftness: 0.04,
    offsetX: -1,
    offsetY: 3,
    beamIntensity: 0.09,
    beamPhase: 0.9,
    shadowStrength: 0.2,
  },
  {
    variant: 'seashell2' satisfies StoneVariant,
    xRatio: 0.56,
    yRatio: 0.34,
    scale: 1.08,
    stonePhase: 1.4,
    shadowOpacity: 0.52,
    shadowSoftness: 0.045,
    offsetX: -1,
    offsetY: 3,
    beamIntensity: 0.08,
    beamPhase: 1.3,
    shadowStrength: 0.2,
  },
  {
    variant: 'seashell3' satisfies StoneVariant,
    xRatio: 0.04,
    yRatio: 0.53,
    scale: 1.78,
    stonePhase: 0.9,
    shadowOpacity: 0.60,
    shadowSoftness: 0.038,
    offsetX: -1,
    offsetY: 8,
    beamIntensity: 0.07,
    beamPhase: 2.1,
    shadowStrength: 0.3,
  },
  {
    variant: 'seashell4' satisfies StoneVariant,
    xRatio: 0.53,
    yRatio: 0.85,
    scale: 1.86,
    stonePhase: 2.2,
    shadowOpacity: 0.57,
    shadowSoftness: 0.042,
    offsetX: -1,
    offsetY: 6,
    beamIntensity: 0.03,
    beamPhase: 2.1,
    shadowStrength: 0.2,
  },
  {
    variant: 'seashell5' satisfies StoneVariant,
    xRatio: 0.35,
    yRatio: 0.65,
    scale: 1.10,
    stonePhase: 1.7,
    shadowOpacity: 0.73,
    shadowSoftness: 0.04,
    offsetX: -1,
    offsetY: 3,
    beamIntensity: 0.09,
    beamPhase: 3.2,
    shadowStrength: 0.4,
  },
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
  {
    variant: 4 satisfies SeaweedVariant,
    xRatio: 0.09,
    yRatio: 0.34,
    scale: 0.84,
    phase: 0.6,
    currentAngle: 3.14,
    waveAmplitude: 0.055,
    waveFreq: 11,
    waveSpeed: 3.4,
    beamIntensity: 0.11,
    beamSharpness: 9,
    beamDistortion: 0.018,
    beamSpeed: 0.22,
    beamPhase: 0.7,
    beamTint: [2.6, 2.7, 2.9],
    shadowOpacity: 0.62,
    shadowSoftness: 0.055,
  },
  {
    variant: 5 satisfies SeaweedVariant,
    xRatio: 0.51,
    yRatio: 0.64,
    scale: 0.94,
    phase: 1.8,
    currentAngle: 3.14,
    waveAmplitude: 0.065,
    waveFreq: 9,
    waveSpeed: 2.7,
    beamIntensity: 0.14,
    beamSharpness: 11,
    beamDistortion: 0.021,
    beamSpeed: 0.18,
    beamPhase: 1.5,
    beamTint: [2.9, 2.8, 2.7],
    shadowOpacity: 0.68,
    shadowSoftness: 0.062,
  },
  {
    variant: 6 satisfies SeaweedVariant,
    xRatio: 0.73,
    yRatio: 0.32,
    scale: 0.88,
    phase: 2.7,
    currentAngle: 3.14,
    waveAmplitude: 0.058,
    waveFreq: 12,
    waveSpeed: 4.1,
    beamIntensity: 0.12,
    beamSharpness: 10,
    beamDistortion: 0.019,
    beamSpeed: 0.24,
    beamPhase: 2.3,
    beamTint: [2.7, 2.9, 2.8],
    shadowOpacity: 0.60,
    shadowSoftness: 0.05,
  },
] as const;

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
