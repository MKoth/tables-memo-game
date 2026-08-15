import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Canvas, matchFont, type SkFont } from '@shopify/react-native-skia';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import {
  Easing,
  runOnUI,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useFlowerGardenAssetsContext } from '../../../../core/providers/FlowerGardenAssetsProvider';
import { useExerciseClockQuantized, useExerciseLayout } from '../../../../../../core';
import { computeLetterLayout, TRANSFORMATION_VARIANT_ROW_Y_RATIO } from '../../../../../../core/layout/exerciseLayout';
import {
  ROUND_ROW_ENTER_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
} from '../../../../../../sentenceTransformation/domain';
import { CellRoseBud } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/components/CellRoseBud';
import { FlowerRoseLabel } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/components/FlowerRoseLabel';
import type { FlowerCellConfig } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/types';
import {
  ROSE_LABEL_FONT_SIZE,
  TAP_MAX_DISTANCE_PX,
  WORD_SPRITE_CLOCK_FPS,
} from '../../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import {
  ROSE_TINT_PRESETS,
  type RoseTintRgb,
} from '../../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';
import { rollRoseLabelColors } from '../../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseLabelPalette';
import { triggerWordSpriteTintFlash } from '../../../../../../themes/undersea/carrier/WordSpriteTableLayer/worklets/wordSpriteTableWorklets';
import { WORD_SPRITE_TINT_PRESET_INDEX } from '../../../../../../themes/undersea/carrier/WordSpriteTableLayer/presets/wordSpriteTintPresets';
import { FlowerTranslationChoiceStem } from '../stems/FlowerTranslationChoiceStem';
import { planTranslationChoiceStems } from '../stems/planTranslationChoiceStems';
import type { OptionWordSpriteState } from '../../../../../../wordLearning/translationChoice/hooks/useTranslationChoiceGame';
import type { MotionPath } from '../../../../../../sentenceTransformation/domain/motionPathPlanner';
import type { ZoneRect } from '../../../../../../core/layout/computeExerciseLayout';

export type FlowerGardenTranslationChoiceOptionLayerProps = {
  options: OptionWordSpriteState[];
  motionPaths: MotionPath[];
  roundPhase: string;
  roundPos: number;
  correctOptionIndex: number;
  onOptionTap: (option: OptionWordSpriteState) => void;
  /** Option row zone override (defaults to the exercise layout roamer zone). */
  roamerRect?: ZoneRect;
  /** Rose size multiplier (default 1). */
  sizeScale?: number;
};

const ROW_OPEN_DURATION_MS = 1500;
const ROW_CLOSE_DURATION_MS = 500;
/** Rose scale while closed (petals shut) — grows to 1 as the rose opens. */
const CLOSED_ROSE_SCALE = 0.5;
/** Extra spacing between the option roses. */
const OPTION_GAP_RATIO = 0.4;

function toFlowerCellConfig(option: OptionWordSpriteState, bellSize: number): FlowerCellConfig {
  return {
    key: `option-${option.index}`,
    index: option.index,
    gridCol: 0,
    gridRow: 0,
    isHeader: false,
    label: option.form,
    translation: '',
    bellSize,
  };
}

function computeWordSpriteFontScale(bellSize: number): number {
  return Math.max(0.6, bellSize / 60);
}

type SlotRoseProps = {
  config: FlowerCellConfig;
  tint: RoseTintRgb;
  font: SkFont;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  retainedLabelRotation: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  fillColor: string;
  strokeColor: string;
  openness: SharedValue<number[]>;
  roseBudImage: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseBudImage'];
  roseCenterImage: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseCenterImage'];
  ringImages: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseRingImages'];
};

function SlotRose({
  config,
  tint,
  font,
  layoutX,
  layoutY,
  layoutScale,
  retainedLabelRotation,
  tintFlashPreset,
  tintFlashUntil,
  clock,
  fillColor,
  strokeColor,
  openness,
  roseBudImage,
  roseCenterImage,
  ringImages,
}: SlotRoseProps) {
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

type SingleOptionGestureProps = {
  centerX: number;
  centerY: number;
  size: number;
  onTap: () => void;
};

function SingleOptionGesture({ centerX, centerY, size, onTap }: SingleOptionGestureProps) {
  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(onTap);
    },
  });

  return (
    <GestureDetector gesture={tapGesture}>
      <View
        style={{
          position: 'absolute',
          left: centerX - size * 0.5,
          top: centerY - size * 0.5,
          width: size,
          height: size,
        }}
      />
    </GestureDetector>
  );
}

