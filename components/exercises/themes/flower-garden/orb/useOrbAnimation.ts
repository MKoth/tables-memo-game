import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  ORB_BURST_DURATION_MS,
  ORB_ENTER_DURATION_MS,
} from './orbAnimPresets';
import { computeOrbAnimState } from './orbAnimWorklets';
import {
  OrbPhase,
  type OrbAnimationConfig,
  type PetalRingConfig,
  type PetalSpawnConfig,
  type UseOrbAnimationResult,
} from './orbAnimTypes';

export function useOrbAnimation(
  config: OrbAnimationConfig,
  rings: ReadonlyArray<PetalRingConfig>,
  petals: ReadonlyArray<PetalSpawnConfig>,
  onDismiss: () => void,
  enabled = true,
): UseOrbAnimationResult {
  const enterProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const idleElapsedMs = useSharedValue(0);
  const burstIdleTimeMs = useSharedValue(0);
  const phase = useSharedValue<number>(enabled ? OrbPhase.Enter : OrbPhase.None);
  const configSv = useSharedValue(config);
  const lastFrameMs = useRef<number | null>(null);

  useLayoutEffect(() => {
    configSv.value = config;
  }, [config, configSv]);

  useFrameCallback(frameInfo => {
    const phaseNow = phase.value;
    if (phaseNow !== OrbPhase.Idle) {
      lastFrameMs.current = null;
      return;
    }
    const currentMs = frameInfo.timestamp;
    if (lastFrameMs.current == null) {
      lastFrameMs.current = currentMs;
      return;
    }
    const delta = currentMs - lastFrameMs.current;
    lastFrameMs.current = currentMs;
    if (delta > 0) {
      idleElapsedMs.value = idleElapsedMs.value + delta;
    }
  }, true);

  const anim = useDerivedValue(() =>
    computeOrbAnimState(
      phase.value,
      enterProgress.value,
      burstProgress.value,
      phase.value === OrbPhase.Burst ? burstIdleTimeMs.value : idleElapsedMs.value,
      configSv.value,
      rings,
      petals,
    ),
  );

  useEffect(() => {
    cancelAnimation(enterProgress);
    cancelAnimation(burstProgress);

    if (!enabled) {
      enterProgress.value = 0;
      burstProgress.value = 0;
      idleElapsedMs.value = 0;
      burstIdleTimeMs.value = 0;
      lastFrameMs.current = null;
      phase.value = OrbPhase.None;
      return;
    }

    enterProgress.value = 0;
    burstProgress.value = 0;
    idleElapsedMs.value = 0;
    lastFrameMs.current = null;
    phase.value = OrbPhase.Enter;

    enterProgress.value = withTiming(
      1,
      { duration: ORB_ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) },
      finished => {
        'worklet';
        if (finished) {
          idleElapsedMs.value = 0;
          lastFrameMs.current = null;
          phase.value = OrbPhase.Idle;
        }
      },
    );

    return () => {
      cancelAnimation(enterProgress);
      cancelAnimation(burstProgress);
    };
  }, [enabled, enterProgress, burstProgress, idleElapsedMs, phase, burstIdleTimeMs]);

  const startBurst = useCallback(() => {
    if (phase.value !== OrbPhase.Idle) {
      return;
    }
    burstIdleTimeMs.value = idleElapsedMs.value;
    phase.value = OrbPhase.Burst;
    burstProgress.value = 0;
    burstProgress.value = withTiming(
      1,
      { duration: ORB_BURST_DURATION_MS, easing: Easing.out(Easing.cubic) },
      finished => {
        'worklet';
        if (finished) {
          scheduleOnRN(onDismiss);
        }
      },
    );
  }, [burstIdleTimeMs, burstProgress, idleElapsedMs, onDismiss, phase]);

  return { anim, phase, startBurst };
}

export {
  OrbPhase,
  type OrbAnimState,
  type OrbAnimationConfig,
  type PetalAnimState,
  type PetalRingConfig,
  type PetalSpawnConfig,
  type UseOrbAnimationResult,
} from './orbAnimTypes';
