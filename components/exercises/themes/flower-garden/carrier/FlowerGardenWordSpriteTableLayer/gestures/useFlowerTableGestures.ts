import type { SharedValue } from 'react-native-reanimated';
import { cancelAnimation, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import {
  BIAS_DRAG_SENS,
  BIAS_FLING_SENS,
  MAX_FLING_MS,
  MIN_FLING_MS,
  PAN_MIN_DISTANCE_PX,
  TAP_MAX_DISTANCE_PX,
} from '../config/flowerTableLayerConfig';
import type { LayoutBounds, LayoutParticle } from '../../../../undersea/carrier/WordSpriteTableLayer/layout/computeWordSpriteLayout';
import {
  clampW,
  findWordSpriteIndexAtTap,
  focusWordSpriteCell,
  scheduleBiasAutoAnim,
  updateMotionFromDrag,
} from '../../../../undersea/carrier/WordSpriteTableLayer/worklets/wordSpriteTableWorklets';

type UseFlowerTableGesturesParams = {
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
  motionLoopEngaged: SharedValue<number>;
  cellBellSizesSv: SharedValue<number[]>;
  cellGridColsSv: SharedValue<number[]>;
  cellGridRowsSv: SharedValue<number[]>;
  activateMotionLoop: () => void;
};

export function useFlowerTableGestures({
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
  motionLoopEngaged,
  cellBellSizesSv,
  cellGridColsSv,
  cellGridRowsSv,
  activateMotionLoop,
}: UseFlowerTableGesturesParams) {
  const prevTX = useSharedValue(0);
  const prevTY = useSharedValue(0);
  const retainedLabelRotation = useSharedValue(0);

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
      updateMotionFromDrag(motionAngle, motionAmp, e.velocityX, e.velocityY, dX, dY);
    },
    onDeactivate: (e) => {
      'worklet';
      motionLoopEngaged.value = 1;
      scheduleOnRN(activateMotionLoop);
      isDragging.value = 0;

      const flingMsX = clampW(Math.abs(e.velocityX) * 0.35, MIN_FLING_MS, MAX_FLING_MS);
      const flingMsY = clampW(Math.abs(e.velocityY) * 0.35, MIN_FLING_MS, MAX_FLING_MS);
      const targetX = clampW(biasX.value - e.velocityX * BIAS_FLING_SENS, -1, 1);
      const targetY = clampW(biasY.value - e.velocityY * BIAS_FLING_SENS, -1, 1);
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
      const hitIdx = findWordSpriteIndexAtTap(
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

      focusWordSpriteCell(
        hitIdx,
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
