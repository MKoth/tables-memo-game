import React from 'react';
import { StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Canvas } from '@shopify/react-native-skia';
import { useExerciseClockQuantized } from '../../../../../core';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { FlowerGardenLetterOrb } from './FlowerGardenLetterOrb';
import { ORB_IDLE_CLOCK_FPS } from '../../../orb/orbAnimPresets';
import type { VariantPickerItem } from '../../../../../wordTransformation/domain/coreTypes';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';

export type { VariantPickerItem } from '../../../../../wordTransformation/domain/coreTypes';

export type VariantPickerSourceLayout = {
  centerX: number;
  centerY: number;
  diameter: number;
};

export type FlowerGardenTransformationVariantPickerProps = {
  /** React identity for the always-mounted elements (id + label). Statuses,
   * visibility, and pops arrive via the scene shared value. */
  items: VariantPickerItem[];
  sceneStateSv: SharedValue<WordTransformationSceneState>;
  playPop?: () => void;
};

/**
 * Always mounted: picking a variant never pays a React render or a Skia
 * surface creation. Orbs are keyed by index so item ids changing at op
 * boundaries retarget labels and scene statuses instead of remounting.
 */
export function FlowerGardenTransformationVariantPicker({
  items,
  sceneStateSv,
  playPop,
}: FlowerGardenTransformationVariantPickerProps) {
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);

  if (items.length === 0 || images.orbRingSmallImages == null || images.orbBedSmallImages == null) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((item, index) => (
        <FlowerGardenLetterOrb
          key={index}
          char={item.label}
          status="idle"
          clock={clock}
          sceneStateSv={sceneStateSv}
          sceneKind="picker"
          sceneKey={index}
          onPopSound={playPop}
          ringVariants={images.orbRingSmallImages}
          bedVariants={images.orbBedSmallImages}
        />
      ))}
    </Canvas>
  );
}