export function FlowerGardenTranslationChoiceOptionLayer({
  options,
  motionPaths,
  roundPhase,
  roundPos,
  correctOptionIndex,
  onOptionTap,
  roamerRect: roamerRectProp,
  sizeScale: sizeScaleProp,
}: FlowerGardenTranslationChoiceOptionLayerProps) {
  const { images } = useFlowerGardenAssetsContext();
  const { roamerRect: layoutRoamerRect, screenWidth, screenHeight } = useExerciseLayout();
  const roamerRect = roamerRectProp ?? layoutRoamerRect;
  const sizeScale = sizeScaleProp ?? 1;
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const optionLayout = useMemo(() => {
    const count = options.length;
    if (count === 0) {
      return { diameter: 50, rowY: 0, centers: [] };
    }
    return computeLetterLayout(
      roamerRect,
      count,
      TRANSFORMATION_VARIANT_ROW_Y_RATIO,
      { gapRatio: OPTION_GAP_RATIO },
    );
  }, [options.length, roamerRect]);

  const roseDiameter = optionLayout.diameter * sizeScale;

  const stemPlans = useMemo(
    () =>
      planTranslationChoiceStems({
        roundPos,
        screenWidth,
        screenHeight,
        slotCenters: optionLayout.centers.map(x => ({ x, y: optionLayout.rowY })),
      }),
    [roundPos, screenWidth, screenHeight, optionLayout.centers, optionLayout.rowY],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: ROSE_LABEL_FONT_SIZE * computeWordSpriteFontScale(roseDiameter),
        fontWeight: '500',
      }),
    [fontFamily, roseDiameter],
  );

  const layoutX = useSharedValue<number[]>(optionLayout.centers);
  const renderLayoutX = useSharedValue<number[]>(optionLayout.centers);
  const renderLayoutY = useSharedValue<number[]>([]);
  const layoutY = useSharedValue<number[]>([]);
  const layoutScale = useSharedValue<number[]>(options.map(() => 1));
  const baseLayoutScale = useSharedValue<number[]>(options.map(() => 1));
  const slotAnimScale = useSharedValue<number[]>(options.map(() => 1));
  const opennessSv = useSharedValue<number[]>(options.map(() => 0));
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);
  const retainedLabelRotation = useSharedValue(0);

  const spawnXs = useSharedValue<number[]>([]);
  const spawnYs = useSharedValue<number[]>([]);
  const centerXs = useSharedValue<number[]>([]);
  const centerYs = useSharedValue<number[]>([]);
  const swimProgress = useSharedValue(1);
  const openProgress = useSharedValue(0);
  const lastSwimRoundRef = useRef(-1);

  const onOptionTapRef = useRef(onOptionTap);
  onOptionTapRef.current = onOptionTap;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    tintFlashPreset.value = options.map(() => -1);
    tintFlashUntil.value = options.map(() => 0);
  }, [options, tintFlashPreset, tintFlashUntil]);

  const fireOptionTap = useCallback(
    (optionIndex: number) => {
      const option = optionsRef.current.find(o => o.index === optionIndex);
      if (option == null) {
        return;
      }
      const preset = option.isCorrect
        ? WORD_SPRITE_TINT_PRESET_INDEX.success
        : WORD_SPRITE_TINT_PRESET_INDEX.error;
      runOnUI(() => {
        'worklet';
        triggerWordSpriteTintFlash(
          optionIndex,
          preset,
          tintFlashPreset,
          tintFlashUntil,
          clock,
        );
      })();
      onOptionTapRef.current(option);
    },
    [clock, tintFlashPreset, tintFlashUntil],
  );

  useEffect(() => {
    const count = motionPaths.length;
    if (count === 0 || options.length === 0) {
      spawnXs.value = [];
      spawnYs.value = [];
      centerXs.value = [];
      centerYs.value = [];
      layoutX.value = [];
      layoutY.value = [];
      baseLayoutScale.value = [];
      slotAnimScale.value = [];
      return;
    }
    spawnXs.value = motionPaths.map(p => p.spawnX);
    spawnYs.value = motionPaths.map(p => p.spawnY);
    centerXs.value = motionPaths.map(p => p.slotCenterX);
    centerYs.value = motionPaths.map(p => p.slotCenterY);
    layoutX.value = optionLayout.centers;
    layoutY.value = optionLayout.centers.map(() => optionLayout.rowY);
    baseLayoutScale.value = options.map(() => 1);
    slotAnimScale.value = options.map(() => 1);

    if (roundPhase === 'enter' && lastSwimRoundRef.current !== roundPos) {
      lastSwimRoundRef.current = roundPos;
      swimProgress.value = 0;
      openProgress.value = 0;
      swimProgress.value = withTiming(
        1,
        {
          duration: ROUND_ROW_ENTER_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        finished => {
          'worklet';
          if (finished) {
            openProgress.value = withTiming(1, {
              duration: ROW_OPEN_DURATION_MS,
              easing: Easing.out(Easing.cubic),
            });
          }
        },
      );
    }
  }, [
    motionPaths,
    roundPhase,
    roundPos,
    optionLayout,
    options,
    spawnXs,
    spawnYs,
    centerXs,
    centerYs,
    baseLayoutScale,
    slotAnimScale,
    layoutX,
    layoutY,
    swimProgress,
    openProgress,
  ]);

  useAnimatedReaction(
    () => ({
      xs: layoutX.value,
      ys: layoutY.value,
      progress: swimProgress.value,
      open: openProgress.value,
      sX: spawnXs.value,
      sY: spawnYs.value,
      cX: centerXs.value,
      cY: centerYs.value,
      anim: slotAnimScale.value,
      base: baseLayoutScale.value,
    }),
    ({ xs, ys, progress, open, sX, sY, cX, cY, anim, base }) => {
      const hasPaths = sX.length > 0 && sX.length === xs.length;
      renderLayoutX.value = xs.map((x, i) => {
        if (!hasPaths) return x;
        const fromX = sX[i] ?? x;
        const toX = cX[i] ?? x;
        return fromX + (toX - fromX) * progress;
      });
      renderLayoutY.value = ys.map((y, i) => {
        if (!hasPaths) return y;
        const fromY = sY[i] ?? y;
        const toY = cY[i] ?? y;
        return fromY + (toY - fromY) * progress;
      });
      const opennessValues = xs.map(() => open);
      opennessSv.value = opennessValues;
      layoutScale.value = base.map((scale, index) => {
        const openness = opennessValues[index] ?? 1;
        return scale * (anim[index] ?? 1) * (CLOSED_ROSE_SCALE + (1 - CLOSED_ROSE_SCALE) * openness);
      });
    },
  );

  useEffect(() => {
    if (roundPhase !== 'resolve') {
      return;
    }
    if (options.length === 0) {
      return;
    }
    openProgress.value = withTiming(0, {
      duration: ROW_CLOSE_DURATION_MS,
      easing: Easing.in(Easing.cubic),
    });
    swimProgress.value = withTiming(
      0,
      {
        duration: ROUND_ROW_EXIT_DURATION_MS,
        easing: Easing.in(Easing.cubic),
      },
    );
  }, [openProgress, options.length, roundPhase, swimProgress]);

  const cellConfigs = useMemo(
    () => options.map(option => toFlowerCellConfig(option, roseDiameter)),
    [options, roseDiameter],
  );

  const roseTints = useMemo(
    () => (stemPlans.length > 0 ? stemPlans.map(bush => bush.tint) : []),
    [stemPlans],
  );

  const labelColors = useMemo(
    () => roseTints.map(tint => rollRoseLabelColors(tint)),
    [roseTints],
  );

  const gestureCenters = useMemo(() => {
    if (motionPaths.length > 0) {
      return motionPaths.map(p => ({ x: p.slotCenterX, y: p.slotCenterY }));
    }
    return optionLayout.centers.map(x => ({ x, y: optionLayout.rowY }));
  }, [motionPaths, optionLayout.centers, optionLayout.rowY]);

  const gestureSize = roseDiameter * 1.4;
  const hasAnswer = correctOptionIndex >= 0;

  if (options.length === 0) {
    return null;
  }

  const leafAtlas = images.roseLeafAtlas;
  const calyxImage = images.calyxImage;
  const stemImage = images.stemImage;
  const stemsReady = leafAtlas != null && calyxImage != null && stemImage != null;

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {stemsReady &&
          stemPlans.map((bush, index) => {
            const spawn = motionPaths[index];
            return (
              <FlowerTranslationChoiceStem
                key={`stem-${bush.bushId}`}
                bush={bush}
                spawnX={spawn?.spawnX ?? bush.baseX}
                spawnY={spawn?.spawnY ?? bush.baseY}
                layoutX={renderLayoutX}
                layoutY={renderLayoutY}
                layoutScale={layoutScale}
                roseBellSizes={cellConfigs.map(config => config.bellSize)}
                stemImage={stemImage}
                calyxImage={calyxImage}
                leafAtlas={leafAtlas}
              />
            );
          })}
        {cellConfigs.map((config, index) => (
          <SlotRose
            key={config.key}
            config={config}
            tint={roseTints[index] ?? ROSE_TINT_PRESETS.scarlet}
            font={bodyFont}
            layoutX={renderLayoutX}
            layoutY={renderLayoutY}
            layoutScale={layoutScale}
            retainedLabelRotation={retainedLabelRotation}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            clock={clock}
            fillColor={labelColors[index]?.fillColor ?? '#fff'}
            strokeColor={labelColors[index]?.strokeColor ?? '#000'}
            openness={opennessSv}
            roseBudImage={images.roseBudImage}
            roseCenterImage={images.roseCenterImage}
            ringImages={images.roseRingImages}
          />
        ))}
      </Canvas>
      {roundPhase !== 'enter' &&
        !hasAnswer &&
        options.map((option, idx) => (
          <SingleOptionGesture
            key={`gesture-${option.index}`}
            centerX={gestureCenters[idx]?.x ?? 0}
            centerY={gestureCenters[idx]?.y ?? 0}
            size={gestureSize}
            onTap={() => fireOptionTap(option.index)}
          />
        ))}
    </>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
