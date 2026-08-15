import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Canvas, matchFont, type SkFont, type SkImage } from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN, runOnUI } from 'react-native-worklets';
import { useUnderseaThemeAssetsContext } from '../../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../../../core';
import { useExerciseClockQuantized } from '../../../../../core';
import { CellWordSprite } from '../../../carrier/WordSpriteTableLayer/components/CellWordSprite';
import { CellLabel } from '../../../carrier/WordSpriteTableLayer/components/CellLabel';
import type { CellConfig } from '../../../carrier/WordSpriteTableLayer/helpers/cellConfigBuilders';
import {
  BODY_FONT_SIZE,
  WORD_SPRITE_CLOCK_FPS,
  TAP_MAX_DISTANCE_PX,
  TILT_AMP_MAX,
} from '../../../carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';
import { WORD_SPRITE_TINT_PRESET_INDEX, type WordSpriteTintPresetIndex } from '../../../carrier/WordSpriteTableLayer/presets/wordSpriteTintPresets';
import {
  ROUND_ROW_ENTER_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
  ROUND_RESOLVE_FLY_DURATION_MS,
} from '../../../../../sentenceTransformation/domain';
import {
  ROUND_TRANSLATION_DISPLAY_MS,
} from '../../../../../variantSelection/domain/roundResolutionTiming';
import { computeLetterLayout, TRANSFORMATION_VARIANT_ROW_Y_RATIO } from '../../../../../core/layout/exerciseLayout';
import { rollBodyTint } from '../../../carrier/wordSpriteVisualTokens';
import { triggerWordSpriteTintFlash } from '../../../carrier/WordSpriteTableLayer/worklets/wordSpriteTableWorklets';
import type { OptionWordSpriteState } from '../../../../../variantSelection/hooks/useVariantSelectionGame';
import type { MotionPath } from '../../../../../sentenceTransformation/domain/motionPathPlanner';

export type OptionWordSpriteLayerProps = {
  options: OptionWordSpriteState[];
  motionPaths: MotionPath[];
  roundPhase: string;
  roundPos: number;
  correctOptionIndex: number;
  onOptionTap: (option: OptionWordSpriteState) => void;
  /**
   * When true the selected option is hidden instantly on solve so the
   * resolve-flight copy can replace it seamlessly; wrong options flee.
   * When omitted, all options flee on solve (legacy behaviour).
   */
  seamlessResolve?: boolean;
  /** Blank-slot center the selected option flies to on solve. */
  resolveTargetX?: number;
  resolveTargetY?: number;
  /** Off-screen point the selected option exits to at the end of the round. */
  resolveExitX?: number;
  resolveExitY?: number;
  onResolveComplete?: () => void;
  onExitComplete?: () => void;
  /** Shown on the landed option while holding when tapped. */
  translation?: string;
};

function toCellConfig(option: OptionWordSpriteState, bellSize: number, roundPos: number): CellConfig {
  const tint = rollBodyTint(option.index, roundPos);
  return {
    key: `option-${option.index}`,
    index: option.index,
    gridCol: 0,
    gridRow: 0,
    isHeader: false,
    label: option.form,
    bellSize,
    phase: 0,
    pulseSpeed: 2.2,
    labelFillColor: 'rgba(255,255,255,0.95)',
    labelStrokeColor: 'rgba(20,40,60,0.92)',
    translation: '',
    ...tint,
  };
}

type SlotOptionCellWordSpriteProps = {
  config: CellConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  motionAngles: SharedValue<number[]>;
  motionAmps: SharedValue<number[]>;
  index: number;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  bellImage: SkImage;
  tentacleImage: SkImage;
  clock: SharedValue<number>;
};

function SlotOptionCellWordSprite({
  config,
  layoutX,
  layoutY,
  layoutScale,
  motionAngles,
  motionAmps,
  index,
  tintFlashPreset,
  tintFlashUntil,
  bellImage,
  tentacleImage,
  clock,
}: SlotOptionCellWordSpriteProps) {
  const slotMotionAngle = useDerivedValue(() => motionAngles.value[index] ?? 0);
  const slotMotionAmp = useDerivedValue(() => motionAmps.value[index] ?? 0);

  return (
    <CellWordSprite
      config={config}
      layoutX={layoutX}
      layoutY={layoutY}
      layoutScale={layoutScale}
      motionAngle={slotMotionAngle}
      motionAmp={slotMotionAmp}
      tintFlashPreset={tintFlashPreset}
      tintFlashUntil={tintFlashUntil}
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      clock={clock}
    />
  );
}

