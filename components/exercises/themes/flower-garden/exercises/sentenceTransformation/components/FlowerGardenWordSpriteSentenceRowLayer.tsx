import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Canvas, matchFont, type SkFont } from '@shopify/react-native-skia';
import {
  Easing,
  runOnUI,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { useExerciseClockQuantized, useExerciseLayout } from '../../../../../core';
import { CellRoseBud } from '../../../carrier/FlowerGardenWordSpriteTableLayer/components/CellRoseBud';
import { FlowerRoseLabel } from '../../../carrier/FlowerGardenWordSpriteTableLayer/components/FlowerRoseLabel';
import type { FlowerCellConfig } from '../../../carrier/FlowerGardenWordSpriteTableLayer/types';
import {
  ROSE_LABEL_FONT_SIZE,
  TINT_FLASH_MS,
  WORD_SPRITE_CLOCK_FPS,
} from '../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import {
  FLOWER_PERSISTENT_HIGHLIGHT_TINTS,
  ROSE_TINT_PRESETS,
  type RoseTintRgb,
} from '../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseTintPresets';
import { rollRoseLabelColors } from '../../../carrier/FlowerGardenWordSpriteTableLayer/presets/roseLabelPalette';
import {
  ROUND_ROW_ENTER_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
  ROUND_SOLVED_POP_DURATION_MS,
  type SentenceRoundPhase,
} from '../../../../../sentenceTransformation/domain';
import type { SentencePromptDisplaySlot } from '../../../../../sentenceTransformation/domain/types';
import type { MotionPath } from '../../../../../sentenceTransformation/domain/motionPathPlanner';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import {
  computeSentenceRowLayout,
  type SentenceSlotConfig,
} from '../../../../../core/layout/exerciseLayout';
import { TILT_AMP_MAX } from '../../../../undersea/carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';
import { WORD_SPRITE_TINT_PRESET_INDEX } from '../../../../undersea/carrier/WordSpriteTableLayer/presets/wordSpriteTintPresets';
import { triggerWordSpriteTintFlash } from '../../../../undersea/carrier/WordSpriteTableLayer/worklets/wordSpriteTableWorklets';
import { findSentenceSlotAtTap } from '../../../../undersea/exercises/sentenceTransformation/components/WordSpriteSentenceRowLayer/sentenceRowWorklets';
import { FlowerSentenceRowStem } from '../stems/FlowerSentenceRowStem';
import { planSentenceRowStems } from '../stems/planSentenceRowStems';

const ROW_OPEN_DURATION_MS = 1500;
const ROW_CLOSE_DURATION_MS = 500;
/** Rose scale while closed (petals shut) — grows to 1 as the rose opens. */
const CLOSED_ROSE_SCALE = 0.5;

export type FlowerGardenSentenceRowTapController = {
  handleTap: (x: number, y: number) => void;
};

export type FlowerGardenWordSpriteSentenceRowLayerProps = {
  displaySlots: SentencePromptDisplaySlot[];
  conjugatedForm: string;
  roundPos: number;
  roundPhase: SentenceRoundPhase;
  motionPaths: MotionPath[];
  blankSlotIndex: number;
  blankExiting: boolean;
  blankExitDurationMs?: number;
  poppingSlotIndex: number | null;
  onTokenTap?: () => void;
  onRowEnterComplete?: () => void;
  onPopComplete?: () => void;
  onRowExitComplete?: () => void;
  /** Exposes a JS tap handler for token taps routed from the orb scene gesture. */
  controllerRef?: React.RefObject<FlowerGardenSentenceRowTapController | null>;
  /** Sentence row zone override (defaults to the exercise layout sprite zone). */
  spriteRect?: ZoneRect;
  /** Orb zone override (defaults to the exercise layout roamer zone). */
  roamerRect?: ZoneRect;
  /** Multiplier for the rose sizes (must match the game's `rowSizeScale`). */
  sizeScale?: number;
  /** Multiplier on the line height (must match the game's `rowLineHeightRatio`). */
  lineHeightRatio?: number;
};

