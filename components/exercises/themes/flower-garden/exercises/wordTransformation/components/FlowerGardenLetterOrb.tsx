import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import {
  Glyphs,
  Group,
  matchFont,
  vec,
  type SkFont,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { usePropDiffLogger, useRenderTracker } from '../../../core/perf/flowerGardenPerfLogger';
import {
  LETTER_ORB_FLOWER_PRESET,
  ORB_ENTER_DURATION_MS,
  ORB_MOVE_DURATION_MS,
  ORB_WRONG_FEEDBACK_MS,
  ORB_WRONG_RAMP_MS,
  ORB_WRONG_SHAKE_HZ,
} from '../../../orb/orbAnimPresets';
import { OrbFlowerShader } from '../../../orb/OrbFlowerShader';
import {
  BurstIntent,
  type LetterOrbGeometry,
} from '../../../orb/orbAnimTypes';
import {
  useOrbAnimation,
  type OrbWrongState,
} from '../../../orb/useOrbAnimation';
import { hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';

const LABEL_STROKE_WIDTH = 2;
const LABEL_FILL_COLOR = '#ffffff';
const LABEL_STROKE_COLOR = '#0a2840';
const LABEL_WRONG_COLOR = '#ff5a5a';

/**
 * Labels are drawn at a fixed font size and scaled by the animated diameter
 * (d / LABEL_REF_DIAMETER), so the font never changes when the layout
 * reflows and relayouts do not re-render the orb.
 */
const LABEL_REF_DIAMETER = 56;

type LabelGlyph = { id: number; pos: ReturnType<typeof vec> };

const labelFontFamily = Platform.select({ ios: 'Helvetica', default: 'sans-serif' });
const labelFontCache = new Map<number, SkFont>();
const labelGlyphCache = new Map<string, LabelGlyph[]>();

function labelFontFor(charLength: number): SkFont {
  const fontSize =
    charLength === 1
      ? Math.max(16, LABEL_REF_DIAMETER * 0.5)
      : Math.max(14, (LABEL_REF_DIAMETER * 0.5) / Math.max(1, charLength * 0.52));
  let font = labelFontCache.get(fontSize);
  if (font == null) {
    font = matchFont({
      fontFamily: labelFontFamily,
      fontSize,
      fontWeight: '700',
    });
    labelFontCache.set(fontSize, font);
  }
  return font;
}

function labelGlyphsFor(char: string, font: SkFont, letterSpacing: number): LabelGlyph[] {
  const key = `${font.getSize()}-${char}-${letterSpacing}`;
  let glyphs = labelGlyphCache.get(key);
  if (glyphs == null) {
    const ids = font.getGlyphIDs(char);
    const textWidth = font.getTextWidth(char);
    const metrics = font.getMetrics();
    const offsetX = LABEL_REF_DIAMETER * 0.5 - textWidth * 0.5;
    const offsetY = LABEL_REF_DIAMETER * 0.5 - (metrics.ascent + metrics.descent) * 0.5;
    let curX = offsetX;
    glyphs = ids.map((id, i) => {
      const pos = vec(curX, offsetY);
      if (i < char.length) {
        curX += font.getTextWidth(char[i]) + letterSpacing;
      }
      return { id, pos };
    });
    labelGlyphCache.set(key, glyphs);
  }
  return glyphs;
}

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

export type FlowerGardenLetterOrbProps = {
  char: string;
  status: 'idle' | 'wrong' | 'popped';
  /** Stable shared value holding the target/initial layout. The parent writes
   * it on relayout; the orb animates toward it without re-rendering. */
  geometry: SharedValue<LetterOrbGeometry>;
  clock: SharedValue<number>;
  /** Optional mount-time move (e.g. insert flights): tweened in a layout
   * effect during the commit itself, so the animation starts even when the
   * passive-effect/mapper pipeline is delayed under load. */
  moveCenterX?: number;
  moveCenterY?: number;
  moveDiameter?: number;
  initialCenterX?: number;
  initialCenterY?: number;
  initialDiameter?: number;
  moveDurationMs?: number;
  wrongTintColor?: string;
  popDelayMs?: number;
  enterDelayMs?: number;
  onPopSound?: () => void;
  onEnterSound?: () => void;
  onEnterComplete?: () => void;
  labelFixed?: boolean;
  letterSpacing?: number;
  ringVariants?: SkImage[] | null;
  bedVariants?: SkImage[] | null;
};

function FlowerGardenLetterOrbComponent({
  char,
  status,
  geometry,
  clock,
  moveCenterX,
  moveCenterY,
  moveDiameter,
  initialCenterX,
  initialCenterY,
  initialDiameter,
  moveDurationMs = ORB_MOVE_DURATION_MS,
  wrongTintColor = LABEL_WRONG_COLOR,
  popDelayMs,
  enterDelayMs,
  onPopSound,
  onEnterSound,
  onEnterComplete,
  labelFixed = false,
  letterSpacing = 0,
  ringVariants,
  bedVariants,
}: FlowerGardenLetterOrbProps) {
  useRenderTracker('FG:LetterOrb');
  usePropDiffLogger('LetterOrb', {
    char,
    status,
    geometry,
    clock,
    popDelayMs,
    enterDelayMs,
    labelFixed,
    letterSpacing,
    ringVariants,
    bedVariants,
    onPopSound,
    onEnterSound,
    onEnterComplete,
  });
  const orbSeed = useMemo(
    () => hashSeedString(`flower-garden-letter-orb-${char}`),
    [char],
  );

  const initialGeometry = geometry.value;
  const posX = useSharedValue(initialCenterX ?? initialGeometry.initialCenterX ?? initialGeometry.centerX);
  const posY = useSharedValue(initialCenterY ?? initialGeometry.initialCenterY ?? initialGeometry.centerY);
  const dia = useSharedValue(initialDiameter ?? initialGeometry.initialDiameter ?? initialGeometry.diameter);

  // Insert flights tween from the commit itself (layout effect), not via the
  // passive-effect mapper pipeline which can run hundreds of ms late when the
  // pick commit saturates the JS thread.
  useLayoutEffect(() => {
    if (moveCenterX == null || moveCenterY == null || moveDiameter == null) {
      return;
    }
    posX.value = withTiming(moveCenterX, { duration: moveDurationMs, easing: Easing.inOut(Easing.cubic) });
    posY.value = withTiming(moveCenterY, { duration: moveDurationMs, easing: Easing.inOut(Easing.cubic) });
    dia.value = withTiming(moveDiameter, { duration: moveDurationMs, easing: Easing.inOut(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount-time snapshot: the first reaction run has `previous === null`, but the
  // parent may have already written the move target (e.g. insert flights seed at
  // the from-position) — compare against the snapshot instead of skipping.
  const mountGeometry = useSharedValue(initialGeometry);

  const logReactionRef = useRef<(msg: string) => void>(() => {});
  useEffect(() => {
    logReactionRef.current = msg => console.log(`[FG:Reaction] ${Date.now()} char=${char} ${msg}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    console.log(
      `[FG:OrbMount] ${Date.now()} char=${char} posX=${posX.value.toFixed(0)} posY=${posY.value.toFixed(0)} dia=${dia.value.toFixed(0)}`,
    );
    return () => {
      console.log(`[FG:OrbUnmount] ${Date.now()} char=${char} posX=${posX.value.toFixed(0)}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Relayouts arrive as writes to `geometry` — animate toward the new target
  // on the UI thread without any React re-render.
  useAnimatedReaction(
    () => geometry.value,
    (current, previous) => {
      if (current == null) {
        return;
      }
      const prev = previous ?? mountGeometry.value;
      if (prev == null) {
        return;
      }
      const moved =
        current.centerX !== prev.centerX ||
        current.centerY !== prev.centerY ||
        current.diameter !== prev.diameter;
      scheduleOnRN(
        logReactionRef.current,
        `firstRun=${previous == null} moved=${moved} currentX=${current.centerX.toFixed(0)} prevX=${prev.centerX.toFixed(0)} dur=${moved ? (current.moveDurationMs ?? ORB_MOVE_DURATION_MS) : 0}`,
      );
      if (!moved) {
        return;
      }
      const duration = current.moveDurationMs ?? ORB_MOVE_DURATION_MS;
      posX.value = withTiming(current.centerX, {
        duration,
        easing: Easing.inOut(Easing.cubic),
      });
      posY.value = withTiming(current.centerY, {
        duration,
        easing: Easing.inOut(Easing.cubic),
      });
      dia.value = withTiming(current.diameter, {
        duration,
        easing: Easing.inOut(Easing.cubic),
      });
    },
    [dia, geometry, mountGeometry, posX, posY],
  );

  const orbConfig = useMemo(() => {
    const g = geometry.value;
    return {
      originX: g.skipEnter ? g.centerX : (g.initialCenterX ?? g.centerX),
      originY: g.skipEnter ? g.centerY : (g.initialCenterY ?? g.centerY),
      targetCenterX: g.centerX,
      targetCenterY: g.centerY,
      targetDiameter: g.diameter,
      moveCenterX: posX,
      moveCenterY: posY,
      moveDiameter: dia,
      initialDiameter: g.initialDiameter,
      skipEnter: g.skipEnter,
      enterDelayMs,
      popDelayMs,
    };
  }, [dia, enterDelayMs, geometry, popDelayMs, posX, posY]);

  const wrongT = useSharedValue(0);
  const wrongTint = useMemo(() => parseHexColor(wrongTintColor), [wrongTintColor]);
  const shakeClock = useSharedValue(0);

  useEffect(() => {
    if (status !== 'wrong') {
      shakeClock.value = 0;
      return;
    }
    shakeClock.value = withRepeat(
      withTiming(1000 / ORB_WRONG_SHAKE_HZ, {
        duration: 1000 / ORB_WRONG_SHAKE_HZ,
        easing: Easing.linear,
      }),
      -1,
    );
    return () => {
      cancelAnimation(shakeClock);
    };
  }, [shakeClock, status]);

  const wrongState = useMemo<OrbWrongState>(
    () => ({
      wrongProgress: wrongT,
      clock: shakeClock,
      tintR: wrongTint.r,
      tintG: wrongTint.g,
      tintB: wrongTint.b,
    }),
    [shakeClock, wrongT, wrongTint],
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

  const onEnterCompleteRef = useRef(onEnterComplete);
  onEnterCompleteRef.current = onEnterComplete;
  const onPopSoundRef = useRef(onPopSound);
  onPopSoundRef.current = onPopSound;
  const onEnterSoundRef = useRef(onEnterSound);
  onEnterSoundRef.current = onEnterSound;

  const handleBurstCompleteWorklet = useCallback((_burstIdleTimeMs: number, _intent: number) => {
    'worklet';
  }, []);

  const { anim, startBurst } = useOrbAnimation(
    orbConfig,
    () => {},
    true,
    handleBurstCompleteWorklet,
    wrongState,
    clock,
  );

  const statusRef = useRef<FlowerGardenLetterOrbProps['status'] | null>(null);
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
    if (geometry.value.skipEnter) {
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
  }, [enterCompleteTrigger, enterSoundTrigger, geometry]);

  const font = useMemo(() => labelFontFor(char.length), [char.length]);

  const glyphs = useMemo(
    () => labelGlyphsFor(char, font, letterSpacing),
    [char, font, letterSpacing],
  );

  const labelTransform = useDerivedValue(() => {
    const { centerX: cx, centerY: cy, diameter: d } = anim.value;
    const ox = LABEL_REF_DIAMETER * 0.5;
    const oy = LABEL_REF_DIAMETER * 0.5;
    const scale = labelFixed ? 1 : d > 0 ? d / LABEL_REF_DIAMETER : 1;
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
