import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SkImage } from '@shopify/react-native-skia';
import {
  ExerciseClockProvider,
  useExerciseClock,
} from '../../../../core/clock/ExerciseClockProvider';
import { UnderseaThemeSceneryBackground } from '../../scenery/UnderseaThemeSceneryBackground';
import type { UnderseaThemeImages } from '../../core/assets/underseaThemeAssets';

const FALLBACK_COLOR = '#061828';

function SceneryBackdrop({
  backgroundImage,
  decorationImages,
  accentImages,
  width,
  height,
}: {
  backgroundImage: SkImage;
  decorationImages: UnderseaThemeImages['stones'] | null;
  accentImages: UnderseaThemeImages['seaweed'] | null;
  width: number;
  height: number;
}) {
  const clock = useExerciseClock();

  return (
    <UnderseaThemeSceneryBackground
      seafloorImage={backgroundImage}
      stoneImages={decorationImages}
      seaweedImages={accentImages}
      width={width}
      height={height}
      clock={clock}
      dimOverlay
    />
  );
}

type LoadingBackdropProps = {
  width: number;
  height: number;
  backgroundImage: SkImage | null;
  decorationImages: Record<string, SkImage> | null;
  accentImages: Record<string, SkImage> | null;
};

export function LoadingBackdrop({
  width,
  height,
  backgroundImage,
  decorationImages,
  accentImages,
}: LoadingBackdropProps) {
  return (
    <View style={styles.container}>
      {backgroundImage != null ? (
        <ExerciseClockProvider>
          <SceneryBackdrop
            backgroundImage={backgroundImage}
            decorationImages={decorationImages as UnderseaThemeImages['stones'] | null}
            accentImages={accentImages as UnderseaThemeImages['seaweed'] | null}
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
