import { AppState, Image, type AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import {
  SFX_VOLUME,
  SUCCESS_CLICK_VOLUME,
  UNDERSEA_SOUND_ASSETS,
  WATERFLOW_VOLUME,
} from './underseaThemeSoundAssets';

Sound.setCategory('Playback', true);

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
  startWaterflow: () => void;
  stopWaterflow: () => void;
  playRandomSplash: () => void;
  playBubbleInflate: () => void;
  playBubblePop: () => void;
  playSuccessClick: () => void;
  playWrongClick: () => void;
  playPrimaryClick: () => void;
  playFanfare: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
};

function resolveSoundUri(source: number): string {
  const resolved = Image.resolveAssetSource(source);
  if (resolved?.uri == null || resolved.uri.length === 0) {
    throw new Error('Unable to resolve sound asset URI');
  }
  return resolved.uri;
}

export function loadSound(source: number, volume: number): Promise<LoadedSound> {
  return new Promise((resolve, reject) => {
    const uri = resolveSoundUri(source);
    const sound = new Sound(uri, (error) => {
      if (error != null) {
        reject(error);
        return;
      }
      sound.setVolume(volume);
      resolve(sound);
    });
  });
}

/**
 * The audio session only needs activating once per foreground session. Calling
 * `Sound.setActive(true)` on every one-shot (e.g. each bubble pop in a staggered
 * cascade) is a redundant bridge round-trip that piles onto the JS thread.
 */
let audioSessionActive = false;

function activateAudioSession(): void {
  if (audioSessionActive) {
    return;
  }
  Sound.setActive(true);
  audioSessionActive = true;
}

function deactivateAudioSessionFlag(): void {
  audioSessionActive = false;
}

function playOneShot(sound: LoadedSound | null, volume = SFX_VOLUME): void {
  if (sound == null || !sound.isLoaded()) {
    return;
  }
  activateAudioSession();
  sound.setVolume(volume);
  sound.stop();
  sound.play();
}

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
    waterflow,
    splash0,
    splash1,
    splash2,
    splash3,
    bubbleInflate,
    bubblePop,
    successClick,
    wrongClick,
    primaryClick,
    fanfare,
  ] = await Promise.all([
    loadTracked(UNDERSEA_SOUND_ASSETS.waterflow, WATERFLOW_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[0], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[1], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[2], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.splash[3], SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.bubbleInflate, SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.bubblePop, SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.successClick, SUCCESS_CLICK_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.wrongClick, SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.primaryClick, SFX_VOLUME),
    loadTracked(UNDERSEA_SOUND_ASSETS.fanfare, SFX_VOLUME),
  ]);

  waterflow.setNumberOfLoops(-1);

  return {
    waterflow,
    splash: [splash0, splash1, splash2, splash3],
    bubbleInflate,
    bubblePop,
    successClick,
    wrongClick,
    primaryClick,
    fanfare,
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
    loaded.successClick,
    loaded.wrongClick,
    loaded.primaryClick,
    loaded.fanfare,
  ].forEach(sound => sound.release());
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
    startWaterflow: () => {
      if (state.muted || !loaded.waterflow.isLoaded()) {
        return;
      }
      activateAudioSession();
      state.waterflowPlaying = true;
      loaded.waterflow.play();
    },
    stopWaterflow: () => {
      state.waterflowPlaying = false;
      loaded.waterflow.stop();
    },
    playRandomSplash: () => {
      if (state.muted || loaded.splash.length === 0) {
        return;
      }
      const index = Math.floor(Math.random() * loaded.splash.length);
      playOneShot(loaded.splash[index] ?? null);
    },
    playBubbleInflate: () => {
      if (state.muted) {
        return;
      }
      playOneShot(loaded.bubbleInflate);
    },
    playBubblePop: () => {
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
