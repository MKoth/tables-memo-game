import { useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { loadSkiaImage } from '../../../../core/assets/loadSkiaImage';
import type { UnderseaThemeImages } from './underseaThemeAssets';
import {
  UNDERSEA_BULK_IMAGE_ENTRIES,
  UNDERSEA_ROAMER_MASK_SOURCES,
  UNDERSEA_ROAMER_SOURCES,
  UNDERSEA_PRELOAD_TOTAL,
  UNDERSEA_PRIORITY_IMAGE_SOURCE,
  UNDERSEA_SEAWEED_SOURCES,
  UNDERSEA_STONE_SOURCES,
} from './underseaThemeAssets';
import {
  bindUnderseaThemeSoundAppState,
  createUnderseaThemeSoundController,
  loadAllUnderseaThemeSounds,
  releaseUnderseaThemeSounds,
  type LoadedUnderseaThemeSounds,
  type UnderseaThemeSoundController,
} from './useUnderseaThemeSounds';

export type UnderseaThemeAssetsLoading = {
  phase: 'loading';
  seafloorImage: SkImage | null;
  stoneImages: UnderseaThemeImages['stones'] | null;
  seaweedImages: UnderseaThemeImages['seaweed'] | null;
  progress: number;
};

export type UnderseaThemeAssetsReady = {
  phase: 'ready';
  seafloorImage: SkImage;
  images: UnderseaThemeImages;
  sounds: UnderseaThemeSoundController;
  progress: 100;
};

export type UnderseaThemeAssets = UnderseaThemeAssetsLoading | UnderseaThemeAssetsReady;

function loadTrackedImage(source: number, onLoaded: () => void): Promise<SkImage> {
  return loadSkiaImage(source).then(image => {
    onLoaded();
    return image;
  });
}

async function loadPriorityImages(
  onImageLoaded: () => void,
  onPartial: (partial: {
    seafloor?: SkImage;
    stones?: UnderseaThemeImages['stones'];
    seaweed?: UnderseaThemeImages['seaweed'];
  }) => void,
): Promise<{
  seafloor: SkImage;
  stones: UnderseaThemeImages['stones'];
  seaweed: UnderseaThemeImages['seaweed'];
}> {
  const track = (source: number) => loadTrackedImage(source, onImageLoaded);

  const seafloorPromise = track(UNDERSEA_PRIORITY_IMAGE_SOURCE).then(seafloor => {
    onPartial({ seafloor });
    return seafloor;
  });

  const stonesPromise = Promise.all(
    UNDERSEA_STONE_SOURCES.map(([variant, source]) =>
      track(source).then(image => ({ variant, image })),
    ),
  ).then(stoneResults => {
    const stones = Object.fromEntries(
      stoneResults.map(({ variant, image }) => [variant, image]),
    ) as UnderseaThemeImages['stones'];
    onPartial({ stones });
    return stones;
  });

  const seaweedPromise = Promise.all(
    UNDERSEA_SEAWEED_SOURCES.map(([variant, source]) =>
      track(source).then(image => ({ variant, image })),
    ),
  ).then(seaweedResults => {
    const seaweed = Object.fromEntries(
      seaweedResults.map(({ variant, image }) => [variant, image]),
    ) as UnderseaThemeImages['seaweed'];
    onPartial({ seaweed });
    return seaweed;
  });

  const [seafloor, stones, seaweed] = await Promise.all([
    seafloorPromise,
    stonesPromise,
    seaweedPromise,
  ]);

  return { seafloor, stones, seaweed };
}

async function loadRemainingImages(onImageLoaded: () => void): Promise<Omit<UnderseaThemeImages, 'seafloor' | 'stones' | 'seaweed'>> {
  const track = (source: number) => loadTrackedImage(source, onImageLoaded);

  const [
    bulkResults,
    roamerResults,
    roamerMaskResults,
  ] = await Promise.all([
    Promise.all(
      UNDERSEA_BULK_IMAGE_ENTRIES.map(entry =>
        track(entry.source).then(image => ({ key: entry.key, image })),
      ),
    ),
    Promise.all(
      UNDERSEA_ROAMER_SOURCES.map(([key, source]) =>
        track(source).then(image => ({ key, image })),
      ),
    ),
    Promise.all(
      UNDERSEA_ROAMER_MASK_SOURCES.map(([key, source]) =>
        track(source).then(image => ({ key, image })),
      ),
    ),
  ]);

  const bulkImages = Object.fromEntries(
    bulkResults.map(({ key, image }) => [key, image]),
  ) as Pick<UnderseaThemeImages, 'wordSpriteBell' | 'wordSpriteTentacles' | 'bubble'>;

  const roamer = Object.fromEntries(
    roamerResults.map(({ key, image }) => [key, image]),
  ) as UnderseaThemeImages['roamer'];

  const roamerMasks = Object.fromEntries(
    roamerMaskResults.map(({ key, image }) => [key, image]),
  ) as UnderseaThemeImages['roamerMasks'];

  return {
    ...bulkImages,
    roamer,
    roamerMasks,
  };
}

export function useUnderseaThemeAssets(): UnderseaThemeAssets {
  const [seafloorImage, setSeafloorImage] = useState<SkImage | null>(null);
  const [stoneImages, setStoneImages] = useState<UnderseaThemeImages['stones'] | null>(null);
  const [seaweedImages, setSeaweedImages] = useState<UnderseaThemeImages['seaweed'] | null>(null);
  const [progress, setProgress] = useState(0);
  const [readyAssets, setReadyAssets] = useState<Omit<UnderseaThemeAssetsReady, 'phase' | 'progress'> | null>(
    null,
  );
  const loadedSoundsRef = useRef<LoadedUnderseaThemeSounds | null>(null);
  const soundStateRef = useRef({ waterflowPlaying: false, muted: false });
  const appStateCleanupRef = useRef<(() => void) | null>(null);
  const loadedCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const tickProgress = () => {
      loadedCountRef.current += 1;
      const next = Math.min(
        100,
        Math.round((loadedCountRef.current / UNDERSEA_PRELOAD_TOTAL) * 100),
      );
      setProgress(next);
    };

    const preload = async () => {
      try {
        loadedCountRef.current = 0;
        setProgress(0);

        const priority = await loadPriorityImages(tickProgress, partial => {
          if (cancelled) {
            return;
          }
          if (partial.seafloor != null) {
            setSeafloorImage(partial.seafloor);
          }
          if (partial.stones != null) {
            setStoneImages(partial.stones);
          }
          if (partial.seaweed != null) {
            setSeaweedImages(partial.seaweed);
          }
        });
        if (cancelled) {
          return;
        }

        const [remainingImages, loadedSounds] = await Promise.all([
          loadRemainingImages(tickProgress),
          loadAllUnderseaThemeSounds(tickProgress),
        ]);

        if (cancelled) {
          releaseUnderseaThemeSounds(loadedSounds);
          return;
        }

        loadedSoundsRef.current = loadedSounds;
        const sounds = createUnderseaThemeSoundController(loadedSounds, soundStateRef.current);
        appStateCleanupRef.current = bindUnderseaThemeSoundAppState(
          loadedSounds,
          soundStateRef.current,
        );

        setProgress(100);
        setReadyAssets({
          seafloorImage: priority.seafloor,
          images: {
            seafloor: priority.seafloor,
            stones: priority.stones,
            seaweed: priority.seaweed,
            ...remainingImages,
          },
          sounds,
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[useUnderseaThemeAssets] Failed to preload assets:', error);
        }
      }
    };

    preload();

    return () => {
      cancelled = true;
      appStateCleanupRef.current?.();
      appStateCleanupRef.current = null;
      soundStateRef.current.waterflowPlaying = false;
      releaseUnderseaThemeSounds(loadedSoundsRef.current);
      loadedSoundsRef.current = null;
      loadedCountRef.current = 0;
      setSeafloorImage(null);
      setStoneImages(null);
      setSeaweedImages(null);
      setProgress(0);
      setReadyAssets(null);
    };
  }, []);

  if (readyAssets != null) {
    return {
      phase: 'ready',
      progress: 100,
      ...readyAssets,
    };
  }

  return {
    phase: 'loading',
    seafloorImage,
    stoneImages,
    seaweedImages,
    progress,
  };
}
