import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { KOI_MAX_AMPLITUDE } from '../../../shaders/koiFishDeform.sksl';
import { KoiInstance } from './KoiInstance';

const KOI_BASE_LENGTH = 120;
const KOI_BASE_THICKNESS = 48;
const SWIM_ZONE_TOP_RATIO = 0.5;
const SWIM_ZONE_MARGIN = 0.08;

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
  swimSpeed: 6.5,
  baseSpeed: 130,
} as const;

const SWIMMING = 0;
const IDLE = 1;

const AMPLITUDE_LERP = 3.5;
const ANGLE_LERP = 2.5;
const IDLE_DRAG = 1.8;
const IDLE_SPEED_THRESHOLD = 4;
const BOUNDARY_MARGIN_RATIO = 0.12;

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
  state: SharedValue<number>;
  stateTimer: SharedValue<number>;
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

function speedFromAmplitude(baseSpeed: number, amplitude: number): number {
  'worklet';
  const ratio = 1 - amplitude / KOI_MAX_AMPLITUDE;
  return baseSpeed * Math.max(0, ratio);
}

function updateFish(
  fish: FishRuntime,
  dt: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
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

    const swimSpeed = speedFromAmplitude(cfg.baseSpeed, fish.amplitude.value);
    fish.speed.value = lerp(fish.speed.value, swimSpeed, Math.min(1, 4 * dt));

    fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
    fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;

    if (fish.x.value < minX || fish.x.value > maxX || fish.y.value < minY || fish.y.value > maxY) {
      const toCenter = Math.atan2(centerY - fish.y.value, centerX - fish.x.value);
      fish.angle.value = lerpAngle(fish.angle.value, toCenter, Math.min(1, ANGLE_LERP * dt));
      fish.x.value = clamp(fish.x.value, minX, maxX);
      fish.y.value = clamp(fish.y.value, minY, maxY);
    }

    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = IDLE;
      fish.stateTimer.value = 1.5 + (cfg.phase % 2);
    }
    return;
  }

  fish.amplitude.value = lerp(fish.amplitude.value, 0, Math.min(1, AMPLITUDE_LERP * dt));
  fish.speed.value *= Math.max(0, 1 - IDLE_DRAG * dt);

  fish.x.value += Math.cos(fish.angle.value) * fish.speed.value * dt;
  fish.y.value += Math.sin(fish.angle.value) * fish.speed.value * dt;
  fish.x.value = clamp(fish.x.value, minX, maxX);
  fish.y.value = clamp(fish.y.value, minY, maxY);

  if (fish.speed.value < IDLE_SPEED_THRESHOLD) {
    fish.stateTimer.value -= dt;
    if (fish.stateTimer.value <= 0) {
      fish.state.value = SWIMMING;
      fish.stateTimer.value = 5 + (cfg.phase % 3);
      fish.speed.value = speedFromAmplitude(cfg.baseSpeed, fish.amplitude.value);
    }
    return;
  }

  fish.stateTimer.value = 1.5 + (cfg.phase % 2);
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
  const x = useSharedValue(swimZone.x + config.xRatio * swimZone.w);
  const y = useSharedValue(swimZone.y + config.yRatio * swimZone.h);
  const angle = useSharedValue(config.initialAngle);
  const speed = useSharedValue(config.baseSpeed * 0.5);
  const amplitude = useSharedValue(config.targetAmplitude * 0.5);
  const state = useSharedValue(SWIMMING);
  const stateTimer = useSharedValue(4 + config.phase);

  useEffect(() => {
    x.value = swimZone.x + config.xRatio * swimZone.w;
    y.value = swimZone.y + config.yRatio * swimZone.h;
    angle.value = config.initialAngle;
    speed.value = config.baseSpeed * 0.5;
    amplitude.value = config.targetAmplitude * 0.5;
    state.value = SWIMMING;
    stateTimer.value = 4 + config.phase;
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
    state,
    stateTimer,
  ]);

  return { config, x, y, angle, speed, amplitude, state, stateTimer };
}

type KoiFishActorProps = {
  spawn: KoiSpawn;
  settings: KoiSharedSettings;
  swimZone: SwimZone;
  image: SkImage;
  clock: SharedValue<number>;
};

function KoiFishActor({ spawn, settings, swimZone, image, clock }: KoiFishActorProps) {
  const config = useMemo(
    (): FishConfig => ({
      ...settings,
      ...spawn,
    }),
    [settings, spawn],
  );
  const fish = useFishRuntime(config, swimZone);
  const lastTimestamp = useSharedValue(-1);

  const minX = swimZone.x + swimZone.w * BOUNDARY_MARGIN_RATIO;
  const maxX = swimZone.x + swimZone.w * (1 - BOUNDARY_MARGIN_RATIO);
  const minY = swimZone.y + swimZone.h * BOUNDARY_MARGIN_RATIO;
  const maxY = swimZone.y + swimZone.h * (1 - BOUNDARY_MARGIN_RATIO);
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

    updateFish(fish, dt, minX, maxX, minY, maxY, centerX, centerY);
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
        swimSpeed: settings.swimSpeed,
      }}
      phase={spawn.phase}
      state={{
        x: fish.x,
        y: fish.y,
        angle: fish.angle,
        amplitude: fish.amplitude,
      }}
      clock={clock}
    />
  );
}

export function KoiFishLayer({
  width,
  height,
  images,
  clock,
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
            clock={clock}
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
