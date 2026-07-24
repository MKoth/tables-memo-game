import { pickErraticWanderAngle } from '../simulation/butterflySimHelpers';
import {
  ROAMER_BUTTERFLY_WANDER_DEVIATION_MAX,
  ROAMER_BUTTERFLY_WANDER_DEVIATION_MIN,
} from '../config/butterflySimConfig';

describe('pickErraticWanderAngle', () => {
  it('same phase and wingPhaseDiff produce the same output', () => {
    const a = pickErraticWanderAngle(0, 1.234, 0.5);
    const b = pickErraticWanderAngle(0, 1.234, 0.5);
    expect(a).toBe(b);
  });

  it('output is the current angle plus a bounded deviation', () => {
    const currentAngle = 0.5;
    const phase = 2.7;
    const wingPhaseDiff = 1.0;
    const result = pickErraticWanderAngle(currentAngle, phase, wingPhaseDiff);
    const deviation = result - currentAngle;
    expect(deviation).toBeGreaterThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MIN);
    expect(deviation).toBeLessThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MAX);
  });

  it('deviation is bounded for a sweep of phases and wingPhaseDiffs', () => {
    const currentAngle = 1.1;
    for (let phase = 0; phase < 6.3; phase += 0.3) {
      for (let wingPhaseDiff = -3; wingPhaseDiff <= 3; wingPhaseDiff += 0.5) {
        const result = pickErraticWanderAngle(currentAngle, phase, wingPhaseDiff);
        const deviation = result - currentAngle;
        expect(deviation).toBeGreaterThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MIN);
        expect(deviation).toBeLessThanOrEqual(ROAMER_BUTTERFLY_WANDER_DEVIATION_MAX);
      }
    }
  });

  it('changing wingPhaseDiff changes the output (sensitivity)', () => {
    const currentAngle = 0;
    const phase = 1.5;
    const a = pickErraticWanderAngle(currentAngle, phase, 0.0);
    const b = pickErraticWanderAngle(currentAngle, phase, 2.0);
    expect(a).not.toBe(b);
  });

  it('changing phase changes the output', () => {
    const currentAngle = 0;
    const wingPhaseDiff = 0.5;
    const a = pickErraticWanderAngle(currentAngle, 0.5, wingPhaseDiff);
    const b = pickErraticWanderAngle(currentAngle, 1.5, wingPhaseDiff);
    const c = pickErraticWanderAngle(currentAngle, 2.5, wingPhaseDiff);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it('same inputs across calls produce the same wander history', () => {
    const currentAngle = 0;
    const inputs = [
      { phase: 0.1, wingPhaseDiff: 0.2 },
      { phase: 0.4, wingPhaseDiff: 0.8 },
      { phase: 0.7, wingPhaseDiff: -0.5 },
      { phase: 1.0, wingPhaseDiff: 1.5 },
      { phase: 1.3, wingPhaseDiff: -1.0 },
    ];
    const firstPass = inputs.map(({ phase, wingPhaseDiff }) =>
      pickErraticWanderAngle(currentAngle, phase, wingPhaseDiff),
    );
    const secondPass = inputs.map(({ phase, wingPhaseDiff }) =>
      pickErraticWanderAngle(currentAngle, phase, wingPhaseDiff),
    );
    expect(firstPass).toEqual(secondPass);
  });
});
