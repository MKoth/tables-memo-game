import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import { useWordTransformationCoreBridge } from '../../core/hooks/useWordTransformationCoreBridge';
import type { VariantPickerItem } from '../components/TransformationVariantPicker';
import {
  buildCascadeRevealOrder,
  computeCascadeCompleteDelayMs,
  mapLettersWithCascade,
} from '../letterCascade';
import {
  createWordTransformationExercise,
  type InsertAnimationState,
  type LetterBubbleModel,
  type TransformationMode,
  type VariantSourceLayout,
  type WordOperationSequence,
} from '../domain';

export type WordTransitionPhase = 'exit' | 'enter';

export type WordTransitionState =
  | {
      phase: 'exit';
      popOrder: readonly number[];
      poppedPositions: ReadonlySet<number>;
    }
  | {
      phase: 'enter';
      revealOrder: readonly number[];
      revealedPositions: ReadonlySet<number>;
    };

export type WordTransformationGame = {
  isCompleted: boolean;
  transitioning: boolean;
  insertAnimation: InsertAnimationState | null;
  wordTransition: WordTransitionState | null;
  sequence: WordOperationSequence | null;
  operation: WordOperationSequence['operations'][number] | null;
  mode: TransformationMode | null;
  letters: LetterBubbleModel[];
  variantPickerItems: VariantPickerItem[];
  pickerHiddenItemIds: ReadonlySet<string>;
  wrongItemId: string | null;
  poppedPickerItemIds: ReadonlySet<string> | undefined;
  instruction: string;
  highlightedCellIndex: number;
  revealedCellIndices: ReadonlySet<number>;
  solvedCount: number;
  totalCount: number;
  handleLetterPress: (position: number) => void;
  handleVariantPress: (item: VariantPickerItem, source: VariantSourceLayout) => void;
};

function shuffleIndices(count: number): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex]!, order[index]!];
  }
  return order;
}

export type UseWordTransformationGameParams = {
  table: TableData;
  koiRect: ZoneRect;
  /** Fired when a cell's transformation is finished, before advancing. */
  onSequenceSolved?: (sequence: WordOperationSequence) => void;
  onAllSolved?: () => void;
  playPop?: () => void;
  playInflate?: () => void;
  playWrong?: () => void;
};

