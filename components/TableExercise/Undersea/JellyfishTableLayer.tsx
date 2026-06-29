/**
 * JellyfishTableLayer
 *
 * Renders a TableData as an interactive jellyfish grid packed inside the screen.
 * Jellyfish never leave the viewport; grid order is always preserved (leftmost
 * stays leftmost, etc.). Spacing is widest near the center (or gesture-biased
 * side) and compresses toward the edges. Swipe gestures shift the spacing bias.
 * Each jellyfish carries a text label centered on its bell (labels may overlap).
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  cancelAnimation,
  Easing,
  runOnJS,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { JellyfishInstance, type JellyfishDynamicOverrides } from './JellyfishInstance';
import { BubblePhase } from './useBubbleAnimation';
import {
  JELLYFISH_DEFAULT_WOBBLE,
  JELLYFISH_FLASH_TINT_WAVE_SPEED,
  JELLYFISH_FLASH_WOBBLE,
  JELLYFISH_LABEL_COLORS_BY_INDEX,
  JELLYFISH_TINT_PRESET_INDEX,
  JELLYFISH_TINT_PRESETS_BY_INDEX,
} from './jellyfishTintPresets';
import type { TableData } from '../../../data/tableData';
import { useUnderseaClockQuantized } from './UnderseaClockContext';
import {
  biasForGridSlot,
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

/** Tap-to-focus: bias travel → animation duration. */
const FOCUS_ANIM_MIN_MS = 400;
const FOCUS_ANIM_MAX_MS = 900;
const FOCUS_ANIM_BIAS_SCALE = 900;
/** Hit radius multiplier beyond bell edge (includes label area). */
const TAP_HIT_RADIUS_PAD = 1.55;
/** Pan activates after this movement (px); below it a release is a click. */
const PAN_MIN_DISTANCE_PX = 10;
/** Tap may move up to this (px); must stay below pan activation distance. */
const TAP_MAX_DISTANCE_PX = 10;
/** Click flash: preset tint duration before reverting to spawn colors. */
const TINT_FLASH_MS = 800;

/**
 * Coalesce bias-driven layout recomputes to ~60fps. Pointer events on
 * ProMotion can fire up to 120Hz; without this cap the full layout would be
 * recomputed and both layers repainted on every event during a drag.
 */
const LAYOUT_MIN_INTERVAL_MS = 1000 / 60;

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
/** Applied vs live bias within this → layout considered settled. */
const BIAS_SETTLE_EPS = 1e-4;
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

function flushAppliedBiasLayout(
  biasX: SharedValue<number>,
  biasY: SharedValue<number>,
  appliedBiasX: SharedValue<number>,
  appliedBiasY: SharedValue<number>,
  prevBiasX: SharedValue<number>,
  prevBiasY: SharedValue<number>,
  layoutParticlesSv: SharedValue<LayoutParticle[]>,
  layoutBoundsSv: SharedValue<LayoutBounds>,
  layoutX: SharedValue<number[]>,
  layoutY: SharedValue<number[]>,
  layoutScale: SharedValue<number[]>,
  lastLayoutTs: SharedValue<number>,
): void {
  'worklet';
  const bx = biasX.value;
  const by = biasY.value;
  appliedBiasX.value = bx;
  appliedBiasY.value = by;
  prevBiasX.value = bx;
  prevBiasY.value = by;
  lastLayoutTs.value = -1;
  const layout = computeLayoutPositions(
    layoutParticlesSv.value,
    layoutBoundsSv.value,
    bx,
    by,
  );
  layoutX.value = layout.xs;
  layoutY.value = layout.ys;
  layoutScale.value = layout.scales;
}

