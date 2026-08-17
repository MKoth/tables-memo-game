import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group, type SkImage } from '@shopify/react-native-skia';
import { useAnimatedReaction, useDerivedValue, runOnJS } from 'react-native-reanimated';
import { useExerciseLayout } from '../../../core';
import type { ZoneRect } from '../../../core/layout/computeExerciseLayout';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import type { FlowerGardenSoundController } from '../core/assets/useFlowerGardenThemeSounds';
import { useRoamerSimulation, type RoamerSimulation } from './core/useRoamerSimulation';
import { ButterflyInstance } from './butterfly/ButterflyInstance';
import { BeeInstance } from './bee/BeeInstance';
import { BumblebeeInstance } from './bumblebee/BumblebeeInstance';
import {
  FlightState,
  type RoamerSharedRuntime,
  type RoamerSpawn,
} from './core/types';
import type { FlowerGardenBuzzSpecies } from '../core/assets/useFlowerGardenThemeSounds';
import { isRoamerBuzzActive } from './core/roamerBuzz';
import { pickRoamerDrawPass } from './core/pickRoamerDrawPass';
import type { SpeciesWeights } from './core/speciesAllocator';

export type RoamerLayerProps = {
  words: string[];
  interactive?: boolean;
  sessionId?: string;
  sim?: RoamerSimulation;
  hiddenIndices?: number[];
  /** Species mix for the roamer spawns (defaults to the shared species config). */
  speciesWeights?: SpeciesWeights;
  /** Override the swim zone rect (defaults to the layout's roamerRect). */
  roamerRect?: ZoneRect;
};

type RoamerLayerContentProps = {
  sim: RoamerSimulation;
  interactive: boolean;
  hiddenIndices: number[];
  images: {
    lycaenidaeBodyImage: SkImage | null;
    lycaenidaeWingLeftImages: SkImage[] | null;
    lycaenidaeWingRightImages: SkImage[] | null;
    beeBodyImage: SkImage | null;
    beeLeftWingImage: SkImage | null;
    beeRightWingImage: SkImage | null;
    bumblebeeBodyImage: SkImage | null;
    bumblebeeLeftWingImage: SkImage | null;
    bumblebeeRightWingImage: SkImage | null;
  };
};

function RoamerLayerContent({ sim, interactive, images, hiddenIndices }: RoamerLayerContentProps) {
  if (sim.runtimeEntries.length === 0) {
    return null;
  }

  return (
    <>
      {sim.runtimeEntries.map(({ spawn, runtime }, index) => {
        if (spawn.species === 'bee' || spawn.species === 'bumblebee') {
          return (
            <BuzzRoamerLink
              key={`buzz-${index}`}
              roamerIndex={index}
              species={spawn.species}
              runtime={runtime}
            />
          );
        }
        return null;
      })}
      <RoamerCanvas sim={sim} interactive={interactive} images={images} hiddenIndices={hiddenIndices} />
    </>
  );
}

function RoamerCanvas({
  sim,
  interactive,
  images,
  hiddenIndices,
}: RoamerLayerContentProps) {

  const isHidden = (index: number) => hiddenIndices.includes(index);

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
          if (isHidden(index)) {
            return null;
          }
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
          if (isHidden(index)) {
            return null;
          }
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

function RoamerLayerWithSim({
  words,
  interactive,
  sessionId,
  hiddenIndices,
  speciesWeights,
  images,
  roamerRect: overrideRect,
}: {
  words: string[];
  interactive: boolean;
  sessionId: string;
  hiddenIndices: number[];
  speciesWeights?: SpeciesWeights;
  images: RoamerLayerContentProps['images'];
  roamerRect?: ZoneRect;
}) {
  const layout = useExerciseLayout();
  const { roamerRect: layoutRect, screenWidth, screenHeight, layoutKey } = layout;
  const roamerRect = overrideRect ?? layoutRect;

  const sim = useRoamerSimulation({
    words,
    width: screenWidth,
    height: screenHeight,
    roamerRect,
    layoutKey,
    sessionId,
    speciesWeights,
  });

  return (
    <RoamerLayerContent
      sim={sim}
      interactive={interactive}
      hiddenIndices={hiddenIndices}
      images={images}
    />
  );
}

export function RoamerLayer({
  words,
  interactive = false,
  sessionId = 'default',
  sim: externalSim,
  hiddenIndices = [],
  speciesWeights,
  roamerRect,
}: RoamerLayerProps) {
  const { images } = useFlowerGardenAssetsContext();

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

  if (externalSim != null) {
    return (
      <RoamerLayerContent
        sim={externalSim}
        interactive={interactive}
        hiddenIndices={hiddenIndices}
        images={images}
      />
    );
  }

  return (
    <RoamerLayerWithSim
      words={words}
      interactive={interactive}
      sessionId={sessionId}
      hiddenIndices={hiddenIndices}
      speciesWeights={speciesWeights}
      images={images}
      roamerRect={roamerRect}
    />
  );
}

type BuzzRoamerLinkProps = {
  roamerIndex: number;
  species: FlowerGardenBuzzSpecies;
  runtime: RoamerSharedRuntime;
};

function BuzzRoamerLink({ roamerIndex, species, runtime }: BuzzRoamerLinkProps) {
  const { sounds } = useFlowerGardenAssetsContext();
  const soundsRef = useRef<FlowerGardenSoundController>(sounds);
  soundsRef.current = sounds;

  useEffect(() => {
    soundsRef.current.registerRoamerBuzz(roamerIndex, species);
    return () => {
      soundsRef.current.releaseRoamerBuzz(roamerIndex);
    };
  }, [roamerIndex, species]);

  const handleBuzzActive = useCallback(
    (active: boolean) => {
      soundsRef.current.setRoamerBuzzActive(roamerIndex, active);
    },
    [roamerIndex],
  );

  useAnimatedReaction(
    () =>
      isRoamerBuzzActive(
        runtime.state.value as FlightState,
        runtime.isPreTakeoff.value,
      ),
    (active: boolean) => {
      runOnJS(handleBuzzActive)(active);
    },
    [roamerIndex, runtime],
  );

  return null;
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
