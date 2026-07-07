import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import { computeLetterLayout } from '../components/TransformationWordBubbles';
import type { VariantPickerItem } from '../components/TransformationVariantPicker';
import {
  BUBBLE_BURST_DURATION_MS,
  WORD_LETTER_ENTER_DURATION_MS,
  WORD_LETTER_ENTER_STAGGER_MS,
  WORD_LETTER_EXIT_STAGGER_MS,
} from '../insertAnimationTiming';
import {
  createWordTransformationCore,
  createWordTransformationExercise,
  type InsertAnimationState,
  type LetterBubbleModel,
  type TransformationMode,
  type VariantSourceLayout,
  type WordOperationSequence,
  type WordTransformationCoreSnapshot,
} from '../domain';

export type {
  InsertAnimationPhase,
  InsertAnimationState,
  LetterBubbleModel,
  TransformationMode,
  VariantSourceLayout,
} from '../domain';
/** @deprecated Use InsertAnimationState */
export type InsertFlightState = InsertAnimationState;

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
  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [coreSnapshot, setCoreSnapshot] = useState<WordTransformationCoreSnapshot | null>(null);

  const coreRef = useRef<ReturnType<typeof createWordTransformationCore> | null>(null);
  const skipSequenceLoadRef = useRef(false);
  const wordTransitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startWordExitTransitionRef = useRef<
    (solved: WordOperationSequence, exitWord?: string) => void
  >(() => {});
  const koiRectRef = useRef(koiRect);
  koiRectRef.current = koiRect;

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

  const syncCoreSnapshot = useCallback(() => {
    setCoreSnapshot(coreRef.current?.getSnapshot() ?? null);
    bumpRender();
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

    const revealOrder = shuffleIndices(nextSequence.baseWord.length);

    skipSequenceLoadRef.current = true;
    setOrderPos(nextPos);
    coreRef.current?.loadSequence(nextSequence, nextPos);
    syncCoreSnapshot();

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

    const enterCompleteDelay =
      (revealOrder.length - 1) * WORD_LETTER_ENTER_STAGGER_MS + WORD_LETTER_ENTER_DURATION_MS;

    scheduleWordTransitionTimer(() => {
      setWordTransition(null);
      setWordTransitioning(false);
    }, enterCompleteDelay);
  }, [
    exercise.sequences,
    order,
    orderPos,
    scheduleWordTransitionTimer,
    syncCoreSnapshot,
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

      const exitCompleteDelay =
        (popOrder.length - 1) * WORD_LETTER_EXIT_STAGGER_MS + BUBBLE_BURST_DURATION_MS;

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

  const playPopRef = useRef(playPop);
  const playInflateRef = useRef(playInflate);
  const playWrongRef = useRef(playWrong);
  playPopRef.current = playPop;
  playInflateRef.current = playInflate;
  playWrongRef.current = playWrong;

  startWordExitTransitionRef.current = startWordExitTransition;

  useEffect(() => {
    const core = createWordTransformationCore({
      getLetterLayout: (wordLength) =>
        computeLetterLayout(koiRectRef.current, wordLength),
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      onSequenceComplete: (sequence, finalWord) => {
        startWordExitTransitionRef.current(sequence, finalWord);
      },
      onStateChange: syncCoreSnapshot,
      playPop: () => playPopRef.current?.(),
      playInflate: () => playInflateRef.current?.(),
      playWrong: () => playWrongRef.current?.(),
    });
    coreRef.current = core;

    return () => {
      core.dispose();
      coreRef.current = null;
    };
  }, [syncCoreSnapshot]);

  const isCompleted = order.length === 0 || orderPos >= order.length;
  const sequence = isCompleted ? null : exercise.sequences[order[orderPos]] ?? null;

  useEffect(() => {
    if (sequence == null || coreRef.current == null) {
      return;
    }
    if (skipSequenceLoadRef.current) {
      skipSequenceLoadRef.current = false;
      return;
    }
    coreRef.current.loadSequence(sequence, orderPos);
    syncCoreSnapshot();
  }, [orderPos, sequence, syncCoreSnapshot]);

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
      return displayWord.split('').map((char, position) => {
        const isExit = wordTransition.phase === 'exit';
        const isEnter = wordTransition.phase === 'enter';
        const popIndex = isExit ? wordTransition.popOrder.indexOf(position) : -1;
        const enterIndex = isEnter ? wordTransition.revealOrder.indexOf(position) : -1;

        return {
          key: `${orderPos}:${position}`,
          char,
          position,
          popped: isExit ? true : coreSnapshot?.letters[position]?.popped ?? false,
          wrong: coreSnapshot?.letters[position]?.wrong ?? false,
          skipEnter: coreSnapshot?.letters[position]?.skipEnter,
          popDelayMs: popIndex >= 0 ? popIndex * WORD_LETTER_EXIT_STAGGER_MS : undefined,
          enterDelayMs:
            enterIndex >= 0 ? enterIndex * WORD_LETTER_ENTER_STAGGER_MS : undefined,
        };
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
      coreRef.current?.handleLetterPress(position);
      syncCoreSnapshot();
    },
    [syncCoreSnapshot, wordTransition, wordTransitioning],
  );

  const handleVariantPress = useCallback(
    (item: VariantPickerItem, source: VariantSourceLayout) => {
      if (wordTransition != null || wordTransitioning) {
        return;
      }
      coreRef.current?.handleVariantPress(item, source);
      syncCoreSnapshot();
    },
    [syncCoreSnapshot, wordTransition, wordTransitioning],
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
