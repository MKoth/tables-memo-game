import { makeMutable } from 'react-native-reanimated';
import { FlightState, type ButterflySharedRuntime, type ButterflySpawn, type SwimZone } from './types';
import {
  ROAMER_BUTTERFLY_BASE_SPEED_MIN,
  ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
} from '../config/butterflySimConfig';
import {
  clamp,
  cruiseDurationForPhase,
} from './butterflySimHelpers';

export function createButterflyRuntime(
  spawn: ButterflySpawn,
  swimZone: SwimZone,
): ButterflySharedRuntime {
  return {
    spawn,
    x: makeMutable(
      clamp(
        swimZone.x + spawn.xRatio * swimZone.w,
        swimZone.x + ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
        swimZone.x + swimZone.w - ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
      ),
    ),
    y: makeMutable(
      clamp(
        swimZone.y + spawn.yRatio * swimZone.h,
        swimZone.y + ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
        swimZone.y + swimZone.h - ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
      ),
    ),
    angle: makeMutable(spawn.initialAngle),
    speed: makeMutable(ROAMER_BUTTERFLY_BASE_SPEED_MIN),
    wingPhase: makeMutable(0),
    noisePhase: makeMutable(spawn.phase),
    idleNoisePhase: makeMutable(spawn.phase * 1.7),
    pathCoeff: makeMutable(0.5),
    state: makeMutable(FlightState.FLYING_CRUISE),
    stateTimer: makeMutable(cruiseDurationForPhase(spawn.phase)),
    wanderAngle: makeMutable(spawn.initialAngle),
    prevAngle: makeMutable(spawn.initialAngle),
    bodyScale: makeMutable(1),
    targetFlowerIndex: makeMutable(-1),
    targetFlowerX: makeMutable(0),
    targetFlowerY: makeMutable(0),
    sitTimer: makeMutable(0),
    approachOrbitTimer: makeMutable(0),
    sitWingPauseTimer: makeMutable(0),
    sitWingPauseTriggered: makeMutable(0),
  };
}
