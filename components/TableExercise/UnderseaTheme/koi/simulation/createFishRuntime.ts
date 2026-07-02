import { makeMutable } from 'react-native-reanimated';
import {
  KOI_BODY_TINT_PROBABILITY,
  KOI_OVERLAY_PROBABILITY,
  KOI_BODY_PALETTE,
  KOI_SPOT_PALETTE,
  type KoiImageKey,
} from '../config/koiFishLayerConfig';
import { KOI_FISH_BODY_INSET } from '../config/koiInstanceConfig';
import {
  KOI_FISH_STATE_SWIMMING,
  KOI_SPAWN_INITIAL_AMPLITUDE_RATIO,
  KOI_SPAWN_INITIAL_SPEED_RATIO,
} from '../config/koiSimConfig';
import type { FishConfig, FishRuntime, KoiSpawn, SwimZone } from './types';
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

const KOI_IMAGE_KEYS: KoiImageKey[] = ['koi1', 'koi2', 'koi3'];

export function pickSpotColor(): readonly [number, number, number] {
  return KOI_SPOT_PALETTE[Math.floor(Math.random() * KOI_SPOT_PALETTE.length)];
}

export function pickBodyColor(): readonly [number, number, number] {
  return KOI_BODY_PALETTE[Math.floor(Math.random() * KOI_BODY_PALETTE.length)];
}

export function createRandomVisualSpawn(): Omit<KoiSpawn, 'word'> {
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

export function createSpawnsFromWords(words: string[]): KoiSpawn[] {
  return words.map(word => ({
    word,
    ...createRandomVisualSpawn(),
  }));
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
