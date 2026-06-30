import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Canvas, Fill, type SkImage } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { UnderseaClockProvider } from './UnderseaClockContext';
import { UnderseaSeafloorShaderCanvas } from './UnderseaSeafloorShaderCanvas';

const FALLBACK_COLOR = '#061828';
const BAR_WIDTH_RATIO = 0.55;
const BAR_HEIGHT = 6;
const BAR_BOTTOM_OFFSET = 56;
const LABEL_BOTTOM_OFFSET = 88;

type UnderseaLoadingScreenProps = {
  seafloorImage: SkImage | null;
  progress: number;
};

function UnderseaLoadingBackground({
  seafloorImage,
  width,
  height,
}: {
  seafloorImage: SkImage;
  width: number;
  height: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <UnderseaSeafloorShaderCanvas image={seafloorImage} width={width} height={height} />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Fill color="rgba(4, 18, 32, 0.28)" />
      </Canvas>
    </View>
  );
}

export function UnderseaLoadingScreen({ seafloorImage, progress }: UnderseaLoadingScreenProps) {
  const { width, height } = useWindowDimensions();
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, progress]);

  const barWidth = Math.max(160, width * BAR_WIDTH_RATIO);
  const barLeft = (width - barWidth) * 0.5;

  const fillStyle = useAnimatedStyle(() => ({
    width: (barWidth * animatedProgress.value) / 100,
  }));

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={styles.container} pointerEvents="none">
      {seafloorImage != null ? (
        <UnderseaClockProvider>
          <UnderseaLoadingBackground
            seafloorImage={seafloorImage}
            width={width}
            height={height}
          />
        </UnderseaClockProvider>
      ) : (
        <View style={styles.fallback} />
      )}

      <View style={[styles.overlay, { bottom: LABEL_BOTTOM_OFFSET }]}>
        <ActivityIndicator size="small" color="rgba(180, 240, 255, 0.95)" />
        <Text style={styles.label}>Loading… {clampedProgress}%</Text>
      </View>

      <View
        style={[
          styles.barTrack,
          {
            width: barWidth,
            left: barLeft,
            bottom: BAR_BOTTOM_OFFSET,
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
    left: 0,
    right: 0,
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
