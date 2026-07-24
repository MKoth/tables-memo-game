import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useExerciseLayout } from '../../../../core';
import { useFlowerGardenAssetsContext } from '../../core/providers/FlowerGardenAssetsProvider';
import { useButterflySimulation } from './simulation/useButterflySimulation';
import { RoamerButterflyInstance } from './RoamerButterflyInstance';

export type RoamerButterflyLayerProps = {
  words: string[];
  interactive?: boolean;
  sessionId?: string;
};

export function RoamerButterflyLayer({
  words,
  interactive = false,
  sessionId = 'default',
}: RoamerButterflyLayerProps) {
  const layout = useExerciseLayout();
  const { roamerRect, screenWidth, screenHeight, layoutKey } = layout;
  const { images } = useFlowerGardenAssetsContext();

  const sim = useButterflySimulation({
    words,
    width: screenWidth,
    height: screenHeight,
    roamerRect,
    layoutKey,
    sessionId,
  });

  if (
    images.lycaenidaeBodyImage == null ||
    images.lycaenidaeWingLeftImages == null ||
    images.lycaenidaeWingRightImages == null
  ) {
    return null;
  }

  if (sim.runtimeEntries.length === 0) {
    return null;
  }

  const bodyImage = images.lycaenidaeBodyImage;
  const leftWingImages = images.lycaenidaeWingLeftImages;
  const rightWingImages = images.lycaenidaeWingRightImages;

  return (
    <Canvas style={styles.canvas} pointerEvents={interactive ? 'auto' : 'none'}>
      <Group>
        {sim.runtimeEntries.map(({ spawn, runtime }, index) => {
          const leftWingImage = leftWingImages[spawn.wingPairIndex];
          const rightWingImage = rightWingImages[spawn.wingPairIndex];

          if (leftWingImage == null || rightWingImage == null) {
            return null;
          }

          return (
            <RoamerButterflyInstance
              key={`butterfly-${index}`}
              x={runtime.x}
              y={runtime.y}
              angle={runtime.angle}
              wingPhase={runtime.wingPhase}
              renderMode={0}
              bodyImage={bodyImage}
              leftWingImage={leftWingImage}
              rightWingImage={rightWingImage}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
