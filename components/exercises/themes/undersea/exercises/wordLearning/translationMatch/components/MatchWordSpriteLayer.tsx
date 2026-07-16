import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Glyphs, Group, matchFont } from '@shopify/react-native-skia';
import type { SkFont, SkImage } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useUnderseaThemeAssetsContext } from '../../../../core/providers/UnderseaThemeAssetsProvider';
import { useExerciseClockQuantized } from '../../../../../../core';
import { WordSpriteInstance, type WordSpriteDynamicOverrides } from '../../../../carrier/WordSpriteTableLayer/components/WordSpriteInstance/WordSpriteInstance';
import {
  WORD_SPRITE_DEFAULT_WOBBLE,
  WORD_SPRITE_FLASH_TINT_WAVE_SPEED,
  WORD_SPRITE_FLASH_WOBBLE,
  WORD_SPRITE_TINT_PRESETS_BY_INDEX,
} from '../../../../carrier/WordSpriteTableLayer/presets/wordSpriteTintPresets';
import { LABEL_STROKE_WIDTH, LABEL_TILT_PX } from '../../../../carrier/WordSpriteTableLayer/config/wordSpriteTableLayerConfig';
import { rollBodyTint, sr } from '../../../../carrier/wordSpriteVisualTokens';
import type { KeepOutDisk } from '../../../../../../wordLearning/translationMatch/domain/wordSpriteRoaming';
import { useWordSpriteRoamingLoop } from '../../../../../../wordLearning/translationMatch/hooks/useWordSpriteRoamingLoop';
import type { WordSpriteTapData } from '../wordSprite/useCombinedMatchGestures';

const MATCH_WORD_SPRITE_Z = 4;
const WORD_SPRITE_BELL_SIZE_MIN = 55;
const WORD_SPRITE_BELL_SIZE_MAX = 90;
const WORD_SPRITE_LABEL_FONT_SIZE = 16;
const WORD_SPRITE_CLOCK_FPS = 15;

type RoamingWordSpriteProps = {
  index: number;
  bellSize: number;
  bellImage: SkImage;
  tentacleImage: SkImage;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  tiltAngles: SharedValue<number[]>;
  tiltAmps: SharedValue<number[]>;
  clock: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  tintMode: number;
  tintStrength: number;
  tintA: readonly [number, number, number];
  tintB: readonly [number, number, number];
  tintC: readonly [number, number, number];
  animatedTint: boolean;
  tintWaveSpeed: number;
};

function RoamingWordSprite({
  index,
  bellSize,
  bellImage,
  tentacleImage,
  layoutX,
  layoutY,
  layoutScale,
  tiltAngles,
  tiltAmps,
  clock,
  tintFlashPreset,
  tintFlashUntil,
  tintMode,
  tintStrength,
  tintA,
  tintB,
  tintC,
  animatedTint,
  tintWaveSpeed,
}: RoamingWordSpriteProps) {
  const tiltAngle = useDerivedValue(() => tiltAngles.value[index] ?? 0);
  const tiltAmp = useDerivedValue(() => tiltAmps.value[index] ?? 0);
  const tintAArr = useMemo(() => [tintA[0], tintA[1], tintA[2]] as [number, number, number], [tintA]);
  const tintBArr = useMemo(() => [tintB[0], tintB[1], tintB[2]] as [number, number, number], [tintB]);
  const tintCArr = useMemo(() => [tintC[0], tintC[1], tintC[2]] as [number, number, number], [tintC]);

  const dynamicOverrides = useDerivedValue((): WordSpriteDynamicOverrides => {
    const until = tintFlashUntil.value[index] ?? 0;
    const presetIdx = tintFlashPreset.value[index] ?? -1;
    const isFlashing = clock.value < until && presetIdx >= 0;
    const wobble = isFlashing
      ? WORD_SPRITE_FLASH_WOBBLE
      : WORD_SPRITE_DEFAULT_WOBBLE;
    const tentacleWobbleAmp = wobble.wobbleAmp * 1.25;

    if (isFlashing) {
      const preset = WORD_SPRITE_TINT_PRESETS_BY_INDEX[presetIdx];
      if (preset) {
        return {
          tintMode: preset.tintMode,
          tintStrength: preset.tintStrength,
          tintA: [preset.tintA[0], preset.tintA[1], preset.tintA[2]],
          tintB: [preset.tintB[0], preset.tintB[1], preset.tintB[2]],
          tintC: [preset.tintC[0], preset.tintC[1], preset.tintC[2]],
          animatedTint: preset.animatedTint,
          tintWaveSpeed: WORD_SPRITE_FLASH_TINT_WAVE_SPEED,
          bellWobbleAmp: wobble.wobbleAmp,
          tentacleWobbleAmp,
          wobbleSpeed: wobble.wobbleSpeed,
          wobbleLobes: wobble.wobbleLobes,
        };
      }
    }

    return {
      tintMode,
      tintStrength,
      tintA: tintAArr,
      tintB: tintBArr,
      tintC: tintCArr,
      animatedTint,
      tintWaveSpeed,
      bellWobbleAmp: wobble.wobbleAmp,
      tentacleWobbleAmp,
      wobbleSpeed: wobble.wobbleSpeed,
      wobbleLobes: wobble.wobbleLobes,
    };
  });

  return (
    <WordSpriteInstance
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      layoutX={layoutX}
      layoutY={layoutY}
      layoutScale={layoutScale}
      layoutIndex={index}
      bellSize={bellSize}
      tintMode={tintMode}
      tintStrength={tintStrength}
      tintA={tintA}
      tintB={tintB}
      tintC={tintC}
      animatedTint={animatedTint}
      tintWaveSpeed={tintWaveSpeed}
      bellWobbleAmp={WORD_SPRITE_DEFAULT_WOBBLE.wobbleAmp}
      tentacleWobbleAmp={WORD_SPRITE_DEFAULT_WOBBLE.wobbleAmp * 1.35}
      wobbleSpeed={WORD_SPRITE_DEFAULT_WOBBLE.wobbleSpeed}
      wobbleLobes={WORD_SPRITE_DEFAULT_WOBBLE.wobbleLobes}
      tiltAngle={tiltAngle}
      tiltAmp={tiltAmp}
      clock={clock}
      dynamicOverrides={dynamicOverrides}
    />
  );
}

