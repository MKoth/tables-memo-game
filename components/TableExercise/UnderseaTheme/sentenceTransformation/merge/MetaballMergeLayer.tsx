import React, { useMemo } from 'react';
import {
  FilterMode,
  ImageShader,
  MipmapMode,
  Rect,
  Shader,
  Skia,
  type SkImage,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { LetterLayout } from '../../core/layout/underseaExerciseLayout';
import { buildMergeShaderUniforms } from './mergeLayout';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import { METABALL_MERGE_SKSL } from '../../shaders/metaballMerge.sksl';

export type MetaballMergeLayerProps = {
  mergeProgress: SharedValue<number>;
  layout: LetterLayout;
  mergeCenterX: number;
  mergeDiameter: number;
  bubbleImage: SkImage;
  bounds: ZoneRect;
};

/**
 * Canvas host for the metaball merge shader (issue 02).
 * Uniforms are derived from the shared merge progress so letter motion stays in sync.
 */
function compileMetaballEffect(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(METABALL_MERGE_SKSL);
  if (!effect) {
    throw new Error('Failed to compile metaball merge shader');
  }
  return effect;
}

const metaballEffect = compileMetaballEffect();

const SPRITE_SAMPLING = {
  filter: FilterMode.Linear,
  mipmap: MipmapMode.Linear,
} as const;

export function MetaballMergeLayer({
  mergeProgress,
  layout,
  mergeCenterX,
  mergeDiameter,
  bubbleImage,
  bounds,
}: MetaballMergeLayerProps) {
  const renderingRect = useMemo(
    () => Skia.XYWHRect(bounds.x, bounds.y, bounds.w, bounds.h),
    [bounds],
  );

  const uniforms = useDerivedValue(() => {
    const base = buildMergeShaderUniforms(
      layout,
      mergeCenterX,
      mergeDiameter,
      mergeProgress.value,
    );
    return {
      ...base,
      boundsX: bounds.x,
      boundsY: bounds.y,
      boundsW: Math.max(bounds.w, 1),
      boundsH: Math.max(bounds.h, 1),
    };
  });

  return (
    <Rect rect={renderingRect}>
      <Shader source={metaballEffect} uniforms={uniforms}>
        <ImageShader
          image={bubbleImage}
          rect={renderingRect}
          fit="fill"
          tx="clamp"
          ty="clamp"
          sampling={SPRITE_SAMPLING}
        />
      </Shader>
    </Rect>
  );
}
