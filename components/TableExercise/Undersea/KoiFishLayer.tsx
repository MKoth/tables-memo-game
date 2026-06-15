import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { KoiInstance } from './KoiInstance';

const KOI_BASE_LENGTH = 120;
const KOI_BASE_THICKNESS = 38;
const SWIM_ZONE_TOP_RATIO = 0.0;
const SWIM_ZONE_MARGIN = 0.0;

/** Number of koi fish in the swim zone. */
export const KOI_COUNT = 5;

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
} as const;

const SWIMMING = 0;
const IDLE = 1;

const BASE_SPEED_MIN = 50;
const BASE_SPEED_MAX = 670;
/** >1 biases random speed picks toward BASE_SPEED_MIN (higher = more slow fish). */
const SPEED_PICK_BIAS = 5.5;
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
const IDLE_DURATION_BASE = 0.5;
const IDLE_DURATION_JITTER = 0.6;

const AMPLITUDE_LERP = 3.5;
const ANGLE_LERP = 2.5;
const TURN_ARC_LERP = 3.5;
/** Max body bend during turns — keeps shader shear within a fish-like range. */
const TURN_ARC_MAX = 0.4;
const WANDER_LERP = 0.6;
const IDLE_DRAG = 1.8;
const IDLE_SPEED_THRESHOLD = 2;
const BOUNDARY_MARGIN_RATIO = 0.18;
/** Max turn offset when steering away from swim-zone edges (radians). */
const BOUNDARY_TURN_OFFSET = Math.PI * 0.25;

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
  targetBaseSpeed: SharedValue<number>;
  wavePhase: SharedValue<number>;
  wasNearEdge: SharedValue<boolean>;
};

type SwimZone = {
  x: number;
  y: number;
  w: number;
  h: number;
};

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
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
    }
  } else {
    fish.amplitude.value = lerp(fish.amplitude.value, 0, Math.min(1, AMPLITUDE_LERP * dt));
    fish.speed.value *= Math.max(0, 1 - IDLE_DRAG * dt);

    fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
    fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

    if (fish.speed.value < IDLE_SPEED_THRESHOLD) {
      fish.stateTimer.value -= dt;
      if (fish.stateTimer.value <= 0) {
        fish.state.value = SWIMMING;
        fish.wasNearEdge.value = false;
        fish.targetBaseSpeed.value = pickRandomBaseSpeed();
        fish.stateTimer.value = swimDurationForSpeed(fish.targetBaseSpeed.value, cfg.phase);
        fish.wanderAngle.value = pickWanderAngle(fish.angle.value, cfg.phase);
      }
    } else {
      fish.stateTimer.value = idleDurationForPhase(cfg.phase);
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

  updateTurnArc(fish, dt);
}

export type KoiFishLayerProps = {
  width: number;
  height: number;
  images: Record<KoiImageKey, SkImage>;
  clock: SharedValue<number>;
  koiCount?: number;
};

function useFishRuntime(
  config: FishConfig,
  swimZone: SwimZone,
): FishRuntime {
  const initSpeed = pickRandomBaseSpeed();
  const x = useSharedValue(swimZone.x + config.xRatio * swimZone.w);
  const y = useSharedValue(swimZone.y + config.yRatio * swimZone.h);
  const angle = useSharedValue(config.initialAngle);
  const speed = useSharedValue(initSpeed * 0.5);
  const amplitude = useSharedValue(config.targetAmplitude * 0.5);
  const turnArc = useSharedValue(0);
  const prevAngle = useSharedValue(config.initialAngle);
  const wanderAngle = useSharedValue(config.initialAngle);
  const state = useSharedValue(SWIMMING);
  const stateTimer = useSharedValue(swimDurationForSpeed(initSpeed, config.phase));
  const targetBaseSpeed = useSharedValue(initSpeed);
  const wavePhase = useSharedValue(0);
  const wasNearEdge = useSharedValue(false);

  useEffect(() => {
    const resetSpeed = pickRandomBaseSpeed();
    x.value = swimZone.x + config.xRatio * swimZone.w;
    y.value = swimZone.y + config.yRatio * swimZone.h;
    angle.value = config.initialAngle;
    speed.value = resetSpeed * 0.5;
    amplitude.value = config.targetAmplitude * 0.5;
    turnArc.value = 0;
    prevAngle.value = config.initialAngle;
    wanderAngle.value = config.initialAngle;
    state.value = SWIMMING;
    stateTimer.value = swimDurationForSpeed(resetSpeed, config.phase);
    targetBaseSpeed.value = resetSpeed;
    wavePhase.value = 0;
    wasNearEdge.value = false;
  }, [
    swimZone.x,
    swimZone.y,
    swimZone.w,
    swimZone.h,
    config,
    x,
    y,
    angle,
    speed,
    amplitude,
    turnArc,
    prevAngle,
    wanderAngle,
    state,
    stateTimer,
    targetBaseSpeed,
    wavePhase,
    wasNearEdge,
  ]);

  return {
    config,
    x,
    y,
    angle,
    speed,
    amplitude,
    turnArc,
    prevAngle,
    wanderAngle,
    state,
    stateTimer,
    targetBaseSpeed,
    wavePhase,
    wasNearEdge,
  };
}

type KoiFishActorProps = {
  spawn: KoiSpawn;
  settings: KoiSharedSettings;
  swimZone: SwimZone;
  image: SkImage;
};

function KoiFishActor({ spawn, settings, swimZone, image }: KoiFishActorProps) {
  const config = useMemo(
    (): FishConfig => ({
      ...settings,
      ...spawn,
    }),
    [settings, spawn],
  );
  const fish = useFishRuntime(config, swimZone);
  const lastTimestamp = useSharedValue(-1);

  const steerMinX = swimZone.x + swimZone.w * BOUNDARY_MARGIN_RATIO;
  const steerMaxX = swimZone.x + swimZone.w * (1 - BOUNDARY_MARGIN_RATIO);
  const steerMinY = swimZone.y + swimZone.h * BOUNDARY_MARGIN_RATIO;
  const steerMaxY = swimZone.y + swimZone.h * (1 - BOUNDARY_MARGIN_RATIO);
  const hardMinX = swimZone.x;
  const hardMaxX = swimZone.x + swimZone.w;
  const hardMinY = swimZone.y;
  const hardMaxY = swimZone.y + swimZone.h;
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

    updateFish(
      fish,
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
  });

  const fishLength = KOI_BASE_LENGTH * settings.scale;
  const fishThickness = KOI_BASE_THICKNESS * settings.scale;

  return (
    <KoiInstance
      image={image}
      swimZoneX={swimZone.x}
      swimZoneY={swimZone.y}
      swimZoneW={swimZone.w}
      swimZoneH={swimZone.h}
      fishW={fishLength}
      fishH={fishThickness}
      sourceAngle={settings.sourceAngle}
      tailFlex={{
        tailBendScale: settings.tailBendScale,
        tailTipBendScale: settings.tailTipBendScale,
        headBendScale: settings.headBendScale,
      }}
      turnDistort={{
        squashGain: settings.turnSquashGain,
        bulgeGain: settings.turnBulgeGain,
      }}
      phase={spawn.phase}
      state={{
        x: fish.x,
        y: fish.y,
        angle: fish.angle,
        amplitude: fish.amplitude,
        turnArc: fish.turnArc,
        wavePhase: fish.wavePhase,
      }}
    />
  );
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

  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Group>
        {spawns.map((spawn, index) => (
          <KoiFishActor
            key={index}
            spawn={spawn}
            settings={KOI_SETTINGS}
            swimZone={swimZone}
            image={images[spawn.imageKey]}
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