function toFlowerCellConfig(slot: SentenceSlotConfig): FlowerCellConfig {
  return {
    key: slot.key,
    index: slot.index,
    gridCol: 0,
    gridRow: 0,
    isHeader: false,
    label: slot.label,
    translation: slot.translation,
    bellSize: slot.bodySize,
  };
}

type SlotRoseProps = {
  config: FlowerCellConfig;
  tint: RoseTintRgb;
  highlightTint: RoseTintRgb | null;
  font: SkFont;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  layoutScaleMin: SharedValue<number[]>;
  layoutScaleMax: SharedValue<number[]>;
  motionAngles: SharedValue<number[]>;
  motionAmps: SharedValue<number[]>;
  index: number;
  retainedLabelRotation: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  labelFillColor: string;
  labelStrokeColor: string;
  highlightFillColor?: string;
  highlightStrokeColor?: string;
  displayLabel?: string;
  openness?: SharedValue<number[]>;
  roseBudImage: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseBudImage'];
  roseCenterImage: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseCenterImage'];
  ringImages: ReturnType<typeof useFlowerGardenAssetsContext>['images']['roseRingImages'];
};

function SlotRose({
  config,
  tint,
  highlightTint,
  font,
  layoutX,
  layoutY,
  layoutScale,
  layoutScaleMin,
  layoutScaleMax,
  motionAngles,
  motionAmps,
  index,
  retainedLabelRotation,
  tintFlashPreset,
  tintFlashUntil,
  clock,
  labelFillColor,
  labelStrokeColor,
  highlightFillColor,
  highlightStrokeColor,
  displayLabel,
  openness,
  roseBudImage,
  roseCenterImage,
  ringImages,
}: SlotRoseProps) {
  const slotMotionAngle = useDerivedValue(() => motionAngles.value[index] ?? 0);
  const slotMotionAmp = useDerivedValue(() => motionAmps.value[index] ?? 0);

  if (roseBudImage == null || roseCenterImage == null || ringImages == null) {
    return null;
  }

  return (
    <>
      <CellRoseBud
        config={config}
        tint={tint}
        highlightTint={highlightTint}
        layoutX={layoutX}
        layoutY={layoutY}
        layoutScale={layoutScale}
        layoutScaleMin={layoutScaleMin}
        layoutScaleMax={layoutScaleMax}
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
        displayLabel={displayLabel}
        font={font}
        layoutX={layoutX}
        layoutY={layoutY}
        layoutScale={layoutScale}
        motionAngle={slotMotionAngle}
        motionAmp={slotMotionAmp}
        retainedLabelRotation={retainedLabelRotation}
        tintFlashPreset={tintFlashPreset}
        tintFlashUntil={tintFlashUntil}
        clock={clock}
        fillColor={labelFillColor}
        strokeColor={labelStrokeColor}
        highlightFillColor={highlightFillColor}
        highlightStrokeColor={highlightStrokeColor}
      />
    </>
  );
}

