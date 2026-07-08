import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { TableData } from '../../../../../data/tableData';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';
import {
  blankSlotCenter,
  computeLetterLayout,
} from '../../core/layout/underseaExerciseLayout';
import type { RoundResolutionBubbleState } from '../components/TransformationRoundResolutionBubble';
import type { VariantPickerItem } from '../../wordTransformation/components/TransformationVariantPicker';
import { WORD_LETTER_ENTER_STAGGER_MS } from '../../wordTransformation/insertAnimationTiming';
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
  createSentenceRoundController,
  createSentenceTransformationExercise,
  displaySlotsWithSolvedWord,
  findBlankSlotIndex,
  shuffleIndices,
  ROUND_RESOLVE_FLY_DURATION_MS,
  type SentencePromptDisplaySlot,
  type SentenceRoundControllerSnapshot,
  type SentenceRoundPhase,
  type SentenceTransformationRound,
} from '../domain';

export type SentenceBubbleEnterState = {
  revealOrder: readonly number[];
  revealedPositions: ReadonlySet<number>;
};

export type SentenceTransformationGame = {
  isCompleted: boolean;
  transitioning: boolean;
  roundPhase: SentenceRoundPhase;
  exitEdge: SentenceRoundControllerSnapshot['exitEdge'];
  blankSlotIndex: number;
  blankExiting: boolean;
  poppingSlotIndex: number | null;
  mergeWord: string | null;
  insertAnimation: InsertAnimationState | null;
  resolutionBubble: RoundResolutionBubbleState | null;
  bubbleEnter: SentenceBubbleEnterState | null;
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
  handleRowEnterComplete: () => void;
  handleMergeComplete: () => void;
  handleResolveComplete: () => void;
  handlePopComplete: () => void;
  handleRowExitComplete: () => void;
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
  jellyRect: ZoneRect;
  playPop?: () => void;
  playInflate?: () => void;
  playWrong?: () => void;
  playSuccess?: () => void;
};

