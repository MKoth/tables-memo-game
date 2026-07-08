import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Glyphs,
  Group,
  type SkFont,
  type SkImage,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { SharedValue } from 'react-native-reanimated';
import { BubbleInstance } from '../../koi/bubbles/BubbleInstance';
import {
  BUBBLE_BURST_DURATION_MS,
  BUBBLE_IDLE_WOBBLE,
  WORD_TRANSFORMATION_BUBBLE_OPACITY,
} from '../../koi/bubbles/bubbleAnimPresets';
import { WORD_LETTER_ENTER_DURATION_MS } from '../insertAnimationTiming';
import type { BubbleAnimState } from '../../koi/bubbles/bubbleAnimTypes';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';
const LABEL_WRONG_COLOR = '#ff5a5a';
const MOVE_DURATION_MS = 320;
const WRONG_FEEDBACK_MS = 1000;
const WRONG_TINT_STRENGTH = 0.82;

const WRONG_WOBBLE = {
  wobbleAmp: BUBBLE_IDLE_WOBBLE.wobbleAmp * 1.8,
  wobbleSpeed: BUBBLE_IDLE_WOBBLE.wobbleSpeed * 5.8,
  wobbleLobes: 1,
} as const;
/** Whole-bubble shake frequency while wrong feedback is active. */
const WRONG_SHAKE_HZ = 11;

/** Livelier wobble while a bubble is travelling to a new position (e.g. insert flight). */
const MOVE_WOBBLE = {
  wobbleAmp: BUBBLE_IDLE_WOBBLE.wobbleAmp * 3.7,
  wobbleSpeed: BUBBLE_IDLE_WOBBLE.wobbleSpeed * 7.6,
} as const;
/** Ramp-up / ease-out envelope (ms) for the travel wobble boost. */
const MOVE_WOBBLE_RAMP_MS = 0;
const MOVE_WOBBLE_RELEASE_MS = 220;
/** Minimum positional change (px) that counts as a real move worth wobbling for. */
const MOVE_WOBBLE_MIN_DELTA = 1.5;

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '').trim();
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.slice(0, 6);
  const n = Number.parseInt(value, 16);
  if (Number.isNaN(n)) {
    return { r: 1, g: 0.35, b: 0.35 };
  }
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

export type LetterBubbleStatus = 'idle' | 'wrong' | 'popped';

export type LetterBubbleProps = {
  char: string;
  centerX: number;
  centerY: number;
  diameter: number;
  status: LetterBubbleStatus;
  image: SkImage;
  font: SkFont;
  clock: SharedValue<number>;
  /** When set, the bubble starts here instead of playing the enter animation. */
  initialCenterX?: number;
  initialCenterY?: number;
  initialDiameter?: number;
  skipEnter?: boolean;
  /** Override move / resize animation duration (ms). */
  moveDurationMs?: number;
  /** Bubble shader tint while status is wrong (hex). */
  wrongTintColor?: string;
  /** Delay (ms) before the pop burst starts — drives staggered pops on the UI thread. */
  popDelayMs?: number;
  /** Delay (ms) before the enter/inflate animation starts. */
  enterDelayMs?: number;
  /** Fired on the UI thread at the frame the pop becomes visible (kept in sync with audio). */
  onPopSound?: () => void;
  /** Fired on the UI thread at the frame the enter/inflate becomes visible. */
  onEnterSound?: () => void;
  /** Fired on the UI thread when a move/resize animation finishes. */
  onMoveComplete?: () => void;
  onPopComplete?: () => void;
};

