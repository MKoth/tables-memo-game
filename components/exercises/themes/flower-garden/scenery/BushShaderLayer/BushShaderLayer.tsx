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
import type { BushConfig } from './types';
import {
  pickBushMotionUniforms,
  type LayoutSnapshot,
} from './pickBushMotionUniforms';
import {
  COVERING_SIZE,
  ROSE_BUSH_SKSL,
} from '../../shaders/roseBush.sksl';

function compileRoseBushEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ROSE_BUSH_SKSL);
  if (!effect) {
    throw new Error('Failed to compile rose bush shader');
  }
  return effect;
}

const roseBushEffect = compileRoseBushEffect();

type BushShaderBushRectProps = {
  bush: BushConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  roseBellSizes: readonly number[];
  stemImage: SkImage;
  calyxImage: SkImage;
  leafImages: readonly SkImage[];
  width: number;
  height: number;
};

function BushShaderBushRect({
  bush,
  layoutX,
  layoutY,
  layoutScale,
  roseBellSizes,
  stemImage,
  calyxImage,
  leafImages,
  width,
  height,
}: BushShaderBushRectProps) {
  const readyLeafImages = useMemo(
    () => (leafImages.length >= 4 ? leafImages.slice(0, 4) : null),
    [leafImages],
  );

  const uniforms = useDerivedValue(() => {
    const snapshot: LayoutSnapshot = {
      x: layoutX.value,
      y: layoutY.value,
      scale: layoutScale.value,
    };
    return pickBushMotionUniforms(bush, snapshot, roseBellSizes);
  });

  if (readyLeafImages == null) return null;

  return (
    <Rect x={0} y={0} width={width} height={height}>
      <Shader source={roseBushEffect} uniforms={uniforms}>
        <ImageShader
          image={stemImage}
          x={0}
          y={0}
          width={COVERING_SIZE}
          height={COVERING_SIZE}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        <ImageShader
          image={calyxImage}
          x={0}
          y={0}
          width={COVERING_SIZE}
          height={COVERING_SIZE}
          fit="fill"
          tx="clamp"
          ty="clamp"
        />
        {readyLeafImages.map((img, i) => (
          <ImageShader
            key={`leaf-${i}`}
            image={img}
            x={0}
            y={0}
            width={COVERING_SIZE}
            height={COVERING_SIZE}
            fit="fill"
            tx="clamp"
            ty="clamp"
          />
        ))}
      </Shader>
    </Rect>
  );
}

export type BushShaderLayerProps = {
  bushConfigs: readonly BushConfig[];
  layoutX: SharedValue<number[]> | null;
  layoutY: SharedValue<number[]> | null;
  layoutScale: SharedValue<number[]> | null;
  roseBellSizes: readonly number[];
  stemImage: SkImage;
  calyxImage: SkImage;
  leafImages: readonly SkImage[];
};

function BushShaderLayerImpl({
  bushConfigs,
  layoutX,
  layoutY,
  layoutScale,
  roseBellSizes,
  stemImage,
  calyxImage,
  leafImages,
}: BushShaderLayerProps) {
  const { width, height } = useWindowDimensions();

  if (width === 0 || height === 0) return null;
  if (bushConfigs.length === 0) return null;
  if (
    layoutX == null ||
    layoutY == null ||
    layoutScale == null
  ) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {bushConfigs.map(bush => (
        <BushShaderBushRect
          key={bush.bushId}
          bush={bush}
          layoutX={layoutX}
          layoutY={layoutY}
          layoutScale={layoutScale}
          roseBellSizes={roseBellSizes}
          stemImage={stemImage}
          calyxImage={calyxImage}
          leafImages={leafImages}
          width={width}
          height={height}
        />
      ))}
    </Canvas>
  );
}

export const BushShaderLayer = React.memo(BushShaderLayerImpl);

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
