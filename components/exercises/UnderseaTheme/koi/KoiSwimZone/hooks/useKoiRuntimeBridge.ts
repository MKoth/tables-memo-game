import { useLayoutEffect, useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useExerciseRuntime } from '../../../../core';
import type { BubbleSelection } from '../types';

type UseKoiRuntimeBridgeParams = {
  selection: BubbleSelection | null;
  phase: SharedValue<number>;
  escapeOverlayActive: boolean;
  handleMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
  bubbleOverlay: React.ReactNode;
  sim: {
    runtimeEntries: { runtime: { x: SharedValue<number>; y: SharedValue<number> } }[];
    hitRadius: number;
  };
  eliminatedFishSv: SharedValue<number[]>;
};

export function useKoiRuntimeBridge({
  selection,
  phase,
  escapeOverlayActive,
  handleMatchSuccess,
  bubbleOverlay,
  sim,
  eliminatedFishSv,
}: UseKoiRuntimeBridgeParams) {
  const { publishCaptureBridge, publishRoamerBridge } = useExerciseRuntime();
  const bubbleOverlayRef = useRef(bubbleOverlay);
  bubbleOverlayRef.current = bubbleOverlay;

  useLayoutEffect(() => {
    publishCaptureBridge(
      selection != null
        ? {
            capturedWord: selection.word,
            bubblePhase: phase,
            onMatchSuccess: handleMatchSuccess,
            overlay: bubbleOverlayRef.current,
            escapeOverlayActive,
          }
        : null,
    );
  }, [
    escapeOverlayActive,
    handleMatchSuccess,
    phase,
    publishCaptureBridge,
    selection,
  ]);

  useLayoutEffect(() => {
    publishRoamerBridge({
      fishRuntimePositions: sim.runtimeEntries.map(entry => ({
        x: entry.runtime.x,
        y: entry.runtime.y,
      })),
      fishCount: sim.runtimeEntries.length,
      hitRadius: sim.hitRadius,
      eliminatedFishSv,
    });
  }, [eliminatedFishSv, publishRoamerBridge, sim.hitRadius, sim.runtimeEntries]);
}
