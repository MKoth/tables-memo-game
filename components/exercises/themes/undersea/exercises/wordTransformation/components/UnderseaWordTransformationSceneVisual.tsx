import React, { useMemo, useState } from 'react';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ThemeWordTransformationSceneProps } from '../../../../../themeContract';
import type { LetterOrbModel } from '../../../../../wordTransformation/domain';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';
import { TransformationBubbleLayer } from './TransformationBubbleLayer';

function sceneLettersToModels(scene: WordTransformationSceneState): LetterOrbModel[] {
  return scene.letters.map(letter => ({
    key: `letter-${letter.position}`,
    char: letter.char,
    position: letter.position,
    popped: letter.popped,
    wrong: letter.wrong,
    skipEnter: letter.skipEnter,
    popDelayMs: letter.popDelayMs ?? undefined,
    enterDelayMs: letter.enterDelayMs ?? undefined,
  }));
}

export function UnderseaWordTransformationSceneVisual({
  sceneStateSv,
  variantPickerItems,
  onLetterPress,
  onVariantSelect,
  playPop,
  playInflate,
}: ThemeWordTransformationSceneProps) {
  const [scene, setScene] = useState<WordTransformationSceneState>(() => sceneStateSv.value);

  useAnimatedReaction(
    () => sceneStateSv.value,
    (next, previous) => {
      if (next !== previous) {
        scheduleOnRN(setScene, next);
      }
    },
    [sceneStateSv],
  );

  const letters = useMemo(() => sceneLettersToModels(scene), [scene]);

  return (
    <TransformationBubbleLayer
      wordBubblesVisible={scene.wordOrbsVisible}
      letters={letters}
      lettersInteractive={scene.lettersInteractive}
      insertAnimation={scene.insertAnimation}
      variantPickerVisible={scene.variantPicker.visible}
      variantPickerInteractive={scene.variantPicker.interactive}
      variantPickerItems={variantPickerItems}
      onLetterPress={onLetterPress}
      onVariantSelect={onVariantSelect}
      playPop={playPop}
      playInflate={playInflate}
    />
  );
}