/** Bias auto-anim finished: flush layout, hand off to gradual tilt settling. */
function completeBiasAutoAnim(
  biasX: SharedValue<number>,
  biasY: SharedValue<number>,
  appliedBiasX: SharedValue<number>,
  appliedBiasY: SharedValue<number>,
  prevBiasX: SharedValue<number>,
  prevBiasY: SharedValue<number>,
  layoutParticlesSv: SharedValue<LayoutParticle[]>,
  layoutBoundsSv: SharedValue<LayoutBounds>,
  layoutX: SharedValue<number[]>,
  layoutY: SharedValue<number[]>,
  layoutScale: SharedValue<number[]>,
  lastLayoutTs: SharedValue<number>,
  isBiasCoasting: SharedValue<number>,
  biasCoastPending: SharedValue<number>,
): void {
  'worklet';
  if (!isBiasCoasting.value) {
    return;
  }
  flushAppliedBiasLayout(
    biasX,
    biasY,
    appliedBiasX,
    appliedBiasY,
    prevBiasX,
    prevBiasY,
    layoutParticlesSv,
    layoutBoundsSv,
    layoutX,
    layoutY,
    layoutScale,
    lastLayoutTs,
  );
  isBiasCoasting.value = 0;
  biasCoastPending.value = 0;
}

function scheduleBiasAutoAnim(
  targetX: number,
  targetY: number,
  durationX: number,
  durationY: number,
  biasX: SharedValue<number>,
  biasY: SharedValue<number>,
  appliedBiasX: SharedValue<number>,
  appliedBiasY: SharedValue<number>,
  prevBiasX: SharedValue<number>,
  prevBiasY: SharedValue<number>,
  layoutParticlesSv: SharedValue<LayoutParticle[]>,
  layoutBoundsSv: SharedValue<LayoutBounds>,
  layoutX: SharedValue<number[]>,
  layoutY: SharedValue<number[]>,
  layoutScale: SharedValue<number[]>,
  lastLayoutTs: SharedValue<number>,
  isBiasCoasting: SharedValue<number>,
  biasCoastPending: SharedValue<number>,
): void {
  'worklet';
  cancelAnimation(biasX);
  cancelAnimation(biasY);
  isBiasCoasting.value = 1;
  biasCoastPending.value = 2;
  const onAxisDone = (finished?: boolean) => {
    'worklet';
    if (finished === false) {
      return;
    }
    biasCoastPending.value -= 1;
    if (biasCoastPending.value <= 0) {
      completeBiasAutoAnim(
        biasX,
        biasY,
        appliedBiasX,
        appliedBiasY,
        prevBiasX,
        prevBiasY,
        layoutParticlesSv,
        layoutBoundsSv,
        layoutX,
        layoutY,
        layoutScale,
        lastLayoutTs,
        isBiasCoasting,
        biasCoastPending,
      );
    }
  };
  biasX.value = withTiming(
    targetX,
    { duration: durationX, easing: Easing.out(Easing.cubic) },
    onAxisDone,
  );
  biasY.value = withTiming(
    targetY,
    { duration: durationY, easing: Easing.out(Easing.cubic) },
    onAxisDone,
  );
  prevBiasX.value = biasX.value;
  prevBiasY.value = biasY.value;
}

function tryFocusJellyfish(
  hitIdx: number,
  revertBiasX: number,
  revertBiasY: number,
  shouldRevertBias: boolean,
  cellGridColsSv: SharedValue<number[]>,
  cellGridRowsSv: SharedValue<number[]>,
  biasX: SharedValue<number>,
  biasY: SharedValue<number>,
  appliedBiasX: SharedValue<number>,
  appliedBiasY: SharedValue<number>,
  prevBiasX: SharedValue<number>,
  prevBiasY: SharedValue<number>,
  layoutParticlesSv: SharedValue<LayoutParticle[]>,
  layoutBoundsSv: SharedValue<LayoutBounds>,
  layoutX: SharedValue<number[]>,
  layoutY: SharedValue<number[]>,
  layoutScale: SharedValue<number[]>,
  lastLayoutTs: SharedValue<number>,
  isBiasCoasting: SharedValue<number>,
  biasCoastPending: SharedValue<number>,
  motionAngle: SharedValue<number>,
  motionAmp: SharedValue<number>,
  retainedLabelRotation: SharedValue<number>,
  motionLoopEngaged: SharedValue<number>,
  activateMotionLoop: () => void,
): void {
  'worklet';
  const bounds = layoutBoundsSv.value;
  const targetX = biasForGridSlot(
    cellGridColsSv.value[hitIdx] ?? 0,
    bounds.nGridCols,
  );
  const targetY = biasForGridSlot(
    cellGridRowsSv.value[hitIdx] ?? 0,
    bounds.nGridRows,
  );

  if (shouldRevertBias) {
    biasX.value = revertBiasX;
    biasY.value = revertBiasY;
  }

  const dx = targetX - biasX.value;
  const dy = targetY - biasY.value;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.01) {
    return;
  }

  motionLoopEngaged.value = 1;
  runOnJS(activateMotionLoop)();
  motionAngle.value = Math.atan2(-dy, -dx);
  motionAmp.value = TILT_AMP_MAX * 0.6;
  updateRetainedLabelRotation(
    retainedLabelRotation,
    motionAngle.value,
    motionAmp.value,
  );
  const duration = clampW(
    dist * FOCUS_ANIM_BIAS_SCALE,
    FOCUS_ANIM_MIN_MS,
    FOCUS_ANIM_MAX_MS,
  );
  scheduleBiasAutoAnim(
    targetX,
    targetY,
    duration,
    duration,
    biasX,
    biasY,
    appliedBiasX,
    appliedBiasY,
    prevBiasX,
    prevBiasY,
    layoutParticlesSv,
    layoutBoundsSv,
    layoutX,
    layoutY,
    layoutScale,
    lastLayoutTs,
    isBiasCoasting,
    biasCoastPending,
  );
}