type WordSpriteLabelProps = {
  index: number;
  label: string;
  bellSize: number;
  font: SkFont;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  tiltAngles: SharedValue<number[]>;
  tiltAmps: SharedValue<number[]>;
};

function WordSpriteLabel({
  index,
  label,
  bellSize,
  font,
  layoutX,
  layoutY,
  tiltAngles,
  tiltAmps,
}: WordSpriteLabelProps) {
  const staticGlyphs = useMemo(() => {
    const textWidth = font.getTextWidth(label);
    const metrics = font.getMetrics();
    const labelOffsetX = -textWidth / 2;
    const labelOffsetY = -(metrics.ascent + metrics.descent) / 2;
    const ids = font.getGlyphIDs(label);
    const widths = font.getGlyphWidths(ids);
    let x = labelOffsetX;
    return ids.map((id, i) => {
      const pos = { x, y: labelOffsetY };
      x += widths[i] ?? 0;
      return { id, pos };
    });
  }, [font, label]);

  const labelTransform = useDerivedValue(() => {
    const cx = layoutX.value[index] ?? 0;
    const cy = layoutY.value[index] ?? 0;
    const amp = tiltAmps.value[index] ?? 0;
    let tiltX = 0;
    let tiltY = 0;
    if (amp !== 0) {
      const px = amp * bellSize * LABEL_TILT_PX;
      tiltX = Math.cos(tiltAngles.value[index] ?? 0) * px;
      tiltY = Math.sin(tiltAngles.value[index] ?? 0) * px;
    }
    return [
      { translateX: cx + tiltX },
      { translateY: cy + tiltY },
    ];
  });

  return (
    <Group transform={labelTransform}>
      <Group
        style="stroke"
        strokeWidth={LABEL_STROKE_WIDTH}
        strokeJoin="round"
        strokeCap="round"
        color="rgba(20, 40, 80, 0.9)">
        <Glyphs font={font} glyphs={staticGlyphs} />
      </Group>
      <Glyphs font={font} glyphs={staticGlyphs} color="rgba(220, 235, 255, 0.95)" />
    </Group>
  );
}

export type MatchWordSpriteLayerProps = {
  words: string[];
  zIndex?: number;
  capturedEnglishSv?: SharedValue<string>;
  matchedIndicesSv?: SharedValue<number[]>;
  englishWordsByIndexSv?: SharedValue<string[]>;
  exitTargetsSv?: SharedValue<Record<number, { tx: number; ty: number }>>;
  tapDataRef?: React.MutableRefObject<WordSpriteTapData | null>;
  keepOutDiskSv?: SharedValue<KeepOutDisk | null>;
};

