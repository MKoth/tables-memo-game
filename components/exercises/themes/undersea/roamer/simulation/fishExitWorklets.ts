import { ROAMER_EXIT_COMPLETE_BODY_RATIO } from '../config/roamerSimConfig';
import type { FishRuntime } from './types';

export function isFishEliminated(eliminated: number[], fishIndex: number): boolean {
  'worklet';
  for (let i = 0; i < eliminated.length; i++) {
    if (eliminated[i] === fishIndex) {
      return true;
    }
  }
  return false;
}

export function fishCrossedExitDismiss(
  fish: FishRuntime,
  exitEdge: number,
  screenW: number,
  screenH: number,
): boolean {
  'worklet';
  if (exitEdge === 0) {
    return fish.y.value < 0;
  }
  if (exitEdge === 1) {
    return fish.y.value > screenH;
  }
  if (exitEdge === 2) {
    return fish.x.value < 0;
  }
  return fish.x.value > screenW;
}

export function fishCrossedExitComplete(
  fish: FishRuntime,
  exitEdge: number,
  fishBodyInset: number,
  screenW: number,
  screenH: number,
): boolean {
  'worklet';
  const threshold = fishBodyInset * ROAMER_EXIT_COMPLETE_BODY_RATIO;
  if (exitEdge === 0) {
    return fish.y.value + threshold < 0;
  }
  if (exitEdge === 1) {
    return fish.y.value - threshold > screenH;
  }
  if (exitEdge === 2) {
    return fish.x.value + threshold < 0;
  }
  return fish.x.value - threshold > screenW;
}
