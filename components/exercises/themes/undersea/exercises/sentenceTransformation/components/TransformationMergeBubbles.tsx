import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../../../core';
import { computeLetterLayout } from '../../../../../core/layout/exerciseLayout';
import { ROUND_MERGE_DURATION_MS } from '../../../../../sentenceTransformation/domain/roundResolutionTiming';
import { MergeLetterLabels } from '../merge/MergeLetterLabels';
import { MetaballMergeLayer } from '../merge/MetaballMergeLayer';
import { computeMergeTarget } from '../merge/mergeLayout';
import { useMergeProgress } from '../merge/useMergeProgress';
import { useExerciseClock } from '../../../../../core';
import { bubbleDeformUniformDefaults } from '../../../shaders/bubbleDeform.sksl';

export type TransformationMergeBubblesProps = {
  word: string;
  durationMs?: number;
  onComplete?: () => void;
};

export function TransformationMergeBubbles({
  word,
  durationMs = ROUND_MERGE_DURATION_MS,
  onComplete,
}: TransformationMergeBubblesProps) {
  const { roamerRect } = useExerciseLayout();
  const { images } = useUnderseaThemeAssetsContext();
  const mergeProgress = useMergeProgress(durationMs, onComplete);

  const layout = useMemo(
    () => computeLetterLayout(roamerRect, word.length),
    [roamerRect, word.length],
  );

  const { mergeCenterX, mergeDiameter, finalLetterSpacing } = useMemo(
    () => computeMergeTarget(layout, roamerRect),
    [roamerRect, layout],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const fontSize = Math.max(16, layout.diameter * 0.5);
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize,
        fontWeight: '700',
      }),
    [fontFamily, fontSize],
  );

  if (word.length === 0) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <MetaballMergeLayer
        mergeProgress={mergeProgress}
        layout={layout}
        mergeCenterX={mergeCenterX}
        mergeDiameter={mergeDiameter}
        finalLetterSpacing={finalLetterSpacing}
        bubbleImage={images.bubble}
        bounds={roamerRect}
        clock={useExerciseClock()}
        bgCutoff={bubbleDeformUniformDefaults.bgCutoff}
        centerClear={bubbleDeformUniformDefaults.centerClear}
        rimClear={bubbleDeformUniformDefaults.rimClear}
        tintA={bubbleDeformUniformDefaults.tintA}
        tintStrength={bubbleDeformUniformDefaults.tintStrength}
      />
      <MergeLetterLabels
        word={word}
        mergeProgress={mergeProgress}
        layout={layout}
        mergeCenterX={mergeCenterX}
        mergeDiameter={mergeDiameter}
        finalLetterSpacing={finalLetterSpacing}
        font={font}
      />
    </Canvas>
  );
}
