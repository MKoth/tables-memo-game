import { pickWanderAngle } from '../simulation/butterflySimHelpers';
import {
  ROAMER_BUTTERFLY_WANDER_DEVIATION_MAX,
  ROAMER_BUTTERFLY_WANDER_DEVIATION_MIN,
} from '../config/butterflySimConfig';

describe('pickWanderAngle', () => {
  it('same phase produces the same output', () => {
    const a = pickWanderAngle(0, 1.234);
    const b = pickWanderAngle(0, 1.234);
    expect(a).toBe(b);
  });

  it('output is the current angle plus a bounded deviation', () => {
    const currentAngle = 0.5;
    const phase = 2.7;
    const result = pickWanderAngle(currentAngle, phase);
    const deviation = result - currentAngle;
    expect(deviation).toBeGreaterThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MIN);
    expect(deviation).toBeLessThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MAX);
  });

  it('deviation is bounded for a sweep of phases', () => {
    const currentAngle = 1.1;
    for (let phase = 0; phase < 6.3; phase += 0.1) {
      const result = pickWanderAngle(currentAngle, phase);
      const deviation = result - currentAngle;
      expect(deviation).toBeGreaterThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MIN);
      expect(deviation).toBeLessThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MAX);
    }
  });

  it('different phases generally produce different outputs', () => {
    const currentAngle = 0;
    const a = pickWanderAngle(currentAngle, 0.5);
    const b = pickWanderAngle(currentAngle, 1.5);
    const c = pickWanderAngle(currentAngle, 2.5);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it('same seed across calls produces the same wander history', () => {
    const currentAngle = 0;
    const phases = [0.1, 0.4, 0.7, 1.0, 1.3];
    const firstPass = phases.map(phase => pickWanderAngle(currentAngle, phase));
    const secondPass = phases.map(phase => pickWanderAngle(currentAngle, phase));
    expect(firstPass).toEqual(secondPass);
  });
});
