import { useCallback, useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  BUBBLE_BURST_DURATION_MS,
  BUBBLE_BURST_SCALE,
  BUBBLE_BURST_WOBBLE,
  BUBBLE_ENTER_DURATION_MS,
  BUBBLE_ENTER_WOBBLE,
  BUBBLE_IDLE_OPACITY,
  BUBBLE_IDLE_WOBBLE,
  BUBBLE_SPAWN_OFFSET_Y,
  BUBBLE_START_DIAMETER_RATIO,
  KOI_FISH_LENGTH,
} from './bubbleAnimPresets';

export const BubblePhase = {
  None: -1,
  Enter: 0,
  Idle: 1,
  Burst: 2,
} as const;

export const BurstIntent = {
  Release: 0,
  Escape: 1,
} as const;

export type BurstIntentValue = (typeof BurstIntent)[keyof typeof BurstIntent];

export type BubbleAnimState = {
  x: number;
  y: number;
  diameter: number;
  centerX: number;
  centerY: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  wobbleLobes: number;
  opacity: number;
  labelOpacity: number;
  captureVisualT: number;
};

export type BubbleAnimationConfig = {
  originX: number;
  originY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetDiameter: number;
};

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function clamp01(t: number): number {
  'worklet';
  return Math.min(1, Math.max(0, t));
}

function computeBubbleAnimState(
  phase: number,
  enterProgress: number,
  burstProgress: number,
  config: BubbleAnimationConfig,
): BubbleAnimState {
  'worklet';
  if (phase === BubblePhase.None) {
    return {
      x: 0,
      y: 0,
      diameter: 0,
      centerX: 0,
      centerY: 0,
      wobbleAmp: BUBBLE_IDLE_WOBBLE.wobbleAmp,
      wobbleSpeed: BUBBLE_IDLE_WOBBLE.wobbleSpeed,
      wobbleLobes: BUBBLE_IDLE_WOBBLE.wobbleLobes,
      opacity: 0,
      labelOpacity: 0,
      captureVisualT: 0,
    };
  }

  const {
    originX,
    originY,
    targetCenterX,
    targetCenterY,
    targetDiameter,
  } = config;

  const startDiameter = targetDiameter * BUBBLE_START_DIAMETER_RATIO;
  const spawnCenterY = originY - KOI_FISH_LENGTH * BUBBLE_SPAWN_OFFSET_Y;
  const spawnLeft = originX - startDiameter * 0.5;
  const spawnTop = spawnCenterY - startDiameter * 0.5;
  const targetLeft = targetCenterX - targetDiameter * 0.5;
  const targetTop = targetCenterY - targetDiameter * 0.5;

  if (phase === BubblePhase.Burst) {
    const t = burstProgress;
    const growT = clamp01(t / 0.5);
    const diameter = targetDiameter * lerp(1, BUBBLE_BURST_SCALE, growT);
    const wobbleT = clamp01(t / 0.5);
    const fadeT = t < 0.6 ? 0 : clamp01((t - 0.6) / 0.4);
    const labelFadeT = t < 0.5 ? 0 : clamp01((t - 0.5) / 0.5);
    const captureVisualT = 1 - clamp01(t / 0.4);

    return {
      x: targetCenterX - diameter * 0.5,
      y: targetCenterY - diameter * 0.5,
      diameter,
      centerX: targetCenterX,
      centerY: targetCenterY,
      wobbleAmp: lerp(BUBBLE_IDLE_WOBBLE.wobbleAmp, BUBBLE_BURST_WOBBLE.wobbleAmp, wobbleT),
      wobbleSpeed: lerp(BUBBLE_IDLE_WOBBLE.wobbleSpeed, BUBBLE_BURST_WOBBLE.wobbleSpeed, wobbleT),
      wobbleLobes: lerp(BUBBLE_IDLE_WOBBLE.wobbleLobes, BUBBLE_BURST_WOBBLE.wobbleLobes, wobbleT),
      opacity: BUBBLE_IDLE_OPACITY * (1 - fadeT),
      labelOpacity: 1 - labelFadeT,
      captureVisualT,
    };
  }

  if (phase === BubblePhase.Idle) {
    return {
      x: targetLeft,
      y: targetTop,
      diameter: targetDiameter,
      centerX: targetCenterX,
      centerY: targetCenterY,
      wobbleAmp: BUBBLE_IDLE_WOBBLE.wobbleAmp,
      wobbleSpeed: BUBBLE_IDLE_WOBBLE.wobbleSpeed,
      wobbleLobes: BUBBLE_IDLE_WOBBLE.wobbleLobes,
      opacity: BUBBLE_IDLE_OPACITY,
      labelOpacity: 1,
      captureVisualT: 1,
    };
  }

  const t = enterProgress;
  const diameter = lerp(startDiameter, targetDiameter, t);
  const fadeInT = clamp01(t / 0.1);
  const labelT = t < 0.7 ? 0 : clamp01((t - 0.7) / 0.3);

  return {
    x: lerp(spawnLeft, targetLeft, t),
    y: lerp(spawnTop, targetTop, t),
    diameter,
    centerX: lerp(spawnLeft, targetLeft, t) + diameter * 0.5,
    centerY: lerp(spawnTop, targetTop, t) + diameter * 0.5,
    wobbleAmp: lerp(BUBBLE_ENTER_WOBBLE.wobbleAmp, BUBBLE_IDLE_WOBBLE.wobbleAmp, t),
    wobbleSpeed: lerp(BUBBLE_ENTER_WOBBLE.wobbleSpeed, BUBBLE_IDLE_WOBBLE.wobbleSpeed, t),
    wobbleLobes: lerp(BUBBLE_ENTER_WOBBLE.wobbleLobes, BUBBLE_IDLE_WOBBLE.wobbleLobes, t),
    opacity: BUBBLE_IDLE_OPACITY * fadeInT,
    labelOpacity: labelT,
    captureVisualT: t,
  };
}

