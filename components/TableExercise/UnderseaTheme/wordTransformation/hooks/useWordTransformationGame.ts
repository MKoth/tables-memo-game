import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import { computeLetterLayout } from '../components/TransformationWordBubbles';
import {
  BUBBLE_BURST_DURATION_MS,
  INSERT_FLY_MS,
  INSERT_LAND_HANDOFF_MS,
  INSERT_RESERVE_MS,
  VARIANT_POP_STAGGER_MS,
  WORD_LETTER_ENTER_DURATION_MS,
  WORD_LETTER_ENTER_STAGGER_MS,
  WORD_LETTER_EXIT_STAGGER_MS,
} from '../insertAnimationTiming';
import {
  OPERATION_TYPES,
  createWordTransformationExercise,
  generateSequentialLetterChoices,
  type LetterChoice,
  type Operation,
  type WordOperationSequence,
} from '../domain';
import type { VariantPickerItem } from '../components/TransformationVariantPicker';

export type LetterBubbleModel = {
  key: string;
  char: string;
  position: number;
  popped: boolean;
  wrong: boolean;
  skipEnter?: boolean;
  /** Per-letter pop delay (ms) so the exit cascade staggers on the UI thread. */
  popDelayMs?: number;
  /** Per-letter enter delay (ms) so the inflate cascade staggers on the UI thread. */
  enterDelayMs?: number;
};

export type VariantSourceLayout = {
  centerX: number;
  centerY: number;
  diameter: number;
};

export type InsertAnimationPhase = 'reserve' | 'fly' | 'dismiss';

export type InsertAnimationState = {
  phase: InsertAnimationPhase;
  selectedVariant: string;
  /** Picker item id — sequential multi-letter insert. */
  selectedChoiceId?: string;
  allVariants: string[];
  wrongVariants: string[];
  poppedWrongVariants: ReadonlySet<string>;
  /** Shuffled ids for staggered wrong-variant pops during dismiss (UI thread). */
  dismissPopOrder: readonly string[];
  char: string;
  fromCenterX: number;
  fromCenterY: number;
  fromDiameter: number;
  toCenterX: number;
  toCenterY: number;
  toDiameter: number;
  flyDurationMs: number;
  nextWord: string;
  insertIndex: number;
  insertLength: number;
  /** When true, `wrongVariants` / popped sets use picker item ids. */
  sequential?: boolean;
};

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

export type TransformationMode = 'delete' | 'insert';

