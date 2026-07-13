import type { ScheduleTimer } from '../../../wordTransformation/domain/coreTypes';
import { ROUND_ADVANCE_DELAY_MS } from './roundResolutionTiming';

export type TranslationSpellingRoundPhase =
  | 'enter'
  | 'transform'
  | 'resolve'
  | 'exit'
  | 'advance';

export type TranslationSpellingRoundControllerSnapshot = {
  phase: TranslationSpellingRoundPhase;
  roundPos: number;
  isSessionComplete: boolean;
};

export type TranslationSpellingRoundControllerConfig = {
  roundCount: number;
  scheduleTimer: ScheduleTimer;
  onPhaseChange?: () => void;
  onSessionComplete?: () => void;
};

export type TranslationSpellingRoundController = {
  getSnapshot: () => TranslationSpellingRoundControllerSnapshot;
  notifyEnterComplete: () => void;
  notifyWordComplete: () => void;
  notifyResolveComplete: () => void;
  notifyExitComplete: () => void;
  dispose: () => void;
};

export function createTranslationSpellingRoundController({
  roundCount,
  scheduleTimer,
  onPhaseChange,
  onSessionComplete,
}: TranslationSpellingRoundControllerConfig): TranslationSpellingRoundController {
  let phase: TranslationSpellingRoundPhase = 'enter';
  let roundPos = 0;
  let isSessionComplete = false;
  const cancelTimers: Array<() => void> = [];

  const emitPhaseChange = () => {
    onPhaseChange?.();
  };

  const setPhase = (nextPhase: TranslationSpellingRoundPhase) => {
    phase = nextPhase;
    emitPhaseChange();
  };

  const getSnapshot = (): TranslationSpellingRoundControllerSnapshot => ({
    phase,
    roundPos,
    isSessionComplete,
  });

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

    notifyWordComplete() {
      if (phase !== 'transform') return;
      setPhase('resolve');
    },

    notifyResolveComplete() {
      if (phase !== 'resolve') return;
      setPhase('exit');
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
