import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  RoamerCaptureBridge,
  RoamerSimBridge,
  WordSpriteLayoutBridge,
} from '../types/bridgeTypes';
import { useExerciseStore } from '../store/createExerciseStore';

type ExerciseRuntimeContextValue = {
  captureBridge: RoamerCaptureBridge | null;
  roamerBridge: RoamerSimBridge | null;
  wordSpriteBridge: WordSpriteLayoutBridge | null;
  publishCaptureBridge: (bridge: RoamerCaptureBridge | null) => void;
  publishRoamerBridge: (bridge: RoamerSimBridge | null) => void;
  publishWordSpriteBridge: (bridge: WordSpriteLayoutBridge | null) => void;
  onWordSpriteMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
};

const ExerciseRuntimeContext =
  createContext<ExerciseRuntimeContextValue | null>(null);

export function ExerciseRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [captureBridge, setCaptureBridge] = useState<RoamerCaptureBridge | null>(null);
  const [roamerBridge, setRoamerBridge] = useState<RoamerSimBridge | null>(null);
  const [wordSpriteBridge, setWordSpriteBridge] = useState<WordSpriteLayoutBridge | null>(null);
  const captureBridgeRef = useRef<RoamerCaptureBridge | null>(null);
  const setHelpVisible = useExerciseStore((state) => state.setHelpVisible);

  const publishCaptureBridge = useCallback((bridge: RoamerCaptureBridge | null) => {
    setCaptureBridge((prev) => {
      if (bridge == null) {
        captureBridgeRef.current = null;
        return null;
      }

      const next =
        prev != null &&
        prev.capturedWord === bridge.capturedWord &&
        prev.overlay != null
          ? { ...bridge, overlay: prev.overlay }
          : bridge;
      captureBridgeRef.current = next;
      return next;
    });
  }, []);

  const publishRoamerBridge = useCallback((bridge: RoamerSimBridge | null) => {
    setRoamerBridge(bridge);
  }, []);

  const publishWordSpriteBridge = useCallback((bridge: WordSpriteLayoutBridge | null) => {
    setWordSpriteBridge(bridge);
  }, []);

  const onWordSpriteMatchSuccess = useCallback(
    (targetX: number, targetY: number, hitIdx: number) => {
      setHelpVisible(false);
      captureBridgeRef.current?.onMatchSuccess?.(targetX, targetY, hitIdx);
    },
    [setHelpVisible],
  );

  const value = useMemo(
    () => ({
      captureBridge,
      roamerBridge,
      wordSpriteBridge,
      publishCaptureBridge,
      publishRoamerBridge,
      publishWordSpriteBridge,
      onWordSpriteMatchSuccess,
    }),
    [
      captureBridge,
      wordSpriteBridge,
      roamerBridge,
      onWordSpriteMatchSuccess,
      publishCaptureBridge,
      publishWordSpriteBridge,
      publishRoamerBridge,
    ],
  );

  return (
    <ExerciseRuntimeContext.Provider value={value}>
      {children}
    </ExerciseRuntimeContext.Provider>
  );
}

export function useExerciseRuntime(): ExerciseRuntimeContextValue {
  const runtime = useContext(ExerciseRuntimeContext);
  if (runtime == null) {
    throw new Error(
      'useExerciseRuntime must be used within ExerciseRuntimeProvider',
    );
  }
  return runtime;
}
