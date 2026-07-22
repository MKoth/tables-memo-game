import type { SkImage } from '@shopify/react-native-skia';

const FLOWER_GARDEN_IMAGE_ASSETS = {
  roses: {
    petal1: require('../../../../../../assets/images/flower_garden_theme/roses/pettel1.png'),
    petal2: require('../../../../../../assets/images/flower_garden_theme/roses/pettel2.png'),
    petal3: require('../../../../../../assets/images/flower_garden_theme/roses/pettel3.png'),
    petal4: require('../../../../../../assets/images/flower_garden_theme/roses/pettel4.png'),
    petal5: require('../../../../../../assets/images/flower_garden_theme/roses/pettel5.png'),
    petal6: require('../../../../../../assets/images/flower_garden_theme/roses/pettel6.png'),
    bud: require('../../../../../../assets/images/flower_garden_theme/roses/rose_bud.png'),
    center: require('../../../../../../assets/images/flower_garden_theme/roses/rose_center.png'),
  },
  bush: {
    stem: require('../../../../../../assets/images/flower_garden_theme/roses/stem.png'),
    calyx: require('../../../../../../assets/images/flower_garden_theme/roses/rose_base.png'),
    leaf1: require('../../../../../../assets/images/flower_garden_theme/roses/leaf1.png'),
    leaf2: require('../../../../../../assets/images/flower_garden_theme/roses/leaf2.png'),
    leaf3: require('../../../../../../assets/images/flower_garden_theme/roses/leaf3.png'),
    leaf4: require('../../../../../../assets/images/flower_garden_theme/roses/leaf4.png'),
  },
  soil: {
    earth: require('../../../../../../assets/images/flower_garden_theme/soil/earth.png'),
    grass: {
      grass1: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass1.png'),
      grass2: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass2.png'),
      grass3: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass3.png'),
      grass4: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass4.png'),
      grass5: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass5.png'),
      grass6: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass6.png'),
      grass7: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass7.png'),
      grass8: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass8.png'),
      grass9: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass9.png'),
      grass10: require('../../../../../../assets/images/flower_garden_theme/soil/grass/grass10.png'),
    },
  },
} as const;

export const ROSE_BUD_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.bud;
export const ROSE_CENTER_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.center;
export const PETAL1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.petal1;
export const PETAL2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.petal2;
export const PETAL3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.petal3;
export const PETAL4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.petal4;
export const PETAL5_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.petal5;
export const PETAL6_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.petal6;

export const PETAL_SOURCES = [
  PETAL1_SOURCE,
  PETAL2_SOURCE,
  PETAL3_SOURCE,
  PETAL4_SOURCE,
  PETAL5_SOURCE,
  PETAL6_SOURCE,
] as const;

export const STEM_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bush.stem;
export const CALYX_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bush.calyx;
export const LEAF1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bush.leaf1;
export const LEAF2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bush.leaf2;
export const LEAF3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bush.leaf3;
export const LEAF4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bush.leaf4;

export const LEAF_SOURCES = [
  LEAF1_SOURCE,
  LEAF2_SOURCE,
  LEAF3_SOURCE,
  LEAF4_SOURCE,
] as const;

export const EARTH_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.earth;

const GRASS_ASSETS = FLOWER_GARDEN_IMAGE_ASSETS.soil.grass;

export const GRASS1_SOURCE = GRASS_ASSETS.grass1;
export const GRASS2_SOURCE = GRASS_ASSETS.grass2;
export const GRASS3_SOURCE = GRASS_ASSETS.grass3;
export const GRASS4_SOURCE = GRASS_ASSETS.grass4;
export const GRASS5_SOURCE = GRASS_ASSETS.grass5;
export const GRASS6_SOURCE = GRASS_ASSETS.grass6;
export const GRASS7_SOURCE = GRASS_ASSETS.grass7;
export const GRASS8_SOURCE = GRASS_ASSETS.grass8;
export const GRASS9_SOURCE = GRASS_ASSETS.grass9;
export const GRASS10_SOURCE = GRASS_ASSETS.grass10;

export const GRASS_SOURCES = [
  GRASS1_SOURCE,
  GRASS2_SOURCE,
  GRASS3_SOURCE,
  GRASS4_SOURCE,
  GRASS5_SOURCE,
  GRASS6_SOURCE,
  GRASS7_SOURCE,
  GRASS8_SOURCE,
  GRASS9_SOURCE,
  GRASS10_SOURCE,
] as const;

export type FlowerGardenPetalKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.roses;
export type FlowerGardenBushKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.bush;
export type FlowerGardenSoilKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.soil;

export type FlowerGardenThemeImages = {
  roses: Record<FlowerGardenPetalKey, unknown>;
  roseBudImage: SkImage | null;
  roseCenterImage: SkImage | null;
  petalImages: SkImage[] | null;
  calyxImage: SkImage | null;
  stemImage: SkImage | null;
  leafImages: SkImage[] | null;
  earthImage: SkImage | null;
  grassImages: SkImage[] | null;
  grassAtlasImage: SkImage | null;
  grassSpriteRects: { x: number; y: number; width: number; height: number }[] | null;
};

const N_ROSES = Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.roses).length;
const N_BUSH = Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.bush).length;
const N_EARTH = 1;
const N_GRASS = Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.soil.grass).length;

export const FLOWER_GARDEN_IMAGE_COUNT = N_ROSES + N_BUSH + N_EARTH + N_GRASS;


export const FLOWER_GARDEN_SOUND_COUNT = 0;

export const FLOWER_GARDEN_PRELOAD_TOTAL =
  FLOWER_GARDEN_IMAGE_COUNT + FLOWER_GARDEN_SOUND_COUNT;

export { FLOWER_GARDEN_IMAGE_ASSETS };
