export const WATERFLOW_VOLUME = 0.25;
export const SFX_VOLUME = 0.8;
/** Max volume — stands out against other one-shots. */
export const SUCCESS_CLICK_VOLUME = 1.0;

export const UNDERSEA_SOUND_ASSETS = {
  waterflow: require('../../../../../assets/sounds/koi_theme/waterflow.wav'),
  splash: [
    require('../../../../../assets/sounds/koi_theme/splash1.mp3'),
    require('../../../../../assets/sounds/koi_theme/splash2.mp3'),
    require('../../../../../assets/sounds/koi_theme/splash3.mp3'),
    require('../../../../../assets/sounds/koi_theme/splash4.mp3'),
  ],
  bubbleInflate: require('../../../../../assets/sounds/koi_theme/bubbles-inflates.mp3'),
  bubblePop: require('../../../../../assets/sounds/koi_theme/bubble-pop.mp3'),
  successClick: require('../../../../../assets/sounds/koi_theme/success_click.mp3'),
  wrongClick: require('../../../../../assets/sounds/koi_theme/wrong_click.wav'),
  primaryClick: require('../../../../../assets/sounds/koi_theme/primary_click.wav'),
  fanfare: require('../../../../../assets/sounds/koi_theme/success-fanfare-trumpets.mp3'),
} as const;
