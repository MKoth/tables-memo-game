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
  Glyphs,
  Group,
  matchFont,
  type SkFont,
  type SkImage,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { JellyfishInstance } from './JellyfishInstance';
import type { TableData } from '../../../data/tableData';
import { useThrottledClock } from '../../../hooks/useThrottledClock';
import {
  computeJellyfishSizing,
  computeLayoutPositions,
  LAYOUT_ZONE_HEIGHT_RATIO,
  LAYOUT_ZONE_TOP_RATIO,
  type JellyfishSizing,
  type LayoutBounds,
  type LayoutParticle,
} from './jellyfishLayout';

const JELLYFISH_BELL = require('../../../assets/jellyfish-bell.png');
const JELLYFISH_TENTACLES = require('../../../assets/jellyfish-tentacles.png');

const BODY_FONT_SIZE = 13;
const HEADER_FONT_SIZE = 14;

/** Drag distance → bias delta. */
const BIAS_DRAG_SENS = 0.0035;
/** Velocity → bias fling delta. */
const BIAS_FLING_SENS = 0.00035;
const MAX_FLING_MS = 900;
const MIN_FLING_MS = 80;

/** Max shader tilt amplitude (UV units). */
const TILT_AMP_MAX = 0.08;
/** Gesture velocity (px/s) → tilt strength. */
const TILT_VEL_SCALE = 1 / 900;
/** Per-frame drag delta (px) → tilt strength when velocity is low. */
const TILT_DRAG_SCALE = 0.018;
/** Bias delta per frame → tilt strength during coasting fling. */
const TILT_BIAS_VEL_SCALE = 120;
/** Bias speed below this is treated as stopped. */
const TILT_STOP_BIAS_VEL = 0.00003;
/** Per-frame exponential decay when layout is idle. */
const TILT_DECAY = 0.88;
/** Label slide: motionAmp (UV) × bellSize × scale → screen px. */
const LABEL_TILT_PX = 3;
/** Max label rotation during motion, in movement direction (radians). */
const LABEL_ROTATION_MAX_RAD = (45 * Math.PI) / 180;
/** Outline thickness (px, before layout scale). */
const LABEL_STROKE_WIDTH = 1.5;

// ── Worklet helpers ───────────────────────────────────────────────────────

function clampW(val: number, lo: number, hi: number): number {
  'worklet';
  return Math.max(lo, Math.min(hi, val));
}

function updateRetainedLabelRotation(
  retained: { value: number },
  angle: number,
  amp: number,
): void {
  'worklet';
  if (amp === 0) {
    return;
  }
  const t = amp / TILT_AMP_MAX;
  const raw = angle * t;
  retained.value = clampW(raw, -LABEL_ROTATION_MAX_RAD, LABEL_ROTATION_MAX_RAD);
}

