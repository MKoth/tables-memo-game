import { AppState, type AppStateStatus } from 'react-native';
import type Sound from 'react-native-sound';
import {
  activateAudioSession,
  deactivateAudioSessionFlag,
  DEFAULT_SFX_VOLUME,
  loadCoreThemeSounds,
  loadSound,
  playOneShot,
  releaseCoreThemeSounds,
  SUCCESS_CLICK_VOLUME,
  type LoadedCoreThemeSounds,
} from '../../../../core/sounds/useCoreThemeSounds';
import type { ThemeSoundController } from '../../../../themeContract';
import {
  AMBIENCE_VOLUME,
  BEE_BUZZ_VOLUME,
  BUMBLEBEE_BUZZ_VOLUME,
  FLOWER_GARDEN_SOUND_ASSETS,
  ORB_VOLUME,
  PRIMARY_CLICK_VOLUME,
} from './flowerGardenThemeSoundAssets';

export type FlowerGardenBuzzSpecies = 'bee' | 'bumblebee';

export type FlowerGardenSoundController = ThemeSoundController & {
  registerRoamerBuzz: (roamerIndex: number, species: FlowerGardenBuzzSpecies) => void;
  setRoamerBuzzActive: (roamerIndex: number, active: boolean) => void;
  releaseRoamerBuzz: (roamerIndex: number) => void;
};

export type LoadedFlowerGardenThemeSounds = LoadedCoreThemeSounds & {
  ambience: Sound;
  orbOpen: Sound;
  orbClose: Sound;
  primaryClick: Sound;
  beeSource: number;
  bumblebeeSource: number;
};

type BuzzLoop = {
  species: FlowerGardenBuzzSpecies;
  sound: Sound | null;
  shouldPlay: boolean;
};

export async function loadAllFlowerGardenThemeSounds(
  onItemLoaded?: () => void,
): Promise<LoadedFlowerGardenThemeSounds> {
  const tick = () => {
    onItemLoaded?.();
  };
  const loadTracked = (source: number, volume: number) =>
    loadSound(source, volume).then(sound => {
      tick();
      return sound;
    });

  const [coreSounds, ambience, orbOpen, orbClose, primaryClick] = await Promise.all([
    loadCoreThemeSounds(tick),
    loadTracked(FLOWER_GARDEN_SOUND_ASSETS.ambience, AMBIENCE_VOLUME),
    loadTracked(FLOWER_GARDEN_SOUND_ASSETS.orbOpen, ORB_VOLUME),
    loadTracked(FLOWER_GARDEN_SOUND_ASSETS.orbClose, ORB_VOLUME),
    loadTracked(FLOWER_GARDEN_SOUND_ASSETS.primaryClick, PRIMARY_CLICK_VOLUME),
  ]);

  ambience.setNumberOfLoops(-1);

  return {
    ...coreSounds,
    ambience,
    orbOpen,
    orbClose,
    primaryClick,
    beeSource: FLOWER_GARDEN_SOUND_ASSETS.bee,
    bumblebeeSource: FLOWER_GARDEN_SOUND_ASSETS.bumblebee,
  };
}

export function releaseFlowerGardenThemeSounds(
  loaded: LoadedFlowerGardenThemeSounds | null,
): void {
  if (loaded == null) {
    return;
  }
  loaded.ambience.stop();
  loaded.orbOpen.release();
  loaded.orbClose.release();
  loaded.primaryClick.release();
  loaded.ambience.release();
  releaseCoreThemeSounds(loaded);
}

type SoundControllerState = {
  ambiencePlaying: boolean;
  muted: boolean;
};

