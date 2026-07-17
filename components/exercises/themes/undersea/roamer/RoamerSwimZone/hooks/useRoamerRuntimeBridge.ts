import { useLayoutEffect, useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useExerciseRuntime } from '../../../../../core';
import type { BubbleSelection } from '../types';

type UseRoamerRuntimeBridgeParams = {
  selection: BubbleSelection | null;
  phase: SharedValue<number>;
  escapeOverlayActive: boolean;
  handleMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
  bubbleOverlay: React.ReactNode;
  sim: {
    runtimeEntries: { runtime: { x: SharedValue<number>; y: SharedValue<number> } }[];
    hitRadius: number;
  };
  eliminatedRoamerSv: SharedValue<number[]>;
};

export function useRoamerRuntimeBridge({
  selection,
  phase,
  escapeOverlayActive,
  handleMatchSuccess,
  bubbleOverlay,
  sim,
  eliminatedRoamerSv,
}: UseRoamerRuntimeBridgeParams) {
  const { publishCaptureBridge, publishRoamerBridge } = useExerciseRuntime();
  const bubbleOverlayRef = useRef(bubbleOverlay);
  bubbleOverlayRef.current = bubbleOverlay;

  useLayoutEffect(() => {
    publishCaptureBridge(
      selection != null
        ? {
            capturedWord: selection.word,
            orbPhase: phase,
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
      runtimePositions: sim.runtimeEntries.map(entry => ({
        x: entry.runtime.x,
        y: entry.runtime.y,
      })),
      roamerCount: sim.runtimeEntries.length,
      hitRadius: sim.hitRadius,
      eliminatedRoamerSv,
    });
  }, [eliminatedRoamerSv, publishRoamerBridge, sim.hitRadius, sim.runtimeEntries]);
}
