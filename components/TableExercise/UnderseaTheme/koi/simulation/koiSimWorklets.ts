import { makeMutable } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  KOI_SETTINGS,
  type FinSideSpawn,
} from '../config/koiFishLayerConfig';
import { KOI_FISH_BODY_INSET } from '../config/koiInstanceConfig';
import {
  KOI_AMPLITUDE_LERP,
  KOI_ANGLE_LERP,
  KOI_BASE_SPEED_MAX,
  KOI_BASE_SPEED_MIN,
  KOI_BOUNDARY_TURN_OFFSET,
  KOI_EXIT_COMPLETE_BODY_RATIO,
  KOI_FISH_STATE_IDLE,
  KOI_FISH_STATE_SWIMMING,
  KOI_IDLE_RETRACT_AMPLITUDE_RATIO,
  KOI_SPEED_LERP_FACTOR,
  KOI_SPLASH_FAST_MIN_NORM,
  KOI_SPLASH_MIN_DELTA_NORM,
  KOI_SPLASH_SLOW_MAX_NORM,
  KOI_SPAWN_INITIAL_AMPLITUDE_RATIO,
  KOI_SPAWN_INITIAL_SPEED_RATIO,
  KOI_TURN_ARC_LERP,
  KOI_WANDER_LERP,
} from '../config/koiSimConfig';
import type { FishConfig, FishRuntime, SwimZone } from './types';
import {
  clamp,
  idleDurationForPhase,
  lerp,
  lerpAngle,
  pickRandomBaseSpeed,
  pickWanderAngle,
  swimDurationForSpeed,
  swimSpeedForForwardSpeed,
  updateFinBehavior,
  updateTurnArc,
} from './fishSimCommon';

export {
  clamp,
  KOI_BASE_SPEED_MAX,
  lerp,
  lerpAngle,
  normalizeAngle,
} from './fishSimCommon';

export function shouldTriggerSpeedSplash(prev: number, next: number): boolean {
  'worklet';
  if (next <= prev) {
    return false;
  }
  const range = KOI_BASE_SPEED_MAX - KOI_BASE_SPEED_MIN;
  const prevNorm = (prev - KOI_BASE_SPEED_MIN) / range;
  const nextNorm = (next - KOI_BASE_SPEED_MIN) / range;
  return (
    prevNorm <= KOI_SPLASH_SLOW_MAX_NORM &&
    nextNorm >= KOI_SPLASH_FAST_MIN_NORM &&
    nextNorm - prevNorm >= KOI_SPLASH_MIN_DELTA_NORM
  );
}

export function rollTargetBaseSpeed(fish: FishRuntime, onIncrease?: () => void): void {
  'worklet';
  const prev = fish.targetBaseSpeed.value;
  const next = pickRandomBaseSpeed();
  fish.targetBaseSpeed.value = next;
  if (onIncrease != null && shouldTriggerSpeedSplash(prev, next)) {
    scheduleOnRN(onIncrease);
  }
}

export function nextFinRerollDelay(interval: number, jitter: number): number {
  if (interval <= 0) {
    return Number.MAX_VALUE;
  }
  return interval + Math.random() * jitter;
}

export function rollFinSideSpawn(settings: typeof KOI_SETTINGS, freqSeed: number): FinSideSpawn {
  const variant = Math.random() < settings.finThinProbability ? 1 : 0;
  const base = variant === 1 ? settings.finThinFreqBase : settings.finRetractFreqBase;
  const jitter = variant === 1 ? settings.finThinFreqJitter : settings.finRetractFreqJitter;
  const freq = base + Math.sin(freqSeed) * jitter;

  return {
    variant,
    freq,
    initialPhase: Math.random() * Math.PI * 2,
  };
}

export function finSquashAtPhase(phase: number, base: number, amp: number): number {
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

export function applyFinSideSpawn(
  fish: FishRuntime,
  side: 'left' | 'right',
  spawn: FinSideSpawn,
  config: FishConfig,
): void {
  const rerollDelay = nextFinRerollDelay(
    config.finBehaviorRerollInterval,
    config.finBehaviorRerollJitter,
  );

  if (side === 'left') {
    fish.finVariantLeft.value = spawn.variant;
    fish.finFreqLeft.value = spawn.freq;
    fish.finPhaseLeft.value = spawn.initialPhase;
    fish.finSquashLeft.value = finSquashAtPhase(
      spawn.initialPhase,
      config.finSquashBase,
      config.finSquashAmp,
    );
    fish.finRerollTimerLeft.value = rerollDelay;
    return;
  }

  fish.finVariantRight.value = spawn.variant;
  fish.finFreqRight.value = spawn.freq;
  fish.finPhaseRight.value = spawn.initialPhase;
  fish.finSquashRight.value = finSquashAtPhase(
    spawn.initialPhase,
    config.finSquashBase,
    config.finSquashAmp,
  );
  fish.finRerollTimerRight.value = rerollDelay;
}

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
        swimZone.x + KOI_FISH_BODY_INSET,
        swimZone.x + swimZone.w - KOI_FISH_BODY_INSET,
      ),
    ),
    y: makeMutable(
      clamp(
        swimZone.y + config.yRatio * swimZone.h,
        swimZone.y + KOI_FISH_BODY_INSET,
        swimZone.y + swimZone.h - KOI_FISH_BODY_INSET,
      ),
    ),
    angle: makeMutable(config.initialAngle),
    speed: makeMutable(initSpeed * KOI_SPAWN_INITIAL_SPEED_RATIO),
    amplitude: makeMutable(config.targetAmplitude * KOI_SPAWN_INITIAL_AMPLITUDE_RATIO),
    turnArc: makeMutable(0),
    prevAngle: makeMutable(config.initialAngle),
    wanderAngle: makeMutable(config.initialAngle),
    state: makeMutable(KOI_FISH_STATE_SWIMMING),
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

