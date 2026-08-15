import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Canvas, matchFont, type SkFont } from '@shopify/react-native-skia';
import { Easing, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useFlowerGardenAssetsContext } from '../../../../core/providers/FlowerGardenAssetsProvider';
import { useExerciseClockQuantized, useExerciseLayout } from '../../../../../../core';
import { computeWordSpriteFontScale } from '../../../../../../core/layout/computeWordSpriteFontScale';
import { BushShaderBushRect } from '../../../../scenery/BushShaderLayer/BushShaderLayer';
import { CellRoseBud } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/components/CellRoseBud';
import { FlowerRoseLabel } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/components/FlowerRoseLabel';
import type { FlowerCellConfig } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/types';
import {
  ROSE_LABEL_FONT_SIZE,
  WORD_SPRITE_CLOCK_FPS,
} from '../../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import type { RoseTintRgb } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';
import { rollRoseLabelColors } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseLabelPalette';
import { ORB_DIAMETER_RATIO } from '../../../../orb/orbAnimPresets';
import type { KeepOutDisk } from '../../../../../../wordLearning/translationMatch/domain/wordSpriteRoaming';
import { planFlowerGardenMatchRoseLayout } from './planFlowerGardenMatchRoseLayout';
import { planFlowerGardenMatchStems } from './planFlowerGardenMatchStems';
import type { FlowerGardenMatchRoseTapData } from '../flowerGarden/useFlowerGardenCombinedMatchGestures';

const MATCH_ROSE_Z = 4;
/** Duration of the off-screen exit tween after a successful match. */
const ROSE_EXIT_DURATION_MS = 800;

type MatchRoseProps = {
  config: FlowerCellConfig;
  tint: RoseTintRgb;
  fillColor: string;
  strokeColor: string;
  font: SkFont;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  retainedLabelRotation: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  openness: SharedValue<number[]>;
  roseBudImage: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseBudImage'];
  roseCenterImage: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseCenterImage'];
  ringImages: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseRingImages'];
};

function MatchRose({
  config,
  tint,
  fillColor,
  strokeColor,
  font,
  layoutX,
  layoutY,
  layoutScale,
  retainedLabelRotation,
  tintFlashPreset,
  tintFlashUntil,
  clock,
  openness,
  roseBudImage,
  roseCenterImage,
  ringImages,
}: MatchRoseProps) {
  if (roseBudImage == null || roseCenterImage == null || ringImages == null) {
    return null;
  }

  return (
    <>
      <CellRoseBud
        config={config}
        tint={tint}
        layoutX={layoutX}
        layoutY={layoutY}
        layoutScale={layoutScale}
        layoutScaleMin={layoutScale}
        layoutScaleMax={layoutScale}
        clock={clock}
        tintFlashPreset={tintFlashPreset}
        tintFlashUntil={tintFlashUntil}
        roseBudImage={roseBudImage}
        roseCenterImage={roseCenterImage}
        ringImages={ringImages}
        openness={openness}
      />
      <FlowerRoseLabel
        config={config}
        font={font}
        layoutX={layoutX}
        layoutY={layoutY}
        layoutScale={layoutScale}
        retainedLabelRotation={retainedLabelRotation}
        tintFlashPreset={tintFlashPreset}
        tintFlashUntil={tintFlashUntil}
        clock={clock}
        fillColor={fillColor}
        strokeColor={strokeColor}
      />
    </>
  );
}

export type FlowerGardenMatchWordSpriteLayerProps = {
  words: string[];
  zIndex?: number;
  capturedEnglishSv?: SharedValue<string>;
  matchedIndicesSv?: SharedValue<number[]>;
  englishWordsByIndexSv?: SharedValue<string[]>;
  exitTargetsSv?: SharedValue<Record<number, { tx: number; ty: number }>>;
  tapDataRef?: React.MutableRefObject<unknown>;
  keepOutDiskSv?: SharedValue<KeepOutDisk | null>;
};

