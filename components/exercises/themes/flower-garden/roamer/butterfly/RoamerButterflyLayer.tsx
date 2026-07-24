import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import { useExerciseLayout } from '../../../../core';
import { useFlowerGardenAssetsContext } from '../../core/providers/FlowerGardenAssetsProvider';
import { createRng, hashSeedString } from '../../scenery/BushShaderLayer/helpers/seededRandom';
import { createButterflySpawnsFromWords } from './simulation/createButterflySpawns';
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
  const { roamerRect } = layout;
  const { images } = useFlowerGardenAssetsContext();

  const seed = useMemo(() => hashSeedString(`butterfly-${sessionId}`), [sessionId]);
  const rng = useMemo(() => createRng(seed), [seed]);

  const spawns = useMemo(
    () => createButterflySpawnsFromWords(words, rng),
    [words, rng],
  );

  const instances = useMemo(() => {
    if (
      images.lycaenidaeBodyImage == null ||
      images.lycaenidaeWingLeftImages == null ||
      images.lycaenidaeWingRightImages == null
    ) {
      return [];
    }

    return spawns.map((spawn, index) => {
      const leftWingImage = images.lycaenidaeWingLeftImages![spawn.wingPairIndex];
      const rightWingImage = images.lycaenidaeWingRightImages![spawn.wingPairIndex];

      if (leftWingImage == null || rightWingImage == null) {
        return null;
      }

      return (
        <RoamerButterflyInstance
          key={`butterfly-${index}`}
          bodyCenterX={roamerRect.x + spawn.xRatio * roamerRect.w}
          bodyCenterY={roamerRect.y + spawn.yRatio * roamerRect.h}
          bodyAngle={0}
          bodyScale={1}
          wingLeftFlap={0}
          wingRightFlap={0}
          legVisibility={0}
          renderMode={0}
          bodyImage={images.lycaenidaeBodyImage!}
          leftWingImage={leftWingImage}
          rightWingImage={rightWingImage}
        />
      );
    }).filter(Boolean);
  }, [spawns, images.lycaenidaeBodyImage, images.lycaenidaeWingLeftImages, images.lycaenidaeWingRightImages, roamerRect]);

  if (instances.length === 0) {
    return null;
  }

  return (
    <Canvas style={styles.canvas} pointerEvents={interactive ? 'auto' : 'none'}>
      <Group>
        {instances}
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
