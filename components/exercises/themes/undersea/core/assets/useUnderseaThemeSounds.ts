import { AppState, type AppStateStatus } from 'react-native';
import type Sound from 'react-native-sound';
import {
  activateAudioSession,
  deactivateAudioSessionFlag,
  loadCoreThemeSounds,
  loadSound,
  playOneShot,
  releaseCoreThemeSounds,
  SUCCESS_CLICK_VOLUME,
} from '../../../../core/sounds/useCoreThemeSounds';
import {
  SFX_VOLUME,
  UNDERSEA_SOUND_ASSETS,
  WATERFLOW_VOLUME,
} from './underseaThemeSoundAssets';

type LoadedSound = Sound;

export type LoadedUnderseaThemeSounds = {
  waterflow: LoadedSound;
  splash: LoadedSound[];
  bubbleInflate: LoadedSound;
  bubblePop: LoadedSound;
  successClick: LoadedSound;
  wrongClick: LoadedSound;
  primaryClick: LoadedSound;
  fanfare: LoadedSound;
};

export type UnderseaThemeSoundController = {
  startAmbient: () => void;
  stopAmbient: () => void;
  playRandomBurst: () => void;
  playOrbInflate: () => void;
  playOrbPop: () => void;
  playSuccessClick: () => void;
  playWrongClick: () => void;
  playPrimaryClick: () => void;
  playFanfare: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
};

export async function loadAllUnderseaThemeSounds(
  onItemLoaded?: () => void,
): Promise<LoadedUnderseaThemeSounds> {
  const tick = () => {
    onItemLoaded?.();
  };
  const loadTracked = (source: number, volume: number) =>
    loadSound(source, volume).then(sound => {
      tick();
      return sound;
    });

  const [
    coreSounds,
    waterflow,
    splash0,
    splash1,
    splash2,
    splash3,
    bubbleInflate,
    bubblePop,
    primaryClick,
  ] = await Promise.all([
    loadCoreThemeSounds(tick),
    loadTracked(UNDERSEA_SOUND_ASSETS.waterflow, WATERFLOW_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[0], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[1], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[2], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[3], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.bubbleInflate, SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.bubblePop, SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.primaryClick, SFX_VOLUME),
  ]);

  waterflow.setNumberOfLoops(-1);

  return {
    waterflow,
    splash: [splash0, splash1, splash2, splash3],
    bubbleInflate,
    bubblePop,
    successClick: coreSounds.successClick,
    wrongClick: coreSounds.wrongClick,
    primaryClick,
    fanfare: coreSounds.fanfare,
  };
}

export function releaseUnderseaThemeSounds(loaded: LoadedUnderseaThemeSounds | null): void {
  if (loaded == null) {
    return;
  }
  loaded.waterflow.stop();
  [
    loaded.waterflow,
    ...loaded.splash,
    loaded.bubbleInflate,
    loaded.bubblePop,
    loaded.primaryClick,
  ].forEach(sound => sound.release());
  releaseCoreThemeSounds(loaded);
}

type SoundControllerState = {
  waterflowPlaying: boolean;
  muted: boolean;
};

export function createUnderseaThemeSoundController(
  loaded: LoadedUnderseaThemeSounds,
  state: SoundControllerState,
): UnderseaThemeSoundController {
  return {
    startAmbient: () => {
      if (state.muted || !loaded.waterflow.isLoaded()) {
        return;
      }
      activateAudioSession();
      state.waterflowPlaying = true;
      loaded.waterflow.play();
    },
    stopAmbient: () => {
      state.waterflowPlaying = false;
      loaded.waterflow.stop();
    },
    playRandomBurst: () => {
      if (state.muted || loaded.splash.length === 0) {
        return;
      }
      const index = Math.floor(Math.random() * loaded.splash.length);
      playOneShot(loaded.splash[index] ?? null);
    },
    playOrbInflate: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.bubbleInflate);
    },
    playOrbPop: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.bubblePop);
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
      playOneShot(loaded.primaryClick);
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
        loaded.waterflow.stop();
        return;
      }
      if (state.waterflowPlaying && loaded.waterflow.isLoaded()) {
        activateAudioSession();
        loaded.waterflow.play();
      }
    },
    isMuted: () => state.muted,
  };
}

export function bindUnderseaThemeSoundAppState(
  loaded: LoadedUnderseaThemeSounds,
  state: SoundControllerState,
): () => void {
  const handleAppState = (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      if (state.waterflowPlaying && !state.muted) {
        activateAudioSession();
        loaded.waterflow.play();
      }
      return;
    }
    if (nextState === 'background' || nextState === 'inactive') {
      loaded.waterflow.pause();
      // Force re-activation of the audio session when we return to foreground.
      deactivateAudioSessionFlag();
    }
  };

  const subscription = AppState.addEventListener('change', handleAppState);
  return () => subscription.remove();
}
