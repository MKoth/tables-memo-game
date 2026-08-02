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
    substrate: require('../../../../../../assets/images/flower_garden_theme/roses/substrate.png'),
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
    clover1: require('../../../../../../assets/images/flower_garden_theme/soil/clower1.png'),
    clover2: require('../../../../../../assets/images/flower_garden_theme/soil/clower2.png'),
    clover3: require('../../../../../../assets/images/flower_garden_theme/soil/clower3.png'),
    clover4: require('../../../../../../assets/images/flower_garden_theme/soil/clower4.png'),
    mossStone1: require('../../../../../../assets/images/flower_garden_theme/soil/moss_stone1.png'),
    mossStone2: require('../../../../../../assets/images/flower_garden_theme/soil/moss_stone2.png'),
    mossStone3: require('../../../../../../assets/images/flower_garden_theme/soil/moss_stone3.png'),
    mossStone4: require('../../../../../../assets/images/flower_garden_theme/soil/moss_stone4.png'),
    mossStone5: require('../../../../../../assets/images/flower_garden_theme/soil/moss_stone5.png'),
    mossStone6: require('../../../../../../assets/images/flower_garden_theme/soil/moss_stone6.png'),
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
  bee: {
    body: require('../../../../../../assets/images/flower_garden_theme/bee/bee_body.png'),
    leftWing: require('../../../../../../assets/images/flower_garden_theme/bee/bee_left_wing.png'),
    rightWing: require('../../../../../../assets/images/flower_garden_theme/bee/bee_right_wing.png'),
  },
  bumblebee: {
    body: require('../../../../../../assets/images/flower_garden_theme/bumblebee/bumblebee_body.png'),
    leftWing: require('../../../../../../assets/images/flower_garden_theme/bumblebee/bumblebee_left_wing.png'),
    rightWing: require('../../../../../../assets/images/flower_garden_theme/bumblebee/bumblebee_right_wing.png'),
  },
  orb: {
    petal1: require('../../../../../../assets/images/flower_garden_theme/orb/pettel1.png'),
    petal2: require('../../../../../../assets/images/flower_garden_theme/orb/pettel2.png'),
    petal3: require('../../../../../../assets/images/flower_garden_theme/orb/pettel3.png'),
    petal4: require('../../../../../../assets/images/flower_garden_theme/orb/pettel4.png'),
    petal5: require('../../../../../../assets/images/flower_garden_theme/orb/pettel5.png'),
    petal6: require('../../../../../../assets/images/flower_garden_theme/orb/pettel6.png'),
    petal7: require('../../../../../../assets/images/flower_garden_theme/orb/pettel7.png'),
    petal8: require('../../../../../../assets/images/flower_garden_theme/orb/pettel8.png'),
    petal9: require('../../../../../../assets/images/flower_garden_theme/orb/pettel9.png'),
    petal10: require('../../../../../../assets/images/flower_garden_theme/orb/pettel10.png'),
    petal11: require('../../../../../../assets/images/flower_garden_theme/orb/pettel11.png'),
    petal12: require('../../../../../../assets/images/flower_garden_theme/orb/pettel12.png'),
    petal13: require('../../../../../../assets/images/flower_garden_theme/orb/pettel13.png'),
    petal14: require('../../../../../../assets/images/flower_garden_theme/orb/pettel14.png'),
    petal15: require('../../../../../../assets/images/flower_garden_theme/orb/pettel15.png'),
    petal16: require('../../../../../../assets/images/flower_garden_theme/orb/pettel16.png'),
    petal17: require('../../../../../../assets/images/flower_garden_theme/orb/pettel17.png'),
    petal18: require('../../../../../../assets/images/flower_garden_theme/orb/pettel18.png'),
    petal19: require('../../../../../../assets/images/flower_garden_theme/orb/pettel19.png'),
    petal20: require('../../../../../../assets/images/flower_garden_theme/orb/pettel20.png'),
    petal21: require('../../../../../../assets/images/flower_garden_theme/orb/pettel21.png'),
  },
} as const;

export const ROSE_BUD_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.bud;
export const ROSE_CENTER_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.center;
export const ROSE_SUBSTRATE_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.roses.substrate;
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

export const CLOVER1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.clover1;
export const CLOVER2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.clover2;
export const CLOVER3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.clover3;
export const CLOVER4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.clover4;

export const CLOVER_SOURCES = [
  CLOVER1_SOURCE,
  CLOVER2_SOURCE,
  CLOVER3_SOURCE,
  CLOVER4_SOURCE,
] as const;

export const MOSS_STONE1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.mossStone1;
export const MOSS_STONE2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.mossStone2;
export const MOSS_STONE3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.mossStone3;
export const MOSS_STONE4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.mossStone4;
export const MOSS_STONE5_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.mossStone5;
export const MOSS_STONE6_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.soil.mossStone6;

