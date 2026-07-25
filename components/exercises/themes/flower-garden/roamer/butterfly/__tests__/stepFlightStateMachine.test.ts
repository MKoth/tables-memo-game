import { FlightState, type ButterflyState } from '../simulation/types';
import { stepFlightStateMachine, type FlightContext } from '../simulation/stepFlightStateMachine';
import {
  ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD,
  ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS,
  ROAMER_BUTTERFLY_SIT_BODY_SCALE,
} from '../config/butterflySimConfig';

function makeState(overrides?: Partial<ButterflyState>): ButterflyState {
  return {
    flightState: FlightState.FLYING_CRUISE,
    positionX: 200,
    positionY: 300,
    angle: 0,
    speed: 50,
    wingPhaseLeft: 0,
    wingPhaseRight: 0,
    noisePhase: 0,
    idleNoisePhase: 0,
    legPhases: [0, 0, 0, 0, 0, 0],
    bodyScale: 1,
    legVisibility: 0,
    sitPhase: 0,
    phase: 0.5,
    pathCoeff: 0.5,
    wanderAngle: 0,
    targetFlowerIndex: -1,
    targetFlowerX: 0,
    targetFlowerY: 0,
    wanderTargetX: 0,
    wanderTargetY: 0,
    lastTargetFlowerIndex: -1,
    waitTimer: 0,
    sitTimer: 0,
    stateTimer: 10,
    ...overrides,
  };
}

function makeContext(overrides?: Partial<FlightContext>): FlightContext {
  return {
    dt: 0.016,
    steerMinX: 50,
    steerMaxX: 400,
    steerMinY: 50,
    steerMaxY: 400,
    hardMinX: 10,
    hardMaxX: 590,
    hardMinY: 10,
    hardMaxY: 590,
    centerX: 300,
    centerY: 300,
    fieldFlowerAnchorsX: [200, 400],
    fieldFlowerAnchorsY: [350, 250],
    occupantSlots: [-1, -1],
    roamerIndex: 0,
    ...overrides,
  };
}

describe('stepFlightStateMachine', () => {
  describe('APPROACH_FLOWER state', () => {
    it('transitions to SITTING when close to target', () => {
      const flowerX = 200;
      const flowerY = 350;
      const state = makeState({
        flightState: FlightState.APPROACH_FLOWER,
        positionX: flowerX,
        positionY: flowerY - ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD + 1,
        targetFlowerIndex: 0,
        targetFlowerX: flowerX,
        targetFlowerY: flowerY,
      });
      const ctx = makeContext();
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.SITTING);
      expect(next.bodyScale).toBe(ROAMER_BUTTERFLY_SIT_BODY_SCALE);
    });

    it('writes roamer index to occupant slot on landing', () => {
      const flowerX = 200;
      const flowerY = 350;
      const occupantSlots = [-1, -1];
      const state = makeState({
        flightState: FlightState.APPROACH_FLOWER,
        positionX: flowerX,
        positionY: flowerY - ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD + 1,
        targetFlowerIndex: 0,
        targetFlowerX: flowerX,
        targetFlowerY: flowerY,
      });
      const ctx = makeContext({ occupantSlots });
      stepFlightStateMachine(state, ctx);
      expect(occupantSlots[0]).toBe(0);
    });

    it('approaches target when far', () => {
      const state = makeState({
        flightState: FlightState.APPROACH_FLOWER,
        positionX: 100,
        positionY: 100,
        targetFlowerIndex: 1,
        targetFlowerX: 400,
        targetFlowerY: 250,
      });
      const ctx = makeContext({ dt: 0.1 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.APPROACH_FLOWER);
      const dx = next.positionX - state.positionX;
      const dy = next.positionY - state.positionY;
      expect(Math.abs(dx) + Math.abs(dy)).toBeGreaterThan(0);
    });
  });

  describe('SITTING state', () => {
    it('stays in SITTING while timer is positive', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        stateTimer: 1,
      });
      const ctx = makeContext({ dt: 0.1 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.SITTING);
      expect(next.bodyScale).toBe(ROAMER_BUTTERFLY_SIT_BODY_SCALE);
      expect(next.positionX).toBe(200);
      expect(next.positionY).toBe(350);
    });

    it('transitions to LIFTING_OFF when timer expires', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        stateTimer: 0.01,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.LIFTING_OFF);
    });
  });

  describe('SITTING → LIFTING_OFF transition', () => {
    it('clears occupant slot when transitioning to LIFTING_OFF', () => {
      const occupantSlots = [0, -1];
      const state = makeState({
        flightState: FlightState.SITTING,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        stateTimer: 0.01,
        targetFlowerIndex: 0,
      });
      const ctx = makeContext({ dt: 0.02, occupantSlots });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.LIFTING_OFF);
      expect(occupantSlots[0]).toBe(-1);
    });
  });

  describe('LIFTING_OFF state', () => {
    it('lerps bodyScale back to 1', () => {
      const state = makeState({
        flightState: FlightState.LIFTING_OFF,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        stateTimer: ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000,
        targetFlowerIndex: 0,
      });
      const halfWay = (ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS / 1000) / 2;
      const ctx = makeContext({ dt: halfWay });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.bodyScale).toBeGreaterThan(ROAMER_BUTTERFLY_SIT_BODY_SCALE);
      expect(next.bodyScale).toBeLessThan(1);
    });

    it('transitions to FLYING_CRUISE when done', () => {
      const state = makeState({
        flightState: FlightState.LIFTING_OFF,
        positionX: 200,
        positionY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
        stateTimer: 0.01,
        targetFlowerIndex: 0,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.FLYING_CRUISE);
      expect(next.bodyScale).toBe(1);
    });
  });
});