export function createFlowerGardenSoundController(
  loaded: LoadedFlowerGardenThemeSounds,
  state: SoundControllerState,
): { sounds: FlowerGardenSoundController; bindAppState: () => () => void } {
  const buzzLoops = new Map<number, BuzzLoop>();

  const createBuzzLoop = (roamerIndex: number, species: FlowerGardenBuzzSpecies) => {
    const loop: BuzzLoop = { species, sound: null, shouldPlay: false };
    buzzLoops.set(roamerIndex, loop);
    const source = species === 'bee' ? loaded.beeSource : loaded.bumblebeeSource;
    const volume = species === 'bee' ? BEE_BUZZ_VOLUME : BUMBLEBEE_BUZZ_VOLUME;
    loadSound(source, volume)
      .then(sound => {
        const current = buzzLoops.get(roamerIndex);
        if (current !== loop) {
          sound.release();
          return;
        }
        sound.setNumberOfLoops(-1);
        loop.sound = sound;
        if (loop.shouldPlay && !state.muted) {
          activateAudioSession();
          sound.play();
        }
      })
      .catch(() => {
        const current = buzzLoops.get(roamerIndex);
        if (current === loop) {
          buzzLoops.delete(roamerIndex);
        }
      });
  };

  const releaseBuzzLoops = () => {
    for (const [, loop] of buzzLoops) {
      loop.shouldPlay = false;
      loop.sound?.stop();
      loop.sound?.release();
    }
    buzzLoops.clear();
  };

  const pauseAllBuzzLoops = () => {
    for (const [, loop] of buzzLoops) {
      loop.sound?.pause();
    }
  };

  const resumeBuzzLoops = () => {
    for (const [, loop] of buzzLoops) {
      if (loop.shouldPlay && !state.muted && loop.sound != null) {
        activateAudioSession();
        loop.sound.play();
      }
    }
  };

  const sounds: FlowerGardenSoundController = {
    startAmbient: () => {
      if (state.muted || !loaded.ambience.isLoaded()) {
        return;
      }
      activateAudioSession();
      state.ambiencePlaying = true;
      loaded.ambience.play();
    },
    stopAmbient: () => {
      state.ambiencePlaying = false;
      loaded.ambience.stop();
    },
    playRandomBurst: () => {},
    playOrbInflate: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.orbOpen, ORB_VOLUME);
    },
    playOrbPop: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.orbClose, ORB_VOLUME);
    },
    playSuccessClick: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.successClick, SUCCESS_CLICK_VOLUME);
    },
    playWrongClick: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.wrongClick);
    },
    playPrimaryClick: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.primaryClick, PRIMARY_CLICK_VOLUME);
    },
    playFanfare: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.fanfare);
    },
    setMuted: (muted: boolean) => {
      if (state.muted === muted) {
        return;
      }
      state.muted = muted;
      if (muted) {
        loaded.ambience.stop();
        pauseAllBuzzLoops();
        return;
      }
      if (state.ambiencePlaying && loaded.ambience.isLoaded()) {
        activateAudioSession();
        loaded.ambience.play();
      }
      resumeBuzzLoops();
    },
    isMuted: () => state.muted,
    registerRoamerBuzz: createBuzzLoop,
    setRoamerBuzzActive: (roamerIndex: number, active: boolean) => {
      const loop = buzzLoops.get(roamerIndex);
      if (loop == null) {
        return;
      }
      loop.shouldPlay = active;
      if (loop.sound == null) {
        return;
      }
      if (!active || state.muted) {
        loop.sound.pause();
        return;
      }
      if (!loop.sound.isPlaying()) {
        activateAudioSession();
        loop.sound.play();
      }
    },
    releaseRoamerBuzz: (roamerIndex: number) => {
      const loop = buzzLoops.get(roamerIndex);
      if (loop == null) {
        return;
      }
      loop.shouldPlay = false;
      loop.sound?.stop();
      loop.sound?.release();
      buzzLoops.delete(roamerIndex);
    },
  };

  const bindAppState = (): (() => void) => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (state.ambiencePlaying && !state.muted) {
          activateAudioSession();
          loaded.ambience.play();
        }
        resumeBuzzLoops();
        return;
      }
      if (nextState === 'background' || nextState === 'inactive') {
        loaded.ambience.pause();
        pauseAllBuzzLoops();
        deactivateAudioSessionFlag();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => {
      subscription.remove();
      releaseBuzzLoops();
    };
  };

  return { sounds, bindAppState };
}
