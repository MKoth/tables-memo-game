import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { WordList } from '../../../../../../data/wordsData';
import type {
  ExerciseOrientation,
  ZoneRect,
} from '../../../../core/layout/computeExerciseLayout';
import {
  computeLetterLayout,
  computePoolLetterLayout,
} from '../../../../core/layout/exerciseLayout';
import {
  buildCascadeRevealOrder,
  computeCascadeCompleteDelayMs,
  mapLettersWithCascade,
} from '../../../wordTransformation/letterCascade';
import type { LetterBubbleModel } from '../../../wordTransformation/domain/coreTypes';
import { INSERT_FLY_MS } from '../../../wordTransformation/insertAnimationTiming';
import {
  createTranslationSpellingExercise,
  createTranslationSpellingRoundController,
  matchLetter,
  type TranslationSpellingRoundControllerSnapshot,
  type TranslationSpellingRoundPhase,
} from '../domain';

export type PoolLetterState = {
  id: string;
  char: string;
  used: boolean;
  wrong: boolean;
  popping: boolean;
  popped: boolean;
  popDelayMs?: number;
  enterDelayMs?: number;
};

export type SpanishLetterState = {
  char: string;
  filled: boolean;
  popped: boolean;
};

export type LetterFlightState = {
  id: string;
  char: string;
  fromCenterX: number;
  fromCenterY: number;
  fromDiameter: number;
  toCenterX: number;
  toCenterY: number;
  toDiameter: number;
  flyDurationMs: number;
  landed: boolean;
};

export type TranslationSpellingGame = {
  isCompleted: boolean;
  roundPhase: TranslationSpellingRoundPhase;
  englishLetters: LetterBubbleModel[];
  spanishLetters: LetterBubbleModel[];
  poolLetters: PoolLetterState[];
  activeFlight: LetterFlightState | null;
  roundPos: number;
  handleLetterTap: (poolLetterId: string) => void;
};

export type UseTranslationSpellingGameParams = {
  wordList: WordList;
  orientation: ExerciseOrientation;
  koiRect: ZoneRect;
  jellyRect: ZoneRect;
  playBubbleInflate?: () => void;
  playWrong?: () => void;
};

const SPANISH_WORD_ROW_Y_RATIO = 0.6;
const RESOLVE_PAUSE_MS = 200;

