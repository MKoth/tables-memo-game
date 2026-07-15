import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import {
  computeLetterLayout,
  previewCenterForLetter,
  type InsertPreviewLayout,
} from '../../core/layout/underseaExerciseLayout';
import { LetterBubble, type LetterBubbleStatus } from './LetterBubble';
import type { LetterBubbleModel } from '../domain';

import { bubbleDeformUniformDefaults } from '../../shaders/bubbleDeform.sksl';
import { ROUND_MERGE_DURATION_MS } from '../../sentenceTransformation/domain/roundResolutionTiming';
import { MergeLetterLabels } from '../../sentenceTransformation/merge/MergeLetterLabels';
import { MetaballMergeLayer } from '../../sentenceTransformation/merge/MetaballMergeLayer';
import { computeMergeTarget } from '../../sentenceTransformation/merge/mergeLayout';
import { useMergeProgress } from '../../sentenceTransformation/merge/useMergeProgress';

function statusFor(letter: LetterBubbleModel): LetterBubbleStatus {
  if (letter.popped) {
    return 'popped';
  }
  if (letter.wrong) {
    return 'wrong';
  }
  return 'idle';
}

export type TransformationWordBubblesProps = {
  letters: LetterBubbleModel[];
  interactive?: boolean;
  insertPreview?: InsertPreviewLayout;
  mergeWord?: string | null;
  onMergeComplete?: () => void;
  onLetterPress: (position: number) => void;
  /** Fired (UI-thread synced) as each letter bursts during the exit cascade. */
  playPop?: () => void;
  /** Fired (UI-thread synced) as each letter inflates during the enter cascade. */
  playInflate?: () => void;
  /** Override the zone rect used for letter layout. Defaults to koiRect. */
  zoneRect?: import('../../core/layout/computeUnderseaThemeLayout').ZoneRect;
};

export function TransformationWordBubbles({
  letters,
  interactive = true,
  insertPreview,
  mergeWord,
  onMergeComplete,
  onLetterPress,
  playPop,
  playInflate,
  zoneRect: zoneRectProp,
}: TransformationWordBubblesProps) {
  const { koiRect } = useUnderseaThemeLayout();
  const zoneRect = zoneRectProp ?? koiRect;
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const mergeProgress = useMergeProgress(
    ROUND_MERGE_DURATION_MS,
    onMergeComplete,
    mergeWord,
  );

  const layout = useMemo(
    () => computeLetterLayout(zoneRect, letters.length),
    [zoneRect, letters.length],
  );

  const mergeLayout = useMemo(
    () => (mergeWord ? computeLetterLayout(zoneRect, mergeWord.length) : null),
    [zoneRect, mergeWord],
  );

  const { mergeCenterX, mergeDiameter } = useMemo(
    () => (mergeLayout ? computeMergeTarget(mergeLayout, zoneRect) : { mergeCenterX: 0, mergeDiameter: 0 }),
    [zoneRect, mergeLayout],
  );

  const previewLayout = useMemo(
    () =>
      insertPreview == null
        ? null
        : computeLetterLayout(zoneRect, insertPreview.targetLetterCount),
    [insertPreview, zoneRect],
  );

  const activeLayout = mergeLayout ?? previewLayout ?? layout;

  const [lettersHiddenForMerge, setLettersHiddenForMerge] = useState(false);
  const [mergeCanvasPersist, setMergeCanvasPersist] = useState(false);

  useLayoutEffect(() => {
    if (mergeWord) {
      const raf = requestAnimationFrame(() => {
        setLettersHiddenForMerge(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setLettersHiddenForMerge(false);
    }
  }, [mergeWord]);

  useLayoutEffect(() => {
    if (letters.length === 0 && !mergeWord) {
      setMergeCanvasPersist(true);
      const raf = requestAnimationFrame(() => {
        setMergeCanvasPersist(false);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setMergeCanvasPersist(false);
    }
  }, [letters.length, mergeWord]);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(16, activeLayout.diameter * 0.5),
        fontWeight: '700',
      }),
    [activeLayout.diameter, fontFamily],
  );

  if (letters.length === 0 && !mergeWord && !mergeCanvasPersist) {
    return null;
  }

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {!lettersHiddenForMerge &&
          letters.map((letter) => {
            const centerX =
              insertPreview != null && previewLayout != null
                ? previewCenterForLetter(letter.position, insertPreview, previewLayout)
                : (layout.centers[letter.position] ?? 0);

            return (
              <LetterBubble
                key={letter.key}
                char={letter.char}
                centerX={centerX}
                centerY={activeLayout.rowY}
                diameter={activeLayout.diameter}
                initialCenterX={letter.skipEnter ? centerX : undefined}
                initialCenterY={letter.skipEnter ? activeLayout.rowY : undefined}
                initialDiameter={letter.skipEnter ? activeLayout.diameter : undefined}
                skipEnter={letter.skipEnter}
                moveDurationMs={letter.skipEnter ? 0 : undefined}
                status={statusFor(letter)}
                popDelayMs={letter.popDelayMs}
                enterDelayMs={letter.enterDelayMs}
                onPopSound={letter.popDelayMs != null ? playPop : undefined}
                onEnterSound={letter.enterDelayMs != null ? playInflate : undefined}
                image={images.bubble}
                font={font}
                clock={clock}
              />
            );
          })}
        {mergeWord != null && (
          <>
            <MetaballMergeLayer
              mergeProgress={mergeProgress}
              layout={mergeLayout!}
              mergeCenterX={mergeCenterX}
              mergeDiameter={mergeDiameter}
              bubbleImage={images.bubble}
              bounds={zoneRect}
              clock={clock}
              // pass through bubbleDeform defaults so metaballs visually match LetterBubble
              bgCutoff={bubbleDeformUniformDefaults.bgCutoff}
              centerClear={bubbleDeformUniformDefaults.centerClear}
              rimClear={bubbleDeformUniformDefaults.rimClear}
              tintA={bubbleDeformUniformDefaults.tintA}
              tintStrength={bubbleDeformUniformDefaults.tintStrength}
            />
            <MergeLetterLabels
              word={mergeWord}
              mergeProgress={mergeProgress}
              layout={mergeLayout!}
              mergeCenterX={mergeCenterX}
              mergeDiameter={mergeDiameter}
              font={font}
            />
          </>
        )}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {!lettersHiddenForMerge &&
          letters.map((letter) => {
            if (letter.popped) {
              return null;
            }
            const cx =
              insertPreview != null && previewLayout != null
                ? previewCenterForLetter(letter.position, insertPreview, previewLayout)
                : (layout.centers[letter.position] ?? 0);
            return (
              <Pressable
                key={letter.key}
                disabled={!interactive}
                onPress={() => onLetterPress(letter.position)}
                style={[
                  styles.hit,
                  {
                    left: cx - activeLayout.diameter * 0.5,
                    top: activeLayout.rowY - activeLayout.diameter * 0.5,
                    width: activeLayout.diameter,
                    height: activeLayout.diameter,
                  },
                ]}
              />
            );
          })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    borderRadius: 999,
  },
});