export type WordTransformationGame = {
  isCompleted: boolean;
  transitioning: boolean;
  insertAnimation: InsertAnimationState | null;
  wordTransition: WordTransitionState | null;
  sequence: WordOperationSequence | null;
  operation: Operation | null;
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

const WRONG_FEEDBACK_MS = 1000;
const DELETE_APPLY_MS = 320;

function shuffleIndices(count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function shuffleIds(ids: readonly string[]): string[] {
  return shuffleIndices(ids.length).map((index) => ids[index]!);
}

function applyDelete(word: string, index: number, length: number): string {
  return word.slice(0, index) + word.slice(index + length);
}

function applyInsert(word: string, index: number, text: string): string {
  return word.slice(0, index) + text + word.slice(index);
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
  const [opIndex, setOpIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<string>(
    () => exercise.sequences[order[0]]?.baseWord ?? '',
  );
  const [poppedPositions, setPoppedPositions] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [wrongPositions, setWrongPositions] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [wrongChoiceId, setWrongChoiceId] = useState<string | null>(null);
  const [sequentialInsertProgress, setSequentialInsertProgress] = useState(0);
  const [hiddenLetterChoiceIds, setHiddenLetterChoiceIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [transitioning, setTransitioning] = useState(false);
  const [insertAnimation, setInsertAnimation] = useState<InsertAnimationState | null>(null);
  const [wordTransition, setWordTransition] = useState<WordTransitionState | null>(null);
  const [skipEnterPositions, setSkipEnterPositions] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [revealedCellIndices, setRevealedCellIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const applyingRef = useRef(false);
  const currentWordRef = useRef(currentWord);
  currentWordRef.current = currentWord;
  const skipSequenceResetRef = useRef(false);
  const wrongTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const wrongVariantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insertTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wordTransitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearInsertTimers = useCallback(() => {
    insertTimersRef.current.forEach(clearTimeout);
    insertTimersRef.current = [];
  }, []);

  const clearWordTransitionTimers = useCallback(() => {
    wordTransitionTimersRef.current.forEach(clearTimeout);
    wordTransitionTimersRef.current = [];
  }, []);

  const scheduleInsertTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = setTimeout(() => {
      insertTimersRef.current = insertTimersRef.current.filter((timerId) => timerId !== id);
      fn();
    }, delayMs);
    insertTimersRef.current.push(id);
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

  useEffect(
    () => () => {
      Object.values(wrongTimersRef.current).forEach(clearTimeout);
      if (wrongVariantTimerRef.current != null) {
        clearTimeout(wrongVariantTimerRef.current);
      }
      if (opCompleteTimerRef.current != null) {
        clearTimeout(opCompleteTimerRef.current);
      }
      clearInsertTimers();
      clearWordTransitionTimers();
    },
    [clearInsertTimers, clearWordTransitionTimers],
  );

  const isCompleted = order.length === 0 || orderPos >= order.length;
  const sequence = isCompleted ? null : exercise.sequences[order[orderPos]] ?? null;

  // Reset per-sequence working state whenever the active sequence changes.
  useEffect(() => {
    if (sequence == null) {
      return;
    }
    if (skipSequenceResetRef.current) {
      skipSequenceResetRef.current = false;
      return;
    }
    applyingRef.current = false;
    setOpIndex(0);
    setPoppedPositions(new Set());
    setSkipEnterPositions(new Set());
    setHiddenLetterChoiceIds(new Set());
    setSequentialInsertProgress(0);
    clearInsertTimers();
    clearWordTransitionTimers();
    setInsertAnimation(null);
    setWordTransition(null);
    setCurrentWord(sequence.baseWord);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPos]);

  useEffect(() => {
    if (order.length > 0 && orderPos >= order.length) {
      onAllSolved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPos, order.length]);

  const operation =
    sequence != null && opIndex < sequence.operations.length
      ? sequence.operations[opIndex]
      : null;
  const mode: TransformationMode | null =
    operation == null
      ? null
      : operation.type === OPERATION_TYPES.DELETE
        ? 'delete'
        : 'insert';

  const flashWrongPosition = useCallback((position: number) => {
    setWrongPositions((prev) => new Set(prev).add(position));
    if (wrongTimersRef.current[position] != null) {
      clearTimeout(wrongTimersRef.current[position]);
    }
    wrongTimersRef.current[position] = setTimeout(() => {
      setWrongPositions((prev) => {
        const next = new Set(prev);
        next.delete(position);
        return next;
      });
      delete wrongTimersRef.current[position];
    }, WRONG_FEEDBACK_MS);
  }, []);

  const flashWrongChoice = useCallback((choiceId: string) => {
    setWrongChoiceId(choiceId);
    if (wrongVariantTimerRef.current != null) {
      clearTimeout(wrongVariantTimerRef.current);
    }
    wrongVariantTimerRef.current = setTimeout(() => {
      setWrongChoiceId(null);
      wrongVariantTimerRef.current = null;
    }, WRONG_FEEDBACK_MS);
  }, []);

  const isSequentialInsert =
    operation?.type === OPERATION_TYPES.INSERT && (operation.text.length ?? 0) > 1;

  const sequentialLetterChoices = useMemo((): LetterChoice[] | null => {
    if (!isSequentialInsert || operation == null) {
      return null;
    }
    return generateSequentialLetterChoices(operation.text);
  }, [isSequentialInsert, operation, opIndex, orderPos]);

  useEffect(() => {
    setSequentialInsertProgress(0);
    setHiddenLetterChoiceIds(new Set());
  }, [isSequentialInsert, operation, opIndex, orderPos]);

  const startWordEnterTransition = useCallback(() => {
      const nextPos = orderPos + 1;

      if (nextPos >= order.length) {
        setWordTransition(null);
        setTransitioning(false);
        setOrderPos(nextPos);
        return;
      }

      const nextSequence = exercise.sequences[order[nextPos]];
      if (nextSequence == null) {
        setWordTransition(null);
        setTransitioning(false);
        setOrderPos(nextPos);
        return;
      }

      const revealOrder = shuffleIndices(nextSequence.baseWord.length);

      skipSequenceResetRef.current = true;
      setOrderPos(nextPos);
      applyingRef.current = false;
      setOpIndex(0);
      setPoppedPositions(new Set());
      setSkipEnterPositions(new Set());
      clearInsertTimers();
      setInsertAnimation(null);
      setCurrentWord(nextSequence.baseWord);

      if (revealOrder.length === 0) {
        setWordTransition(null);
        setTransitioning(false);
        return;
      }

      // Single state update: every letter mounts at once and each inflates after
      // its own UI-thread delay (see LetterBubble.enterDelayMs). The inflate sound
      // is fired from the Reanimated animation callback so it stays frame-synced.
      setWordTransition({
        phase: 'enter',
        revealOrder,
        revealedPositions: new Set(),
      });

      const enterCompleteDelay =
        (revealOrder.length - 1) * WORD_LETTER_ENTER_STAGGER_MS +
        WORD_LETTER_ENTER_DURATION_MS;

      scheduleWordTransitionTimer(() => {
        setWordTransition(null);
        setTransitioning(false);
      }, enterCompleteDelay);
  }, [
      clearInsertTimers,
      exercise.sequences,
      order,
      orderPos,
      scheduleWordTransitionTimer,
    ],
  );

  const startWordExitTransition = useCallback(
    (solved: WordOperationSequence, exitWord?: string) => {
      clearWordTransitionTimers();
      setTransitioning(true);
      setPoppedPositions(new Set());
      setSkipEnterPositions(new Set());
      setRevealedCellIndices((prev) => new Set(prev).add(solved.cellIndex));
      onSequenceSolved?.(solved);

      const word = exitWord ?? currentWordRef.current;
      const popOrder = shuffleIndices(word.length);
      if (popOrder.length === 0) {
        startWordEnterTransition();
        return;
      }

      // Single state update: every letter is marked popped at once and each bursts
      // after its own UI-thread delay (see LetterBubble.popDelayMs). The pop sound
      // is fired from the Reanimated animation callback so it stays frame-synced.
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

  const completeOperation = useCallback(
    (nextWord: string) => {
      if (sequence == null) {
        return;
      }
      currentWordRef.current = nextWord;
      setCurrentWord(nextWord);
      setPoppedPositions(new Set());

      const nextOpIndex = opIndex + 1;
      if (nextOpIndex >= sequence.operations.length) {
        startWordExitTransition(sequence, nextWord);
        return;
      }
      setOpIndex(nextOpIndex);
    },
    [opIndex, sequence, startWordExitTransition],
  );

  const handleLetterPress = useCallback(
    (position: number) => {
      if (applyingRef.current || transitioning || wordTransition != null || operation == null || mode !== 'delete') {
        return;
      }
      const length = operation.length ?? 0;
      const start = operation.index;
      const end = start + length;
      const inRange = position >= start && position < end;

      if (!inRange || poppedPositions.has(position)) {
        playWrong?.();
        flashWrongPosition(position);
        return;
      }

      playPop?.();
      const nextPopped = new Set(poppedPositions).add(position);
      setPoppedPositions(nextPopped);

      if (nextPopped.size >= length) {
        applyingRef.current = true;
        const nextWord = applyDelete(currentWord, start, length);
        opCompleteTimerRef.current = setTimeout(() => {
          opCompleteTimerRef.current = null;
          applyingRef.current = false;
          completeOperation(nextWord);
        }, DELETE_APPLY_MS);
      }
    },
    [
      completeOperation,
      currentWord,
      flashWrongPosition,
      mode,
      operation,
      playPop,
      playWrong,
      poppedPositions,
      transitioning,
      wordTransition,
    ],
  );

  const finalizeInsertOperation = useCallback(() => {
      if (sequence == null) {
        return;
      }
      applyingRef.current = false;
      clearInsertTimers();
      setInsertAnimation(null);

      const nextOpIndex = opIndex + 1;
      if (nextOpIndex >= sequence.operations.length) {
        startWordExitTransition(sequence);
        return;
      }
      setOpIndex(nextOpIndex);
    },
    [clearInsertTimers, opIndex, sequence, startWordExitTransition],
  );

  const scheduleInsertDismissAndFinalize = useCallback(
    (
      wrongIds: string[],
      onLand: () => void,
      sequential: boolean,
    ) => {
      scheduleInsertTimer(() => {
        onLand();
        // Single update: every wrong variant pops on the UI thread via popDelayMs
        // (same pattern as word exit — avoids JS-thread setTimeout batching).
        setInsertAnimation((prev) => {
          if (prev == null) {
            return null;
          }
          return {
            ...prev,
            phase: 'dismiss',
            dismissPopOrder: shuffleIds(wrongIds),
          };
        });
      }, INSERT_RESERVE_MS + INSERT_FLY_MS);

      const lastPopStartMs =
        wrongIds.length > 0 ? (wrongIds.length - 1) * VARIANT_POP_STAGGER_MS : 0;
      const finalizeDelay =
        INSERT_RESERVE_MS +
        INSERT_FLY_MS +
        lastPopStartMs +
        BUBBLE_BURST_DURATION_MS;

      scheduleInsertTimer(() => {
        if (sequential) {
          setHiddenLetterChoiceIds(new Set());
          setSequentialInsertProgress(0);
        }
        finalizeInsertOperation();
      }, finalizeDelay);
    },
    [finalizeInsertOperation, scheduleInsertTimer],
  );

  const startWholeWordInsertAnimation = useCallback(
    (item: VariantPickerItem, source: VariantSourceLayout) => {
      if (operation == null) {
        return;
      }

      playInflate?.();
      applyingRef.current = true;
      clearInsertTimers();

      const nextWord = applyInsert(currentWord, operation.index, operation.text);
      const insertLength = operation.text.length;
      const allVariants = operation.variants ?? [];
      const wrongVariants = allVariants.filter((variant) => variant !== operation.text);
      const targetLayout = computeLetterLayout(koiRect, nextWord.length);
      const targetCenters = targetLayout.centers.slice(
        operation.index,
        operation.index + insertLength,
      );
      const toCenterX =
        targetCenters.length === 1
          ? (targetCenters[0] ?? 0)
          : targetCenters.reduce((sum, center) => sum + center, 0) / targetCenters.length;

      const animationBase: InsertAnimationState = {
        phase: 'fly',
        selectedVariant: operation.text,
        selectedChoiceId: item.id,
        allVariants,
        wrongVariants,
        poppedWrongVariants: new Set(),
        dismissPopOrder: [],
        char: operation.text,
        fromCenterX: source.centerX,
        fromCenterY: source.centerY,
        fromDiameter: source.diameter,
        toCenterX,
        toCenterY: targetLayout.rowY,
        toDiameter: targetLayout.diameter,
        flyDurationMs: INSERT_FLY_MS,
        nextWord,
        insertIndex: operation.index,
        insertLength,
      };

      setInsertAnimation(animationBase);

      scheduleInsertDismissAndFinalize(
        wrongVariants,
        () => {
          setSkipEnterPositions(
            new Set(
              Array.from({ length: insertLength }, (_, i) => operation.index + i),
            ),
          );
          currentWordRef.current = nextWord;
          setCurrentWord(nextWord);
        },
        false,
      );
    },
    [
      clearInsertTimers,
      currentWord,
      koiRect,
      operation,
      playInflate,
      scheduleInsertDismissAndFinalize,
      scheduleInsertTimer,
    ],
  );

  const startSequentialLetterInsertAnimation = useCallback(
    (item: VariantPickerItem, source: VariantSourceLayout) => {
      if (operation == null || sequentialLetterChoices == null) {
        return;
      }

      const expectedChar = operation.text[sequentialInsertProgress];
      if (item.label !== expectedChar) {
        playWrong?.();
        flashWrongChoice(item.id);
        return;
      }

      playInflate?.();
      applyingRef.current = true;
      clearInsertTimers();

      const slotIndex = operation.index + sequentialInsertProgress;
      const partialNextWord = applyInsert(currentWord, slotIndex, expectedChar);
      const targetLayout = computeLetterLayout(koiRect, partialNextWord.length);
      const toCenterX = targetLayout.centers[slotIndex] ?? 0;
      const isLastLetter = sequentialInsertProgress + 1 >= operation.text.length;
      const nextHiddenIds = new Set(hiddenLetterChoiceIds).add(item.id);
      const remainingWrongIds = isLastLetter
        ? sequentialLetterChoices
            .filter((choice) => !nextHiddenIds.has(choice.id))
            .map((choice) => choice.id)
        : [];

      const animationBase: InsertAnimationState = {
        phase: 'fly',
        selectedVariant: item.label,
        selectedChoiceId: item.id,
        allVariants: sequentialLetterChoices.map((choice) => choice.id),
        wrongVariants: remainingWrongIds,
        poppedWrongVariants: new Set(),
        dismissPopOrder: [],
        char: item.label,
        fromCenterX: source.centerX,
        fromCenterY: source.centerY,
        fromDiameter: source.diameter,
        toCenterX,
        toCenterY: targetLayout.rowY,
        toDiameter: targetLayout.diameter,
        flyDurationMs: INSERT_FLY_MS,
        nextWord: partialNextWord,
        insertIndex: slotIndex,
        insertLength: 1,
        sequential: true,
      };

      setInsertAnimation(animationBase);

      if (isLastLetter) {
        scheduleInsertDismissAndFinalize(
          remainingWrongIds,
          () => {
            setHiddenLetterChoiceIds(nextHiddenIds);
            setSkipEnterPositions((prev) => new Set(prev).add(slotIndex));
            currentWordRef.current = partialNextWord;
            setCurrentWord(partialNextWord);
            setSequentialInsertProgress(sequentialInsertProgress + 1);
          },
          true,
        );
        return;
      }

      scheduleInsertTimer(() => {
        setHiddenLetterChoiceIds(nextHiddenIds);
        setSkipEnterPositions((prev) => new Set(prev).add(slotIndex));
        currentWordRef.current = partialNextWord;
        setCurrentWord(partialNextWord);
        setSequentialInsertProgress(sequentialInsertProgress + 1);
        setInsertAnimation((prev) => (prev == null ? null : { ...prev, phase: 'dismiss' }));
        applyingRef.current = false;
      }, INSERT_RESERVE_MS + INSERT_FLY_MS);

      scheduleInsertTimer(() => {
        setInsertAnimation(null);
      }, INSERT_RESERVE_MS + INSERT_FLY_MS + INSERT_LAND_HANDOFF_MS);
    },
    [
      clearInsertTimers,
      currentWord,
      flashWrongChoice,
      hiddenLetterChoiceIds,
      koiRect,
      sequentialLetterChoices,
      operation,
      playInflate,
      playWrong,
      scheduleInsertDismissAndFinalize,
      scheduleInsertTimer,
      sequentialInsertProgress,
    ],
  );

  const handleVariantPress = useCallback(
    (item: VariantPickerItem, source: VariantSourceLayout) => {
      if (
        applyingRef.current ||
        transitioning ||
        wordTransition != null ||
        insertAnimation != null ||
        operation == null ||
        mode !== 'insert'
      ) {
        return;
      }

      if (operation.text.length > 1) {
        startSequentialLetterInsertAnimation(item, source);
        return;
      }

      if (item.label !== operation.text) {
        playWrong?.();
        flashWrongChoice(item.id);
        return;
      }

      startWholeWordInsertAnimation(item, source);
    },
    [
      insertAnimation,
      mode,
      operation,
      playWrong,
      flashWrongChoice,
      startSequentialLetterInsertAnimation,
      startWholeWordInsertAnimation,
      transitioning,
      wordTransition,
    ],
  );

  const letters = useMemo<LetterBubbleModel[]>(
    () =>
      currentWord.split('').map((char, position) => {
        const isExit = wordTransition?.phase === 'exit';
        const isEnter = wordTransition?.phase === 'enter';
        const popIndex = isExit ? wordTransition.popOrder.indexOf(position) : -1;
        const enterIndex = isEnter ? wordTransition.revealOrder.indexOf(position) : -1;
        const popped = isExit ? true : poppedPositions.has(position);

        return {
          // Stable per sequence + index so surviving letters keep their instance
          // across operation steps and grow in place instead of re-entering.
          key: `${orderPos}:${position}`,
          char,
          position,
          popped,
          wrong: wrongPositions.has(position),
          skipEnter: skipEnterPositions.has(position),
          popDelayMs: popIndex >= 0 ? popIndex * WORD_LETTER_EXIT_STAGGER_MS : undefined,
          enterDelayMs:
            enterIndex >= 0 ? enterIndex * WORD_LETTER_ENTER_STAGGER_MS : undefined,
        };
      }),
    [
      currentWord,
      orderPos,
      poppedPositions,
      skipEnterPositions,
      wordTransition,
      wrongPositions,
    ],
  );

  const variantPickerItems = useMemo((): VariantPickerItem[] => {
    const withDismissStagger = (
      items: VariantPickerItem[],
      wrongIds: readonly string[],
      dismissPopOrder: readonly string[],
      isDismiss: boolean,
    ): VariantPickerItem[] =>
      items.map((item) => {
        if (!isDismiss || !wrongIds.includes(item.id)) {
          return item;
        }
        const popIndex = dismissPopOrder.indexOf(item.id);
        return {
          ...item,
          popping: true,
          popDelayMs: popIndex >= 0 ? popIndex * VARIANT_POP_STAGGER_MS : undefined,
        };
      });

    if (insertAnimation?.sequential && sequentialLetterChoices != null) {
      const base = sequentialLetterChoices.map((choice) => ({
        id: choice.id,
        label: choice.char,
      }));
      return withDismissStagger(
        base,
        insertAnimation.wrongVariants,
        insertAnimation.dismissPopOrder,
        insertAnimation.phase === 'dismiss',
      );
    }
    if (insertAnimation != null) {
      const base = insertAnimation.allVariants.map((variant) => ({
        id: variant,
        label: variant,
      }));
      return withDismissStagger(
        base,
        insertAnimation.wrongVariants,
        insertAnimation.dismissPopOrder,
        insertAnimation.phase === 'dismiss',
      );
    }
    if (isSequentialInsert) {
      return (sequentialLetterChoices ?? []).map((choice) => ({
        id: choice.id,
        label: choice.char,
      }));
    }
    if (mode === 'insert') {
      return (operation?.variants ?? []).map((variant) => ({ id: variant, label: variant }));
    }
    return [];
  }, [insertAnimation, isSequentialInsert, mode, operation?.variants, sequentialLetterChoices]);

  const pickerHiddenItemIds = useMemo(() => {
    const hidden = new Set(hiddenLetterChoiceIds);
    if (insertAnimation?.selectedChoiceId != null) {
      hidden.add(insertAnimation.selectedChoiceId);
    }
    return hidden;
  }, [hiddenLetterChoiceIds, insertAnimation]);

  const instruction = useMemo(() => {
    if (isCompleted) {
      return 'All words transformed!';
    }
    if (transitioning) {
      return 'Nice!';
    }
    if (mode === 'delete') {
      return 'Pop the bubbles to remove';
    }
    if (mode === 'insert') {
      return isSequentialInsert ? 'Add the letters in order' : 'Choose the letters to add';
    }
    return '';
  }, [isCompleted, isSequentialInsert, mode, transitioning]);

  return {
    isCompleted,
    transitioning,
    insertAnimation,
    wordTransition,
    sequence,
    operation,
    mode,
    letters,
    variantPickerItems,
    pickerHiddenItemIds,
    wrongItemId: wrongChoiceId,
    poppedPickerItemIds: insertAnimation?.poppedWrongVariants,
    instruction,
    highlightedCellIndex: transitioning || sequence == null ? -1 : sequence.cellIndex,
    revealedCellIndices,
    solvedCount: orderPos,
    totalCount: order.length,
    handleLetterPress,
    handleVariantPress,
  };
}
