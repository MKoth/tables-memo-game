import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useUnderseaThemeAssetsContext } from '../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeLayout } from '../../core/providers/UnderseaThemeLayoutProvider';
import { useUnderseaThemeClockQuantized } from '../../core/clock/UnderseaThemeClockProvider';
import { CellJellyfish } from '../../jellyfish/JellyfishTableLayer/components/CellJellyfish';
import { CellLabel } from '../../jellyfish/JellyfishTableLayer/components/CellLabel';
import type { CellConfig } from '../../jellyfish/JellyfishTableLayer/helpers/cellConfigBuilders';
import {
  BODY_FONT_SIZE,
  JELLYFISH_CLOCK_FPS,
  TAP_MAX_DISTANCE_PX,
  TILT_AMP_MAX,
} from '../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import { JELLYFISH_TINT_PRESET_INDEX, type JellyfishTintPresetIndex } from '../../jellyfish/JellyfishTableLayer/presets/jellyfishTintPresets';
import {
  ROUND_ROW_ENTER_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
} from '../../sentenceTransformation/domain';
import { computeLetterLayout, TRANSFORMATION_VARIANT_ROW_Y_RATIO } from '../../core/layout/underseaExerciseLayout';
import { triggerJellyfishTintFlash } from '../../jellyfish/JellyfishTableLayer/worklets/jellyfishTableWorklets';
import type { OptionJellyfishState } from '../hooks/useVariantSelectionGame';
import type { SwimPath } from '../../sentenceTransformation/domain/swimPathPlanner';

export type OptionJellyfishLayerProps = {
  options: OptionJellyfishState[];
  swimPaths: SwimPath[];
  roundPhase: string;
  correctOptionIndex: number;
  onOptionTap: (option: OptionJellyfishState) => void;
};

function toCellConfig(option: OptionJellyfishState, bellSize: number): CellConfig {
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
    tintMode: 2 as const,
    tintStrength: 0.9,
    tintA: [0.6, 1.3, 1.8] as const,
    tintB: [0.5, 1.15, 1.6] as const,
    tintC: [0.4, 0.95, 1.35] as const,
    animatedTint: true,
    tintWaveSpeed: 0.35,
  };
}

