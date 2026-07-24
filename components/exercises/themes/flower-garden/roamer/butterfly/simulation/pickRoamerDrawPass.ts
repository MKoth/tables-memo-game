import { FlightState } from './types';

export type RoamerDrawPass = 'flying' | 'sitting' | 'none';

export function pickRoamerDrawPass(flightState: FlightState): RoamerDrawPass {
  switch (flightState) {
    case FlightState.FLYING_IDLE:
    case FlightState.FLYING_CRUISE:
    case FlightState.FLYING_TURN:
    case FlightState.APPROACH_FLOWER:
      return 'flying';
    case FlightState.WAIT_AT_TAKEN_FLOWER:
    case FlightState.SITTING:
    case FlightState.LIFTING_OFF:
      return 'sitting';
    default:
      return 'none';
  }
}
