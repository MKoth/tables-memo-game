import type { ThemeSoundController } from '../../../../themeContract';

export type FlowerGardenSoundController = ThemeSoundController;

const noop = () => {};

export function createFlowerGardenSoundController(): FlowerGardenSoundController {
  return {
    startAmbient: noop,
    stopAmbient: noop,
    playRandomBurst: noop,
    playOrbInflate: noop,
    playOrbPop: noop,
    playSuccessClick: noop,
    playWrongClick: noop,
    playPrimaryClick: noop,
    playFanfare: noop,
    setMuted: noop,
    isMuted: () => false,
  };
}
