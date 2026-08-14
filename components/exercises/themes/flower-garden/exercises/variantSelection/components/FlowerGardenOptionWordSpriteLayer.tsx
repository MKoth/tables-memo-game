import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Glyphs,
  Group,
  type SkImage,
} from '@shopify/react-native-skia';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { runOnUI, scheduleOnRN } from 'react-native-worklets';
import { useFlowerGardenAssetsContext } from '../../../core/providers/FlowerGardenAssetsProvider';
import { useExerciseClockQuantized, useExerciseLayout } from '../../../../../core';
import { computeLetterLayout, TRANSFORMATION_VARIANT_ROW_Y_RATIO } from '../../../../../core/layout/exerciseLayout';
import {
  ROUND_ROW_ENTER_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
} from '../../../../../variantSelection/domain/roundResolutionTiming';
import { ROUND_SOLVED_POP_DURATION_MS } from '../../../../../sentenceTransformation/domain';
import {
  LETTER_ORB_FLOWER_PRESET,
  ORB_ENTER_DURATION_MS,
  ORB_WRONG_FEEDBACK_MS,
  ORB_WRONG_RAMP_MS,
  ORB_WRONG_SHAKE_HZ,
  ORB_WRONG_TINT_STRENGTH,
} from '../../../orb/orbAnimPresets';
import { OrbFlowerShader } from '../../../orb/OrbFlowerShader';
import {
  LABEL_FILL_COLOR,
  LABEL_REF_DIAMETER,
  LABEL_STROKE_COLOR,
  LABEL_STROKE_WIDTH,
  LABEL_WRONG_COLOR,
  labelFontFor,
  labelGlyphsFor,
} from '../../../orb/orbLabel';
import { OrbPhase, type OrbAnimState } from '../../../orb/orbAnimTypes';
import { hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { TAP_MAX_DISTANCE_PX } from '../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import type { OptionWordSpriteState } from '../../../../../variantSelection/hooks/useVariantSelectionGame';
import type { MotionPath } from '../../../../../sentenceTransformation/domain/motionPathPlanner';
import type { ZoneRect } from '../../../../../core/layout/computeExerciseLayout';
import { WORD_SPRITE_CLOCK_FPS } from '../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';

export type FlowerGardenOptionWordSpriteLayerProps = {
  options: OptionWordSpriteState[];
  motionPaths: MotionPath[];
  roundPhase: string;
  roundPos: number;
  correctOptionIndex: number;
  onOptionTap: (option: OptionWordSpriteState) => void;
  /** Option row zone override (defaults to the exercise layout roamer zone). */
  roamerRect?: ZoneRect;
};

function wrongFeedbackProgress(
  clockMs: number,
  untilMs: number,
  feedbackMs: number,
  rampMs: number,
): number {
  'worklet';
  if (untilMs <= 0 || clockMs >= untilMs) {
    return 0;
  }
  const t = Math.min(1, Math.max(0, (clockMs - (untilMs - feedbackMs)) / feedbackMs));
  const rampFrac = rampMs / feedbackMs;
  if (t < rampFrac) {
    return t / rampFrac;
  }
  if (t > 1 - rampFrac) {
    return (1 - t) / rampFrac;
  }
  return 1;
}

type SlotOptionOrbProps = {
  form: string;
  index: number;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutDiameter: SharedValue<number[]>;
  layoutOpacity: SharedValue<number[]>;
  enterSettle: SharedValue<number>;
  wrongUntil: SharedValue<number[]>;
  ringVariants: ReadonlyArray<SkImage | null>;
  bedVariants: ReadonlyArray<SkImage | null>;
  clock: SharedValue<number>;
};

function SlotOptionOrb({
  form,
  index,
  layoutX,
  layoutY,
  layoutDiameter,
  layoutOpacity,
  enterSettle,
  wrongUntil,
  ringVariants,
  bedVariants,
  clock,
}: SlotOptionOrbProps) {
  const seed = useMemo(
    () => hashSeedString(`flower-garden-variant-option-${index}-${form}`),
    [index, form],
  );

  const anim = useDerivedValue<OrbAnimState>(() => {
    const cx = layoutX.value[index] ?? 0;
    const cy = layoutY.value[index] ?? 0;
    const d = layoutDiameter.value[index] ?? 0;
    const wrongProg = wrongFeedbackProgress(
      clock.value,
      wrongUntil.value[index] ?? 0,
      ORB_WRONG_FEEDBACK_MS,
      ORB_WRONG_RAMP_MS,
    );
    const shakeAmp = wrongProg * Math.max(2, d * 0.05);
    const shakeT = clock.value / 1000;
    const shakeX = shakeAmp * Math.sin(shakeT * ORB_WRONG_SHAKE_HZ * Math.PI * 2);
    const shakeY = shakeAmp * Math.cos(shakeT * ORB_WRONG_SHAKE_HZ * Math.PI * 2 * 1.17);
    return {
      centerX: cx + shakeX,
      centerY: cy + shakeY,
      diameter: d,
      targetDiameter: d,
      overallOpacity: layoutOpacity.value[index] ?? 1,
      captureVisualT: 1,
      phase: OrbPhase.Idle,
      enterT: enterSettle.value,
      burstT: 0,
      idleElapsedMs: clock.value,
      tintR: 1,
      tintG: 0.35,
      tintB: 0.35,
      tintStrength: wrongProg * ORB_WRONG_TINT_STRENGTH,
    };
  });

  const font = useMemo(() => labelFontFor(form.length), [form.length]);
  const glyphs = useMemo(() => labelGlyphsFor(form, font), [font, form]);

  const labelTransform = useDerivedValue(() => {
    const cx = layoutX.value[index] ?? 0;
    const cy = layoutY.value[index] ?? 0;
    const d = layoutDiameter.value[index] ?? 0;
    const wrongProg = wrongFeedbackProgress(
      clock.value,
      wrongUntil.value[index] ?? 0,
      ORB_WRONG_FEEDBACK_MS,
      ORB_WRONG_RAMP_MS,
    );
    const shakeAmp = wrongProg * Math.max(2, d * 0.05);
    const shakeT = clock.value / 1000;
    const shakeX = shakeAmp * Math.sin(shakeT * ORB_WRONG_SHAKE_HZ * Math.PI * 2);
    const shakeY = shakeAmp * Math.cos(shakeT * ORB_WRONG_SHAKE_HZ * Math.PI * 2 * 1.17);
    const ox = LABEL_REF_DIAMETER * 0.5;
    const oy = LABEL_REF_DIAMETER * 0.5;
    const scale = d > 0 ? d / LABEL_REF_DIAMETER : 0;
    return [
      { translateX: cx + shakeX },
      { translateY: cy + shakeY },
      { scale },
      { translateX: -ox },
      { translateY: -oy },
    ];
  });

  const labelOpacity = useDerivedValue(() => {
    return Math.max(0, Math.min(1, layoutOpacity.value[index] ?? 1));
  });

  const labelColor = useDerivedValue(() => {
    const wrongProg = wrongFeedbackProgress(
      clock.value,
      wrongUntil.value[index] ?? 0,
      ORB_WRONG_FEEDBACK_MS,
      ORB_WRONG_RAMP_MS,
    );
    return wrongProg > 0 ? LABEL_WRONG_COLOR : LABEL_FILL_COLOR;
  });

  if (ringVariants == null || bedVariants == null || form.length === 0) {
    return null;
  }

  return (
    <>
      <OrbFlowerShader
        anim={anim}
        seed={seed}
        preset={LETTER_ORB_FLOWER_PRESET}
        ringVariants={ringVariants}
        bedVariants={bedVariants}
      />
      <Group transform={labelTransform} opacity={labelOpacity}>
        <Group
          style="stroke"
          strokeWidth={LABEL_STROKE_WIDTH}
          strokeJoin="round"
          strokeCap="round"
          color={LABEL_STROKE_COLOR}>
          <Glyphs font={font} glyphs={glyphs} />
        </Group>
        <Glyphs font={font} glyphs={glyphs} color={labelColor} />
      </Group>
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

export function FlowerGardenOptionWordSpriteLayer({
  options,
  motionPaths,
  roundPhase,
  correctOptionIndex,
  onOptionTap,
  roamerRect: roamerRectProp,
}: FlowerGardenOptionWordSpriteLayerProps) {
  const { images } = useFlowerGardenAssetsContext();
  const { roamerRect: layoutRoamerRect } = useExerciseLayout();
  const roamerRect = roamerRectProp ?? layoutRoamerRect;
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const optionLayout = useMemo(() => {
    const count = options.length;
    if (count === 0) {
      return { diameter: 50, rowY: 0, centers: [] };
    }
    return computeLetterLayout(roamerRect, count, TRANSFORMATION_VARIANT_ROW_Y_RATIO);
  }, [options.length, roamerRect]);

  const gestureCenters = useMemo(() => {
    if (motionPaths.length > 0) {
      return motionPaths.map(p => ({ x: p.slotCenterX, y: p.slotCenterY }));
    }
    return optionLayout.centers.map(x => ({ x, y: optionLayout.rowY }));
  }, [motionPaths, optionLayout.centers, optionLayout.rowY]);

  const layoutX = useSharedValue<number[]>(optionLayout.centers);
  const renderLayoutX = useSharedValue<number[]>(optionLayout.centers);
  const renderLayoutY = useSharedValue<number[]>([]);
  const layoutY = useSharedValue<number[]>([]);
  const layoutDiameter = useSharedValue<number[]>([]);
  const layoutOpacity = useSharedValue<number[]>(options.map(() => 1));
  const enterSettle = useSharedValue(1);
  const wrongUntil = useSharedValue<number[]>(options.map(() => 0));

  const spawnXs = useSharedValue<number[]>([]);
  const spawnYs = useSharedValue<number[]>([]);
  const centerXs = useSharedValue<number[]>([]);
  const centerYs = useSharedValue<number[]>([]);
  const swimProgress = useSharedValue(1);

  const onOptionTapRef = useRef(onOptionTap);
  onOptionTapRef.current = onOptionTap;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fireOptionTap = useCallback(
    (optionIndex: number) => {
      const option = optionsRef.current.find(o => o.index === optionIndex);
      if (option == null) {
        return;
      }
      if (!option.isCorrect) {
        runOnUI(() => {
          'worklet';
          const until = [...wrongUntil.value];
          until[optionIndex] = clock.value + ORB_WRONG_FEEDBACK_MS;
          wrongUntil.value = until;
        })();
      }
      onOptionTapRef.current(option);
    },
    [clock, wrongUntil],
  );

  useEffect(() => {
    layoutDiameter.value = options.map(() => optionLayout.diameter);
    layoutOpacity.value = options.map(() => 1);
    wrongUntil.value = options.map(() => 0);
  }, [optionLayout.diameter, options, layoutDiameter, layoutOpacity, wrongUntil]);

  const hasAnswer = correctOptionIndex >= 0;

  useEffect(() => {
    if (!hasAnswer || options.length === 0) {
      return;
    }
    layoutOpacity.value = withTiming(
      layoutOpacity.value.map((opacity, index) =>
        index === correctOptionIndex ? 0 : opacity,
      ),
      {
        duration: ROUND_SOLVED_POP_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
    );
  }, [hasAnswer, correctOptionIndex, options.length, layoutOpacity]);

  useEffect(() => {
    const count = motionPaths.length;
    if (count === 0 || options.length === 0) {
      spawnXs.value = [];
      spawnYs.value = [];
      centerXs.value = [];
      centerYs.value = [];
      layoutX.value = [];
      layoutY.value = [];
      enterSettle.value = 1;
      return;
    }
    spawnXs.value = motionPaths.map(p => p.spawnX);
    spawnYs.value = motionPaths.map(p => p.spawnY);
    centerXs.value = motionPaths.map(p => p.slotCenterX);
    centerYs.value = motionPaths.map(p => p.slotCenterY);
    layoutX.value = optionLayout.centers;
    layoutY.value = optionLayout.centers.map(() => optionLayout.rowY);

    if (roundPhase === 'enter') {
      swimProgress.value = 0;
      enterSettle.value = 0;
      swimProgress.value = withTiming(
        1,
        {
          duration: ROUND_ROW_ENTER_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
      );
      enterSettle.value = withTiming(1, {
        duration: ORB_ENTER_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [
    motionPaths,
    roundPhase,
    optionLayout,
    options,
    spawnXs,
    spawnYs,
    centerXs,
    centerYs,
    enterSettle,
    layoutX,
    layoutY,
    swimProgress,
  ]);

  useAnimatedReaction(
    () => ({
      xs: layoutX.value,
      ys: layoutY.value,
      progress: swimProgress.value,
      sX: spawnXs.value,
      sY: spawnYs.value,
      cX: centerXs.value,
      cY: centerYs.value,
    }),
    ({ xs, ys, progress, sX, sY, cX, cY }) => {
      const hasPaths = sX.length > 0 && sX.length === xs.length;
      renderLayoutX.value = xs.map((x, i) => {
        if (!hasPaths) {
          return x;
        }
        const fromX = sX[i] ?? x;
        const toX = cX[i] ?? x;
        return fromX + (toX - fromX) * progress;
      });
      renderLayoutY.value = ys.map((y, i) => {
        if (!hasPaths) {
          return y;
        }
        const fromY = sY[i] ?? y;
        const toY = cY[i] ?? y;
        return fromY + (toY - fromY) * progress;
      });
    },
  );

  useEffect(() => {
    if (roundPhase !== 'exit') {
      return;
    }

    swimProgress.value = withTiming(0, {
      duration: ROUND_ROW_EXIT_DURATION_MS,
      easing: Easing.in(Easing.cubic),
    });
  }, [roundPhase, swimProgress]);

  const gestureSize = optionLayout.diameter * 1.4;

  if (options.length === 0) {
    return null;
  }

  const ringVariants = images.orbRingImages;
  const bedVariants = images.orbBedImages;

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {ringVariants != null &&
          bedVariants != null &&
          options.map(option => (
            <SlotOptionOrb
              key={`option-${option.index}`}
              form={option.form}
              index={option.index}
              layoutX={renderLayoutX}
              layoutY={renderLayoutY}
              layoutDiameter={layoutDiameter}
              layoutOpacity={layoutOpacity}
              enterSettle={enterSettle}
              wrongUntil={wrongUntil}
              ringVariants={ringVariants}
              bedVariants={bedVariants}
              clock={clock}
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