function LetterBubbleComponent({
  char,
  centerX,
  centerY,
  diameter,
  status,
  image,
  font,
  clock,
  initialCenterX,
  initialCenterY,
  initialDiameter,
  skipEnter = false,
  moveDurationMs = MOVE_DURATION_MS,
  wrongTintColor = LABEL_WRONG_COLOR,
  popDelayMs,
  enterDelayMs,
  onPopSound,
  onEnterSound,
  onMoveComplete,
  onPopComplete,
}: LetterBubbleProps) {
  const posX = useSharedValue(initialCenterX ?? centerX);
  const posY = useSharedValue(initialCenterY ?? centerY);
  const dia = useSharedValue(initialDiameter ?? diameter);
  const popT = useSharedValue(0);
  const enterT = useSharedValue(skipEnter ? 1 : 0);
  const wrongT = useSharedValue(0);
  const moveT = useSharedValue(0);
  const popSoundTrigger = useSharedValue(0);
  const enterSoundTrigger = useSharedValue(0);

  // Read latest delay / sound callbacks without retriggering the status-driven
  // effects (which must only fire when the bubble enters/pops, not on every prop tick).
  const popDelayRef = useRef(popDelayMs ?? 0);
  popDelayRef.current = popDelayMs ?? 0;
  const enterDelayRef = useRef(enterDelayMs ?? 0);
  enterDelayRef.current = enterDelayMs ?? 0;
  const onPopSoundRef = useRef(onPopSound);
  onPopSoundRef.current = onPopSound;
  const onEnterSoundRef = useRef(onEnterSound);
  onEnterSoundRef.current = onEnterSound;
  const onMoveCompleteRef = useRef(onMoveComplete);
  onMoveCompleteRef.current = onMoveComplete;

  const wrongTint = useMemo(() => parseHexColor(wrongTintColor), [wrongTintColor]);
  const wrongTintR = wrongTint.r;
  const wrongTintG = wrongTint.g;
  const wrongTintB = wrongTint.b;

  useEffect(() => {
    if (skipEnter) {
      enterT.value = 1;
      return;
    }
    const delay = enterDelayRef.current;
    enterT.value = withDelay(
      delay,
      withTiming(1, {
        duration: WORD_LETTER_ENTER_DURATION_MS,
        easing: Easing.out(Easing.back(1.6)),
      }),
    );
    const sound = onEnterSoundRef.current;
    if (sound != null) {
      enterSoundTrigger.value = 0;
      enterSoundTrigger.value = withDelay(
        delay,
        withTiming(1, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(sound);
          }
        }),
      );
    }
    // Only (re)run on mount / skipEnter change; delay + sound are read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterT, skipEnter]);

  // useLayoutEffect so travel + wobble start before the first paint after mount.
  useLayoutEffect(() => {
    const travelDelta =
      Math.hypot(centerX - posX.value, centerY - posY.value) +
      Math.abs(diameter - dia.value);

    posX.value = withTiming(centerX, {
      duration: moveDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
    posY.value = withTiming(centerY, {
      duration: moveDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
    dia.value = withTiming(
      diameter,
      {
        duration: moveDurationMs,
        easing: Easing.inOut(Easing.cubic),
      },
      (finished) => {
        'worklet';
        const callback = onMoveCompleteRef.current;
        if (finished && callback != null) {
          scheduleOnRN(callback);
        }
      },
    );

    // Wiggle faster / wider while actually travelling, then settle back to idle.
    if (moveDurationMs > 0 && travelDelta > MOVE_WOBBLE_MIN_DELTA) {
      const holdMs = Math.max(0, moveDurationMs - MOVE_WOBBLE_RAMP_MS - MOVE_WOBBLE_RELEASE_MS);
      moveT.value = withSequence(
        withTiming(1, { duration: MOVE_WOBBLE_RAMP_MS, easing: Easing.out(Easing.quad) }),
        withDelay(
          holdMs,
          withTiming(0, { duration: MOVE_WOBBLE_RELEASE_MS, easing: Easing.in(Easing.quad) }),
        ),
      );
    }
  }, [centerX, centerY, diameter, dia, moveDurationMs, moveT, posX, posY]);

  useEffect(() => {
    if (status !== 'wrong') {
      wrongT.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      return;
    }
    const rampMs = 180;
    const holdMs = Math.max(0, WRONG_FEEDBACK_MS - rampMs * 2);
    wrongT.value = withSequence(
      withTiming(1, { duration: rampMs, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: holdMs }),
      withTiming(0, { duration: rampMs, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [status, wrongT]);

  useEffect(() => {
    if (status !== 'popped') {
      popT.value = 0;
      return;
    }
    const delay = popDelayRef.current;
    popT.value = 0;
    popT.value = withDelay(
      delay,
      withTiming(
        1,
        { duration: BUBBLE_BURST_DURATION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished && onPopComplete != null) {
            scheduleOnRN(onPopComplete);
          }
        },
      ),
    );
    const sound = onPopSoundRef.current;
    if (sound != null) {
      popSoundTrigger.value = 0;
      popSoundTrigger.value = withDelay(
        delay,
        withTiming(1, { duration: 0 }, (finished) => {
          'worklet';
          if (finished) {
            scheduleOnRN(sound);
          }
        }),
      );
    }
    // Delay + sound are read from refs so this only fires on status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPopComplete, popT, status]);

  const anim = useDerivedValue<BubbleAnimState>(() => {
    const enter = enterT.value;
    const pop = popT.value;
    const wrong = wrongT.value;
    const move = moveT.value;
    const growT = Math.min(1, pop / 0.5);
    const enterScale = 0.35 + 0.65 * enter;
    const d = pop > 0 ? dia.value * (1 + 0.28 * growT) : dia.value * enterScale;
    const fade = pop < 0.55 ? 0 : Math.min(1, (pop - 0.55) / 0.45);
    const opacity =
      pop > 0
        ? WORD_TRANSFORMATION_BUBBLE_OPACITY * (1 - fade)
        : WORD_TRANSFORMATION_BUBBLE_OPACITY * enter;
    const shakeAmp = wrong * Math.max(2, d * 0.05);
    const shakeT = clock.value / 1000;
    const shakeX = shakeAmp * Math.sin(shakeT * WRONG_SHAKE_HZ * Math.PI * 2);
    const shakeY = shakeAmp * Math.cos(shakeT * WRONG_SHAKE_HZ * Math.PI * 2 * 1.17);
    const cx = posX.value + shakeX;
    const cy = posY.value + shakeY;
    // Base idle wobble → livelier while travelling → wrong feedback overrides.
    const moveAmp = lerp(BUBBLE_IDLE_WOBBLE.wobbleAmp, MOVE_WOBBLE.wobbleAmp, move);
    const moveSpeed = lerp(BUBBLE_IDLE_WOBBLE.wobbleSpeed, MOVE_WOBBLE.wobbleSpeed, move);
    return {
      x: cx - d * 0.5,
      y: cy - d * 0.5,
      diameter: d,
      centerX: cx,
      centerY: cy,
      wobbleAmp: lerp(moveAmp, WRONG_WOBBLE.wobbleAmp, wrong),
      wobbleSpeed: lerp(moveSpeed, WRONG_WOBBLE.wobbleSpeed, wrong),
      wobbleLobes: lerp(BUBBLE_IDLE_WOBBLE.wobbleLobes, WRONG_WOBBLE.wobbleLobes, wrong),
      opacity,
      labelOpacity: pop > 0 ? 1 - Math.min(1, pop / 0.5) : enter,
      captureVisualT: 1,
      tintR: wrongTintR,
      tintG: wrongTintG,
      tintB: wrongTintB,
      tintStrength: wrong * WRONG_TINT_STRENGTH,
    };
  });

  const glyphs = useMemo(() => {
    const ids = font.getGlyphIDs(char);
    const textWidth = font.getTextWidth(char);
    const metrics = font.getMetrics();
    const offsetX = diameter * 0.5 - textWidth * 0.5;
    const offsetY = diameter * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    return ids.map((id) => ({ id, pos: vec(offsetX, offsetY) }));
  }, [char, diameter, font]);

  const labelTransform = useDerivedValue(() => {
    const { centerX: cx, centerY: cy, diameter: d } = anim.value;
    const ox = diameter * 0.5;
    const oy = diameter * 0.5;
    const scale = diameter > 0 ? d / diameter : 1;
    return [
      { translateX: cx - d * 0.5 },
      { translateY: cy - d * 0.5 },
      { translateX: ox },
      { translateY: oy },
      { scale },
      { translateX: -ox },
      { translateY: -oy },
    ];
  });

  const labelOpacity = useDerivedValue(() => anim.value.labelOpacity);
  const fillColor = status === 'wrong' ? LABEL_WRONG_COLOR : LABEL_FILL_COLOR;

  return (
    <Group>
      <BubbleInstance image={image} anim={anim} clock={clock} />
      <Group transform={labelTransform} opacity={labelOpacity}>
        <Group
          style="stroke"
          strokeWidth={LABEL_STROKE_WIDTH}
          strokeJoin="round"
          strokeCap="round"
          color={LABEL_STROKE_COLOR}>
          <Glyphs font={font} glyphs={glyphs} />
        </Group>
        <Glyphs font={font} glyphs={glyphs} color={fillColor} />
      </Group>
    </Group>
  );
}

/**
 * Memoized so a single popped/inflating bubble does not force React-Native-Skia
 * to reconcile every other bubble in the canvas on each game-state change.
 */
export const LetterBubble = React.memo(LetterBubbleComponent);
