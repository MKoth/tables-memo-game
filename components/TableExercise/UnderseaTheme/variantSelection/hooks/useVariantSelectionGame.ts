import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import {
  type UnderseaThemeOrientation,
  type ZoneRect,
} from '../../core/layout/computeUnderseaThemeLayout';
import {
  computeSentenceRowLayout,
  computeLetterLayout,
  TRANSFORMATION_VARIANT_ROW_Y_RATIO,
} from '../../core/layout/underseaExerciseLayout';
import { planSwimPaths, type SwimPath } from '../../sentenceTransformation/domain/swimPathPlanner';
import type { SentencePromptDisplaySlot } from '../../sentenceTransformation/domain/types';
import {
  createVariantSelectionExercise,
  createVariantSelectionRoundController,
  type VariantSelectionRoundControllerSnapshot,
  type VariantSelectionRoundPhase,
} from '../domain';

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
  instruction: string;
  solvedCount: number;
  totalCount: number;
  handleRowEnterComplete: () => void;
  handleRowExitComplete: () => void;
  handleOptionTap: (option: OptionJellyfishState) => void;
};

export type UseVariantSelectionGameParams = {
  table: TableData;
  orientation: UnderseaThemeOrientation;
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

  const handleRoundPhaseChangeRef = useRef<() => void>(() => {});

  const handleRoundPhaseChange = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot == null) return;
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

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
      } else {
        playWrongRef.current?.();
      }
    },
    [roundSnapshot.phase],
  );

  const roundPhase = roundSnapshot.phase;
  const instruction = useMemo(() => {
    if (isCompleted) return 'All words completed!';
    if (roundPhase === 'enter') return '';
    if (roundPhase === 'transform') return 'Select the correct form';
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
    instruction,
    solvedCount: roundSnapshot.roundPos,
    totalCount: roundOrder.length,
    handleRowEnterComplete,
    handleRowExitComplete,
    handleOptionTap,
  };
}
