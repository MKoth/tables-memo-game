import { useEffect, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';
import type { SentenceTransformationGame } from '../../../../../sentenceTransformation/hooks/useSentenceTransformationGame';
import { deriveFlowerGardenSentenceScene } from './deriveFlowerGardenSentenceScene';

const EMPTY_SCENE: WordTransformationSceneState = {
  wordOrbsVisible: true,
  lettersInteractive: false,
  letters: [],
  insertAnimation: null,
  variantPicker: {
    visible: false,
    interactive: false,
    items: [],
  },
};

export function useFlowerGardenSentenceTransformationScene(
  game: SentenceTransformationGame,
  roamerRect: ZoneRect,
): SharedValue<WordTransformationSceneState> {
  const sceneStateSv = useSharedValue<WordTransformationSceneState>(EMPTY_SCENE);

  const gameRef = useRef(game);
  gameRef.current = game;
  const roamerRectRef = useRef(roamerRect);
  roamerRectRef.current = roamerRect;
  const sceneStateSvRef = useRef(sceneStateSv);
  sceneStateSvRef.current = sceneStateSv;

  useEffect(() => {
    sceneStateSvRef.current.value = deriveFlowerGardenSentenceScene({
      game: gameRef.current,
      roamerRect: roamerRectRef.current,
    });
  });

  return sceneStateSv;
}
