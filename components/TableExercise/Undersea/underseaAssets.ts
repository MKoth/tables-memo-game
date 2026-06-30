import type { SkImage } from '@shopify/react-native-skia';

export {
  SFX_VOLUME,
  SUCCESS_CLICK_VOLUME,
  UNDERSEA_SOUND_ASSETS,
  WATERFLOW_VOLUME,
} from './underseaSoundAssets';

export const UNDERSEA_IMAGE_ASSETS = {
  seafloor: require('../../../assets/seafloor.png'),
  stones: {
    1: require('../../../assets/stone1.png'),
    2: require('../../../assets/stone2.png'),
    3: require('../../../assets/stone3.png'),
    4: require('../../../assets/stone4.png'),
    5: require('../../../assets/stone5.png'),
    6: require('../../../assets/stone6.png'),
    7: require('../../../assets/stone7.png'),
    8: require('../../../assets/stone8.png'),
    9: require('../../../assets/stone9.png'),
  },
  seaweed: {
    1: require('../../../assets/seaweed1.png'),
    2: require('../../../assets/seaweed2.png'),
    3: require('../../../assets/seaweed3.png'),
  },
  koi: {
    koi1: require('../../../assets/koi1.png'),
    koi2: require('../../../assets/koi2.png'),
    koi3: require('../../../assets/koi3.png'),
  },
  koiMasks: {
    koi1: require('../../../assets/koi1-mask.png'),
    koi2: require('../../../assets/koi2-mask.png'),
    koi3: require('../../../assets/koi3-mask.png'),
  },
  jellyfishBell: require('../../../assets/jellyfish-bell.png'),
  jellyfishTentacles: require('../../../assets/jellyfish-tentacles.png'),
  bubble: require('../../../assets/bubble.png'),
} as const;

export type StoneVariant = keyof typeof UNDERSEA_IMAGE_ASSETS.stones;
export type SeaweedVariant = keyof typeof UNDERSEA_IMAGE_ASSETS.seaweed;
export type KoiImageKey = keyof typeof UNDERSEA_IMAGE_ASSETS.koi;

export type UnderseaImages = {
  seafloor: SkImage;
  stones: Record<StoneVariant, SkImage>;
  seaweed: Record<SeaweedVariant, SkImage>;
  koi: Record<KoiImageKey, SkImage>;
  koiMasks: Record<KoiImageKey, SkImage>;
  jellyfishBell: SkImage;
  jellyfishTentacles: SkImage;
  bubble: SkImage;
};

type ImageLoadEntry = {
  key: keyof Omit<UnderseaImages, 'stones' | 'seaweed' | 'koi' | 'koiMasks'>;
  source: number;
};

export const UNDERSEA_PRIORITY_IMAGE_SOURCE = UNDERSEA_IMAGE_ASSETS.seafloor;

export const UNDERSEA_BULK_IMAGE_ENTRIES: ImageLoadEntry[] = [
  { key: 'jellyfishBell', source: UNDERSEA_IMAGE_ASSETS.jellyfishBell },
  { key: 'jellyfishTentacles', source: UNDERSEA_IMAGE_ASSETS.jellyfishTentacles },
  { key: 'bubble', source: UNDERSEA_IMAGE_ASSETS.bubble },
];

export const UNDERSEA_STONE_SOURCES: Array<[StoneVariant, number]> = [
  [1, UNDERSEA_IMAGE_ASSETS.stones[1]],
  [2, UNDERSEA_IMAGE_ASSETS.stones[2]],
  [3, UNDERSEA_IMAGE_ASSETS.stones[3]],
  [4, UNDERSEA_IMAGE_ASSETS.stones[4]],
  [5, UNDERSEA_IMAGE_ASSETS.stones[5]],
  [6, UNDERSEA_IMAGE_ASSETS.stones[6]],
  [7, UNDERSEA_IMAGE_ASSETS.stones[7]],
  [8, UNDERSEA_IMAGE_ASSETS.stones[8]],
  [9, UNDERSEA_IMAGE_ASSETS.stones[9]],
];

export const UNDERSEA_SEAWEED_SOURCES: Array<[SeaweedVariant, number]> = [
  [1, UNDERSEA_IMAGE_ASSETS.seaweed[1]],
  [2, UNDERSEA_IMAGE_ASSETS.seaweed[2]],
  [3, UNDERSEA_IMAGE_ASSETS.seaweed[3]],
];

export const UNDERSEA_KOI_SOURCES: Array<[KoiImageKey, number]> = [
  ['koi1', UNDERSEA_IMAGE_ASSETS.koi.koi1],
  ['koi2', UNDERSEA_IMAGE_ASSETS.koi.koi2],
  ['koi3', UNDERSEA_IMAGE_ASSETS.koi.koi3],
];

export const UNDERSEA_KOI_MASK_SOURCES: Array<[KoiImageKey, number]> = [
  ['koi1', UNDERSEA_IMAGE_ASSETS.koiMasks.koi1],
  ['koi2', UNDERSEA_IMAGE_ASSETS.koiMasks.koi2],
  ['koi3', UNDERSEA_IMAGE_ASSETS.koiMasks.koi3],
];

export const UNDERSEA_IMAGE_COUNT =
  1 +
  UNDERSEA_BULK_IMAGE_ENTRIES.length +
  UNDERSEA_STONE_SOURCES.length +
  UNDERSEA_SEAWEED_SOURCES.length +
  UNDERSEA_KOI_SOURCES.length +
  UNDERSEA_KOI_MASK_SOURCES.length;

/** Individual sound files loaded during preload (waterflow + 4 splashes + 6 SFX). */
export const UNDERSEA_SOUND_COUNT = 11;

export const UNDERSEA_PRELOAD_TOTAL = UNDERSEA_IMAGE_COUNT + UNDERSEA_SOUND_COUNT;
