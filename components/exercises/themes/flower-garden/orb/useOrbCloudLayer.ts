import { useCallback, useEffect, useLayoutEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  Easing,
  runOnUI,
  useAnimatedReaction,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { ORB_CLOUD_GLOBAL_FADE_IN_MS } from './orbCloudPresets';
import { OrbPhase } from './orbAnimTypes';
import type { CloudPatchSlot, OrbCloudLayerConfig } from './orbCloudTypes';
import {
  createEmptyOrbCloudPool,
  staggerOrbCloudPool,
  stepOrbCloudPool,
} from './orbCloudWorklets';

export type UseOrbCloudLayerResult = {
  pool: SharedValue<CloudPatchSlot[]>;
  layerOpacity: SharedValue<number>;
};

export type UseOrbCloudPoolLoopResult = {
  pool: SharedValue<CloudPatchSlot[]>;
  configSv: SharedValue<OrbCloudLayerConfig>;
  pendingSpawns: SharedValue<number>;
};

/**
 * Owns the patch pool and its frame-driven simulation. Consumers attach their
 * own visibility (e.g. a follow transform + the orb's overall opacity).
 */
export function useOrbCloudPoolLoop(
  config: OrbCloudLayerConfig,
): UseOrbCloudPoolLoopResult {
  const pool = useSharedValue<CloudPatchSlot[]>(createEmptyOrbCloudPool(config.patchCount));
  const configSv = useSharedValue(config);
  const pendingSpawns = useSharedValue(0);
  const lastTimestamp = useSharedValue(-1);

  useLayoutEffect(() => {
    configSv.value = config;
  }, [config, configSv]);

  useEffect(() => {
    pool.value = createEmptyOrbCloudPool(configSv.value.patchCount);
    pendingSpawns.value = 0;
    runOnUI(staggerOrbCloudPool)(pool.value, configSv.value.initialDelayMaxMs);
  }, [pool, pendingSpawns, configSv]);

  const onCloudFrame = useCallback(
    (frameInfo: { timestamp: number }) => {
      'worklet';
      if (lastTimestamp.value < 0) {
        lastTimestamp.value = frameInfo.timestamp;
        return;
      }
      const elapsed = frameInfo.timestamp - lastTimestamp.value;
      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimestamp.value = frameInfo.timestamp;

      stepOrbCloudPool(pool.value, configSv.value, dt, pendingSpawns);
      pool.value = pool.value.slice();
    },
    [lastTimestamp, pool, pendingSpawns, configSv],
  );

  const cloudLoop = useFrameCallback(onCloudFrame, true);

  useEffect(() => {
    const syncActive = (state: AppStateStatus) => {
      cloudLoop.setActive(state === 'active');
      if (state !== 'active') {
        lastTimestamp.value = -1;
      }
    };
    syncActive(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncActive);
    return () => subscription.remove();
  }, [cloudLoop, lastTimestamp]);

  return { pool, configSv, pendingSpawns };
}

export function useOrbCloudLayer(
  config: OrbCloudLayerConfig,
  phase: SharedValue<number>,
): UseOrbCloudLayerResult {
  const { pool, configSv, pendingSpawns } = useOrbCloudPoolLoop(config);
  const fadeInT = useSharedValue(0);
  const dismissT = useSharedValue(0);

  useEffect(() => {
    fadeInT.value = 0;
    dismissT.value = 0;
    fadeInT.value = withTiming(1, {
      duration: ORB_CLOUD_GLOBAL_FADE_IN_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [fadeInT, dismissT]);

  useAnimatedReaction(
    () => phase.value,
    (currentPhase, prevPhase) => {
      if (currentPhase === OrbPhase.Burst && prevPhase !== OrbPhase.Burst) {
        const current = configSv.value;
        if (current.dismissing === 1) {
          return;
        }
        configSv.value = { ...current, dismissing: 1 };
        pendingSpawns.value = 0;
        dismissT.value = 0;
        dismissT.value = withTiming(1, {
          duration: current.dismissFadeMs,
          easing: Easing.out(Easing.cubic),
        });
      }
    },
    [phase, configSv, dismissT, pendingSpawns],
  );

  const layerOpacity = useDerivedValue(() => fadeInT.value * (1 - dismissT.value));

  return { pool, layerOpacity };
}
