import type { SharedValue } from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { findKoiIndexAtTap } from './koiTapWorklets';

const TAP_MAX_DISTANCE_PX = 10;

type UseKoiTapGestureParams = {
  sharedPositions: SharedValue<number[]>;
  koiCount: number;
  hitRadius: number;
  eliminatedSv: SharedValue<number[]>;
  swimZoneLeft: number;
  swimZoneTop: number;
  onFishSelect: (fishIndex: number, originX: number, originY: number) => void;
};

export function useKoiTapGesture({
  sharedPositions,
  koiCount,
  hitRadius,
  eliminatedSv,
  swimZoneLeft,
  swimZoneTop,
  onFishSelect,
}: UseKoiTapGestureParams) {
  return useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: (e) => {
      'worklet';
      const positions = sharedPositions.value;
      const tapX = e.x + swimZoneLeft;
      const tapY = e.y + swimZoneTop;
      const hitIdx = findKoiIndexAtTap(
        tapX,
        tapY,
        positions,
        koiCount,
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
