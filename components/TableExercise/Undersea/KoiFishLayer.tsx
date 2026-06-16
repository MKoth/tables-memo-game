import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { KoiInstance, KoiShadowInstance } from './KoiInstance';

const KOI_BASE_LENGTH = 120;
const KOI_BASE_THICKNESS = 38;
const SWIM_ZONE_TOP_RATIO = 0;
const SWIM_ZONE_MARGIN = 0;

/** Number of koi fish in the swim zone. */
export const KOI_COUNT = 3;

/** Shared settings applied to every fish. */
export const KOI_SETTINGS = {
  sourceAngle: Math.PI / 2,
  scale: 1.0,
  targetAmplitude: 0.14,
  tailBendScale: 5.5,
  tailTipBendScale: 7.5,
  headBendScale: 0.35,
  /** Turn body arc strength — scales angular velocity into shader bend (higher = tighter arc). */
  turnArcGain: 0.28,
  /** Shorten fish length per unit |turnArc| (counter stretch on turns). */
  turnSquashGain: 0.2,
  /** Widen fish thickness per unit |turnArc| (counter thinning on turns). */
  turnBulgeGain: 0.2,
  /** P(fin side uses thin). 0.5 = equal thin vs retract per side. */
  finThinProbability: 0.5,
  /** Retract/restore oscillation rate (radians per second). */
  finRetractFreqBase: 4.8,
  /** Thin/restore oscillation rate (radians per second). */
  finThinFreqBase: 5.5,
  /** Per-side retract frequency jitter. */
  finRetractFreqJitter: 0.25,
  /** Per-side thin frequency jitter. */
  finThinFreqJitter: 0.25,
  /** Minimum fin squash when oscillating (0 = none, 1 = full). */
  finSquashBase: 0.1,
  /** Fin squash oscillation amplitude added on top of finSquashBase. */
  finSquashAmp: 0.5,
  /** Seconds between fin-behavior rerolls per side (0 = disabled). */
  finBehaviorRerollInterval: 3.5,
  /** Random extra delay added to each fin-side reroll timer. */
  finBehaviorRerollJitter: 2.0,
} as const;

/** px — shadow offset from fish center (light from above-left). */
const SHADOW_OFFSET_X = 30;
const SHADOW_OFFSET_Y = 70;
const SHADOW_COLOR = [0.02, 0.06, 0.12] as const;
const SHADOW_OPACITY = 0.15;
const SHADOW_SOFTNESS = 0.45;

/** px — inset fish center from swim-zone edges so bodies are not clipped by the render Rect. */
const FISH_BODY_INSET = (KOI_BASE_LENGTH * KOI_SETTINGS.scale) / 2;

const SWIMMING = 0;
const IDLE = 1;
const IDLE_HOLD = 0;
const IDLE_RETRACT = 1;

const BASE_SPEED_MIN = 50;
const BASE_SPEED_MAX = 670;
/** >1 biases random speed picks toward BASE_SPEED_MIN (higher = more slow fish). */
const SPEED_PICK_BIAS = 15.5;
/** Shader tail-wave angular rate at BASE_SPEED_MIN (radians per second). */
const SWIM_SPEED_SHADER_MIN = 2.5;
/** Shader tail-wave angular rate at BASE_SPEED_MAX (radians per second). */
const SWIM_SPEED_SHADER_MAX = 90.0;

/** Swim bout length at max speed (seconds) — fast fish tire sooner. */
const SWIM_DURATION_MIN = 0.1;
/** Swim bout length at min speed (seconds). */
const SWIM_DURATION_MAX = 12.0;
const SWIM_DURATION_JITTER = 1.5;
/** Base idle pause before the fish can swim again (seconds). */
const IDLE_DURATION_BASE = 2.0;
const IDLE_DURATION_JITTER = 0.6;
/** P(idle bout is slow backward retract vs full stop). */
const IDLE_RETRACT_PROBABILITY = 0.4;
/** Tail swing while backing up during idle retract. */
const IDLE_RETRACT_AMPLITUDE_RATIO = 0.3;

