import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, type AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import {
  SFX_VOLUME,
  SUCCESS_CLICK_VOLUME,
  UNDERSEA_SOUND_ASSETS,
  WATERFLOW_VOLUME,
} from './underseaSoundAssets';

Sound.setCategory('Playback', true);

type LoadedSound = Sound;

function resolveSoundUri(source: number): string {
  const resolved = Image.resolveAssetSource(source);
  if (resolved?.uri == null || resolved.uri.length === 0) {
    throw new Error('Unable to resolve sound asset URI');
  }
  return resolved.uri;
}

function loadSound(source: number, volume: number): Promise<LoadedSound> {
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

function activateAudioSession(): void {
  Sound.setActive(true);
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

export type UnderseaSounds = {
  ready: boolean;
  startWaterflow: () => void;
  stopWaterflow: () => void;
  playRandomSplash: () => void;
  playBubbleInflate: () => void;
  playBubblePop: () => void;
  playSuccessClick: () => void;
  playWrongClick: () => void;
  playPrimaryClick: () => void;
  playFanfare: () => void;
};

export function useUnderseaSounds(): UnderseaSounds {
  const [ready, setReady] = useState(false);
  const waterflowRef = useRef<LoadedSound | null>(null);
  const splashRef = useRef<LoadedSound[]>([]);
  const bubbleInflateRef = useRef<LoadedSound | null>(null);
  const bubblePopRef = useRef<LoadedSound | null>(null);
  const successClickRef = useRef<LoadedSound | null>(null);
  const wrongClickRef = useRef<LoadedSound | null>(null);
  const primaryClickRef = useRef<LoadedSound | null>(null);
  const fanfareRef = useRef<LoadedSound | null>(null);
  const waterflowPlayingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
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
          loadSound(UNDERSEA_SOUND_ASSETS.waterflow, WATERFLOW_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.splash[0], SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.splash[1], SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.splash[2], SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.splash[3], SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.bubbleInflate, SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.bubblePop, SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.successClick, SUCCESS_CLICK_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.wrongClick, SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.primaryClick, SFX_VOLUME),
          loadSound(UNDERSEA_SOUND_ASSETS.fanfare, SFX_VOLUME),
        ]);

        if (cancelled) {
          [
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
          ].forEach(s => s.release());
          return;
        }

        waterflow.setNumberOfLoops(-1);
        waterflowRef.current = waterflow;
        splashRef.current = [splash0, splash1, splash2, splash3];
        bubbleInflateRef.current = bubbleInflate;
        bubblePopRef.current = bubblePop;
        successClickRef.current = successClick;
        wrongClickRef.current = wrongClick;
        primaryClickRef.current = primaryClick;
        fanfareRef.current = fanfare;
        setReady(true);
      } catch (error) {
        if (__DEV__) {
          console.warn('[useUnderseaSounds] Failed to preload sounds:', error);
        }
      }
    };

    loadAll();

    return () => {
      cancelled = true;
      setReady(false);
      waterflowPlayingRef.current = false;
      waterflowRef.current?.stop();
      [
        waterflowRef.current,
        ...splashRef.current,
        bubbleInflateRef.current,
        bubblePopRef.current,
        successClickRef.current,
        wrongClickRef.current,
        primaryClickRef.current,
        fanfareRef.current,
      ].forEach(sound => sound?.release());
      waterflowRef.current = null;
      splashRef.current = [];
      bubbleInflateRef.current = null;
      bubblePopRef.current = null;
      successClickRef.current = null;
      wrongClickRef.current = null;
      primaryClickRef.current = null;
      fanfareRef.current = null;
    };
  }, []);

  const startWaterflow = useCallback(() => {
    const waterflow = waterflowRef.current;
    if (waterflow == null || !waterflow.isLoaded()) {
      return;
    }
    activateAudioSession();
    waterflowPlayingRef.current = true;
    waterflow.play();
  }, []);

  const stopWaterflow = useCallback(() => {
    waterflowPlayingRef.current = false;
    waterflowRef.current?.stop();
  }, []);

  const playRandomSplash = useCallback(() => {
    const splashes = splashRef.current;
    if (splashes.length === 0) {
      return;
    }
    const index = Math.floor(Math.random() * splashes.length);
    playOneShot(splashes[index] ?? null);
  }, []);

  const playBubbleInflate = useCallback(() => {
    playOneShot(bubbleInflateRef.current);
  }, []);

  const playBubblePop = useCallback(() => {
    playOneShot(bubblePopRef.current);
  }, []);

  const playSuccessClick = useCallback(() => {
    playOneShot(successClickRef.current, SUCCESS_CLICK_VOLUME);
  }, []);

  const playWrongClick = useCallback(() => {
    playOneShot(wrongClickRef.current);
  }, []);

  const playPrimaryClick = useCallback(() => {
    playOneShot(primaryClickRef.current);
  }, []);

  const playFanfare = useCallback(() => {
    playOneShot(fanfareRef.current);
  }, []);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (waterflowPlayingRef.current) {
          activateAudioSession();
          waterflowRef.current?.play();
        }
        return;
      }
      if (nextState === 'background' || nextState === 'inactive') {
        waterflowRef.current?.pause();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  return useMemo(
    () => ({
      ready,
      startWaterflow,
      stopWaterflow,
      playRandomSplash,
      playBubbleInflate,
      playBubblePop,
      playSuccessClick,
      playWrongClick,
      playPrimaryClick,
      playFanfare,
    }),
    [
      ready,
      startWaterflow,
      stopWaterflow,
      playRandomSplash,
      playBubbleInflate,
      playBubblePop,
      playSuccessClick,
      playWrongClick,
      playPrimaryClick,
      playFanfare,
    ],
  );
}
