import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseClock } from '../../../core';
import { useExerciseLayout } from '../../../core';
import { LetterBubble, type LetterBubbleStatus } from './LetterBubble';
import {
  computeLetterLayout,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
} from '../../../core/layout/exerciseLayout';
import type { VariantPickerItem } from '../../../wordTransformation/domain/coreTypes';

export type { VariantPickerItem } from '../../../wordTransformation/domain/coreTypes';

function statusFor(
  item: VariantPickerItem,
  wrongItemId: string | null,
  poppedItemIds: ReadonlySet<string> | undefined,
): LetterBubbleStatus {
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

export type TransformationVariantPickerProps = {
  items: VariantPickerItem[];
  wrongItemId?: string | null;
  hiddenItemIds?: ReadonlySet<string>;
  poppedItemIds?: ReadonlySet<string>;
  interactive?: boolean;
  onSelect: (item: VariantPickerItem, source: VariantPickerSourceLayout) => void;
  /** Fired (UI-thread synced) as each wrong variant pops during dismiss. */
  playPop?: () => void;
};

export function TransformationVariantPicker({
  items,
  wrongItemId = null,
  hiddenItemIds,
  poppedItemIds,
  interactive = true,
  onSelect,
  playPop,
}: TransformationVariantPickerProps) {
  const { koiRect } = useExerciseLayout();
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useExerciseClock();

  const layout = useMemo(
    () => computeLetterLayout(koiRect, items.length, TRANSFORMATION_VARIANT_ROW_Y_RATIO),
    [items.length, koiRect],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const maxLabelLength = useMemo(
    () => items.reduce((max, item) => Math.max(max, item.label.length), 1),
    [items],
  );
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(
          14,
          (layout.diameter * 0.5) / Math.max(1, maxLabelLength * 0.52),
        ),
        fontWeight: '700',
      }),
    [fontFamily, layout.diameter, maxLabelLength],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {items.map((item, i) => {
          if (hiddenItemIds?.has(item.id)) {
            return null;
          }
          return (
            <LetterBubble
              key={item.id}
              char={item.label}
              centerX={layout.centers[i] ?? 0}
              centerY={layout.rowY}
              diameter={layout.diameter}
              status={statusFor(item, wrongItemId ?? null, poppedItemIds)}
              popDelayMs={item.popDelayMs}
              onPopSound={item.popDelayMs != null ? playPop : undefined}
              image={images.bubble}
              font={font}
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
