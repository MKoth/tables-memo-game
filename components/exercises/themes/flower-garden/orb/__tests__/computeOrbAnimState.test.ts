import { createRng } from '../../scenery/BushShaderLayer/helpers/seededRandom';
import { generateOrbPetalConfigs } from '../generateOrbPetalConfigs';
import {
  ORB_PETAL_FADE_END,
  ORB_PETAL_FADE_START,
  ORB_PETAL_STRETCH_GAIN,
  ORB_RING_CONFIGS,
  ORB_SPAWN_DIAMETER_RATIO,
} from '../orbAnimPresets';
import { OrbPhase, type OrbAnimationConfig } from '../orbAnimTypes';
import { computeOrbAnimState } from '../orbAnimWorklets';

const CONFIG: OrbAnimationConfig = {
  originX: 100,
  originY: 100,
  targetCenterX: 400,
  targetCenterY: 300,
  targetDiameter: 300,
};

const RING_CENTERS = [0.15, 0.35, 0.6];
const RING_THICKNESSES = [0.08, 0.14, 0.18];

function makePetals(seed = 1) {
  return generateOrbPetalConfigs({ rng: createRng(seed) });
}

function petalsInRing(petals: ReturnType<typeof makePetals>, ringIndex: number) {
  return petals.filter(p => p.ringIndex === ringIndex);
}

