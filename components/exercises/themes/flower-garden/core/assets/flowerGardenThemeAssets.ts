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

export type FlowerGardenPetalKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.roses;

export type FlowerGardenThemeImages = {
  roses: Record<FlowerGardenPetalKey, unknown>;
  roseBudImage: SkImage | null;
};

export const FLOWER_GARDEN_IMAGE_COUNT = Object.keys(
  FLOWER_GARDEN_IMAGE_ASSETS.roses,
).length;

export const FLOWER_GARDEN_SOUND_COUNT = 0;

export const FLOWER_GARDEN_PRELOAD_TOTAL =
  FLOWER_GARDEN_IMAGE_COUNT + FLOWER_GARDEN_SOUND_COUNT;

export { FLOWER_GARDEN_IMAGE_ASSETS };
