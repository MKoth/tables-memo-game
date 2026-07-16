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
import { scheduleOnRN } from 'react-native-worklets';
import { useUnderseaThemeAssetsContext } from '../../../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseLayout } from '../../../../../../core';
import { useExerciseClockQuantized } from '../../../../../../core';
import { CellWordSprite } from '../../../../carrier/WordSpriteTableLayer/components/CellWordSprite';
import { CellLabel } from '../../../../carrier/WordSpriteTableLayer/components/CellLabel';
import type { CellConfig } from '../../../../carrier/WordSpriteTableLayer/helpers/cellConfigBuilders';
import {
  BODY_FONT_SIZE,
  WORD_SPRITE_CLOCK_FPS,
  TAP_MAX_DISTANCE_PX,
  TILT_AMP_MAX,
  TINT_FLASH_MS,
} from '../../../../carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';
import { WORD_SPRITE_TINT_PRESET_INDEX, type PersistentHighlightKind } from '../../../../carrier/WordSpriteTableLayer/presets/wordSpriteTintPresets';
import {
  ROUND_ROW_ENTER_DURATION_MS,
  ROUND_ROW_EXIT_DURATION_MS,
  ROUND_SOLVED_POP_DURATION_MS,
  type SentenceRoundPhase,
} from '../../../../../../sentenceTransformation/domain';
import type { SentencePromptDisplaySlot } from '../../../../../../sentenceTransformation/domain/types';
import type { SwimPath } from '../../../../../../sentenceTransformation/domain/swimPathPlanner';
import {
  computeSentenceRowLayout,
  type SentenceSlotConfig,
} from '../../../../../../core/layout/exerciseLayout';
import { findSentenceSlotAtTap } from './sentenceRowWorklets';
import { triggerWordSpriteTintFlash } from '../../../../carrier/WordSpriteTableLayer/worklets/wordSpriteTableWorklets';

export type WordSpriteSentenceRowLayerProps = {
  displaySlots: SentencePromptDisplaySlot[];
  conjugatedForm: string;
  roundPos: number;
  roundPhase: SentenceRoundPhase;
  swimPaths: SwimPath[];
  blankSlotIndex: number;
  blankExiting: boolean;
  blankExitDurationMs?: number;
  poppingSlotIndex: number | null;
  onTokenTap?: () => void;
  onRowEnterComplete?: () => void;
  onPopComplete?: () => void;
  onRowExitComplete?: () => void;
};

function toCellConfig(slot: SentenceSlotConfig): CellConfig {
  return {
    key: slot.key,
    index: slot.index,
    gridCol: 0,
    gridRow: 0,
    isHeader: false,
    label: slot.label,
    bellSize: slot.bellSize,
    phase: slot.phase,
    pulseSpeed: slot.pulseSpeed,
    labelFillColor: slot.labelFillColor,
    labelStrokeColor: slot.labelStrokeColor,
    translation: slot.translation,
    tintMode: slot.tintMode,
    tintStrength: slot.tintStrength,
    tintA: slot.tintA,
    tintB: slot.tintB,
    tintC: slot.tintC,
    animatedTint: slot.animatedTint,
    tintWaveSpeed: slot.tintWaveSpeed,
  };
}

type SlotCellWordSpriteProps = {
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
  persistentHighlightKind?: PersistentHighlightKind | null;
};

function SlotCellWordSprite({
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
  persistentHighlightKind,
}: SlotCellWordSpriteProps) {
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
      persistentHighlightKind={persistentHighlightKind}
    />
  );
}

type SlotCellLabelProps = {
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
  persistentHighlightKind?: PersistentHighlightKind | null;
  displayLabel?: string;
};

function SlotCellLabel({
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
  persistentHighlightKind,
  displayLabel,
}: SlotCellLabelProps) {
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
      persistentHighlightKind={persistentHighlightKind}
      displayLabel={displayLabel}
    />
  );
}

