import {
  ORB_PETAL_FADE_END,
  ORB_PETAL_FADE_START,
  ORB_SPAWN_DIAMETER_RATIO,
  ORB_WRONG_TINT_STRENGTH,
} from '../orbAnimPresets';
import { OrbPhase, type OrbAnimationConfig } from '../orbAnimTypes';
import { computeOrbAnimState, type OrbWrongStateInput } from '../orbAnimWorklets';

const CONFIG: OrbAnimationConfig = {
  originX: 100,
  originY: 100,
  targetCenterX: 400,
  targetCenterY: 300,
  targetDiameter: 300,
};

describe('computeOrbAnimState', () => {
  it('phase None returns diameter 0, fully invisible at the origin', () => {
    const state = computeOrbAnimState(OrbPhase.None, 0, 0, 0, CONFIG);
    expect(state.diameter).toBe(0);
    expect(state.overallOpacity).toBe(0);
    expect(state.captureVisualT).toBe(0);
    expect(state.phase).toBe(OrbPhase.None);
  });

  it('phase Enter at t=0 starts at the origin with spawn diameter', () => {
    const state = computeOrbAnimState(OrbPhase.Enter, 0, 0, 0, CONFIG);
    expect(state.diameter).toBeCloseTo(CONFIG.targetDiameter * ORB_SPAWN_DIAMETER_RATIO, 5);
    expect(state.centerX).toBeCloseTo(CONFIG.originX, 5);
    expect(state.centerY).toBeCloseTo(CONFIG.originY, 5);
    expect(state.enterT).toBe(0);
  });

  it('phase Enter at t=1 reaches full diameter and opacity 1', () => {
    const state = computeOrbAnimState(OrbPhase.Enter, 1, 0, 0, CONFIG);
    expect(state.diameter).toBeCloseTo(CONFIG.targetDiameter, 5);
    expect(state.overallOpacity).toBeCloseTo(1, 5);
    expect(state.enterT).toBe(1);
  });

  it('phase Idle sits at target center with full diameter and forwards idle time', () => {
    const state = computeOrbAnimState(OrbPhase.Idle, 1, 0, 5000, CONFIG);
    expect(state.centerX).toBeCloseTo(CONFIG.targetCenterX, 5);
    expect(state.centerY).toBeCloseTo(CONFIG.targetCenterY, 5);
    expect(state.diameter).toBeCloseTo(CONFIG.targetDiameter, 5);
    expect(state.overallOpacity).toBeCloseTo(1, 5);
    expect(state.idleElapsedMs).toBe(5000);
  });

  it('phase Burst at t=0 keeps the orb fully visible', () => {
    const state = computeOrbAnimState(OrbPhase.Burst, 1, 0, 0, CONFIG);
    expect(state.overallOpacity).toBeCloseTo(1, 5);
    expect(state.captureVisualT).toBeCloseTo(1, 5);
    expect(state.burstT).toBe(0);
  });

  it('phase Burst at t=1 fades the orb out completely', () => {
    const state = computeOrbAnimState(OrbPhase.Burst, 1, 1, 0, CONFIG);
    expect(state.overallOpacity).toBeCloseTo(0, 5);
    expect(state.captureVisualT).toBeCloseTo(0, 5);
    expect(state.burstT).toBe(1);
  });

  it('phase Burst opacity ramps from 1 to 0 across the fade range', () => {
    const fadeStart = computeOrbAnimState(OrbPhase.Burst, 1, ORB_PETAL_FADE_START, 0, CONFIG);
    const fadeMid = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      (ORB_PETAL_FADE_START + ORB_PETAL_FADE_END) * 0.5,
      0,
      CONFIG,
    );
    const fadeEnd = computeOrbAnimState(OrbPhase.Burst, 1, ORB_PETAL_FADE_END, 0, CONFIG);
    expect(fadeStart.overallOpacity).toBeCloseTo(1, 5);
    expect(fadeMid.overallOpacity).toBeGreaterThan(0);
    expect(fadeMid.overallOpacity).toBeLessThan(1);
    expect(fadeEnd.overallOpacity).toBeCloseTo(0, 5);
  });

  it('captureVisualT fades out during the initial burst quarter', () => {
    const state = computeOrbAnimState(OrbPhase.Burst, 1, 0.2, 0, CONFIG);
    expect(state.captureVisualT).toBeLessThan(1);
    expect(state.captureVisualT).toBeGreaterThan(0);
  });

  it('is deterministic for the same inputs', () => {
    const a = computeOrbAnimState(OrbPhase.Idle, 1, 0, 1234, CONFIG);
    const b = computeOrbAnimState(OrbPhase.Idle, 1, 0, 1234, CONFIG);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('move* shared values override raw targets', () => {
    const moved = 520;
    const state = computeOrbAnimState(OrbPhase.Idle, 1, 0, 0, {
      ...CONFIG,
      moveCenterX: { value: moved },
      moveCenterY: { value: moved },
      moveDiameter: { value: 200 },
    } as OrbAnimationConfig);
    expect(state.centerX).toBeCloseTo(moved, 5);
    expect(state.centerY).toBeCloseTo(moved, 5);
    expect(state.diameter).toBeCloseTo(200, 5);
  });

  it('move* shared values apply when moveDiameter is the only override', () => {
    const state = computeOrbAnimState(OrbPhase.Idle, 1, 0, 0, {
      ...CONFIG,
      moveDiameter: { value: 150 },
    } as OrbAnimationConfig);
    expect(state.diameter).toBeCloseTo(150, 5);
    expect(state.centerX).toBeCloseTo(CONFIG.targetCenterX, 5);
    expect(state.centerY).toBeCloseTo(CONFIG.targetCenterY, 5);
  });

  describe('wrong feedback (tint + shake)', () => {
    const wrong: OrbWrongStateInput = { progress: 0.5, clockMs: 0, r: 1, g: 0.35, b: 0.35 };

    it('wrongProgress 0 produces zero tint strength and no shake', () => {
      const state = computeOrbAnimState(OrbPhase.Idle, 1, 0, 1000, CONFIG, {
        ...wrong,
        progress: 0,
      });
      expect(state.tintStrength).toBe(0);
      expect(state.centerX).toBeCloseTo(CONFIG.targetCenterX, 5);
      expect(state.centerY).toBeCloseTo(CONFIG.targetCenterY, 5);
    });

    it('wrongProgress 1 carries full tint strength through state', () => {
      const state = computeOrbAnimState(OrbPhase.Idle, 1, 0, 1000, CONFIG, {
        ...wrong,
        progress: 1,
      });
      expect(state.tintStrength).toBeCloseTo(ORB_WRONG_TINT_STRENGTH, 5);
      expect(state.tintR).toBe(wrong.r);
      expect(state.tintG).toBe(wrong.g);
      expect(state.tintB).toBe(wrong.b);
    });

    it('wrongProgress 1 shakes the orb center at the wrong-shake amplitude', () => {
      const state = computeOrbAnimState(OrbPhase.Idle, 1, 0, 0, CONFIG, {
        ...wrong,
        progress: 1,
      });
      const amplitude = Math.max(2, CONFIG.targetDiameter * 0.05);
      const dx = Math.abs(state.centerX - CONFIG.targetCenterX);
      const dy = Math.abs(state.centerY - CONFIG.targetCenterY);
      expect(dx).toBeLessThanOrEqual(amplitude + 1e-6);
      expect(dy).toBeLessThanOrEqual(amplitude + 1e-6);
      expect(dx + dy).toBeGreaterThan(0);
    });
  });
});