function decayMotionTilt(
  motionAmp: SharedValue<number>,
  retainedLabelRotation: SharedValue<number>,
): void {
  'worklet';
  motionAmp.value *= TILT_DECAY;
  retainedLabelRotation.value *= TILT_DECAY;
  if (motionAmp.value < 0.0005) {
    motionAmp.value = 0;
    retainedLabelRotation.value = 0;
  }
}

function findJellyfishIndexAtTap(
  tapX: number,
  tapY: number,
  bellSizes: number[],
  xs: number[],
  ys: number[],
  scales: number[],
): number {
  'worklet';
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < bellSizes.length; i++) {
    const cx = xs[i] ?? 0;
    const cy = ys[i] ?? 0;
    const scale = scales[i] ?? 1;
    const radius = (bellSizes[i] * scale * TAP_HIT_RADIUS_PAD) / 2;
    const dist = Math.hypot(tapX - cx, tapY - cy);
    if (dist <= radius && dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function triggerJellyfishTintFlash(
  idx: number,
  preset: number,
  tintFlashPreset: SharedValue<number[]>,
  tintFlashUntil: SharedValue<number[]>,
  clock: SharedValue<number>,
): void {
  'worklet';
  const presets = [...tintFlashPreset.value];
  const until = [...tintFlashUntil.value];
  presets[idx] = preset;
  until[idx] = clock.value + TINT_FLASH_MS;
  tintFlashPreset.value = presets;
  tintFlashUntil.value = until;
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
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
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
  tintFlashPreset,
  tintFlashUntil,
  bellImage,
  tentacleImage,
  clock,
}: CellJellyfishProps) {
  const idx = config.index;

  const dynamicOverrides = useDerivedValue((): JellyfishDynamicOverrides => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    const isFlashing = clock.value < until && presetIdx >= 0;
    const wobble = isFlashing ? JELLYFISH_FLASH_WOBBLE : JELLYFISH_DEFAULT_WOBBLE;
    const tentacleWobbleAmp = wobble.wobbleAmp * 1.25;

    if (isFlashing) {
      const preset = JELLYFISH_TINT_PRESETS_BY_INDEX[presetIdx];
      if (preset) {
        return {
          tintMode: preset.tintMode,
          tintStrength: preset.tintStrength,
          tintA: [preset.tintA[0], preset.tintA[1], preset.tintA[2]],
          tintB: [preset.tintB[0], preset.tintB[1], preset.tintB[2]],
          tintC: [preset.tintC[0], preset.tintC[1], preset.tintC[2]],
          animatedTint: preset.animatedTint,
          tintWaveSpeed: JELLYFISH_FLASH_TINT_WAVE_SPEED,
          bellWobbleAmp: wobble.wobbleAmp,
          tentacleWobbleAmp,
          wobbleSpeed: wobble.wobbleSpeed,
          wobbleLobes: wobble.wobbleLobes,
        };
      }
    }

    return {
      tintMode: config.tintMode,
      tintStrength: config.tintStrength,
      tintA: [config.tintA[0], config.tintA[1], config.tintA[2]],
      tintB: [config.tintB[0], config.tintB[1], config.tintB[2]],
      tintC: [config.tintC[0], config.tintC[1], config.tintC[2]],
      animatedTint: config.animatedTint,
      tintWaveSpeed: config.tintWaveSpeed,
      bellWobbleAmp: wobble.wobbleAmp,
      tentacleWobbleAmp,
      wobbleSpeed: wobble.wobbleSpeed,
      wobbleLobes: wobble.wobbleLobes,
    };
  });

  return (
    <JellyfishInstance
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      layoutX={layoutX}
      layoutY={layoutY}
      layoutScale={layoutScale}
      layoutIndex={config.index}
      bellSize={config.bellSize}
      phase={config.phase}
      pulseSpeed={config.pulseSpeed}
      tintMode={config.tintMode}
      tintStrength={config.tintStrength}
      tintA={config.tintA}
      tintB={config.tintB}
      tintC={config.tintC}
      animatedTint={config.animatedTint}
      tintWaveSpeed={config.tintWaveSpeed}
      dynamicOverrides={dynamicOverrides}
      tiltAngle={motionAngle}
      tiltAmp={motionAmp}
      clock={clock}
    />
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
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
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
  tintFlashPreset,
  tintFlashUntil,
  clock,
}: CellLabelProps) {
  const idx = config.index;
  const defaultFillColor = config.labelFillColor;
  const defaultStrokeColor = config.labelStrokeColor;

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
    const cx = layoutX.value[idx] ?? 0;
    const cy = layoutY.value[idx] ?? 0;
    const scale = layoutScale.value[idx] ?? 1;
    const amp = motionAmp.value;
    let tiltX = 0;
    let tiltY = 0;
    if (amp !== 0) {
      const px = amp * config.bellSize * scale * LABEL_TILT_PX;
      tiltX = Math.cos(motionAngle.value) * px;
      tiltY = Math.sin(motionAngle.value) * px;
    }
    const pivotX = cx + tiltX;
    const pivotY = cy + tiltY;
    // Glyphs are in local space centered at (0,0); translate to pivot then scale/rotate.
    return [
      { translateX: pivotX },
      { translateY: pivotY },
      { scale },
      { rotate: retainedLabelRotation.value },
    ];
  });

  const labelFillColor = useDerivedValue(() => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    if (clock.value < until && presetIdx >= 0) {
      return JELLYFISH_LABEL_COLORS_BY_INDEX[presetIdx]?.labelFillColor ?? defaultFillColor;
    }
    return defaultFillColor;
  });

  const labelStrokeColor = useDerivedValue(() => {
    const until = tintFlashUntil.value[idx] ?? 0;
    const presetIdx = tintFlashPreset.value[idx] ?? -1;
    if (clock.value < until && presetIdx >= 0) {
      return JELLYFISH_LABEL_COLORS_BY_INDEX[presetIdx]?.labelStrokeColor ?? defaultStrokeColor;
    }
    return defaultStrokeColor;
  });

  return (
    <Group transform={labelTransform}>
      <Group
        style="stroke"
        strokeWidth={LABEL_STROKE_WIDTH}
        strokeJoin="round"
        strokeCap="round"
        color={labelStrokeColor}
      >
        <Glyphs font={font} glyphs={staticGlyphs} />
      </Group>
      <Glyphs font={font} glyphs={staticGlyphs} color={labelFillColor} />
    </Group>
  );
}