export function WordSpriteSentenceRowLayer({
  displaySlots,
  conjugatedForm,
  roundPos,
  roundPhase,
  swimPaths,
  blankSlotIndex,
  blankExiting,
  blankExitDurationMs = ROUND_ROW_EXIT_DURATION_MS,
  poppingSlotIndex,
  onTokenTap,
  onRowEnterComplete,
  onPopComplete,
  onRowExitComplete,
}: WordSpriteSentenceRowLayerProps) {
  const { images } = useUnderseaThemeAssetsContext();
  const { jellyRect, roamerRect, labelRotationRad } = useExerciseLayout();
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const layout = useMemo(
    () =>
      computeSentenceRowLayout({
        slots: displaySlots,
        jellyRect,
        roamerRect,
        conjugatedForm,
        roundPos,
      }),
    [displaySlots, jellyRect, roamerRect, conjugatedForm, roundPos],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: BODY_FONT_SIZE * layout.fontScale,
        fontWeight: '500',
      }),
    [fontFamily, layout.fontScale],
  );

  const layoutX = useSharedValue<number[]>(layout.xs);
  const renderLayoutX = useSharedValue<number[]>(layout.xs);
  const renderLayoutY = useSharedValue<number[]>(layout.ys);
  const layoutY = useSharedValue<number[]>(layout.ys);
  const baseLayoutScale = useSharedValue<number[]>(layout.scales);
  const layoutScale = useSharedValue<number[]>(layout.scales);
  const slotAnimScale = useSharedValue<number[]>(layout.scales);
  const zoneLeftSv = useSharedValue(jellyRect.x);
  const zoneTopSv = useSharedValue(jellyRect.y);
  const bellSizesSv = useSharedValue(layout.configs.map((config) => config.bellSize));
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
  const blankExitProgress = useSharedValue(0);
  const blankSlotIndexSv = useSharedValue(-1);
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
    zoneLeftSv.value = jellyRect.x;
    zoneTopSv.value = jellyRect.y;
    bellSizesSv.value = layout.configs.map((config) => config.bellSize);
    tintFlashPreset.value = layout.configs.map(() => -1);
    tintFlashUntil.value = layout.configs.map(() => 0);
    blankSlotIndexSv.value = blankSlotIndex;
  }, [jellyRect.x, jellyRect.y, layout, bellSizesSv, tintFlashPreset, tintFlashUntil, zoneLeftSv, zoneTopSv, blankSlotIndex, blankSlotIndexSv]);

  useEffect(() => {
    const count = swimPaths.length;
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
    const enterAnglesList = swimPaths.map((p) => p.enterAngle);
    spawnXs.value = swimPaths.map((p) => p.spawnX);
    spawnYs.value = swimPaths.map((p) => p.spawnY);
    centerXs.value = swimPaths.map((p) => p.slotCenterX);
    centerYs.value = swimPaths.map((p) => p.slotCenterY);
    enterAngles.value = enterAnglesList;
    exitAngles.value = swimPaths.map((p) => p.exitAngle);
    layoutX.value = layout.xs;
    layoutY.value = layout.ys;
    baseLayoutScale.value = layout.scales;
    slotAnimScale.value = layout.scales.map(() => 1);

    if (roundPhase === 'enter') {
      blankExitProgress.value = 0;
      swimProgress.value = 0;
      motionAngles.value = enterAnglesList;
      motionAmps.value = new Array(count).fill(TILT_AMP_MAX);
      swimProgress.value = withTiming(
        1,
        {
          duration: ROUND_ROW_ENTER_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          'worklet';
          if (finished) {
            motionAmps.value = new Array(motionAmps.value.length).fill(0);
            scheduleOnRN(fireRowEnterComplete);
          }
        },
      );
    }
  }, [swimPaths, roundPhase, layout, spawnXs, spawnYs, centerXs, centerYs, enterAngles, exitAngles, motionAngles, motionAmps, baseLayoutScale, slotAnimScale, fireRowEnterComplete]);

  useAnimatedReaction(
    () => ({
      xs: layoutX.value,
      ys: layoutY.value,
      progress: swimProgress.value,
      blankExitProg: blankExitProgress.value,
      blankIdx: blankSlotIndexSv.value,
      sX: spawnXs.value,
      sY: spawnYs.value,
      cX: centerXs.value,
      cY: centerYs.value,
      anim: slotAnimScale.value,
      base: baseLayoutScale.value,
    }),
    ({ xs, ys, progress, blankExitProg, blankIdx, sX, sY, cX, cY, anim, base }) => {
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
      layoutScale.value = base.map((scale, index) => scale * (anim[index] ?? 1));
    },
  );

  useEffect(() => {
    if (roundPhase === 'exit') {
      const count = layout.configs.length;
      const amps = new Array(count).fill(0);
      if (blankSlotIndex >= 0) {
        motionAngles.value = motionAngles.value.map((_, i) => {
          return i === blankSlotIndex ? motionAngles.value[i] : (exitAngles.value[i] ?? 0);
        });
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
      swimProgress.value = withTiming(
        0,
        {
          duration: ROUND_ROW_EXIT_DURATION_MS,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          'worklet';
          if (finished) {
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
    roundPhase,
    swimProgress,
  ]);

  useEffect(() => {
    if (!blankExiting || blankSlotIndex < 0) {
      return;
    }
    blankExitProgress.value = withTiming(
      1,
      {
        duration: blankExitDurationMs,
        easing: Easing.in(Easing.cubic),
      },
    );
    const blankIdx = blankSlotIndex;
    const toAngle = exitAngles.value[blankIdx] ?? 0;
    motionAngles.value = motionAngles.value.map((_, i) =>
      i === blankIdx ? toAngle : 0,
    );
    const amps = motionAmps.value.map((_v, i) =>
      i === blankIdx ? TILT_AMP_MAX : 0,
    );
    motionAmps.value = amps;
  }, [blankExiting, blankSlotIndex, slotAnimScale, blankExitProgress, exitAngles, motionAngles, motionAmps]);

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
      (finished) => {
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
    () => layout.configs.map(toCellConfig),
    [layout.configs],
  );

  const slotKindsRef = React.useRef(layout.configs.map((config) => config.kind));
  slotKindsRef.current = layout.configs.map((config) => config.kind);
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

  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: (event) => {
      'worklet';
      const hitIndex = findSentenceSlotAtTap(
        event.x + zoneLeftSv.value,
        event.y + zoneTopSv.value,
        renderLayoutX.value,
        renderLayoutY.value,
        bellSizesSv.value,
      );
      if (hitIndex < 0) {
        return;
      }
      triggerWordSpriteTintFlash(
        hitIndex,
        WORD_SPRITE_TINT_PRESET_INDEX.primary,
        tintFlashPreset,
        tintFlashUntil,
        clock,
      );
      scheduleOnRN(handleTokenTapJs, hitIndex);
    },
  });

  const persistentHighlightFor = useCallback(
    (index: number): PersistentHighlightKind | null => {
      if (blankExiting && index === blankSlotIndex) {
        return null;
      }
      return layout.configs[index]?.kind === 'blank' ? 'target' : null;
    },
    [blankExiting, blankSlotIndex, layout.configs],
  );

  if (displaySlots.length === 0) {
    return null;
  }

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {cellConfigs.map((config) => (
          <SlotCellWordSprite
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
            persistentHighlightKind={persistentHighlightFor(config.index)}
          />
        ))}
        {cellConfigs.map((config) => (
          <SlotCellLabel
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
            persistentHighlightKind={persistentHighlightFor(config.index)}
            displayLabel={
              translatedSlotIndex === config.index && config.translation
                ? config.translation
                : undefined
            }
          />
        ))}
      </Canvas>
      <GestureDetector gesture={tapGesture}>
        <View
          style={[
            styles.gestureCapture,
            {
              left: jellyRect.x,
              top: jellyRect.y,
              width: jellyRect.w,
              height: jellyRect.h,
            },
          ]}
        />
      </GestureDetector>
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
  gestureCapture: {
    position: 'absolute',
  },
});
