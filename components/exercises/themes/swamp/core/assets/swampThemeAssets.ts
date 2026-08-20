import type { SkImage } from '@shopify/react-native-skia';

export const SWAMP_IMAGE_ASSETS = {
  seafloor: require('../../../../../../assets/images/swamp_theme/seafloor/swampbottom.png'),
  stones: {
    1: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone1.png'),
    2: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone2.png'),
    3: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone3.png'),
    4: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone4.png'),
    5: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone5.png'),
    6: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone6.png'),
    7: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone7.png'),
    8: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone8.png'),
    9: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone9.png'),
    10: require('../../../../../../assets/images/swamp_theme/stones/swamp_stone10.png'),
  },
  drops: {
    1: require('../../../../../../assets/images/swamp_theme/drops/drop1.png'),
    2: require('../../../../../../assets/images/swamp_theme/drops/drop2.png'),
    3: require('../../../../../../assets/images/swamp_theme/drops/drop3.png'),
  },
  algae: {
    1: require('../../../../../../assets/images/swamp_theme/algae/algae1.png'),
    2: require('../../../../../../assets/images/swamp_theme/algae/algae2.png'),
    3: require('../../../../../../assets/images/swamp_theme/algae/algae3.png'),
    4: require('../../../../../../assets/images/swamp_theme/algae/algae4.png'),
    5: require('../../../../../../assets/images/swamp_theme/algae/algae5.png'),
    6: require('../../../../../../assets/images/swamp_theme/algae/algae6.png'),
    7: require('../../../../../../assets/images/swamp_theme/algae/algae7.png'),
    8: require('../../../../../../assets/images/swamp_theme/algae/algae8.png'),
    9: require('../../../../../../assets/images/swamp_theme/algae/algae9.png'),
    10: require('../../../../../../assets/images/swamp_theme/algae/algae10.png'),
    11: require('../../../../../../assets/images/swamp_theme/algae/algae11.png'),
    12: require('../../../../../../assets/images/swamp_theme/algae/algae12.png'),
    13: require('../../../../../../assets/images/swamp_theme/algae/algae13.png'),
    14: require('../../../../../../assets/images/swamp_theme/algae/algae14.png'),
    15: require('../../../../../../assets/images/swamp_theme/algae/algae15.png'),
    16: require('../../../../../../assets/images/swamp_theme/algae/algae16.png'),
    17: require('../../../../../../assets/images/swamp_theme/algae/algae17.png'),
    18: require('../../../../../../assets/images/swamp_theme/algae/algae18.png'),
    19: require('../../../../../../assets/images/swamp_theme/algae/algae19.png'),
    20: require('../../../../../../assets/images/swamp_theme/algae/algae20.png'),
    21: require('../../../../../../assets/images/swamp_theme/algae/algae21.png'),
  },
} as const;

export type StoneVariant = keyof typeof SWAMP_IMAGE_ASSETS.stones;
export type AlgaeVariant = keyof typeof SWAMP_IMAGE_ASSETS.algae;
export type DropVariant = keyof typeof SWAMP_IMAGE_ASSETS.drops;

export type SwampThemeImages = {
  seafloor: SkImage;
  stones: Record<StoneVariant, SkImage>;
  algae: Record<AlgaeVariant, SkImage>;
  drops: Record<DropVariant, SkImage>;
};

export const SWAMP_PRIORITY_IMAGE_SOURCE = SWAMP_IMAGE_ASSETS.seafloor;

export const SWAMP_STONE_SOURCES: Array<[StoneVariant, number]> = [
  [1, SWAMP_IMAGE_ASSETS.stones[1]],
  [2, SWAMP_IMAGE_ASSETS.stones[2]],
  [3, SWAMP_IMAGE_ASSETS.stones[3]],
  [4, SWAMP_IMAGE_ASSETS.stones[4]],
  [5, SWAMP_IMAGE_ASSETS.stones[5]],
  [6, SWAMP_IMAGE_ASSETS.stones[6]],
  [7, SWAMP_IMAGE_ASSETS.stones[7]],
  [8, SWAMP_IMAGE_ASSETS.stones[8]],
  [9, SWAMP_IMAGE_ASSETS.stones[9]],
  [10, SWAMP_IMAGE_ASSETS.stones[10]],
];

export const SWAMP_ALGAE_SOURCES: Array<[AlgaeVariant, number]> = [
  [1, SWAMP_IMAGE_ASSETS.algae[1]],
  [2, SWAMP_IMAGE_ASSETS.algae[2]],
  [3, SWAMP_IMAGE_ASSETS.algae[3]],
  [4, SWAMP_IMAGE_ASSETS.algae[4]],
  [5, SWAMP_IMAGE_ASSETS.algae[5]],
  [6, SWAMP_IMAGE_ASSETS.algae[6]],
  [7, SWAMP_IMAGE_ASSETS.algae[7]],
  [8, SWAMP_IMAGE_ASSETS.algae[8]],
  [9, SWAMP_IMAGE_ASSETS.algae[9]],
  [10, SWAMP_IMAGE_ASSETS.algae[10]],
  [11, SWAMP_IMAGE_ASSETS.algae[11]],
  [12, SWAMP_IMAGE_ASSETS.algae[12]],
  [13, SWAMP_IMAGE_ASSETS.algae[13]],
  [14, SWAMP_IMAGE_ASSETS.algae[14]],
  [15, SWAMP_IMAGE_ASSETS.algae[15]],
  [16, SWAMP_IMAGE_ASSETS.algae[16]],
  [17, SWAMP_IMAGE_ASSETS.algae[17]],
  [18, SWAMP_IMAGE_ASSETS.algae[18]],
  [19, SWAMP_IMAGE_ASSETS.algae[19]],
  [20, SWAMP_IMAGE_ASSETS.algae[20]],
  [21, SWAMP_IMAGE_ASSETS.algae[21]],
];

export const SWAMP_DROP_SOURCES: Array<[DropVariant, number]> = [
  [1, SWAMP_IMAGE_ASSETS.drops[1]],
  [2, SWAMP_IMAGE_ASSETS.drops[2]],
  [3, SWAMP_IMAGE_ASSETS.drops[3]],
];

export const SWAMP_IMAGE_COUNT =
  1 +
  SWAMP_STONE_SOURCES.length +
  SWAMP_ALGAE_SOURCES.length +
  SWAMP_DROP_SOURCES.length;

export const SWAMP_PRELOAD_TOTAL = SWAMP_IMAGE_COUNT;
