import { useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { loadUnderseaSkiaImage } from './loadUnderseaSkiaImage';
import type { UnderseaImages } from './underseaAssets';
import {
  UNDERSEA_BULK_IMAGE_ENTRIES,
  UNDERSEA_KOI_MASK_SOURCES,
  UNDERSEA_KOI_SOURCES,
  UNDERSEA_PRELOAD_TOTAL,
  UNDERSEA_PRIORITY_IMAGE_SOURCE,
  UNDERSEA_SEAWEED_SOURCES,
  UNDERSEA_STONE_SOURCES,
} from './underseaAssets';
import {
  bindUnderseaSoundAppState,
  createUnderseaSoundController,
  loadAllUnderseaSounds,
  releaseUnderseaSounds,
  type LoadedUnderseaSounds,
  type UnderseaSoundController,
} from './useUnderseaSounds';

export type UnderseaAssetsLoading = {
  phase: 'loading';
  seafloorImage: SkImage | null;
  stoneImages: UnderseaImages['stones'] | null;
  seaweedImages: UnderseaImages['seaweed'] | null;
  progress: number;
};

export type UnderseaAssetsReady = {
  phase: 'ready';
  seafloorImage: SkImage;
  images: UnderseaImages;
  sounds: UnderseaSoundController;
  progress: 100;
};

export type UnderseaAssets = UnderseaAssetsLoading | UnderseaAssetsReady;

function loadTrackedImage(source: number, onLoaded: () => void): Promise<SkImage> {
  return loadUnderseaSkiaImage(source).then(image => {
    onLoaded();
    return image;
  });
}

async function loadPriorityImages(
  onImageLoaded: () => void,
  onPartial: (partial: {
    seafloor?: SkImage;
    stones?: UnderseaImages['stones'];
    seaweed?: UnderseaImages['seaweed'];
  }) => void,
): Promise<{
  seafloor: SkImage;
  stones: UnderseaImages['stones'];
  seaweed: UnderseaImages['seaweed'];
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
    ) as UnderseaImages['stones'];
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
    ) as UnderseaImages['seaweed'];
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

async function loadRemainingImages(onImageLoaded: () => void): Promise<Omit<UnderseaImages, 'seafloor' | 'stones' | 'seaweed'>> {
  const track = (source: number) => loadTrackedImage(source, onImageLoaded);

  const [
    bulkResults,
    koiResults,
    koiMaskResults,
  ] = await Promise.all([
    Promise.all(
      UNDERSEA_BULK_IMAGE_ENTRIES.map(entry =>
        track(entry.source).then(image => ({ key: entry.key, image })),
      ),
    ),
    Promise.all(
      UNDERSEA_KOI_SOURCES.map(([key, source]) =>
        track(source).then(image => ({ key, image })),
      ),
    ),
    Promise.all(
      UNDERSEA_KOI_MASK_SOURCES.map(([key, source]) =>
        track(source).then(image => ({ key, image })),
      ),
    ),
  ]);

  const bulkImages = Object.fromEntries(
    bulkResults.map(({ key, image }) => [key, image]),
  ) as Pick<UnderseaImages, 'jellyfishBell' | 'jellyfishTentacles' | 'bubble'>;

  const koi = Object.fromEntries(
    koiResults.map(({ key, image }) => [key, image]),
  ) as UnderseaImages['koi'];

  const koiMasks = Object.fromEntries(
    koiMaskResults.map(({ key, image }) => [key, image]),
  ) as UnderseaImages['koiMasks'];

  return {
    ...bulkImages,
    koi,
    koiMasks,
  };
}

export function useUnderseaAssets(): UnderseaAssets {
  const [seafloorImage, setSeafloorImage] = useState<SkImage | null>(null);
  const [stoneImages, setStoneImages] = useState<UnderseaImages['stones'] | null>(null);
  const [seaweedImages, setSeaweedImages] = useState<UnderseaImages['seaweed'] | null>(null);
  const [progress, setProgress] = useState(0);
  const [readyAssets, setReadyAssets] = useState<Omit<UnderseaAssetsReady, 'phase' | 'progress'> | null>(
    null,
  );
  const loadedSoundsRef = useRef<LoadedUnderseaSounds | null>(null);
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
          loadAllUnderseaSounds(tickProgress),
        ]);

        if (cancelled) {
          releaseUnderseaSounds(loadedSounds);
          return;
        }

        loadedSoundsRef.current = loadedSounds;
        const sounds = createUnderseaSoundController(loadedSounds, soundStateRef.current);
        appStateCleanupRef.current = bindUnderseaSoundAppState(
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
          console.warn('[useUnderseaAssets] Failed to preload assets:', error);
        }
      }
    };

    preload();

    return () => {
      cancelled = true;
      appStateCleanupRef.current?.();
      appStateCleanupRef.current = null;
      soundStateRef.current.waterflowPlaying = false;
      releaseUnderseaSounds(loadedSoundsRef.current);
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
