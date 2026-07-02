import type { SharedValue } from 'react-native-reanimated';
import { cancelAnimation, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import { BubblePhase } from '../../../koi/useBubbleAnimation';
import { JELLYFISH_TINT_PRESET_INDEX } from '../presets/jellyfishTintPresets';
import {
  BIAS_DRAG_SENS,
  BIAS_FLING_SENS,
  MAX_FLING_MS,
  MIN_FLING_MS,
  PAN_MIN_DISTANCE_PX,
  TAP_MAX_DISTANCE_PX,
} from '../constants';
import type { LayoutBounds, LayoutParticle } from '../layout/computeJellyfishLayout';
import type { JellyfishSoundKind } from '../types';
import {
  clampW,
  findJellyfishIndexAtTap,
  scheduleBiasAutoAnim,
  triggerJellyfishTintFlash,
  tryFocusJellyfish,
  updateMotionFromDrag,
  updateRetainedLabelRotation,
} from '../worklets/jellyfishTableWorklets';

type UseJellyfishTableGesturesParams = {
  biasX: SharedValue<number>;
  biasY: SharedValue<number>;
  appliedBiasX: SharedValue<number>;
  appliedBiasY: SharedValue<number>;
  prevBiasX: SharedValue<number>;
  prevBiasY: SharedValue<number>;
  layoutParticlesSv: SharedValue<LayoutParticle[]>;
  layoutBoundsSv: SharedValue<LayoutBounds>;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  lastLayoutTs: SharedValue<number>;
  isBiasCoasting: SharedValue<number>;
  biasCoastPending: SharedValue<number>;
  isDragging: SharedValue<number>;
  motionAngle: SharedValue<number>;
  motionAmp: SharedValue<number>;
  retainedLabelRotation: SharedValue<number>;
  motionLoopEngaged: SharedValue<number>;
  cellBellSizesSv: SharedValue<number[]>;
  cellGridColsSv: SharedValue<number[]>;
  cellGridRowsSv: SharedValue<number[]>;
  cellLabelsSv: SharedValue<string[]>;
  capturedWordSv: SharedValue<string>;
  effectiveBubblePhase: SharedValue<number>;
  tintFlashPreset: SharedValue<number[]>;
  tintFlashUntil: SharedValue<number[]>;
  clock: SharedValue<number>;
  activateMotionLoop: () => void;
  handleJellyfishSoundJs: (kind: JellyfishSoundKind) => void;
  handleMatchSuccessJs: (jx: number, jy: number, hitIdx: number) => void;
  flashTranslationJs: (hitIdx: number) => void;
};

export function useJellyfishTableGestures({
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
  isDragging,
  motionAngle,
  motionAmp,
  retainedLabelRotation,
  motionLoopEngaged,
  cellBellSizesSv,
  cellGridColsSv,
  cellGridRowsSv,
  cellLabelsSv,
  capturedWordSv,
  effectiveBubblePhase,
  tintFlashPreset,
  tintFlashUntil,
  clock,
  activateMotionLoop,
  handleJellyfishSoundJs,
  handleMatchSuccessJs,
  flashTranslationJs,
}: UseJellyfishTableGesturesParams) {
  const prevTX = useSharedValue(0);
  const prevTY = useSharedValue(0);

  const panGesture = usePanGesture({
    minDistance: PAN_MIN_DISTANCE_PX,
    onBegin: () => {
      'worklet';
      cancelAnimation(biasX);
      cancelAnimation(biasY);
      isBiasCoasting.value = 0;
      biasCoastPending.value = 0;
    },
    onActivate: () => {
      'worklet';
      motionLoopEngaged.value = 1;
      scheduleOnRN(activateMotionLoop);
      isDragging.value = 1;
      prevTX.value = 0;
      prevTY.value = 0;
      prevBiasX.value = biasX.value;
      prevBiasY.value = biasY.value;
    },
    onUpdate: (e) => {
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
    },
    onDeactivate: (e) => {
      'worklet';
      motionLoopEngaged.value = 1;
      scheduleOnRN(activateMotionLoop);
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
    },
  });

  const tapGesture = useTapGesture({
    numberOfTaps: 1,
    maxDuration: 400,
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: (e) => {
      'worklet';
      const bounds = layoutBoundsSv.value;
      const tapX = e.x + bounds.zoneLeft;
      const tapY = e.y + bounds.zoneTop;
      const hitIdx = findJellyfishIndexAtTap(
        tapX,
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
        scheduleOnRN(handleJellyfishSoundJs, isMatch ? 'success' : 'error');
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
          scheduleOnRN(handleMatchSuccessJs, jx, jy, hitIdx);
        }
        return;
      }

      scheduleOnRN(flashTranslationJs, hitIdx);

      triggerJellyfishTintFlash(
        hitIdx,
        JELLYFISH_TINT_PRESET_INDEX.primary,
        tintFlashPreset,
        tintFlashUntil,
        clock,
      );
      scheduleOnRN(handleJellyfishSoundJs, 'primary');
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
    },
  });

  return useExclusiveGestures(tapGesture, panGesture);
}
