import type { ScheduleTimer } from '../../wordTransformation/domain/coreTypes';
import {
  bubbleEnterDurationMs,
  ROUND_HOLD_DURATION_MS,
} from './roundResolutionTiming';

export type SentenceRoundPhase =
  | 'enter'
  | 'transform'
  | 'merge'
  | 'materialize'
  | 'resolve'
  | 'hold'
  | 'pop'
  | 'exit'
  | 'advance';

export type SentenceRoundControllerSnapshot = {
  phase: SentenceRoundPhase;
  roundPos: number;
  isSessionComplete: boolean;
  solvedWord: string | null;
};

export type SentenceRoundControllerConfig = {
  roundCount: number;
  scheduleTimer: ScheduleTimer;
  holdDurationMs?: number;
  onPhaseChange?: () => void;
  onSessionComplete?: () => void;
};

export type SentenceRoundController = {
  getSnapshot: () => SentenceRoundControllerSnapshot;
  configureRound: (input: { wordLength: number }) => void;
  notifyRowEnterComplete: () => void;
  notifySequenceComplete: (solvedWord: string) => void;
  notifyMergeComplete: () => void;
  notifyMaterializeComplete: () => void;
  notifyResolveComplete: () => void;
  notifyPopComplete: () => void;
  notifyExitComplete: () => void;
  dispose: () => void;
};

export function createSentenceRoundController({
  roundCount,
  scheduleTimer,
  holdDurationMs = ROUND_HOLD_DURATION_MS,
  onPhaseChange,
  onSessionComplete,
}: SentenceRoundControllerConfig): SentenceRoundController {
  let phase: SentenceRoundPhase = 'enter';
  let roundPos = 0;
  let solvedWord: string | null = null;
  let isSessionComplete = false;
  let configuredWordLength = 0;
  let staggerTimerPending = false;
  const cancelTimers: Array<() => void> = [];

  const emitPhaseChange = () => {
    onPhaseChange?.();
  };

  const setPhase = (nextPhase: SentenceRoundPhase) => {
    phase = nextPhase;
    emitPhaseChange();
  };

  const getSnapshot = (): SentenceRoundControllerSnapshot => ({
    phase,
    roundPos,
    isSessionComplete,
    solvedWord,
  });

  const scheduleHold = () => {
    const cancel = scheduleTimer(() => {
      setPhase('pop');
    }, holdDurationMs);
    cancelTimers.push(cancel);
  };

  const scheduleBubbleEnterStagger = () => {
    if (staggerTimerPending) {
      return;
    }

    const delayMs = bubbleEnterDurationMs(configuredWordLength);
    if (delayMs <= 0) {
      setPhase('transform');
      return;
    }

    staggerTimerPending = true;
    const cancel = scheduleTimer(() => {
      staggerTimerPending = false;
      setPhase('transform');
    }, delayMs);
    cancelTimers.push(cancel);
  };

  const beginNextRound = () => {
    roundPos += 1;
    solvedWord = null;

    if (roundPos >= roundCount) {
      isSessionComplete = true;
      onSessionComplete?.();
      return;
    }

    setPhase('enter');
  };

  return {
    getSnapshot,

    configureRound({ wordLength }) {
      configuredWordLength = wordLength;
      staggerTimerPending = false;
    },

    notifyRowEnterComplete() {
      if (phase !== 'enter') {
        return;
      }
      scheduleBubbleEnterStagger();
    },

    notifySequenceComplete(word) {
      if (phase !== 'transform') {
        return;
      }
      solvedWord = word;
      setPhase('merge');
    },

    notifyMergeComplete() {
      if (phase !== 'merge') {
        return;
      }
      setPhase('materialize');
    },

    notifyMaterializeComplete() {
      if (phase !== 'materialize') {
        return;
      }
      setPhase('resolve');
    },

    notifyResolveComplete() {
      if (phase !== 'resolve') {
        return;
      }
      setPhase('hold');
      scheduleHold();
    },

    notifyPopComplete() {
      if (phase !== 'pop') {
        return;
      }
      setPhase('exit');
    },

    notifyExitComplete() {
      if (phase !== 'exit') {
        return;
      }
      setPhase('advance');
      beginNextRound();
    },

    dispose() {
      cancelTimers.forEach((cancel) => cancel());
      cancelTimers.length = 0;
      staggerTimerPending = false;
    },
  };
}
