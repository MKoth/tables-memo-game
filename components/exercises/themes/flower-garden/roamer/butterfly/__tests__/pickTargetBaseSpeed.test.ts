import { pickTargetBaseSpeed } from '../simulation/butterflySimHelpers';
import {
  ROAMER_BUTTERFLY_BASE_SPEED_MAX,
  ROAMER_BUTTERFLY_BASE_SPEED_MIN,
} from '../config/butterflySimConfig';

describe('pickTargetBaseSpeed', () => {
  it('same phase produces the same output', () => {
    const a = pickTargetBaseSpeed(1.234);
    const b = pickTargetBaseSpeed(1.234);
    expect(a).toBe(b);
  });

  it('output is within [ROAMER_BUTTERFLY_BASE_SPEED_MIN, ROAMER_BUTTERFLY_BASE_SPEED_MAX]', () => {
    const result = pickTargetBaseSpeed(2.0);
    expect(result).toBeGreaterThanOrEqual(ROAMER_BUTTERFLY_BASE_SPEED_MIN);
    expect(result).toBeLessThanOrEqual(ROAMER_BUTTERFLY_BASE_SPEED_MAX);
  });

  it('output is within bounds for a sweep of phases', () => {
    for (let phase = 0; phase < 6.3; phase += 0.1) {
      const result = pickTargetBaseSpeed(phase);
      expect(result).toBeGreaterThanOrEqual(ROAMER_BUTTERFLY_BASE_SPEED_MIN);
      expect(result).toBeLessThanOrEqual(ROAMER_BUTTERFLY_BASE_SPEED_MAX);
    }
  });

  it('different phases produce different outputs', () => {
    const a = pickTargetBaseSpeed(0.5);
    const b = pickTargetBaseSpeed(1.5);
    const c = pickTargetBaseSpeed(2.5);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it('same seed across calls produces the same speed history', () => {
    const phases = [0.1, 0.4, 0.7, 1.0, 1.3];
    const firstPass = phases.map(phase => pickTargetBaseSpeed(phase));
    const secondPass = phases.map(phase => pickTargetBaseSpeed(phase));
    expect(firstPass).toEqual(secondPass);
  });
});