export function FlowerGardenWordSpriteSentenceRowLayer({
  displaySlots,
  conjugatedForm,
  roundPos,
  roundPhase,
  motionPaths,
  blankSlotIndex,
  blankExiting,
  blankExitDurationMs = ROUND_ROW_EXIT_DURATION_MS,
  poppingSlotIndex,
  onTokenTap,
  onRowEnterComplete,
  onPopComplete,
  onRowExitComplete,
  controllerRef,
  spriteRect: spriteRectProp,
  roamerRect: roamerRectProp,
  sizeScale = 1,
  lineHeightRatio = 1,
}: FlowerGardenWordSpriteSentenceRowLayerProps) {
  const { images } = useFlowerGardenAssetsContext();
  const {
    spriteRect: layoutSpriteRect,
    roamerRect: layoutRoamerRect,
    screenWidth,
    screenHeight,
  } = useExerciseLayout();
  const spriteRect = spriteRectProp ?? layoutSpriteRect;
  const roamerRect = roamerRectProp ?? layoutRoamerRect;
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const layout = useMemo(
    () =>
      computeSentenceRowLayout({
        slots: displaySlots,
        spriteRect,
        roamerRect,
        conjugatedForm,
        roundPos,
        sizeScale,
        lineHeightRatio,
      }),
    [displaySlots, spriteRect, roamerRect, conjugatedForm, roundPos, sizeScale, lineHeightRatio],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: ROSE_LABEL_FONT_SIZE * layout.fontScale,
        fontWeight: '500',
      }),
    [fontFamily, layout.fontScale],
  );

  const stemPlans = useMemo(
    () =>
      planSentenceRowStems({
        roundPos,
        screenWidth,
        screenHeight,
        slotCenters: layout.xs.map((x, index) => ({ x, y: layout.ys[index] ?? 0 })),
      }).map(bush => ({
        ...bush,
        stems: bush.stems.map(stem => ({
          ...stem,
          baseWidth: stem.baseWidth * sizeScale,
          topWidth: stem.topWidth * sizeScale,
        })),
      })),
    [roundPos, screenWidth, screenHeight, layout.xs, layout.ys, sizeScale],
  );

  const layoutX = useSharedValue<number[]>(layout.xs);
  const renderLayoutX = useSharedValue<number[]>(layout.xs);
  const renderLayoutY = useSharedValue<number[]>(layout.ys);
  const layoutY = useSharedValue<number[]>(layout.ys);
  const baseLayoutScale = useSharedValue<number[]>(layout.scales);
  const layoutScale = useSharedValue<number[]>(layout.scales);
  const slotAnimScale = useSharedValue<number[]>(layout.scales);
  const bellSizesSv = useSharedValue(layout.configs.map(config => config.bodySize));
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);
  const retainedLabelRotation = useSharedValue(0);
  const opennessSv = useSharedValue<number[]>([]);

  const spawnXs = useSharedValue<number[]>([]);
  const spawnYs = useSharedValue<number[]>([]);
  const centerXs = useSharedValue<number[]>([]);
  const centerYs = useSharedValue<number[]>([]);
  const enterAngles = useSharedValue<number[]>([]);
  const exitAngles = useSharedValue<number[]>([]);
  const motionAngles = useSharedValue<number[]>([]);
  const motionAmps = useSharedValue<number[]>([]);
  const swimProgress = useSharedValue(1);
  const openProgress = useSharedValue(1);
  const blankExitProgress = useSharedValue(0);
  const blankSlotIndexSv = useSharedValue(-1);
  const lastSwimRoundRef = useRef(-1);
  const [translatedSlotIndex, setTranslatedSlotIndex] = useState<number | null>(null);
  const translatedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onRowEnterCompleteRef = React.useRef(onRowEnterComplete);
  onRowEnterCompleteRef.current = onRowEnterComplete;
  const onPopCompleteRef = React.useRef(onPopComplete);
  onPopCompleteRef.current = onPopComplete;
  const onRowExitCompleteRef = React.useRef(onRowExitComplete);
  onRowExitCompleteRef.current = onRowExitComplete;

  const fireRowEnterComplete = useCallback(() => {
    onRowEnterCompleteRef.current?.();
  }, []);
  const firePopComplete = useCallback(() => {
    onPopCompleteRef.current?.();
  }, []);
  const fireRowExitComplete = useCallback(() => {
    onRowExitCompleteRef.current?.();
  }, []);

  useEffect(() => {
    bellSizesSv.value = layout.configs.map(config => config.bodySize);
    tintFlashPreset.value = layout.configs.map(() => -1);
    tintFlashUntil.value = layout.configs.map(() => 0);
    blankSlotIndexSv.value = blankSlotIndex;
  }, [layout, bellSizesSv, tintFlashPreset, tintFlashUntil, blankSlotIndex, blankSlotIndexSv]);

  useEffect(() => {
    const count = motionPaths.length;
    if (count === 0) {
      spawnXs.value = [];
      spawnYs.value = [];
      centerXs.value = [];
      centerYs.value = [];
      enterAngles.value = [];
      exitAngles.value = [];
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
    enterAngles.value = motionPaths.map(p => p.enterAngle);
    exitAngles.value = motionPaths.map(p => p.exitAngle);
    layoutX.value = layout.xs;
    layoutY.value = layout.ys;
    baseLayoutScale.value = layout.scales;
    slotAnimScale.value = layout.scales.map(() => 1);

    if (roundPhase === 'enter' && lastSwimRoundRef.current !== roundPos) {
      lastSwimRoundRef.current = roundPos;
      blankExitProgress.value = 0;
      openProgress.value = 0;
      swimProgress.value = 0;
      motionAngles.value = enterAngles.value;
      motionAmps.value = new Array(count).fill(TILT_AMP_MAX);
      swimProgress.value = withTiming(
        1,
        {
          duration: ROUND_ROW_ENTER_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        finished => {
          'worklet';
          if (finished) {
            motionAmps.value = new Array(motionAmps.value.length).fill(0);
            openProgress.value = withTiming(1, {
              duration: ROW_OPEN_DURATION_MS,
              easing: Easing.out(Easing.cubic),
            });
            scheduleOnRN(fireRowEnterComplete);
          }
        },
      );
    }
  }, [
    motionPaths,
    roundPhase,
    roundPos,
    layout,
    layoutX,
    layoutY,
    spawnXs,
    spawnYs,
    centerXs,
    centerYs,
    enterAngles,
    exitAngles,
    motionAngles,
    motionAmps,
    baseLayoutScale,
    slotAnimScale,
    swimProgress,
    openProgress,
    blankExitProgress,
    fireRowEnterComplete,
  ]);

  useAnimatedReaction(
    () => ({
      xs: layoutX.value,
      ys: layoutY.value,
      progress: swimProgress.value,
      open: openProgress.value,
      blankExitProg: blankExitProgress.value,
      blankIdx: blankSlotIndexSv.value,
      sX: spawnXs.value,
      sY: spawnYs.value,
      cX: centerXs.value,
      cY: centerYs.value,
      anim: slotAnimScale.value,
      base: baseLayoutScale.value,
    }),
    ({ xs, ys, progress, open, blankExitProg, blankIdx, sX, sY, cX, cY, anim, base }) => {
      const hasPaths = sX.length > 0 && sX.length === xs.length;
      const blankExitingNow = blankIdx >= 0 && blankExitProg > 0;
      renderLayoutX.value = xs.map((x, i) => {
        if (blankExitingNow && i === blankIdx) {
          const fromX = cX[i] ?? x;
          const toX = sX[i] ?? x;
          return fromX + (toX - fromX) * blankExitProg;
        }
        if (!hasPaths) return x;
        const fromX = sX[i] ?? x;
        const toX = cX[i] ?? x;
        return fromX + (toX - fromX) * progress;
      });
      renderLayoutY.value = ys.map((y, i) => {
        if (blankExitingNow && i === blankIdx) {
          const fromY = cY[i] ?? y;
          const toY = sY[i] ?? y;
          return fromY + (toY - fromY) * blankExitProg;
        }
        if (!hasPaths) return y;
        const fromY = sY[i] ?? y;
        const toY = cY[i] ?? y;
        return fromY + (toY - fromY) * progress;
      });
      const opennessValues = xs.map((_x, i) => {
        let openness = open;
        if (blankExitingNow && i === blankIdx) {
          openness *= 1 - blankExitProg;
        }
        return openness;
      });
      opennessSv.value = opennessValues;
      layoutScale.value = base.map((scale, index) => {
        const openness = opennessValues[index] ?? 1;
        return scale * (anim[index] ?? 1) * (CLOSED_ROSE_SCALE + (1 - CLOSED_ROSE_SCALE) * openness);
      });
    },
  );

  useEffect(() => {
    if (roundPhase === 'exit') {
      const count = layout.configs.length;
      const amps = new Array(count).fill(0);
      if (blankSlotIndex >= 0) {
        motionAngles.value = motionAngles.value.map((_angle, i) =>
          i === blankSlotIndex ? motionAngles.value[i] : exitAngles.value[i] ?? 0,
        );
        for (let i = 0; i < count; i++) {
          amps[i] = i === blankSlotIndex ? motionAmps.value[i] : TILT_AMP_MAX;
        }
      } else {
        motionAngles.value = exitAngles.value;
        for (let i = 0; i < count; i++) {
          amps[i] = TILT_AMP_MAX;
        }
      }
      motionAmps.value = amps;
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
        swimFinished => {
          'worklet';
          if (swimFinished) {
            motionAmps.value = new Array(motionAmps.value.length).fill(0);
            scheduleOnRN(fireRowExitComplete);
          }
        },
      );
    }
  }, [
    blankSlotIndex,
    exitAngles,
    fireRowExitComplete,
    layout.configs.length,
    motionAmps,
    motionAngles,
    openProgress,
    roundPhase,
    swimProgress,
  ]);

  useEffect(() => {
    if (!blankExiting || blankSlotIndex < 0) {
      return;
    }
    blankExitProgress.value = withTiming(1, {
      duration: blankExitDurationMs,
      easing: Easing.in(Easing.cubic),
    });
    const blankIdx = blankSlotIndex;
    motionAngles.value = motionAngles.value.map((_angle, i) =>
      i === blankIdx ? exitAngles.value[blankIdx] ?? 0 : 0,
    );
    motionAmps.value = motionAmps.value.map((_v, i) =>
      i === blankIdx ? TILT_AMP_MAX : 0,
    );
  }, [
    blankExiting,
    blankSlotIndex,
    blankExitProgress,
    blankExitDurationMs,
    exitAngles,
    motionAngles,
    motionAmps,
  ]);

  useEffect(() => {
    if (poppingSlotIndex == null || poppingSlotIndex < 0) {
      return;
    }
    slotAnimScale.value = withTiming(
      slotAnimScale.value.map((scale, index) =>
        index === poppingSlotIndex ? 0 : scale,
      ),
      {
        duration: ROUND_SOLVED_POP_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      finished => {
        'worklet';
        if (finished) {
          scheduleOnRN(firePopComplete);
        }
      },
    );
  }, [firePopComplete, poppingSlotIndex, slotAnimScale]);

  useEffect(() => {
    if (roundPhase === 'enter' || roundPhase === 'transform') {
      slotAnimScale.value = layout.scales.map(() => 1);
    }
  }, [displaySlots, layout.scales, roundPhase, slotAnimScale]);

  const cellConfigs = useMemo(
    () => layout.configs.map(toFlowerCellConfig),
    [layout.configs],
  );

  const roseBellSizes = useMemo(
    () => layout.configs.map(config => config.bodySize),
    [layout.configs],
  );

  const roseTints = useMemo(
    () => stemPlans.map(bush => bush.tint),
    [stemPlans],
  );

  const labelColors = useMemo(
    () => roseTints.map(tint => rollRoseLabelColors(tint)),
    [roseTints],
  );

  const highlightFor = useCallback(
    (index: number): RoseTintRgb | null => {
      if (blankExiting && index === blankSlotIndex) {
        return null;
      }
      return layout.configs[index]?.kind === 'blank'
        ? FLOWER_PERSISTENT_HIGHLIGHT_TINTS.target
        : null;
    },
    [blankExiting, blankSlotIndex, layout.configs],
  );

  const slotKindsRef = React.useRef(layout.configs.map(config => config.kind));
  slotKindsRef.current = layout.configs.map(config => config.kind);
  const onTokenTapRef = React.useRef(onTokenTap);
  onTokenTapRef.current = onTokenTap;

  const handleTokenTapJs = useCallback((slotIndex: number) => {
    if (slotKindsRef.current[slotIndex] === 'token') {
      onTokenTapRef.current?.();
      setTranslatedSlotIndex(slotIndex);
      if (translatedTimeoutRef.current != null) {
        clearTimeout(translatedTimeoutRef.current);
      }
      translatedTimeoutRef.current = setTimeout(() => {
        setTranslatedSlotIndex(null);
        translatedTimeoutRef.current = null;
      }, TINT_FLASH_MS);
    }
  }, []);

  const handleRowTap = useCallback(
    (x: number, y: number) => {
      const hitIndex = findSentenceSlotAtTap(
        x,
        y,
        renderLayoutX.value,
        renderLayoutY.value,
        bellSizesSv.value,
      );
      if (hitIndex < 0) {
        return;
      }
      runOnUI(triggerWordSpriteTintFlash)(
        hitIndex,
        WORD_SPRITE_TINT_PRESET_INDEX.primary,
        tintFlashPreset,
        tintFlashUntil,
        clock,
      );
      handleTokenTapJs(hitIndex);
    },
    [bellSizesSv, clock, handleTokenTapJs, renderLayoutX, renderLayoutY, tintFlashPreset, tintFlashUntil],
  );

  const tapController = useMemo<FlowerGardenSentenceRowTapController>(
    () => ({ handleTap: handleRowTap }),
    [handleRowTap],
  );

  useLayoutEffect(() => {
    if (controllerRef != null) {
      controllerRef.current = tapController;
    }
  }, [controllerRef, tapController]);

  if (displaySlots.length === 0) {
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
              <FlowerSentenceRowStem
                key={`stem-${bush.bushId}`}
                bush={bush}
                spawnX={spawn?.spawnX ?? bush.baseX}
                spawnY={spawn?.spawnY ?? bush.baseY}
                layoutX={renderLayoutX}
                layoutY={renderLayoutY}
                layoutScale={layoutScale}
                roseBellSizes={roseBellSizes}
                stemImage={stemImage}
                calyxImage={calyxImage}
                leafAtlas={leafAtlas}
              />
            );
          })}
        {cellConfigs.map((config, index) => {
          const highlightTint = highlightFor(config.index);
          const highlightColors =
            highlightTint != null ? rollRoseLabelColors(highlightTint) : null;
          const colors = labelColors[index]!;
          return (
            <SlotRose
              key={config.key}
              config={config}
              tint={roseTints[index] ?? ROSE_TINT_PRESETS.scarlet}
              highlightTint={highlightTint}
              font={bodyFont}
              layoutX={renderLayoutX}
              layoutY={renderLayoutY}
              layoutScale={layoutScale}
              layoutScaleMin={layoutScale}
              layoutScaleMax={layoutScale}
              motionAngles={motionAngles}
              motionAmps={motionAmps}
              index={config.index}
              retainedLabelRotation={retainedLabelRotation}
              tintFlashPreset={tintFlashPreset}
              tintFlashUntil={tintFlashUntil}
              clock={clock}
              labelFillColor={colors.fillColor}
              labelStrokeColor={colors.strokeColor}
              highlightFillColor={highlightColors?.fillColor}
              highlightStrokeColor={highlightColors?.strokeColor}
              displayLabel={
                translatedSlotIndex === config.index && config.translation
                  ? config.translation
                  : undefined
              }
              openness={opennessSv}
              roseBudImage={images.roseBudImage}
              roseCenterImage={images.roseCenterImage}
              ringImages={images.roseRingImages}
            />
          );
        })}
      </Canvas>
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
