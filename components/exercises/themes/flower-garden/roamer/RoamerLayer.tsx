import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { useExerciseLayout } from '../../../core';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import { useRoamerSimulation } from './core/useRoamerSimulation';
import { ButterflyInstance } from './butterfly/ButterflyInstance';
import { BeeInstance } from './bee/BeeInstance';
import { BumblebeeInstance } from './bumblebee/BumblebeeInstance';
import { FlightState, type RoamerSharedRuntime, type RoamerSpawn } from './core/types';
import { pickRoamerDrawPass } from './core/pickRoamerDrawPass';

export type RoamerLayerProps = {
  words: string[];
  interactive?: boolean;
  sessionId?: string;
};

export function RoamerLayer({
  words,
  interactive = false,
  sessionId = 'default',
}: RoamerLayerProps) {
  const layout = useExerciseLayout();
  const { roamerRect, screenWidth, screenHeight, layoutKey } = layout;
  const { images } = useFlowerGardenAssetsContext();

  const sim = useRoamerSimulation({
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
    images.lycaenidaeWingRightImages == null ||
    images.beeBodyImage == null ||
    images.beeLeftWingImage == null ||
    images.beeRightWingImage == null ||
    images.bumblebeeBodyImage == null ||
    images.bumblebeeLeftWingImage == null ||
    images.bumblebeeRightWingImage == null
  ) {
    return null;
  }

  if (sim.runtimeEntries.length === 0) {
    return null;
  }

  const getInstanceProps = (spawn: RoamerSpawn): {
    Instance: typeof ButterflyInstance | typeof BeeInstance | typeof BumblebeeInstance;
    bodyImage: SkImage;
    leftWingImage: SkImage;
    rightWingImage: SkImage;
  } | null => {
    if (spawn.species === 'butterfly') {
      const leftWingImages = images.lycaenidaeWingLeftImages!;
      const rightWingImages = images.lycaenidaeWingRightImages!;
      const leftWingImage = leftWingImages[spawn.wingPairIndex];
      const rightWingImage = rightWingImages[spawn.wingPairIndex];
      if (leftWingImage == null || rightWingImage == null) return null;
      return {
        Instance: ButterflyInstance,
        bodyImage: images.lycaenidaeBodyImage!,
        leftWingImage,
        rightWingImage,
      };
    }
    if (spawn.species === 'bee') {
      return {
        Instance: BeeInstance,
        bodyImage: images.beeBodyImage!,
        leftWingImage: images.beeLeftWingImage!,
        rightWingImage: images.beeRightWingImage!,
      };
    }
    return {
      Instance: BumblebeeInstance,
      bodyImage: images.bumblebeeBodyImage!,
      leftWingImage: images.bumblebeeLeftWingImage!,
      rightWingImage: images.bumblebeeRightWingImage!,
    };
  };

  return (
    <Canvas style={styles.canvas} pointerEvents={interactive ? 'auto' : 'none'}>
      <Group>
        {sim.runtimeEntries.map(({ spawn, runtime }, index) => {
          const props = getInstanceProps(spawn);
          if (props == null) return null;
          const { Instance, bodyImage, leftWingImage, rightWingImage } = props;
          return (
            <SittingPass
              key={`sitting-${index}`}
              runtime={runtime}
              bodyImage={bodyImage}
              leftWingImage={leftWingImage}
              rightWingImage={rightWingImage}
              Instance={Instance}
            />
          );
        })}
      </Group>
      <Group>
        {sim.runtimeEntries.map(({ spawn, runtime }, index) => {
          const props = getInstanceProps(spawn);
          if (props == null) return null;
          const { Instance, bodyImage, leftWingImage, rightWingImage } = props;
          return (
            <FlyingPass
              key={`flying-${index}`}
              runtime={runtime}
              bodyImage={bodyImage}
              leftWingImage={leftWingImage}
              rightWingImage={rightWingImage}
              Instance={Instance}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}

type PassProps = {
  runtime: RoamerSharedRuntime;
  bodyImage: SkImage;
  leftWingImage: SkImage;
  rightWingImage: SkImage;
  Instance: React.ComponentType<{
    x: RoamerSharedRuntime['x'];
    y: RoamerSharedRuntime['y'];
    angle: RoamerSharedRuntime['angle'];
    wingPhase: RoamerSharedRuntime['wingPhase'];
    bodyScale: RoamerSharedRuntime['bodyScale'];
    renderMode: number;
    bodyImage: SkImage;
    leftWingImage: SkImage;
    rightWingImage: SkImage;
    legPhases: RoamerSharedRuntime['legPhases'];
    legVisibility: RoamerSharedRuntime['legVisibility'];
    isPreTakeoff: RoamerSharedRuntime['isPreTakeoff'];
    spawnLegPhaseOffsets: number[];
  }>;
};

function SittingPass({
  runtime,
  bodyImage,
  leftWingImage,
  rightWingImage,
  Instance,
}: PassProps) {
  const opacity = useDerivedValue(() => {
    const pass = pickRoamerDrawPass(runtime.state.value as FlightState);
    return pass === 'sitting' ? 1 : 0;
  });

  return (
    <Group opacity={opacity}>
      <Instance
        x={runtime.x}
        y={runtime.y}
        angle={runtime.angle}
        wingPhase={runtime.wingPhase}
        bodyScale={runtime.bodyScale}
        renderMode={1}
        bodyImage={bodyImage}
        leftWingImage={leftWingImage}
        rightWingImage={rightWingImage}
        legPhases={runtime.legPhases}
        legVisibility={runtime.legVisibility}
        isPreTakeoff={runtime.isPreTakeoff}
        spawnLegPhaseOffsets={runtime.spawn.legPhaseOffsets}
      />
    </Group>
  );
}

function FlyingPass({
  runtime,
  bodyImage,
  leftWingImage,
  rightWingImage,
  Instance,
}: PassProps) {
  const opacity = useDerivedValue(() => {
    const pass = pickRoamerDrawPass(runtime.state.value as FlightState);
    return pass === 'flying' ? 1 : 0;
  });

  return (
    <Group opacity={opacity}>
      <Instance
        x={runtime.x}
        y={runtime.y}
        angle={runtime.angle}
        wingPhase={runtime.wingPhase}
        bodyScale={runtime.bodyScale}
        renderMode={0}
        bodyImage={bodyImage}
        leftWingImage={leftWingImage}
        rightWingImage={rightWingImage}
        legPhases={runtime.legPhases}
        legVisibility={runtime.legVisibility}
        isPreTakeoff={runtime.isPreTakeoff}
        spawnLegPhaseOffsets={runtime.spawn.legPhaseOffsets}
      />
    </Group>
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