export const MOSS_STONE_SOURCES = [
  MOSS_STONE1_SOURCE,
  MOSS_STONE2_SOURCE,
  MOSS_STONE3_SOURCE,
  MOSS_STONE4_SOURCE,
  MOSS_STONE5_SOURCE,
  MOSS_STONE6_SOURCE,
] as const;

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
export const BEE_BODY_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bee.body;
export const BEE_LEFT_WING_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bee.leftWing;
export const BEE_RIGHT_WING_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bee.rightWing;

export const BUMBLEBEE_BODY_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bumblebee.body;
export const BUMBLEBEE_LEFT_WING_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bumblebee.leftWing;
export const BUMBLEBEE_RIGHT_WING_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.bumblebee.rightWing;

export const ORB_PETAL1_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal1;
export const ORB_PETAL2_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal2;
export const ORB_PETAL3_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal3;
export const ORB_PETAL4_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal4;
export const ORB_PETAL5_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal5;
export const ORB_PETAL6_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal6;
export const ORB_PETAL7_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal7;
export const ORB_PETAL8_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal8;
export const ORB_PETAL9_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal9;
export const ORB_PETAL10_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal10;
export const ORB_PETAL11_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal11;
export const ORB_PETAL12_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal12;
export const ORB_PETAL13_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal13;
export const ORB_PETAL14_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal14;
export const ORB_PETAL15_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal15;
export const ORB_PETAL16_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal16;
export const ORB_PETAL17_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal17;
export const ORB_PETAL18_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal18;
export const ORB_PETAL19_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal19;
export const ORB_PETAL20_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal20;
export const ORB_PETAL21_SOURCE = FLOWER_GARDEN_IMAGE_ASSETS.orb.petal21;

export const ORB_PETAL_SOURCES = [
  ORB_PETAL1_SOURCE,
  ORB_PETAL2_SOURCE,
  ORB_PETAL3_SOURCE,
  ORB_PETAL4_SOURCE,
  ORB_PETAL5_SOURCE,
  ORB_PETAL6_SOURCE,
  ORB_PETAL7_SOURCE,
  ORB_PETAL8_SOURCE,
  ORB_PETAL9_SOURCE,
  ORB_PETAL10_SOURCE,
  ORB_PETAL11_SOURCE,
  ORB_PETAL12_SOURCE,
  ORB_PETAL13_SOURCE,
  ORB_PETAL14_SOURCE,
  ORB_PETAL15_SOURCE,
  ORB_PETAL16_SOURCE,
  ORB_PETAL17_SOURCE,
  ORB_PETAL18_SOURCE,
  ORB_PETAL19_SOURCE,
  ORB_PETAL20_SOURCE,
  ORB_PETAL21_SOURCE,
] as const;

export type FlowerGardenLycaenidaeKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae;
export type FlowerGardenBeeKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.bee;
export type FlowerGardenBumblebeeKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.bumblebee;
export type FlowerGardenOrbKey = keyof typeof FLOWER_GARDEN_IMAGE_ASSETS.orb;

export type FlowerGardenThemeImages = {
  roses: Record<FlowerGardenPetalKey, unknown>;
  roseBudImage: SkImage | null;
  roseCenterImage: SkImage | null;
  substrateImage: SkImage | null;
  petalImages: SkImage[] | null;
  calyxImage: SkImage | null;
  stemImage: SkImage | null;
  leafImages: SkImage[] | null;
  earthImage: SkImage | null;
  grassImage: SkImage | null;
  cloverImages: SkImage[] | null;
  mossStoneImages: SkImage[] | null;
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
  beeBodyImage: SkImage | null;
  beeLeftWingImage: SkImage | null;
  beeRightWingImage: SkImage | null;
  bumblebeeBodyImage: SkImage | null;
  bumblebeeLeftWingImage: SkImage | null;
  bumblebeeRightWingImage: SkImage | null;
  orbPetalImages: SkImage[] | null;
};

export const FLOWER_GARDEN_IMAGE_COUNT =
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.roses).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.bush).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.soil).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.dandelion).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.chamomile).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.poppy).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.wild_violet).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.lycaenidae).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.bee).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.bumblebee).length +
  Object.keys(FLOWER_GARDEN_IMAGE_ASSETS.orb).length;

export const FLOWER_GARDEN_SOUND_COUNT = 0;

export const FLOWER_GARDEN_PRELOAD_TOTAL =
  FLOWER_GARDEN_IMAGE_COUNT + FLOWER_GARDEN_SOUND_COUNT;

export { FLOWER_GARDEN_IMAGE_ASSETS };
