import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import {
  type ExerciseOrientation,
  type ZoneRect,
} from '../../../core/layout/computeExerciseLayout';
import {
  blankSlotCenter,
  computeSentenceRowLayout,
  computeLetterLayout,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
} from '../../../core/layout/exerciseLayout';
import { planSwimPaths, type SwimPath } from '../../sentenceTransformation/domain/swimPathPlanner';
import { findBlankSlotIndex } from '../../sentenceTransformation/domain/sentenceRowDisplay';
import type { SentencePromptDisplaySlot } from '../../sentenceTransformation/domain/types';
import {
  createVariantSelectionExercise,
  createVariantSelectionRoundController,
  type VariantSelectionRoundControllerSnapshot,
  type VariantSelectionRoundPhase,
} from '../domain';

export type ResolutionFlightState = {
  form: string;
  fromCenterX: number;
  fromCenterY: number;
  toCenterX: number;
  toCenterY: number;
  diameter: number;
  toSpawnX: number;
  toSpawnY: number;
};

export type OptionJellyfishState = {
  form: string;
  isCorrect: boolean;
  index: number;
};

export type VariantSelectionGame = {
  isCompleted: boolean;
  roundPhase: VariantSelectionRoundPhase;
  displaySlots: SentencePromptDisplaySlot[];
  conjugatedForm: string;
  roundPos: number;
  swimPaths: SwimPath[];
  optionSwimPaths: SwimPath[];
  options: OptionJellyfishState[];
  correctOptionIndex: number;
  blankSlotIndex: number;
  blankExiting: boolean;
  resolveFlight: ResolutionFlightState | null;
  resolveFlightPhase: 'idle' | 'resolve' | 'hold' | 'exit';
  translation: string;
  instruction: string;
  solvedCount: number;
  totalCount: number;
  handleRowEnterComplete: () => void;
  handleRowExitComplete: () => void;
  handleOptionTap: (option: OptionJellyfishState) => void;
  handleResolveComplete: () => void;
  handleExitComplete: () => void;
};

export type UseVariantSelectionGameParams = {
  table: TableData;
  orientation: ExerciseOrientation;
  screenWidth: number;
  screenHeight: number;
  koiRect: ZoneRect;
  jellyRect: ZoneRect;
  playSuccess?: () => void;
  playWrong?: () => void;
};

