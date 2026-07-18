import { useEffect, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { ThemeAssets } from '../../../../themeContract';
import { loadSkiaImage } from '../../../../core/assets/loadSkiaImage';
import {
  FLOWER_GARDEN_IMAGE_ASSETS,
  FLOWER_GARDEN_PRELOAD_TOTAL,
  PETAL_SOURCES,
  ROSE_BUD_SOURCE,
  ROSE_CENTER_SOURCE,
  type FlowerGardenPetalKey,
  type FlowerGardenThemeImages,
} from './flowerGardenThemeAssets';
import {
  createFlowerGardenSoundController,
} from './useFlowerGardenThemeSounds';

type FlowerGardenAssetsReady = {
  images: FlowerGardenThemeImages;
};

export function useFlowerGardenThemeAssets(): ThemeAssets {
  const [progress, setProgress] = useState(0);
  const [readyAssets, setReadyAssets] = useState<FlowerGardenAssetsReady | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      try {
        setProgress(0);

        const entries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.roses,
        ) as Array<[FlowerGardenPetalKey, number]>;

        const roses: Partial<Record<FlowerGardenPetalKey, unknown>> = {};

        for (let i = 0; i < entries.length; i++) {
          const [key, source] = entries[i];
          roses[key] = source;

          if (!cancelled) {
            setProgress(Math.min(100, Math.round(((i + 1) / FLOWER_GARDEN_PRELOAD_TOTAL) * 100)));
          }
        }

        if (cancelled) {
          return;
        }

        let roseBudImage: SkImage | null = null;
        try {
          roseBudImage = await loadSkiaImage(ROSE_BUD_SOURCE);
        } catch {
          if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load rose bud SkImage');
          }
        }

        if (cancelled) {
          return;
        }

        let roseCenterImage: SkImage | null = null;
        try {
          roseCenterImage = await loadSkiaImage(ROSE_CENTER_SOURCE);
        } catch {
          if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load rose center SkImage');
          }
        }

        if (cancelled) {
          return;
        }

        const petalLoadResults = await Promise.allSettled(
          PETAL_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode petal image');
            }
            return img;
          }),
        );
        const petalImages: SkImage[] = [];
        for (const result of petalLoadResults) {
          if (result.status === 'fulfilled') {
            petalImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a petal image');
          }
        }

        if (cancelled) {
          return;
        }

        setProgress(100);
        setReadyAssets({
          images: {
            roses: roses as FlowerGardenThemeImages['roses'],
            roseBudImage,
            roseCenterImage,
            petalImages: petalImages.length === PETAL_SOURCES.length ? petalImages : null,
          },
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[useFlowerGardenThemeAssets] Failed to preload assets:', error);
        }
      }
    };

    preload();

    return () => {
      cancelled = true;
      setProgress(0);
      setReadyAssets(null);
    };
  }, []);

  if (readyAssets != null) {
    return {
      phase: 'ready',
      progress: 100,
      images: readyAssets.images,
      sounds: createFlowerGardenSoundController(),
    };
  }

  return {
    phase: 'loading',
    backgroundImage: null,
    decorationImages: null,
    accentImages: null,
    progress,
  } as ThemeAssets;
}
