/**
 * JellyfishTableLayer
 *
 * Renders a TableData as an interactive jellyfish grid packed inside the screen.
 * Jellyfish never leave the viewport; grid order is always preserved (leftmost
 * stays leftmost, etc.). Spacing is widest near the center (or gesture-biased
 * side) and compresses toward the edges. Swipe gestures shift the spacing bias.
 * Each jellyfish carries a text label centered on its bell (labels may overlap).
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Group,
  matchFont,
  Text,
  type SkFont,
  type SkImage,
  useImage,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { JellyfishInstance } from './JellyfishInstance';
import type { TableData } from '../../../data/tableData';
import { useThrottledClock } from '../../../hooks/useThrottledClock';
import {
  computeLayoutPositions,
  LAYOUT_ZONE_HEIGHT_RATIO,
  LAYOUT_ZONE_TOP_RATIO,
  type LayoutBounds,
  type LayoutParticle,
} from './jellyfishLayout';

const JELLYFISH_BELL = require('../../../assets/jellyfish-bell.png');
const JELLYFISH_TENTACLES = require('../../../assets/jellyfish-tentacles.png');

const BODY_BELL_SIZE = 55;
const HEADER_BELL_SIZE = 45;

const BODY_FONT_SIZE = 13;
const HEADER_FONT_SIZE = 14;

/** Drag distance → bias delta. */
const BIAS_DRAG_SENS = 0.0035;
/** Velocity → bias fling delta. */
const BIAS_FLING_SENS = 0.00035;
const MAX_FLING_MS = 900;
const MIN_FLING_MS = 80;

// ── Worklet helpers ───────────────────────────────────────────────────────

function clampW(val: number, lo: number, hi: number): number {
  'worklet';
  return Math.max(lo, Math.min(hi, val));
}

// ── Tint palette & helpers ────────────────────────────────────────────────

type RGB = readonly [number, number, number];
type TintMode = 0 | 1 | 2;

const BODY_PALETTE: ReadonlyArray<RGB> = [
  [0.85, 0.55, 0.95],
  [0.55, 0.85, 1.0],
  [1.0, 0.7, 0.85],
  [0.9, 0.95, 1.1],
  [1.1, 0.85, 0.6],
  [0.7, 0.95, 0.75],
  [1.15, 0.75, 0.9],
  [0.6, 0.7, 1.15],
];

const HEADER_ROW_A: RGB = [0.6, 0.85, 1.1];
const HEADER_ROW_B: RGB = [0.45, 0.65, 1.0];
const HEADER_COL_A: RGB = [0.85, 1.05, 0.6];
const HEADER_COL_B: RGB = [0.65, 0.95, 0.5];

