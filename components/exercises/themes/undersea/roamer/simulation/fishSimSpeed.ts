import { scheduleOnRN } from 'react-native-worklets';
import {
  ROAMER_BASE_SPEED_MAX,
  ROAMER_BASE_SPEED_MIN,
  ROAMER_SPLASH_FAST_MIN_NORM,
  ROAMER_SPLASH_MIN_DELTA_NORM,
  ROAMER_SPLASH_SLOW_MAX_NORM,
} from '../config/roamerSimConfig';
import type { FishRuntime } from './types';
import { pickRandomBaseSpeed } from './fishSimCommon';

export function shouldTriggerSpeedSplash(prev: number, next: number): boolean {
  'worklet';
  if (next <= prev) {
    return false;
  }
  const range = ROAMER_BASE_SPEED_MAX - ROAMER_BASE_SPEED_MIN;
  const prevNorm = (prev - ROAMER_BASE_SPEED_MIN) / range;
  const nextNorm = (next - ROAMER_BASE_SPEED_MIN) / range;
  return (
    prevNorm <= ROAMER_SPLASH_SLOW_MAX_NORM &&
    nextNorm >= ROAMER_SPLASH_FAST_MIN_NORM &&
    nextNorm - prevNorm >= ROAMER_SPLASH_MIN_DELTA_NORM
  );
}

export function rollTargetBaseSpeed(fish: FishRuntime, onIncrease?: () => void): void {
  'worklet';
  const prev = fish.targetBaseSpeed.value;
  const next = pickRandomBaseSpeed();
  fish.targetBaseSpeed.value = next;
  if (onIncrease != null && shouldTriggerSpeedSplash(prev, next)) {
    scheduleOnRN(onIncrease);
  }
}
