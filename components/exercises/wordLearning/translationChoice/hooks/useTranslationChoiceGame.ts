import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { WordList } from '../../../../../data/wordsData';
import type {
  ExerciseOrientation,
  ZoneRect,
} from '../../../core/layout/computeExerciseLayout';
import {
  computeLetterLayout,
  TRANSFORMATION_WORD_ROW_Y_RATIO,
} from '../../../core/layout/exerciseLayout';
import { planSwimPaths, type SwimPath } from '../../../sentenceTransformation/domain/swimPathPlanner';
import {
  buildCascadeRevealOrder,
  computeCascadeCompleteDelayMs,
  mapLettersWithCascade,
} from '../../../wordTransformation/letterCascade';
import type { LetterBubbleModel } from '../../../wordTransformation/domain/coreTypes';
import {
  createTranslationChoiceExercise,
  createTranslationChoiceRoundController,
  type TranslationChoiceRoundControllerSnapshot,
  type TranslationChoiceRoundPhase,
} from '../domain';

export type OptionWordSpriteState = {
  form: string;
  isCorrect: boolean;
  index: number;
};

export type TranslationChoiceGame = {
  isCompleted: boolean;
  roundPhase: TranslationChoiceRoundPhase;
  englishLetters: LetterBubbleModel[];
  spanishLetters: LetterBubbleModel[];
  roundPos: number;
  optionSwimPaths: SwimPath[];
  options: OptionWordSpriteState[];
  correctOptionIndex: number;
  handleOptionTap: (option: OptionWordSpriteState) => void;
};

export type UseTranslationChoiceGameParams = {
  wordList: WordList;
  orientation: ExerciseOrientation;
  screenWidth: number;
  screenHeight: number;
  roamerRect: ZoneRect;
  jellyRect: ZoneRect;
  playSuccess?: () => void;
  playWrong?: () => void;
};

