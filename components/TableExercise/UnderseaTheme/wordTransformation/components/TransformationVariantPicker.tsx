import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Canvas, matchFont } from '@shopify/react-native-skia';
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClock } from '../../core/clock/UnderseaThemeClockProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { LetterBubble, type LetterBubbleStatus } from './LetterBubble';
import { computeLetterLayout, TRANSFORMATION_VARIANT_ROW_Y_RATIO } from './TransformationWordBubbles';

function statusFor(variant: string, wrongVariant: string | null): LetterBubbleStatus {
  if (wrongVariant === variant) {
    return 'wrong';
  }
  return 'idle';
}

export type TransformationVariantPickerProps = {
  variants: string[];
  wrongVariant: string | null;
  interactive?: boolean;
  onSelect: (variant: string) => void;
};

export function TransformationVariantPicker({
  variants,
  wrongVariant,
  interactive = true,
  onSelect,
}: TransformationVariantPickerProps) {
  const { koiRect } = useUnderseaThemeLayout();
  const { images } = useUnderseaThemeAssetsContext();
  const clock = useUnderseaThemeClock();

  const layout = useMemo(
    () => computeLetterLayout(koiRect, variants.length, TRANSFORMATION_VARIANT_ROW_Y_RATIO),
    [koiRect, variants.length],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const maxVariantLength = useMemo(
    () => variants.reduce((max, variant) => Math.max(max, variant.length), 1),
    [variants],
  );
  const font = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: Math.max(
          14,
          (layout.diameter * 0.5) / Math.max(1, maxVariantLength * 0.52),
        ),
        fontWeight: '700',
      }),
    [fontFamily, layout.diameter, maxVariantLength],
  );

  if (variants.length === 0) {
    return null;
  }

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {variants.map((variant, i) => (
          <LetterBubble
            key={variant}
            char={variant}
            centerX={layout.centers[i] ?? 0}
            centerY={layout.rowY}
            diameter={layout.diameter}
            status={statusFor(variant, wrongVariant)}
            image={images.bubble}
            font={font}
            clock={clock}
          />
        ))}
      </Canvas>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {variants.map((variant, i) => {
          const cx = layout.centers[i] ?? 0;
          return (
            <Pressable
              key={variant}
              disabled={!interactive}
              onPress={() => onSelect(variant)}
              accessibilityRole="button"
              accessibilityLabel={`Insert ${variant}`}
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
