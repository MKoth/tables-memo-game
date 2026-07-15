import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SkImage } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { UnderseaThemeImages } from '../../core/assets/underseaThemeAssets';
import {
  UnderseaThemeClockProvider,
  useUnderseaThemeClock,
} from '../../core/clock/UnderseaThemeClockProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { UnderseaThemeSceneBackground } from '../../background/UnderseaThemeSceneBackground';

const FALLBACK_COLOR = '#061828';
const BAR_WIDTH_RATIO = 0.55;
const BAR_HEIGHT = 6;
const BAR_BOTTOM_OFFSET = 56;
const LABEL_BOTTOM_OFFSET = 88;

type UnderseaThemeLoadingScreenProps = {
  seafloorImage: SkImage | null;
  stoneImages: UnderseaThemeImages['stones'] | null;
  seaweedImages: UnderseaThemeImages['seaweed'] | null;
  progress: number;
};

function UnderseaThemeLoadingBackground({
  seafloorImage,
  stoneImages,
  seaweedImages,
  width,
  height,
}: {
  seafloorImage: SkImage;
  stoneImages: UnderseaThemeImages['stones'] | null;
  seaweedImages: UnderseaThemeImages['seaweed'] | null;
  width: number;
  height: number;
}) {
  const clock = useUnderseaThemeClock();

  return (
    <UnderseaThemeSceneBackground
      seafloorImage={seafloorImage}
      stoneImages={stoneImages}
      seaweedImages={seaweedImages}
      width={width}
      height={height}
      clock={clock}
      dimOverlay
    />
  );
}

export function UnderseaThemeLoadingScreen({
  seafloorImage,
  stoneImages,
  seaweedImages,
  progress,
}: UnderseaThemeLoadingScreenProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { koiRect, screenHeight, orientation } = useUnderseaThemeLayout();
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, progress]);

  const { barWidth, barLeft, barBottom, labelBottom, overlayLeft, overlayWidth } =
    useMemo(() => {
      const isPortrait = orientation === 'portrait';
      const contentLeft = koiRect.x + insets.left;
      const contentWidth = isPortrait
        ? koiRect.w - insets.left - insets.right
        : koiRect.w - insets.left;
      const widthForBar = Math.min(
        Math.max(160, contentWidth * BAR_WIDTH_RATIO),
        contentWidth,
      );
      const koiBottomInset = screenHeight - (koiRect.y + koiRect.h);
      const safeBottom = insets.bottom + koiBottomInset;
      return {
        barWidth: widthForBar,
        barLeft: contentLeft + (contentWidth - widthForBar) * 0.5,
        barBottom: safeBottom + BAR_BOTTOM_OFFSET,
        labelBottom: safeBottom + LABEL_BOTTOM_OFFSET,
        overlayLeft: contentLeft,
        overlayWidth: contentWidth,
      };
    }, [insets.bottom, insets.left, insets.right, koiRect, orientation, screenHeight]);

  const fillStyle = useAnimatedStyle(() => ({
    width: (barWidth * animatedProgress.value) / 100,
  }));

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={styles.container} pointerEvents="none">
      {seafloorImage != null ? (
        <UnderseaThemeClockProvider>
          <UnderseaThemeLoadingBackground
            seafloorImage={seafloorImage}
            stoneImages={stoneImages}
            seaweedImages={seaweedImages}
            width={width}
            height={height}
          />
        </UnderseaThemeClockProvider>
      ) : (
        <View style={styles.fallback} />
      )}

      <View
        style={[
          styles.overlay,
          { left: overlayLeft, width: overlayWidth, bottom: labelBottom },
        ]}>
        <ActivityIndicator size="small" color="rgba(180, 240, 255, 0.95)" />
        <Text style={styles.label}>Loading… {clampedProgress}%</Text>
      </View>

      <View
        style={[
          styles.barTrack,
          {
            width: barWidth,
            left: barLeft,
            bottom: barBottom,
          },
        ]}>
        <Animated.View style={[styles.barFill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FALLBACK_COLOR,
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: FALLBACK_COLOR,
  },
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    color: 'rgba(220, 245, 255, 0.95)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  barTrack: {
    position: 'absolute',
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT,
    backgroundColor: 'rgba(120, 180, 220, 0.22)',
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT,
    backgroundColor: 'rgba(160, 230, 255, 0.95)',
  },
});