export function useTranslationChoiceGame({
  wordList,
  orientation,
  screenWidth,
  screenHeight,
  roamerRect,
  jellyRect,
  playSuccess,
  playWrong,
}: UseTranslationChoiceGameParams): TranslationChoiceGame {
  const exercise = useMemo(() => createTranslationChoiceExercise(wordList), [wordList]);
  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [roundSnapshot, setRoundSnapshot] = useState<TranslationChoiceRoundControllerSnapshot>(() => ({
    phase: 'enter',
    roundPos: 0,
    isSessionComplete: false,
  }));
  const [correctOptionIndex, setCorrectOptionIndex] = useState(-1);
  const [englishCascadeOrder, setEnglishCascadeOrder] = useState<number[]>([]);
  const [spanishCascadeOrder, setSpanishCascadeOrder] = useState<number[]>([]);
  const roundRef = useRef<ReturnType<typeof createTranslationChoiceRoundController> | null>(null);
  const roamerRectRef = useRef(roamerRect);
  const jellyRectRef = useRef(jellyRect);
  roamerRectRef.current = roamerRect;
  jellyRectRef.current = jellyRect;
  const playSuccessRef = useRef(playSuccess);
  playSuccessRef.current = playSuccess;
  const playWrongRef = useRef(playWrong);
  playWrongRef.current = playWrong;

  const syncRoundSnapshot = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot != null) {
      setRoundSnapshot(snapshot);
    }
    bumpRender();
  }, []);

  const { roundOrder, rounds } = exercise;
  const isCompleted = roundSnapshot.isSessionComplete;
  const currentRoundIndex =
    isCompleted || roundSnapshot.roundPos >= roundOrder.length
      ? -1
      : roundOrder[roundSnapshot.roundPos] ?? -1;
  const currentRound = currentRoundIndex >= 0 ? rounds[currentRoundIndex] ?? null : null;

  const options = useMemo<OptionWordSpriteState[]>(() => {
    if (currentRound == null) return [];
    return currentRound.options.map((opt, index) => ({
      form: opt.form,
      isCorrect: opt.isCorrect,
      index,
    }));
  }, [currentRound]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const optionLayout = useMemo(() => {
    const count = currentRound?.options.length ?? 0;
    if (count === 0) {
      return { diameter: 0, rowY: 0, centers: [] };
    }
    return computeLetterLayout(roamerRect, count, 0.5);
  }, [currentRound?.options.length, roamerRect]);

  const optionSwimPaths = useMemo<SwimPath[]>(() => {
    if (optionLayout.centers.length === 0) return [];
    const slotCenters = optionLayout.centers.map(x => ({
      x,
      y: optionLayout.rowY,
    }));
    return planSwimPaths({
      orientation,
      screenWidth,
      screenHeight,
      jellyRect: roamerRect,
      slotCenters,
    });
  }, [orientation, screenWidth, screenHeight, roamerRect, optionLayout.centers, optionLayout.rowY]);

  const englishLetters = useMemo<LetterBubbleModel[]>(() => {
    if (currentRound == null) return [];
    const word = currentRound.english;
    const showEnglish =
      roundSnapshot.phase === 'enter' ||
      roundSnapshot.phase === 'transform' ||
      roundSnapshot.phase === 'resolve';
    if (!showEnglish) return [];
    const phase = roundSnapshot.phase === 'enter' || roundSnapshot.phase === 'transform' ? 'enter' : 'exit';
    return mapLettersWithCascade({
      word,
      keyPrefix: `english-${roundSnapshot.roundPos}`,
      phase,
      order: englishCascadeOrder,
    });
  }, [currentRound, roundSnapshot.phase, roundSnapshot.roundPos, englishCascadeOrder]);

  const spanishLetters = useMemo<LetterBubbleModel[]>(() => {
    if (currentRound == null) return [];
    const showSpanish =
      roundSnapshot.phase === 'reveal' ||
      roundSnapshot.phase === 'hold' ||
      roundSnapshot.phase === 'exit';
    if (!showSpanish) return [];
    const word = currentRound.spanish;
    const phase =
      roundSnapshot.phase === 'reveal' || roundSnapshot.phase === 'hold' ? 'enter' : 'exit';
    return mapLettersWithCascade({
      word,
      keyPrefix: `spanish-${roundSnapshot.roundPos}`,
      phase,
      order: spanishCascadeOrder,
    });
  }, [currentRound, roundSnapshot.phase, roundSnapshot.roundPos, spanishCascadeOrder]);

  const handleRoundPhaseChangeRef = useRef<() => void>(() => {});

  const resetRoundState = useCallback(() => {
    setCorrectOptionIndex(-1);
    setEnglishCascadeOrder(buildCascadeRevealOrder(currentRound?.english.length ?? 0));
    setSpanishCascadeOrder([]);
  }, [currentRound]);

  const handleRoundPhaseChange = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot == null) return;
    syncRoundSnapshot();

    if (snapshot.phase === 'enter') {
      resetRoundState();
      return;
    }

    if (snapshot.phase === 'reveal') {
      setSpanishCascadeOrder(buildCascadeRevealOrder(currentRound?.spanish.length ?? 0));
    }
  }, [syncRoundSnapshot, resetRoundState, currentRound]);

  handleRoundPhaseChangeRef.current = handleRoundPhaseChange;

  useEffect(() => {
    const controller = createTranslationChoiceRoundController({
      roundCount: roundOrder.length,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      onPhaseChange: () => handleRoundPhaseChangeRef.current(),
      onSessionComplete: syncRoundSnapshot,
    });
    roundRef.current = controller;
    return () => {
      controller.dispose();
      roundRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOrder.length]);

  useEffect(() => {
    if (roundSnapshot.phase !== 'enter') return;
    const englishWord = currentRound?.english ?? '';
    const delayMs = computeCascadeCompleteDelayMs(englishWord.length, 'enter');
    const id = setTimeout(() => {
      roundRef.current?.notifyEnterComplete();
      syncRoundSnapshot();
    }, delayMs);
    return () => clearTimeout(id);
  }, [roundSnapshot.phase, roundSnapshot.roundPos, currentRound, syncRoundSnapshot]);

  useEffect(() => {
    if (roundSnapshot.phase !== 'resolve') return;
    const englishWord = currentRound?.english ?? '';
    const delayMs = computeCascadeCompleteDelayMs(englishWord.length, 'exit');
    const id = setTimeout(() => {
      roundRef.current?.notifyResolveComplete();
      syncRoundSnapshot();
    }, delayMs);
    return () => clearTimeout(id);
  }, [roundSnapshot.phase, currentRound, syncRoundSnapshot]);

  useEffect(() => {
    if (roundSnapshot.phase !== 'reveal') return;
    const spanishWord = currentRound?.spanish ?? '';
    const delayMs = computeCascadeCompleteDelayMs(spanishWord.length, 'enter');
    const id = setTimeout(() => {
      roundRef.current?.notifyRevealComplete();
      syncRoundSnapshot();
    }, delayMs);
    return () => clearTimeout(id);
  }, [roundSnapshot.phase, currentRound, syncRoundSnapshot]);

  useEffect(() => {
    if (roundSnapshot.phase !== 'exit') return;
    const spanishWord = currentRound?.spanish ?? '';
    const delayMs = computeCascadeCompleteDelayMs(spanishWord.length, 'exit');
    const id = setTimeout(() => {
      roundRef.current?.notifyExitComplete();
      syncRoundSnapshot();
    }, delayMs);
    return () => clearTimeout(id);
  }, [roundSnapshot.phase, currentRound, syncRoundSnapshot]);

  const handleOptionTap = useCallback(
    (option: OptionWordSpriteState) => {
      if (roundSnapshot.phase !== 'transform') return;
      if (option.isCorrect) {
        playSuccessRef.current?.();
        setCorrectOptionIndex(option.index);
        roundRef.current?.notifyCorrectSelection();
        syncRoundSnapshot();
      } else {
        playWrongRef.current?.();
      }
    },
    [roundSnapshot.phase, syncRoundSnapshot],
  );

  return {
    isCompleted,
    roundPhase: roundSnapshot.phase,
    englishLetters,
    spanishLetters,
    roundPos: roundSnapshot.roundPos,
    optionSwimPaths,
    options,
    correctOptionIndex,
    handleOptionTap,
  };
}
