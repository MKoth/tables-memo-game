import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import { computeLetterLayout } from '../../wordTransformation/components/TransformationWordBubbles';
import type { VariantPickerItem } from '../../wordTransformation/components/TransformationVariantPicker';
import {
  bodyCellIndex,
  createWordTransformationCore,
  type InsertAnimationState,
  type LetterBubbleModel,
  type TransformationMode,
  type VariantSourceLayout,
  type WordOperationSequence,
  type WordTransformationCoreSnapshot,
} from '../../wordTransformation/domain';
import {
  createSentenceTransformationExercise,
  type SentencePromptDisplaySlot,
  type SentenceTransformationRound,
} from '../domain';

export type SentenceTransformationGame = {
  isCompleted: boolean;
  transitioning: boolean;
  insertAnimation: InsertAnimationState | null;
  sequence: WordOperationSequence | null;
  operation: WordOperationSequence['operations'][number] | null;
  mode: TransformationMode | null;
  letters: LetterBubbleModel[];
  variantPickerItems: VariantPickerItem[];
  pickerHiddenItemIds: ReadonlySet<string>;
  wrongItemId: string | null;
  poppedPickerItemIds: ReadonlySet<string> | undefined;
  instruction: string;
  displaySlots: SentencePromptDisplaySlot[];
  solvedCount: number;
  totalCount: number;
  handleLetterPress: (position: number) => void;
  handleVariantPress: (item: VariantPickerItem, source: VariantSourceLayout) => void;
};

function roundToSequence(
  table: TableData,
  round: SentenceTransformationRound,
): WordOperationSequence {
  return {
    rowIndex: round.rowIndex,
    colIndex: round.colIndex,
    cellIndex: bodyCellIndex(table, round.rowIndex, round.colIndex),
    baseWord: round.infinitive,
    targetWord: round.conjugatedForm,
    operations: round.operations,
  };
}

export type UseSentenceTransformationGameParams = {
  table: TableData;
  koiRect: ZoneRect;
  playPop?: () => void;
  playInflate?: () => void;
  playWrong?: () => void;
  playSuccess?: () => void;
};

export function useSentenceTransformationGame({
  table,
  koiRect,
  playPop,
  playInflate,
  playWrong,
  playSuccess,
}: UseSentenceTransformationGameParams): SentenceTransformationGame {
  const exercise = useMemo(
    () => createSentenceTransformationExercise(table),
    [table],
  );

  const [roundPos, setRoundPos] = useState(0);
  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [coreSnapshot, setCoreSnapshot] = useState<WordTransformationCoreSnapshot | null>(null);

  const coreRef = useRef<ReturnType<typeof createWordTransformationCore> | null>(null);
  const koiRectRef = useRef(koiRect);
  koiRectRef.current = koiRect;

  const syncCoreSnapshot = useCallback(() => {
    setCoreSnapshot(coreRef.current?.getSnapshot() ?? null);
    bumpRender();
  }, []);

  const playPopRef = useRef(playPop);
  const playInflateRef = useRef(playInflate);
  const playWrongRef = useRef(playWrong);
  const playSuccessRef = useRef(playSuccess);
  playPopRef.current = playPop;
  playInflateRef.current = playInflate;
  playWrongRef.current = playWrong;
  playSuccessRef.current = playSuccess;

  useEffect(() => {
    const core = createWordTransformationCore({
      getLetterLayout: (wordLength) =>
        computeLetterLayout(koiRectRef.current, wordLength),
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      onSequenceComplete: () => {
        playSuccessRef.current?.();
        setRoundPos((prev) => prev + 1);
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

  const { roundOrder, rounds } = exercise;
  const isCompleted = roundOrder.length === 0 || roundPos >= roundOrder.length;
  const currentRoundIndex = isCompleted ? -1 : roundOrder[roundPos] ?? -1;
  const currentRound = currentRoundIndex >= 0 ? rounds[currentRoundIndex] ?? null : null;
  const sequence =
    currentRound == null ? null : roundToSequence(table, currentRound);

  useEffect(() => {
    if (sequence == null || coreRef.current == null) {
      return;
    }
    coreRef.current.loadSequence(sequence, roundPos);
    syncCoreSnapshot();
  }, [roundPos, sequence, syncCoreSnapshot]);

  const instruction = useMemo(() => {
    if (isCompleted) {
      return 'All words transformed!';
    }
    return coreSnapshot?.instruction ?? '';
  }, [coreSnapshot?.instruction, isCompleted]);

  const handleLetterPress = useCallback((position: number) => {
    coreRef.current?.handleLetterPress(position);
  }, []);

  const handleVariantPress = useCallback(
    (item: VariantPickerItem, source: VariantSourceLayout) => {
      coreRef.current?.handleVariantPress(item, source);
    },
    [],
  );

  return {
    isCompleted,
    transitioning: false,
    insertAnimation: coreSnapshot?.insertAnimation ?? null,
    sequence,
    operation: coreSnapshot?.operation ?? null,
    mode: coreSnapshot?.mode ?? null,
    letters: coreSnapshot?.letters ?? [],
    variantPickerItems: (coreSnapshot?.variantPickerItems ?? []) as VariantPickerItem[],
    pickerHiddenItemIds: coreSnapshot?.pickerHiddenItemIds ?? new Set(),
    wrongItemId: coreSnapshot?.wrongItemId ?? null,
    poppedPickerItemIds: coreSnapshot?.poppedPickerItemIds,
    instruction,
    displaySlots: currentRound?.displaySlots ?? [],
    solvedCount: roundPos,
    totalCount: roundOrder.length,
    handleLetterPress,
    handleVariantPress,
  };
}
