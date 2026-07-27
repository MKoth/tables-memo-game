import { FlightState } from '../simulation/types';
import { updateButterfly } from '../simulation/updateButterfly';
import {
  ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED,
  ROAMER_BUTTERFLY_WING_FREQ_MIN,
  ROAMER_BUTTERFLY_BASE_SPEED_MAX,
} from '../config/butterflySimConfig';

function sv(v: number) {
  return { value: v };
}

function createMockRuntime(overrides?: { [key: string]: number }): any {
  const o = overrides ?? {};
  return {
    spawn: {
      phase: o.phase ?? 0,
      xRatio: 0.5,
      yRatio: 0.5,
      initialAngle: 0,
      legPhaseOffsets: [0, 0, 0, 0, 0, 0],
      wingPairIndex: 0,
    },
    x: sv(o.x ?? 200),
    y: sv(o.y ?? 300),
    angle: sv(o.angle ?? 0),
    speed: sv(o.speed ?? 50),
    wingPhase: sv(o.wingPhase ?? 0),
    noisePhase: sv(o.noisePhase ?? 0),
    idleNoisePhase: sv(o.idleNoisePhase ?? 0),
    pathCoeff: sv(o.pathCoeff ?? 0.5),
    state: sv(o.state ?? FlightState.FLYING_CRUISE),
    stateTimer: sv(o.stateTimer ?? 10),
    wanderAngle: sv(o.wanderAngle ?? 0),
    prevAngle: sv(o.prevAngle ?? 0),
    bodyScale: sv(o.bodyScale ?? 1),
    targetFlowerIndex: sv(o.targetFlowerIndex ?? -1),
    targetFlowerX: sv(o.targetFlowerX ?? 0),
    targetFlowerY: sv(o.targetFlowerY ?? 0),
    sitTimer: sv(o.sitTimer ?? 0),
    approachOrbitTimer: sv(o.approachOrbitTimer ?? 0),
    sitWingPauseTimer: sv(o.sitWingPauseTimer ?? 0),
    sitWingPauseTriggered: sv(o.sitWingPauseTriggered ?? 0),
    sitOffsetX: sv(o.sitOffsetX ?? 0),
    sitOffsetY: sv(o.sitOffsetY ?? 0),
    sitTargetOffsetX: sv(o.sitTargetOffsetX ?? 0),
    sitTargetOffsetY: sv(o.sitTargetOffsetY ?? 0),
    sitActionTimer: sv(o.sitActionTimer ?? 0),
    legPhases: [sv(0), sv(0), sv(0), sv(0), sv(0), sv(0)],
    legVisibility: sv(0),
  };
}

const STEER_MIN = 50;
const STEER_MAX = 400;
const HARD_MIN = 10;
const HARD_MAX = 590;
const CENTER = 300;
const EMPTY_ANCHORS_X: number[] = [];
const EMPTY_ANCHORS_Y: number[] = [];
const EMPTY_SLOTS: number[] = [];
const EMPTY_SWING: number[] = [];
const ROAMER_IDX = 0;

describe('wing-phase model', () => {
  it('wingPhase advances at rate derived from pathCoeff', () => {
    const rt = createMockRuntime({ pathCoeff: 0, wingPhase: 0 });
    const dt = 0.1;
    const expectedFreq = ROAMER_BUTTERFLY_WING_FREQ_MIN;
    const expectedPhase = expectedFreq * dt;

    updateButterfly(rt, dt, STEER_MIN, STEER_MAX, STEER_MIN, STEER_MAX, HARD_MIN, HARD_MAX, HARD_MIN, HARD_MAX, CENTER, CENTER, EMPTY_ANCHORS_X, EMPTY_ANCHORS_Y, EMPTY_SLOTS, ROAMER_IDX, 0, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING);

    expect(rt.wingPhase.value).toBeCloseTo(expectedPhase, 5);
  });

  it('fly speed converges to pathCoeff-derived target', () => {
    const rt = createMockRuntime({ pathCoeff: 1, speed: 0 });
    const dt = 0.1;
    const expectedSpeed = ROAMER_BUTTERFLY_BASE_SPEED_MAX;

    updateButterfly(rt, dt, STEER_MIN, STEER_MAX, STEER_MIN, STEER_MAX, HARD_MIN, HARD_MAX, HARD_MIN, HARD_MAX, CENTER, CENTER, EMPTY_ANCHORS_X, EMPTY_ANCHORS_Y, EMPTY_SLOTS, ROAMER_IDX, 0, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING);

    expect(rt.speed.value).toBeGreaterThan(0);
    expect(rt.speed.value).toBeLessThanOrEqual(expectedSpeed);
  });

  it('pathCoeff recalculates on idle-to-cruise transition', () => {
    const rt = createMockRuntime({
      state: FlightState.FLYING_IDLE,
      pathCoeff: 0,
      wingPhase: 1.0,
      stateTimer: 0.01,
    });
    const initialCoeff = rt.pathCoeff.value;
    const dt = 0.02;

    updateButterfly(rt, dt, STEER_MIN, STEER_MAX, STEER_MIN, STEER_MAX, HARD_MIN, HARD_MAX, HARD_MIN, HARD_MAX, CENTER, CENTER, EMPTY_ANCHORS_X, EMPTY_ANCHORS_Y, EMPTY_SLOTS, ROAMER_IDX, 0, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING);

    expect(rt.state.value).toBe(FlightState.FLYING_CRUISE);
    expect(rt.pathCoeff.value).not.toBeCloseTo(initialCoeff, 5);
    expect(rt.pathCoeff.value).toBeGreaterThanOrEqual(0);
    expect(rt.pathCoeff.value).toBeLessThanOrEqual(1);
  });

  it('FLYING_IDLE state drift uses wingPhase', () => {
    const rt = createMockRuntime({
      wingPhase: 0,
      pathCoeff: 0.5,
      state: FlightState.FLYING_IDLE,
      speed: ROAMER_BUTTERFLY_IDLE_DRIFT_SPEED,
      stateTimer: 1,
    });
    const dt = 0.016;
    const initialX = rt.x.value;

    updateButterfly(rt, dt, STEER_MIN, STEER_MAX, STEER_MIN, STEER_MAX, HARD_MIN, HARD_MAX, HARD_MIN, HARD_MAX, CENTER, CENTER, EMPTY_ANCHORS_X, EMPTY_ANCHORS_Y, EMPTY_SLOTS, ROAMER_IDX, 0, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING);

    expect(rt.x.value).not.toBeCloseTo(initialX, 3);
  });

  it('pathCoeff stays in [0, 1] range for varied inputs', () => {
    const phases = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];

    for (const phase of phases) {
      const rt = createMockRuntime({
        state: FlightState.FLYING_IDLE,
        pathCoeff: 0,
        wingPhase: phase,
        phase: phase,
        stateTimer: 0.01,
      });
      const dt = 0.02;

    updateButterfly(rt, dt, STEER_MIN, STEER_MAX, STEER_MIN, STEER_MAX, HARD_MIN, HARD_MAX, HARD_MIN, HARD_MAX, CENTER, CENTER, EMPTY_ANCHORS_X, EMPTY_ANCHORS_Y, EMPTY_SLOTS, ROAMER_IDX, 0, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING, EMPTY_SWING);

      if (rt.state.value === FlightState.FLYING_CRUISE) {
        expect(rt.pathCoeff.value).toBeGreaterThanOrEqual(0);
        expect(rt.pathCoeff.value).toBeLessThanOrEqual(1);
      }
    }
  });
});
