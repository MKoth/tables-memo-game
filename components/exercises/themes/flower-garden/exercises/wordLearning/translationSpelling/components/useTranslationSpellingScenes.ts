import { useEffect, useMemo, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import {
  computeLetterLayout,
  computePoolLetterLayout,
  type LetterLayout,
  type PoolLetterLayout,
} from '../../../../../../core/layout/exerciseLayout';
import type { ZoneRect } from '../../../../../../core/layout/computeExerciseLayout';
import type {
  InsertAnimationState,
  LetterOrbModel,
} from '../../../../../../wordTransformation/domain/coreTypes';
import type {
  WordTransformationSceneLetter,
  WordTransformationSceneState,
  WordTransformationSceneVariantPicker,
} from '../../../../../../wordTransformation/scene/sceneStateTypes';
import type {
  LetterFlightState,
  PoolLetterState,
} from '../../../../../../wordLearning/translationSpelling/hooks/useTranslationSpellingGame';

const ENGLISH_WORD_ROW_Y_RATIO = 0.4;
const SPANISH_WORD_ROW_Y_RATIO = 0.6;
const LETTER_LAYOUT_OPTS = { gapRatio: 0.12, minDiameter: 26 };

const EMPTY_PICKER: WordTransformationSceneVariantPicker = {
  visible: false,
  interactive: false,
  items: [],
};

const EMPTY_SCENE: WordTransformationSceneState = {
  wordOrbsVisible: false,
  lettersInteractive: false,
  letters: [],
  insertAnimation: null,
  variantPicker: EMPTY_PICKER,
};

export type UseTranslationSpellingScenesParams = {
  englishLetters: LetterOrbModel[];
  spanishLetters: LetterOrbModel[];
  poolLetters: PoolLetterState[];
  activeFlight: LetterFlightState | null;
  wordRect: ZoneRect;
  orbRect: ZoneRect;
};

export type TranslationSpellingScenes = {
  english: SharedValue<WordTransformationSceneState>;
  spanish: SharedValue<WordTransformationSceneState>;
  pool: SharedValue<WordTransformationSceneState>;
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

function toPoolSceneLetter(
  letter: PoolLetterState,
  index: number,
  layout: PoolLetterLayout,
): WordTransformationSceneLetter {
  const pos = layout.positions[index];
  const popping = letter.popping || letter.popped;
  return {
    position: index,
    char: letter.char,
    centerX: pos?.centerX ?? 0,
    centerY: pos?.centerY ?? 0,
    diameter: layout.diameter,
    popped: popping,
    wrong: letter.wrong,
    skipEnter: false,
    popDelayMs: letter.popping ? letter.popDelayMs ?? null : null,
    enterDelayMs: letter.enterDelayMs ?? null,
    hidden: letter.used,
  };
}

function toInsertAnimation(flight: LetterFlightState | null): InsertAnimationState | null {
  if (flight == null) {
    return null;
  }
  return {
    phase: 'fly',
    selectedVariant: flight.char,
    allVariants: [],
    wrongVariants: [],
    poppedWrongVariants: new Set<string>(),
    dismissPopOrder: [],
    char: flight.char,
    fromCenterX: flight.fromCenterX,
    fromCenterY: flight.fromCenterY,
    fromDiameter: flight.fromDiameter,
    toCenterX: flight.toCenterX,
    toCenterY: flight.toCenterY,
    toDiameter: flight.toDiameter,
    flyDurationMs: flight.flyDurationMs,
    nextWord: '',
    insertIndex: 0,
    insertLength: 1,
  };
}

function letterModelsSignature(
  letters: readonly LetterOrbModel[],
  layout: LetterLayout,
): string {
  return [
    layout.diameter,
    layout.rowY,
    layout.centers.join(','),
    letters
      .map(
        letter =>
          `${letter.key}:${letter.position}:${letter.char}:${letter.popped}:${letter.wrong}:${letter.skipEnter}:${letter.enterDelayMs}:${letter.popDelayMs}`,
      )
      .join('|'),
  ].join('#');
}

function poolSceneSignature(
  letters: readonly WordTransformationSceneLetter[],
  ids: readonly string[],
  layout: PoolLetterLayout,
  flight: InsertAnimationState | null,
): string {
  return [
    layout.diameter,
    layout.positions.map(pos => `${pos.centerX},${pos.centerY}`).join(';'),
    letters
      .map(
        (letter, index) =>
          `${ids[index]}:${letter.char}:${letter.popped}:${letter.wrong}:${letter.hidden}:${letter.enterDelayMs}:${letter.popDelayMs}`,
      )
      .join('|'),
    flight == null
      ? ''
      : `flight:${flight.char}:${flight.fromCenterX}:${flight.fromCenterY}:${flight.fromDiameter}:${flight.toCenterX}:${flight.toCenterY}:${flight.toDiameter}:${flight.flyDurationMs}`,
  ].join('#');
}

export function useTranslationSpellingScenes({
  englishLetters,
  spanishLetters,
  poolLetters,
  activeFlight,
  wordRect,
  orbRect,
}: UseTranslationSpellingScenesParams): TranslationSpellingScenes {
  const englishSv = useSharedValue<WordTransformationSceneState>(EMPTY_SCENE);
  const spanishSv = useSharedValue<WordTransformationSceneState>(EMPTY_SCENE);
  const poolSv = useSharedValue<WordTransformationSceneState>(EMPTY_SCENE);
  const lastEnglishRef = useRef('');
  const lastSpanishRef = useRef('');
  const lastPoolRef = useRef('');

  const englishLayout = useMemo(() => {
    const count = englishLetters.length;
    if (count === 0) {
      return { diameter: 0, rowY: 0, centers: [] as number[] };
    }
    return computeLetterLayout(wordRect, count, ENGLISH_WORD_ROW_Y_RATIO, LETTER_LAYOUT_OPTS);
  }, [wordRect, englishLetters.length]);

  const spanishLayout = useMemo(() => {
    const count = spanishLetters.length;
    if (count === 0) {
      return { diameter: 0, rowY: 0, centers: [] as number[] };
    }
    return computeLetterLayout(wordRect, count, SPANISH_WORD_ROW_Y_RATIO, LETTER_LAYOUT_OPTS);
  }, [wordRect, spanishLetters.length]);

  const poolLayout = useMemo(() => {
    const count = poolLetters.length;
    if (count === 0) {
      return { diameter: 0, positions: [] as Array<{ centerX: number; centerY: number }> };
    }
    return computePoolLetterLayout(orbRect, count);
  }, [orbRect, poolLetters.length]);

  const filledSpanish = useMemo(
    () => spanishLetters.filter(letter => !letter.skipEnter),
    [spanishLetters],
  );

  useEffect(() => {
    if (englishLetters.length === 0) {
      if (lastEnglishRef.current !== '') {
        lastEnglishRef.current = '';
        englishSv.value = EMPTY_SCENE;
      }
      return;
    }
    const sceneLetters = englishLetters.map(letter => {
      const centerX = englishLayout.centers[letter.position] ?? 0;
      return toSceneLetter(letter, centerX, englishLayout.rowY, englishLayout.diameter);
    });
    const signature = letterModelsSignature(englishLetters, englishLayout);
    if (signature === lastEnglishRef.current) {
      return;
    }
    lastEnglishRef.current = signature;
    englishSv.value = {
      wordOrbsVisible: true,
      lettersInteractive: false,
      letters: sceneLetters,
      insertAnimation: null,
      variantPicker: EMPTY_PICKER,
    };
  }, [englishLetters, englishLayout, englishSv]);

  useEffect(() => {
    if (filledSpanish.length === 0) {
      if (lastSpanishRef.current !== '') {
        lastSpanishRef.current = '';
        spanishSv.value = EMPTY_SCENE;
      }
      return;
    }
    const sceneLetters = filledSpanish.map(letter => {
      const centerX = spanishLayout.centers[letter.position] ?? 0;
      return toSceneLetter(letter, centerX, spanishLayout.rowY, spanishLayout.diameter);
    });
    const signature = letterModelsSignature(filledSpanish, spanishLayout);
    if (signature === lastSpanishRef.current) {
      return;
    }
    lastSpanishRef.current = signature;
    spanishSv.value = {
      wordOrbsVisible: true,
      lettersInteractive: false,
      letters: sceneLetters,
      insertAnimation: null,
      variantPicker: EMPTY_PICKER,
    };
  }, [filledSpanish, spanishLayout, spanishSv]);

  useEffect(() => {
    if (poolLetters.length === 0) {
      if (lastPoolRef.current !== '') {
        lastPoolRef.current = '';
        poolSv.value = EMPTY_SCENE;
      }
      return;
    }
    const sceneLetters = poolLetters.map((letter, index) =>
      toPoolSceneLetter(letter, index, poolLayout),
    );
    const flight = toInsertAnimation(activeFlight);
    const signature = poolSceneSignature(
      sceneLetters,
      poolLetters.map(letter => letter.id),
      poolLayout,
      flight,
    );
    if (signature === lastPoolRef.current) {
      return;
    }
    lastPoolRef.current = signature;
    poolSv.value = {
      wordOrbsVisible: true,
      lettersInteractive: true,
      letters: sceneLetters,
      insertAnimation: flight,
      variantPicker: EMPTY_PICKER,
    };
  }, [poolLetters, poolLayout, activeFlight, poolSv]);

  return {
    english: englishSv,
    spanish: spanishSv,
    pool: poolSv,
  };
}
