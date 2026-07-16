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
  const clock = useExerciseClock();

  return (
    <UnderseaThemeSceneryBackground
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

type LoadingBackdropProps = {
  width: number;
  height: number;
  seafloorImage: SkImage | null;
  stoneImages: Record<string, SkImage> | null;
  seaweedImages: Record<string, SkImage> | null;
};

export function LoadingBackdrop({
  width,
  height,
  seafloorImage,
  stoneImages,
  seaweedImages,
}: LoadingBackdropProps) {
  return (
    <View style={styles.container}>
      {seafloorImage != null ? (
        <ExerciseClockProvider>
          <SceneryBackdrop
            seafloorImage={seafloorImage}
            stoneImages={stoneImages as UnderseaThemeImages['stones'] | null}
            seaweedImages={seaweedImages as UnderseaThemeImages['seaweed'] | null}
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