describe('computeOrbAnimState', () => {
  it('phase None returns diameter 0 and all petals invisible at origin', () => {
    const petals = makePetals();
    const state = computeOrbAnimState(
      OrbPhase.None,
      0,
      0,
      0,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    expect(state.diameter).toBe(0);
    expect(state.overallOpacity).toBe(0);
    expect(state.petals.length).toBe(petals.length);
    for (const p of state.petals) {
      expect(p.opacity).toBe(0);
      expect(p.scaleX).toBe(0);
    }
  });

  it('phase Enter at t=0 places petals at the origin and starts small', () => {
    const petals = makePetals();
    const state = computeOrbAnimState(
      OrbPhase.Enter,
      0,
      0,
      0,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    expect(state.diameter).toBeCloseTo(CONFIG.targetDiameter * ORB_SPAWN_DIAMETER_RATIO, 5);
    for (const p of state.petals) {
      const dx = p.x - CONFIG.originX;
      const dy = p.y - CONFIG.originY;
      expect(Math.hypot(dx, dy)).toBeLessThan(CONFIG.targetDiameter * 0.1);
    }
  });

  it('phase Enter at t=1 reaches full diameter and petals at ring positions', () => {
    const petals = makePetals();
    const state = computeOrbAnimState(
      OrbPhase.Enter,
      1,
      0,
      0,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    expect(state.diameter).toBeCloseTo(CONFIG.targetDiameter, 5);
    expect(state.overallOpacity).toBeCloseTo(1, 5);
    for (let i = 0; i < state.petals.length; i++) {
      const p = state.petals[i]!;
      const spawn = petals[i]!;
      const ring = ORB_RING_CONFIGS[spawn.ringIndex]!;
      const center = RING_CENTERS[spawn.ringIndex]!;
      const thickness = RING_THICKNESSES[spawn.ringIndex]!;
      const expectedRadius = spawn.startRadius * CONFIG.targetDiameter;
      const minRadius = (center - thickness * 0.5) * CONFIG.targetDiameter;
      const maxRadius = (center + thickness * 0.5) * CONFIG.targetDiameter;
      const dx = p.x - CONFIG.targetCenterX;
      const dy = p.y - CONFIG.targetCenterY;
      const r = Math.hypot(dx, dy);
      expect(r).toBeGreaterThanOrEqual(minRadius - 1e-3);
      expect(r).toBeLessThanOrEqual(maxRadius + 1e-3);
      expect(r).toBeCloseTo(expectedRadius, 1);
      expect(p.opacity).toBeCloseTo(1, 5);
      expect(ring).toBeDefined();
    }
  });

  it('phase Enter uses a spiral path, not a straight line, at intermediate t', () => {
    const petals = makePetals(42);
    const a = computeOrbAnimState(
      OrbPhase.Enter,
      0.0,
      0,
      0,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const b = computeOrbAnimState(
      OrbPhase.Enter,
      0.5,
      0,
      0,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const c = computeOrbAnimState(
      OrbPhase.Enter,
      1.0,
      0,
      0,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const straightX = (a.petals[0]!.x + c.petals[0]!.x) * 0.5;
    const straightY = (a.petals[0]!.y + c.petals[0]!.y) * 0.5;
    const offset = Math.hypot(
      b.petals[0]!.x - straightX,
      b.petals[0]!.y - straightY,
    );
    expect(offset).toBeGreaterThan(1);
  });

  it('phase Idle places petals at correct ring radii within band', () => {
    const petals = makePetals();
    const state = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      100,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    for (let i = 0; i < state.petals.length; i++) {
      const p = state.petals[i]!;
      const ringIndex = petals[i]!.ringIndex;
      const center = RING_CENTERS[ringIndex]!;
      const thickness = RING_THICKNESSES[ringIndex]!;
      const minR = (center - thickness * 0.5) * CONFIG.targetDiameter;
      const maxR = (center + thickness * 0.5) * CONFIG.targetDiameter;
      const r = Math.hypot(p.x - CONFIG.targetCenterX, p.y - CONFIG.targetCenterY);
      expect(r).toBeGreaterThanOrEqual(minR - 1e-3);
      expect(r).toBeLessThanOrEqual(maxR + 1e-3);
    }
  });

  it('phase Idle ring rotation advances petal angle linearly with time', () => {
    const petals = makePetals(7);
    const a = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      0,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const b = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      1000,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const innerA = petalsInRing(petals, 0);
    for (let i = 0; i < innerA.length; i++) {
      const idx = petals.indexOf(innerA[i]!);
      const aA = Math.atan2(
        a.petals[idx]!.y - CONFIG.targetCenterY,
        a.petals[idx]!.x - CONFIG.targetCenterX,
      );
      const bA = Math.atan2(
        b.petals[idx]!.y - CONFIG.targetCenterY,
        b.petals[idx]!.x - CONFIG.targetCenterX,
      );
      const speed = ORB_RING_CONFIGS[0]!.rotationSpeed * ORB_RING_CONFIGS[0]!.direction;
      const expectedDelta = speed * 1.0;
      const diff = Math.atan2(Math.sin(bA - aA), Math.cos(bA - aA));
      expect(diff).toBeCloseTo(expectedDelta, 4);
    }
  });

  it('phase Idle radial drift stays within ring band bounds', () => {
    const petals = makePetals(11);
    for (const ms of [0, 100, 500, 1500, 5000, 20000]) {
      const state = computeOrbAnimState(
        OrbPhase.Idle,
        1,
        0,
        ms,
        CONFIG,
        ORB_RING_CONFIGS,
        petals,
      );
      for (let i = 0; i < state.petals.length; i++) {
        const p = state.petals[i]!;
        const ringIndex = petals[i]!.ringIndex;
        const center = RING_CENTERS[ringIndex]!;
        const thickness = RING_THICKNESSES[ringIndex]!;
        const minR = (center - thickness * 0.5) * CONFIG.targetDiameter;
        const maxR = (center + thickness * 0.5) * CONFIG.targetDiameter;
        const r = Math.hypot(p.x - CONFIG.targetCenterX, p.y - CONFIG.targetCenterY);
        expect(r).toBeGreaterThanOrEqual(minR - 1e-3);
        expect(r).toBeLessThanOrEqual(maxR + 1e-3);
      }
    }
  });

  it('phase Idle self-spin produces scaleX within [1 - stretchGain, 1]', () => {
    const petals = makePetals(13);
    for (const ms of [0, 250, 500, 750, 1000, 1500, 2000]) {
      const state = computeOrbAnimState(
        OrbPhase.Idle,
        1,
        0,
        ms,
        CONFIG,
        ORB_RING_CONFIGS,
        petals,
      );
      for (const p of state.petals) {
        expect(p.scaleX).toBeGreaterThanOrEqual(1 - ORB_PETAL_STRETCH_GAIN - 1e-6);
        expect(p.scaleX).toBeLessThanOrEqual(1 + 1e-6);
        expect(p.opacity).toBeCloseTo(1, 5);
      }
    }
  });

  it('phase Burst at t=0 places petals at idle position with opacity 1', () => {
    const petals = makePetals(17);
    const idle = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      1234,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const burst = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      0,
      1234,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    for (let i = 0; i < burst.petals.length; i++) {
      const burstP = burst.petals[i]!;
      const idleP = idle.petals[i]!;
      expect(burstP.x).toBeCloseTo(idleP.x, 1);
      expect(burstP.y).toBeCloseTo(idleP.y, 1);
      expect(burstP.opacity).toBeCloseTo(1, 5);
    }
  });

  it('phase Burst at t=1 has petals scattered outward of idle position and opacity 0', () => {
    const petals = makePetals(19);
    const idle = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      1234,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const burst = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      1,
      1234,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    expect(burst.overallOpacity).toBeCloseTo(0, 5);
    for (let i = 0; i < burst.petals.length; i++) {
      const burstP = burst.petals[i]!;
      const idleP = idle.petals[i]!;
      const idleR = Math.hypot(
        idleP.x - CONFIG.targetCenterX,
        idleP.y - CONFIG.targetCenterY,
      );
      const burstR = Math.hypot(
        burstP.x - CONFIG.targetCenterX,
        burstP.y - CONFIG.targetCenterY,
      );
      expect(burstR).toBeGreaterThan(idleR - 1e-3);
      expect(burstP.opacity).toBeCloseTo(0, 5);
    }
  });

  it('phase Burst scatter vectors are outward from orb center', () => {
    const petals = makePetals(23);
    const burst = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      0.5,
      500,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const idle = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      500,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    for (let i = 0; i < burst.petals.length; i++) {
      const burstP = burst.petals[i]!;
      const idleP = idle.petals[i]!;
      const radialX = idleP.x - CONFIG.targetCenterX;
      const radialY = idleP.y - CONFIG.targetCenterY;
      const scatterX = burstP.x - idleP.x;
      const scatterY = burstP.y - idleP.y;
      const radialLen = Math.hypot(radialX, radialY);
      if (radialLen < 1e-3) continue;
      const dot = (scatterX * radialX + scatterY * radialY) / radialLen;
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('phase Burst opacity ramps from 1 to 0 across the fade range', () => {
    const petals = makePetals(29);
    const fadeStart = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      ORB_PETAL_FADE_START,
      500,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const fadeMid = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      (ORB_PETAL_FADE_START + ORB_PETAL_FADE_END) * 0.5,
      500,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const fadeEnd = computeOrbAnimState(
      OrbPhase.Burst,
      1,
      ORB_PETAL_FADE_END,
      500,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    expect(fadeStart.overallOpacity).toBeCloseTo(1, 5);
    expect(fadeMid.overallOpacity).toBeGreaterThan(0);
    expect(fadeMid.overallOpacity).toBeLessThan(1);
    expect(fadeEnd.overallOpacity).toBeCloseTo(0, 5);
  });

  it('is deterministic for the same inputs', () => {
    const petals = makePetals(31);
    const a = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      1234,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    const b = computeOrbAnimState(
      OrbPhase.Idle,
      1,
      0,
      1234,
      CONFIG,
      ORB_RING_CONFIGS,
      petals,
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('inner ring rotates in opposite direction to middle ring at different speed', () => {
    expect(ORB_RING_CONFIGS[0]!.direction).toBe(1);
    expect(ORB_RING_CONFIGS[1]!.direction).toBe(-1);
    expect(ORB_RING_CONFIGS[0]!.rotationSpeed).not.toBe(ORB_RING_CONFIGS[1]!.rotationSpeed);
  });
});
