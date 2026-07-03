import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';

const VARIANT_FILL = 'rgba(82, 173, 245, 0.42)';
const VARIANT_BORDER = 'rgba(191, 235, 255, 0.6)';
const VARIANT_WRONG_BORDER = '#ff5a5a';

type VariantButtonProps = {
  variant: string;
  isWrong: boolean;
  disabled?: boolean;
  onPress: (variant: string) => void;
};

function VariantButton({ variant, isWrong, disabled, onPress }: VariantButtonProps) {
  const wiggle = useSharedValue(0);

  useEffect(() => {
    if (!isWrong) {
      return;
    }
    wiggle.value = withSequence(
      withTiming(-7, { duration: 60 }),
      withTiming(7, { duration: 110 }),
      withTiming(-5, { duration: 110 }),
      withTiming(5, { duration: 110 }),
      withTiming(0, { duration: 90 }),
    );
  }, [isWrong, wiggle]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: wiggle.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        disabled={disabled}
        onPress={() => onPress(variant)}
        style={({ pressed }) => [
          styles.button,
          isWrong && styles.buttonWrong,
          pressed && !disabled && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Insert ${variant}`}>
        <Text style={[styles.buttonText, isWrong && styles.buttonTextWrong]}>
          {variant}
        </Text>
      </Pressable>
    </Animated.View>
  );
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

  if (variants.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          left: koiRect.x,
          top: koiRect.y + koiRect.h * 0.58,
          width: koiRect.w,
        },
      ]}
      pointerEvents="box-none">
      <View style={styles.row}>
        {variants.map((variant) => (
          <VariantButton
            key={variant}
            variant={variant}
            isWrong={wrongVariant === variant}
            disabled={!interactive}
            onPress={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    minWidth: 60,
    height: 60,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: VARIANT_FILL,
    borderWidth: 2,
    borderColor: VARIANT_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrong: {
    borderColor: VARIANT_WRONG_BORDER,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(10, 40, 64, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonTextWrong: {
    color: VARIANT_WRONG_BORDER,
  },
});
