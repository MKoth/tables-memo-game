import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import {
  MAX_DRIFT_LAYERS,
  UNDERSEA_SEAFLOOR_BACKGROUND_SKSL,
  underseaSeafloorUniformDefaults,
} from '../../shaders/underseaSeafloorBackground.sksl';

const BACKGROUND_RES = 0.65;
const DEG_TO_RAD = Math.PI / 180;

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
    tints.map(t => t[channel]),
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
  waterDriftMoveAngle.map(angle => Math.cos(angle * DEG_TO_RAD)),
);
const paddedWaterDriftMoveY = padArray(
  waterDriftMoveAngle.map(angle => Math.sin(angle * DEG_TO_RAD)),
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

type UnderseaThemeSeafloorCanvasProps = {
  image: SkImage;
  width: number;
  height: number;
};

export function UnderseaThemeSeafloorCanvas({
  image,
  width,
  height,
}: UnderseaThemeSeafloorCanvasProps) {
  const clock = useUnderseaThemeClock();
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

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <Canvas
      style={[
        styles.canvas,
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
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'top left',
  },
});
