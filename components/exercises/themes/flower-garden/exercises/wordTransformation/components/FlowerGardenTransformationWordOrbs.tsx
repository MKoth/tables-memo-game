import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useExerciseClock } from '../../../../../core';
import { useExerciseLayout } from '../../../../../core';
import {
  computeLetterLayout,
  previewCenterForLetter,
} from '../../../../../core/layout/exerciseLayout';
import type { ThemeTransformationWordOrbsProps } from '../../../../../themeContract';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import type { LetterOrbModel } from '../../../../../wordTransformation/domain';
import { FlowerGardenLetterOrb } from './FlowerGardenLetterOrb';

function statusFor(letter: LetterOrbModel): 'idle' | 'wrong' | 'popped' {
  if (letter.popped) {
    return 'popped';
  }
  if (letter.wrong) {
    return 'wrong';
  }
  return 'idle';
}

export function FlowerGardenTransformationWordOrbs({
  letters,
  interactive = true,
  insertPreview,
  mergeWord: _mergeWord,
  onMergeComplete: _onMergeComplete,
  onLetterPress,
  playPop,
  playInflate,
  zoneRect: zoneRectProp,
}: ThemeTransformationWordOrbsProps) {
  const { roamerRect } = useExerciseLayout();
  const zoneRect = zoneRectProp ?? roamerRect;
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClock();

  const layout = useMemo(
    () => computeLetterLayout(zoneRect, letters.length),
    [zoneRect, letters.length],
  );

  const previewLayout = useMemo(
    () =>
      insertPreview == null
        ? null
        : computeLetterLayout(zoneRect, insertPreview.targetLetterCount),
    [insertPreview, zoneRect],
  );

  const activeLayout = previewLayout ?? layout;

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

  if (letters.length === 0 || images.orbPetalImages == null) {
    return null;
  }
  const orbPetalImages = images.orbPetalImages;

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {letters.map(letter => {
          const centerX =
            insertPreview != null && previewLayout != null
              ? previewCenterForLetter(letter.position, insertPreview, previewLayout)
              : (layout.centers[letter.position] ?? 0);

          return (
            <FlowerGardenLetterOrb
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
              image={orbPetalImages[0]!}
              font={font}
              clock={clock}
            />
          );
        })}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {letters.map(letter => {
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
              accessibilityRole="button"
              accessibilityLabel={`Delete ${letter.char}`}
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
