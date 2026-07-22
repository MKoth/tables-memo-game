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
import { MAX_STEMS_PER_BUSH } from './types';
import {
  pickBushStaticUniforms,
} from './pickBushMotionUniforms';
import { bezierPoint } from './helpers/bezierMath';
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

const BUSH_RECT_MARGIN = 40;
const LEAF_REACH = 84;

function padLayoutArray(arr: readonly number[]): number[] {
  'worklet';
  return [
    ...arr,
    ...Array(Math.max(0, MAX_STEMS_PER_BUSH - arr.length)).fill(0),
  ];
}

function computeBushRect(
  bush: BushConfig,
  margin: number,
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stem of bush.stems) {
    const base = { x: stem.baseX, y: stem.baseY };
    const control = { x: stem.controlX, y: stem.controlY };
    const top = { x: stem.topX, y: stem.topY };
    minX = Math.min(minX, base.x, control.x, top.x);
    maxX = Math.max(maxX, base.x, control.x, top.x);
    minY = Math.min(minY, base.y, control.y, top.y);
    maxY = Math.max(maxY, base.y, control.y, top.y);
    for (const leaf of stem.leaves) {
      const attachment = bezierPoint(leaf.t, base, control, top);
      minX = Math.min(minX, attachment.x - LEAF_REACH);
      maxX = Math.max(maxX, attachment.x + LEAF_REACH);
      minY = Math.min(minY, attachment.y - LEAF_REACH);
      maxY = Math.max(maxY, attachment.y + LEAF_REACH);
    }
  }
  return {
    x: minX - margin,
    y: minY - margin,
    w: maxX - minX + 2 * margin,
    h: maxY - minY + 2 * margin,
  };
}

type BushShaderBushRectProps = {
  bush: BushConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  roseBellSizes: readonly number[];
  stemImage: SkImage;
  calyxImage: SkImage;
  leafImages: readonly SkImage[];
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
}: BushShaderBushRectProps) {
  const readyLeafImages = useMemo(
    () => (leafImages.length >= 4 ? leafImages.slice(0, 4) : null),
    [leafImages],
  );

  const { staticUniforms, bushRect } = useMemo(() => {
    return {
      staticUniforms: pickBushStaticUniforms(bush, roseBellSizes),
      bushRect: computeBushRect(bush, BUSH_RECT_MARGIN),
    };
  }, [bush, roseBellSizes]);

  const uniforms = useDerivedValue(() => {
    const x = layoutX.value;
    const y = layoutY.value;
    const s = layoutScale.value;
    const xArr: number[] = [];
    const yArr: number[] = [];
    const sArr: number[] = [];
    for (let i = 0; i < bush.stems.length; i++) {
      const stem = bush.stems[i]!;
      const cellIndex = stem.roseIndex;
      xArr.push(x[cellIndex] ?? 0);
      yArr.push(y[cellIndex] ?? 0);
      sArr.push(s[cellIndex] ?? 1);
    }
    return {
      ...staticUniforms,
      layoutX: padLayoutArray(xArr),
      layoutY: padLayoutArray(yArr),
      layoutScale: padLayoutArray(sArr),
    };
  });

  if (readyLeafImages == null) return null;

  return (
    <Rect x={bushRect.x} y={bushRect.y} width={bushRect.w} height={bushRect.h}>
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
