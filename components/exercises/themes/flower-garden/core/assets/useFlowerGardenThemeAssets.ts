import { useEffect, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { ThemeAssets } from '../../../../themeContract';
import { loadSkiaImage } from '../../../../core/assets/loadSkiaImage';
import {
  CALYX_SOURCE,
  CHAMOMILE_FLOWER_SOURCES,
  CHAMOMILE_LEAF_SOURCES,
  CHAMOMILE_STEM_SOURCES,
  DANDELION_FLOWER_SOURCES,
  DANDELION_LEAF_SOURCES,
  DANDELION_STEM_SOURCES,
  EARTH_SOURCE,
  GRASS_TILABLE_SOURCE,
  FLOWER_GARDEN_IMAGE_ASSETS,
  FLOWER_GARDEN_PRELOAD_TOTAL,
  LEAF_SOURCES,
  PETAL_SOURCES,
  POPPY_FLOWER_SOURCES,
  POPPY_LEAF_SOURCES,
  POPPY_STEM_SOURCES,
  ROSE_BUD_SOURCE,
  ROSE_CENTER_SOURCE,
  STEM_SOURCE,
  WILD_VIOLET_FLOWER_SOURCES,
  WILD_VIOLET_LEAF_SOURCES,
  WILD_VIOLET_STEM_SOURCES,
  type FlowerGardenBushKey,
  type FlowerGardenChamomileKey,
  type FlowerGardenDandelionKey,
  type FlowerGardenPetalKey,
  type FlowerGardenPoppyKey,
  type FlowerGardenThemeImages,
  type FlowerGardenWildVioletKey,
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

        const roseEntries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.roses,
        ) as Array<[FlowerGardenPetalKey, number]>;

        const bushEntries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.bush,
        ) as Array<[FlowerGardenBushKey, number]>;

        const dandelionEntries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.dandelion,
        ) as Array<[FlowerGardenDandelionKey, number]>;

        const chamomileEntries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.chamomile,
        ) as Array<[FlowerGardenChamomileKey, number]>;

        const poppyEntries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.poppy,
        ) as Array<[FlowerGardenPoppyKey, number]>;

        const wildVioletEntries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.wild_violet,
        ) as Array<[FlowerGardenWildVioletKey, number]>;

        const roses: Partial<Record<FlowerGardenPetalKey, unknown>> = {};

        let tracked = 0;
        const trackSource = () => {
          tracked++;
          if (!cancelled) {
            setProgress(
              Math.min(
                100,
                Math.round((tracked / FLOWER_GARDEN_PRELOAD_TOTAL) * 100),
              ),
            );
          }
        };

        for (let i = 0; i < roseEntries.length; i++) {
          const [key, source] = roseEntries[i]!;
          roses[key] = source;
          trackSource();
        }
        for (let i = 0; i < bushEntries.length; i++) {
          bushEntries[i]!;
          trackSource();
        }
        for (let i = 0; i < dandelionEntries.length; i++) {
          dandelionEntries[i]!;
          trackSource();
        }
        for (let i = 0; i < chamomileEntries.length; i++) {
          chamomileEntries[i]!;
          trackSource();
        }
        for (let i = 0; i < poppyEntries.length; i++) {
          poppyEntries[i]!;
          trackSource();
        }
        for (let i = 0; i < wildVioletEntries.length; i++) {
          wildVioletEntries[i]!;
          trackSource();
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

        let stemImage: SkImage | null = null;
        try {
          stemImage = await loadSkiaImage(STEM_SOURCE);
        } catch {
          if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load stem SkImage');
          }
        }

        if (cancelled) {
          return;
        }

        let calyxImage: SkImage | null = null;
        try {
          calyxImage = await loadSkiaImage(CALYX_SOURCE);
        } catch {
          if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load calyx SkImage');
          }
        }

        if (cancelled) {
          return;
        }

        const leafLoadResults = await Promise.allSettled(
          LEAF_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode leaf image');
            }
            return img;
          }),
        );
        const leafImages: SkImage[] = [];
        for (const result of leafLoadResults) {
          if (result.status === 'fulfilled') {
            leafImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a leaf image');
          }
        }

        if (cancelled) {
          return;
        }

        let earthImage: SkImage | null = null;
        try {
          earthImage = await loadSkiaImage(EARTH_SOURCE);
        } catch {
          if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load earth SkImage');
          }
        }

        if (cancelled) {
          return;
        }

        let grassImage: SkImage | null = null;
        try {
          grassImage = await loadSkiaImage(GRASS_TILABLE_SOURCE);
        } catch {
          if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load grass SkImage');
          }
        }

        if (cancelled) {
          return;
        }

        const dandelionStemLoadResults = await Promise.allSettled(
          DANDELION_STEM_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode dandelion stem image');
            }
            return img;
          }),
        );
        const dandelionStemImages: SkImage[] = [];
        for (const result of dandelionStemLoadResults) {
          if (result.status === 'fulfilled') {
            dandelionStemImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a dandelion stem image');
          }
        }

        if (cancelled) {
          return;
        }

        const dandelionLeafLoadResults = await Promise.allSettled(
          DANDELION_LEAF_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode dandelion leaf image');
            }
            return img;
          }),
        );
        const dandelionLeafImages: SkImage[] = [];
        for (const result of dandelionLeafLoadResults) {
          if (result.status === 'fulfilled') {
            dandelionLeafImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a dandelion leaf image');
          }
        }

        if (cancelled) {
          return;
        }

        const dandelionFlowerLoadResults = await Promise.allSettled(
          DANDELION_FLOWER_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode dandelion flower image');
            }
            return img;
          }),
        );
        const dandelionFlowerImages: SkImage[] = [];
        for (const result of dandelionFlowerLoadResults) {
          if (result.status === 'fulfilled') {
            dandelionFlowerImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a dandelion flower image');
          }
        }

        if (cancelled) {
          return;
        }

        const chamomileStemLoadResults = await Promise.allSettled(
          CHAMOMILE_STEM_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode chamomile stem image');
            }
            return img;
          }),
        );
        const chamomileStemImages: SkImage[] = [];
        for (const result of chamomileStemLoadResults) {
          if (result.status === 'fulfilled') {
            chamomileStemImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a chamomile stem image');
          }
        }

        if (cancelled) {
          return;
        }

        const chamomileLeafLoadResults = await Promise.allSettled(
          CHAMOMILE_LEAF_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode chamomile leaf image');
            }
            return img;
          }),
        );
        const chamomileLeafImages: SkImage[] = [];
        for (const result of chamomileLeafLoadResults) {
          if (result.status === 'fulfilled') {
            chamomileLeafImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a chamomile leaf image');
          }
        }

        if (cancelled) {
          return;
        }

        const chamomileFlowerLoadResults = await Promise.allSettled(
          CHAMOMILE_FLOWER_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode chamomile flower image');
            }
            return img;
          }),
        );
        const chamomileFlowerImages: SkImage[] = [];
        for (const result of chamomileFlowerLoadResults) {
          if (result.status === 'fulfilled') {
            chamomileFlowerImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a chamomile flower image');
          }
        }

        if (cancelled) {
          return;
        }

        const poppyStemLoadResults = await Promise.allSettled(
          POPPY_STEM_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode poppy stem image');
            }
            return img;
          }),
        );
        const poppyStemImages: SkImage[] = [];
        for (const result of poppyStemLoadResults) {
          if (result.status === 'fulfilled') {
            poppyStemImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a poppy stem image');
          }
        }

        if (cancelled) {
          return;
        }

        const poppyLeafLoadResults = await Promise.allSettled(
          POPPY_LEAF_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode poppy leaf image');
            }
            return img;
          }),
        );
        const poppyLeafImages: SkImage[] = [];
        for (const result of poppyLeafLoadResults) {
          if (result.status === 'fulfilled') {
            poppyLeafImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a poppy leaf image');
          }
        }

        if (cancelled) {
          return;
        }

        const poppyFlowerLoadResults = await Promise.allSettled(
          POPPY_FLOWER_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode poppy flower image');
            }
            return img;
          }),
        );
        const poppyFlowerImages: SkImage[] = [];
        for (const result of poppyFlowerLoadResults) {
          if (result.status === 'fulfilled') {
            poppyFlowerImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a poppy flower image');
          }
        }

        if (cancelled) {
          return;
        }

        const wildVioletStemLoadResults = await Promise.allSettled(
          WILD_VIOLET_STEM_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode wild_violet stem image');
            }
            return img;
          }),
        );
        const wildVioletStemImages: SkImage[] = [];
        for (const result of wildVioletStemLoadResults) {
          if (result.status === 'fulfilled') {
            wildVioletStemImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a wild_violet stem image');
          }
        }

        if (cancelled) {
          return;
        }

        const wildVioletLeafLoadResults = await Promise.allSettled(
          WILD_VIOLET_LEAF_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode wild_violet leaf image');
            }
            return img;
          }),
        );
        const wildVioletLeafImages: SkImage[] = [];
        for (const result of wildVioletLeafLoadResults) {
          if (result.status === 'fulfilled') {
            wildVioletLeafImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a wild_violet leaf image');
          }
        }

        if (cancelled) {
          return;
        }

        const wildVioletFlowerLoadResults = await Promise.allSettled(
          WILD_VIOLET_FLOWER_SOURCES.map(async (source) => {
            const img = await loadSkiaImage(source);
            if (img == null) {
              throw new Error('Failed to decode wild_violet flower image');
            }
            return img;
          }),
        );
        const wildVioletFlowerImages: SkImage[] = [];
        for (const result of wildVioletFlowerLoadResults) {
          if (result.status === 'fulfilled') {
            wildVioletFlowerImages.push(result.value);
          } else if (__DEV__) {
            console.warn('[useFlowerGardenThemeAssets] Failed to load a wild_violet flower image');
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
            calyxImage,
            stemImage,
            leafImages: leafImages.length === LEAF_SOURCES.length ? leafImages : null,
            earthImage,
            grassImage,
            dandelionStemImages: dandelionStemImages.length === DANDELION_STEM_SOURCES.length ? dandelionStemImages : null,
            dandelionLeafImages: dandelionLeafImages.length === DANDELION_LEAF_SOURCES.length ? dandelionLeafImages : null,
            dandelionFlowerImages: dandelionFlowerImages.length === DANDELION_FLOWER_SOURCES.length ? dandelionFlowerImages : null,
            chamomileStemImages: chamomileStemImages.length === CHAMOMILE_STEM_SOURCES.length ? chamomileStemImages : null,
            chamomileLeafImages: chamomileLeafImages.length === CHAMOMILE_LEAF_SOURCES.length ? chamomileLeafImages : null,
            chamomileFlowerImages: chamomileFlowerImages.length === CHAMOMILE_FLOWER_SOURCES.length ? chamomileFlowerImages : null,
            poppyStemImages: poppyStemImages.length === POPPY_STEM_SOURCES.length ? poppyStemImages : null,
            poppyLeafImages: poppyLeafImages.length === POPPY_LEAF_SOURCES.length ? poppyLeafImages : null,
            poppyFlowerImages: poppyFlowerImages.length === POPPY_FLOWER_SOURCES.length ? poppyFlowerImages : null,
            wildVioletStemImages: wildVioletStemImages.length === WILD_VIOLET_STEM_SOURCES.length ? wildVioletStemImages : null,
            wildVioletLeafImages: wildVioletLeafImages.length === WILD_VIOLET_LEAF_SOURCES.length ? wildVioletLeafImages : null,
            wildVioletFlowerImages: wildVioletFlowerImages.length === WILD_VIOLET_FLOWER_SOURCES.length ? wildVioletFlowerImages : null,
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
