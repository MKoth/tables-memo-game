import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { useExerciseClockQuantized } from '../../../../../core';
import { useExerciseLayout } from '../../../../../core';
import {
  computeLetterLayout,
  previewCenterForLetter,
} from '../../../../../core/layout/exerciseLayout';
import type { ThemeTransformationWordOrbsProps } from '../../../../../themeContract';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { logPerfEvent, useRenderTracker } from '../../../core/perf/flowerGardenPerfLogger';
import { ORB_IDLE_CLOCK_FPS } from '../../../orb/orbAnimPresets';
import type { LetterOrbGeometry } from '../../../orb/orbAnimTypes';
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

function buildGeometry(
  letter: LetterOrbModel,
  centerX: number,
  centerY: number,
  diameter: number,
): LetterOrbGeometry {
  return {
    centerX,
    centerY,
    diameter,
    initialCenterX: letter.skipEnter ? centerX : undefined,
    initialCenterY: letter.skipEnter ? centerY : undefined,
    initialDiameter: letter.skipEnter ? diameter : undefined,
    skipEnter: letter.skipEnter,
    moveDurationMs: letter.skipEnter ? 0 : undefined,
  };
}

type LetterGeometryEntry = {
  letter: LetterOrbModel;
  geometry: SharedValue<LetterOrbGeometry>;
};

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
  useRenderTracker('FG:WordOrbs');
  logPerfEvent(
    `WordOrbs render letters=${letters.length} statuses=${letters.map(statusFor).join('')} insert=${insertPreview != null ? 'y' : 'n'}`,
  );
  const { roamerRect } = useExerciseLayout();
  const zoneRect = zoneRectProp ?? roamerRect;
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);
  const geometryMapRef = useRef<Map<string, SharedValue<LetterOrbGeometry>>>(new Map());

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

  const letterGeometries = useMemo<LetterGeometryEntry[]>(() => {
    const map = geometryMapRef.current;
    return letters.map(letter => {
      let sv = map.get(letter.key);
      if (sv == null) {
        const centerX = centerXFor(letter, layout, insertPreview, previewLayout);
        sv = makeMutable<LetterOrbGeometry>(
          buildGeometry(letter, centerX, activeLayout.rowY, activeLayout.diameter),
        );
        map.set(letter.key, sv);
      }
      return { letter, geometry: sv };
    });
  }, [activeLayout, insertPreview, layout, letters, previewLayout]);

  useLayoutEffect(() => {
    const map = geometryMapRef.current;
    const liveKeys = new Set(letters.map(letter => letter.key));
    for (const key of map.keys()) {
      if (!liveKeys.has(key)) {
        map.delete(key);
      }
    }
    for (const letter of letters) {
      const sv = map.get(letter.key);
      if (sv == null) {
        continue;
      }
      const centerX = centerXFor(letter, layout, insertPreview, previewLayout);
      sv.value = buildGeometry(letter, centerX, activeLayout.rowY, activeLayout.diameter);
    }
  }, [activeLayout, insertPreview, layout, letters, previewLayout]);

  if (letters.length === 0 || images.orbRingSmallImages == null || images.orbBedSmallImages == null) {
    return null;
  }

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {letterGeometries.map(({ letter, geometry }) => (
          <FlowerGardenLetterOrb
            key={letter.key}
            char={letter.char}
            status={statusFor(letter)}
            geometry={geometry}
            popDelayMs={letter.popDelayMs}
            enterDelayMs={letter.enterDelayMs}
            onPopSound={letter.popDelayMs != null ? playPop : undefined}
            onEnterSound={letter.enterDelayMs != null ? playInflate : undefined}
            ringVariants={images.orbRingSmallImages}
            bedVariants={images.orbBedSmallImages}
            clock={clock}
          />
        ))}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {letters.map(letter => {
          if (letter.popped) {
            return null;
          }
          const cx = centerXFor(letter, layout, insertPreview, previewLayout);
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

function centerXFor(
  letter: LetterOrbModel,
  layout: ReturnType<typeof computeLetterLayout>,
  insertPreview: ThemeTransformationWordOrbsProps['insertPreview'],
  previewLayout: ReturnType<typeof computeLetterLayout> | null,
): number {
  if (insertPreview != null && previewLayout != null) {
    return previewCenterForLetter(letter.position, insertPreview, previewLayout);
  }
  return layout.centers[letter.position] ?? 0;
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
    borderRadius: 999,
  },
});