type SlotOptionCellLabelProps = {
  config: CellConfig;
  font: SkFont;
  displayLabel?: string;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  motionAngles: SharedValue<number[]>;
  motionAmps: SharedValue<number[]>;
  index: number;
  retainedLabelRotation: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  labelBaseRotation: number;
};

function SlotOptionCellLabel({
  config,
  font,
  displayLabel,
  layoutX,
  layoutY,
  layoutScale,
  motionAngles,
  motionAmps,
  index,
  retainedLabelRotation,
  tintFlashPreset,
  tintFlashUntil,
  clock,
  labelBaseRotation,
}: SlotOptionCellLabelProps) {
  const slotMotionAngle = useDerivedValue(() => motionAngles.value[index] ?? 0);
  const slotMotionAmp = useDerivedValue(() => motionAmps.value[index] ?? 0);

  return (
    <CellLabel
      config={config}
      font={font}
      displayLabel={displayLabel}
      layoutX={layoutX}
      layoutY={layoutY}
      layoutScale={layoutScale}
      motionAngle={slotMotionAngle}
      motionAmp={slotMotionAmp}
      retainedLabelRotation={retainedLabelRotation}
      tintFlashPreset={tintFlashPreset}
      tintFlashUntil={tintFlashUntil}
      clock={clock}
      labelBaseRotation={labelBaseRotation}
    />
  );
}

