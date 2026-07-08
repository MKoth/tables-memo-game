import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { computeLetterLayout } from '../../core/layout/underseaExerciseLayout';
import { ROUND_MERGE_DURATION_MS } from '../domain/roundResolutionTiming';
import { MergeLetterLabels } from '../merge/MergeLetterLabels';
import { MetaballMergeLayer } from '../merge/MetaballMergeLayer';
import { computeMergeTarget } from '../merge/mergeLayout';
import { useMergeProgress } from '../merge/useMergeProgress';

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
  const { koiRect } = useUnderseaThemeLayout();
  const { images } = useUnderseaThemeAssetsContext();
  const mergeProgress = useMergeProgress(durationMs, onComplete);

  const layout = useMemo(
    () => computeLetterLayout(koiRect, word.length),
    [koiRect, word.length],
  );

  const { mergeCenterX, mergeDiameter } = useMemo(
    () => computeMergeTarget(layout, koiRect),
    [koiRect, layout],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(16, mergeDiameter * 0.5),
        fontWeight: '700',
      }),
    [fontFamily, mergeDiameter],
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
        bubbleImage={images.bubble}
      />
      <MergeLetterLabels
        word={word}
        mergeProgress={mergeProgress}
        layout={layout}
        mergeCenterX={mergeCenterX}
        mergeDiameter={mergeDiameter}
        font={font}
      />
    </Canvas>
  );
}
