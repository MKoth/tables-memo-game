import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, type SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useFlowerGardenAssetsContext } from '../core/providers/FlowerGardenAssetsProvider';
import type {
  OrbAnimState,
} from './orbAnimTypes';
import { CapturedRoamerCanvas } from './CapturedRoamerCanvas';
import { OrbWordLabel } from './OrbWordLabel';
import { OrbFlowerShader } from './OrbFlowerShader';
import { ORB_FLOWER_PRESET, type OrbFlowerPreset } from './orbAnimPresets';
import type { RoamerRuntimeEntry, RoamerSpecies } from '../roamer/core/types';

type ImageLookup = ReturnType<typeof useFlowerGardenAssetsContext>['images'];

type SpeciesImageSet = {
  body: SkImage | null;
  leftWing: SkImage | null;
  rightWing: SkImage | null;
};

export function getSpeciesImages(
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
  centerX: number;
  centerY: number;
  word?: string | null;
  targetDiameter?: number;
  seed: number;
  preset?: OrbFlowerPreset;
};

export function CaptureOrb({
  anim,
  capturedEntry,
  centerX,
  centerY,
  word,
  targetDiameter = 0,
  seed,
  preset = ORB_FLOWER_PRESET,
}: CaptureOrbProps) {
  const { width, height } = useWindowDimensions();
  const { images } = useFlowerGardenAssetsContext();
  const ringImages = images.orbRingImages;
  const bedImages = images.orbBedImages;

  if (width === 0 || height === 0) {
    return null;
  }
  if (ringImages == null || bedImages == null) {
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
      <OrbFlowerShader
        anim={anim}
        seed={seed}
        targetDiameter={targetDiameter}
        preset={preset}
        ringVariants={ringImages}
        bedVariants={bedImages}
      />
      <CapturedRoamerCanvas
        entry={capturedEntry}
        anim={anim}
        bodyImage={speciesImages.body}
        leftWingImage={speciesImages.leftWing}
        rightWingImage={speciesImages.rightWing}
        centerX={centerX}
        centerY={centerY}
      />
      {word != null && word.length > 0 && (
        <OrbWordLabel word={word} anim={anim} targetDiameter={targetDiameter} />
      )}
    </Canvas>
  );
}

export type { ImageLookup, SpeciesImageSet };
