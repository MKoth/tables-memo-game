import type { ScheduleTimer } from '../../wordTransformation/domain/coreTypes';
import { ROUND_HOLD_DURATION_MS, ROUND_ROW_EXIT_EDGE } from './roundResolutionTiming';

export type SentenceRoundExitEdge = typeof ROUND_ROW_EXIT_EDGE | 'left';

export type SentenceRoundPhase =
  | 'enter'
  | 'transform'
  | 'merge'
  | 'resolve'
  | 'hold'
  | 'pop'
  | 'exit'
  | 'advance';

export type SentenceRoundOrchestratorSnapshot = {
  phase: SentenceRoundPhase;
  roundPos: number;
  exitEdge: SentenceRoundExitEdge;
  isSessionComplete: boolean;
  solvedWord: string | null;
  blankFilled: boolean;
};

export type SentenceRoundOrchestratorConfig = {
  roundCount: number;
  scheduleTimer: ScheduleTimer;
  holdDurationMs?: number;
  exitEdge?: SentenceRoundExitEdge;
  onPhaseChange?: () => void;
  onSessionComplete?: () => void;
};

export type SentenceRoundOrchestrator = {
  getSnapshot: () => SentenceRoundOrchestratorSnapshot;
  notifyEnterComplete: () => void;
  notifySequenceComplete: (solvedWord: string) => void;
  notifyMergeComplete: () => void;
  notifyResolveComplete: () => void;
  notifyPopComplete: () => void;
  notifyExitComplete: () => void;
  dispose: () => void;
};

export function createSentenceRoundOrchestrator({
  roundCount,
  scheduleTimer,
  holdDurationMs = ROUND_HOLD_DURATION_MS,
  exitEdge = ROUND_ROW_EXIT_EDGE,
  onPhaseChange,
  onSessionComplete,
}: SentenceRoundOrchestratorConfig): SentenceRoundOrchestrator {
  let phase: SentenceRoundPhase = 'enter';
  let roundPos = 0;
  let solvedWord: string | null = null;
  let blankFilled = false;
  let isSessionComplete = false;
  const cancelTimers: Array<() => void> = [];

  const emitPhaseChange = () => {
    onPhaseChange?.();
  };

  const setPhase = (nextPhase: SentenceRoundPhase) => {
    phase = nextPhase;
    emitPhaseChange();
  };

  const getSnapshot = (): SentenceRoundOrchestratorSnapshot => ({
    phase,
    roundPos,
    exitEdge,
    isSessionComplete,
    solvedWord,
    blankFilled,
  });

  const scheduleHold = () => {
    const cancel = scheduleTimer(() => {
      setPhase('pop');
    }, holdDurationMs);
    cancelTimers.push(cancel);
  };

  const beginNextRound = () => {
    roundPos += 1;
    solvedWord = null;
    blankFilled = false;

    if (roundPos >= roundCount) {
      isSessionComplete = true;
      onSessionComplete?.();
      return;
    }

    setPhase('enter');
  };

  return {
    getSnapshot,

    notifyEnterComplete() {
      if (phase !== 'enter') {
        return;
      }
      setPhase('transform');
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
      setPhase('resolve');
    },

    notifyResolveComplete() {
      if (phase !== 'resolve') {
        return;
      }
      blankFilled = true;
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
    },
  };
}
