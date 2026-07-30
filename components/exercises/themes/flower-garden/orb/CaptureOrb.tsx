import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import {
  ORB_PETAL_SIZE_FACTOR_BY_RING,
  ORB_RING_CONFIGS,
} from './orbAnimPresets';
import type {
  OrbAnimState,
  PetalRingConfig,
  PetalSpawnConfig,
} from './orbAnimTypes';
import { PetalRingLayer, type PetalSlot } from './PetalRingLayer';
import { CapturedRoamerCanvas } from './CapturedRoamerCanvas';
import type { RoamerRuntimeEntry, RoamerSpecies } from '../roamer/core/types';

type ImageLookup = ReturnType<typeof useFlowerGardenAssetsContext>['images'];

type SpeciesImageSet = {
  body: SkImage | null;
  leftWing: SkImage | null;
  rightWing: SkImage | null;
};

function getSpeciesImages(
  images: ImageLookup,
  entry: RoamerRuntimeEntry,
): SpeciesImageSet {
  const species: RoamerSpecies = entry.spawn.species;
  if (species === 'butterfly') {
    const leftWing = images.lycaenidaeWingLeftImages?.[entry.spawn.wingPairIndex] ?? null;
    const rightWing =
      images.lycaenidaeWingRightImages?.[entry.spawn.wingPairIndex] ?? null;
    return {
      body: images.lycaenidaeBodyImage,
      leftWing,
      rightWing,
    };
  }
  if (species === 'bee') {
    return {
      body: images.beeBodyImage,
      leftWing: images.beeLeftWingImage,
      rightWing: images.beeRightWingImage,
    };
  }
  return {
    body: images.bumblebeeBodyImage,
    leftWing: images.bumblebeeLeftWingImage,
    rightWing: images.bumblebeeRightWingImage,
  };
}

export type CaptureOrbProps = {
  anim: SharedValue<OrbAnimState>;
  capturedEntry: RoamerRuntimeEntry;
  petals: ReadonlyArray<PetalSpawnConfig>;
  centerX: number;
  centerY: number;
};

export function CaptureOrb({
  anim,
  capturedEntry,
  petals,
  centerX,
  centerY,
}: CaptureOrbProps) {
  const { width, height } = useWindowDimensions();
  const { images } = useFlowerGardenAssetsContext();
  const orbPetalImages = images.orbPetalImages;

  const slotsByRing = useMemo(() => {
    const buckets: PetalSlot[][] = [[], [], []];
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i]!;
      if (p.ringIndex < 0 || p.ringIndex >= buckets.length) continue;
      buckets[p.ringIndex]!.push({
        spawnIndex: i,
        imageIndex: p.imageIndex,
      });
    }
    return buckets;
  }, [petals]);

  const reversedRings = useMemo(() => [...ORB_RING_CONFIGS].reverse(), []);

  if (width === 0 || height === 0) {
    return null;
  }
  if (orbPetalImages == null) {
    return null;
  }

  const speciesImages = getSpeciesImages(images, capturedEntry);
  if (
    speciesImages.body == null ||
    speciesImages.leftWing == null ||
    speciesImages.rightWing == null
  ) {
    return null;
  }

  return (
    <Canvas
      style={[StyleSheet.absoluteFill, { width, height }]}
      pointerEvents="none"
    >
      <CapturedRoamerCanvas
        entry={capturedEntry}
        bodyImage={speciesImages.body}
        leftWingImage={speciesImages.leftWing}
        rightWingImage={speciesImages.rightWing}
        centerX={centerX}
        centerY={centerY}
        angle={capturedEntry.spawn.initialAngle}
      />
      {reversedRings.map(ring => (
        <PetalRingLayer
          key={`ring-${ring.ringIndex}`}
          sizeFactor={ORB_PETAL_SIZE_FACTOR_BY_RING[ring.ringIndex] ?? 1}
          slots={slotsByRing[ring.ringIndex] ?? []}
          anim={anim}
          images={orbPetalImages}
        />
      ))}
    </Canvas>
  );
}

export { ORB_PETAL_SIZE_FACTOR_BY_RING };
export type { PetalRingConfig };
