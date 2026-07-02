import { makeMutable } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  KOI_SETTINGS,
  type FinSideSpawn,
} from '../KoiFishLayer';
import type { FishConfig, FishRuntime, SwimZone } from './types';

const KOI_BASE_LENGTH = 120;
const SWIMMING = 0;
const IDLE = 1;
const BASE_SPEED_MIN = 50;
const BASE_SPEED_MAX = 670;
const SPEED_PICK_BIAS = 15.5;
const SPLASH_SLOW_MAX_NORM = 0.4;
const SPLASH_FAST_MIN_NORM = 0.6;
const SPLASH_MIN_DELTA_NORM = 0.28;
const SWIM_SPEED_SHADER_MIN = 2.5;
const SWIM_SPEED_SHADER_MAX = 90.0;
const SWIM_DURATION_MIN = 0.1;
const SWIM_DURATION_MAX = 12.0;
const SWIM_DURATION_JITTER = 1.5;
const IDLE_DURATION_BASE = 2.0;
const IDLE_DURATION_JITTER = 0.6;
const AMPLITUDE_LERP = 3.5;
const ANGLE_LERP = 2.5;
const TURN_ARC_LERP = 3.5;
const TURN_ARC_MAX = 0.4;
const WANDER_LERP = 0.6;
const BOUNDARY_TURN_OFFSET = Math.PI * 0.25;
const FISH_BODY_INSET = (KOI_BASE_LENGTH * KOI_SETTINGS.scale) / 2;

export function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

export function normalizeAngle(angle: number): number {
  'worklet';
  const twoPi = Math.PI * 2;
  let a = angle % twoPi;
  if (a > Math.PI) {
    a -= twoPi;
  }
  if (a < -Math.PI) {
    a += twoPi;
  }
  return a;
}

export function lerpAngle(from: number, to: number, t: number): number {
  'worklet';
  const delta = normalizeAngle(to - from);
  return from + delta * t;
}

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

export function pickRandomBaseSpeed(): number {
  'worklet';
  const t = Math.pow(Math.random(), SPEED_PICK_BIAS);
  return BASE_SPEED_MIN + t * (BASE_SPEED_MAX - BASE_SPEED_MIN);
}

