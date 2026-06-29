import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { makeMutable, runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import {
  KOI_BODY_TINT_PROBABILITY,
  KOI_OVERLAY_PROBABILITY,
  KOI_SETTINGS,
  KOI_SPOT_PALETTE,
  KOI_BODY_PALETTE,
  type FinSideSpawn,
  type KoiImageKey,
} from './KoiFishLayer';
import { SWIM_ZONE_TOP_RATIO } from './KoiFishLayer';
import {
  advanceFishCosmetics,
  applyEnterFishPosition,
  updateFishDirectedEscape,
  updateFishInBubble,
} from './koiBubbleSim';
import { releaseCapturedFishWorklet } from './fishPoolSnapshot';
import type { FishConfig, FishRuntime, KoiRuntimeEntry, KoiSpawn, SwimZone } from './koiFishTypes';
import { BubblePhase, type BubbleAnimState } from './useBubbleAnimation';

const KOI_BASE_LENGTH = 120;
const KOI_BASE_THICKNESS = 38;
const SWIM_ZONE_MARGIN = 0;
const FISH_BODY_INSET = (KOI_BASE_LENGTH * KOI_SETTINGS.scale) / 2;

const SWIMMING = 0;
const IDLE = 1;

const BASE_SPEED_MIN = 50;
const BASE_SPEED_MAX = 670;
const SPEED_PICK_BIAS = 15.5;
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
const BOUNDARY_MARGIN_RATIO = 0.18;
const BOUNDARY_TURN_OFFSET = Math.PI * 0.25;
const SEPARATION_RADIUS = 75;
const SEPARATION_STEER = 10.0;
const SIM_FPS = 30;
const SIM_STEP_MS = 1000 / SIM_FPS;

const KOI_IMAGE_KEYS: KoiImageKey[] = ['koi1', 'koi2', 'koi3'];

export type KoiCaptureSharedState = {
  capturedFishIndex: SharedValue<number>;
  captureOriginX: SharedValue<number>;
  captureOriginY: SharedValue<number>;
  bubbleAnim: SharedValue<BubbleAnimState>;
  bubblePhase: SharedValue<number>;
  enterProgress: SharedValue<number>;
  escapeActive: SharedValue<boolean>;
  escapeStage: SharedValue<number>;
  escapeTargetX: SharedValue<number>;
  escapeTargetY: SharedValue<number>;
  offScreenTargetX: SharedValue<number>;
  offScreenTargetY: SharedValue<number>;
  escapeCompleteTriggered: SharedValue<boolean>;
};

export type UseKoiFishSimulationParams = {
  width: number;
  height: number;
  words: string[];
  captureState: KoiCaptureSharedState;
  releaseRequestSv: SharedValue<number>;
  eliminatedFishSv: SharedValue<number[]>;
  onEscapeComplete: () => void;
};

type PersistedSimBundle = {
  wordsKey: string;
  width: number;
  height: number;
  swimZone: SwimZone;
  runtimeEntries: KoiRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
};

function buildSimBundle(words: string[], width: number, height: number): PersistedSimBundle {
  const swimZone: SwimZone = {
    x: width * SWIM_ZONE_MARGIN,
    y: height * SWIM_ZONE_TOP_RATIO,
    w: width * (1 - SWIM_ZONE_MARGIN * 2),
    h: height * (1 - SWIM_ZONE_TOP_RATIO),
  };
  const spawns = createSpawnsFromWords(words);
  const runtimeEntries = spawns.map((spawn) => ({
    spawn,
    runtime: createFishRuntime({ ...KOI_SETTINGS, ...spawn }, swimZone),
  }));
  const posArr = new Array(runtimeEntries.length * 2).fill(0);
  for (let i = 0; i < runtimeEntries.length; i++) {
    posArr[i * 2] = runtimeEntries[i]!.runtime.x.value;
    posArr[i * 2 + 1] = runtimeEntries[i]!.runtime.y.value;
  }

  return {
    wordsKey: words.join('\0'),
    width,
    height,
    swimZone,
    runtimeEntries,
    sharedPositions: makeMutable(posArr),
  };
}

export type KoiFishSimulation = {
  runtimeEntries: KoiRuntimeEntry[];
  sharedPositions: SharedValue<number[]>;
  swimZone: SwimZone;
  armCapture: (fishIndex: number, originX: number, originY: number) => void;
  fishLength: number;
  fishThickness: number;
  swimZoneTop: number;
  swimZoneHeight: number;
  hitRadius: number;
  renderProps: {
    swimZoneX: number;
    swimZoneY: number;
    swimZoneW: number;
    swimZoneH: number;
    fishW: number;
    fishH: number;
    sourceAngle: number;
    tailFlex: {
      tailBendScale: number;
      tailTipBendScale: number;
      headBendScale: number;
    };
    turnDistort: {
      squashGain: number;
      bulgeGain: number;
    };
  };
};

function pickSpotColor(): readonly [number, number, number] {
  return KOI_SPOT_PALETTE[Math.floor(Math.random() * KOI_SPOT_PALETTE.length)];
}

function pickBodyColor(): readonly [number, number, number] {
  return KOI_BODY_PALETTE[Math.floor(Math.random() * KOI_BODY_PALETTE.length)];
}

function createRandomVisualSpawn(): Omit<KoiSpawn, 'word'> {
  const spotColor = pickSpotColor();
  const hasBodyTint = Math.random() < KOI_BODY_TINT_PROBABILITY;
  const hasOverlay = Math.random() < KOI_OVERLAY_PROBABILITY;

  return {
    imageKey: KOI_IMAGE_KEYS[Math.floor(Math.random() * KOI_IMAGE_KEYS.length)],
    spotColor,
    bodyColor: hasBodyTint ? pickBodyColor() : spotColor,
    bodyTintStrength: hasBodyTint ? 1 : 0,
    overlayMaskKey: hasOverlay
      ? KOI_IMAGE_KEYS[Math.floor(Math.random() * KOI_IMAGE_KEYS.length)]
      : 'koi1',
    overlayColor: hasOverlay ? pickSpotColor() : spotColor,
    overlayStrength: hasOverlay ? 1 : 0,
    xRatio: 0.12 + Math.random() * 0.76,
    yRatio: 0.12 + Math.random() * 0.76,
    phase: Math.random() * Math.PI * 2,
    initialAngle: Math.random() * Math.PI * 2,
  };
}

function createSpawnsFromWords(words: string[]): KoiSpawn[] {
  return words.map((word) => ({
    word,
    ...createRandomVisualSpawn(),
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

function pickWanderAngle(currentAngle: number, phase: number): number {
  'worklet';
  const sign = Math.sin(phase * 3.7) > 0 ? 1 : -1;
  const deviation = (0.35 + Math.abs(Math.sin(phase * 11.3)) * 0.8) * Math.PI * sign;
  return currentAngle + deviation;
}

function nextFinRerollDelay(interval: number, jitter: number): number {
  if (interval <= 0) {
    return Number.MAX_VALUE;
  }
  return interval + Math.random() * jitter;
}

function rollFinSideSpawn(settings: typeof KOI_SETTINGS, freqSeed: number): FinSideSpawn {
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

function finSquashAtPhase(phase: number, base: number, amp: number): number {
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
}

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

function rerollFinSide(fish: FishRuntime, side: 'left' | 'right'): void {
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

function finSquashFromPhase(phase: number, base: number, amp: number): number {
  'worklet';
  return base + amp * (0.5 - 0.5 * Math.cos(phase));
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
      fish.targetBaseSpeed.value = pickRandomBaseSpeed();
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

function isFishEliminated(eliminated: number[], fishIndex: number): boolean {
  'worklet';
  for (let i = 0; i < eliminated.length; i++) {
    if (eliminated[i] === fishIndex) {
      return true;
    }
  }
  return false;
}

function useFishSimulation(
  runtimes: KoiRuntimeEntry[],
  swimZone: SwimZone,
  screenWidth: number,
  screenHeight: number,
  sharedPositions: SharedValue<number[]>,
  captureState: KoiCaptureSharedState,
  releaseRequestSv: SharedValue<number>,
  eliminatedFishSv: SharedValue<number[]>,
  onEscapeComplete: () => void,
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

  const cellSize = SEPARATION_RADIUS;
  const gridCols = Math.max(1, Math.ceil(swimZone.w / cellSize));
  const gridRows = Math.max(1, Math.ceil(swimZone.h / cellSize));
  const gridMinX = swimZone.x;
  const gridMinY = swimZone.y;
  const cellCount = gridCols * gridRows;

  const cellHead = useSharedValue<number[]>([]);
  const fishNext = useSharedValue<number[]>([]);

  useEffect(() => {
    cellHead.value = new Array(cellCount).fill(-1);
    fishNext.value = new Array(fishCount).fill(-1);
  }, [cellCount, fishCount, cellHead, fishNext]);

  const onSimFrame = useCallback(
    (frameInfo: { timestamp: number }) => {
      'worklet';
      if (lastTimestamp.value < 0) {
        lastTimestamp.value = frameInfo.timestamp;
        return;
      }

      const elapsed = frameInfo.timestamp - lastTimestamp.value;
      if (elapsed < SIM_STEP_MS) {
        return;
      }
      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimestamp.value = frameInfo.timestamp;

      const pos = sharedPositions.value;

      if (releaseRequestSv.value === 1) {
        releaseRequestSv.value = 0;
        const fishIndex = captureState.capturedFishIndex.value;
        const entry = fishIndex >= 0 ? runtimes[fishIndex] : null;
        if (entry != null) {
          releaseCapturedFishWorklet(
            fishIndex,
            entry.runtime,
            sharedPositions,
            captureState,
          );
        }
      }

      const heads = cellHead.value;
      const next = fishNext.value;
      const gridReady = heads.length === cellCount && next.length === fishCount;
      const capturedFishIndex = captureState.capturedFishIndex.value;
      const eliminated = eliminatedFishSv.value;

      if (gridReady) {
        for (let c = 0; c < cellCount; c++) {
          heads[c] = -1;
        }
        for (let i = 0; i < fishCount; i++) {
          if (i === capturedFishIndex || isFishEliminated(eliminated, i)) {
            continue;
          }
          let cx = Math.floor((pos[i * 2] - gridMinX) / cellSize);
          let cy = Math.floor((pos[i * 2 + 1] - gridMinY) / cellSize);
          if (cx < 0) { cx = 0; } else if (cx >= gridCols) { cx = gridCols - 1; }
          if (cy < 0) { cy = 0; } else if (cy >= gridRows) { cy = gridRows - 1; }
          const cell = cy * gridCols + cx;
          next[i] = heads[cell];
          heads[cell] = i;
        }
      }

      for (let fishIndex = 0; fishIndex < fishCount; fishIndex++) {
        const fishRuntime = runtimes[fishIndex].runtime;

        if (isFishEliminated(eliminated, fishIndex)) {
          continue;
        }

        if (fishIndex === capturedFishIndex && capturedFishIndex >= 0) {
          if (captureState.escapeActive.value) {
            const arrived = updateFishDirectedEscape(
              fishRuntime,
              dt,
              captureState.escapeTargetX.value,
              captureState.escapeTargetY.value,
              BASE_SPEED_MAX,
              FISH_BODY_INSET,
              screenWidth,
              screenHeight,
            );

            if (captureState.escapeStage.value === 0 && arrived) {
              captureState.escapeStage.value = 1;
              captureState.escapeTargetX.value = captureState.offScreenTargetX.value;
              captureState.escapeTargetY.value = captureState.offScreenTargetY.value;
            }

            if (
              captureState.escapeStage.value === 1 &&
              fishRuntime.y.value + FISH_BODY_INSET < 0 &&
              !captureState.escapeCompleteTriggered.value
            ) {
              captureState.escapeCompleteTriggered.value = true;
              runOnJS(onEscapeComplete)();
            }

            pos[fishIndex * 2] = fishRuntime.x.value;
            pos[fishIndex * 2 + 1] = fishRuntime.y.value;
            continue;
          }

          const bubblePhase = captureState.bubblePhase.value;
          const bubble = captureState.bubbleAnim.value;
          const bubbleCenterX = bubble.centerX;
          const bubbleCenterY = bubble.centerY;
          const bubbleRadius = bubble.diameter * 0.5;

          if (bubblePhase === BubblePhase.Enter) {
            applyEnterFishPosition(
              fishRuntime,
              captureState.captureOriginX.value,
              captureState.captureOriginY.value,
              bubbleCenterX,
              bubbleCenterY,
              captureState.enterProgress.value,
            );
            advanceFishCosmetics(fishRuntime, dt);
          } else if (
            bubblePhase === BubblePhase.Idle ||
            bubblePhase === BubblePhase.Burst
          ) {
            updateFishInBubble(
              fishRuntime,
              dt,
              bubbleCenterX,
              bubbleCenterY,
              bubbleRadius,
              FISH_BODY_INSET,
            );
          }

          pos[fishIndex * 2] = fishRuntime.x.value;
          pos[fishIndex * 2 + 1] = fishRuntime.y.value;
          continue;
        }

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
          const fx = fishRuntime.x.value;
          const fy = fishRuntime.y.value;

          if (gridReady) {
            let cx = Math.floor((fx - gridMinX) / cellSize);
            let cy = Math.floor((fy - gridMinY) / cellSize);
            if (cx < 0) { cx = 0; } else if (cx >= gridCols) { cx = gridCols - 1; }
            if (cy < 0) { cy = 0; } else if (cy >= gridRows) { cy = gridRows - 1; }

            for (let gy = cy - 1; gy <= cy + 1; gy++) {
              if (gy < 0 || gy >= gridRows) {
                continue;
              }
              for (let gx = cx - 1; gx <= cx + 1; gx++) {
                if (gx < 0 || gx >= gridCols) {
                  continue;
                }
                let i = heads[gy * gridCols + gx];
                while (i !== -1) {
                  if (i !== fishIndex && i !== capturedFishIndex && !isFishEliminated(eliminated, i)) {
                    const dx = fx - pos[i * 2];
                    const dy = fy - pos[i * 2 + 1];
                    const distSq = dx * dx + dy * dy;
                    if (distSq < SEPARATION_RADIUS * SEPARATION_RADIUS && distSq > 0.25) {
                      const dist = Math.sqrt(distSq);
                      const overlap = 1 - dist / SEPARATION_RADIUS;
                      const awayAngle = Math.atan2(dy, dx);
                      const str = Math.min(1, overlap * SEPARATION_STEER * dt);
                      fishRuntime.angle.value = lerpAngle(fishRuntime.angle.value, awayAngle, str);
                      fishRuntime.wanderAngle.value = lerpAngle(
                        fishRuntime.wanderAngle.value,
                        awayAngle,
                        str,
                      );
                    }
                  }
                  i = next[i];
                }
              }
            }
          } else {
            for (let i = 0; i < fishCount; i++) {
              if (i === fishIndex || i === capturedFishIndex || isFishEliminated(eliminated, i)) {
                continue;
              }
              const dx = fx - pos[i * 2];
              const dy = fy - pos[i * 2 + 1];
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
        }

        pos[fishIndex * 2] = fishRuntime.x.value;
        pos[fishIndex * 2 + 1] = fishRuntime.y.value;
      }

      sharedPositions.value = pos;
    },
    [
      lastTimestamp,
      sharedPositions,
      cellHead,
      fishNext,
      cellCount,
      fishCount,
      captureState,
      releaseRequestSv,
      eliminatedFishSv,
      onEscapeComplete,
      screenWidth,
      screenHeight,
      gridMinX,
      gridMinY,
      cellSize,
      gridCols,
      gridRows,
      runtimes,
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
    ],
  );

  const simLoop = useFrameCallback(onSimFrame, true);

  useEffect(() => {
    const syncActive = (state: AppStateStatus) => {
      simLoop.setActive(state === 'active');
      if (state !== 'active') {
        lastTimestamp.value = -1;
      }
    };
    syncActive(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncActive);
    return () => subscription.remove();
  }, [simLoop, lastTimestamp]);
}

export function useKoiFishSimulation({
  width,
  height,
  words,
  captureState,
  releaseRequestSv,
  eliminatedFishSv,
  onEscapeComplete,
}: UseKoiFishSimulationParams): KoiFishSimulation {
  const wordsKey = words.join('\0');
  const bundleRef = useRef<PersistedSimBundle | null>(null);

  if (
    bundleRef.current == null ||
    bundleRef.current.wordsKey !== wordsKey ||
    bundleRef.current.width !== width ||
    bundleRef.current.height !== height
  ) {
    bundleRef.current = buildSimBundle(words, width, height);
  }

  const { runtimeEntries, sharedPositions, swimZone } = bundleRef.current;

  useFishSimulation(
    runtimeEntries,
    swimZone,
    width,
    height,
    sharedPositions,
    captureState,
    releaseRequestSv,
    eliminatedFishSv,
    onEscapeComplete,
  );

  const armCapture = useCallback(
    (fishIndex: number, originX: number, originY: number) => {
      captureState.capturedFishIndex.value = fishIndex;
      captureState.captureOriginX.value = originX;
      captureState.captureOriginY.value = originY;
    },
    [captureState],
  );

  const fishLength = KOI_BASE_LENGTH * KOI_SETTINGS.scale;
  const fishThickness = KOI_BASE_THICKNESS * KOI_SETTINGS.scale;
  const swimZoneTop = height * SWIM_ZONE_TOP_RATIO;
  const swimZoneHeight = height * (1 - SWIM_ZONE_TOP_RATIO);
  const hitRadius = fishLength * 0.55 * 1.55;

  const renderProps = useMemo(
    () => ({
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
    }),
    [swimZone, fishLength, fishThickness],
  );

  return {
    runtimeEntries,
    sharedPositions,
    swimZone,
    armCapture,
    fishLength,
    fishThickness,
    swimZoneTop,
    swimZoneHeight,
    hitRadius,
    renderProps,
  };
}

export type { FishRuntime, KoiRuntimeEntry, KoiSpawn } from './koiFishTypes';
