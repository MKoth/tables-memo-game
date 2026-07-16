import type { SkImage } from '@shopify/react-native-skia';

export {
  SFX_VOLUME,
  SUCCESS_CLICK_VOLUME,
  UNDERSEA_SOUND_ASSETS,
  WATERFLOW_VOLUME,
} from './underseaThemeSoundAssets';

export const UNDERSEA_IMAGE_ASSETS = {
  seafloor: require('../../../../../assets/images/undersea_theme/seafloor/seafloor.png'),
  stones: {
    1: require('../../../../../assets/images/undersea_theme/stones/stone1.png'),
    2: require('../../../../../assets/images/undersea_theme/stones/stone2.png'),
    3: require('../../../../../assets/images/undersea_theme/stones/stone3.png'),
    4: require('../../../../../assets/images/undersea_theme/stones/stone4.png'),
    5: require('../../../../../assets/images/undersea_theme/stones/stone5.png'),
    6: require('../../../../../assets/images/undersea_theme/stones/stone6.png'),
    7: require('../../../../../assets/images/undersea_theme/stones/stone7.png'),
    8: require('../../../../../assets/images/undersea_theme/stones/stone8.png'),
    9: require('../../../../../assets/images/undersea_theme/stones/stone9.png'),
    starfish1: require('../../../../../assets/images/undersea_theme/stones/starfish1.png'),
    starfish2: require('../../../../../assets/images/undersea_theme/stones/starfish2.png'),
    starfish3: require('../../../../../assets/images/undersea_theme/stones/starfish3.png'),
    seashell1: require('../../../../../assets/images/undersea_theme/stones/seashell1.png'),
    seashell2: require('../../../../../assets/images/undersea_theme/stones/seashell2.png'),
    seashell3: require('../../../../../assets/images/undersea_theme/stones/seashell3.png'),
    seashell4: require('../../../../../assets/images/undersea_theme/stones/seashell4.png'),
    seashell5: require('../../../../../assets/images/undersea_theme/stones/seashell5.png'),
  },
  seaweed: {
    1: require('../../../../../assets/images/undersea_theme/seaweed/seaweed1.png'),
    2: require('../../../../../assets/images/undersea_theme/seaweed/seaweed2.png'),
    3: require('../../../../../assets/images/undersea_theme/seaweed/seaweed3.png'),
    4: require('../../../../../assets/images/undersea_theme/seaweed/seaweed4.png'),
    5: require('../../../../../assets/images/undersea_theme/seaweed/seaweed5.png'),
    6: require('../../../../../assets/images/undersea_theme/seaweed/seaweed6.png'),
  },
  roamer: {
    roamer1: require('../../../../../assets/images/undersea_theme/roamer/roamer1.png'),
    roamer2: require('../../../../../assets/images/undersea_theme/roamer/roamer2.png'),
    roamer3: require('../../../../../assets/images/undersea_theme/roamer/roamer3.png'),
  },
  roamerMasks: {
    roamer1: require('../../../../../assets/images/undersea_theme/roamer/masks/roamer1-mask.png'),
    roamer2: require('../../../../../assets/images/undersea_theme/roamer/masks/roamer2-mask.png'),
    roamer3: require('../../../../../assets/images/undersea_theme/roamer/masks/roamer3-mask.png'),
  },
  wordSpriteBell: require('../../../../../assets/images/undersea_theme/wordSprite/wordSprite-bell.png'),
  wordSpriteTentacles: require('../../../../../assets/images/undersea_theme/wordSprite/wordSprite-tentacles.png'),
  bubble: require('../../../../../assets/images/undersea_theme/bubble/bubble.png'),
} as const;

export type StoneVariant = keyof typeof UNDERSEA_IMAGE_ASSETS.stones;
export type SeaweedVariant = keyof typeof UNDERSEA_IMAGE_ASSETS.seaweed;
export type RoamerImageKey = keyof typeof UNDERSEA_IMAGE_ASSETS.roamer;