export function updateFish(
  fish: FishRuntime,
  dt: number,
  steerMinX: number,
  steerMaxX: number,
  steerMinY: number,
  steerMaxY: number,
  hardMinX: number,
  hardMaxX: number,
  hardMinY: number,
  hardMaxY: number,
  centerX: number,
  centerY: number,
  onSpeedIncrease?: () => void,
): void {
  'worklet';
  const cfg = fish.config;

  if (fish.state.value === KOI_FISH_STATE_SWIMMING) {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      cfg.targetAmplitude,
      Math.min(1, KOI_AMPLITUDE_LERP * dt),
    );

    const swimSpeed = fish.targetBaseSpeed.value;
    fish.speed.value = lerp(
      fish.speed.value,
      swimSpeed,
      Math.min(1, KOI_SPEED_LERP_FACTOR * dt),
    );

    fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
    fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

    const nearEdge =
      fish.x.value < steerMinX ||
      fish.x.value > steerMaxX ||
      fish.y.value < steerMinY ||
      fish.y.value > steerMaxY;

    if (nearEdge) {
      const toCenter = Math.atan2(centerY - fish.y.value, centerX - fish.x.value);
      const offset = Math.sin(cfg.phase * 5.1) * KOI_BOUNDARY_TURN_OFFSET;
      const turnTarget = toCenter + offset;
      fish.angle.value = lerpAngle(fish.angle.value, turnTarget, Math.min(1, KOI_ANGLE_LERP * dt));
      fish.wanderAngle.value = turnTarget;
    } else {
      fish.angle.value = lerpAngle(
        fish.angle.value,
        fish.wanderAngle.value,
        Math.min(1, KOI_WANDER_LERP * dt),
      );

      if (fish.wasNearEdge.value) {
        rollTargetBaseSpeed(fish, onSpeedIncrease);
        fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
        fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
      }
    }

    fish.wasNearEdge.value = nearEdge;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = KOI_FISH_STATE_IDLE;
      fish.wasNearEdge.value = false;
      fish.speed.value = KOI_BASE_SPEED_MIN;
      fish.prevAngle.value = fish.angle.value;
      fish.turnArc.value = 0;
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      -cfg.targetAmplitude * KOI_IDLE_RETRACT_AMPLITUDE_RATIO,
      Math.min(1, KOI_AMPLITUDE_LERP * dt),
    );

    fish.speed.value = KOI_BASE_SPEED_MIN;
    const retractAngle = fish.angle.value + Math.PI;
    fish.x.value += Math.cos(retractAngle) * KOI_BASE_SPEED_MIN * dt;
    fish.y.value += Math.sin(retractAngle) * KOI_BASE_SPEED_MIN * dt;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = KOI_FISH_STATE_SWIMMING;
      fish.wasNearEdge.value = false;
      rollTargetBaseSpeed(fish, onSpeedIncrease);
      fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
      fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
    }
  }

  fish.x.value = clamp(fish.x.value, hardMinX, hardMaxX);
  fish.y.value = clamp(fish.y.value, hardMinY, hardMaxY);

  const waveFreq =
    fish.state.value === KOI_FISH_STATE_SWIMMING
      ? swimSpeedForForwardSpeed(fish.targetBaseSpeed.value)
      : swimSpeedForForwardSpeed(fish.speed.value);
  fish.wavePhase.value = (fish.wavePhase.value + waveFreq * dt) % (Math.PI * 2);

  if (fish.state.value === KOI_FISH_STATE_SWIMMING) {
    updateTurnArc(fish, dt);
  } else {
    fish.turnArc.value = lerp(fish.turnArc.value, 0, Math.min(1, KOI_TURN_ARC_LERP * dt));
    fish.prevAngle.value = fish.angle.value;
  }
  updateFinBehavior(fish, dt);
}

export function isFishEliminated(eliminated: number[], fishIndex: number): boolean {
  'worklet';
  for (let i = 0; i < eliminated.length; i++) {
    if (eliminated[i] === fishIndex) {
      return true;
    }
  }
  return false;
}

export function fishCrossedExitDismiss(
  fish: FishRuntime,
  exitEdge: number,
  screenW: number,
  screenH: number,
): boolean {
  'worklet';
  if (exitEdge === 0) {
    return fish.y.value < 0;
  }
  if (exitEdge === 1) {
    return fish.y.value > screenH;
  }
  if (exitEdge === 2) {
    return fish.x.value < 0;
  }
  return fish.x.value > screenW;
}

export function fishCrossedExitComplete(
  fish: FishRuntime,
  exitEdge: number,
  fishBodyInset: number,
  screenW: number,
  screenH: number,
): boolean {
  'worklet';
  const threshold = fishBodyInset * KOI_EXIT_COMPLETE_BODY_RATIO;
  if (exitEdge === 0) {
    return fish.y.value + threshold < 0;
  }
  if (exitEdge === 1) {
    return fish.y.value - threshold > screenH;
  }
  if (exitEdge === 2) {
    return fish.x.value + threshold < 0;
  }
  return fish.x.value - threshold > screenW;
}
