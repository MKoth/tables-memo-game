import { useCallback, useEffect, useReducer, useRef, useState, type MutableRefObject } from 'react';
import type { ZoneRect } from '../layout/computeExerciseLayout';
import { computeLetterLayout } from '../layout/exerciseLayout';
import {
  createWordTransformationCore,
  type VariantPickerPressItem,
  type VariantSourceLayout,
  type WordOperationSequence,
  type WordTransformationCoreSnapshot,
} from '../../UnderseaTheme/wordTransformation/domain';

export type UseWordTransformationCoreBridgeParams = {
  koiRect: ZoneRect;
  sequence: WordOperationSequence | null;
  sequenceKey: string | number;
  playPop?: () => void;
  playInflate?: () => void;
  playWrong?: () => void;
  onSequenceComplete: (sequence: WordOperationSequence, finalWord: string) => void;
  skipSequenceLoadRef?: MutableRefObject<boolean>;
};

export type UseWordTransformationCoreBridgeResult = {
  coreSnapshot: WordTransformationCoreSnapshot | null;
  handleLetterPress: (position: number) => void;
  handleVariantPress: (item: VariantPickerPressItem, source: VariantSourceLayout) => void;
  loadSequence: (sequence: WordOperationSequence, sequenceKey: string | number) => void;
};

export function useWordTransformationCoreBridge({
  koiRect,
  sequence,
  sequenceKey,
  playPop,
  playInflate,
  playWrong,
  onSequenceComplete,
  skipSequenceLoadRef,
}: UseWordTransformationCoreBridgeParams): UseWordTransformationCoreBridgeResult {
  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [coreSnapshot, setCoreSnapshot] = useState<WordTransformationCoreSnapshot | null>(null);

  const coreRef = useRef<ReturnType<typeof createWordTransformationCore> | null>(null);
  const koiRectRef = useRef(koiRect);
  koiRectRef.current = koiRect;

  const playPopRef = useRef(playPop);
  const playInflateRef = useRef(playInflate);
  const playWrongRef = useRef(playWrong);
  playPopRef.current = playPop;
  playInflateRef.current = playInflate;
  playWrongRef.current = playWrong;

  const onSequenceCompleteRef = useRef(onSequenceComplete);
  onSequenceCompleteRef.current = onSequenceComplete;

  const syncCoreSnapshot = useCallback(() => {
    setCoreSnapshot(coreRef.current?.getSnapshot() ?? null);
    bumpRender();
  }, []);

  useEffect(() => {
    const core = createWordTransformationCore({
      getLetterLayout: (wordLength) =>
        computeLetterLayout(koiRectRef.current, wordLength),
      scheduleTimer: (fn, delayMs) => {
        const id = setTimeout(fn, delayMs);
        return () => clearTimeout(id);
      },
      onSequenceComplete: (completedSequence, finalWord) => {
        onSequenceCompleteRef.current(completedSequence, finalWord);
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

  const loadSequence = useCallback(
    (nextSequence: WordOperationSequence, nextSequenceKey: string | number) => {
      coreRef.current?.loadSequence(nextSequence, nextSequenceKey);
      syncCoreSnapshot();
    },
    [syncCoreSnapshot],
  );

  useEffect(() => {
    if (sequence == null || coreRef.current == null) {
      return;
    }
    if (skipSequenceLoadRef?.current) {
      skipSequenceLoadRef.current = false;
      return;
    }
    coreRef.current.loadSequence(sequence, sequenceKey);
    syncCoreSnapshot();
  }, [sequence, sequenceKey, skipSequenceLoadRef, syncCoreSnapshot]);

  const handleLetterPress = useCallback((position: number) => {
    coreRef.current?.handleLetterPress(position);
  }, []);

  const handleVariantPress = useCallback(
    (item: VariantPickerPressItem, source: VariantSourceLayout) => {
      coreRef.current?.handleVariantPress(item, source);
    },
    [],
  );

  return {
    coreSnapshot,
    handleLetterPress,
    handleVariantPress,
    loadSequence,
  };
}
