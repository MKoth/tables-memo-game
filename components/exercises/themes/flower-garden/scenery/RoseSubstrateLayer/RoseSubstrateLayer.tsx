import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  ImageShader,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import type { BushConfig } from '../BushShaderLayer/types';
import {
  MAX_ROSE_DISCS,
  ROSE_SUBSTRATE_SKSL,
  SUBSTRATE_COVERING_SIZE,
  roseSubstrateUniformDefaults,
} from '../../shaders/roseSubstrate.sksl';
import {
  ROSE_TINT_PRESETS,
  type RoseTintRgb,
} from '../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';

function compileRoseSubstrateEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ROSE_SUBSTRATE_SKSL);
  if (!effect) {
    throw new Error('Failed to compile rose substrate shader');
  }
  return effect;
}

const roseSubstrateEffect = compileRoseSubstrateEffect();

function padArray(arr: readonly number[], target: number, fill = 0): number[] {
  'worklet';
  const len = Math.min(arr.length, target);
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    out.push(arr[i]!);
  }
  for (let i = len; i < target; i++) {
    out.push(fill);
  }
  return out;
}

export type RoseSubstrateLayerProps = {
  bushConfigs: readonly BushConfig[];
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  roseBellSizes: readonly number[];
  substrateImage: SkImage;
};

export function RoseSubstrateLayerImpl({
  bushConfigs,
  layoutX,
  layoutY,
  layoutScale,
  roseBellSizes,
  substrateImage,
}: RoseSubstrateLayerProps) {
  const { width, height } = useWindowDimensions();

  const cellTints = useMemo<RoseTintRgb[]>(() => {
    const tints: RoseTintRgb[] = new Array(roseBellSizes.length);
    for (const bush of bushConfigs) {
      for (const stem of bush.stems) {
        tints[stem.roseIndex] = bush.tint;
      }
    }
    return tints;
  }, [bushConfigs, roseBellSizes.length]);

  const uniforms = useDerivedValue(() => {
    const x = layoutX.value;
    const y = layoutY.value;
    const s = layoutScale.value;
    const n = Math.min(roseBellSizes.length, MAX_ROSE_DISCS);
    const centerX: number[] = [];
    const centerY: number[] = [];
    const scale: number[] = [];
    const discRadius: number[] = [];
    const tints: number[] = [];
    for (let i = 0; i < n; i++) {
      centerX.push(x[i] ?? 0);
      centerY.push(y[i] ?? 0);
      scale.push(s[i] ?? 1);
      discRadius.push((roseBellSizes[i] ?? 0) * 0.6);
      const tint = cellTints[i] ?? ROSE_TINT_PRESETS.scarlet;
      tints.push(tint[0], tint[1], tint[2]);
    }
    return {
      roseCount: n,
      roseCenterX: padArray(centerX, MAX_ROSE_DISCS),
      roseCenterY: padArray(centerY, MAX_ROSE_DISCS),
      roseScale: padArray(scale, MAX_ROSE_DISCS, 1),
      roseDiscRadius: padArray(discRadius, MAX_ROSE_DISCS),
      roseTint: padArray(tints, MAX_ROSE_DISCS * 3),
      substrateRadius: roseSubstrateUniformDefaults.substrateRadius,
      substrateOpacity: roseSubstrateUniformDefaults.substrateOpacity,
      substrateFade: roseSubstrateUniformDefaults.substrateFade,
      substrateTintStrength: roseSubstrateUniformDefaults.substrateTintStrength,
    };
  });

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <Shader source={roseSubstrateEffect} uniforms={uniforms}>
          <ImageShader
            image={substrateImage}
            x={0}
            y={0}
            width={SUBSTRATE_COVERING_SIZE}
            height={SUBSTRATE_COVERING_SIZE}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        </Shader>
      </Rect>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});

export const RoseSubstrateLayer = React.memo(RoseSubstrateLayerImpl);
