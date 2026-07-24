import { FlightState } from '../simulation/types';
import { pickRoamerDrawPass } from '../simulation/pickRoamerDrawPass';

describe('pickRoamerDrawPass', () => {
  it('returns "flying" for FLYING_IDLE', () => {
    expect(pickRoamerDrawPass(FlightState.FLYING_IDLE)).toBe('flying');
  });

  it('returns "flying" for FLYING_CRUISE', () => {
    expect(pickRoamerDrawPass(FlightState.FLYING_CRUISE)).toBe('flying');
  });

  it('returns "flying" for FLYING_TURN', () => {
    expect(pickRoamerDrawPass(FlightState.FLYING_TURN)).toBe('flying');
  });

  it('returns "flying" for APPROACH_FLOWER', () => {
    expect(pickRoamerDrawPass(FlightState.APPROACH_FLOWER)).toBe('flying');
  });

  it('returns "sitting" for WAIT_AT_TAKEN_FLOWER', () => {
    expect(pickRoamerDrawPass(FlightState.WAIT_AT_TAKEN_FLOWER)).toBe('sitting');
  });

  it('returns "sitting" for SITTING', () => {
    expect(pickRoamerDrawPass(FlightState.SITTING)).toBe('sitting');
  });

  it('returns "sitting" for LIFTING_OFF', () => {
    expect(pickRoamerDrawPass(FlightState.LIFTING_OFF)).toBe('sitting');
  });
});
