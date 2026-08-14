export const WATERFLOW_VOLUME = 0.25;
export const SFX_VOLUME = 0.8;

export const UNDERSEA_SOUND_ASSETS = {
  waterflow: require('../../../../../../assets/sounds/undersea_theme/waterflow.m4a'),
  splash: [
    require('../../../../../../assets/sounds/undersea_theme/splash1.mp3'),
    require('../../../../../../assets/sounds/undersea_theme/splash2.mp3'),
    require('../../../../../../assets/sounds/undersea_theme/splash3.mp3'),
    require('../../../../../../assets/sounds/undersea_theme/splash4.mp3'),
  ],
  bubbleInflate: require('../../../../../../assets/sounds/undersea_theme/bubbles-inflates.mp3'),
  bubblePop: require('../../../../../../assets/sounds/undersea_theme/bubble-pop.mp3'),
  primaryClick: require('../../../../../../assets/sounds/undersea_theme/primary_click.m4a'),
} as const;