export function MatchWordSpriteLayer({
  words,
  zIndex = MATCH_WORD_SPRITE_Z,
  capturedEnglishSv,
  matchedIndicesSv,
  englishWordsByIndexSv,
  exitTargetsSv,
  tapDataRef,
  keepOutDiskSv,
}: MatchWordSpriteLayerProps) {
  const { width, height } = useWindowDimensions();
  const { images } = useUnderseaThemeAssetsContext();
  const bellImage = images.wordSpriteBell;
  const tentacleImage = images.wordSpriteTentacles;
  const clock = useExerciseClockQuantized(WORD_SPRITE_CLOCK_FPS);

  const count = words.length;

  const fallbackCapturedEnglishSv = useSharedValue('');
  const fallbackMatchedIndicesSv = useSharedValue<number[]>([]);
  const fallbackEnglishWordsByIndexSv = useSharedValue<string[]>([]);
  const fallbackExitTargetsSv = useSharedValue<Record<number, { tx: number; ty: number }>>({});

  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);

  useEffect(() => {
    if (tintFlashPreset.value.length !== count || tintFlashUntil.value.length !== count) {
      tintFlashPreset.value = new Array(count).fill(-1);
      tintFlashUntil.value = new Array(count).fill(0);
    }
  }, [count, tintFlashPreset, tintFlashUntil]);

  const activeMatchedIndicesSv = matchedIndicesSv ?? fallbackMatchedIndicesSv;

  const {
    layoutX,
    layoutY,
    layoutScale,
    tiltAngles,
    tiltAmps,
  } = useWordSpriteRoamingLoop({
    count,
    zoneWidth: width,
    zoneHeight: height,
    matchedIndicesSv: activeMatchedIndicesSv,
    exitTargetsSv: exitTargetsSv ?? fallbackExitTargetsSv,
    keepOutDiskSv,
  });

  const bellSizes = useMemo(() => {
    return words.map((_, i) => {
      const t = sr(i, i + 300);
      return WORD_SPRITE_BELL_SIZE_MIN + t * (WORD_SPRITE_BELL_SIZE_MAX - WORD_SPRITE_BELL_SIZE_MIN);
    });
  }, [words]);

  const wordSpriteTints = useMemo(() => {
    return words.map((_, i) => rollBodyTint(i, i));
  }, [words]);

  const fontFamily = Platform.select({
    ios: 'Helvetica',
    default: 'sans-serif',
  });
  const labelFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: WORD_SPRITE_LABEL_FONT_SIZE,
        fontWeight: '600',
      }),
    [fontFamily],
  );

  if (tapDataRef) {
    tapDataRef.current = {
      layoutX,
      layoutY,
      layoutScale,
      bellSizes,
      tintFlashPreset,
      tintFlashUntil,
      clock,
      matchedIndicesSv: activeMatchedIndicesSv,
      capturedEnglishSv: capturedEnglishSv ?? fallbackCapturedEnglishSv,
      englishWordsByIndexSv: englishWordsByIndexSv ?? fallbackEnglishWordsByIndexSv,
    };
  }

  if (width === 0 || height === 0 || count === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, zIndex != null && { zIndex }]}>
      <Canvas style={styles.canvas} pointerEvents="none">
          {words.map((_, index) => {
            const tint = wordSpriteTints[index];
            const bellSize = bellSizes[index] ?? WORD_SPRITE_BELL_SIZE_MIN;
            if (tint == null) {
              return null;
            }
            return (
              <RoamingWordSprite
                key={`jelly-${index}`}
                index={index}
                bellSize={bellSize}
                bellImage={bellImage}
                tentacleImage={tentacleImage}
                layoutX={layoutX}
                layoutY={layoutY}
                layoutScale={layoutScale}
                tiltAngles={tiltAngles}
                tiltAmps={tiltAmps}
                clock={clock}
                tintFlashPreset={tintFlashPreset}
                tintFlashUntil={tintFlashUntil}
                tintMode={tint.tintMode}
                tintStrength={tint.tintStrength}
                tintA={tint.tintA}
                tintB={tint.tintB}
                tintC={tint.tintC}
                animatedTint={tint.animatedTint}
                tintWaveSpeed={tint.tintWaveSpeed}
              />
            );
          })}
          {words.map((word, index) => (
            <WordSpriteLabel
              key={`label-${index}`}
              index={index}
              label={word}
              bellSize={bellSizes[index] ?? WORD_SPRITE_BELL_SIZE_MIN}
              font={labelFont}
              layoutX={layoutX}
              layoutY={layoutY}
              tiltAngles={tiltAngles}
              tiltAmps={tiltAmps}
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
