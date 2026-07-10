import type { ScheduleTimer } from '../../wordTransformation/domain/coreTypes';

export type VariantSelectionRoundPhase = 'enter' | 'transform';

export type VariantSelectionRoundControllerSnapshot = {
  phase: VariantSelectionRoundPhase;
  roundPos: number;
  isSessionComplete: boolean;
};

export type VariantSelectionRoundControllerConfig = {
  roundCount: number;
  scheduleTimer: ScheduleTimer;
  onPhaseChange?: () => void;
  onSessionComplete?: () => void;
};

export type VariantSelectionRoundController = {
  getSnapshot: () => VariantSelectionRoundControllerSnapshot;
  notifyRowEnterComplete: () => void;
  dispose: () => void;
};

export function createVariantSelectionRoundController({
  roundCount: _roundCount,
  scheduleTimer: _scheduleTimer,
  onPhaseChange,
  onSessionComplete: _onSessionComplete,
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

  return {
    getSnapshot,
    notifyRowEnterComplete() {
      if (phase !== 'enter') return;
      setPhase('transform');
    },
    dispose() {
      cancelTimers.forEach(cancel => cancel());
      cancelTimers.length = 0;
    },
  };
}
