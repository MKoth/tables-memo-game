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
} as const;

export const ROSE_BUD_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.bud;
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

export type FlowerGardenPetalKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.roses;

export type FlowerGardenThemeImages = {
  roses: Record<FlowerGardenPetalKey, unknown>;
  roseBudImage: SkImage | null;
  petalImages: SkImage[] | null;
};

export const FLOWER_GARDEN_IMAGE_COUNT = Object.keys(
  FLOWER_GARDEN_IMAGE_ASSETS.roses,
).length;

export const FLOWER_GARDEN_SOUND_COUNT = 0;

export const FLOWER_GARDEN_PRELOAD_TOTAL =
  FLOWER_GARDEN_IMAGE_COUNT + FLOWER_GARDEN_SOUND_COUNT;

export { FLOWER_GARDEN_IMAGE_ASSETS };
