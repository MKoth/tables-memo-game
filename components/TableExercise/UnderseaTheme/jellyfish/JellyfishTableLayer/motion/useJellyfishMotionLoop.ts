import { useCallback, useRef } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  BIAS_SETTLE_EPS,
  LAYOUT_MIN_INTERVAL_MS,
  TILT_AMP_MAX,
  TILT_BIAS_VEL_SCALE,
  TILT_STOP_BIAS_VEL,
} from '../config/jellyfishTableLayerConfig';
import {
  computeLayoutPositions,
  type LayoutBounds,
  type LayoutParticle,
} from '../layout/computeJellyfishLayout';
import {
  decayMotionTilt,
  updateRetainedLabelRotation,
} from '../worklets/jellyfishTableWorklets';

type UseJellyfishMotionLoopParams = {
  biasX: SharedValue<number>;
  biasY: SharedValue<number>;
  appliedBiasX: SharedValue<number>;
  appliedBiasY: SharedValue<number>;
  prevBiasX: SharedValue<number>;
  prevBiasY: SharedValue<number>;
  lastLayoutTs: SharedValue<number>;
  layoutParticlesSv: SharedValue<LayoutParticle[]>;
  layoutBoundsSv: SharedValue<LayoutBounds>;
  layoutX: SharedValue<number[]>;
  layoutY: SharedValue<number[]>;
  layoutScale: SharedValue<number[]>;
  isDragging: SharedValue<number>;
  isBiasCoasting: SharedValue<number>;
  motionAngle: SharedValue<number>;
  motionAmp: SharedValue<number>;
  retainedLabelRotation: SharedValue<number>;
};

export function useJellyfishMotionLoop({
  biasX,
  biasY,
  appliedBiasX,
  appliedBiasY,
  prevBiasX,
  prevBiasY,
  lastLayoutTs,
  layoutParticlesSv,
  layoutBoundsSv,
  layoutX,
  layoutY,
  layoutScale,
  isDragging,
  isBiasCoasting,
  motionAngle,
  motionAmp,
  retainedLabelRotation,
}: UseJellyfishMotionLoopParams) {
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
        scheduleOnRN(deactivateMotionLoop);
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

  return {
    motionLoopEngaged,
    activateMotionLoop,
    deactivateMotionLoop,
  };
}
