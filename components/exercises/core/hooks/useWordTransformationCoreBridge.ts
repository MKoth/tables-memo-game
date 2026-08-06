import { useCallback, useEffect, useReducer, useRef, useState, type MutableRefObject } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { ZoneRect } from '../layout/computeExerciseLayout';
import { computeLetterLayout } from '../layout/exerciseLayout';
import {
  createWordTransformationCore,
  type VariantPickerPressItem,
  type VariantSourceLayout,
  type WordOperationSequence,
  type WordTransformationCoreSnapshot,
} from '../../wordTransformation/domain';
import type { WordTransformationSceneState } from '../../wordTransformation/scene/sceneStateTypes';

export type UseWordTransformationCoreBridgeParams = {
  roamerRect: ZoneRect;
  sequence: WordOperationSequence | null;
  sequenceKey: string | number;
  playPop?: () => void;
  playInflate?: () => void;
  playWrong?: () => void;
  onSequenceComplete: (sequence: WordOperationSequence, finalWord: string) => void;
  skipSequenceLoadRef?: MutableRefObject<boolean>;
  /**
   * When provided, every core notify is published into this shared value
   * (theme scene state) instead of re-rendering React on each press. React
   * state then only syncs on op/word boundaries.
   */
  sceneStateSv?: SharedValue<WordTransformationSceneState>;
  /** Receives the full snapshot on every notify (used to derive the scene). */
  publishSceneState?: (snapshot: WordTransformationCoreSnapshot) => void;
};

export type UseWordTransformationCoreBridgeResult = {
  coreSnapshot: WordTransformationCoreSnapshot | null;
  /** Raw latest snapshot — updated on every notify regardless of React sync. */
  latestSnapshotRef: MutableRefObject<WordTransformationCoreSnapshot | null>;
  handleLetterPress: (position: number) => void;
  handleVariantPress: (item: VariantPickerPressItem, source: VariantSourceLayout) => void;
  loadSequence: (sequence: WordOperationSequence, sequenceKey: string | number) => void;
};

export function useWordTransformationCoreBridge({
  roamerRect,
  sequence,
  sequenceKey,
  playPop,
  playInflate,
  playWrong,
  onSequenceComplete,
  skipSequenceLoadRef,
  sceneStateSv,
  publishSceneState,
}: UseWordTransformationCoreBridgeParams): UseWordTransformationCoreBridgeResult {
  const [, bumpRender] = useReducer((value: number) => value + 1, 0);
  const [coreSnapshot, setCoreSnapshot] = useState<WordTransformationCoreSnapshot | null>(null);

  const coreRef = useRef<ReturnType<typeof createWordTransformationCore> | null>(null);
  const latestSnapshotRef = useRef<WordTransformationCoreSnapshot | null>(null);
  const roamerRectRef = useRef(roamerRect);
  roamerRectRef.current = roamerRect;

  const playPopRef = useRef(playPop);
  const playInflateRef = useRef(playInflate);
  const playWrongRef = useRef(playWrong);
  playPopRef.current = playPop;
  playInflateRef.current = playInflate;
  playWrongRef.current = playWrong;

  const onSequenceCompleteRef = useRef(onSequenceComplete);
  onSequenceCompleteRef.current = onSequenceComplete;

  const sceneStateSvRef = useRef(sceneStateSv);
  sceneStateSvRef.current = sceneStateSv;
  const publishSceneStateRef = useRef(publishSceneState);
  publishSceneStateRef.current = publishSceneState;

  const lastSyncSequenceRef = useRef<WordOperationSequence | null>(null);
  const lastSyncSignatureRef = useRef<string | null>(null);

  const syncCoreSnapshot = useCallback(() => {
    const snapshot = coreRef.current?.getSnapshot() ?? null;
    latestSnapshotRef.current = snapshot;
    if (snapshot == null) {
      return;
    }
    publishSceneStateRef.current?.(snapshot);
    if (sceneStateSvRef.current == null) {
      setCoreSnapshot(snapshot);
      bumpRender();
      return;
    }
    const sequenceChanged = snapshot.sequence !== lastSyncSequenceRef.current;
    const signature = `${snapshot.opIndex}|${snapshot.currentWord}|${snapshot.instruction}`;
    const shouldSync =
      sequenceChanged || signature !== lastSyncSignatureRef.current;
    lastSyncSequenceRef.current = snapshot.sequence;
    lastSyncSignatureRef.current = signature;
    if (shouldSync) {
      setCoreSnapshot(snapshot);
      bumpRender();
    }
  }, []);

  useEffect(() => {
    const core = createWordTransformationCore({
      getLetterLayout: (wordLength) =>
        computeLetterLayout(roamerRectRef.current, wordLength),
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
    latestSnapshotRef,
    handleLetterPress,
    handleVariantPress,
    loadSequence,
  };
}
