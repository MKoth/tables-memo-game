import React from 'react';
import { Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { LetterLayout } from '../../core/layout/underseaExerciseLayout';
import { buildMergeShaderUniforms } from './mergeLayout';

export type MetaballMergeLayerProps = {
  mergeProgress: SharedValue<number>;
  layout: LetterLayout;
  mergeCenterX: number;
  mergeDiameter: number;
  bubbleImage: SkImage;
};

/**
 * Canvas host for the metaball merge shader (issue 02).
 * Uniforms are derived from the shared merge progress so letter motion stays in sync.
 */
export function MetaballMergeLayer({
  mergeProgress,
  layout,
  mergeCenterX,
  mergeDiameter,
  bubbleImage: _bubbleImage,
}: MetaballMergeLayerProps) {
  const uniforms = useDerivedValue(() =>
    buildMergeShaderUniforms(
      layout,
      mergeCenterX,
      mergeDiameter,
      mergeProgress.value,
    ),
  );

  // Shader rendering lands in issue 02; keep the layer mounted for uniform wiring.
  void uniforms;

  return <Group />;
}
