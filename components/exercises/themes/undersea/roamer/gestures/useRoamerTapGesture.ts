import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { findRoamerIndexAtTap } from './roamerTapWorklets';

const TAP_MAX_DISTANCE_PX = 10;

type UseRoamerTapGestureParams = {
  sharedPositions: SharedValue<number[]>;
  roamerCount: number;
  hitRadius: number;
  eliminatedSv: SharedValue<number[]>;
  swimZoneLeft: number;
  swimZoneTop: number;
  onFishSelect: (fishIndex: number, originX: number, originY: number) => void;
};

export function useRoamerTapGesture({
  sharedPositions,
  roamerCount,
  hitRadius,
  eliminatedSv,
  swimZoneLeft,
  swimZoneTop,
  onFishSelect,
}: UseRoamerTapGestureParams) {
  return useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: (e) => {
      'worklet';
      const positions = sharedPositions.value;
      const tapX = e.x + swimZoneLeft;
      const tapY = e.y + swimZoneTop;
      const hitIdx = findRoamerIndexAtTap(
        tapX,
        tapY,
        positions,
        roamerCount,
        hitRadius,
        eliminatedSv.value,
      );
      if (hitIdx < 0) {
        return;
      }
      scheduleOnRN(
        onFishSelect,
        hitIdx,
        positions[hitIdx * 2] ?? 0,
        positions[hitIdx * 2 + 1] ?? 0,
      );
    },
  });
}