export function isTapInsideBubble(
  tapX: number,
  tapY: number,
  state: BubbleAnimState,
): boolean {
  'worklet';
  const cx = state.x + state.diameter * 0.5;
  const cy = state.y + state.diameter * 0.5;
  const radius = state.diameter * 0.5;
  return Math.hypot(tapX - cx, tapY - cy) <= radius;
}

export type UseBubbleAnimationResult = {
  anim: SharedValue<BubbleAnimState>;
  phase: SharedValue<number>;
  enterProgress: SharedValue<number>;
  startBurst: (intent?: BurstIntentValue) => void;
};

export function useBubbleAnimation(
  config: BubbleAnimationConfig,
  onDismiss: (intent: BurstIntentValue) => void,
  enabled = true,
  onBurstCompleteWorklet?: () => void,
): UseBubbleAnimationResult {
  const enterProgress = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const burstIntent = useSharedValue<BurstIntentValue>(BurstIntent.Release);
  const phase = useSharedValue<number>(enabled ? BubblePhase.Enter : BubblePhase.None);

  const anim = useDerivedValue((): BubbleAnimState =>
    computeBubbleAnimState(
      phase.value,
      enterProgress.value,
      burstProgress.value,
      config,
    ),
  );

  useEffect(() => {
    cancelAnimation(enterProgress);
    cancelAnimation(burstProgress);

    if (!enabled) {
      enterProgress.value = 0;
      burstProgress.value = 0;
      phase.value = BubblePhase.None;
      return;
    }

    enterProgress.value = 0;
    burstProgress.value = 0;
    phase.value = BubblePhase.Enter;

    enterProgress.value = withTiming(
      1,
      { duration: BUBBLE_ENTER_DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          phase.value = BubblePhase.Idle;
        }
      },
    );

    return () => {
      cancelAnimation(enterProgress);
      cancelAnimation(burstProgress);
    };
  }, [
    enabled,
    config.originX,
    config.originY,
    config.targetCenterX,
    config.targetCenterY,
    config.targetDiameter,
    enterProgress,
    burstProgress,
    phase,
  ]);

  const startBurst = useCallback(
    (intent: BurstIntentValue = BurstIntent.Release) => {
      if (phase.value !== BubblePhase.Idle) {
        return;
      }
      burstIntent.value = intent;
      phase.value = BubblePhase.Burst;
      burstProgress.value = 0;
      burstProgress.value = withTiming(
        1,
        { duration: BUBBLE_BURST_DURATION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) {
            const completedIntent = burstIntent.value;
            if (completedIntent === BurstIntent.Release) {
              onBurstCompleteWorklet?.();
            }
            runOnJS(onDismiss)(completedIntent);
          }
        },
      );
    },
    [burstIntent, burstProgress, onBurstCompleteWorklet, onDismiss, phase],
  );

  return { anim, phase, enterProgress, startBurst };
}
