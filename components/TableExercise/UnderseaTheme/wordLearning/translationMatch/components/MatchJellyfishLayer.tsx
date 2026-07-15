import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Glyphs, Group, matchFont } from '@shopify/react-native-skia';
import type { SkFont, SkImage } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useUnderseaThemeAssetsContext } from '../../../core/providers/UnderseaThemeAssetsProvider';
import { useUnderseaThemeClockQuantized } from '../../../core/clock/UnderseaThemeClockProvider';
import { JellyfishInstance } from '../../../jellyfish/JellyfishTableLayer/components/JellyfishInstance/JellyfishInstance';
import {
  JELLYFISH_DEFAULT_WOBBLE,
} from '../../../jellyfish/JellyfishTableLayer/presets/jellyfishTintPresets';
import { LABEL_STROKE_WIDTH, LABEL_TILT_PX } from '../../../jellyfish/JellyfishTableLayer/config/jellyfishTableLayerConfig';
import { rollBodyTint, sr } from '../../../jellyfish/jellyfishVisualTokens';
import { useJellyfishRoamingLoop } from '../hooks/useJellyfishRoamingLoop';

const MATCH_JELLYFISH_Z = 4;
const JELLYFISH_BELL_SIZE_MIN = 55;
const JELLYFISH_BELL_SIZE_MAX = 90;
const JELLYFISH_LABEL_FONT_SIZE = 16;
const JELLYFISH_CLOCK_FPS = 15;

type RoamingJellyfishProps = {
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
  tintMode: number;
  tintStrength: number;
  tintA: readonly [number, number, number];
  tintB: readonly [number, number, number];
  tintC: readonly [number, number, number];
  animatedTint: boolean;
  tintWaveSpeed: number;
};

function RoamingJellyfish({
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
  tintMode,
  tintStrength,
  tintA,
  tintB,
  tintC,
  animatedTint,
  tintWaveSpeed,
}: RoamingJellyfishProps) {
  const tiltAngle = useDerivedValue(() => tiltAngles.value[index] ?? 0);
  const tiltAmp = useDerivedValue(() => tiltAmps.value[index] ?? 0);

  return (
    <JellyfishInstance
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
      bellWobbleAmp={JELLYFISH_DEFAULT_WOBBLE.wobbleAmp}
      tentacleWobbleAmp={JELLYFISH_DEFAULT_WOBBLE.wobbleAmp * 1.35}
      wobbleSpeed={JELLYFISH_DEFAULT_WOBBLE.wobbleSpeed}
      wobbleLobes={JELLYFISH_DEFAULT_WOBBLE.wobbleLobes}
      tiltAngle={tiltAngle}
      tiltAmp={tiltAmp}
      clock={clock}
    />
  );
}

type JellyfishLabelProps = {
  index: number;
  label: string;
  bellSize: number;
  font: SkFont;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  tiltAngles: SharedValue<number[]>;
  tiltAmps: SharedValue<number[]>;
};

function JellyfishLabel({
  index,
  label,
  bellSize,
  font,
  layoutX,
  layoutY,
  tiltAngles,
  tiltAmps,
}: JellyfishLabelProps) {
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

export type MatchJellyfishLayerProps = {
  words: string[];
  zIndex?: number;
};

export function MatchJellyfishLayer({
  words,
  zIndex = MATCH_JELLYFISH_Z,
}: MatchJellyfishLayerProps) {
  const { width, height } = useWindowDimensions();
  const { images } = useUnderseaThemeAssetsContext();
  const bellImage = images.jellyfishBell;
  const tentacleImage = images.jellyfishTentacles;
  const clock = useUnderseaThemeClockQuantized(JELLYFISH_CLOCK_FPS);

  const count = words.length;

  const {
    layoutX,
    layoutY,
    layoutScale,
    tiltAngles,
    tiltAmps,
  } = useJellyfishRoamingLoop({
    count,
    zoneWidth: width,
    zoneHeight: height,
  });

  const bellSizes = useMemo(() => {
    return words.map((_, i) => {
      const t = sr(i, i + 300);
      return JELLYFISH_BELL_SIZE_MIN + t * (JELLYFISH_BELL_SIZE_MAX - JELLYFISH_BELL_SIZE_MIN);
    });
  }, [words]);

  const jellyfishTints = useMemo(() => {
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
        fontSize: JELLYFISH_LABEL_FONT_SIZE,
        fontWeight: '600',
      }),
    [fontFamily],
  );

  if (width === 0 || height === 0 || count === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, zIndex != null && { zIndex }]}
      pointerEvents="box-none">
      <Canvas style={styles.canvas} pointerEvents="none">
        {words.map((_, index) => {
          const tint = jellyfishTints[index];
          const bellSize = bellSizes[index] ?? JELLYFISH_BELL_SIZE_MIN;
          if (tint == null) {
            return null;
          }
          return (
            <RoamingJellyfish
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
          <JellyfishLabel
            key={`label-${index}`}
            index={index}
            label={word}
            bellSize={bellSizes[index] ?? JELLYFISH_BELL_SIZE_MIN}
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
