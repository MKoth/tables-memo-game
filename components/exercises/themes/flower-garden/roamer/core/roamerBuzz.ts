import { FlightState } from './types';

export function isRoamerBuzzActive(state: FlightState, isPreTakeoff: number): boolean {
  'worklet';
  if (state === FlightState.SITTING || state === FlightState.WAIT_AT_TAKEN_FLOWER) {
    return isPreTakeoff === 1;
  }
  switch (state) {
    case FlightState.FLYING_IDLE:
    case FlightState.FLYING_CRUISE:
    case FlightState.FLYING_TURN:
    case FlightState.APPROACH_FLOWER:
    case FlightState.LIFTING_OFF:
    case FlightState.ESCAPING:
      return true;
    default:
      return false;
  }
}