export function shouldTriggerSpeedSplash(prev: number, next: number): boolean {
  'worklet';
  if (next <= prev) {
    return false;
  }
  const range = BASE_SPEED_MAX - BASE_SPEED_MIN;
  const prevNorm = (prev - BASE_SPEED_MIN) / range;
  const nextNorm = (next - BASE_SPEED_MIN) / range;
  return (
    prevNorm <= SPLASH_SLOW_MAX_NORM &&
    nextNorm >= SPLASH_FAST_MIN_NORM &&
    nextNorm - prevNorm >= SPLASH_MIN_DELTA_NORM
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

export function swimSpeedForForwardSpeed(speed: number): number {
  'worklet';
  const t = clamp((speed - BASE_SPEED_MIN) / (BASE_SPEED_MAX - BASE_SPEED_MIN), 0, 1);
  return SWIM_SPEED_SHADER_MIN + t * (SWIM_SPEED_SHADER_MAX - SWIM_SPEED_SHADER_MIN);
}

export function idleDurationForPhase(phase: number): number {
  'worklet';
  return IDLE_DURATION_BASE + (phase % IDLE_DURATION_JITTER);
}

export function swimDurationForSpeed(speed: number, phase: number): number {
  'worklet';
  const t = clamp((speed - BASE_SPEED_MIN) / (BASE_SPEED_MAX - BASE_SPEED_MIN), 0, 1);
  const base = SWIM_DURATION_MAX - t * (SWIM_DURATION_MAX - SWIM_DURATION_MIN);
  return base + (phase % SWIM_DURATION_JITTER);
}

export function pickWanderAngle(currentAngle: number, phase: number): number {
  'worklet';
  const sign = Math.sin(phase * 3.7) > 0 ? 1 : -1;
  const deviation = (0.35 + Math.abs(Math.sin(phase * 11.3)) * 0.8) * Math.PI * sign;
  return currentAngle + deviation;
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
        swimZone.x + FISH_BODY_INSET,
        swimZone.x + swimZone.w - FISH_BODY_INSET,
      ),
    ),
    y: makeMutable(
      clamp(
        swimZone.y + config.yRatio * swimZone.h,
        swimZone.y + FISH_BODY_INSET,
        swimZone.y + swimZone.h - FISH_BODY_INSET,
      ),
    ),
    angle: makeMutable(config.initialAngle),
    speed: makeMutable(initSpeed * 0.5),
    amplitude: makeMutable(config.targetAmplitude * 0.5),
    turnArc: makeMutable(0),
    prevAngle: makeMutable(config.initialAngle),
    wanderAngle: makeMutable(config.initialAngle),
    state: makeMutable(SWIMMING),
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

export function rerollFinSide(fish: FishRuntime, side: 'left' | 'right'): void {
  'worklet';
  const cfg = fish.config;
  const variant = Math.random() < cfg.finThinProbability ? 1 : 0;
  const base = variant === 1 ? cfg.finThinFreqBase : cfg.finRetractFreqBase;
  const jitter = variant === 1 ? cfg.finThinFreqJitter : cfg.finRetractFreqJitter;
  const freq = base + (Math.random() * 2 - 1) * jitter;
  const finPhase = Math.random() * Math.PI * 2;
  const rerollDelay =
    cfg.finBehaviorRerollInterval <= 0
      ? Number.MAX_VALUE
      : cfg.finBehaviorRerollInterval + Math.random() * cfg.finBehaviorRerollJitter;

  if (side === 'left') {
    fish.finVariantLeft.value = variant;
    fish.finFreqLeft.value = freq;
    fish.finPhaseLeft.value = finPhase;
    fish.finSquashLeft.value =
      cfg.finSquashBase + cfg.finSquashAmp * (0.5 - 0.5 * Math.cos(finPhase));
    fish.finRerollTimerLeft.value = rerollDelay;
    return;
  }

  fish.finVariantRight.value = variant;
  fish.finFreqRight.value = freq;
  fish.finPhaseRight.value = finPhase;
  fish.finSquashRight.value =
    cfg.finSquashBase + cfg.finSquashAmp * (0.5 - 0.5 * Math.cos(finPhase));
  fish.finRerollTimerRight.value = rerollDelay;
}

export function finSquashFromPhase(phase: number, base: number, amp: number): number {
  'worklet';
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

export function updateFinBehavior(fish: FishRuntime, dt: number): void {
  'worklet';
  const { finSquashBase, finSquashAmp, finBehaviorRerollInterval } = fish.config;

  if (finBehaviorRerollInterval > 0) {
    fish.finRerollTimerLeft.value -= dt;
    if (fish.finRerollTimerLeft.value <= 0) {
      rerollFinSide(fish, 'left');
    }

    fish.finRerollTimerRight.value -= dt;
    if (fish.finRerollTimerRight.value <= 0) {
      rerollFinSide(fish, 'right');
    }
  }

  fish.finPhaseLeft.value += dt * fish.finFreqLeft.value;
  fish.finPhaseRight.value += dt * fish.finFreqRight.value;
  fish.finSquashLeft.value = finSquashFromPhase(
    fish.finPhaseLeft.value,
    finSquashBase,
    finSquashAmp,
  );
  fish.finSquashRight.value = finSquashFromPhase(
    fish.finPhaseRight.value,
    finSquashBase,
    finSquashAmp,
  );
}

export function updateTurnArc(fish: FishRuntime, dt: number): void {
  'worklet';
  const omega = normalizeAngle(fish.angle.value - fish.prevAngle.value) / dt;
  fish.prevAngle.value = fish.angle.value;
  const turnTarget = clamp(
    -omega * fish.config.turnArcGain,
    -TURN_ARC_MAX,
    TURN_ARC_MAX,
  );
  fish.turnArc.value = lerp(
    fish.turnArc.value,
    turnTarget,
    Math.min(1, TURN_ARC_LERP * dt),
  );
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
  const IDLE_RETRACT_AMPLITUDE_RATIO = 0.3;

  if (fish.state.value === SWIMMING) {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      cfg.targetAmplitude,
      Math.min(1, AMPLITUDE_LERP * dt),
    );

    const swimSpeed = fish.targetBaseSpeed.value;
    fish.speed.value = lerp(fish.speed.value, swimSpeed, Math.min(1, 4 * dt));

    fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
    fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

    const nearEdge =
      fish.x.value < steerMinX ||
      fish.x.value > steerMaxX ||
      fish.y.value < steerMinY ||
      fish.y.value > steerMaxY;

    if (nearEdge) {
      const toCenter = Math.atan2(centerY - fish.y.value, centerX - fish.x.value);
      const offset = Math.sin(cfg.phase * 5.1) * BOUNDARY_TURN_OFFSET;
      const turnTarget = toCenter + offset;
      fish.angle.value = lerpAngle(fish.angle.value, turnTarget, Math.min(1, ANGLE_LERP * dt));
      fish.wanderAngle.value = turnTarget;
    } else {
      fish.angle.value = lerpAngle(
        fish.angle.value,
        fish.wanderAngle.value,
        Math.min(1, WANDER_LERP * dt),
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
      fish.state.value = IDLE;
      fish.wasNearEdge.value = false;
      fish.speed.value = BASE_SPEED_MIN;
      fish.prevAngle.value = fish.angle.value;
      fish.turnArc.value = 0;
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      -cfg.targetAmplitude * IDLE_RETRACT_AMPLITUDE_RATIO,
      Math.min(1, AMPLITUDE_LERP * dt),
    );

    fish.speed.value = BASE_SPEED_MIN;
    const retractAngle = fish.angle.value + Math.PI;
    fish.x.value += Math.cos(retractAngle) * BASE_SPEED_MIN * dt;
    fish.y.value += Math.sin(retractAngle) * BASE_SPEED_MIN * dt;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = SWIMMING;
      fish.wasNearEdge.value = false;
      rollTargetBaseSpeed(fish, onSpeedIncrease);
      fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
      fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
    }
  }

  fish.x.value = clamp(fish.x.value, hardMinX, hardMaxX);
  fish.y.value = clamp(fish.y.value, hardMinY, hardMaxY);

  const waveFreq =
    fish.state.value === SWIMMING
      ? swimSpeedForForwardSpeed(fish.targetBaseSpeed.value)
      : swimSpeedForForwardSpeed(fish.speed.value);
  fish.wavePhase.value = (fish.wavePhase.value + waveFreq * dt) % (Math.PI * 2);

  if (fish.state.value === SWIMMING) {
    updateTurnArc(fish, dt);
  } else {
    fish.turnArc.value = lerp(fish.turnArc.value, 0, Math.min(1, TURN_ARC_LERP * dt));
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
  const threshold = fishBodyInset * 0.35;
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