export function useSentenceTransformationGame({
  table,
  koiRect,
  jellyRect,
  playPop,
  playInflate,
  playWrong,
  playSuccess,
}: UseSentenceTransformationGameParams): SentenceTransformationGame {
  const exercise = useMemo(
    () => createSentenceTransformationExercise(table),
    [table],
  );

  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [roundSnapshot, setRoundSnapshot] = useState<SentenceRoundControllerSnapshot>(() => ({
    phase: 'enter',
    roundPos: 0,
    exitEdge: 'right',
    isSessionComplete: false,
    solvedWord: null,
    blankFilled: false,
  }));
  const [coreSnapshot, setCoreSnapshot] = useState<WordTransformationCoreSnapshot | null>(null);
  const [bubbleEnter, setBubbleEnter] = useState<SentenceBubbleEnterState | null>(null);
  const [resolutionBubble, setResolutionBubble] = useState<RoundResolutionBubbleState | null>(
    null,
  );

  const coreRef = useRef<ReturnType<typeof createWordTransformationCore> | null>(null);
  const roundRef = useRef<ReturnType<typeof createSentenceRoundController> | null>(null);
  const koiRectRef = useRef(koiRect);
  const jellyRectRef = useRef(jellyRect);
  koiRectRef.current = koiRect;
  jellyRectRef.current = jellyRect;

  const playPopRef = useRef(playPop);
  const playInflateRef = useRef(playInflate);
  const playWrongRef = useRef(playWrong);
  const playSuccessRef = useRef(playSuccess);
  playPopRef.current = playPop;
  playInflateRef.current = playInflate;
  playWrongRef.current = playWrong;
  playSuccessRef.current = playSuccess;

  const syncRoundSnapshot = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot != null) {
      setRoundSnapshot(snapshot);
    }
    bumpRender();
  }, []);

  const syncCoreSnapshot = useCallback(() => {
    setCoreSnapshot(coreRef.current?.getSnapshot() ?? null);
    bumpRender();
  }, []);

  const { roundOrder, rounds } = exercise;
  const isCompleted = roundSnapshot.isSessionComplete;
  const currentRoundIndex =
    isCompleted || roundSnapshot.roundPos >= roundOrder.length
      ? -1
      : roundOrder[roundSnapshot.roundPos] ?? -1;
  const currentRound = currentRoundIndex >= 0 ? rounds[currentRoundIndex] ?? null : null;
  const sequence = useMemo(
    () => (currentRound == null ? null : roundToSequence(table, currentRound)),
    [currentRound, table],
  );

  const blankSlotIndex = useMemo(
    () => findBlankSlotIndex(currentRound?.displaySlots ?? []),
    [currentRound?.displaySlots],
  );

  const displaySlots = useMemo(() => {
    const baseSlots = currentRound?.displaySlots ?? [];
    if (!roundSnapshot.blankFilled || roundSnapshot.solvedWord == null || blankSlotIndex < 0) {
      return baseSlots;
    }
    return displaySlotsWithSolvedWord(
      baseSlots,
      blankSlotIndex,
      roundSnapshot.solvedWord,
    );
  }, [blankSlotIndex, currentRound?.displaySlots, roundSnapshot.blankFilled, roundSnapshot.solvedWord]);

  const configureEnterPhase = useCallback((baseWord: string) => {
    roundRef.current?.configureRound({ wordLength: baseWord.length });
    setBubbleEnter(null);
    setResolutionBubble(null);
  }, []);

  const handleRoundPhaseChangeRef = useRef<() => void>(() => {});

  const handleRoundPhaseChange = useCallback(() => {
    const snapshot = roundRef.current?.getSnapshot();
    if (snapshot == null) {
      return;
    }

    syncRoundSnapshot();

    const roundIndex = roundOrder[snapshot.roundPos] ?? -1;
    const roundForSnapshot =
      roundIndex >= 0 ? rounds[roundIndex] ?? null : null;

    if (snapshot.phase === 'enter') {
      const baseWord = roundForSnapshot?.infinitive ?? '';
      if (baseWord.length > 0) {
        configureEnterPhase(baseWord);
      }
      return;
    }

    if (snapshot.phase === 'transform') {
      setBubbleEnter(null);
      return;
    }

    if (snapshot.phase === 'resolve' && snapshot.solvedWord != null) {
      const solvedWord = snapshot.solvedWord;
      const blank = blankSlotCenter(
        roundForSnapshot?.displaySlots ?? [],
        jellyRectRef.current,
      );
      const letterLayout = computeLetterLayout(
        koiRectRef.current,
        solvedWord.length,
      );
      const fromCenterX =
        letterLayout.centers.length > 0
          ? (letterLayout.centers[0]! + letterLayout.centers[letterLayout.centers.length - 1]!) *
            0.5
          : koiRectRef.current.x + koiRectRef.current.w * 0.5;

      if (blank != null) {
        setResolutionBubble({
          word: solvedWord,
          fromCenterX,
          fromCenterY: letterLayout.rowY,
          fromDiameter: letterLayout.diameter,
          toCenterX: blank.x,
          toCenterY: blank.y,
          toDiameter: blank.bellSize * 0.9,
          flyDurationMs: ROUND_RESOLVE_FLY_DURATION_MS,
        });
      }
      return;
    }

    if (snapshot.phase === 'pop') {
      playSuccessRef.current?.();
    }
  }, [configureEnterPhase, roundOrder, rounds, syncRoundSnapshot]);

  handleRoundPhaseChangeRef.current = handleRoundPhaseChange;

  useEffect(() => {
    const round = createSentenceRoundController({
      roundCount: roundOrder.length,
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      onPhaseChange: () => handleRoundPhaseChangeRef.current(),
      onSessionComplete: syncRoundSnapshot,
    });
    roundRef.current = round;

    if (currentRound != null) {
      configureEnterPhase(currentRound.infinitive);
    }

    return () => {
      round.dispose();
      roundRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundOrder.length]);

  useEffect(() => {
    const core = createWordTransformationCore({
      getLetterLayout: (wordLength) =>
        computeLetterLayout(koiRectRef.current, wordLength),
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      onSequenceComplete: (_sequence, finalWord) => {
        roundRef.current?.notifySequenceComplete(finalWord);
        syncRoundSnapshot();
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

  useEffect(() => {
    if (sequence == null || coreRef.current == null) {
      return;
    }
    coreRef.current.loadSequence(sequence, roundSnapshot.roundPos);
    syncCoreSnapshot();
  }, [roundSnapshot.roundPos, sequence, syncCoreSnapshot]);

  const handleRowEnterComplete = useCallback(() => {
    const baseWord = sequence?.baseWord ?? currentRound?.infinitive ?? '';
    const revealOrder = shuffleIndices(baseWord.length);
    if (revealOrder.length === 0) {
      setBubbleEnter(null);
    } else {
      setBubbleEnter({
        revealOrder,
        revealedPositions: new Set(),
      });
    }
    roundRef.current?.notifyRowEnterComplete();
    syncRoundSnapshot();
  }, [currentRound?.infinitive, sequence?.baseWord, syncRoundSnapshot]);

  const handleMergeComplete = useCallback(() => {
    roundRef.current?.notifyMergeComplete();
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  const handleResolveComplete = useCallback(() => {
    setResolutionBubble(null);
    roundRef.current?.notifyResolveComplete();
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  const handlePopComplete = useCallback(() => {
    roundRef.current?.notifyPopComplete();
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  const handleRowExitComplete = useCallback(() => {
    roundRef.current?.notifyExitComplete();
    syncRoundSnapshot();
  }, [syncRoundSnapshot]);

  const roundPhase = roundSnapshot.phase;
  const transitioning = roundPhase !== 'transform';
  const blankExiting = roundPhase === 'resolve';
  const poppingSlotIndex =
    roundPhase === 'pop' && blankSlotIndex >= 0 ? blankSlotIndex : null;
  const mergeWord =
    roundPhase === 'merge' ? roundSnapshot.solvedWord : null;

  const displayWord = sequence?.baseWord ?? coreSnapshot?.currentWord ?? '';

  const letters = useMemo<LetterBubbleModel[]>(() => {
    if (roundPhase === 'merge' || resolutionBubble != null) {
      return [];
    }

    if (roundPhase === 'enter' && bubbleEnter == null) {
      return [];
    }

    if (roundPhase === 'enter' && bubbleEnter != null) {
      return displayWord.split('').map((char, position) => {
        const enterIndex = bubbleEnter.revealOrder.indexOf(position);
        return {
          key: `${roundSnapshot.roundPos}:${position}`,
          char,
          position,
          popped: false,
          wrong: false,
          enterDelayMs:
            enterIndex >= 0 ? enterIndex * WORD_LETTER_ENTER_STAGGER_MS : undefined,
        };
      });
    }

    if (
      roundPhase === 'hold' ||
      roundPhase === 'pop' ||
      roundPhase === 'exit' ||
      roundPhase === 'advance' ||
      isCompleted
    ) {
      return [];
    }

    return coreSnapshot?.letters ?? [];
  }, [
    bubbleEnter,
    coreSnapshot?.letters,
    displayWord,
    isCompleted,
    resolutionBubble,
    roundPhase,
    roundSnapshot.roundPos,
  ]);

  const instruction = useMemo(() => {
    if (isCompleted) {
      return 'All words transformed!';
    }
    if (roundPhase === 'enter' || bubbleEnter != null) {
      return '';
    }
    if (roundPhase !== 'transform') {
      return 'Nice!';
    }
    return coreSnapshot?.instruction ?? '';
  }, [bubbleEnter, coreSnapshot?.instruction, isCompleted, roundPhase]);

  const handleLetterPress = useCallback(
    (position: number) => {
      if (transitioning || bubbleEnter != null) {
        return;
      }
      coreRef.current?.handleLetterPress(position);
    },
    [bubbleEnter, transitioning],
  );

  const handleVariantPress = useCallback(
    (item: VariantPickerItem, source: VariantSourceLayout) => {
      if (transitioning || bubbleEnter != null) {
        return;
      }
      coreRef.current?.handleVariantPress(item, source);
    },
    [bubbleEnter, transitioning],
  );

  return {
    isCompleted,
    transitioning,
    roundPhase,
    exitEdge: roundSnapshot.exitEdge,
    blankSlotIndex,
    blankExiting,
    poppingSlotIndex,
    mergeWord,
    insertAnimation: coreSnapshot?.insertAnimation ?? null,
    resolutionBubble,
    bubbleEnter,
    sequence,
    operation: coreSnapshot?.operation ?? null,
    mode: coreSnapshot?.mode ?? null,
    letters,
    variantPickerItems: (coreSnapshot?.variantPickerItems ?? []) as VariantPickerItem[],
    pickerHiddenItemIds: coreSnapshot?.pickerHiddenItemIds ?? new Set(),
    wrongItemId: coreSnapshot?.wrongItemId ?? null,
    poppedPickerItemIds: coreSnapshot?.poppedPickerItemIds,
    instruction,
    displaySlots,
    solvedCount: roundSnapshot.roundPos,
    totalCount: roundOrder.length,
    handleLetterPress,
    handleVariantPress,
    handleRowEnterComplete,
    handleMergeComplete,
    handleResolveComplete,
    handlePopComplete,
    handleRowExitComplete,
  };
}
