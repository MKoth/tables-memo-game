import type { ScheduleTimer } from '../../../wordTransformation/domain/coreTypes';
import {
  ROUND_ADVANCE_DELAY_MS,
  ROUND_HOLD_DURATION_MS,
} from './roundResolutionTiming';

export type TranslationChoiceRoundPhase =
  | 'enter'
  | 'transform'
  | 'resolve'
  | 'reveal'
  | 'hold'
  | 'exit'
  | 'advance';

export type TranslationChoiceRoundControllerSnapshot = {
  phase: TranslationChoiceRoundPhase;
  roundPos: number;
  isSessionComplete: boolean;
};

export type TranslationChoiceRoundControllerConfig = {
  roundCount: number;
  scheduleTimer: ScheduleTimer;
  holdDurationMs?: number;
  onPhaseChange?: () => void;
  onSessionComplete?: () => void;
};

export type TranslationChoiceRoundController = {
  getSnapshot: () => TranslationChoiceRoundControllerSnapshot;
  notifyEnterComplete: () => void;
  notifyCorrectSelection: () => void;
  notifyResolveComplete: () => void;
  notifyRevealComplete: () => void;
  notifyExitComplete: () => void;
  dispose: () => void;
};

export function createTranslationChoiceRoundController({
  roundCount,
  scheduleTimer,
  holdDurationMs = ROUND_HOLD_DURATION_MS,
  onPhaseChange,
  onSessionComplete,
}: TranslationChoiceRoundControllerConfig): TranslationChoiceRoundController {
  let phase: TranslationChoiceRoundPhase = 'enter';
  let roundPos = 0;
  let isSessionComplete = false;
  const cancelTimers: Array<() => void> = [];

  const emitPhaseChange = () => {
    onPhaseChange?.();
  };

  const setPhase = (nextPhase: TranslationChoiceRoundPhase) => {
    phase = nextPhase;
    emitPhaseChange();
  };

  const getSnapshot = (): TranslationChoiceRoundControllerSnapshot => ({
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

    notifyEnterComplete() {
      if (phase !== 'enter') return;
      setPhase('transform');
    },

    notifyCorrectSelection() {
      if (phase !== 'transform') return;
      setPhase('resolve');
    },

    notifyResolveComplete() {
      if (phase !== 'resolve') return;
      setPhase('reveal');
    },

    notifyRevealComplete() {
      if (phase !== 'reveal') return;
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
