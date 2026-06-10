import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  Canvas,
  Fill,
  Group,
  ImageShader,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useThrottledClock } from '../../../hooks/useThrottledClock';
import {
  MAX_DRIFT_LAYERS,
  UNDERSEA_SEAFLOOR_BACKGROUND_SKSL,
  underseaSeafloorUniformDefaults,
} from '../../../shaders/underseaSeafloorBackground.sksl';
import { SeaweedInstance } from './SeaweedInstance';
import { StoneInstance } from './StoneInstance';

const BACKGROUND_RES = 0.5;
const DEG_TO_RAD = Math.PI / 180;
const SEAWEED_BASE_WIDTH = 120;
const SEAWEED_BASE_HEIGHT = 160;
const STONE_BASE_WIDTH = 72;
const STONE_BASE_HEIGHT = 56;

const STONE_VARIANTS = {
  1: require('../../../assets/stone1.png'),
  2: require('../../../assets/stone2.png'),
  3: require('../../../assets/stone3.png'),
  4: require('../../../assets/stone4.png'),
  5: require('../../../assets/stone5.png'),
  6: require('../../../assets/stone6.png'),
  7: require('../../../assets/stone7.png'),
  8: require('../../../assets/stone8.png'),
  9: require('../../../assets/stone9.png'),
} as const;

type StoneVariant = keyof typeof STONE_VARIANTS;

const STONE_CONFIGS = [
  { variant: 1 satisfies StoneVariant, xRatio: 0.06, yRatio: 0.13, scale: 1.75, stonePhase: 0.0 },
  { variant: 2 satisfies StoneVariant, xRatio: 0.46, yRatio: 0.1, scale: 1.95, stonePhase: 0.5 },
  { variant: 3 satisfies StoneVariant, xRatio: 0.28, yRatio: 0.32, scale: 1.4, stonePhase: 0.3 },
  { variant: 4 satisfies StoneVariant, xRatio: 0.38, yRatio: 0.56, scale: 1.7, stonePhase: 0.7 },
  { variant: 5 satisfies StoneVariant, xRatio: 0.5, yRatio: 0.42, scale: 1.8, stonePhase: 2.0 },
  { variant: 6 satisfies StoneVariant, xRatio: 0.1, yRatio: 0.7, scale: 1.7, stonePhase: 0.0 },
  { variant: 7 satisfies StoneVariant, xRatio: 0.64, yRatio: 0.73, scale: 2.2, stonePhase: 3.0 },
  { variant: 8 satisfies StoneVariant, xRatio: 0.66, yRatio: 0.24, scale: 1.85, stonePhase: 1.0 },
  { variant: 9 satisfies StoneVariant, xRatio: 0.3, yRatio: 0.81, scale: 1.75, stonePhase: 0.0 },
] as const;

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
    yRatio: 0.45,
    scale: 0.8,
    phase: 1.0,
    currentAngle: 3.14,
    waveAmplitude: 0.06,
    waveFreq: 10,
    waveSpeed: 3.0,
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
    waveSpeed: 3.0,
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
const paddedWaterDriftMoveX = padArray(
  waterDriftMoveAngle.map((angle) => Math.cos(angle * DEG_TO_RAD)),
);
const paddedWaterDriftMoveY = padArray(
  waterDriftMoveAngle.map((angle) => Math.sin(angle * DEG_TO_RAD)),
);
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
  const stone1 = useImage(STONE_VARIANTS[1]);
  const stone2 = useImage(STONE_VARIANTS[2]);
  const stone3 = useImage(STONE_VARIANTS[3]);
  const stone4 = useImage(STONE_VARIANTS[4]);
  const stone5 = useImage(STONE_VARIANTS[5]);
  const stone6 = useImage(STONE_VARIANTS[6]);
  const stone7 = useImage(STONE_VARIANTS[7]);
  const stone8 = useImage(STONE_VARIANTS[8]);
  const stone9 = useImage(STONE_VARIANTS[9]);
  const clock = useThrottledClock(30);

  const bgWidth = Math.max(1, Math.round(width * BACKGROUND_RES));
  const bgHeight = Math.max(1, Math.round(height * BACKGROUND_RES));

  const uniforms = useDerivedValue(() => ({
    iTime: clock.value / 1500,
    iResolution: [bgWidth, bgHeight] as [number, number],
    tileScale,
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
    waterDriftMoveX: paddedWaterDriftMoveX,
    waterDriftMoveY: paddedWaterDriftMoveY,
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

  if (
    !image ||
    !seaweed1 ||
    !seaweed2 ||
    !seaweed3 ||
    !stone1 ||
    !stone2 ||
    !stone3 ||
    !stone4 ||
    !stone5 ||
    !stone6 ||
    !stone7 ||
    !stone8 ||
    !stone9 ||
    width === 0 ||
    height === 0
  ) {
    return null;
  }

  const seaweedImages = { 1: seaweed1, 2: seaweed2, 3: seaweed3 };
  const stoneImages = {
    1: stone1,
    2: stone2,
    3: stone3,
    4: stone4,
    5: stone5,
    6: stone6,
    7: stone7,
    8: stone8,
    9: stone9,
  };

  return (
    <View style={styles.container} pointerEvents="none">
      <Canvas
        style={[
          styles.backgroundCanvas,
          {
            width: bgWidth,
            height: bgHeight,
            transform: [{ scale: 1 / BACKGROUND_RES }],
          },
        ]}>
        <Fill>
          <Shader source={seafloorEffect} uniforms={uniforms}>
            <ImageShader
              image={image}
              tx="repeat"
              ty="repeat"
              fit="none"
              width={bgWidth}
              height={bgHeight}
            />
          </Shader>
        </Fill>
      </Canvas>
      <Canvas style={styles.foregroundCanvas}>
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
  backgroundCanvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
  foregroundCanvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
