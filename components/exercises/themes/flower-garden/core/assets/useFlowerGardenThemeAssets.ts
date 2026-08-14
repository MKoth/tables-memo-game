import { useCallback, useEffect, useRef, useState } from 'react';
import type { SkImage } from '@shopify/react-native-skia';
import type { ThemeAssets } from '../../../../themeContract';
import { loadSkiaImage } from '../../../../core/assets/loadSkiaImage';
import {
  BEE_BODY_SOURCE,
  BEE_LEFT_WING_SOURCE,
  BEE_RIGHT_WING_SOURCE,
  BUMBLEBEE_BODY_SOURCE,
  BUMBLEBEE_LEFT_WING_SOURCE,
  BUMBLEBEE_RIGHT_WING_SOURCE,
  CALYX_SOURCE,
  CHAMOMILE_FLOWER_SOURCES,
  CHAMOMILE_LEAF_SOURCES,
  CHAMOMILE_STEM_SOURCES,
  CLOVER_SOURCES,
  DANDELION_FLOWER_SOURCES,
  DANDELION_LEAF_SOURCES,
  DANDELION_STEM_SOURCES,
  EARTH_SOURCE,
  FLOWER_GARDEN_IMAGE_ASSETS,
  FLOWER_GARDEN_PRELOAD_TOTAL,
  GRASS_TILABLE_SOURCE,
  LEAF_SOURCES,
  LYCAENIDAE_BODY_SOURCE,
  LYCAENIDAE_LEFT_WING_SOURCES,
  LYCAENIDAE_RIGHT_WING_SOURCES,
  MOSS_STONE_SOURCES,
  ORB_BED_SMALL_SOURCES,
  ORB_BED_SOURCES,
  ORB_RING_SMALL_SOURCES,
  ORB_RING_SOURCES,
  PETAL_SOURCES,
  POPPY_FLOWER_SOURCES,
  POPPY_LEAF_SOURCES,
  POPPY_STEM_SOURCES,
  ROSE_BUD_SOURCE,
  ROSE_CENTER_SOURCE,
  ROSE_LEAF_ATLAS_SOURCE,
  ROSE_RING_SOURCES,
  ROSE_SUBSTRATE_SOURCE,
  STEM_SOURCE,
  WILD_VIOLET_FLOWER_SOURCES,
  WILD_VIOLET_LEAF_SOURCES,
  WILD_VIOLET_STEM_SOURCES,
  type FlowerGardenPetalKey,
  type FlowerGardenThemeImages,
} from './flowerGardenThemeAssets';
import {
  createFlowerGardenSoundController,
  loadAllFlowerGardenThemeSounds,
  releaseFlowerGardenThemeSounds,
  type FlowerGardenSoundController,
  type LoadedFlowerGardenThemeSounds,
} from './useFlowerGardenThemeSounds';

type FlowerGardenAssetsReady = {
  images: FlowerGardenThemeImages;
  sounds: FlowerGardenSoundController;
};

