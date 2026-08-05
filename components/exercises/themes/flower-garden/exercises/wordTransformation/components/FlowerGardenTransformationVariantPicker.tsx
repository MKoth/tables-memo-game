import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import { makeMutable, type SharedValue } from 'react-native-reanimated';
import { useExerciseClockQuantized } from '../../../../../core';
import { useExerciseLayout } from '../../../../../core';
import {
  computeLetterLayout,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
} from '../../../../../core/layout/exerciseLayout';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { FlowerGardenLetterOrb } from './FlowerGardenLetterOrb';
import { ORB_IDLE_CLOCK_FPS } from '../../../orb/orbAnimPresets';
import type { LetterOrbGeometry } from '../../../orb/orbAnimTypes';
import type { VariantPickerItem } from '../../../../../wordTransformation/domain/coreTypes';

export type { VariantPickerItem } from '../../../../../wordTransformation/domain/coreTypes';

function statusFor(
  item: VariantPickerItem,
  wrongItemId: string | null,
  poppedItemIds: ReadonlySet<string> | undefined,
): 'idle' | 'wrong' | 'popped' {
  if (item.popping || poppedItemIds?.has(item.id)) {
    return 'popped';
  }
  if (wrongItemId === item.id) {
    return 'wrong';
  }
  return 'idle';
}

export type VariantPickerSourceLayout = {
  centerX: number;
  centerY: number;
  diameter: number;
};

export type FlowerGardenTransformationVariantPickerProps = {
  items: VariantPickerItem[];
  wrongItemId?: string | null;
  hiddenItemIds?: ReadonlySet<string>;
  poppedItemIds?: ReadonlySet<string>;
  interactive?: boolean;
  onSelect: (item: VariantPickerItem, source: VariantPickerSourceLayout) => void;
  /** Fired (UI-thread synced) as each wrong variant pops during dismiss. */
  playPop?: () => void;
};

export function FlowerGardenTransformationVariantPicker({
  items,
  wrongItemId = null,
  hiddenItemIds,
  poppedItemIds,
  interactive = true,
  onSelect,
  playPop,
}: FlowerGardenTransformationVariantPickerProps) {
  const { roamerRect } = useExerciseLayout();
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);
  const geometryMapRef = useRef<Map<string, SharedValue<LetterOrbGeometry>>>(new Map());

  const layout = useMemo(
    () => computeLetterLayout(roamerRect, items.length, TRANSFORMATION_VARIANT_ROW_Y_RATIO),
    [items.length, roamerRect],
  );

  const itemGeometries = useMemo(() => {
    const map = geometryMapRef.current;
    return items.map((item, index) => {
      let sv = map.get(item.id);
      if (sv == null) {
        sv = makeMutable<LetterOrbGeometry>({
          centerX: layout.centers[index] ?? 0,
          centerY: layout.rowY,
          diameter: layout.diameter,
        });
        map.set(item.id, sv);
      }
      return { item, geometry: sv };
    });
  }, [items, layout]);

  useLayoutEffect(() => {
    const map = geometryMapRef.current;
    const liveIds = new Set(items.map(item => item.id));
    for (const id of map.keys()) {
      if (!liveIds.has(id)) {
        map.delete(id);
      }
    }
    items.forEach((item, index) => {
      const sv = map.get(item.id);
      if (sv == null) {
        return;
      }
      sv.value = {
        centerX: layout.centers[index] ?? 0,
        centerY: layout.rowY,
        diameter: layout.diameter,
      };
    });
  }, [items, layout]);

  if (items.length === 0 || images.orbRingSmallImages == null || images.orbBedSmallImages == null) {
    return null;
  }

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {itemGeometries.map(({ item, geometry }) => {
          if (hiddenItemIds?.has(item.id)) {
            return null;
          }
          return (
            <FlowerGardenLetterOrb
              key={item.id}
              char={item.label}
              status={statusFor(item, wrongItemId ?? null, poppedItemIds)}
              geometry={geometry}
              popDelayMs={item.popDelayMs}
              onPopSound={item.popDelayMs != null ? playPop : undefined}
              ringVariants={images.orbRingSmallImages}
              bedVariants={images.orbBedSmallImages}
              clock={clock}
            />
          );
        })}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {items.map((item, i) => {
          if (hiddenItemIds?.has(item.id) || item.popping || poppedItemIds?.has(item.id)) {
            return null;
          }
          const cx = layout.centers[i] ?? 0;
          return (
            <Pressable
              key={item.id}
              disabled={!interactive}
              onPress={() =>
                onSelect(item, {
                  centerX: cx,
                  centerY: layout.rowY,
                  diameter: layout.diameter,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Insert ${item.label}`}
              style={[
                styles.hit,
                {
                  left: cx - layout.diameter * 0.5,
                  top: layout.rowY - layout.diameter * 0.5,
                  width: layout.diameter,
                  height: layout.diameter,
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
