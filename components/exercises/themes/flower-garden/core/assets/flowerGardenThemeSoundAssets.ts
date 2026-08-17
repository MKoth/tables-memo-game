export const AMBIENCE_VOLUME = 0.75;
export const BEE_BUZZ_VOLUME = 0.08;
export const BUMBLEBEE_BUZZ_VOLUME = 0.0075;
export const ORB_VOLUME = 0.02;
export const PRIMARY_CLICK_VOLUME = 0.03;

export const FLOWER_GARDEN_SOUND_ASSETS = {
  ambience: require('../../../../../../assets/sounds/flower_garden_theme/ambience.m4a'),
  orbOpen: require('../../../../../../assets/sounds/flower_garden_theme/orb_open.m4a'),
  orbClose: require('../../../../../../assets/sounds/flower_garden_theme/orb_close.m4a'),
  primaryClick: require('../../../../../../assets/sounds/flower_garden_theme/primary_click.m4a'),
  bee: require('../../../../../../assets/sounds/flower_garden_theme/bee.m4a'),
  bumblebee: require('../../../../../../assets/sounds/flower_garden_theme/bumblebee.m4a'),
} as const;