const AMPLITUDE_LERP = 3.5;
const ANGLE_LERP = 2.5;
const TURN_ARC_LERP = 3.5;
/** Max body bend during turns — keeps shader shear within a fish-like range. */
const TURN_ARC_MAX = 0.4;
const WANDER_LERP = 0.6;
const BOUNDARY_MARGIN_RATIO = 0.18;
/** Max turn offset when steering away from swim-zone edges (radians). */
const BOUNDARY_TURN_OFFSET = Math.PI * 0.25;
/** px — roughly half KOI_BASE_LENGTH; steer zone before bodies overlap. */
const SEPARATION_RADIUS = 75;
/** lerp strength multiplier for avoidance angle. */
const SEPARATION_STEER = 10.0;

export type FinSideSpawn = {
  /** 0 = perp-retract, 1 = along-thin. */
  variant: 0 | 1;
  freq: number;
  initialPhase: number;
};

export type KoiImageKey = 'koi1' | 'koi2';

export type KoiSharedSettings = typeof KOI_SETTINGS;

type KoiSpawn = {
  imageKey: KoiImageKey;
  xRatio: number;
  yRatio: number;
  phase: number;
  initialAngle: number;
};

type FishConfig = KoiSharedSettings & KoiSpawn;

type FishRuntime = {
  config: FishConfig;
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  speed: SharedValue<number>;
  amplitude: SharedValue<number>;
  turnArc: SharedValue<number>;
  prevAngle: SharedValue<number>;
  wanderAngle: SharedValue<number>;
  state: SharedValue<number>;
  stateTimer: SharedValue<number>;
  idleMode: SharedValue<number>;
  targetBaseSpeed: SharedValue<number>;
  wavePhase: SharedValue<number>;
  wasNearEdge: SharedValue<boolean>;
  finSquashLeft: SharedValue<number>;
  finSquashRight: SharedValue<number>;
  finPhaseLeft: SharedValue<number>;
  finPhaseRight: SharedValue<number>;
  finVariantLeft: SharedValue<number>;
  finVariantRight: SharedValue<number>;
  finFreqLeft: SharedValue<number>;
  finFreqRight: SharedValue<number>;
  finRerollTimerLeft: SharedValue<number>;
  finRerollTimerRight: SharedValue<number>;
};

type SwimZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function nextFinRerollDelay(interval: number, jitter: number): number {
  if (interval <= 0) {
    return Number.MAX_VALUE;
  }
  return interval + Math.random() * jitter;
}

