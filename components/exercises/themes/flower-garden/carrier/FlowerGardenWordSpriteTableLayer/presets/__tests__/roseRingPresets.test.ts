import { MAX_RINGS } from '../../../../shaders/roseBudDeform.sksl';
import { computeRoseRingRotations } from '../roseRingPresets';

describe('computeRoseRingRotations', () => {
  it('returns one cos/sin pair per ring', () => {
    const rotations = computeRoseRingRotations(0.5);
    expect(rotations.ringRotCos).toHaveLength(MAX_RINGS);
    expect(rotations.ringRotSin).toHaveLength(MAX_RINGS);
  });

  it('interpolates the rotation angle by coefficient', () => {
    const min = computeRoseRingRotations(0);
    const max = computeRoseRingRotations(1);
    const mid = computeRoseRingRotations(0.5);
    for (let i = 0; i < MAX_RINGS; i++) {
      expect(Math.atan2(mid.ringRotSin[i], mid.ringRotCos[i])).toBeCloseTo(
        (Math.atan2(min.ringRotSin[i], min.ringRotCos[i]) +
          Math.atan2(max.ringRotSin[i], max.ringRotCos[i])) /
          2,
        5,
      );
    }
  });

  it('keeps each pair on the unit circle', () => {
    const rotations = computeRoseRingRotations(0.7);
    for (let i = 0; i < MAX_RINGS; i++) {
      const len = rotations.ringRotCos[i] ** 2 + rotations.ringRotSin[i] ** 2;
      expect(len).toBeCloseTo(1, 5);
    }
  });
});