type SlotOptionCellJellyfishProps = {
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

function SlotOptionCellJellyfish({
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
}: SlotOptionCellJellyfishProps) {
  const slotMotionAngle = useDerivedValue(() => motionAngles.value[index] ?? 0);
  const slotMotionAmp = useDerivedValue(() => motionAmps.value[index] ?? 0);

  return (
    <CellJellyfish
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

function computeJellyfishFontScale(bellSize: number): number {
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

export function OptionJellyfishLayer({
  options,
  swimPaths,
  roundPhase,
  correctOptionIndex,
  onOptionTap,
}: OptionJellyfishLayerProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const { koiRect, labelRotationRad } = useUnderseaThemeLayout();
  const clock = useUnderseaThemeClockQuantized(JELLYFISH_CLOCK_FPS);

  const optionLayout = useMemo(() => {
    const count = options.length;
    if (count === 0) return { diameter: 50, rowY: 0, centers: [] };
    return computeLetterLayout(koiRect, count, TRANSFORMATION_VARIANT_ROW_Y_RATIO);
  }, [options.length, koiRect]);

  const optionCenters = useMemo(() => {
    return optionLayout.centers;
  }, [optionLayout.centers]);

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: BODY_FONT_SIZE * computeJellyfishFontScale(optionLayout.diameter),
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
  const optionExitProgress = useSharedValue<number[]>([]);

  const onOptionTapRef = useRef(onOptionTap);
  onOptionTapRef.current = onOptionTap;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const triggerFlash = useCallback(
    (index: number, preset: JellyfishTintPresetIndex) => {
      runOnUI(() => {
        'worklet';
        triggerJellyfishTintFlash(
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
        triggerFlash(optionIndex, JELLYFISH_TINT_PRESET_INDEX.success);
      } else {
        triggerFlash(optionIndex, JELLYFISH_TINT_PRESET_INDEX.error);
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
  const shouldHideCorrect = hasAnswer && roundPhase !== 'enter' && roundPhase !== 'transform';

  useEffect(() => {
    if (roundPhase === 'enter') {
      optionExitProgress.value = options.map(() => 0);
    }
  }, [roundPhase, options, optionExitProgress]);

  const fireOptionExitAnim = useRef<() => void>(() => {});
  fireOptionExitAnim.current = () => {
    'worklet';
    const prog = [...optionExitProgress.value];
    for (let i = 0; i < prog.length; i++) {
      if (i !== correctOptionIndex && (prog[i] ?? 0) < 1) {
        prog[i] = withTiming(1, {
          duration: ROUND_ROW_EXIT_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        });
      }
    }
    optionExitProgress.value = prog;
  };

  useEffect(() => {
    if (!shouldHideCorrect || options.length === 0) return;
    runOnUI(() => {
      'worklet';
      fireOptionExitAnim.current();
    })();
  }, [shouldHideCorrect, correctOptionIndex, options.length, optionExitProgress]);

  useEffect(() => {
    const count = swimPaths.length;
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
    const enterAnglesList = swimPaths.map(p => p.enterAngle);
    spawnXs.value = swimPaths.map(p => p.spawnX);
    spawnYs.value = swimPaths.map(p => p.spawnY);
    centerXs.value = swimPaths.map(p => p.slotCenterX);
    centerYs.value = swimPaths.map(p => p.slotCenterY);
    enterAngles.value = enterAnglesList;
    exitAngles.value = swimPaths.map(p => p.exitAngle);
    layoutX.value = optionLayout.centers;
    const rowY = optionLayout.rowY;
    layoutY.value = optionLayout.centers.map(() => rowY);
    baseLayoutScale.value = options.map(() => 1);
    slotAnimScale.value = options.map(() => 1);

    if (roundPhase === 'enter') {
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
  }, [swimPaths, roundPhase, optionLayout, options, spawnXs, spawnYs, centerXs, centerYs, enterAngles, exitAngles, motionAngles, motionAmps, baseLayoutScale, slotAnimScale, layoutX, layoutY, swimProgress]);

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
      exitProg: optionExitProgress.value,
    }),
    ({ xs, ys, progress, sX, sY, cX, cY, anim, base, exitProg }) => {
      const hasPaths = sX.length > 0 && sX.length === xs.length;
      renderLayoutX.value = xs.map((x, i) => {
        if (exitProg[i] > 0) {
          const fromX = cX[i] ?? x;
          const toX = sX[i] ?? x;
          return fromX + (toX - fromX) * exitProg[i];
        }
        if (!hasPaths) return x;
        const fromX = sX[i] ?? x;
        const toX = cX[i] ?? x;
        return fromX + (toX - fromX) * progress;
      });
      renderLayoutY.value = ys.map((y, i) => {
        if (exitProg[i] > 0) {
          const fromY = cY[i] ?? y;
          const toY = sY[i] ?? y;
          return fromY + (toY - fromY) * exitProg[i];
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
    if (roundPhase !== 'exit') return;

    optionExitProgress.value = options.map(() => 0);

    const count = options.length;
    const amps = new Array(count).fill(0);
    motionAngles.value = exitAngles.value;
    for (let i = 0; i < count; i++) {
      amps[i] = TILT_AMP_MAX;
    }
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
  }, [exitAngles, motionAmps, motionAngles, options.length, roundPhase, swimProgress, optionExitProgress]);

  const cellConfigs = useMemo(
    () => options.map(opt => toCellConfig(opt, optionLayout.diameter)),
    [options, optionLayout.diameter],
  );

  const filterIndex = shouldHideCorrect ? correctOptionIndex : -1;

  const visibleConfigs = useMemo(
    () => cellConfigs.filter(c => c.index !== filterIndex),
    [cellConfigs, filterIndex],
  );

  const gestureSize = optionLayout.diameter * 1.1;

  if (options.length === 0) return null;

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {visibleConfigs.map(config => (
          <SlotOptionCellJellyfish
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
            bellImage={images.jellyfishBell}
            tentacleImage={images.jellyfishTentacles}
            clock={clock}
          />
        ))}
        {visibleConfigs.map(config => (
          <SlotOptionCellLabel
            key={`${config.key}-label`}
            config={config}
            font={bodyFont}
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
      {roundPhase !== 'enter' && !shouldHideCorrect && options.map((option, idx) => (
        <SingleOptionGesture
          key={`gesture-${option.index}`}
          centerX={optionCenters[idx] ?? 0}
          centerY={optionLayout.rowY}
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