function updateMotionFromDrag(
  motionAngle: { value: number },
  motionAmp: { value: number },
  velocityX: number,
  velocityY: number,
  dX: number,
  dY: number,
): void {
  'worklet';
  const speed = Math.hypot(velocityX, velocityY);
  if (speed > 40) {
    motionAngle.value = Math.atan2(velocityY, velocityX);
    motionAmp.value = Math.min(TILT_AMP_MAX, speed * TILT_VEL_SCALE);
    return;
  }
  const dragSpeed = Math.hypot(dX, dY);
  if (dragSpeed > 0.5) {
    motionAngle.value = Math.atan2(dY, dX);
    motionAmp.value = Math.min(TILT_AMP_MAX, dragSpeed * TILT_DRAG_SCALE);
  }
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

function uniqueTintColors(tintA: RGB, tintB: RGB, tintC: RGB): RGB[] {
  const seen = new Set<string>();
  const out: RGB[] = [];
  for (const c of [tintA, tintB, tintC]) {
    const key = `${c[0]},${c[1]},${c[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

function lightenTint(c: RGB, amount: number): RGB {
  return [
    c[0] + (1 - c[0]) * amount,
    c[1] + (1 - c[1]) * amount,
    c[2] + (1 - c[2]) * amount,
  ];
}

function darkenTint(c: RGB, amount: number): RGB {
  return [c[0] * (1 - amount), c[1] * (1 - amount), c[2] * (1 - amount)];
}

function tintToRgba(c: RGB, alpha: number): string {
  const ch = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgba(${ch(c[0])}, ${ch(c[1])}, ${ch(c[2])}, ${alpha})`;
}

/** Pick label fill/stroke from jellyfish tints; body is lightened, border darkened. */
function rollLabelColors(
  tintA: RGB,
  tintB: RGB,
  tintC: RGB,
  seedA: number,
  seedB: number,
): { labelFillColor: string; labelStrokeColor: string } {
  const palette = uniqueTintColors(tintA, tintB, tintC);
  let bodyBase: RGB;
  let borderBase: RGB;

  if (palette.length >= 2) {
    const bodyIdx = Math.floor(sr(seedA, seedB) * palette.length);
    let borderIdx = Math.floor(sr(seedA + 41, seedB + 67) * palette.length);
    if (borderIdx === bodyIdx) {
      borderIdx = (borderIdx + 1) % palette.length;
    }
    bodyBase = palette[bodyIdx];
    borderBase = palette[borderIdx];
  } else {
    bodyBase = palette[0];
    borderBase = palette[0];
  }

  return {
    labelFillColor: tintToRgba(lightenTint(bodyBase, 0.38), 0.95),
    labelStrokeColor: tintToRgba(darkenTint(borderBase, 0.68), 0.92),
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
  labelFillColor: string;
  labelStrokeColor: string;
} & TintSpawn;

function createCellConfigs(table: TableData, sizing: JellyfishSizing): CellConfig[] {
  const configs: CellConfig[] = [];
  const { rowHeaders, colHeaders, body } = table;
  const { bodyBellSize, headerBellSize } = sizing;

  colHeaders.forEach((verb, c) => {
    configs.push({
      key: `hcol-${c}`,
      index: configs.length,
      gridCol: c + 1,
      gridRow: 0,
      isHeader: true,
      label: verb,
      bellSize: headerBellSize,
      phase: sr(0, c + 1) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(10, c) * 2.0,
      tintMode: 1,
      tintStrength: 0.9,
      tintA: HEADER_ROW_A,
      tintB: HEADER_ROW_B,
      tintC: HEADER_ROW_B,
      animatedTint: true,
      tintWaveSpeed: 0.25 + sr(20, c) * 0.35,
      ...rollLabelColors(HEADER_ROW_A, HEADER_ROW_B, HEADER_ROW_B, c, 901),
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
      bellSize: headerBellSize,
      phase: sr(r + 1, 0) * Math.PI * 2,
      pulseSpeed: 2.2 + sr(r, 10) * 2.0,
      tintMode: 1,
      tintStrength: 0.9,
      tintA: HEADER_COL_A,
      tintB: HEADER_COL_B,
      tintC: HEADER_COL_B,
      animatedTint: true,
      tintWaveSpeed: 0.25 + sr(r, 20) * 0.35,
      ...rollLabelColors(HEADER_COL_A, HEADER_COL_B, HEADER_COL_B, r, 902),
    });
  });

  body.forEach((row, r) => {
    row.forEach((cell, c) => {
      const tint = rollBodyTint(r, c);
      configs.push({
        key: `body-${r}-${c}`,
        index: configs.length,
        gridCol: c + 1,
        gridRow: r + 1,
        isHeader: false,
        label: cell,
        bellSize: bodyBellSize,
        phase: sr(r + 5, c + 7) * Math.PI * 2,
        pulseSpeed: 2.0 + sr(r, c + 33) * 2.2,
        ...tint,
        ...rollLabelColors(tint.tintA, tint.tintB, tint.tintC, r + 500, c + 700),
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
  motionAngle: SharedValue<number>;
  motionAmp: SharedValue<number>;
  bellImage: SkImage;
  tentacleImage: SkImage;
  clock: SharedValue<number>;
};

function CellJellyfish({
  config,
  layoutX,
  layoutY,
  layoutScale,
  motionAngle,
  motionAmp,
  bellImage,
  tentacleImage,
  clock,
}: CellJellyfishProps) {
  const idx = config.index;

  const centerX = useDerivedValue(() => layoutX.value[idx] ?? 0);
  const centerY = useDerivedValue(() => layoutY.value[idx] ?? 0);
  const sizeScale = useDerivedValue(() => layoutScale.value[idx] ?? 1);

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
        tiltAngle={motionAngle}
        tiltAmp={motionAmp}
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
  motionAngle: SharedValue<number>;
  motionAmp: SharedValue<number>;
  retainedLabelRotation: SharedValue<number>;
};

function CellLabel({
  config,
  font,
  layoutX,
  layoutY,
  layoutScale,
  motionAngle,
  motionAmp,
  retainedLabelRotation,
}: CellLabelProps) {
  const idx = config.index;

  const centerX = useDerivedValue(() => layoutX.value[idx] ?? 0);
  const centerY = useDerivedValue(() => layoutY.value[idx] ?? 0);
  const scale = useDerivedValue(() => layoutScale.value[idx] ?? 1);

  const staticGlyphs = useMemo(() => {
    const textWidth = font.getTextWidth(config.label);
    const metrics = font.getMetrics();
    const labelOffsetX = -textWidth / 2;
    const labelOffsetY = -(metrics.ascent + metrics.descent) / 2;
    const ids = font.getGlyphIDs(config.label);
    const widths = font.getGlyphWidths(ids);
    let x = labelOffsetX;
    return ids.map((id, i) => {
      const pos = vec(x, labelOffsetY);
      x += widths[i] ?? 0;
      return { id, pos };
    });
  }, [font, config.label]);

  const labelTransform = useDerivedValue(() => {
    const cx = centerX.value;
    const cy = centerY.value;
    const amp = motionAmp.value;
    let tiltX = 0;
    let tiltY = 0;
    if (amp !== 0) {
      const px = amp * config.bellSize * scale.value * LABEL_TILT_PX;
      tiltX = Math.cos(motionAngle.value) * px;
      tiltY = Math.sin(motionAngle.value) * px;
    }
    const pivotX = cx + tiltX;
    const pivotY = cy + tiltY;
    // Glyphs are in local space centered at (0,0); translate to pivot then scale/rotate.
    return [
      { translateX: pivotX },
      { translateY: pivotY },
      { scale: scale.value },
      { rotate: retainedLabelRotation.value },
    ];
  });

  return (
    <Group transform={labelTransform}>
      <Group
        style="stroke"
        strokeWidth={LABEL_STROKE_WIDTH}
        strokeJoin="round"
        strokeCap="round"
        color={config.labelStrokeColor}
      >
        <Glyphs font={font} glyphs={staticGlyphs} />
      </Group>
      <Glyphs font={font} glyphs={staticGlyphs} color={config.labelFillColor} />
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
  const clock = useThrottledClock(15);

  const nGridCols = table.colHeaders.length + 1;
  const nGridRows = table.rowHeaders.length + 1;

  const sizing = useMemo(
    () => computeJellyfishSizing({ width, height, nGridCols, nGridRows }),
    [width, height, nGridCols, nGridRows],
  );

  const fontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });

  const bodyFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: BODY_FONT_SIZE * sizing.fontScale,
        fontWeight: '500',
      }),
    [fontFamily, sizing.fontScale],
  );

  const headerFont = useMemo(
    () =>
      matchFont({
        fontFamily,
        fontSize: HEADER_FONT_SIZE * sizing.fontScale,
        fontWeight: 'bold',
      }),
    [fontFamily, sizing.fontScale],
  );

  const cellConfigs = useMemo(() => createCellConfigs(table, sizing), [table, sizing]);
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
      scaleMin: sizing.scaleMin,
      scaleMax: sizing.scaleMax,
      edgeSqueeze: sizing.edgeSqueeze,
      spreadBoost: sizing.spreadBoost,
    }),
    [width, height, nGridCols, nGridRows, sizing],
  );

  // ── Layout state ────────────────────────────────────────────────────────

  const biasX = useSharedValue(0);
  const biasY = useSharedValue(0);
  const motionAngle = useSharedValue(0);
  const motionAmp = useSharedValue(0);
  const retainedLabelRotation = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const prevBiasX = useSharedValue(0);
  const prevBiasY = useSharedValue(0);
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

  // ── Motion tilt (drag + coasting fling, decays to zero when idle) ───────

  useFrameCallback(() => {
    'worklet';
    if (isDragging.value) {
      return;
    }

    const biasDx = biasX.value - prevBiasX.value;
    const biasDy = biasY.value - prevBiasY.value;
    prevBiasX.value = biasX.value;
    prevBiasY.value = biasY.value;

    const speed = Math.hypot(biasDx, biasDy);
    if (speed > TILT_STOP_BIAS_VEL) {
      // Bias moves opposite finger drag; negate to match gesture direction.
      motionAngle.value = Math.atan2(-biasDy, -biasDx);
      motionAmp.value = Math.min(TILT_AMP_MAX, speed * TILT_BIAS_VEL_SCALE);
      updateRetainedLabelRotation(
        retainedLabelRotation,
        motionAngle.value,
        motionAmp.value,
      );
    } else {
      motionAmp.value *= TILT_DECAY;
      if (motionAmp.value < 0.0005) {
        motionAmp.value = 0;
      }
    }
  });

  // ── Gesture ─────────────────────────────────────────────────────────────

  const prevTX = useSharedValue(0);
  const prevTY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      isDragging.value = 1;
      prevTX.value = 0;
      prevTY.value = 0;
      prevBiasX.value = biasX.value;
      prevBiasY.value = biasY.value;
    })
    .onUpdate((e) => {
      'worklet';
      const dX = e.translationX - prevTX.value;
      const dY = e.translationY - prevTY.value;
      prevTX.value = e.translationX;
      prevTY.value = e.translationY;
      biasX.value = clampW(biasX.value - dX * BIAS_DRAG_SENS, -1, 1);
      biasY.value = clampW(biasY.value - dY * BIAS_DRAG_SENS, -1, 1);
      updateMotionFromDrag(
        motionAngle,
        motionAmp,
        e.velocityX,
        e.velocityY,
        dX,
        dY,
      );
      updateRetainedLabelRotation(
        retainedLabelRotation,
        motionAngle.value,
        motionAmp.value,
      );
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
      prevBiasX.value = biasX.value;
      prevBiasY.value = biasY.value;
      isDragging.value = 0;
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
            motionAngle={motionAngle}
            motionAmp={motionAmp}
            bellImage={bellImage}
            tentacleImage={tentacleImage}
            clock={clock}
          />
        ))}
      </Canvas>

      <Canvas style={styles.canvas} pointerEvents="none">
        {drawOrder.map(config => (
          <CellLabel
            key={`${config.key}-label`}
            config={config}
            font={config.isHeader ? headerFont : bodyFont}
            layoutX={layoutX}
            layoutY={layoutY}
            layoutScale={layoutScale}
            motionAngle={motionAngle}
            motionAmp={motionAmp}
            retainedLabelRotation={retainedLabelRotation}
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