export function useVariantSelectionGame({
  table,
  orientation,
  screenWidth,
  screenHeight,
  koiRect,
  jellyRect,
  playSuccess,
  playWrong,
}: UseVariantSelectionGameParams): VariantSelectionGame {
  const exercise = useMemo(() => createVariantSelectionExercise(table), [table]);
  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [roundSnapshot, setRoundSnapshot] = useState<VariantSelectionRoundControllerSnapshot>(() => ({
    phase: 'enter',
    roundPos: 0,
    isSessionComplete: false,
  }));
  const [correctOptionIndex, setCorrectOptionIndex] = useState(-1);
  const [resolveFlight, setResolveFlight] = useState<ResolutionFlightState | null>(null);
  const roundRef = useRef<ReturnType<typeof createVariantSelectionRoundController> | null>(null);
  const koiRectRef = useRef(koiRect);
  const jellyRectRef = useRef(jellyRect);
  koiRectRef.current = koiRect;
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

  const displaySlots = useMemo(() => {
    return currentRound?.displaySlots ?? [];
  }, [currentRound?.displaySlots]);

  const blankSlotIndex = useMemo(
    () => findBlankSlotIndex(displaySlots),
    [displaySlots],
  );

  const slotLayout = useMemo(
    () =>
      computeSentenceRowLayout({
        slots: displaySlots,
        jellyRect,
        koiRect,
        conjugatedForm: currentRound?.conjugatedForm ?? '',
        roundPos: roundSnapshot.roundPos,
      }),
    [displaySlots, jellyRect, koiRect, currentRound?.conjugatedForm, roundSnapshot.roundPos],
  );

  const optionLayout = useMemo(() => {
    const count = currentRound?.options.length ?? 0;
    if (count === 0) {
      return { diameter: 0, rowY: 0, centers: [] };
    }
    return computeLetterLayout(koiRect, count, TRANSFORMATION_VARIANT_ROW_Y_RATIO);
  }, [currentRound?.options.length, koiRect]);

  const swimPaths = useMemo<SwimPath[]>(() => {
    if (slotLayout.xs.length === 0) return [];
    const slotCenters = slotLayout.xs.map((x, i) => ({
      x,
      y: slotLayout.ys[i] ?? 0,
    }));
    return planSwimPaths({
      orientation,
      screenWidth,
      screenHeight,
      jellyRect,
      slotCenters,
    });
  }, [orientation, screenWidth, screenHeight, jellyRect, slotLayout.xs, slotLayout.ys]);

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
      jellyRect,
      slotCenters,
    });
  }, [orientation, screenWidth, screenHeight, jellyRect, optionLayout.centers, optionLayout.rowY]);

  const options = useMemo<OptionJellyfishState[]>(() => {
    if (currentRound == null) return [];
    return currentRound.options.map((opt, index) => ({
      form: opt.form,
      isCorrect: opt.isCorrect,
      index,
    }));
  }, [currentRound]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleRoundPhaseChangeRef = useRef<() => void>(() => {});

  const resetRoundState = useCallback(() => {
    setCorrectOptionIndex(-1);
    setResolveFlight(null);
  }, []);

  const handleRoundPhaseChange = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot == null) return;
    syncRoundSnapshot();

    if (snapshot.phase === 'enter') {
      resetRoundState();
      return;
    }
  }, [syncRoundSnapshot, resetRoundState]);

  handleRoundPhaseChangeRef.current = handleRoundPhaseChange;

  useEffect(() => {
    const controller = createVariantSelectionRoundController({
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

  const computeFlight = useCallback(() => {
    if (blankSlotIndex < 0) return null;
    const blankCenter = blankSlotCenter(
      displaySlots,
      jellyRectRef.current,
      koiRectRef.current,
      currentRound?.conjugatedForm ?? '',
      roundSnapshot.roundPos,
    );
    if (blankCenter == null) return null;

    const correctOpt = optionsRef.current.find(o => o.isCorrect);
    if (correctOpt == null) return null;
    const correctIndex = correctOpt.index;
    const fromX = optionLayout.centers[correctIndex] ?? koiRectRef.current.x + koiRectRef.current.w * 0.5;
    const fromY = optionLayout.rowY;

    const blankSwimPath = swimPaths[blankSlotIndex];
    const toSpawnX = blankSwimPath?.spawnX ?? -100;
    const toSpawnY = blankSwimPath?.spawnY ?? -100;

    return {
      form: correctOpt.form,
      fromCenterX: fromX,
      fromCenterY: fromY,
      toCenterX: blankCenter.x,
      toCenterY: blankCenter.y,
      diameter: optionLayout.diameter,
      toSpawnX,
      toSpawnY,
    };
  }, [blankSlotIndex, displaySlots, currentRound, roundSnapshot.roundPos, optionLayout.centers, optionLayout.rowY, optionLayout.diameter, swimPaths]);

  const handleRowEnterComplete = useCallback(() => {
    roundRef.current?.notifyRowEnterComplete();
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  const handleRowExitComplete = useCallback(() => {
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  const handleOptionTap = useCallback(
    (option: OptionJellyfishState) => {
      if (roundSnapshot.phase !== 'transform') return;
      if (option.isCorrect) {
        playSuccessRef.current?.();
    setCorrectOptionIndex(option.index);
    roundRef.current?.notifyCorrectSelection();
        const flight = computeFlight();
        if (flight != null) {
          setResolveFlight(flight);
        }
        syncRoundSnapshot();
      } else {
        playWrongRef.current?.();
      }
    },
    [roundSnapshot.phase, syncRoundSnapshot, computeFlight],
  );

  const handleResolveComplete = useCallback(() => {
    roundRef.current?.notifyResolveComplete();
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  const handleExitComplete = useCallback(() => {
    roundRef.current?.notifyExitComplete();
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  useEffect(() => {
    if (roundSnapshot.phase === 'resolve' && correctOptionIndex >= 0 && resolveFlight == null) {
      const flight = computeFlight();
      if (flight != null) {
        setResolveFlight(flight);
      }
    }
  }, [roundSnapshot.phase, correctOptionIndex, resolveFlight, computeFlight]);

  const translation = useMemo(() => {
    if (currentRound == null) return '';
    return table.bodyTranslations[currentRound.rowIndex]?.[currentRound.colIndex] ?? '';
  }, [currentRound, table.bodyTranslations]);

  const roundPhase = roundSnapshot.phase;
  const blankExiting =
    roundPhase === 'resolve' ||
    roundPhase === 'hold' ||
    roundPhase === 'exit' ||
    roundPhase === 'advance';

  const resolveFlightPhase: 'idle' | 'resolve' | 'hold' | 'exit' =
    resolveFlight == null
      ? 'idle'
      : roundPhase === 'resolve'
        ? 'resolve'
        : roundPhase === 'hold'
          ? 'hold'
          : roundPhase === 'exit' || roundPhase === 'advance'
            ? 'exit'
            : 'idle';

  const instruction = useMemo(() => {
    if (isCompleted) return 'All words transformed!';
    if (roundPhase === 'enter') return '';
    if (roundPhase === 'transform') return 'Select the correct form';
    if (roundPhase === 'resolve') return '';
    if (roundPhase === 'hold' || roundPhase === 'exit' || roundPhase === 'advance') return 'Nice!';
    return '';
  }, [isCompleted, roundPhase]);

  return {
    isCompleted,
    roundPhase,
    displaySlots,
    conjugatedForm: currentRound?.conjugatedForm ?? '',
    roundPos: roundSnapshot.roundPos,
    swimPaths,
    optionSwimPaths,
    options,
    correctOptionIndex,
    blankSlotIndex,
    blankExiting,
    resolveFlight,
    resolveFlightPhase,
    translation,
    instruction,
    solvedCount: roundSnapshot.roundPos,
    totalCount: roundOrder.length,
    handleRowEnterComplete,
    handleRowExitComplete,
    handleOptionTap,
    handleResolveComplete,
    handleExitComplete,
  };
}
