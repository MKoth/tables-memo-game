import type { ScheduleTimer } from '../../wordTransformation/domain/coreTypes';
import {
  ROUND_ADVANCE_DELAY_MS,
  ROUND_HOLD_DURATION_MS,
} from './roundResolutionTiming';

export type VariantSelectionRoundPhase =
  | 'enter'
  | 'transform'
  | 'resolve'
  | 'hold'
  | 'exit'
  | 'advance';

export type VariantSelectionRoundControllerSnapshot = {
  phase: VariantSelectionRoundPhase;
  roundPos: number;
  isSessionComplete: boolean;
};

export type VariantSelectionRoundControllerConfig = {
  roundCount: number;
  scheduleTimer: ScheduleTimer;
  holdDurationMs?: number;
  onPhaseChange?: () => void;
  onSessionComplete?: () => void;
};

export type VariantSelectionRoundController = {
  getSnapshot: () => VariantSelectionRoundControllerSnapshot;
  notifyRowEnterComplete: () => void;
  notifyCorrectSelection: () => void;
  notifyResolveComplete: () => void;
  notifyExitComplete: () => void;
  dispose: () => void;
};

export function createVariantSelectionRoundController({
  roundCount,
  scheduleTimer,
  holdDurationMs = ROUND_HOLD_DURATION_MS,
  onPhaseChange,
  onSessionComplete,
}: VariantSelectionRoundControllerConfig): VariantSelectionRoundController {
  let phase: VariantSelectionRoundPhase = 'enter';
  let roundPos = 0;
  let isSessionComplete = false;
  const cancelTimers: Array<() => void> = [];

  const emitPhaseChange = () => {
    onPhaseChange?.();
  };

  const setPhase = (nextPhase: VariantSelectionRoundPhase) => {
    phase = nextPhase;
    emitPhaseChange();
  };

  const getSnapshot = (): VariantSelectionRoundControllerSnapshot => ({
    phase,
    roundPos,
    isSessionComplete,
  });

  const scheduleHold = () => {
    const cancel = scheduleTimer(() => {
      setPhase('exit');
    }, holdDurationMs);
    cancelTimers.push(cancel);
  };

  const beginNextRound = () => {
    roundPos += 1;

    if (roundPos >= roundCount) {
      isSessionComplete = true;
      onSessionComplete?.();
      return;
    }

    const cancel = scheduleTimer(() => {
      setPhase('enter');
    }, ROUND_ADVANCE_DELAY_MS);
    cancelTimers.push(cancel);
  };

  return {
    getSnapshot,

    notifyRowEnterComplete() {
      if (phase !== 'enter') return;
      setPhase('transform');
    },

    notifyCorrectSelection() {
      if (phase !== 'transform') return;
      setPhase('resolve');
    },

    notifyResolveComplete() {
      if (phase !== 'resolve') return;
      setPhase('hold');
      scheduleHold();
    },

    notifyExitComplete() {
      if (phase !== 'exit') return;
      setPhase('advance');
      beginNextRound();
    },

    dispose() {
      cancelTimers.forEach(cancel => cancel());
      cancelTimers.length = 0;
    },
  };
}