export function FlowerGardenMatchWordSpriteLayer({
  words,
  zIndex = MATCH_ROSE_Z,
  capturedEnglishSv,
  matchedIndicesSv,
  englishWordsByIndexSv,
  exitTargetsSv,
  tapDataRef,
  keepOutDiskSv: _keepOutDiskSv,
}: FlowerGardenMatchWordSpriteLayerProps) {
  const { images } = useFlowerGardenAssetsContext();
  const { roamerRect, screenWidth, screenHeight } = useExerciseLayout();
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const count = words.length;

  const fallbackCapturedEnglishSv = useSharedValue('');
  const fallbackMatchedIndicesSv = useSharedValue<number[]>([]);
  const fallbackEnglishWordsByIndexSv = useSharedValue<string[]>([]);
  const fallbackExitTargetsSv = useSharedValue<Record<number, { tx: number; ty: number }>>({});

  const orbCenterX = roamerRect.x + roamerRect.w * 0.5;
  const orbCenterY = roamerRect.y + roamerRect.h * 0.5;
  const orbRadius = Math.min(roamerRect.w, roamerRect.h) * ORB_DIAMETER_RATIO * 0.5;

  const rosePlan = useMemo(
    () =>
      planFlowerGardenMatchRoseLayout({
        count,
        screenWidth,
        screenHeight,
        orbCenterX,
        orbCenterY,
        orbRadius,
      }),
    [count, screenWidth, screenHeight, orbCenterX, orbCenterY, orbRadius],
  );

  const stemPlans = useMemo(
    () =>
      planFlowerGardenMatchStems({
        seedKey: `flower-garden-match-stems:${count}`,
        screenWidth,
        screenHeight,
        roses: rosePlan.roseCenters.map((rose, index) => ({
          index,
          x: rose.x,
          y: rose.y,
          side: rose.side,
        })),
      }),
    [rosePlan.roseCenters, count, screenWidth, screenHeight],
  );

  const layoutX = useSharedValue<number[]>(rosePlan.roseCenters.map(r => r.x));
  const layoutY = useSharedValue<number[]>(rosePlan.roseCenters.map(r => r.y));
  const layoutScale = useSharedValue<number[]>(words.map(() => 1));
  const openness = useSharedValue<number[]>(words.map(() => 1));
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);
  const retainedLabelRotation = useSharedValue(0);

  useEffect(() => {
    layoutX.value = rosePlan.roseCenters.map(r => r.x);
    layoutY.value = rosePlan.roseCenters.map(r => r.y);
    layoutScale.value = words.map(() => 1);
    openness.value = words.map(() => 1);
  }, [rosePlan, words, layoutX, layoutY, layoutScale, openness]);

  useEffect(() => {
    tintFlashPreset.value = words.map(() => -1);
    tintFlashUntil.value = words.map(() => 0);
  }, [words, tintFlashPreset, tintFlashUntil]);

  const activeExitTargetsSv = exitTargetsSv ?? fallbackExitTargetsSv;

  const exitStartsX = useSharedValue<number[]>([]);
  const exitStartsY = useSharedValue<number[]>([]);
  const exitEndsX = useSharedValue<number[]>([]);
  const exitEndsY = useSharedValue<number[]>([]);
  const exitProgress = useSharedValue(0);

  useAnimatedReaction(
    () => activeExitTargetsSv.value,
    (targets, prevTargets) => {
      if (targets == null || prevTargets === targets) {
        return;
      }
      const xs = layoutX.value;
      const ys = layoutY.value;
      const startXs = [...exitStartsX.value];
      const startYs = [...exitStartsY.value];
      const endXs = [...exitEndsX.value];
      const endYs = [...exitEndsY.value];
      let changed = false;
      for (let i = 0; i < xs.length; i++) {
        const target = targets[i];
        if (target == null) {
          continue;
        }
        startXs[i] = xs[i] ?? 0;
        startYs[i] = ys[i] ?? 0;
        endXs[i] = target.tx;
        endYs[i] = target.ty;
        changed = true;
      }
      if (!changed) {
        return;
      }
      exitStartsX.value = startXs;
      exitStartsY.value = startYs;
      exitEndsX.value = endXs;
      exitEndsY.value = endYs;
      if (exitProgress.value >= 1) {
        exitProgress.value = 0;
      }
      exitProgress.value = withTiming(
        1,
        {
          duration: ROSE_EXIT_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        },
        finished => {
          'worklet';
          if (finished) {
            exitStartsX.value = [];
            exitStartsY.value = [];
            exitEndsX.value = [];
            exitEndsY.value = [];
            exitProgress.value = 0;
          }
        },
      );
    },
    [activeExitTargetsSv],
  );

  useAnimatedReaction(
    () => exitProgress.value,
    progress => {
      if (progress <= 0) {
        return;
      }
      const startXs = exitStartsX.value;
      const startYs = exitStartsY.value;
      const endXs = exitEndsX.value;
      const endYs = exitEndsY.value;
      if (startXs.length === 0 || endXs.length === 0) {
        return;
      }
      const xs = [...layoutX.value];
      const ys = [...layoutY.value];
      for (let i = 0; i < xs.length; i++) {
        const sx = startXs[i];
        const sy = startYs[i];
        const ex = endXs[i];
        const ey = endYs[i];
        if (sx == null || sy == null || ex == null || ey == null) {
          continue;
        }
        xs[i] = sx + (ex - sx) * progress;
        ys[i] = sy + (ey - sy) * progress;
      }
      layoutX.value = xs;
      layoutY.value = ys;
    },
    [exitProgress],
  );

  const cellConfigs = useMemo(
    () =>
      words.map((word, index) => ({
        key: `match-rose-${index}`,
        index,
        gridCol: 0,
        gridRow: 0,
        isHeader: false,
        label: word,
        translation: '',
        bellSize: rosePlan.bellSizes[index] ?? 60,
      } satisfies FlowerCellConfig)),
    [words, rosePlan.bellSizes],
  );

  const roseTints = useMemo(
    () => stemPlans.map(bush => bush.tint),
    [stemPlans],
  );

  const labelColors = useMemo(
    () => roseTints.map(tint => rollRoseLabelColors(tint)),
    [roseTints],
  );

  const bodyFont = useMemo(() => {
    const maxBellSize = Math.max(...rosePlan.bellSizes, 60);
    const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
    return matchFont({
      fontFamily,
      fontSize: ROSE_LABEL_FONT_SIZE * computeWordSpriteFontScale(maxBellSize),
      fontWeight: '500',
    });
  }, [rosePlan.bellSizes]);

  const activeMatchedIndicesSv = matchedIndicesSv ?? fallbackMatchedIndicesSv;

  if (tapDataRef) {
    const data: FlowerGardenMatchRoseTapData = {
      layoutX,
      layoutY,
      layoutScale,
      bellSizes: rosePlan.bellSizes,
      tintFlashPreset,
      tintFlashUntil,
      clock,
      matchedIndicesSv: activeMatchedIndicesSv,
      capturedEnglishSv: capturedEnglishSv ?? fallbackCapturedEnglishSv,
      englishWordsByIndexSv: englishWordsByIndexSv ?? fallbackEnglishWordsByIndexSv,
    };
    tapDataRef.current = data;
  }

  if (screenWidth === 0 || screenHeight === 0 || count === 0) {
    return null;
  }

  const stemsReady =
    images.roseLeafAtlas != null && images.calyxImage != null && images.stemImage != null;

  return (
    <View style={[styles.container, { zIndex }]} pointerEvents="none">
      <Canvas style={styles.canvas}>
        {stemsReady &&
          stemPlans.map(bush => (
            <BushShaderBushRect
              key={`stem-${bush.bushId}`}
              bush={bush}
              layoutX={layoutX}
              layoutY={layoutY}
              layoutScale={layoutScale}
              roseBellSizes={cellConfigs.map(config => config.bellSize)}
              stemImage={images.stemImage!}
              calyxImage={images.calyxImage!}
              leafAtlas={images.roseLeafAtlas!}
            />
          ))}
        {cellConfigs.map((config, index) => (
          <MatchRose
            key={config.key}
            config={config}
            tint={roseTints[index] ?? [1, 0.28, 0.2]}
            fillColor={labelColors[index]?.fillColor ?? '#fff'}
            strokeColor={labelColors[index]?.strokeColor ?? '#000'}
            font={bodyFont}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            retainedLabelRotation={retainedLabelRotation}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            clock={clock}
            openness={openness}
            roseBudImage={images.roseBudImage}
            roseCenterImage={images.roseCenterImage}
            ringImages={images.roseRingImages}
          />
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'visible',
  },
  canvas: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});