export type UnderseaThemeImages = {
  seafloor: SkImage;
  stones: Record<StoneVariant, SkImage>;
  seaweed: Record<SeaweedVariant, SkImage>;
  roamer: Record<RoamerImageKey, SkImage>;
  roamerMasks: Record<RoamerImageKey, SkImage>;
  wordSpriteBell: SkImage;
  wordSpriteTentacles: SkImage;
  bubble: SkImage;
};

type ImageLoadEntry = {
  key: keyof Omit<UnderseaThemeImages, 'stones' | 'seaweed' | 'roamer' | 'roamerMasks'>;
  source: number;
};

export const UNDERSEA_PRIORITY_IMAGE_SOURCE = UNDERSEA_IMAGE_ASSETS.seafloor;

export const UNDERSEA_BULK_IMAGE_ENTRIES: ImageLoadEntry[] = [
  { key: 'wordSpriteBell', source: UNDERSEA_IMAGE_ASSETS.wordSpriteBell },
  { key: 'wordSpriteTentacles', source: UNDERSEA_IMAGE_ASSETS.wordSpriteTentacles },
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
  ['starfish1', UNDERSEA_IMAGE_ASSETS.stones.starfish1],
  ['starfish2', UNDERSEA_IMAGE_ASSETS.stones.starfish2],
  ['starfish3', UNDERSEA_IMAGE_ASSETS.stones.starfish3],
  ['seashell1', UNDERSEA_IMAGE_ASSETS.stones.seashell1],
  ['seashell2', UNDERSEA_IMAGE_ASSETS.stones.seashell2],
  ['seashell3', UNDERSEA_IMAGE_ASSETS.stones.seashell3],
  ['seashell4', UNDERSEA_IMAGE_ASSETS.stones.seashell4],
  ['seashell5', UNDERSEA_IMAGE_ASSETS.stones.seashell5],
];

export const UNDERSEA_SEAWEED_SOURCES: Array<[SeaweedVariant, number]> = [
  [1, UNDERSEA_IMAGE_ASSETS.seaweed[1]],
  [2, UNDERSEA_IMAGE_ASSETS.seaweed[2]],
  [3, UNDERSEA_IMAGE_ASSETS.seaweed[3]],
  [4, UNDERSEA_IMAGE_ASSETS.seaweed[4]],
  [5, UNDERSEA_IMAGE_ASSETS.seaweed[5]],
  [6, UNDERSEA_IMAGE_ASSETS.seaweed[6]],
];

export const UNDERSEA_ROAMER_SOURCES: Array<[RoamerImageKey, number]> = [
  ['roamer1', UNDERSEA_IMAGE_ASSETS.roamer.roamer1],
  ['roamer2', UNDERSEA_IMAGE_ASSETS.roamer.roamer2],
  ['roamer3', UNDERSEA_IMAGE_ASSETS.roamer.roamer3],
];

export const UNDERSEA_ROAMER_MASK_SOURCES: Array<[RoamerImageKey, number]> = [
  ['roamer1', UNDERSEA_IMAGE_ASSETS.roamerMasks.roamer1],
  ['roamer2', UNDERSEA_IMAGE_ASSETS.roamerMasks.roamer2],
  ['roamer3', UNDERSEA_IMAGE_ASSETS.roamerMasks.roamer3],
];

export const UNDERSEA_IMAGE_COUNT =
  1 +
  UNDERSEA_BULK_IMAGE_ENTRIES.length +
  UNDERSEA_STONE_SOURCES.length +
  UNDERSEA_SEAWEED_SOURCES.length +
  UNDERSEA_ROAMER_SOURCES.length +
  UNDERSEA_ROAMER_MASK_SOURCES.length;

/** Individual sound files loaded during preload (waterflow + 4 splashes + 6 SFX). */
export const UNDERSEA_SOUND_COUNT = 11;

export const UNDERSEA_PRELOAD_TOTAL = UNDERSEA_IMAGE_COUNT + UNDERSEA_SOUND_COUNT;