export function useWordTransformationGame({
  table,
  koiRect,
  onSequenceSolved,
  onAllSolved,
  playPop,
  playInflate,
  playWrong,
}: UseWordTransformationGameParams): WordTransformationGame {
  const exercise = useMemo(() => createWordTransformationExercise(table), [table]);
  const order = useMemo(
    () => shuffleIndices(exercise.sequences.length),
    [exercise.sequences.length],
  );

  const [orderPos, setOrderPos] = useState(0);
  const [wordTransitioning, setWordTransitioning] = useState(false);
  const [wordTransition, setWordTransition] = useState<WordTransitionState | null>(null);
  const [revealedCellIndices, setRevealedCellIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const skipSequenceLoadRef = useRef(false);
  const wordTransitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startWordExitTransitionRef = useRef<
    (solved: WordOperationSequence, exitWord?: string) => void
  >(() => {});

  const isCompleted = order.length === 0 || orderPos >= order.length;
  const sequence = isCompleted ? null : exercise.sequences[order[orderPos]] ?? null;

  const {
    coreSnapshot,
    handleLetterPress: handleLetterPressUnguarded,
    handleVariantPress: handleVariantPressUnguarded,
    loadSequence,
  } = useWordTransformationCoreBridge({
    koiRect,
    sequence,
    sequenceKey: orderPos,
    playPop,
    playInflate,
    playWrong,
    onSequenceComplete: (completedSequence, finalWord) => {
      startWordExitTransitionRef.current(completedSequence, finalWord);
    },
    skipSequenceLoadRef,
  });

  const clearWordTransitionTimers = useCallback(() => {
    wordTransitionTimersRef.current.forEach(clearTimeout);
    wordTransitionTimersRef.current = [];
  }, []);

  const scheduleWordTransitionTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      wordTransitionTimersRef.current = wordTransitionTimersRef.current.filter(
        (timerId) => timerId !== id,
      );
      fn();
    }, delayMs);
    wordTransitionTimersRef.current.push(id);
  }, []);

  const startWordEnterTransition = useCallback(() => {
    const nextPos = orderPos + 1;

    if (nextPos >= order.length) {
      setWordTransition(null);
      setWordTransitioning(false);
      setOrderPos(nextPos);
      return;
    }

    const nextSequence = exercise.sequences[order[nextPos]];
    if (nextSequence == null) {
      setWordTransition(null);
      setWordTransitioning(false);
      setOrderPos(nextPos);
      return;
    }

    const revealOrder = buildCascadeRevealOrder(
      nextSequence.baseWord.length,
      shuffleIndices,
    );

    skipSequenceLoadRef.current = true;
    setOrderPos(nextPos);
    loadSequence(nextSequence, nextPos);

    if (revealOrder.length === 0) {
      setWordTransition(null);
      setWordTransitioning(false);
      return;
    }

    setWordTransition({
      phase: 'enter',
      revealOrder,
      revealedPositions: new Set(),
    });

    const enterCompleteDelay = computeCascadeCompleteDelayMs(revealOrder.length, 'enter');

    scheduleWordTransitionTimer(() => {
      setWordTransition(null);
      setWordTransitioning(false);
    }, enterCompleteDelay);
  }, [
    exercise.sequences,
    loadSequence,
    order,
    orderPos,
    scheduleWordTransitionTimer,
  ]);

  const startWordExitTransition = useCallback(
    (solved: WordOperationSequence, exitWord?: string) => {
      clearWordTransitionTimers();
      setWordTransitioning(true);
      setRevealedCellIndices((prev) => new Set(prev).add(solved.cellIndex));
      onSequenceSolved?.(solved);

      const word = exitWord ?? solved.targetWord;
      const popOrder = shuffleIndices(word.length);
      if (popOrder.length === 0) {
        startWordEnterTransition();
        return;
      }

      setWordTransition({
        phase: 'exit',
        popOrder,
        poppedPositions: new Set(),
      });

      const exitCompleteDelay = computeCascadeCompleteDelayMs(popOrder.length, 'exit');

      scheduleWordTransitionTimer(() => {
        setWordTransition(null);
        startWordEnterTransition();
      }, exitCompleteDelay);
    },
    [
      clearWordTransitionTimers,
      onSequenceSolved,
      scheduleWordTransitionTimer,
      startWordEnterTransition,
    ],
  );

  startWordExitTransitionRef.current = startWordExitTransition;

  useEffect(() => {
    if (order.length > 0 && orderPos >= order.length) {
      onAllSolved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPos, order.length]);

  useEffect(
    () => () => {
      clearWordTransitionTimers();
    },
    [clearWordTransitionTimers],
  );

  const displayWord =
    wordTransition != null ? coreSnapshot?.currentWord ?? sequence?.baseWord ?? '' : coreSnapshot?.currentWord ?? '';

  const letters = useMemo<LetterBubbleModel[]>(() => {
    if (wordTransition != null) {
      const order =
        wordTransition.phase === 'exit'
          ? wordTransition.popOrder
          : wordTransition.revealOrder;

      return mapLettersWithCascade({
        word: displayWord,
        keyPrefix: orderPos,
        phase: wordTransition.phase,
        order,
        getLetterState:
          wordTransition.phase === 'enter'
            ? (position) => coreSnapshot?.letters[position]
            : undefined,
      });
    }

    return coreSnapshot?.letters ?? [];
  }, [coreSnapshot, displayWord, orderPos, wordTransition]);

  const instruction = useMemo(() => {
    if (isCompleted) {
      return 'All words transformed!';
    }
    if (wordTransitioning) {
      return 'Nice!';
    }
    return coreSnapshot?.instruction ?? '';
  }, [coreSnapshot?.instruction, isCompleted, wordTransitioning]);

  const handleLetterPress = useCallback(
    (position: number) => {
      if (wordTransition != null || wordTransitioning) {
        return;
      }
      handleLetterPressUnguarded(position);
    },
    [handleLetterPressUnguarded, wordTransition, wordTransitioning],
  );

  const handleVariantPress = useCallback(
    (item: VariantPickerItem, source: VariantSourceLayout) => {
      if (wordTransition != null || wordTransitioning) {
        return;
      }
      handleVariantPressUnguarded(item, source);
    },
    [handleVariantPressUnguarded, wordTransition, wordTransitioning],
  );

  return {
    isCompleted,
    transitioning: wordTransitioning,
    insertAnimation: coreSnapshot?.insertAnimation ?? null,
    wordTransition,
    sequence,
    operation: coreSnapshot?.operation ?? null,
    mode: coreSnapshot?.mode ?? null,
    letters,
    variantPickerItems: (coreSnapshot?.variantPickerItems ?? []) as VariantPickerItem[],
    pickerHiddenItemIds: coreSnapshot?.pickerHiddenItemIds ?? new Set(),
    wrongItemId: coreSnapshot?.wrongItemId ?? null,
    poppedPickerItemIds: coreSnapshot?.poppedPickerItemIds,
    instruction,
    highlightedCellIndex: wordTransitioning || sequence == null ? -1 : sequence.cellIndex,
    revealedCellIndices,
    solvedCount: orderPos,
    totalCount: order.length,
    handleLetterPress,
    handleVariantPress,
  };
}