function rollFinSideSpawn(
  settings: KoiSharedSettings,
  freqSeed: number,
): FinSideSpawn {
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

function rollFinSideSpawnWorklet(
  finThinProbability: number,
  finRetractFreqBase: number,
  finThinFreqBase: number,
  finRetractFreqJitter: number,
  finThinFreqJitter: number,
): { variant: number; freq: number; phase: number } {
  'worklet';
  const variant = Math.random() < finThinProbability ? 1 : 0;
  const base = variant === 1 ? finThinFreqBase : finRetractFreqBase;
  const jitter = variant === 1 ? finThinFreqJitter : finRetractFreqJitter;
  const freq = base + (Math.random() * 2 - 1) * jitter;
  const phase = Math.random() * Math.PI * 2;

  return { variant, freq, phase };
}

function nextFinRerollDelayWorklet(interval: number, jitter: number): number {
  'worklet';
  if (interval <= 0) {
    return Number.MAX_VALUE;
  }
  return interval + Math.random() * jitter;
}

function finSquashFromPhase(phase: number, base: number, amp: number): number {
  'worklet';
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

function finSquashAtPhase(phase: number, base: number, amp: number): number {
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

function rerollFinSide(fish: FishRuntime, side: 'left' | 'right'): void {
  'worklet';
  const cfg = fish.config;
  const rolled = rollFinSideSpawnWorklet(
    cfg.finThinProbability,
    cfg.finRetractFreqBase,
    cfg.finThinFreqBase,
    cfg.finRetractFreqJitter,
    cfg.finThinFreqJitter,
  );

  if (side === 'left') {
    fish.finVariantLeft.value = rolled.variant;
    fish.finFreqLeft.value = rolled.freq;
    fish.finPhaseLeft.value = rolled.phase;
    fish.finSquashLeft.value = finSquashFromPhase(
      rolled.phase,
      cfg.finSquashBase,
      cfg.finSquashAmp,
    );
    fish.finRerollTimerLeft.value = nextFinRerollDelayWorklet(
      cfg.finBehaviorRerollInterval,
      cfg.finBehaviorRerollJitter,
    );
    return;
  }

  fish.finVariantRight.value = rolled.variant;
  fish.finFreqRight.value = rolled.freq;
  fish.finPhaseRight.value = rolled.phase;
  fish.finSquashRight.value = finSquashFromPhase(
    rolled.phase,
    cfg.finSquashBase,
    cfg.finSquashAmp,
  );
  fish.finRerollTimerRight.value = nextFinRerollDelayWorklet(
    cfg.finBehaviorRerollInterval,
    cfg.finBehaviorRerollJitter,
  );
}

function createRandomSpawns(count: number): KoiSpawn[] {
  return Array.from({ length: count }, () => ({
    imageKey: Math.random() < 0.5 ? 'koi1' : 'koi2',
    xRatio: 0.12 + Math.random() * 0.76,
    yRatio: 0.12 + Math.random() * 0.76,
    phase: Math.random() * Math.PI * 2,
    initialAngle: Math.random() * Math.PI * 2,
  }));
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function normalizeAngle(angle: number): number {
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

function lerpAngle(from: number, to: number, t: number): number {
  'worklet';
  const delta = normalizeAngle(to - from);
  return from + delta * t;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function pickRandomBaseSpeed(): number {
  'worklet';
  const t = Math.pow(Math.random(), SPEED_PICK_BIAS);
  return BASE_SPEED_MIN + t * (BASE_SPEED_MAX - BASE_SPEED_MIN);
}

function swimSpeedForForwardSpeed(speed: number): number {
  'worklet';
  const t = clamp((speed - BASE_SPEED_MIN) / (BASE_SPEED_MAX - BASE_SPEED_MIN), 0, 1);
  return SWIM_SPEED_SHADER_MIN + t * (SWIM_SPEED_SHADER_MAX - SWIM_SPEED_SHADER_MIN);
}

function idleDurationForPhase(phase: number): number {
  'worklet';
  return IDLE_DURATION_BASE + (phase % IDLE_DURATION_JITTER);
}

function swimDurationForSpeed(speed: number, phase: number): number {
  'worklet';
  const t = clamp((speed - BASE_SPEED_MIN) / (BASE_SPEED_MAX - BASE_SPEED_MIN), 0, 1);
  const base = SWIM_DURATION_MAX - t * (SWIM_DURATION_MAX - SWIM_DURATION_MIN);
  return base + (phase % SWIM_DURATION_JITTER);
}

function updateFinBehavior(fish: FishRuntime, dt: number): void {
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

function updateTurnArc(fish: FishRuntime, dt: number): void {
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

function pickWanderAngle(currentAngle: number, phase: number): number {
  'worklet';
  const sign = Math.sin(phase * 3.7) > 0 ? 1 : -1;
  const deviation = (0.35 + Math.abs(Math.sin(phase * 11.3)) * 0.8) * Math.PI * sign;
  return currentAngle + deviation;
}

function updateFish(
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
): void {
  'worklet';
  const cfg = fish.config;

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
      // Keep wander aligned so the open-water branch does not pull back toward the wall.
      fish.wanderAngle.value = turnTarget;
    } else {
      fish.angle.value = lerpAngle(
        fish.angle.value,
        fish.wanderAngle.value,
        Math.min(1, WANDER_LERP * dt),
      );

      if (fish.wasNearEdge.value) {
        fish.targetBaseSpeed.value = pickRandomBaseSpeed();
        fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
        fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
      }
    }

    fish.wasNearEdge.value = nearEdge;

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = IDLE;
      fish.wasNearEdge.value = false;
      fish.idleMode.value = Math.random() < IDLE_RETRACT_PROBABILITY ? IDLE_RETRACT : IDLE_HOLD;
      fish.speed.value = fish.idleMode.value === IDLE_RETRACT ? BASE_SPEED_MIN : 0;
      fish.prevAngle.value = fish.angle.value;
      fish.turnArc.value = 0;
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    const isRetract = fish.idleMode.value === IDLE_RETRACT;
    const targetAmplitude = isRetract
      ? -cfg.targetAmplitude * IDLE_RETRACT_AMPLITUDE_RATIO
      : 0;
    fish.amplitude.value = lerp(
      fish.amplitude.value,
      targetAmplitude,
      Math.min(1, AMPLITUDE_LERP * dt),
    );

    if (isRetract) {
      fish.speed.value = BASE_SPEED_MIN;
      const retractAngle = fish.angle.value + Math.PI;
      fish.x.value += Math.cos(retractAngle) * BASE_SPEED_MIN * dt;
      fish.y.value += Math.sin(retractAngle) * BASE_SPEED_MIN * dt;
    } else {
      fish.speed.value = 0;
    }

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = SWIMMING;
      fish.wasNearEdge.value = false;
      fish.targetBaseSpeed.value = pickRandomBaseSpeed();
      fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
      fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
    }
  }

  fish.x.value = clamp(fish.x.value, hardMinX, hardMaxX);
  fish.y.value = clamp(fish.y.value, hardMinY, hardMaxY);

  // Wave frequency tracks actual forward speed so faster fish wave faster.
  // Integrate frequency into phase each frame (rather than iTime * frequency)
  // so changing speed never produces a spurious instantaneous frequency.
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

export type KoiFishLayerProps = {
  width: number;
  height: number;
  images: Record<KoiImageKey, SkImage>;
  clock: SharedValue<number>;
  koiCount?: number;
};

function applyFinSideSpawn(
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

function createFishRuntime(config: FishConfig, swimZone: SwimZone): FishRuntime {
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
    idleMode: makeMutable(IDLE_HOLD),
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

type KoiRuntimeEntry = {
  spawn: KoiSpawn;
  runtime: FishRuntime;
  image: SkImage;
};

function useFishSimulation(
  runtimes: KoiRuntimeEntry[],
  swimZone: SwimZone,
  sharedPositions: SharedValue<number[]>,
): void {
  const lastTimestamp = useSharedValue(-1);
  const fishCount = runtimes.length;

  const steerMinX = swimZone.x + swimZone.w * BOUNDARY_MARGIN_RATIO;
  const steerMaxX = swimZone.x + swimZone.w * (1 - BOUNDARY_MARGIN_RATIO);
  const steerMinY = swimZone.y + swimZone.h * BOUNDARY_MARGIN_RATIO;
  const steerMaxY = swimZone.y + swimZone.h * (1 - BOUNDARY_MARGIN_RATIO);
  const hardMinX = swimZone.x + FISH_BODY_INSET;
  const hardMaxX = swimZone.x + swimZone.w - FISH_BODY_INSET;
  const hardMinY = swimZone.y + FISH_BODY_INSET;
  const hardMaxY = swimZone.y + swimZone.h - FISH_BODY_INSET;
  const centerX = swimZone.x + swimZone.w * 0.5;
  const centerY = swimZone.y + swimZone.h * 0.5;

  useFrameCallback((frameInfo) => {
    'worklet';
    if (lastTimestamp.value < 0) {
      lastTimestamp.value = frameInfo.timestamp;
      return;
    }

    const dt = Math.min((frameInfo.timestamp - lastTimestamp.value) / 1000, 0.05);
    lastTimestamp.value = frameInfo.timestamp;

    const pos = sharedPositions.value;

    for (let fishIndex = 0; fishIndex < fishCount; fishIndex++) {
      const fishRuntime = runtimes[fishIndex].runtime;

      updateFish(
        fishRuntime,
        dt,
        steerMinX,
        steerMaxX,
        steerMinY,
        steerMaxY,
        hardMinX,
        hardMaxX,
        hardMinY,
        hardMaxY,
        centerX,
        centerY,
      );

      if (fishRuntime.state.value === SWIMMING) {
        for (let i = 0; i < fishCount; i++) {
          if (i === fishIndex) {
            continue;
          }
          const ox = pos[i * 2];
          const oy = pos[i * 2 + 1];
          const dx = fishRuntime.x.value - ox;
          const dy = fishRuntime.y.value - oy;
          const distSq = dx * dx + dy * dy;
          if (distSq < SEPARATION_RADIUS * SEPARATION_RADIUS && distSq > 0.25) {
            const dist = Math.sqrt(distSq);
            const overlap = 1 - dist / SEPARATION_RADIUS;
            const awayAngle = Math.atan2(dy, dx);
            const str = Math.min(1, overlap * SEPARATION_STEER * dt);
            fishRuntime.angle.value = lerpAngle(fishRuntime.angle.value, awayAngle, str);
            fishRuntime.wanderAngle.value = lerpAngle(fishRuntime.wanderAngle.value, awayAngle, str);
          }
        }
      }

      pos[fishIndex * 2] = fishRuntime.x.value;
      pos[fishIndex * 2 + 1] = fishRuntime.y.value;
    }

    sharedPositions.value = pos;
  });
}

export function KoiFishLayer({
  width,
  height,
  images,
  koiCount = KOI_COUNT,
}: KoiFishLayerProps) {
  const swimZone = useMemo(
    (): SwimZone => ({
      x: width * SWIM_ZONE_MARGIN,
      y: height * SWIM_ZONE_TOP_RATIO,
      w: width * (1 - SWIM_ZONE_MARGIN * 2),
      h: height * (1 - SWIM_ZONE_TOP_RATIO),
    }),
    [width, height],
  );

  const spawns = useMemo(
    () => createRandomSpawns(koiCount),
    [koiCount, swimZone.w, swimZone.h],
  );

  const runtimeEntries = useMemo(
    (): KoiRuntimeEntry[] =>
      spawns.map((spawn) => ({
        spawn,
        runtime: createFishRuntime({ ...KOI_SETTINGS, ...spawn }, swimZone),
        image: images[spawn.imageKey],
      })),
    [spawns, swimZone, images],
  );

  const sharedPositions = useSharedValue<number[]>(new Array(koiCount * 2).fill(0));
  useFishSimulation(runtimeEntries, swimZone, sharedPositions);

  const fishLength = KOI_BASE_LENGTH * KOI_SETTINGS.scale;
  const fishThickness = KOI_BASE_THICKNESS * KOI_SETTINGS.scale;
  const renderProps = {
    swimZoneX: swimZone.x,
    swimZoneY: swimZone.y,
    swimZoneW: swimZone.w,
    swimZoneH: swimZone.h,
    fishW: fishLength,
    fishH: fishThickness,
    sourceAngle: KOI_SETTINGS.sourceAngle,
    tailFlex: {
      tailBendScale: KOI_SETTINGS.tailBendScale,
      tailTipBendScale: KOI_SETTINGS.tailTipBendScale,
      headBendScale: KOI_SETTINGS.headBendScale,
    },
    turnDistort: {
      squashGain: KOI_SETTINGS.turnSquashGain,
      bulgeGain: KOI_SETTINGS.turnBulgeGain,
    },
  };

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group>
        {runtimeEntries.map(({ spawn, runtime, image }, index) => (
          <KoiShadowInstance
            key={`shadow-${index}`}
            image={image}
            {...renderProps}
            phase={spawn.phase}
            state={{
              x: runtime.x,
              y: runtime.y,
              angle: runtime.angle,
              amplitude: runtime.amplitude,
              turnArc: runtime.turnArc,
              wavePhase: runtime.wavePhase,
              finSquashLeft: runtime.finSquashLeft,
              finSquashRight: runtime.finSquashRight,
              finVariantLeft: runtime.finVariantLeft,
              finVariantRight: runtime.finVariantRight,
            }}
            offsetX={SHADOW_OFFSET_X}
            offsetY={SHADOW_OFFSET_Y}
            shadowColor={SHADOW_COLOR}
            shadowOpacity={SHADOW_OPACITY}
            shadowSoftness={SHADOW_SOFTNESS}
          />
        ))}
      </Group>
      <Group>
        {runtimeEntries.map(({ spawn, runtime, image }, index) => (
          <KoiInstance
            key={`fish-${index}`}
            image={image}
            {...renderProps}
            phase={spawn.phase}
            state={{
              x: runtime.x,
              y: runtime.y,
              angle: runtime.angle,
              amplitude: runtime.amplitude,
              turnArc: runtime.turnArc,
              wavePhase: runtime.wavePhase,
              finSquashLeft: runtime.finSquashLeft,
              finSquashRight: runtime.finSquashRight,
              finVariantLeft: runtime.finVariantLeft,
              finVariantRight: runtime.finVariantRight,
            }}
          />
        ))}
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
