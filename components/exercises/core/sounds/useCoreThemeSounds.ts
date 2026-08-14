import { Image } from 'react-native';
import Sound from 'react-native-sound';
import {
  CORE_SOUND_ASSETS,
  DEFAULT_SFX_VOLUME,
  SUCCESS_CLICK_VOLUME,
} from './coreSoundAssets';

export { CORE_SOUND_ASSETS, DEFAULT_SFX_VOLUME, SUCCESS_CLICK_VOLUME } from './coreSoundAssets';

Sound.setCategory('Playback', true);

export type LoadedCoreSound = Sound;

export type LoadedCoreThemeSounds = {
  successClick: LoadedCoreSound;
  wrongClick: LoadedCoreSound;
  fanfare: LoadedCoreSound;
};

export function resolveSoundUri(source: number): string {
  const resolved = Image.resolveAssetSource(source);
  if (resolved?.uri == null || resolved.uri.length === 0) {
    throw new Error('Unable to resolve sound asset URI');
  }
  return resolved.uri;
}

export function loadSound(source: number, volume: number): Promise<LoadedCoreSound> {  return new Promise((resolve, reject) => {
    const uri = resolveSoundUri(source);
    const sound = new Sound(uri, error => {
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

export function activateAudioSession(): void {
  if (audioSessionActive) {
    return;
  }
  Sound.setActive(true);
  audioSessionActive = true;
}

export function deactivateAudioSessionFlag(): void {
  audioSessionActive = false;
}

export function playOneShot(sound: Sound | null, volume = DEFAULT_SFX_VOLUME): void {
  if (sound == null || !sound.isLoaded()) {
    return;
  }
  activateAudioSession();
  sound.setVolume(volume);
  sound.stop();
  sound.play();
}

export async function loadCoreThemeSounds(
  onItemLoaded?: () => void,
): Promise<LoadedCoreThemeSounds> {
  const tick = () => {
    onItemLoaded?.();
  };
  const loadTracked = (source: number, volume: number) =>
    loadSound(source, volume).then(sound => {
      tick();
      return sound;
    });

  const [successClick, wrongClick, fanfare] = await Promise.all([
    loadTracked(CORE_SOUND_ASSETS.successClick, SUCCESS_CLICK_VOLUME),
    loadTracked(CORE_SOUND_ASSETS.wrongClick, DEFAULT_SFX_VOLUME),
    loadTracked(CORE_SOUND_ASSETS.fanfare, DEFAULT_SFX_VOLUME),
  ]);

  return { successClick, wrongClick, fanfare };
}

export function releaseCoreThemeSounds(loaded: LoadedCoreThemeSounds | null): void {
  if (loaded == null) {
    return;
  }
  loaded.successClick.stop();
  loaded.wrongClick.stop();
  loaded.fanfare.stop();
  loaded.successClick.release();
  loaded.wrongClick.release();
  loaded.fanfare.release();
}