function computeWordSpriteFontScale(bellSize: number): number {
  return Math.max(0.6, Math.min(1.2, bellSize / 60));
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

export function OptionWordSpriteLayer({
  options,
  motionPaths,
  roundPhase,
  roundPos,
  correctOptionIndex,
  onOptionTap,
  seamlessResolve = false,
  resolveTargetX,
  resolveTargetY,
  resolveExitX,
  resolveExitY,
  onResolveComplete,
  onExitComplete,
  translation,
}: OptionWordSpriteLayerProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const { roamerRect, labelRotationRad } = useExerciseLayout();
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const optionLayout = useMemo(() => {
    const count = options.length;
    if (count === 0) return { diameter: 50, rowY: 0, centers: [] };
    return computeLetterLayout(roamerRect, count, TRANSFORMATION_VARIANT_ROW_Y_RATIO);
  }, [options.length, roamerRect]);

  const gestureCenters = useMemo(() => {
    if (motionPaths.length > 0) {
      return motionPaths.map(p => ({ x: p.slotCenterX, y: p.slotCenterY }));
    }
    return optionLayout.centers.map(x => ({ x, y: optionLayout.rowY }));
  }, [motionPaths, optionLayout.centers, optionLayout.rowY]);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: BODY_FONT_SIZE * computeWordSpriteFontScale(optionLayout.diameter),
        fontWeight: '500',
      }),
    [fontFamily, optionLayout.diameter],
  );

  const layoutX = useSharedValue<number[]>(optionLayout.centers);
  const renderLayoutX = useSharedValue<number[]>(optionLayout.centers);
  const renderLayoutY = useSharedValue<number[]>([]);
  const layoutY = useSharedValue<number[]>([]);
  const layoutScale = useSharedValue<number[]>(options.map(() => 1));
  const baseLayoutScale = useSharedValue<number[]>(options.map(() => 1));
  const slotAnimScale = useSharedValue<number[]>(options.map(() => 1));
  const bellSizesSv = useSharedValue<number[]>(options.map(() => optionLayout.diameter));
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);
  const retainedLabelRotation = useSharedValue(0);

  const spawnXs = useSharedValue<number[]>([]);
  const spawnYs = useSharedValue<number[]>([]);
  const centerXs = useSharedValue<number[]>([]);
  const centerYs = useSharedValue<number[]>([]);
  const enterAngles = useSharedValue<number[]>([]);
  const exitAngles = useSharedValue<number[]>([]);
  const motionAngles = useSharedValue<number[]>([]);
  const motionAmps = useSharedValue<number[]>([]);
  const swimProgress = useSharedValue(1);
  const fleeProgress = useSharedValue(0);
  const resolveProgress = useSharedValue(0);
  const resolveExitProgress = useSharedValue(0);
  const resolveIndex = useSharedValue(-1);
  const resolveTargetXSv = useSharedValue(0);
  const resolveTargetYSv = useSharedValue(0);
  const resolveExitXSv = useSharedValue(0);
  const resolveExitYSv = useSharedValue(0);

  const onOptionTapRef = useRef(onOptionTap);
  onOptionTapRef.current = onOptionTap;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fireResolveComplete = useCallback(() => {
    onResolveComplete?.();
  }, [onResolveComplete]);

  const fireExitComplete = useCallback(() => {
    onExitComplete?.();
  }, [onExitComplete]);

  const [showTranslation, setShowTranslation] = useState(false);
  const translatedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResolvedOptionTap = useCallback(() => {
    if (!translation) return;
    setShowTranslation(true);
    if (translatedTimeoutRef.current != null) {
      clearTimeout(translatedTimeoutRef.current);
    }
    translatedTimeoutRef.current = setTimeout(() => {
      setShowTranslation(false);
      translatedTimeoutRef.current = null;
    }, ROUND_TRANSLATION_DISPLAY_MS);
  }, [translation]);

  const triggerFlash = useCallback(
    (index: number, preset: WordSpriteTintPresetIndex) => {
      runOnUI(() => {
        'worklet';
        triggerWordSpriteTintFlash(
          index,
          preset,
          tintFlashPreset,
          tintFlashUntil,
          clock,
        );
      })();
    },
    [clock, tintFlashPreset, tintFlashUntil],
  );

  const fireOptionTap = useCallback(
    (optionIndex: number) => {
      const option = optionsRef.current.find(o => o.index === optionIndex);
      if (option == null) return;
      if (option.isCorrect) {
        triggerFlash(optionIndex, WORD_SPRITE_TINT_PRESET_INDEX.success);
      } else {
        triggerFlash(optionIndex, WORD_SPRITE_TINT_PRESET_INDEX.error);
      }
      onOptionTapRef.current(option);
    },
    [triggerFlash],
  );

  useEffect(() => {
    bellSizesSv.value = options.map(() => optionLayout.diameter);
    tintFlashPreset.value = options.map(() => -1);
    tintFlashUntil.value = options.map(() => 0);
  }, [optionLayout.diameter, options, bellSizesSv, tintFlashPreset, tintFlashUntil]);

  const hasAnswer = correctOptionIndex >= 0;

  useEffect(() => {
    resolveTargetXSv.value = resolveTargetX ?? 0;
    resolveTargetYSv.value = resolveTargetY ?? 0;
    resolveExitXSv.value = resolveExitX ?? 0;
    resolveExitYSv.value = resolveExitY ?? 0;
  }, [resolveTargetX, resolveTargetY, resolveExitX, resolveExitY, resolveTargetXSv, resolveTargetYSv, resolveExitXSv, resolveExitYSv]);

  useEffect(() => {
    if (!seamlessResolve) return;
    if (!hasAnswer || options.length === 0) return;
    runOnUI(() => {
      'worklet';
      if (fleeProgress.value < 1) {
        fleeProgress.value = withTiming(1, {
          duration: ROUND_ROW_EXIT_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        });
      }
      if (resolveProgress.value < 1) {
        const startX = centerXs.value[correctOptionIndex] ?? 0;
        const startY = centerYs.value[correctOptionIndex] ?? 0;
        const targetX = resolveTargetXSv.value;
        const targetY = resolveTargetYSv.value;
        resolveIndex.value = correctOptionIndex;
        resolveProgress.value = withTiming(
          1,
          {
            duration: ROUND_RESOLVE_FLY_DURATION_MS,
            easing: Easing.out(Easing.cubic),
          },
          finished => {
            'worklet';
            if (finished) {
              const amps = [...motionAmps.value];
              if (amps.length > correctOptionIndex) {
                amps[correctOptionIndex] = 0;
                motionAmps.value = amps;
              }
              scheduleOnRN(fireResolveComplete);
            }
          },
        );
        const angles = [...motionAngles.value];
        const amps = [...motionAmps.value];
        angles[correctOptionIndex] = Math.atan2(
          targetY - startY,
          targetX - startX,
        );
        amps[correctOptionIndex] = withTiming(TILT_AMP_MAX, { duration: 300 });
        motionAngles.value = angles;
        motionAmps.value = amps;
      }
    })();
  }, [hasAnswer, correctOptionIndex, options.length, seamlessResolve, fleeProgress, resolveProgress, resolveIndex, resolveTargetXSv, resolveTargetYSv, centerXs, centerYs, motionAngles, motionAmps, fireResolveComplete]);

  useEffect(() => {
    const count = motionPaths.length;
    if (count === 0 || options.length === 0) {
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
    const enterAnglesList = motionPaths.map(p => p.enterAngle);
    spawnXs.value = motionPaths.map(p => p.spawnX);
    spawnYs.value = motionPaths.map(p => p.spawnY);
    centerXs.value = motionPaths.map(p => p.slotCenterX);
    centerYs.value = motionPaths.map(p => p.slotCenterY);
    enterAngles.value = enterAnglesList;
    exitAngles.value = motionPaths.map(p => p.exitAngle);
    layoutX.value = optionLayout.centers;
    const rowY = optionLayout.rowY;
    layoutY.value = optionLayout.centers.map(() => rowY);
    baseLayoutScale.value = options.map(() => 1);

    if (roundPhase === 'enter') {
      slotAnimScale.value = options.map(() => 1);
      fleeProgress.value = 0;
      resolveProgress.value = 0;
      resolveExitProgress.value = 0;
      resolveIndex.value = -1;
      swimProgress.value = 0;
      motionAngles.value = enterAnglesList;
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
          }
        },
      );
    }
  }, [motionPaths, roundPhase, optionLayout, options, spawnXs, spawnYs, centerXs, centerYs, enterAngles, exitAngles, motionAngles, motionAmps, baseLayoutScale, slotAnimScale, layoutX, layoutY, swimProgress, fleeProgress, resolveProgress, resolveExitProgress, resolveIndex]);

  useAnimatedReaction(
    () => ({
      xs: layoutX.value,
      ys: layoutY.value,
      progress: swimProgress.value,
      sX: spawnXs.value,
      sY: spawnYs.value,
      cX: centerXs.value,
      cY: centerYs.value,
      anim: slotAnimScale.value,
      base: baseLayoutScale.value,
      flee: fleeProgress.value,
      resolve: resolveProgress.value,
      resolveExit: resolveExitProgress.value,
      resolveIdx: resolveIndex.value,
      tX: resolveTargetXSv.value,
      tY: resolveTargetYSv.value,
      eX: resolveExitXSv.value,
      eY: resolveExitYSv.value,
    }),
    ({ xs, ys, progress, sX, sY, cX, cY, anim, base, flee, resolve, resolveExit, resolveIdx, tX, tY, eX, eY }) => {
      const hasPaths = sX.length > 0 && sX.length === xs.length;
      renderLayoutX.value = xs.map((x, i) => {
        const isResolveCell = i === resolveIdx;
        if (isResolveCell && resolveExit > 0) {
          const fromX = tX;
          const toX = eX;
          return fromX + (toX - fromX) * resolveExit;
        }
        if (isResolveCell && resolve > 0) {
          const fromX = cX[i] ?? x;
          const toX = tX;
          return fromX + (toX - fromX) * resolve;
        }
        if (!isResolveCell && flee > 0) {
          const fromX = cX[i] ?? x;
          const toX = sX[i] ?? x;
          return fromX + (toX - fromX) * flee;
        }
        if (!hasPaths) return x;
        const fromX = sX[i] ?? x;
        const toX = cX[i] ?? x;
        return fromX + (toX - fromX) * progress;
      });
      renderLayoutY.value = ys.map((y, i) => {
        const isResolveCell = i === resolveIdx;
        if (isResolveCell && resolveExit > 0) {
          const fromY = tY;
          const toY = eY;
          return fromY + (toY - fromY) * resolveExit;
        }
        if (isResolveCell && resolve > 0) {
          const fromY = cY[i] ?? y;
          const toY = tY;
          return fromY + (toY - fromY) * resolve;
        }
        if (!isResolveCell && flee > 0) {
          const fromY = cY[i] ?? y;
          const toY = sY[i] ?? y;
          return fromY + (toY - fromY) * flee;
        }
        if (!hasPaths) return y;
        const fromY = sY[i] ?? y;
        const toY = cY[i] ?? y;
        return fromY + (toY - fromY) * progress;
      });
      layoutScale.value = base.map((scale, index) => scale * (anim[index] ?? 1));
    },
  );

  useEffect(() => {
    if (roundPhase !== 'resolve' || seamlessResolve) return;

    const count = options.length;
    const amps = new Array(count).fill(TILT_AMP_MAX);
    motionAngles.value = exitAngles.value;
    motionAmps.value = amps;
    swimProgress.value = withTiming(
      0,
      {
        duration: ROUND_ROW_EXIT_DURATION_MS,
        easing: Easing.in(Easing.cubic),
      },
      finished => {
        'worklet';
        if (finished) {
          motionAmps.value = new Array(motionAmps.value.length).fill(0);
        }
      },
    );
  }, [exitAngles, motionAmps, motionAngles, options.length, roundPhase, swimProgress, seamlessResolve]);

  useEffect(() => {
    if (!seamlessResolve) return;
    if (roundPhase !== 'exit' || correctOptionIndex < 0) return;
    runOnUI(() => {
      'worklet';
      if (resolveExitProgress.value < 1) {
        resolveExitProgress.value = withTiming(
          1,
          {
            duration: ROUND_ROW_EXIT_DURATION_MS,
            easing: Easing.in(Easing.cubic),
          },
          finished => {
            'worklet';
            if (finished) {
              const amps = [...motionAmps.value];
              if (amps.length > correctOptionIndex) {
                amps[correctOptionIndex] = 0;
                motionAmps.value = amps;
              }
              scheduleOnRN(fireExitComplete);
            }
          },
        );
        const angles = [...motionAngles.value];
        const amps = [...motionAmps.value];
        angles[correctOptionIndex] = Math.atan2(
          resolveExitYSv.value - resolveTargetYSv.value,
          resolveExitXSv.value - resolveTargetXSv.value,
        );
        amps[correctOptionIndex] = withTiming(TILT_AMP_MAX, { duration: 300 });
        motionAngles.value = angles;
        motionAmps.value = amps;
      }
    })();
  }, [roundPhase, correctOptionIndex, seamlessResolve, resolveExitProgress, resolveExitXSv, resolveExitYSv, resolveTargetXSv, resolveTargetYSv, motionAngles, motionAmps, fireExitComplete]);

  const cellConfigs = useMemo(
    () => options.map(opt => toCellConfig(opt, optionLayout.diameter, roundPos)),
    [options, optionLayout.diameter, roundPos],
  );

  const gestureSize = optionLayout.diameter * 1.1;

  if (options.length === 0) return null;

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {cellConfigs.map(config => (
          <SlotOptionCellWordSprite
            key={config.key}
            config={config}
            layoutX={renderLayoutX}
            layoutY={renderLayoutY}
            layoutScale={layoutScale}
            motionAngles={motionAngles}
            motionAmps={motionAmps}
            index={config.index}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            bellImage={images.wordSpriteBell}
            tentacleImage={images.wordSpriteTentacles}
            clock={clock}
          />
        ))}
        {cellConfigs.map(config => (
          <SlotOptionCellLabel
            key={`${config.key}-label`}
            config={config}
            font={bodyFont}
            displayLabel={
              seamlessResolve && showTranslation && config.index === correctOptionIndex
                ? translation
                : undefined
            }
            layoutX={renderLayoutX}
            layoutY={renderLayoutY}
            layoutScale={layoutScale}
            motionAngles={motionAngles}
            motionAmps={motionAmps}
            index={config.index}
            retainedLabelRotation={retainedLabelRotation}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            clock={clock}
            labelBaseRotation={labelRotationRad}
          />
        ))}
      </Canvas>
      {roundPhase !== 'enter' && !hasAnswer && options.map((option, idx) => (
        <SingleOptionGesture
          key={`gesture-${option.index}`}
          centerX={gestureCenters[idx]?.x ?? 0}
          centerY={gestureCenters[idx]?.y ?? 0}
          size={gestureSize}
          onTap={() => fireOptionTap(option.index)}
        />
      ))}
      {seamlessResolve &&
        roundPhase === 'hold' &&
        correctOptionIndex >= 0 &&
        translation != null && (
          <SingleOptionGesture
            centerX={resolveTargetX ?? 0}
            centerY={resolveTargetY ?? 0}
            size={gestureSize}
            onTap={handleResolvedOptionTap}
          />
        )}
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