// ── JellyfishTableLayer ───────────────────────────────────────────────────

export type JellyfishTableLayerProps = {
  table: TableData;
  capturedWord?: string | null;
  bubblePhase?: SharedValue<number>;
  onMatchSuccess?: (targetX: number, targetY: number, hitIdx: number) => void;
};

/**
 * Thin loader shell: waits for images before mounting the stateful inner layer,
 * keeping hook call order unconditional inside each component.
 */
export function JellyfishTableLayer({
  table,
  capturedWord = null,
  bubblePhase,
  onMatchSuccess,
}: JellyfishTableLayerProps) {
  const bellImage = useImage(JELLYFISH_BELL);
  const tentacleImage = useImage(JELLYFISH_TENTACLES);
  if (!bellImage || !tentacleImage) { return null; }
  return (
    <JellyfishTableLayerInner
      table={table}
      bellImage={bellImage}
      tentacleImage={tentacleImage}
      capturedWord={capturedWord}
      bubblePhase={bubblePhase}
      onMatchSuccess={onMatchSuccess}
    />
  );
}

type InnerProps = {
  table: TableData;
  bellImage: NonNullable<ReturnType<typeof useImage>>;
  tentacleImage: NonNullable<ReturnType<typeof useImage>>;
  capturedWord: string | null;
  bubblePhase?: SharedValue<number>;
  onMatchSuccess?: (targetX: number, targetY: number, hitIdx: number) => void;
};

