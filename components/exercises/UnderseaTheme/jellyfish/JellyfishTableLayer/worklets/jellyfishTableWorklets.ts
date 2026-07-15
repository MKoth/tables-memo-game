import type { SharedValue } from 'react-native-reanimated';
import { cancelAnimation, Easing, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  FOCUS_ANIM_BIAS_SCALE,
  FOCUS_ANIM_MAX_MS,
  FOCUS_ANIM_MIN_MS,
  LABEL_ROTATION_MAX_RAD,
  TAP_HIT_RADIUS_PAD,
  TILT_AMP_MAX,
  TILT_DECAY,
  TILT_DRAG_SCALE,
  TINT_FLASH_MS,
  TILT_VEL_SCALE,
} from '../config/jellyfishTableLayerConfig';
import {
  biasForGridSlot,
  clampW,
  computeLayoutPositions,
  type LayoutBounds,
  type LayoutParticle,
} from '../layout/computeJellyfishLayout';

export { clampW } from '../layout/computeJellyfishLayout';

export function updateRetainedLabelRotation(
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

export function flushAppliedBiasLayout(
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
export function completeBiasAutoAnim(
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

export function scheduleBiasAutoAnim(
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

export function tryFocusJellyfish(
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
  scheduleOnRN(activateMotionLoop);
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

/** Pan/zoom the table toward one cell — same motion as tapping that jellyfish. */
export function focusJellyfishCell(
  hitIdx: number,
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
}

export function decayMotionTilt(
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

export function findJellyfishIndexAtTap(
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

export function triggerJellyfishTintFlash(
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

export function updateMotionFromDrag(
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
