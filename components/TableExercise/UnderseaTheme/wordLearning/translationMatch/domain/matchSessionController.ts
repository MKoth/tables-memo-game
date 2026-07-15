export type MatchSessionPhase = 'idle' | 'select' | 'resolve';

export type MatchSessionControllerSnapshot = {
  phase: MatchSessionPhase;
  capturedFishIndex: number;
  capturedEnglish: string | null;
  matchedIndices: number[];
  allMatched: boolean;
};

export type MatchSessionControllerConfig = {
  pairCount: number;
  onPhaseChange?: () => void;
  onSessionComplete?: () => void;
};

export type MatchSessionController = {
  getSnapshot: () => MatchSessionControllerSnapshot;
  captureFish: (fishIndex: number, english: string) => boolean;
  release: () => void;
  correctMatch: (pairIndex: number) => void;
  wrongMatch: () => void;
  resolveComplete: () => void;
  dispose: () => void;
};

export function createMatchSessionController({
  pairCount,
  onPhaseChange,
  onSessionComplete,
}: MatchSessionControllerConfig): MatchSessionController {
  let phase: MatchSessionPhase = 'idle';
  let capturedFishIndex = -1;
  let capturedEnglish: string | null = null;
  const matchedIndices: number[] = [];
  let sessionCompleteFired = false;

  const emitPhaseChange = () => {
    onPhaseChange?.();
  };

  const setPhase = (nextPhase: MatchSessionPhase) => {
    phase = nextPhase;
    emitPhaseChange();
  };

  const getSnapshot = (): MatchSessionControllerSnapshot => ({
    phase,
    capturedFishIndex,
    capturedEnglish,
    matchedIndices: [...matchedIndices],
    allMatched: matchedIndices.length >= pairCount,
  });

  return {
    getSnapshot,

    captureFish(fishIndex: number, english: string): boolean {
      if (phase !== 'idle') {
        return false;
      }
      capturedFishIndex = fishIndex;
      capturedEnglish = english;
      setPhase('select');
      return true;
    },

    release() {
      if (phase !== 'select') {
        return;
      }
      capturedFishIndex = -1;
      capturedEnglish = null;
      setPhase('idle');
    },

    correctMatch(pairIndex: number) {
      if (phase !== 'select') {
        return;
      }
      if (matchedIndices.includes(pairIndex)) {
        return;
      }
      matchedIndices.push(pairIndex);
      setPhase('resolve');
      if (matchedIndices.length >= pairCount && !sessionCompleteFired) {
        sessionCompleteFired = true;
        onSessionComplete?.();
      }
    },

    wrongMatch() {
      if (phase !== 'select') {
        return;
      }
    },

    resolveComplete() {
      if (phase !== 'resolve') {
        return;
      }
      capturedFishIndex = -1;
      capturedEnglish = null;
      setPhase('idle');
    },

    dispose() {
      phase = 'idle';
      capturedFishIndex = -1;
      capturedEnglish = null;
      matchedIndices.length = 0;
      sessionCompleteFired = false;
    },
  };
}
