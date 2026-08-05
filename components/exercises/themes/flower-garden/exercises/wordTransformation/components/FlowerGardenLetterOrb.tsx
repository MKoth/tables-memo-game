import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Glyphs,
  Group,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ThemeLetterOrbProps } from '../../../../../themeContract';
import {
  LETTER_ORB_FLOWER_PRESET,
  ORB_ENTER_DURATION_MS,
  ORB_MOVE_DURATION_MS,
  ORB_WRONG_FEEDBACK_MS,
  ORB_WRONG_RAMP_MS,
} from '../../../orb/orbAnimPresets';
import { OrbFlowerShader } from '../../../orb/OrbFlowerShader';
import { BurstIntent } from '../../../orb/orbAnimTypes';
import {
  useOrbAnimation,
  type OrbWrongState,
} from '../../../orb/useOrbAnimation';
import { hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';
const LABEL_WRONG_COLOR = '#ff5a5a';

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '').trim();
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map(c => c + c)
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

function FlowerGardenLetterOrbComponent({
  char,
  centerX,
  centerY,
  diameter,
  status,
  image: _image,
  font,
  clock,
  initialCenterX,
  initialCenterY,
  initialDiameter,
  skipEnter = false,
  moveDurationMs = ORB_MOVE_DURATION_MS,
  wrongTintColor = LABEL_WRONG_COLOR,
  popDelayMs,
  enterDelayMs,
  onPopSound,
  onEnterSound,
  onEnterComplete,
  onMoveComplete: _onMoveComplete,
  onPopComplete,
  labelFixed = false,
  letterSpacing = 0,
  wobbleBoostT: _wobbleBoostT,
  ringVariants,
  bedVariants,
}: ThemeLetterOrbProps & {
  ringVariants?: SkImage[] | null;
  bedVariants?: SkImage[] | null;
}) {
  const orbSeed = useMemo(
    () => hashSeedString(`flower-garden-letter-orb-${char}`),
    [char],
  );

  const posX = useSharedValue(initialCenterX ?? centerX);
  const posY = useSharedValue(initialCenterY ?? centerY);
  const dia = useSharedValue(initialDiameter ?? diameter);

  // useLayoutEffect so relayout moves + insert flights start before first paint.
  useLayoutEffect(() => {
    cancelAnimation(posX);
    cancelAnimation(posY);
    cancelAnimation(dia);
    posX.value = withTiming(centerX, {
      duration: moveDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
    posY.value = withTiming(centerY, {
      duration: moveDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
    dia.value = withTiming(diameter, {
      duration: moveDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [centerX, centerY, diameter, dia, moveDurationMs, posX, posY]);

  const orbConfig = useMemo(
    () => ({
      originX: skipEnter ? centerX : (initialCenterX ?? centerX),
      originY: skipEnter ? centerY : (initialCenterY ?? centerY),
      targetCenterX: centerX,
      targetCenterY: centerY,
      targetDiameter: diameter,
      moveCenterX: posX,
      moveCenterY: posY,
      moveDiameter: dia,
      initialDiameter,
      skipEnter,
      enterDelayMs,
      popDelayMs,
    }),
    [
      centerX,
      centerY,
      diameter,
      dia,
      enterDelayMs,
      initialCenterX,
      initialCenterY,
      initialDiameter,
      popDelayMs,
      posX,
      posY,
      skipEnter,
    ],
  );

  const wrongT = useSharedValue(0);
  const wrongTint = useMemo(() => parseHexColor(wrongTintColor), [wrongTintColor]);

  const wrongState = useMemo<OrbWrongState>(
    () => ({
      wrongProgress: wrongT,
      clock,
      tintR: wrongTint.r,
      tintG: wrongTint.g,
      tintB: wrongTint.b,
    }),
    [clock, wrongT, wrongTint],
  );

  useEffect(() => {
    if (status !== 'wrong') {
      wrongT.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      return;
    }
    const rampMs = ORB_WRONG_RAMP_MS;
    const holdMs = Math.max(0, ORB_WRONG_FEEDBACK_MS - rampMs * 2);
    wrongT.value = withSequence(
      withTiming(1, { duration: rampMs, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: holdMs }),
      withTiming(0, { duration: rampMs, easing: Easing.inOut(Easing.cubic) }),
    );
  }, [status, wrongT]);

  const onPopCompleteRef = useRef(onPopComplete);
  onPopCompleteRef.current = onPopComplete;
  const onEnterCompleteRef = useRef(onEnterComplete);
  onEnterCompleteRef.current = onEnterComplete;
  const onPopSoundRef = useRef(onPopSound);
  onPopSoundRef.current = onPopSound;
  const onEnterSoundRef = useRef(onEnterSound);
  onEnterSoundRef.current = onEnterSound;

  const handleBurstCompleteWorklet = useCallback((_burstIdleTimeMs: number, _intent: number) => {
    'worklet';
    const onComplete = onPopCompleteRef.current;
    if (onComplete != null) {
      scheduleOnRN(onComplete);
    }
  }, []);

  const { anim, startBurst } = useOrbAnimation(
    orbConfig,
    () => {},
    true,
    handleBurstCompleteWorklet,
    wrongState,
    clock,
  );

  const statusRef = useRef<ThemeLetterOrbProps['status'] | null>(null);
  const startBurstRef = useRef(startBurst);
  startBurstRef.current = startBurst;

  useEffect(() => {
    const previous = statusRef.current;
    statusRef.current = status;
    if (status === 'popped' && previous !== 'popped') {
      startBurstRef.current(BurstIntent.Release);
    }
  }, [status]);

  const popSoundTrigger = useSharedValue(0);
  const enterSoundTrigger = useSharedValue(0);
  const enterCompleteTrigger = useSharedValue(0);

  useEffect(() => {
    if (status !== 'popped') {
      return;
    }
    const delay = popDelayMs ?? 0;
    const sound = onPopSoundRef.current;
    if (sound != null) {
      popSoundTrigger.value = 0;
      popSoundTrigger.value = withDelay(
        delay,
        withTiming(1, { duration: 0 }, finished => {
          'worklet';
          if (finished) {
            scheduleOnRN(sound);
          }
        }),
      );
    }
    // Delay + sound are read from refs so this only fires on the popped transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, popSoundTrigger]);

  useEffect(() => {
    if (skipEnter) {
      return;
    }
    const delay = enterDelayMs ?? 0;
    const sound = onEnterSoundRef.current;
    if (sound != null) {
      enterSoundTrigger.value = 0;
      enterSoundTrigger.value = withDelay(
        delay,
        withTiming(1, { duration: 0 }, finished => {
          'worklet';
          if (finished) {
            scheduleOnRN(sound);
          }
        }),
      );
    }
    const onEnterCompleteCallback = onEnterCompleteRef.current;
    if (onEnterCompleteCallback != null) {
      enterCompleteTrigger.value = 0;
      enterCompleteTrigger.value = withDelay(
        delay + ORB_ENTER_DURATION_MS,
        withTiming(1, { duration: 0 }, finished => {
          'worklet';
          if (finished) {
            scheduleOnRN(onEnterCompleteCallback);
          }
        }),
      );
    }
    // Enter delay is read from the config at mount; the sound refs stay current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterSoundTrigger, enterCompleteTrigger, skipEnter]);

  const glyphs = useMemo(() => {
    const ids = font.getGlyphIDs(char);
    const textWidth = font.getTextWidth(char);
    const metrics = font.getMetrics();
    const offsetX = diameter * 0.5 - textWidth * 0.5;
    const offsetY = diameter * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    let curX = offsetX;
    return ids.map((id, i) => {
      const pos = vec(curX, offsetY);
      if (i < char.length) {
        curX += font.getTextWidth(char[i]) + letterSpacing;
      }
      return { id, pos };
    });
  }, [char, diameter, font, letterSpacing]);

  const labelTransform = useDerivedValue(() => {
    const { centerX: cx, centerY: cy, diameter: d } = anim.value;
    const ox = diameter * 0.5;
    const oy = diameter * 0.5;
    const scale = labelFixed ? 1 : d > 0 ? d / diameter : 1;
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

  const labelOpacity = useDerivedValue(() => {
    const { overallOpacity, captureVisualT } = anim.value;
    return overallOpacity * captureVisualT;
  });

  const fillColor = status === 'wrong' ? LABEL_WRONG_COLOR : LABEL_FILL_COLOR;

  if (ringVariants == null || bedVariants == null) {
    return null;
  }

  return (
    <Group>
      <OrbFlowerShader
        anim={anim}
        seed={orbSeed}
        targetDiameter={diameter}
        preset={LETTER_ORB_FLOWER_PRESET}
        ringVariants={ringVariants}
        bedVariants={bedVariants}
      />
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
 * Memoized so a single popped/inflating orb does not force React-Native-Skia
 * to reconcile every other orb in the canvas on each game-state change.
 */
export const FlowerGardenLetterOrb = React.memo(FlowerGardenLetterOrbComponent);
