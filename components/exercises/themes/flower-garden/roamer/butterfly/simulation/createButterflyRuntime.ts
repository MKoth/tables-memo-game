import { makeMutable } from 'react-native-reanimated';
import { FlightState, type ButterflySharedRuntime, type ButterflySpawn, type SwimZone } from './types';
import {
  ROAMER_BUTTERFLY_BOUNDARY_MARGIN,
} from '../config/butterflySimConfig';
import {
  clamp,
  cruiseDurationForPhase,
  pickTargetBaseSpeed,
  pickWanderAngle,
} from './butterflySimHelpers';

export function createButterflyRuntime(
  spawn: ButterflySpawn,
  swimZone: SwimZone,
): ButterflySharedRuntime {
  const initSpeed = pickTargetBaseSpeed(spawn.phase);
  const initWanderAngle = pickWanderAngle(spawn.initialAngle, spawn.phase);

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
    speed: makeMutable(initSpeed * 0.5),
    wingPhase: makeMutable(0),
    state: makeMutable(FlightState.FLYING_CRUISE),
    stateTimer: makeMutable(cruiseDurationForPhase(spawn.phase)),
    wanderAngle: makeMutable(initWanderAngle),
    prevAngle: makeMutable(spawn.initialAngle),
    targetBaseSpeed: makeMutable(initSpeed),
  };
}
