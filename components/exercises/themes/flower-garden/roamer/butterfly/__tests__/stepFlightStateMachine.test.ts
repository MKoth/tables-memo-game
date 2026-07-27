import { FlightState, type ButterflyState } from '../simulation/types';
import { stepFlightStateMachine, type FlightContext } from '../simulation/stepFlightStateMachine';
import {
  ROAMER_BUTTERFLY_APPROACH_DISTANCE_THRESHOLD,
  ROAMER_BUTTERFLY_LIFT_OFF_DURATION_MS,
  ROAMER_BUTTERFLY_SIT_BODY_SCALE,
  ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE,
  ROAMER_BUTTERFLY_SIT_SUB_MODE_ARC,
  ROAMER_BUTTERFLY_SIT_SUB_MODE_TURN,
  ROAMER_BUTTERFLY_SITTING_IDLE_DURATION_MS,
  ROAMER_BUTTERFLY_SITTING_ARC_DURATION_MS,
  ROAMER_BUTTERFLY_SITTING_TURN_DURATION_MS,
  ROAMER_BUTTERFLY_SIT_ARC_RADIUS,
  ROAMER_BUTTERFLY_SIT_ARC_SPEED,
  ROAMER_BUTTERFLY_SIT_ARC_VERTICAL_SQUASH,
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
    approachOrbitTimer: 0,
    sitWingPauseTimer: 0,
    sitWingPauseTriggered: 0,
    sittingSubMode: 0,
    sitSubModeTimer: 3,
    sitTurnTargetAngle: 0,
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
    elapsedMs: 1000,
    flowerSwingAmplitudes: [0, 0],
    flowerSwingSpeeds: [0, 0],
    flowerSwingPhases: [0, 0],
    flowerSwingAngles: [0, 0],
    boostsMutable: [0, 0],
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
        targetFlowerX: 200,
        targetFlowerY: 350,
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

  describe('SITTING sub-mode: entry initialization', () => {
    it('sets sittingSubMode to IDLE on APPROACH_FLOWER → SITTING transition', () => {
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
      expect(next.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE);
      expect(next.sitSubModeTimer).toBeCloseTo(ROAMER_BUTTERFLY_SITTING_IDLE_DURATION_MS / 1000, 4);
    });
  });

  describe('SITTING sub-mode: idle → arc → turn → idle cycle', () => {
    it('transitions from IDLE to ARC when sub-mode timer expires', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE,
        sitSubModeTimer: 0.01,
        stateTimer: 10,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_ARC);
      expect(next.sitSubModeTimer).toBeCloseTo(ROAMER_BUTTERFLY_SITTING_ARC_DURATION_MS / 1000, 2);
    });

    it('transitions from ARC to TURN when sub-mode timer expires', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_ARC,
        sitSubModeTimer: 0.01,
        stateTimer: 10,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_TURN);
      expect(next.sitSubModeTimer).toBeCloseTo(ROAMER_BUTTERFLY_SITTING_TURN_DURATION_MS / 1000, 2);
    });

    it('transitions from TURN to IDLE when sub-mode timer expires', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_TURN,
        sitSubModeTimer: 0.01,
        stateTimer: 10,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE);
      expect(next.sitSubModeTimer).toBeCloseTo(ROAMER_BUTTERFLY_SITTING_IDLE_DURATION_MS / 1000, 2);
    });

    it('completes full idle → arc → turn → idle cycle', () => {
      const idleDur = ROAMER_BUTTERFLY_SITTING_IDLE_DURATION_MS / 1000;
      const arcDur = ROAMER_BUTTERFLY_SITTING_ARC_DURATION_MS / 1000;
      const turnDur = ROAMER_BUTTERFLY_SITTING_TURN_DURATION_MS / 1000;

      let state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE,
        sitSubModeTimer: idleDur,
        stateTimer: idleDur + arcDur + turnDur + 1,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });

      const dt = idleDur + 0.01;
      state = stepFlightStateMachine(state, makeContext({ dt }));
      expect(state.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_ARC);

      const dt2 = arcDur + 0.01;
      state = stepFlightStateMachine(state, makeContext({ dt: dt2 }));
      expect(state.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_TURN);

      const dt3 = turnDur + 0.01;
      state = stepFlightStateMachine(state, makeContext({ dt: dt3 }));
      expect(state.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE);
    });
  });

  describe('SITTING sub-mode: sitPhase advancement', () => {
    it('advances sitPhase in ARC sub-mode', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_ARC,
        sitPhase: 0,
        sitSubModeTimer: 5,
        stateTimer: 10,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 1.0 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.sitPhase).toBeCloseTo(ROAMER_BUTTERFLY_SIT_ARC_SPEED * 1.0, 5);
    });

    it('does not advance sitPhase in IDLE sub-mode', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE,
        sitPhase: 0.5,
        sitSubModeTimer: 5,
        stateTimer: 10,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 1.0 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.sitPhase).toBe(0.5);
    });

    it('does not advance sitPhase in TURN sub-mode', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_TURN,
        sitPhase: 0.3,
        sitSubModeTimer: 5,
        stateTimer: 10,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 1.0 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.sitPhase).toBe(0.3);
    });
  });

  describe('SITTING sub-mode: arc position offset', () => {
    it('positions include arc offset in ARC sub-mode', () => {
      const anchorX = 200;
      const anchorY = 350;
      const initialSitPhase = 0;
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_ARC,
        sitPhase: initialSitPhase,
        sitSubModeTimer: 5,
        stateTimer: 10,
        positionX: anchorX,
        positionY: anchorY,
        targetFlowerX: anchorX,
        targetFlowerY: anchorY,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const dt = 1.0;
      const ctx = makeContext({ dt });
      const next = stepFlightStateMachine(state, ctx);
      const advancedPhase = initialSitPhase + ROAMER_BUTTERFLY_SIT_ARC_SPEED * dt;
      const expectedX = anchorX + Math.cos(advancedPhase) * ROAMER_BUTTERFLY_SIT_ARC_RADIUS;
      const expectedY = anchorY + Math.sin(advancedPhase) * ROAMER_BUTTERFLY_SIT_ARC_RADIUS * ROAMER_BUTTERFLY_SIT_ARC_VERTICAL_SQUASH;
      expect(next.positionX).toBeCloseTo(expectedX, 4);
      expect(next.positionY).toBeCloseTo(expectedY, 4);
    });

    it('positions hold at anchor in IDLE sub-mode', () => {
      const anchorX = 200;
      const anchorY = 350;
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_IDLE,
        sitSubModeTimer: 5,
        stateTimer: 10,
        positionX: anchorX,
        positionY: anchorY,
        targetFlowerX: anchorX,
        targetFlowerY: anchorY,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 1.0 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.positionX).toBe(anchorX);
      expect(next.positionY).toBe(anchorY);
    });
  });

  describe('SITTING sub-mode: on-place turn', () => {
    it('sets sitTurnTargetAngle when entering TURN sub-mode', () => {
      const state = makeState({
        flightState: FlightState.SITTING,
        sittingSubMode: ROAMER_BUTTERFLY_SIT_SUB_MODE_ARC,
        sitSubModeTimer: 0.01,
        stateTimer: 10,
        angle: 0,
        positionX: 200,
        positionY: 350,
        targetFlowerX: 200,
        targetFlowerY: 350,
        bodyScale: ROAMER_BUTTERFLY_SIT_BODY_SCALE,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.sittingSubMode).toBe(ROAMER_BUTTERFLY_SIT_SUB_MODE_TURN);
      expect(next.sitTurnTargetAngle).not.toBe(0);
    });
  });

  describe('FLYING_TURN state', () => {
    it('stays in FLYING_TURN while timer is positive', () => {
      const state = makeState({
        flightState: FlightState.FLYING_TURN,
        stateTimer: 0.5,
        wanderAngle: Math.PI / 2,
        positionX: 200,
        positionY: 300,
      });
      const ctx = makeContext({ dt: 0.1 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.FLYING_TURN);
      expect(next.stateTimer).toBeCloseTo(0.4, 4);
    });

    it('transitions to FLYING_CRUISE when timer expires', () => {
      const state = makeState({
        flightState: FlightState.FLYING_TURN,
        stateTimer: 0.01,
        wanderAngle: Math.PI / 2,
        positionX: 200,
        positionY: 300,
      });
      const ctx = makeContext({ dt: 0.02 });
      const next = stepFlightStateMachine(state, ctx);
      expect(next.flightState).toBe(FlightState.FLYING_CRUISE);
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
