import { useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import { loadSkiaImage } from '../../../../core/assets/loadSkiaImage';
import type { SwampThemeImages } from './swampThemeAssets';
import {
  SWAMP_PRELOAD_TOTAL,
  SWAMP_PRIORITY_IMAGE_SOURCE,
  SWAMP_ALGAE_SOURCES,
  SWAMP_STONE_SOURCES,
  SWAMP_DROP_SOURCES,
} from './swampThemeAssets';

export type SwampThemeAssetsLoading = {
  phase: 'loading';
  backgroundImage: SkImage | null;
  decorationImages: SwampThemeImages['stones'] | null;
  accentImages: SwampThemeImages['algae'] | null;
  dropImages: SwampThemeImages['drops'] | null;
  progress: number;
};

export type SwampThemeAssetsReady = {
  phase: 'ready';
  seafloorImage: SkImage;
  images: SwampThemeImages;
  progress: 100;
};

export type SwampThemeAssets = SwampThemeAssetsLoading | SwampThemeAssetsReady;

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
    stones?: SwampThemeImages['stones'];
    algae?: SwampThemeImages['algae'];
    drops?: SwampThemeImages['drops'];
  }) => void,
): Promise<{
  seafloor: SkImage;
  stones: SwampThemeImages['stones'];
  algae: SwampThemeImages['algae'];
  drops: SwampThemeImages['drops'];
}> {
  const track = (source: number) => loadTrackedImage(source, onImageLoaded);

  const seafloorPromise = track(SWAMP_PRIORITY_IMAGE_SOURCE).then(seafloor => {
    onPartial({ seafloor });
    return seafloor;
  });

  const stonesPromise = Promise.all(
    SWAMP_STONE_SOURCES.map(([variant, source]) =>
      track(source).then(image => ({ variant, image })),
    ),
  ).then(stoneResults => {
    const stones = Object.fromEntries(
      stoneResults.map(({ variant, image }) => [variant, image]),
    ) as SwampThemeImages['stones'];
    onPartial({ stones });
    return stones;
  });

  const algaePromise = Promise.all(
    SWAMP_ALGAE_SOURCES.map(([variant, source]) =>
      track(source).then(image => ({ variant, image })),
    ),
  ).then(algaeResults => {
    const algae = Object.fromEntries(
      algaeResults.map(({ variant, image }) => [variant, image]),
    ) as SwampThemeImages['algae'];
    onPartial({ algae });
    return algae;
  });

  const dropsPromise = Promise.all(
    SWAMP_DROP_SOURCES.map(([variant, source]) =>
      track(source).then(image => ({ variant, image })),
    ),
  ).then(dropsResults => {
    const drops = Object.fromEntries(
      dropsResults.map(({ variant, image }) => [variant, image]),
    ) as SwampThemeImages['drops'];
    onPartial({ drops });
    return drops;
  });

  const [seafloor, stones, algae, drops] = await Promise.all([
    seafloorPromise,
    stonesPromise,
    algaePromise,
    dropsPromise,
  ]);

  return { seafloor, stones, algae, drops };
}

export function useSwampThemeAssets(): SwampThemeAssets {
  const [backgroundImage, setBackgroundImage] = useState<SkImage | null>(null);
  const [decorationImages, setDecorationImages] = useState<SwampThemeImages['stones'] | null>(null);
  const [accentImages, setAccentImages] = useState<SwampThemeImages['algae'] | null>(null);
  const [dropImages, setDropImages] = useState<SwampThemeImages['drops'] | null>(null);
  const [progress, setProgress] = useState(0);
  const [readyAssets, setReadyAssets] = useState<Omit<SwampThemeAssetsReady, 'phase' | 'progress'> | null>(
    null,
  );
  const loadedCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const tickProgress = () => {
      loadedCountRef.current += 1;
      const next = Math.min(
        100,
        Math.round((loadedCountRef.current / SWAMP_PRELOAD_TOTAL) * 100),
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
            setBackgroundImage(partial.seafloor);
          }
          if (partial.stones != null) {
            setDecorationImages(partial.stones);
          }
          if (partial.algae != null) {
            setAccentImages(partial.algae);
          }
          if (partial.drops != null) {
            setDropImages(partial.drops);
          }
        });
        if (cancelled) {
          return;
        }

        setProgress(100);
        setReadyAssets({
          seafloorImage: priority.seafloor,
          images: {
            seafloor: priority.seafloor,
            stones: priority.stones,
            algae: priority.algae,
            drops: priority.drops,
          },
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[useSwampThemeAssets] Failed to preload assets:', error);
        }
      }
    };

    preload();

    return () => {
      cancelled = true;
      loadedCountRef.current = 0;
      setBackgroundImage(null);
      setDecorationImages(null);
      setAccentImages(null);
      setDropImages(null);
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
    backgroundImage,
    decorationImages,
    accentImages,
    dropImages,
    progress,
  };
}
