import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { findRoamerIndexAtTap } from './roamerTapWorklets';

const TAP_MAX_DISTANCE_PX = 10;

type UseFlowerGardenRoamerTapGestureParams = {
  sharedPositions: SharedValue<number[]>;
  roamerCount: number;
  hitRadius: number;
  onRoamerTap: (roamerIndex: number, originX: number, originY: number) => void;
  /** Roamer indices that cannot be tapped (e.g. mid-escape creatures). */
  excludedIndices?: number[];
};

export function useFlowerGardenRoamerTapGesture({
  sharedPositions,
  roamerCount,
  hitRadius,
  onRoamerTap,
  excludedIndices = [],
}: UseFlowerGardenRoamerTapGestureParams) {
  return useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: e => {
      'worklet';
      if (roamerCount <= 0) {
        return;
      }
      const positions = sharedPositions.value;
      const hitIdx = findRoamerIndexAtTap(
        e.x,
        e.y,
        positions,
        roamerCount,
        hitRadius,
      );
      if (hitIdx < 0) {
        return;
      }
      if (excludedIndices.includes(hitIdx)) {
        return;
      }
      scheduleOnRN(
        onRoamerTap,
        hitIdx,
        positions[hitIdx * 2] ?? 0,
        positions[hitIdx * 2 + 1] ?? 0,
      );
    },
  });
}
