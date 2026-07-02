import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  JellyfishLayoutBridge,
  KoiCaptureBridge,
  KoiSimBridge,
} from '../types/bridgeTypes';
import { useUnderseaThemeExerciseStore } from '../store/underseaThemeExerciseStore';

type UnderseaThemeRuntimeContextValue = {
  captureBridge: KoiCaptureBridge | null;
  koiBridge: KoiSimBridge | null;
  jellyBridge: JellyfishLayoutBridge | null;
  publishCaptureBridge: (bridge: KoiCaptureBridge | null) => void;
  publishKoiBridge: (bridge: KoiSimBridge | null) => void;
  publishJellyBridge: (bridge: JellyfishLayoutBridge | null) => void;
  onJellyfishMatchSuccess: (targetX: number, targetY: number, hitIdx: number) => void;
};

const UnderseaThemeRuntimeContext =
  createContext<UnderseaThemeRuntimeContextValue | null>(null);

export function UnderseaThemeRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [captureBridge, setCaptureBridge] = useState<KoiCaptureBridge | null>(null);
  const [koiBridge, setKoiBridge] = useState<KoiSimBridge | null>(null);
  const [jellyBridge, setJellyBridge] = useState<JellyfishLayoutBridge | null>(null);
  const captureBridgeRef = useRef<KoiCaptureBridge | null>(null);
  const setHelpVisible = useUnderseaThemeExerciseStore((state) => state.setHelpVisible);

  const publishCaptureBridge = useCallback((bridge: KoiCaptureBridge | null) => {
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

  const publishKoiBridge = useCallback((bridge: KoiSimBridge | null) => {
    setKoiBridge(bridge);
  }, []);

  const publishJellyBridge = useCallback((bridge: JellyfishLayoutBridge | null) => {
    setJellyBridge(bridge);
  }, []);

  const onJellyfishMatchSuccess = useCallback(
    (targetX: number, targetY: number, hitIdx: number) => {
      setHelpVisible(false);
      captureBridgeRef.current?.onMatchSuccess?.(targetX, targetY, hitIdx);
    },
    [setHelpVisible],
  );

  const value = useMemo(
    () => ({
      captureBridge,
      koiBridge,
      jellyBridge,
      publishCaptureBridge,
      publishKoiBridge,
      publishJellyBridge,
      onJellyfishMatchSuccess,
    }),
    [
      captureBridge,
      jellyBridge,
      koiBridge,
      onJellyfishMatchSuccess,
      publishCaptureBridge,
      publishJellyBridge,
      publishKoiBridge,
    ],
  );

  return (
    <UnderseaThemeRuntimeContext.Provider value={value}>
      {children}
    </UnderseaThemeRuntimeContext.Provider>
  );
}

export function useUnderseaThemeRuntime(): UnderseaThemeRuntimeContextValue {
  const runtime = useContext(UnderseaThemeRuntimeContext);
  if (runtime == null) {
    throw new Error(
      'useUnderseaThemeRuntime must be used within UnderseaThemeRuntimeProvider',
    );
  }
  return runtime;
}
