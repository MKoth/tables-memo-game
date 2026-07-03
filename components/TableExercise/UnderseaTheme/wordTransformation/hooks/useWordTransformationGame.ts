import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
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
};

export type TransformationMode = 'delete' | 'insert';

export type WordTransformationGame = {
  isCompleted: boolean;
  transitioning: boolean;
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
  handleVariantPress: (variant: string) => void;
};

const WRONG_FEEDBACK_MS = 1000;
const DELETE_APPLY_MS = 320;
const SOLVE_TRANSITION_MS = 900;

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
  /** Fired when a cell's transformation is finished, before advancing. */
  onSequenceSolved?: (sequence: WordOperationSequence) => void;
  onAllSolved?: () => void;
  playPop?: () => void;
  playWrong?: () => void;
  playSuccess?: () => void;
};

export function useWordTransformationGame({
  table,
  onSequenceSolved,
  onAllSolved,
  playPop,
  playWrong,
  playSuccess,
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
  const [revealedCellIndices, setRevealedCellIndices] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const applyingRef = useRef(false);
  const wrongTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const wrongVariantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      Object.values(wrongTimersRef.current).forEach(clearTimeout);
      if (wrongVariantTimerRef.current != null) {
        clearTimeout(wrongVariantTimerRef.current);
      }
      if (opCompleteTimerRef.current != null) {
        clearTimeout(opCompleteTimerRef.current);
      }
      if (transitionTimerRef.current != null) {
        clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  const isCompleted = order.length === 0 || orderPos >= order.length;
  const sequence = isCompleted ? null : exercise.sequences[order[orderPos]] ?? null;

  // Reset per-sequence working state whenever the active sequence changes.
  useEffect(() => {
    if (sequence == null) {
      return;
    }
    applyingRef.current = false;
    setOpIndex(0);
    setPoppedPositions(new Set());
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

  const advanceAfterSolve = useCallback(
    (solved: WordOperationSequence) => {
      setTransitioning(true);
      setRevealedCellIndices((prev) => new Set(prev).add(solved.cellIndex));
      onSequenceSolved?.(solved);
      playSuccess?.();

      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null;
        setTransitioning(false);
        setOrderPos((prev) => prev + 1);
      }, SOLVE_TRANSITION_MS);
    },
    [onSequenceSolved, playSuccess],
  );

  const completeOperation = useCallback(
    (nextWord: string) => {
      if (sequence == null) {
        return;
      }
      setCurrentWord(nextWord);
      setPoppedPositions(new Set());

      const nextOpIndex = opIndex + 1;
      if (nextOpIndex >= sequence.operations.length) {
        advanceAfterSolve(sequence);
        return;
      }
      setOpIndex(nextOpIndex);
    },
    [advanceAfterSolve, opIndex, sequence],
  );

  const handleLetterPress = useCallback(
    (position: number) => {
      if (applyingRef.current || transitioning || operation == null || mode !== 'delete') {
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
    ],
  );

  const handleVariantPress = useCallback(
    (variant: string) => {
      if (applyingRef.current || transitioning || operation == null || mode !== 'insert') {
        return;
      }
      if (variant !== operation.text) {
        playWrong?.();
        flashWrongVariant(variant);
        return;
      }
      playPop?.();
      completeOperation(applyInsert(currentWord, operation.index, operation.text));
    },
    [
      completeOperation,
      currentWord,
      flashWrongVariant,
      mode,
      operation,
      playPop,
      playWrong,
      transitioning,
    ],
  );

  const letters = useMemo<LetterBubbleModel[]>(
    () =>
      currentWord.split('').map((char, position) => ({
        key: `${orderPos}:${opIndex}:${position}`,
        char,
        position,
        popped: poppedPositions.has(position),
        wrong: wrongPositions.has(position),
      })),
    [currentWord, opIndex, orderPos, poppedPositions, wrongPositions],
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