const JELLYFISH_CLOCK_FPS = 15;

function JellyfishTableLayerInner({
  table,
  bellImage,
  tentacleImage,
  capturedWord,
  bubblePhase,
  onMatchSuccess,
}: InnerProps) {
  const { width, height } = useWindowDimensions();
  const clock = useUnderseaClockQuantized(JELLYFISH_CLOCK_FPS);

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
  const cellLabelsSv = useSharedValue<string[]>([]);
  const capturedWordSv = useSharedValue('');
  const fallbackBubblePhase = useSharedValue(BubblePhase.None);
  const effectiveBubblePhase = bubblePhase ?? fallbackBubblePhase;
  const onMatchSuccessRef = useRef(onMatchSuccess);

  useEffect(() => {
    onMatchSuccessRef.current = onMatchSuccess;
  }, [onMatchSuccess]);

  useEffect(() => {
    cellLabelsSv.value = cellConfigs.map(c => c.label);
  }, [cellConfigs, cellLabelsSv]);

  useEffect(() => {
    capturedWordSv.value = capturedWord ?? '';
  }, [capturedWord, capturedWordSv]);

  const handleMatchSuccessJs = useCallback(
    (targetX: number, targetY: number, hitIdx: number) => {
      onMatchSuccessRef.current?.(targetX, targetY, hitIdx);
    },
    [],
  );

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
  /** -1 = spawn tint; 0/1/2 = primary/error/success preset while flashing. */
  const tintFlashPreset = useSharedValue<number[]>([]);
  const tintFlashUntil = useSharedValue<number[]>([]);

  // Mirror layout inputs into shared values so the frame callback always reads
  // the latest grid/bounds without relying on closure capture.
  const layoutBoundsSv = useSharedValue<LayoutBounds>(layoutBounds);
  const layoutParticlesSv = useSharedValue<LayoutParticle[]>(layoutParticles);
  const cellBellSizesSv = useSharedValue<number[]>([]);
  const cellGridColsSv = useSharedValue<number[]>([]);
  const cellGridRowsSv = useSharedValue<number[]>([]);
  const appliedBiasX = useSharedValue(Number.NaN);
  const appliedBiasY = useSharedValue(Number.NaN);
  const lastLayoutTs = useSharedValue(-1);
  const biasCoastPending = useSharedValue(0);
  const isBiasCoasting = useSharedValue(0);

  useEffect(() => {
    layoutBoundsSv.value = layoutBounds;
    layoutParticlesSv.value = layoutParticles;
    cellBellSizesSv.value = cellConfigs.map(c => c.bellSize);
    cellGridColsSv.value = cellConfigs.map(c => c.gridCol);
    cellGridRowsSv.value = cellConfigs.map(c => c.gridRow);
    const layout = computeLayoutPositions(layoutParticles, layoutBounds, 0, 0);
    layoutX.value = layout.xs;
    layoutY.value = layout.ys;
    layoutScale.value = layout.scales;
    tintFlashPreset.value = cellConfigs.map(() => -1);
    tintFlashUntil.value = cellConfigs.map(() => 0);
    appliedBiasX.value = 0;
    appliedBiasY.value = 0;
    prevBiasX.value = 0;
    prevBiasY.value = 0;
    lastLayoutTs.value = -1;
  }, [
    layoutBounds,
    layoutParticles,
    cellConfigs,
    layoutBoundsSv,
    layoutParticlesSv,
    cellBellSizesSv,
    cellGridColsSv,
    cellGridRowsSv,
    layoutX,
    layoutY,
    layoutScale,
    tintFlashPreset,
    tintFlashUntil,
    appliedBiasX,
    appliedBiasY,
    prevBiasX,
    prevBiasY,
    lastLayoutTs,
  ]);

  const motionFrameLoopRef = useRef<ReturnType<typeof useFrameCallback> | null>(null);
  const motionLoopEngaged = useSharedValue(0);

  const activateMotionLoop = useCallback(() => {
    motionFrameLoopRef.current?.setActive(true);
  }, []);

  const deactivateMotionLoop = useCallback(() => {
    motionFrameLoopRef.current?.setActive(false);
  }, []);

  const onMotionFrame = useCallback(
    (info: { timestamp: number }) => {
      'worklet';
      const bx = biasX.value;
      const by = biasY.value;

      if (bx !== appliedBiasX.value || by !== appliedBiasY.value) {
        if (
          lastLayoutTs.value === -1 ||
          info.timestamp - lastLayoutTs.value >= LAYOUT_MIN_INTERVAL_MS
        ) {
          lastLayoutTs.value = info.timestamp;
          appliedBiasX.value = bx;
          appliedBiasY.value = by;
          const layout = computeLayoutPositions(
            layoutParticlesSv.value,
            layoutBoundsSv.value,
            bx,
            by,
          );
          layoutX.value = layout.xs;
          layoutY.value = layout.ys;
          layoutScale.value = layout.scales;
        }
      }

      if (!isDragging.value) {
        if (isBiasCoasting.value) {
          const biasDx = biasX.value - prevBiasX.value;
          const biasDy = biasY.value - prevBiasY.value;
          prevBiasX.value = biasX.value;
          prevBiasY.value = biasY.value;

          const speed = Math.hypot(biasDx, biasDy);
          if (speed > TILT_STOP_BIAS_VEL) {
            motionAngle.value = Math.atan2(-biasDy, -biasDx);
            motionAmp.value = Math.min(TILT_AMP_MAX, speed * TILT_BIAS_VEL_SCALE);
            updateRetainedLabelRotation(
              retainedLabelRotation,
              motionAngle.value,
              motionAmp.value,
            );
          } else {
            decayMotionTilt(motionAmp, retainedLabelRotation);
          }
        } else {
          decayMotionTilt(motionAmp, retainedLabelRotation);
        }
      }

      const layoutSettled =
        Math.abs(bx - appliedBiasX.value) < BIAS_SETTLE_EPS &&
        Math.abs(by - appliedBiasY.value) < BIAS_SETTLE_EPS;
      if (
        !isDragging.value &&
        !isBiasCoasting.value &&
        layoutSettled &&
        motionAmp.value < 0.0005 &&
        motionLoopEngaged.value
      ) {
        motionLoopEngaged.value = 0;
        runOnJS(deactivateMotionLoop)();
      }
    },
    [
      biasX,
      biasY,
      appliedBiasX,
      appliedBiasY,
      lastLayoutTs,
      layoutParticlesSv,
      layoutBoundsSv,
      layoutX,
      layoutY,
      layoutScale,
      isDragging,
      prevBiasX,
      prevBiasY,
      motionAngle,
      motionAmp,
      retainedLabelRotation,
      motionLoopEngaged,
      isBiasCoasting,
      deactivateMotionLoop,
    ],
  );

  const motionFrameLoop = useFrameCallback(onMotionFrame, false);
  motionFrameLoopRef.current = motionFrameLoop;

  // ── Gesture ─────────────────────────────────────────────────────────────

  const prevTX = useSharedValue(0);
  const prevTY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minDistance(PAN_MIN_DISTANCE_PX)
    .onBegin(() => {
      'worklet';
      cancelAnimation(biasX);
      cancelAnimation(biasY);
      isBiasCoasting.value = 0;
      biasCoastPending.value = 0;
    })
    .onStart(() => {
      'worklet';
      motionLoopEngaged.value = 1;
      runOnJS(activateMotionLoop)();
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
      motionLoopEngaged.value = 1;
      runOnJS(activateMotionLoop)();
      isDragging.value = 0;

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
      const needsCoastX = Math.abs(targetX - biasX.value) > 1e-5;
      const needsCoastY = Math.abs(targetY - biasY.value) > 1e-5;
      if (!needsCoastX && !needsCoastY) {
        return;
      }

      scheduleBiasAutoAnim(
        targetX,
        targetY,
        flingMsX,
        flingMsY,
        biasX,
        biasY,
        appliedBiasX,
        appliedBiasY,
        prevBiasX,
        prevBiasY,
        layoutParticlesSv,
        layoutBoundsSv,
        layoutX,
        layoutY,
        layoutScale,
        lastLayoutTs,
        isBiasCoasting,
        biasCoastPending,
      );
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(400)
    .maxDistance(TAP_MAX_DISTANCE_PX)
    .onEnd((e) => {
      'worklet';
      const bounds = layoutBoundsSv.value;
      const tapY = e.y + bounds.zoneTop;
      const hitIdx = findJellyfishIndexAtTap(
        e.x,
        tapY,
        cellBellSizesSv.value,
        layoutX.value,
        layoutY.value,
        layoutScale.value,
      );
      if (hitIdx < 0) {
        return;
      }

      const captured = capturedWordSv.value;
      const hasCaptured = captured.length > 0;

      if (hasCaptured) {
        if (effectiveBubblePhase.value !== BubblePhase.Idle) {
          return;
        }
        const label = cellLabelsSv.value[hitIdx] ?? '';
        const isMatch = label === captured;
        triggerJellyfishTintFlash(
          hitIdx,
          isMatch
            ? JELLYFISH_TINT_PRESET_INDEX.success
            : JELLYFISH_TINT_PRESET_INDEX.error,
          tintFlashPreset,
          tintFlashUntil,
          clock,
        );
        tryFocusJellyfish(
          hitIdx,
          0,
          0,
          false,
          cellGridColsSv,
          cellGridRowsSv,
          biasX,
          biasY,
          appliedBiasX,
          appliedBiasY,
          prevBiasX,
          prevBiasY,
          layoutParticlesSv,
          layoutBoundsSv,
          layoutX,
          layoutY,
          layoutScale,
          lastLayoutTs,
          isBiasCoasting,
          biasCoastPending,
          motionAngle,
          motionAmp,
          retainedLabelRotation,
          motionLoopEngaged,
          activateMotionLoop,
        );
        if (isMatch) {
          const jx = layoutX.value[hitIdx] ?? 0;
          const jy = layoutY.value[hitIdx] ?? 0;
          runOnJS(handleMatchSuccessJs)(jx, jy, hitIdx);
        }
        return;
      }

      triggerJellyfishTintFlash(
        hitIdx,
        JELLYFISH_TINT_PRESET_INDEX.primary,
        tintFlashPreset,
        tintFlashUntil,
        clock,
      );
      tryFocusJellyfish(
        hitIdx,
        0,
        0,
        false,
        cellGridColsSv,
        cellGridRowsSv,
        biasX,
        biasY,
        appliedBiasX,
        appliedBiasY,
        prevBiasX,
        prevBiasY,
        layoutParticlesSv,
        layoutBoundsSv,
        layoutX,
        layoutY,
        layoutScale,
        lastLayoutTs,
        isBiasCoasting,
        biasCoastPending,
        motionAngle,
        motionAmp,
        retainedLabelRotation,
        motionLoopEngaged,
        activateMotionLoop,
      );
    });

  const tableGesture = Gesture.Exclusive(tapGesture, panGesture);

  const zoneTop = height * LAYOUT_ZONE_TOP_RATIO;
  const zoneHeight = height * LAYOUT_ZONE_HEIGHT_RATIO;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Single canvas: all jellyfish first, then every label on top. One
          surface = one re-record/repaint per bias change instead of two. */}
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
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
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
            motionAngle={motionAngle}
            motionAmp={motionAmp}
            retainedLabelRotation={retainedLabelRotation}
            tintFlashPreset={tintFlashPreset}
            tintFlashUntil={tintFlashUntil}
            clock={clock}
          />
        ))}
      </Canvas>

      <GestureDetector gesture={tableGesture}>
        <View style={[styles.gestureCapture, { top: zoneTop, height: zoneHeight }]} />
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
