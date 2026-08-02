import type { SharedValue } from 'react-native-reanimated';
import { FlightState, type RoamerSharedRuntime } from './types';

export function armRoamerExitFlight(
  runtime: RoamerSharedRuntime,
  capturedRoamerIndexSv: SharedValue<number>,
  leg1X: number,
  leg1Y: number,
  leg2X: number,
  leg2Y: number,
): void {
  'worklet';
  capturedRoamerIndexSv.value = -1;
  runtime.exitLegsX.value = [leg1X, leg2X];
  runtime.exitLegsY.value = [leg1Y, leg2Y];
  runtime.exitLegIndex.value = 0;
  runtime.state.value = FlightState.ESCAPING;
  runtime.bodyScale.value = 1;
  runtime.isPreTakeoff.value = 0;
  runtime.sitTimer.value = 0;
  runtime.sitWingPauseTimer.value = 0;
  runtime.sitWingPauseTriggered.value = 0;
  runtime.sitOffsetX.value = 0;
  runtime.sitOffsetY.value = 0;
  runtime.sitTargetOffsetX.value = 0;
  runtime.sitTargetOffsetY.value = 0;
  runtime.sitActionTimer.value = 0;
}
