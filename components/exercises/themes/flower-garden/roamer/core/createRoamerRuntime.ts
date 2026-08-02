import { makeMutable } from 'react-native-reanimated';
import type { RoamerConfig } from './roamerConfig';
import { FlightState, type RoamerSharedRuntime, type RoamerSpawn, type SwimZone } from './types';
import {
  BEE_LEG_COUNT,
} from '../bee/config/beeSimConfig';
import { beeRoamerConfig } from '../bee/config/beeSimConfig';
import {
  BUMBLEBEE_LEG_COUNT,
} from '../bumblebee/config/bumblebeeSimConfig';
import { bumblebeeRoamerConfig } from '../bumblebee/config/bumblebeeSimConfig';
import {
  ROAMER_BUTTERFLY_LEG_COUNT,
} from '../butterfly/config/butterflySimConfig';
import { butterflyRoamerConfig } from '../butterfly/config/butterflySimConfig';
import {
  clamp,
  cruiseDurationForPhase,
} from './roamerSimHelpers';

function pickSpeciesValues(spawn: RoamerSpawn): {
  legCount: number;
  roamerConfig: RoamerConfig;
} {
  switch (spawn.species) {
    case 'bee':
      return {
        legCount: BEE_LEG_COUNT,
        roamerConfig: beeRoamerConfig,
      };
    case 'bumblebee':
      return {
        legCount: BUMBLEBEE_LEG_COUNT,
        roamerConfig: bumblebeeRoamerConfig,
      };
    default:
      return {
        legCount: ROAMER_BUTTERFLY_LEG_COUNT,
        roamerConfig: butterflyRoamerConfig,
      };
  }
}

export function createRoamerRuntime(
  spawn: RoamerSpawn,
  swimZone: SwimZone,
): RoamerSharedRuntime {
  const { legCount, roamerConfig } = pickSpeciesValues(spawn);
  const bm = roamerConfig.boundaryMargin;
  return {
    spawn,
    config: roamerConfig,
    x: makeMutable(
      clamp(
        swimZone.x + spawn.xRatio * swimZone.w,
        swimZone.x + bm,
        swimZone.x + swimZone.w - bm,
      ),
    ),
    y: makeMutable(
      clamp(
        swimZone.y + spawn.yRatio * swimZone.h,
        swimZone.y + bm,
        swimZone.y + swimZone.h - bm,
      ),
    ),
    angle: makeMutable(spawn.initialAngle),
    speed: makeMutable(roamerConfig.baseSpeedMin),
    wingPhase: makeMutable(0),
    noisePhase: makeMutable(spawn.phase),
    idleNoisePhase: makeMutable(spawn.phase * 1.7),
    pathCoeff: makeMutable(0.5),
    state: makeMutable(FlightState.FLYING_CRUISE),
    stateTimer: makeMutable(cruiseDurationForPhase(spawn.phase, roamerConfig)),
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
    sitOffsetX: makeMutable(0),
    sitOffsetY: makeMutable(0),
    sitTargetOffsetX: makeMutable(0),
    sitTargetOffsetY: makeMutable(0),
    sitActionTimer: makeMutable(0),
    legPhases: Array.from({ length: legCount }, () => makeMutable(0)),
    legVisibility: makeMutable(0),
    isPreTakeoff: makeMutable(0),
    exitLegsX: makeMutable<number[]>([]),
    exitLegsY: makeMutable<number[]>([]),
    exitLegIndex: makeMutable(0),
  };
}
