import { FlightState } from '../types';
import { isRoamerBuzzActive } from '../roamerBuzz';

describe('isRoamerBuzzActive', () => {
  it('is active while flying in any flight state', () => {
    const states = [
      FlightState.FLYING_IDLE,
      FlightState.FLYING_CRUISE,
      FlightState.FLYING_TURN,
      FlightState.APPROACH_FLOWER,
      FlightState.LIFTING_OFF,
      FlightState.ESCAPING,
    ];
    for (const state of states) {
      expect(isRoamerBuzzActive(state, 0)).toBe(true);
    }
  });

  it('is paused while sitting on a flower', () => {
    expect(isRoamerBuzzActive(FlightState.SITTING, 0)).toBe(false);
  });

  it('resumes while sitting when pre-takeoff wing movement starts', () => {
    expect(isRoamerBuzzActive(FlightState.SITTING, 1)).toBe(true);
  });

  it('is paused at a taken flower', () => {
    expect(isRoamerBuzzActive(FlightState.WAIT_AT_TAKEN_FLOWER, 0)).toBe(false);
    expect(isRoamerBuzzActive(FlightState.WAIT_AT_TAKEN_FLOWER, 1)).toBe(true);
  });

  it('is inactive when escaped regardless of pre-takeoff', () => {
    expect(isRoamerBuzzActive(FlightState.ESCAPED, 0)).toBe(false);
    expect(isRoamerBuzzActive(FlightState.ESCAPED, 1)).toBe(false);
  });
});
