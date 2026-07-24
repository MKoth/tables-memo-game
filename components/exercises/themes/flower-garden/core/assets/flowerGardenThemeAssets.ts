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
    grassTilable: require('../../../../../../assets/images/flower_garden_theme/soil/grass-tilable.png'),
  },
  dandelion: {
    stem1: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_stem1.png'),
    stem2: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_stem2.png'),
    stem3: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_stem3.png'),
    stem4: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_stem4.png'),
    leaf1: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_leaf1.png'),
    leaf2: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_leaf2.png'),
    leaf3: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_leaf3.png'),
    leaf4: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_leaf4.png'),
    flower1: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_flower1.png'),
    flower2: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_flower2.png'),
    flower3: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_flower3.png'),
    flower4: require('../../../../../../assets/images/flower_garden_theme/dandelion/dandelion_flower4.png'),
  },
  chamomile: {
    stem1: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_stem1.png'),
    stem2: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_stem2.png'),
    stem3: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_stem3.png'),
    stem4: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_stem4.png'),
    leaf1: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_leaf1.png'),
    leaf2: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_leaf2.png'),
    leaf3: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_leaf3.png'),
    leaf4: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_leaf4.png'),
    flower1: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_flower1.png'),
    flower2: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_flower2.png'),
    flower3: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_flower3.png'),
    flower4: require('../../../../../../assets/images/flower_garden_theme/chamomile/chamomile_flower4.png'),
  },
  poppy: {
    stem1: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_stem1.png'),
    stem2: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_stem2.png'),
    stem3: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_stem3.png'),
    stem4: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_stem4.png'),
    leaf1: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_leaf1.png'),
    leaf2: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_leaf2.png'),
    leaf3: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_leaf3.png'),
    leaf4: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_leaf4.png'),
    flower1: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_flower1.png'),
    flower2: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_flower2.png'),
    flower3: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_flower3.png'),
    flower4: require('../../../../../../assets/images/flower_garden_theme/poppy/poppy_flower4.png'),
  },
  wild_violet: {
    stem1: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_stem1.png'),
    stem2: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_stem2.png'),
    stem3: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_stem3.png'),
    stem4: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_stem4.png'),
    leaf1: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_leaf1.png'),
    leaf2: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_leaf2.png'),
    leaf3: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_leaf3.png'),
    leaf4: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_leaf4.png'),
    flower1: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_flower1.png'),
    flower2: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_flower2.png'),
    flower3: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_flower3.png'),
    flower4: require('../../../../../../assets/images/flower_garden_theme/wild_violet/wild_violet_flower4.png'),
  },
  lycaenidae: {
    body: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_body.png'),
    leftWing1: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing1.png'),
    leftWing2: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing2.png'),
    leftWing3: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing3.png'),
    leftWing4: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing4.png'),
    leftWing5: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing5.png'),
    leftWing6: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing6.png'),
    leftWing7: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing7.png'),
    leftWing8: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing8.png'),
    leftWing9: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_left_wing9.png'),
    rightWing1: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing1.png'),
    rightWing2: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing2.png'),
    rightWing3: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing3.png'),
    rightWing4: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing4.png'),
    rightWing5: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing5.png'),
    rightWing6: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing6.png'),
    rightWing7: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing7.png'),
    rightWing8: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing8.png'),
    rightWing9: require('../../../../../../assets/images/flower_garden_theme/lycaenidae/lycaenidae_right_wing9.png'),
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
export const GRASS_TILABLE_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.grassTilable;

export const DANDELION_STEM1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.stem1;
export const DANDELION_STEM2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.stem2;
export const DANDELION_STEM3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.stem3;
export const DANDELION_STEM4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.stem4;
export const DANDELION_LEAF1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.leaf1;
export const DANDELION_LEAF2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.leaf2;
export const DANDELION_LEAF3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.leaf3;
export const DANDELION_LEAF4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.leaf4;
export const DANDELION_FLOWER1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.flower1;
export const DANDELION_FLOWER2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.flower2;
export const DANDELION_FLOWER3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.flower3;
export const DANDELION_FLOWER4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.dandelion.flower4;

export const DANDELION_STEM_SOURCES = [
  DANDELION_STEM1_SOURCE,
  DANDELION_STEM2_SOURCE,
  DANDELION_STEM3_SOURCE,
  DANDELION_STEM4_SOURCE,
] as const;

export const DANDELION_FLOWER_SOURCES = [
  DANDELION_FLOWER1_SOURCE,
  DANDELION_FLOWER2_SOURCE,
  DANDELION_FLOWER3_SOURCE,
  DANDELION_FLOWER4_SOURCE,
] as const;

export const DANDELION_LEAF_SOURCES = [
  DANDELION_LEAF1_SOURCE,
  DANDELION_LEAF2_SOURCE,
  DANDELION_LEAF3_SOURCE,
  DANDELION_LEAF4_SOURCE,
] as const;

export const CHAMOMILE_STEM1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.stem1;
export const CHAMOMILE_STEM2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.stem2;
export const CHAMOMILE_STEM3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.stem3;
export const CHAMOMILE_STEM4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.stem4;
export const CHAMOMILE_LEAF1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.leaf1;
export const CHAMOMILE_LEAF2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.leaf2;
export const CHAMOMILE_LEAF3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.leaf3;
export const CHAMOMILE_LEAF4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.leaf4;
export const CHAMOMILE_FLOWER1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.flower1;
export const CHAMOMILE_FLOWER2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.flower2;
export const CHAMOMILE_FLOWER3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.flower3;
export const CHAMOMILE_FLOWER4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.chamomile.flower4;

export const CHAMOMILE_STEM_SOURCES = [
  CHAMOMILE_STEM1_SOURCE,
  CHAMOMILE_STEM2_SOURCE,
  CHAMOMILE_STEM3_SOURCE,
  CHAMOMILE_STEM4_SOURCE,
] as const;

export const CHAMOMILE_FLOWER_SOURCES = [
  CHAMOMILE_FLOWER1_SOURCE,
  CHAMOMILE_FLOWER2_SOURCE,
  CHAMOMILE_FLOWER3_SOURCE,
  CHAMOMILE_FLOWER4_SOURCE,
] as const;

export const CHAMOMILE_LEAF_SOURCES = [
  CHAMOMILE_LEAF1_SOURCE,
  CHAMOMILE_LEAF2_SOURCE,
  CHAMOMILE_LEAF3_SOURCE,
  CHAMOMILE_LEAF4_SOURCE,
] as const;

export const POPPY_STEM1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.stem1;
export const POPPY_STEM2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.stem2;
export const POPPY_STEM3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.stem3;
export const POPPY_STEM4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.stem4;
export const POPPY_LEAF1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.leaf1;
export const POPPY_LEAF2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.leaf2;
export const POPPY_LEAF3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.leaf3;
export const POPPY_LEAF4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.leaf4;
export const POPPY_FLOWER1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.flower1;
export const POPPY_FLOWER2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.flower2;
export const POPPY_FLOWER3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.flower3;
export const POPPY_FLOWER4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.poppy.flower4;

export const POPPY_STEM_SOURCES = [
  POPPY_STEM1_SOURCE,
  POPPY_STEM2_SOURCE,
  POPPY_STEM3_SOURCE,
  POPPY_STEM4_SOURCE,
] as const;

export const POPPY_FLOWER_SOURCES = [
  POPPY_FLOWER1_SOURCE,
  POPPY_FLOWER2_SOURCE,
  POPPY_FLOWER3_SOURCE,
  POPPY_FLOWER4_SOURCE,
] as const;

export const POPPY_LEAF_SOURCES = [
  POPPY_LEAF1_SOURCE,
  POPPY_LEAF2_SOURCE,
  POPPY_LEAF3_SOURCE,
  POPPY_LEAF4_SOURCE,
] as const;

export const WILD_VIOLET_STEM1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.stem1;
export const WILD_VIOLET_STEM2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.stem2;
export const WILD_VIOLET_STEM3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.stem3;
export const WILD_VIOLET_STEM4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.stem4;
export const WILD_VIOLET_LEAF1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.leaf1;
export const WILD_VIOLET_LEAF2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.leaf2;
export const WILD_VIOLET_LEAF3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.leaf3;
export const WILD_VIOLET_LEAF4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.leaf4;
export const WILD_VIOLET_FLOWER1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.flower1;
export const WILD_VIOLET_FLOWER2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.flower2;
export const WILD_VIOLET_FLOWER3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.flower3;
export const WILD_VIOLET_FLOWER4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.wild_violet.flower4;

export const WILD_VIOLET_STEM_SOURCES = [
  WILD_VIOLET_STEM1_SOURCE,
  WILD_VIOLET_STEM2_SOURCE,
  WILD_VIOLET_STEM3_SOURCE,
  WILD_VIOLET_STEM4_SOURCE,
] as const;

export const WILD_VIOLET_FLOWER_SOURCES = [
  WILD_VIOLET_FLOWER1_SOURCE,
  WILD_VIOLET_FLOWER2_SOURCE,
  WILD_VIOLET_FLOWER3_SOURCE,
  WILD_VIOLET_FLOWER4_SOURCE,
] as const;

export const WILD_VIOLET_LEAF_SOURCES = [
  WILD_VIOLET_LEAF1_SOURCE,
  WILD_VIOLET_LEAF2_SOURCE,
  WILD_VIOLET_LEAF3_SOURCE,
  WILD_VIOLET_LEAF4_SOURCE,
] as const;

export const LYCAENIDAE_BODY_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.body;

export const LYCAENIDAE_LEFT_WING1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing1;
export const LYCAENIDAE_LEFT_WING2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing2;
export const LYCAENIDAE_LEFT_WING3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing3;
export const LYCAENIDAE_LEFT_WING4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing4;
export const LYCAENIDAE_LEFT_WING5_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing5;
export const LYCAENIDAE_LEFT_WING6_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing6;
export const LYCAENIDAE_LEFT_WING7_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing7;
export const LYCAENIDAE_LEFT_WING8_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing8;
export const LYCAENIDAE_LEFT_WING9_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.leftWing9;

export const LYCAENIDAE_RIGHT_WING1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing1;
export const LYCAENIDAE_RIGHT_WING2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing2;
export const LYCAENIDAE_RIGHT_WING3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing3;
export const LYCAENIDAE_RIGHT_WING4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing4;
export const LYCAENIDAE_RIGHT_WING5_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing5;
export const LYCAENIDAE_RIGHT_WING6_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing6;
export const LYCAENIDAE_RIGHT_WING7_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing7;
export const LYCAENIDAE_RIGHT_WING8_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing8;
export const LYCAENIDAE_RIGHT_WING9_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae.rightWing9;

export const LYCAENIDAE_LEFT_WING_SOURCES = [
  LYCAENIDAE_LEFT_WING1_SOURCE,
  LYCAENIDAE_LEFT_WING2_SOURCE,
  LYCAENIDAE_LEFT_WING3_SOURCE,
  LYCAENIDAE_LEFT_WING4_SOURCE,
  LYCAENIDAE_LEFT_WING5_SOURCE,
  LYCAENIDAE_LEFT_WING6_SOURCE,
  LYCAENIDAE_LEFT_WING7_SOURCE,
  LYCAENIDAE_LEFT_WING8_SOURCE,
  LYCAENIDAE_LEFT_WING9_SOURCE,
] as const;

export const LYCAENIDAE_RIGHT_WING_SOURCES = [
  LYCAENIDAE_RIGHT_WING1_SOURCE,
  LYCAENIDAE_RIGHT_WING2_SOURCE,
  LYCAENIDAE_RIGHT_WING3_SOURCE,
  LYCAENIDAE_RIGHT_WING4_SOURCE,
  LYCAENIDAE_RIGHT_WING5_SOURCE,
  LYCAENIDAE_RIGHT_WING6_SOURCE,
  LYCAENIDAE_RIGHT_WING7_SOURCE,
  LYCAENIDAE_RIGHT_WING8_SOURCE,
  LYCAENIDAE_RIGHT_WING9_SOURCE,
] as const;

export type FlowerGardenPetalKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.roses;
export type FlowerGardenBushKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.bush;
export type FlowerGardenSoilKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.soil;
export type FlowerGardenDandelionKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.dandelion;
export type FlowerGardenChamomileKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.chamomile;
export type FlowerGardenPoppyKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.poppy;
export type FlowerGardenWildVioletKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.wild_violet;
export type FlowerGardenLycaenidaeKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae;

export type FlowerGardenThemeImages = {
  roses: Record<FlowerGardenPetalKey, unknown>;
  roseBudImage: SkImage | null;
  roseCenterImage: SkImage | null;
  petalImages: SkImage[] | null;
  calyxImage: SkImage | null;
  stemImage: SkImage | null;
  leafImages: SkImage[] | null;
  earthImage: SkImage | null;
  grassImage: SkImage | null;
  dandelionStemImages: SkImage[] | null;
  dandelionLeafImages: SkImage[] | null;
  dandelionFlowerImages: SkImage[] | null;
  chamomileStemImages: SkImage[] | null;
  chamomileLeafImages: SkImage[] | null;
  chamomileFlowerImages: SkImage[] | null;
  poppyStemImages: SkImage[] | null;
  poppyLeafImages: SkImage[] | null;
  poppyFlowerImages: SkImage[] | null;
  wildVioletStemImages: SkImage[] | null;
  wildVioletLeafImages: SkImage[] | null;
  wildVioletFlowerImages: SkImage[] | null;
  lycaenidaeBodyImage: SkImage | null;
  lycaenidaeWingLeftImages: SkImage[] | null;
  lycaenidaeWingRightImages: SkImage[] | null;
};

export const FLOWER_GARDEN_IMAGE_COUNT =
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.roses).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.bush).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.soil).length;

export const FLOWER_GARDEN_SOUND_COUNT = 0;

export const FLOWER_GARDEN_PRELOAD_TOTAL =
  FLOWER_GARDEN_IMAGE_COUNT + FLOWER_GARDEN_SOUND_COUNT;

export { FLOWER_GARDEN_IMAGE_ASSETS };
