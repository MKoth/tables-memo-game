import { scheduleOnRN } from 'react-native-worklets';
import {
  KOI_BASE_SPEED_MAX,
  KOI_BASE_SPEED_MIN,
  KOI_SPLASH_FAST_MIN_NORM,
  KOI_SPLASH_MIN_DELTA_NORM,
  KOI_SPLASH_SLOW_MAX_NORM,
} from '../config/koiSimConfig';
import type { FishRuntime } from './types';
import { pickRandomBaseSpeed } from './fishSimCommon';

export function shouldTriggerSpeedSplash(prev: number, next: number): boolean {
  'worklet';
  if (next <= prev) {
    return false;
  }
  const range = KOI_BASE_SPEED_MAX - KOI_BASE_SPEED_MIN;
  const prevNorm = (prev - KOI_BASE_SPEED_MIN) / range;
  const nextNorm = (next - KOI_BASE_SPEED_MIN) / range;
  return (
    prevNorm <= KOI_SPLASH_SLOW_MAX_NORM &&
    nextNorm >= KOI_SPLASH_FAST_MIN_NORM &&
    nextNorm - prevNorm >= KOI_SPLASH_MIN_DELTA_NORM
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
