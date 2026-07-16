import {
  KOI_BODY_PALETTE,
  ROAMER_BODY_TINT_PROBABILITY,
  ROAMER_OVERLAY_PROBABILITY,
  KOI_SPOT_PALETTE,
} from '../config/roamerFishAppearanceConfig';
import type { RoamerImageKey } from '../config/roamerFishSettings';
import type { RoamerSpawn } from './types';

const ROAMER_IMAGE_KEYS: RoamerImageKey[] = ['roamer1', 'roamer2', 'roamer3'];

function pickSpotColor(): readonly [number, number, number] {
  return KOI_SPOT_PALETTE[Math.floor(Math.random() * KOI_SPOT_PALETTE.length)];
}

function pickBodyColor(): readonly [number, number, number] {
  return KOI_BODY_PALETTE[Math.floor(Math.random() * KOI_BODY_PALETTE.length)];
}

export function createRandomVisualSpawn(): Omit<RoamerSpawn, 'word'> {
  const spotColor = pickSpotColor();
  const hasBodyTint = Math.random() < ROAMER_BODY_TINT_PROBABILITY;
  const hasOverlay = Math.random() < ROAMER_OVERLAY_PROBABILITY;

  return {
    imageKey: ROAMER_IMAGE_KEYS[Math.floor(Math.random() * ROAMER_IMAGE_KEYS.length)],
    spotColor,
    bodyColor: hasBodyTint ? pickBodyColor() : spotColor,
    bodyTintStrength: hasBodyTint ? 1 : 0,
    overlayMaskKey: hasOverlay
      ? ROAMER_IMAGE_KEYS[Math.floor(Math.random() * ROAMER_IMAGE_KEYS.length)]
      : 'roamer1',
    overlayColor: hasOverlay ? pickSpotColor() : spotColor,
    overlayStrength: hasOverlay ? 1 : 0,
    xRatio: 0.12 + Math.random() * 0.76,
    yRatio: 0.12 + Math.random() * 0.76,
    phase: Math.random() * Math.PI * 2,
    initialAngle: Math.random() * Math.PI * 2,
  };
}

export function createRoamerSpawnsFromWords(words: string[]): RoamerSpawn[] {
  return words.map(word => ({
    word,
    ...createRandomVisualSpawn(),
  }));
}
