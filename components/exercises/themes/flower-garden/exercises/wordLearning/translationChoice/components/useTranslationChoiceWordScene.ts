import { useEffect, useMemo, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  computeLetterLayout,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from '../../../../../../core/layout/exerciseLayout';
import type { ZoneRect } from '../../../../../../core/layout/computeExerciseLayout';
import type { LetterOrbModel } from '../../../../../../wordTransformation/domain/coreTypes';
import type {
  WordTransformationSceneLetter,
  WordTransformationSceneState,
} from '../../../../../../wordTransformation/scene/sceneStateTypes';

export type UseTranslationChoiceWordSceneParams = {
  englishLetters: LetterOrbModel[];
  spanishLetters: LetterOrbModel[];
  zoneRect: ZoneRect;
  /** Row position inside the zone (defaults to the word-row ratio). */
  rowYRatio?: number;
};

function toSceneLetter(
  letter: LetterOrbModel,
  centerX: number,
  centerY: number,
  diameter: number,
): WordTransformationSceneLetter {
  return {
    position: letter.position,
    char: letter.char,
    centerX,
    centerY,
    diameter,
    popped: letter.popped,
    wrong: letter.wrong,
    skipEnter: letter.skipEnter === true,
    popDelayMs: letter.popDelayMs ?? null,
    enterDelayMs: letter.enterDelayMs ?? null,
  };
}

function sceneSignature(
  letters: readonly WordTransformationSceneLetter[],
  layout: { diameter: number; rowY: number; centers: readonly number[] },
): string {
  return [
    layout.diameter,
    layout.rowY,
    layout.centers.join(','),
    letters
      .map(
        letter =>
          `${letter.position}:${letter.char}:${letter.popped}:${letter.wrong}:${letter.skipEnter}:${letter.enterDelayMs}:${letter.popDelayMs}`,
      )
      .join('|'),
  ].join('#');
}

const EMPTY_SCENE: WordTransformationSceneState = {
  wordOrbsVisible: false,
  lettersInteractive: false,
  letters: [],
  insertAnimation: null,
  variantPicker: {
    visible: false,
    interactive: false,
    items: [],
  },
};

export function useTranslationChoiceWordScene({
  englishLetters,
  spanishLetters,
  zoneRect,
  rowYRatio = TRANSFORMATION_WORD_ROW_Y_RATIO,
}: UseTranslationChoiceWordSceneParams): SharedValue<WordTransformationSceneState> {
  const sceneStateSv = useSharedValue<WordTransformationSceneState>(EMPTY_SCENE);
  const lastSignatureRef = useRef('');

  const letters = useMemo(
    () => (englishLetters.length > 0 ? englishLetters : spanishLetters),
    [englishLetters, spanishLetters],
  );

  const layout = useMemo(
    () =>
      letters.length > 0
        ? computeLetterLayout(zoneRect, letters.length, rowYRatio)
        : { diameter: 0, rowY: 0, centers: [] },
    [letters.length, zoneRect, rowYRatio],
  );

  useEffect(() => {
    if (letters.length === 0) {
      if (lastSignatureRef.current !== '') {
        lastSignatureRef.current = '';
        sceneStateSv.value = EMPTY_SCENE;
      }
      return;
    }
    const sceneLetters = letters.map(letter => {
      const geometry = {
        centerX: layout.centers[letter.position] ?? 0,
        centerY: layout.rowY,
        diameter: layout.diameter,
      };
      return toSceneLetter(letter, geometry.centerX, geometry.centerY, geometry.diameter);
    });
    const signature = sceneSignature(sceneLetters, layout);
    if (signature === lastSignatureRef.current) {
      return;
    }
    lastSignatureRef.current = signature;
    sceneStateSv.value = {
      wordOrbsVisible: true,
      lettersInteractive: false,
      letters: sceneLetters,
      insertAnimation: null,
      variantPicker: {
        visible: false,
        interactive: false,
        items: [],
      },
    };
  }, [letters, layout, sceneStateSv]);

  return sceneStateSv;
}
