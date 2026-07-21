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

export type FlowerGardenPetalKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.roses;
export type FlowerGardenBushKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.bush;

export type FlowerGardenThemeImages = {
  roses: Record<FlowerGardenPetalKey, unknown>;
  roseBudImage: SkImage | null;
  roseCenterImage: SkImage | null;
  petalImages: SkImage[] | null;
  calyxImage: SkImage | null;
  stemImage: SkImage | null;
  leafImages: SkImage[] | null;
};

export const FLOWER_GARDEN_IMAGE_COUNT =
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.roses).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.bush).length;

export const FLOWER_GARDEN_SOUND_COUNT = 0;

export const FLOWER_GARDEN_PRELOAD_TOTAL =
  FLOWER_GARDEN_IMAGE_COUNT + FLOWER_GARDEN_SOUND_COUNT;

export { FLOWER_GARDEN_IMAGE_ASSETS };
