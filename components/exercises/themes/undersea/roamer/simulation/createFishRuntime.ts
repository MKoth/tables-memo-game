import { makeMutable } from 'react-native-reanimated';
import { ROAMER_FISH_BODY_INSET } from '../config/roamerInstanceConfig';
import {
  ROAMER_FISH_STATE_SWIMMING,
  ROAMER_SPAWN_INITIAL_AMPLITUDE_RATIO,
  ROAMER_SPAWN_INITIAL_SPEED_RATIO,
} from '../config/roamerSimConfig';
import type { FishConfig, FishRuntime, SwimZone } from './types';
import {
  applyFinSideSpawn,
  nextFinRerollDelay,
  rollFinSideSpawn,
} from './fishFinSpawn';
import {
  clamp,
  pickRandomBaseSpeed,
  swimDurationForSpeed,
} from './fishSimCommon';

// makeMutable is intentional here: fish count is dynamic and values are created in a factory loop.
export function createFishRuntime(config: FishConfig, swimZone: SwimZone): FishRuntime {
  const initSpeed = pickRandomBaseSpeed();
  const initFinLeft = rollFinSideSpawn(config, config.phase * 2.3);
  const initFinRight = rollFinSideSpawn(config, config.phase * 4.1 + 1.3);

  const fish: FishRuntime = {
    config,
    x: makeMutable(
      clamp(
        swimZone.x + config.xRatio * swimZone.w,
        swimZone.x + ROAMER_FISH_BODY_INSET,
        swimZone.x + swimZone.w - ROAMER_FISH_BODY_INSET,
      ),
    ),
    y: makeMutable(
      clamp(
        swimZone.y + config.yRatio * swimZone.h,
        swimZone.y + ROAMER_FISH_BODY_INSET,
        swimZone.y + swimZone.h - ROAMER_FISH_BODY_INSET,
      ),
    ),
    angle: makeMutable(config.initialAngle),
    speed: makeMutable(initSpeed * ROAMER_SPAWN_INITIAL_SPEED_RATIO),
    amplitude: makeMutable(config.targetAmplitude * ROAMER_SPAWN_INITIAL_AMPLITUDE_RATIO),
    turnArc: makeMutable(0),
    prevAngle: makeMutable(config.initialAngle),
    wanderAngle: makeMutable(config.initialAngle),
    state: makeMutable(ROAMER_FISH_STATE_SWIMMING),
    stateTimer: makeMutable(swimDurationForSpeed(initSpeed, config.phase)),
    targetBaseSpeed: makeMutable(initSpeed),
    wavePhase: makeMutable(0),
    wasNearEdge: makeMutable(false),
    finSquashLeft: makeMutable(
      config.finSquashBase + config.finSquashAmp * (0.5 - 0.5 * Math.cos(initFinLeft.initialPhase)),
    ),
    finSquashRight: makeMutable(
      config.finSquashBase + config.finSquashAmp * (0.5 - 0.5 * Math.cos(initFinRight.initialPhase)),
    ),
    finPhaseLeft: makeMutable(initFinLeft.initialPhase),
    finPhaseRight: makeMutable(initFinRight.initialPhase),
    finVariantLeft: makeMutable<number>(initFinLeft.variant),
    finVariantRight: makeMutable<number>(initFinRight.variant),
    finFreqLeft: makeMutable(initFinLeft.freq),
    finFreqRight: makeMutable(initFinRight.freq),
    finRerollTimerLeft: makeMutable(
      nextFinRerollDelay(config.finBehaviorRerollInterval, config.finBehaviorRerollJitter),
    ),
    finRerollTimerRight: makeMutable(
      nextFinRerollDelay(config.finBehaviorRerollInterval, config.finBehaviorRerollJitter),
    ),
  };

  applyFinSideSpawn(fish, 'left', initFinLeft, config);
  applyFinSideSpawn(fish, 'right', initFinRight, config);

  return fish;
}
