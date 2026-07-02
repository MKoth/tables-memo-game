import {
  KOI_BODY_TINT_PROBABILITY,
  KOI_OVERLAY_PROBABILITY,
  KOI_BODY_PALETTE,
  KOI_SPOT_PALETTE,
  type KoiImageKey,
} from '../KoiFishLayer';
import type { KoiSpawn } from './types';

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
  return words.map((word) => ({
    word,
    ...createRandomVisualSpawn(),
  }));
}

export { createFishRuntime } from './koiSimWorklets';