function sr(a: number, b: number): number {
  let n = (a * 374761393 + b * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 0xffffffff;
}

type TintSpawn = {
  tintMode: TintMode;
  tintStrength: number;
  tintA: RGB;
  tintB: RGB;
  tintC: RGB;
  animatedTint: boolean;
  tintWaveSpeed: number;
};

function rollBodyTint(r: number, c: number): TintSpawn {
  const modeR = sr(r * 3 + 7, c * 5 + 11);
  const tintMode: TintMode = modeR < 0.35 ? 0 : modeR < 0.70 ? 1 : 2;
  const n = BODY_PALETTE.length;
  return {
    tintMode,
    tintStrength: 0.82 + sr(r + 300, c + 300) * 0.12,
    tintA: BODY_PALETTE[Math.floor(sr(r, c) * n)],
    tintB: BODY_PALETTE[Math.floor(sr(r + 100, c + 100) * n)],
    tintC: BODY_PALETTE[Math.floor(sr(r + 200, c + 200) * n)],
    animatedTint: tintMode > 0 && sr(r + 50, c + 50) < 0.45,
    tintWaveSpeed: 0.2 + sr(r + 150, c + 150) * 0.4,
  };
}

// ── Cell config ───────────────────────────────────────────────────────────

type CellConfig = {
  key: string;
  index: number;
  gridCol: number;
  gridRow: number;
  isHeader: boolean;
  label: string;
  bellSize: number;
  phase: number;
  pulseSpeed: number;
} & TintSpawn;

function createCellConfigs(table: TableData): CellConfig[] {
  const configs: CellConfig[] = [];
  const { rowHeaders, colHeaders, body } = table;

  colHeaders.forEach((verb, c) => {
    configs.push({
      key: `hcol-${c}`,
      index: configs.length,
      gridCol: c + 1,
      gridRow: 0,
      isHeader: true,
      label: verb,
      bellSize: HEADER_BELL_SIZE,
      phase: sr(0, c + 1) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(10, c) * 2.0,
      tintMode: 1,
      tintStrength: 0.9,
      tintA: HEADER_ROW_A,
      tintB: HEADER_ROW_B,
      tintC: HEADER_ROW_B,
      animatedTint: true,
      tintWaveSpeed: 0.25 + sr(20, c) * 0.35,
    });
  });

  rowHeaders.forEach((pronoun, r) => {
    configs.push({
      key: `hrow-${r}`,
      index: configs.length,
      gridCol: 0,
      gridRow: r + 1,
      isHeader: true,
      label: pronoun,
      bellSize: HEADER_BELL_SIZE,
      phase: sr(r + 1, 0) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(r, 10) * 2.0,
      tintMode: 1,
      tintStrength: 0.9,
      tintA: HEADER_COL_A,
      tintB: HEADER_COL_B,
      tintC: HEADER_COL_B,
      animatedTint: true,
      tintWaveSpeed: 0.25 + sr(r, 20) * 0.35,
    });
  });

  body.forEach((row, r) => {
    row.forEach((cell, c) => {
      configs.push({
        key: `body-${r}-${c}`,
        index: configs.length,
        gridCol: c + 1,
        gridRow: r + 1,
        isHeader: false,
        label: cell,
        bellSize: BODY_BELL_SIZE,
        phase: sr(r + 5, c + 7) * Math.PI * 2,
        pulseSpeed: 2.0 + sr(r, c + 33) * 2.2,
        ...rollBodyTint(r, c),
      });
    });
  });

  return configs;
}

function sortDrawOrder(configs: CellConfig[]): CellConfig[] {
  return [...configs].sort((a, b) => {
    if (a.isHeader !== b.isHeader) {
      return a.isHeader ? 1 : -1;
    }
    return a.gridRow * 1000 + a.gridCol - (b.gridRow * 1000 + b.gridCol);
  });
}

function buildLayoutParticles(configs: CellConfig[]): LayoutParticle[] {
  return configs.map(c => ({
    gridCol: c.gridCol,
    gridRow: c.gridRow,
    bellRadius: c.bellSize / 2,
  }));
}

// ── CellJellyfish draw component ──────────────────────────────────────────

type CellJellyfishProps = {
  config: CellConfig;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  biasX: SharedValue<number>;
  biasY: SharedValue<number>;
  bellImage: SkImage;
  tentacleImage: SkImage;
  clock: SharedValue<number>;
};

function CellJellyfish({
  config,
  layoutX,
  layoutY,
  layoutScale,
  biasX,
  biasY,
  bellImage,
  tentacleImage,
  clock,
}: CellJellyfishProps) {
  const idx = config.index;

  const centerX = useDerivedValue(() => layoutX.value[idx] ?? 0);
  const centerY = useDerivedValue(() => layoutY.value[idx] ?? 0);
  const sizeScale = useDerivedValue(() => layoutScale.value[idx] ?? 1);

  const tiltAngle = useDerivedValue(() =>
    Math.atan2(biasY.value, biasX.value),
  );
  const tiltAmp = useDerivedValue(() =>
    Math.min(0.06, Math.hypot(biasX.value, biasY.value) * 0.04),
  );

  return (
    <>
      <JellyfishInstance
        bellImage={bellImage}
        tentacleImage={tentacleImage}
        centerX={centerX}
        centerY={centerY}
        bellSize={config.bellSize}
        sizeScale={sizeScale}
        phase={config.phase}
        pulseSpeed={config.pulseSpeed}
        tintMode={config.tintMode}
        tintStrength={config.tintStrength}
        tintA={config.tintA}
        tintB={config.tintB}
        tintC={config.tintC}
        animatedTint={config.animatedTint}
        tintWaveSpeed={config.tintWaveSpeed}
        tiltAngle={tiltAngle}
        tiltAmp={tiltAmp}
        clock={clock}
      />
    </>
  );
}

type CellLabelProps = {
  config: CellConfig;
  font: SkFont;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
};

function CellLabel({ config, font, layoutX, layoutY, layoutScale }: CellLabelProps) {
  const idx = config.index;

  const centerX = useDerivedValue(() => layoutX.value[idx] ?? 0);
  const centerY = useDerivedValue(() => layoutY.value[idx] ?? 0);
  const scale = useDerivedValue(() => layoutScale.value[idx] ?? 1);

  const textWidth = font.getTextWidth(config.label);
  const metrics = font.getMetrics();
  const labelOffsetX = -textWidth / 2;
  const labelOffsetY = -(metrics.ascent + metrics.descent) / 2;

  const labelX = useDerivedValue(() => centerX.value + labelOffsetX);
  const labelY = useDerivedValue(() => centerY.value + labelOffsetY);
  const labelTransform = useDerivedValue(() => [
    { translateX: centerX.value },
    { translateY: centerY.value },
    { scale: scale.value },
    { translateX: -centerX.value },
    { translateY: -centerY.value },
  ]);

  return (
    <Group transform={labelTransform}>
      <Text
        x={labelX}
        y={labelY}
        text={config.label}
        font={font}
        color="rgba(255, 255, 255, 0.95)"
      />
    </Group>
  );
}

// ── JellyfishTableLayer ───────────────────────────────────────────────────

export type JellyfishTableLayerProps = {
  table: TableData;
};

/**
 * Thin loader shell: waits for images before mounting the stateful inner layer,
 * keeping hook call order unconditional inside each component.
 */
export function JellyfishTableLayer({ table }: JellyfishTableLayerProps) {
  const bellImage = useImage(JELLYFISH_BELL);
  const tentacleImage = useImage(JELLYFISH_TENTACLES);
  if (!bellImage || !tentacleImage) { return null; }
  return (
    <JellyfishTableLayerInner
      table={table}
      bellImage={bellImage}
      tentacleImage={tentacleImage}
    />
  );
}

type InnerProps = {
  table: TableData;
  bellImage: NonNullable<ReturnType<typeof useImage>>;
  tentacleImage: NonNullable<ReturnType<typeof useImage>>;
};

function JellyfishTableLayerInner({ table, bellImage, tentacleImage }: InnerProps) {
  const { width, height } = useWindowDimensions();
  const clock = useThrottledClock(20);

  const nGridCols = table.colHeaders.length + 1;
  const nGridRows = table.rowHeaders.length + 1;

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });

  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: BODY_FONT_SIZE,
        fontWeight: '500',
      }),
    [fontFamily],
  );

  const headerFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: HEADER_FONT_SIZE,
        fontWeight: 'bold',
      }),
    [fontFamily],
  );

  const cellConfigs = useMemo(() => createCellConfigs(table), [table]);
  const drawOrder = useMemo(() => sortDrawOrder(cellConfigs), [cellConfigs]);
  const layoutParticles = useMemo(() => buildLayoutParticles(cellConfigs), [cellConfigs]);

  const layoutBounds: LayoutBounds = useMemo(
    () => ({
      width,
      height,
      nGridCols,
      nGridRows,
      zoneTop: height * LAYOUT_ZONE_TOP_RATIO,
      zoneHeight: height * LAYOUT_ZONE_HEIGHT_RATIO,
    }),
    [width, height, nGridCols, nGridRows],
  );

  // ── Layout state ────────────────────────────────────────────────────────

  const biasX = useSharedValue(0);
  const biasY = useSharedValue(0);
  const layoutX = useSharedValue<number[]>([]);
  const layoutY = useSharedValue<number[]>([]);
  const layoutScale = useSharedValue<number[]>([]);

  useAnimatedReaction(
    () => ({ bx: biasX.value, by: biasY.value }),
    () => {
      'worklet';
      const layout = computeLayoutPositions(
        layoutParticles,
        layoutBounds,
        biasX.value,
        biasY.value,
      );
      layoutX.value = layout.xs;
      layoutY.value = layout.ys;
      layoutScale.value = layout.scales;
    },
    [layoutParticles, layoutBounds],
  );

  // ── Gesture ─────────────────────────────────────────────────────────────

  const prevTX = useSharedValue(0);
  const prevTY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      prevTX.value = 0;
      prevTY.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      const dX = e.translationX - prevTX.value;
      const dY = e.translationY - prevTY.value;
      prevTX.value = e.translationX;
      prevTY.value = e.translationY;
      biasX.value = clampW(biasX.value - dX * BIAS_DRAG_SENS, -1, 1);
      biasY.value = clampW(biasY.value - dY * BIAS_DRAG_SENS, -1, 1);
    })
    .onEnd((e) => {
      'worklet';
      const flingMsX = clampW(Math.abs(e.velocityX) * 0.35, MIN_FLING_MS, MAX_FLING_MS);
      const flingMsY = clampW(Math.abs(e.velocityY) * 0.35, MIN_FLING_MS, MAX_FLING_MS);
      const targetX = clampW(
        biasX.value - e.velocityX * BIAS_FLING_SENS,
        -1,
        1,
      );
      const targetY = clampW(
        biasY.value - e.velocityY * BIAS_FLING_SENS,
        -1,
        1,
      );
      biasX.value = withTiming(targetX, {
        duration: flingMsX,
        easing: Easing.out(Easing.cubic),
      });
      biasY.value = withTiming(targetY, {
        duration: flingMsY,
        easing: Easing.out(Easing.cubic),
      });
    });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Canvas style={styles.canvas} pointerEvents="none">
        {drawOrder.map(config => (
          <CellJellyfish
            key={config.key}
            config={config}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            biasX={biasX}
            biasY={biasY}
            bellImage={bellImage}
            tentacleImage={tentacleImage}
            clock={clock}
          />
        ))}
        {drawOrder.map(config => (
          <CellLabel
            key={`${config.key}-label`}
            config={config}
            font={config.isHeader ? headerFont : bodyFont}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
          />
        ))}
      </Canvas>

      <GestureDetector gesture={panGesture}>
        <View style={[styles.gestureCapture, { height: height * LAYOUT_ZONE_HEIGHT_RATIO }]} />
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
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
});
