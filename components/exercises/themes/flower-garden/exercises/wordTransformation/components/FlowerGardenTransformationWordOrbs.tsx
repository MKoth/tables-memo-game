import React from 'react';
import { StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Canvas } from '@shopify/react-native-skia';
import { useExerciseClockQuantized } from '../../../../../core';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { ORB_IDLE_CLOCK_FPS } from '../../../orb/orbAnimPresets';
import type { LetterOrbModel } from '../../../../../wordTransformation/domain';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';
import { FlowerGardenLetterOrb } from './FlowerGardenLetterOrb';

export type FlowerGardenTransformationWordOrbsProps = {
  letters: LetterOrbModel[];
  sceneStateSv: SharedValue<WordTransformationSceneState>;
  playPop?: () => void;
  playInflate?: () => void;
};

/**
 * Renders the word-row orbs keyed by position, so word transitions retarget
 * geometry instead of remounting. Chars/keys update only at op/word
 * boundaries; every per-press change — statuses, preview shifts, pops, enter
 * cascades — flows through the scene shared value on the UI thread.
 */
export function FlowerGardenTransformationWordOrbs({
  letters,
  sceneStateSv,
  playPop,
  playInflate,
}: FlowerGardenTransformationWordOrbsProps) {
  const { images } = useFlowerGardenAssetsContext();
  const clock = useExerciseClockQuantized(ORB_IDLE_CLOCK_FPS);

  if (letters.length === 0 || images.orbRingSmallImages == null || images.orbBedSmallImages == null) {
    return null;
  }

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {letters.map(letter => (
        <FlowerGardenLetterOrb
          key={letter.position}
          char={letter.char}
          status="idle"
          clock={clock}
          sceneStateSv={sceneStateSv}
          sceneKind="letters"
          sceneKey={letter.position}
          onPopSound={playPop}
          onEnterSound={playInflate}
          ringVariants={images.orbRingSmallImages}
          bedVariants={images.orbBedSmallImages}
        />
      ))}
    </Canvas>
  );
}
