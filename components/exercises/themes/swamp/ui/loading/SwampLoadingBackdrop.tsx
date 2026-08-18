import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SkImage } from '@shopify/react-native-skia';
import {
  ExerciseClockProvider,
  useExerciseClock,
} from '../../../../core/clock/ExerciseClockProvider';
import { SwampThemeSceneryBackground } from '../../scenery/SwampThemeSceneryBackground';
import type { SwampThemeImages } from '../../core/assets/swampThemeAssets';

const FALLBACK_COLOR = '#0a1a08';

function SceneryBackdrop({
  backgroundImage,
  decorationImages,
  accentImages,
  width,
  height,
}: {
  backgroundImage: SkImage;
  decorationImages: SwampThemeImages['stones'] | null;
  accentImages: SwampThemeImages['algae'] | null;
  width: number;
  height: number;
}) {
  const clock = useExerciseClock();

  return (
    <SwampThemeSceneryBackground
      seafloorImage={backgroundImage}
      stoneImages={decorationImages}
      algaeImages={accentImages}
      width={width}
      height={height}
      clock={clock}
      dimOverlay
    />
  );
}

type SwampLoadingBackdropProps = {
  width: number;
  height: number;
  backgroundImage: SkImage | null;
  decorationImages: Record<string, SkImage> | null;
  accentImages: Record<string, SkImage> | null;
};

export function SwampLoadingBackdrop({
  width,
  height,
  backgroundImage,
  decorationImages,
  accentImages,
}: SwampLoadingBackdropProps) {
  return (
    <View style={styles.container}>
      {backgroundImage != null ? (
        <ExerciseClockProvider>
          <SceneryBackdrop
            backgroundImage={backgroundImage}
            decorationImages={decorationImages as SwampThemeImages['stones'] | null}
            accentImages={accentImages as SwampThemeImages['algae'] | null}
            width={width}
            height={height}
          />
        </ExerciseClockProvider>
      ) : (
        <View style={[styles.fallback, { width, height }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  fallback: {
    backgroundColor: FALLBACK_COLOR,
  },
});
