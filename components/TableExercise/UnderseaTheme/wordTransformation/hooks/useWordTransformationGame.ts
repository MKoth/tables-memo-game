import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import { computeLetterLayout } from '../components/TransformationWordBubbles';
import {
  BUBBLE_BURST_DURATION_MS,
  INSERT_FLY_MS,
  INSERT_RESERVE_MS,
  VARIANT_POP_STAGGER_MS,
  WORD_LETTER_ENTER_DURATION_MS,
  WORD_LETTER_ENTER_STAGGER_MS,
  WORD_LETTER_EXIT_STAGGER_MS,
} from '../insertAnimationTiming';
import {
  OPERATION_TYPES,
  createWordTransformationExercise,
  type Operation,
  type WordOperationSequence,
} from '../domain';

export type LetterBubbleModel = {
  key: string;
  char: string;
  position: number;
  popped: boolean;
  wrong: boolean;
  skipEnter?: boolean;
  /** Hidden until revealed during the post-solve enter sequence. */
  pendingEnter?: boolean;
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
  allVariants: string[];
  wrongVariants: string[];
  poppedWrongVariants: ReadonlySet<string>;
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
  variants: string[];
  wrongVariant: string | null;
  instruction: string;
  highlightedCellIndex: number;
  revealedCellIndices: ReadonlySet<number>;
  solvedCount: number;
  totalCount: number;
  handleLetterPress: (position: number) => void;
  handleVariantPress: (variant: string, source: VariantSourceLayout) => void;
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
  const [wrongVariant, setWrongVariant] = useState<string | null>(null);
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

  const flashWrongVariant = useCallback((variant: string) => {
    setWrongVariant(variant);
    if (wrongVariantTimerRef.current != null) {
      clearTimeout(wrongVariantTimerRef.current);
    }
    wrongVariantTimerRef.current = setTimeout(() => {
      setWrongVariant(null);
      wrongVariantTimerRef.current = null;
    }, WRONG_FEEDBACK_MS);
  }, []);

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

      setWordTransition({
        phase: 'enter',
        revealOrder,
        revealedPositions: new Set(),
      });

      revealOrder.forEach((position, index) => {
        scheduleWordTransitionTimer(() => {
          playInflate?.();
          setWordTransition((prev) => {
            if (prev?.phase !== 'enter') {
              return prev;
            }
            return {
              ...prev,
              revealedPositions: new Set(prev.revealedPositions).add(revealOrder[index]!),
            };
          });
        }, index * WORD_LETTER_ENTER_STAGGER_MS);
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
      playInflate,
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

      setWordTransition({
        phase: 'exit',
        popOrder,
        poppedPositions: new Set(),
      });

      popOrder.forEach((position, index) => {
        scheduleWordTransitionTimer(() => {
          playPop?.();
          setWordTransition((prev) => {
            if (prev?.phase !== 'exit') {
              return prev;
            }
            return {
              ...prev,
              poppedPositions: new Set(prev.poppedPositions).add(popOrder[index]!),
            };
          });
        }, index * WORD_LETTER_EXIT_STAGGER_MS);
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
      playPop,
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

  const handleVariantPress = useCallback(
    (variant: string, source: VariantSourceLayout) => {
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
      if (variant !== operation.text) {
        playWrong?.();
        flashWrongVariant(variant);
        return;
      }

      playInflate?.();
      applyingRef.current = true;
      clearInsertTimers();

      const nextWord = applyInsert(currentWord, operation.index, operation.text);
      const insertLength = operation.text.length;
      const allVariants = operation.variants ?? [];
      const wrongVariants = allVariants.filter((item) => item !== operation.text);
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
        phase: 'reserve',
        selectedVariant: operation.text,
        allVariants,
        wrongVariants,
        poppedWrongVariants: new Set(),
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

      scheduleInsertTimer(() => {
        setInsertAnimation((prev) => (prev == null ? null : { ...prev, phase: 'fly' }));
      }, INSERT_RESERVE_MS);

      scheduleInsertTimer(() => {
        setSkipEnterPositions(
          new Set(
            Array.from({ length: insertLength }, (_, i) => operation.index + i),
          ),
        );
        currentWordRef.current = nextWord;
        setCurrentWord(nextWord);
        setInsertAnimation((prev) => (prev == null ? null : { ...prev, phase: 'dismiss' }));

        wrongVariants.forEach((wrongVariant, index) => {
          scheduleInsertTimer(() => {
            playPop?.();
            setInsertAnimation((prev) => {
              if (prev == null) {
                return null;
              }
              return {
                ...prev,
                poppedWrongVariants: new Set(prev.poppedWrongVariants).add(wrongVariant),
              };
            });
          }, index * VARIANT_POP_STAGGER_MS);
        });
      }, INSERT_RESERVE_MS + INSERT_FLY_MS);

      const lastPopStartMs =
        wrongVariants.length > 0 ? (wrongVariants.length - 1) * VARIANT_POP_STAGGER_MS : 0;
      const finalizeDelay =
        INSERT_RESERVE_MS +
        INSERT_FLY_MS +
        lastPopStartMs +
        BUBBLE_BURST_DURATION_MS;

      scheduleInsertTimer(() => {
        finalizeInsertOperation();
      }, finalizeDelay);
    },
    [
      clearInsertTimers,
      currentWord,
      finalizeInsertOperation,
      flashWrongVariant,
      insertAnimation,
      koiRect,
      mode,
      operation,
      playInflate,
      playPop,
      playWrong,
      scheduleInsertTimer,
      transitioning,
      wordTransition,
    ],
  );

  const letters = useMemo<LetterBubbleModel[]>(
    () =>
      currentWord.split('').map((char, position) => {
        const exitPopped =
          wordTransition?.phase === 'exit' && wordTransition.poppedPositions.has(position);
        const pendingEnter =
          wordTransition?.phase === 'enter' &&
          !wordTransition.revealedPositions.has(position);
        const popped =
          wordTransition?.phase === 'exit'
            ? exitPopped
            : poppedPositions.has(position);

        return {
          // Stable per sequence + index so surviving letters keep their instance
          // across operation steps and grow in place instead of re-entering.
          key: `${orderPos}:${position}`,
          char,
          position,
          popped,
          wrong: wrongPositions.has(position),
          skipEnter: skipEnterPositions.has(position),
          pendingEnter,
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
      return 'Choose the letters to add';
    }
    return '';
  }, [isCompleted, mode, transitioning]);

  return {
    isCompleted,
    transitioning,
    insertAnimation,
    wordTransition,
    sequence,
    operation,
    mode,
    letters,
    variants: mode === 'insert' ? operation?.variants ?? [] : [],
    wrongVariant,
    instruction,
    highlightedCellIndex: transitioning || sequence == null ? -1 : sequence.cellIndex,
    revealedCellIndices,
    solvedCount: orderPos,
    totalCount: order.length,
    handleLetterPress,
    handleVariantPress,
  };
}