export function useFlowerGardenThemeAssets(): ThemeAssets {
  const [backgroundImage, setBackgroundImage] = useState<SkImage | null>(null);
  const [decorationImages, setDecorationImages] = useState<Record<string, SkImage> | null>(null);
  const [progress, setProgress] = useState(0);
  const [readyAssets, setReadyAssets] = useState<FlowerGardenAssetsReady | null>(
    null,
  );
  const loadedCountRef = useRef(0);
  const loadedSoundsRef = useRef<LoadedFlowerGardenThemeSounds | null>(null);
  const soundStateRef = useRef({ ambiencePlaying: false, muted: false });
  const appStateCleanupRef = useRef<(() => void) | null>(null);

  const tickProgress = useCallback(() => {
    loadedCountRef.current += 1;
    const next = Math.min(
      100,
      Math.round((loadedCountRef.current / FLOWER_GARDEN_PRELOAD_TOTAL) * 100),
    );
    setProgress(next);
  }, []);

  const loadSingle = useCallback(
    async (source: number, label: string): Promise<SkImage | null> => {
      try {
        const img = await loadSkiaImage(source);
        tickProgress();
        return img;
      } catch {
        tickProgress();
        if (__DEV__) {
          console.warn(`[useFlowerGardenThemeAssets] Failed to load ${label}`);
        }
        return null;
      }
    },
    [tickProgress],
  );

  const loadAll = useCallback(
    async (sources: readonly number[], label: string): Promise<SkImage[]> => {
      const results = await Promise.allSettled(
        sources.map(async source => {
          try {
            const img = await loadSkiaImage(source);
            return img;
          } finally {
            tickProgress();
          }
        }),
      );
      const images: SkImage[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          images.push(result.value);
        } else if (__DEV__) {
          console.warn(`[useFlowerGardenThemeAssets] Failed to load a ${label} image`);
        }
      }
      return images;
    },
    [tickProgress],
  );

  useEffect(() => {
    let cancelled = false;
    const soundState = soundStateRef.current;

    const preload = async () => {
      try {
        loadedCountRef.current = 0;
        setProgress(0);

        const roses: Partial<Record<FlowerGardenPetalKey, unknown>> = {};
        const roseEntries = Object.entries(
          FLOWER_GARDEN_IMAGE_ASSETS.roses,
        ) as Array<[FlowerGardenPetalKey, number]>;
        for (const [key, source] of roseEntries) {
          roses[key] = source;
        }

        const [
          earthImage,
          grassImage,
          stemImage,
          calyxImage,
          leafImages,
          substrateImage,
          roseLeafAtlas,
        ] = await Promise.all([
          loadSingle(EARTH_SOURCE, 'earth'),
          loadSingle(GRASS_TILABLE_SOURCE, 'grass'),
          loadSingle(STEM_SOURCE, 'stem'),
          loadSingle(CALYX_SOURCE, 'calyx'),
          loadAll(LEAF_SOURCES, 'leaf'),
          loadSingle(ROSE_SUBSTRATE_SOURCE, 'substrate'),
          loadSingle(ROSE_LEAF_ATLAS_SOURCE, 'rose leaf atlas'),
        ]);

        if (cancelled) {
          return;
        }

        if (earthImage != null) {
          setBackgroundImage(earthImage);
        }
        if (grassImage != null) {
          setDecorationImages({ grass: grassImage });
        }

        const [
          roseBudImage,
          roseCenterImage,
          roseRingImages,
          dandelionStemImages,
          dandelionLeafImages,
          dandelionFlowerImages,
          chamomileStemImages,
          chamomileLeafImages,
          chamomileFlowerImages,
          poppyStemImages,
          poppyLeafImages,
          poppyFlowerImages,
          wildVioletStemImages,
          wildVioletLeafImages,
          wildVioletFlowerImages,
        ] = await Promise.all([
          loadSingle(ROSE_BUD_SOURCE, 'rose bud'),
          loadSingle(ROSE_CENTER_SOURCE, 'rose center'),
          loadAll(ROSE_RING_SOURCES, 'rose petal ring'),
          loadAll(DANDELION_STEM_SOURCES, 'dandelion stem'),
          loadAll(DANDELION_LEAF_SOURCES, 'dandelion leaf'),
          loadAll(DANDELION_FLOWER_SOURCES, 'dandelion flower'),
          loadAll(CHAMOMILE_STEM_SOURCES, 'chamomile stem'),
          loadAll(CHAMOMILE_LEAF_SOURCES, 'chamomile leaf'),
          loadAll(CHAMOMILE_FLOWER_SOURCES, 'chamomile flower'),
          loadAll(POPPY_STEM_SOURCES, 'poppy stem'),
          loadAll(POPPY_LEAF_SOURCES, 'poppy leaf'),
          loadAll(POPPY_FLOWER_SOURCES, 'poppy flower'),
          loadAll(WILD_VIOLET_STEM_SOURCES, 'wild violet stem'),
          loadAll(WILD_VIOLET_LEAF_SOURCES, 'wild violet leaf'),
          loadAll(WILD_VIOLET_FLOWER_SOURCES, 'wild violet flower'),
        ]);

        if (cancelled) {
          return;
        }

        const [
          petalImages,
          cloverImages,
          mossStoneImages,
          lycaenidaeBodyImage,
          lycaenidaeWingLeftImages,
          lycaenidaeWingRightImages,
          beeBodyImage,
          beeLeftWingImage,
          beeRightWingImage,
          bumblebeeBodyImage,
          bumblebeeLeftWingImage,
          bumblebeeRightWingImage,
          orbRingImages,
          orbRingSmallImages,
          orbBedImages,
          orbBedSmallImages,
          flowerGardenSounds,
        ] = await Promise.all([
          loadAll(PETAL_SOURCES, 'petal'),
          loadAll(CLOVER_SOURCES, 'clover'),
          loadAll(MOSS_STONE_SOURCES, 'moss stone'),
          loadSingle(LYCAENIDAE_BODY_SOURCE, 'lycaenidae body'),
          loadAll(LYCAENIDAE_LEFT_WING_SOURCES, 'lycaenidae left wing'),
          loadAll(LYCAENIDAE_RIGHT_WING_SOURCES, 'lycaenidae right wing'),
          loadSingle(BEE_BODY_SOURCE, 'bee body'),
          loadSingle(BEE_LEFT_WING_SOURCE, 'bee left wing'),
          loadSingle(BEE_RIGHT_WING_SOURCE, 'bee right wing'),
          loadSingle(BUMBLEBEE_BODY_SOURCE, 'bumblebee body'),
          loadSingle(BUMBLEBEE_LEFT_WING_SOURCE, 'bumblebee left wing'),
          loadSingle(BUMBLEBEE_RIGHT_WING_SOURCE, 'bumblebee right wing'),
          loadAll(ORB_RING_SOURCES, 'orb petal ring'),
          loadAll(ORB_RING_SMALL_SOURCES, 'orb small petal ring'),
          loadAll(ORB_BED_SOURCES, 'orb clover bed'),
          loadAll(ORB_BED_SMALL_SOURCES, 'orb small clover bed'),
          loadAllFlowerGardenThemeSounds(tickProgress),
        ]);

        if (cancelled) {
          releaseFlowerGardenThemeSounds(flowerGardenSounds);
          return;
        }

        loadedSoundsRef.current = flowerGardenSounds;
        const { sounds, bindAppState } = createFlowerGardenSoundController(
          flowerGardenSounds,
          soundState,
        );
        appStateCleanupRef.current = bindAppState();

        setProgress(100);
        setReadyAssets({
          images: {
            roses: roses as FlowerGardenThemeImages['roses'],
            roseBudImage,
            roseCenterImage,
            substrateImage,
            petalImages:
              petalImages.length === PETAL_SOURCES.length ? petalImages : null,
            calyxImage,
            stemImage,
            leafImages:
              leafImages.length === LEAF_SOURCES.length ? leafImages : null,
            earthImage,
            grassImage,
            cloverImages:
              cloverImages.length === CLOVER_SOURCES.length
                ? cloverImages
                : null,
            mossStoneImages:
              mossStoneImages.length === MOSS_STONE_SOURCES.length
                ? mossStoneImages
                : null,
            dandelionStemImages:
              dandelionStemImages.length === DANDELION_STEM_SOURCES.length
                ? dandelionStemImages
                : null,
            dandelionLeafImages:
              dandelionLeafImages.length === DANDELION_LEAF_SOURCES.length
                ? dandelionLeafImages
                : null,
            dandelionFlowerImages:
              dandelionFlowerImages.length === DANDELION_FLOWER_SOURCES.length
                ? dandelionFlowerImages
                : null,
            chamomileStemImages:
              chamomileStemImages.length === CHAMOMILE_STEM_SOURCES.length
                ? chamomileStemImages
                : null,
            chamomileLeafImages:
              chamomileLeafImages.length === CHAMOMILE_LEAF_SOURCES.length
                ? chamomileLeafImages
                : null,
            chamomileFlowerImages:
              chamomileFlowerImages.length === CHAMOMILE_FLOWER_SOURCES.length
                ? chamomileFlowerImages
                : null,
            poppyStemImages:
              poppyStemImages.length === POPPY_STEM_SOURCES.length
                ? poppyStemImages
                : null,
            poppyLeafImages:
              poppyLeafImages.length === POPPY_LEAF_SOURCES.length
                ? poppyLeafImages
                : null,
            poppyFlowerImages:
              poppyFlowerImages.length === POPPY_FLOWER_SOURCES.length
                ? poppyFlowerImages
                : null,
            wildVioletStemImages:
              wildVioletStemImages.length === WILD_VIOLET_STEM_SOURCES.length
                ? wildVioletStemImages
                : null,
            wildVioletLeafImages:
              wildVioletLeafImages.length === WILD_VIOLET_LEAF_SOURCES.length
                ? wildVioletLeafImages
                : null,
            wildVioletFlowerImages:
              wildVioletFlowerImages.length === WILD_VIOLET_FLOWER_SOURCES.length
                ? wildVioletFlowerImages
                : null,
            lycaenidaeBodyImage,
            lycaenidaeWingLeftImages:
              lycaenidaeWingLeftImages.length ===
              LYCAENIDAE_LEFT_WING_SOURCES.length
                ? lycaenidaeWingLeftImages
                : null,
            lycaenidaeWingRightImages:
              lycaenidaeWingRightImages.length ===
              LYCAENIDAE_RIGHT_WING_SOURCES.length
                ? lycaenidaeWingRightImages
                : null,
            beeBodyImage,
            beeLeftWingImage,
            beeRightWingImage,
            bumblebeeBodyImage,
            bumblebeeLeftWingImage,
            bumblebeeRightWingImage,
            orbRingImages:
              orbRingImages.length === ORB_RING_SOURCES.length
                ? orbRingImages
                : null,
            orbRingSmallImages:
              orbRingSmallImages.length === ORB_RING_SMALL_SOURCES.length
                ? orbRingSmallImages
                : null,
            orbBedImages:
              orbBedImages.length === ORB_BED_SOURCES.length
                ? orbBedImages
                : null,
            orbBedSmallImages:
              orbBedSmallImages.length === ORB_BED_SMALL_SOURCES.length
                ? orbBedSmallImages
                : null,
            roseRingImages:
              roseRingImages.length === ROSE_RING_SOURCES.length
                ? roseRingImages
                : null,
            roseLeafAtlas,
          },
          sounds,
        });
      } catch (error) {
        if (__DEV__) {
          console.warn(
            '[useFlowerGardenThemeAssets] Failed to preload assets:',
            error,
          );
        }
      }
    };

    preload();

    return () => {
      cancelled = true;
      appStateCleanupRef.current?.();
      appStateCleanupRef.current = null;
      soundState.ambiencePlaying = false;
      releaseFlowerGardenThemeSounds(loadedSoundsRef.current);
      loadedSoundsRef.current = null;
      loadedCountRef.current = 0;
      setBackgroundImage(null);
      setDecorationImages(null);
      setProgress(0);
      setReadyAssets(null);
    };
  }, [loadSingle, loadAll, tickProgress]);

  if (readyAssets != null) {
    return {
      phase: 'ready',
      progress: 100,
      images: readyAssets.images,
      sounds: readyAssets.sounds,
    };
  }

  return {
    phase: 'loading',
    backgroundImage,
    decorationImages,
    accentImages: null,
    progress,
  } as ThemeAssets;
}