export function useTranslationSpellingGame({
  wordList,
  koiRect,
  jellyRect,
  playBubbleInflate,
  playWrong,
}: UseTranslationSpellingGameParams): TranslationSpellingGame {
  const exercise = useMemo(() => createTranslationSpellingExercise(wordList), [wordList]);
  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [roundSnapshot, setRoundSnapshot] = useState<TranslationSpellingRoundControllerSnapshot>(() => ({
    phase: 'enter',
    roundPos: 0,
    isSessionComplete: false,
  }));
  const [englishCascadeOrder, setEnglishCascadeOrder] = useState<number[]>([]);
  const [poolLetters, setPoolLetters] = useState<PoolLetterState[]>([]);
  const [spanishLetterStates, setSpanishLetterStates] = useState<SpanishLetterState[]>([]);

  const [nextExpectedPosition, setNextExpectedPosition] = useState(0);
  const [activeFlight, setActiveFlight] = useState<LetterFlightState | null>(null);
  const [englishPopped, setEnglishPopped] = useState(false);
  const [spanishPopped, setSpanishPopped] = useState(false);
  const [spanishPopOrder, setSpanishPopOrder] = useState<number[]>([]);
  const roundRef = useRef<ReturnType<typeof createTranslationSpellingRoundController> | null>(null);
  const koiRectRef = useRef(koiRect);
  const jellyRectRef = useRef(jellyRect);
  koiRectRef.current = koiRect;
  jellyRectRef.current = jellyRect;
  const playBubbleInflateRef = useRef(playBubbleInflate);
  playBubbleInflateRef.current = playBubbleInflate;
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

  const poolLayout = useMemo(() => {
    const count = poolLetters.length;
    if (count === 0) {
      return { diameter: 0, positions: [] as Array<{ centerX: number; centerY: number }> };
    }
    return computePoolLetterLayout(koiRect, count);
  }, [koiRect, poolLetters.length]);

  const spanishLayout = useMemo(() => {
    const word = currentRound?.spanish ?? '';
    if (word.length === 0) {
      return { diameter: 0, rowY: 0, centers: [] };
    }
    return computeLetterLayout(jellyRect, word.length, SPANISH_WORD_ROW_Y_RATIO, { gapRatio: 0.12, minDiameter: 26 });
  }, [jellyRect, currentRound?.spanish]);

  const englishLetters = useMemo<LetterBubbleModel[]>(() => {
    if (currentRound == null) return [];
    if (roundSnapshot.phase === 'advance') return [];
    const word = currentRound.english;
    const phase = roundSnapshot.phase === 'enter' || roundSnapshot.phase === 'transform' ? 'enter' : 'exit';
    return mapLettersWithCascade({
      word,
      keyPrefix: `english-${roundSnapshot.roundPos}`,
      phase,
      order: englishCascadeOrder,
      getLetterState: englishPopped ? () => ({ popped: true, wrong: false }) : undefined,
    });
  }, [currentRound, roundSnapshot.phase, roundSnapshot.roundPos, englishCascadeOrder, englishPopped]);

  const spanishLetters = useMemo<LetterBubbleModel[]>(() => {
    if (currentRound == null) return [];
    const word = currentRound.spanish;
    const showSpanish = spanishLetterStates.length > 0;
    if (!showSpanish) return [];
    return word.split('').map((char, position) => {
      const state = spanishLetterStates[position];
      const isPopped = spanishPopped && state?.filled;
      const popIndex = spanishPopOrder.indexOf(position);
      return {
        key: `spanish-${roundSnapshot.roundPos}:${position}`,
        char,
        position,
        popped: isPopped ?? false,
        wrong: false,
        skipEnter: !state?.filled,
        popDelayMs: spanishPopped && state?.filled && popIndex >= 0 ? popIndex * 320 : undefined,
      };
    });
  }, [currentRound, roundSnapshot.roundPos, spanishLetterStates, spanishPopped, spanishPopOrder]);

  const handleRoundPhaseChangeRef = useRef<() => void>(() => {});

  const resetRoundState = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot == null) return;
    const roundIdx = roundOrder[snapshot.roundPos] ?? -1;
    const round = roundIdx >= 0 ? rounds[roundIdx] ?? null : null;
    if (round == null) return;
    const englishOrder = buildCascadeRevealOrder(round.english.length);
    const poolOrder = buildCascadeRevealOrder(round.letterPool.length);
    setEnglishCascadeOrder(englishOrder);
    setPoolLetters(
      round.letterPool.map((char, i) => {
        const cascadeIndex = poolOrder.indexOf(i);
        return {
          id: `pool-${snapshot.roundPos}-${i}`,
          char,
          used: false,
          wrong: false,
          popping: false,
          popped: false,
          enterDelayMs: cascadeIndex >= 0 ? cascadeIndex * 300 : undefined,
        };
      }),
    );
    setSpanishLetterStates(
      round.spanish.split('').map(char => ({
        char,
        filled: false,
        popped: false,
      })),
    );
    setNextExpectedPosition(0);
    setActiveFlight(null);
    setEnglishPopped(false);
    setSpanishPopped(false);
    setSpanishPopOrder([]);
  }, [roundOrder, rounds]);

  const handleRoundPhaseChange = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot == null) return;
    syncRoundSnapshot();

    if (snapshot.phase === 'advance') {
      setSpanishLetterStates([]);
    }

    if (snapshot.phase === 'enter') {
      resetRoundState();
    }
  }, [syncRoundSnapshot, resetRoundState]);

  handleRoundPhaseChangeRef.current = handleRoundPhaseChange;

  useEffect(() => {
    const controller = createTranslationSpellingRoundController({
      roundCount: roundOrder.length,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      onPhaseChange: () => handleRoundPhaseChangeRef.current(),
      onSessionComplete: syncRoundSnapshot,
    });
    roundRef.current = controller;
    handleRoundPhaseChangeRef.current();
    return () => {
      controller.dispose();
      roundRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOrder.length]);

  useEffect(() => {
    if (roundSnapshot.phase !== 'enter') return;
    const englishWord = currentRound?.english ?? '';
    const poolWord = currentRound?.letterPool.length ?? 0;
    const englishDelay = computeCascadeCompleteDelayMs(englishWord.length, 'enter');
    const poolDelay = computeCascadeCompleteDelayMs(poolWord, 'enter');
    const totalDelay = englishDelay + poolDelay;
    const id = setTimeout(() => {
      roundRef.current?.notifyEnterComplete();
      syncRoundSnapshot();
    }, totalDelay);
    return () => clearTimeout(id);
  }, [roundSnapshot.phase, roundSnapshot.roundPos, currentRound, syncRoundSnapshot]);

  useEffect(() => {
    if (roundSnapshot.phase !== 'resolve') return;

    const unusedPoolLetters = poolLetters.filter(l => !l.used);
    const distractorPopOrder = buildCascadeRevealOrder(unusedPoolLetters.length);
    setPoolLetters(prev =>
      prev.map(l => {
        if (l.used) return l;
        const unusedIndex = unusedPoolLetters.findIndex(u => u.id === l.id);
        const cascadeIndex = distractorPopOrder.indexOf(unusedIndex);
        return {
          ...l,
          popping: true,
          popDelayMs: cascadeIndex >= 0 ? cascadeIndex * 320 : undefined,
        };
      }),
    );

    const distractorCascadeDelay = computeCascadeCompleteDelayMs(unusedPoolLetters.length, 'exit');

    const t1 = setTimeout(() => {
      setPoolLetters(prev => prev.map(l => (l.popping ? { ...l, popped: true } : l)));
      setEnglishPopped(true);
    }, distractorCascadeDelay + RESOLVE_PAUSE_MS);

    const englishCascadeDelay = computeCascadeCompleteDelayMs(
      currentRound?.english.length ?? 0,
      'exit',
    );

    const t2 = setTimeout(() => {
      setSpanishPopOrder(buildCascadeRevealOrder(currentRound?.spanish.length ?? 0));
      setSpanishPopped(true);
    }, distractorCascadeDelay + RESOLVE_PAUSE_MS + englishCascadeDelay + RESOLVE_PAUSE_MS);

    const spanishCascadeDelay = computeCascadeCompleteDelayMs(
      currentRound?.spanish.length ?? 0,
      'exit',
    );

    const t3 = setTimeout(() => {
      roundRef.current?.notifyResolveComplete();
      syncRoundSnapshot();
    }, distractorCascadeDelay + RESOLVE_PAUSE_MS + englishCascadeDelay + RESOLVE_PAUSE_MS + spanishCascadeDelay);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundSnapshot.phase, currentRound, syncRoundSnapshot]);

  useEffect(() => {
    if (roundSnapshot.phase !== 'exit') return;
    const id = setTimeout(() => {
      roundRef.current?.notifyExitComplete();
      syncRoundSnapshot();
    }, 100);
    return () => clearTimeout(id);
  }, [roundSnapshot.phase, syncRoundSnapshot]);

  const handleLetterTap = useCallback(
    (poolLetterId: string) => {
      if (roundSnapshot.phase !== 'transform') return;
      if (activeFlight != null) return;

      const poolIndex = poolLetters.findIndex(l => l.id === poolLetterId);
      if (poolIndex === -1) return;
      const poolLetter = poolLetters[poolIndex]!;
      if (poolLetter.used || poolLetter.wrong || poolLetter.popping || poolLetter.popped) return;

      const isCorrect = matchLetter(poolLetter.char, nextExpectedPosition, currentRound?.spanish ?? '');

      if (isCorrect) {
        playBubbleInflateRef.current?.();
        const fromPos = poolLayout.positions[poolIndex];
        const fromCenterX = fromPos?.centerX ?? 0;
        const fromCenterY = fromPos?.centerY ?? 0;
        const toCenterX = spanishLayout.centers[nextExpectedPosition] ?? 0;
        const toCenterY = spanishLayout.rowY;

        setActiveFlight({
          id: poolLetterId,
          char: poolLetter.char,
          fromCenterX,
          fromCenterY,
          fromDiameter: poolLayout.diameter,
          toCenterX,
          toCenterY,
          toDiameter: spanishLayout.diameter,
          flyDurationMs: INSERT_FLY_MS,
          landed: false,
        });

        setPoolLetters(prev =>
          prev.map((l, i) => (i === poolIndex ? { ...l, used: true } : l)),
        );

        const flightTimeout = setTimeout(() => {
          setActiveFlight(prev => (prev != null ? { ...prev, landed: true } : null));

          setSpanishLetterStates(prev =>
            prev.map((l, i) => (i === nextExpectedPosition ? { ...l, filled: true } : l)),
          );

          const handoffTimeout = setTimeout(() => {
            setActiveFlight(null);
            const nextPos = nextExpectedPosition + 1;
            setNextExpectedPosition(nextPos);

            if (currentRound != null && nextPos >= currentRound.spanish.length) {
              roundRef.current?.notifyWordComplete();
              syncRoundSnapshot();
            }
          }, 48);
          return () => clearTimeout(handoffTimeout);
        }, INSERT_FLY_MS);

        return () => clearTimeout(flightTimeout);
      } else {
        playWrongRef.current?.();
        setPoolLetters(prev =>
          prev.map((l, i) => (i === poolIndex ? { ...l, wrong: true } : l)),
        );
        const wrongTimeout = setTimeout(() => {
          setPoolLetters(prev =>
            prev.map((l, i) => (i === poolIndex ? { ...l, wrong: false } : l)),
          );
        }, 500);
        return () => clearTimeout(wrongTimeout);
      }
    },
    [
      roundSnapshot.phase,
      activeFlight,
      poolLetters,
      nextExpectedPosition,
      currentRound,
      poolLayout,
      spanishLayout,
      syncRoundSnapshot,
    ],
  );

  return {
    isCompleted,
    roundPhase: roundSnapshot.phase,
    englishLetters,
    spanishLetters,
    poolLetters,
    activeFlight,
    roundPos: roundSnapshot.roundPos,
    handleLetterTap,
  };
}
