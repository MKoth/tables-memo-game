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
import type { LetterLayout } from '../../../../../core/layout/exerciseLayout';
import { buildMergeShaderUniforms } from './mergeLayout';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import { METABALL_MERGE_SKSL } from '../../../shaders/metaballMerge.sksl';
import { bubbleDeformUniformDefaults } from '../../../shaders/bubbleDeform.sksl';

export type MetaballMergeLayerProps = {
  mergeProgress: SharedValue<number>;
  layout: LetterLayout;
  mergeCenterX: number;
  mergeDiameter: number;
  finalLetterSpacing?: number;
  bubbleImage: SkImage;
  bounds: ZoneRect;
  clock?: SharedValue<number>;
  // Optional overrides to match per-bubble visual parameters from LetterBubble/BubbleInstance
  phase?: number;
  wobbleAmp?: number;
  wobbleSpeed?: number;
  wobbleLobes?: number;
  bgCutoff?: number;
  centerClear?: number;
  rimClear?: number;
  tintA?: readonly [number, number, number];
  tintStrength?: number;
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
  finalLetterSpacing,
  bubbleImage,
  bounds,
  clock,
  phase,
  wobbleAmp,
  wobbleSpeed,
  wobbleLobes,
  bgCutoff,
  centerClear,
  rimClear,
  tintA,
  tintStrength,
}: MetaballMergeLayerProps) {
  const renderingRect = useMemo(
    () => Skia.XYWHRect(bounds.x, bounds.y, bounds.w, bounds.h),
    [bounds],
  );

  const uniforms = useDerivedValue(() => {
    const { mergeProgress: progress, letterCount, letterCenters, baseOpacity } =
      buildMergeShaderUniforms(layout, mergeCenterX, mergeDiameter, mergeProgress.value, undefined, finalLetterSpacing);
    const {
      phase: defaultPhase,
      wobbleAmp: defaultWobbleAmp,
      wobbleSpeed: defaultWobbleSpeed,
      wobbleLobes: defaultWobbleLobes,
      bgCutoff: defaultBgCutoff,
      centerClear: defaultCenterClear,
      rimClear: defaultRimClear,
      tintA: defaultTintA,
      tintStrength: defaultTintStrength,
    } = bubbleDeformUniformDefaults;

    return {
      mergeProgress: progress,
      letterCount,
      letterCenters,
      baseOpacity,
      // Match bubbleDeform defaults so per-letter sampling produces similar center/rim transparency
      bgCutoff: bgCutoff ?? defaultBgCutoff,
      centerClear: centerClear ?? defaultCenterClear,
      rimClear: rimClear ?? defaultRimClear,
      tintA: tintA ?? defaultTintA,
      tintStrength: tintStrength ?? defaultTintStrength,
      // Wobble / animation uniforms (use same defaults as bubbleDeform, allow overrides)
      iTime: (clock ? clock.value : 0) / 1000,
      phase: phase ?? defaultPhase,
      wobbleAmp: wobbleAmp ?? defaultWobbleAmp,
      wobbleSpeed: wobbleSpeed ?? defaultWobbleSpeed,
      wobbleLobes: wobbleLobes ?? defaultWobbleLobes,
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
