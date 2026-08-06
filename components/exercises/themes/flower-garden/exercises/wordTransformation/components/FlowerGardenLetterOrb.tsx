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
  type BurstIntentValue,
  type LetterOrbGeometry,
} from '../../../orb/orbAnimTypes';
import {
  useOrbAnimation,
  type OrbWrongState,
} from '../../../orb/useOrbAnimation';
import { hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import type { WordTransformationSceneState } from '../../../../../wordTransformation/scene/sceneStateTypes';

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

export type FlowerGardenLetterOrbSceneEntry = {
  centerX: number;
  centerY: number;
  diameter: number;
  skipEnter: boolean;
  popped: boolean;
  wrong: boolean;
  hidden: boolean;
  popDelayMs: number | null;
  enterDelayMs: number | null;
};

function sceneEntryWorklet(
  state: WordTransformationSceneState,
  kind: 'letters' | 'picker',
  key: string | number,
): FlowerGardenLetterOrbSceneEntry | null {
  'worklet';
  if (kind === 'letters') {
    const letter = state.letters[key as number];
    if (letter == null) {
      return null;
    }
    return {
      centerX: letter.centerX,
      centerY: letter.centerY,
      diameter: letter.diameter,
      skipEnter: letter.skipEnter === true,
      popped: letter.popped,
      wrong: letter.wrong,
      hidden: false,
      popDelayMs: letter.popDelayMs,
      enterDelayMs: letter.enterDelayMs,
    };
  }
  const item = state.variantPicker.items[key as number];
  if (item == null) {
    return null;
  }
  return {
    centerX: item.centerX,
    centerY: item.centerY,
    diameter: item.diameter,
    skipEnter: false,
    popped: item.popped,
    wrong: item.wrong,
    hidden: item.hidden,
    popDelayMs: item.popDelayMs,
    enterDelayMs: null,
  };
}

export type FlowerGardenLetterOrbProps = {
  char: string;
  status?: 'idle' | 'wrong' | 'popped';
  /** Stable shared value holding the target/initial layout. The parent writes
   * it on relayout; the orb animates toward it without re-rendering. Not needed
   * when `sceneStateSv` is provided — the orb follows the scene geometry. */
  geometry?: SharedValue<LetterOrbGeometry | null>;
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
  /** When provided, status is derived from the theme scene state on the UI
   * thread (bursts, wrong feedback, pop sounds) instead of the `status` prop,
   * so per-press changes never re-render React. */
  sceneStateSv?: SharedValue<WordTransformationSceneState>;
  sceneKind?: 'letters' | 'picker';
  sceneKey?: string | number;
};

function FlowerGardenLetterOrbComponent({
  char,
  status = 'idle',
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
  sceneStateSv,
  sceneKind,
  sceneKey,
}: FlowerGardenLetterOrbProps) {
  const sceneDriven = sceneStateSv != null && sceneKind != null && sceneKey != null;

  const orbSeed = useMemo(
    () => hashSeedString(`flower-garden-letter-orb-${char}`),
    [char],
  );

  const initialSceneEntry = sceneDriven
    ? sceneEntryWorklet(sceneStateSv!.value, sceneKind!, sceneKey!)
    : null;
  const initialGeometry = geometry?.value;
  const posX = useSharedValue(
    initialSceneEntry?.centerX ??
      initialCenterX ??
      initialGeometry?.initialCenterX ??
      initialGeometry?.centerX ??
      0,
  );
  const posY = useSharedValue(
    initialSceneEntry?.centerY ??
      initialCenterY ??
      initialGeometry?.initialCenterY ??
      initialGeometry?.centerY ??
      0,
  );
  const dia = useSharedValue(
    initialSceneEntry?.diameter ??
      initialDiameter ??
      initialGeometry?.initialDiameter ??
      initialGeometry?.diameter ??
      0,
  );

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

  // Relayouts arrive as writes to `geometry` — animate toward the new target
  // on the UI thread without any React re-render.
  useAnimatedReaction(
    () => (geometry == null ? null : geometry.value),
    (current, previous) => {
      if (current == null || geometry == null) {
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

  const sceneGeometry = useDerivedValue(() => {
    if (sceneStateSv == null || sceneKind == null || sceneKey == null) {
      return null;
    }
    return sceneEntryWorklet(sceneStateSv.value, sceneKind, sceneKey);
  }, [sceneKind, sceneKey, sceneStateSv]);

  // Scene-driven orbs follow the scene geometry on the UI thread — preview
  // shifts, dismiss returns, relayouts — without any React re-render.
  useAnimatedReaction(
    () => sceneGeometry.value,
    (current, previous) => {
      if (current == null || sceneGeometry == null) {
        return;
      }
      const prev = previous;
      if (prev == null) {
        return;
      }
      const moved =
        current.centerX !== prev.centerX ||
        current.centerY !== prev.centerY ||
        current.diameter !== prev.diameter;
      if (!moved) {
        return;
      }
      const duration = current.skipEnter ? 0 : ORB_MOVE_DURATION_MS;
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
    [dia, posX, posY, sceneGeometry],
  );

  const skipEnterAtMount = initialSceneEntry?.skipEnter ?? initialGeometry?.skipEnter === true;

  const orbConfig = useMemo(() => {
    const g = geometry?.value;
    const entry =
      sceneStateSv != null && sceneKind != null && sceneKey != null
        ? sceneEntryWorklet(sceneStateSv.value, sceneKind, sceneKey)
        : null;
    if (entry != null) {
      return {
        originX: entry.centerX,
        originY: entry.centerY,
        targetCenterX: entry.centerX,
        targetCenterY: entry.centerY,
        targetDiameter: entry.diameter,
        moveCenterX: posX,
        moveCenterY: posY,
        moveDiameter: dia,
        initialDiameter: entry.skipEnter ? entry.diameter : undefined,
        skipEnter: entry.skipEnter,
        enterDelayMs: entry.enterDelayMs ?? enterDelayMs,
        popDelayMs: undefined,
      };
    }
    if (g == null) {
      return {
        originX: posX.value,
        originY: posY.value,
        targetCenterX: posX.value,
        targetCenterY: posY.value,
        targetDiameter: dia.value,
        moveCenterX: posX,
        moveCenterY: posY,
        moveDiameter: dia,
        initialDiameter: undefined,
        skipEnter: false,
        enterDelayMs,
        popDelayMs,
      };
    }
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
  }, [dia, enterDelayMs, geometry, popDelayMs, posX, posY, sceneKey, sceneKind, sceneStateSv]);

  const wrongT = useSharedValue(0);
  const wrongTint = useMemo(() => parseHexColor(wrongTintColor), [wrongTintColor]);
  const shakeClock = useSharedValue(0);

  useEffect(() => {
    if (sceneDriven) {
      return;
    }
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
  }, [sceneDriven, shakeClock, status]);

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
    if (sceneDriven) {
      return;
    }
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
  }, [sceneDriven, status, wrongT]);

  const onEnterCompleteRef = useRef(onEnterComplete);
  onEnterCompleteRef.current = onEnterComplete;
  const onPopSoundRef = useRef(onPopSound);
  onPopSoundRef.current = onPopSound;
  const onEnterSoundRef = useRef(onEnterSound);
  onEnterSoundRef.current = onEnterSound;

  const handleBurstCompleteWorklet = useCallback((_burstIdleTimeMs: number, _intent: number) => {
    'worklet';
  }, []);

  const retargetEnterSv = useSharedValue<{
    skipEnter: boolean;
    enterDelayMs: number | null;
  } | null>(null);

  const { anim, startBurst } = useOrbAnimation(
    orbConfig,
    () => {},
    true,
    handleBurstCompleteWorklet,
    wrongState,
    clock,
    retargetEnterSv,
  );

  const statusRef = useRef<FlowerGardenLetterOrbProps['status'] | null>(null);
  const startBurstRef = useRef(startBurst);
  startBurstRef.current = startBurst;

  useEffect(() => {
    if (sceneDriven) {
      return;
    }
    const previous = statusRef.current;
    statusRef.current = status;
    if (status === 'popped' && previous !== 'popped') {
      startBurstRef.current(BurstIntent.Release);
    }
  }, [sceneDriven, status]);

  const popSoundTrigger = useSharedValue(0);
  const enterSoundTrigger = useSharedValue(0);
  const enterCompleteTrigger = useSharedValue(0);

  useEffect(() => {
    if (sceneDriven) {
      return;
    }
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
  }, [sceneDriven, status, popSoundTrigger]);

  const dispatchBurst = useCallback((intent: BurstIntentValue, burstDelayMs?: number) => {
    startBurstRef.current(intent, burstDelayMs);
  }, []);
  const dispatchPopSound = useCallback(() => {
    onPopSoundRef.current?.();
  }, []);
  const dispatchEnterSound = useCallback(() => {
    onEnterSoundRef.current?.();
  }, []);

  useAnimatedReaction(
    () => (sceneStateSv == null ? null : sceneStateSv.value),
    (scene, prevScene) => {
      if (sceneStateSv == null || sceneKind == null || sceneKey == null || scene == null) {
        return;
      }
      const entry = sceneEntryWorklet(scene, sceneKind, sceneKey);
      if (entry == null) {
        return;
      }
      const prevEntry =
        prevScene == null ? null : sceneEntryWorklet(prevScene, sceneKind, sceneKey);
      const wasPopped = prevEntry != null && prevEntry.popped;
      const wasWrong = prevEntry != null && prevEntry.wrong;

      if (entry.popped && !wasPopped) {
        scheduleOnRN(dispatchBurst, BurstIntent.Release, entry.popDelayMs ?? 0);
      }

      if (entry.wrong !== wasWrong) {
        if (entry.wrong) {
          shakeClock.value = withRepeat(
            withTiming(1000 / ORB_WRONG_SHAKE_HZ, {
              duration: 1000 / ORB_WRONG_SHAKE_HZ,
              easing: Easing.linear,
            }),
            -1,
          );
          const rampMs = ORB_WRONG_RAMP_MS;
          const holdMs = Math.max(0, ORB_WRONG_FEEDBACK_MS - rampMs * 2);
          wrongT.value = withSequence(
            withTiming(1, { duration: rampMs, easing: Easing.out(Easing.cubic) }),
            withTiming(1, { duration: holdMs }),
            withTiming(0, { duration: rampMs, easing: Easing.inOut(Easing.cubic) }),
          );
        } else {
          cancelAnimation(shakeClock);
          shakeClock.value = 0;
          wrongT.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
        }
      }

      if (entry.popped && !wasPopped && entry.popDelayMs != null) {
        popSoundTrigger.value = 0;
        popSoundTrigger.value = withDelay(
          entry.popDelayMs,
          withTiming(1, { duration: 0 }, finished => {
            'worklet';
            if (finished) {
              scheduleOnRN(dispatchPopSound);
            }
          }),
        );
      }

      if (
        prevEntry != null &&
        entry.enterDelayMs != null &&
        (entry.enterDelayMs !== prevEntry.enterDelayMs ||
          entry.skipEnter !== prevEntry.skipEnter)
      ) {
        retargetEnterSv.value = {
          skipEnter: entry.skipEnter,
          enterDelayMs: entry.enterDelayMs,
        };
        enterSoundTrigger.value = 0;
        enterSoundTrigger.value = withDelay(
          entry.enterDelayMs,
          withTiming(1, { duration: 0 }, finished => {
            'worklet';
            if (finished) {
              scheduleOnRN(dispatchEnterSound);
            }
          }),
        );
      }
    },
    [
      dispatchBurst,
      dispatchEnterSound,
      dispatchPopSound,
      enterSoundTrigger,
      popSoundTrigger,
      retargetEnterSv,
      sceneKind,
      sceneKey,
      sceneStateSv,
      shakeClock,
      wrongT,
    ],
  );

  useEffect(() => {
    if (skipEnterAtMount) {
      return;
    }
    const delay = enterDelayMs ?? 0;
    const sound = onEnterSoundRef.current;
    if (sceneDriven && initialSceneEntry?.enterDelayMs == null) {
      return;
    }
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
  }, [enterCompleteTrigger, enterSoundTrigger, initialSceneEntry, sceneDriven, skipEnterAtMount]);

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

  const sceneFillColor = useDerivedValue(() => {
    if (sceneStateSv == null || sceneKind == null || sceneKey == null) {
      return LABEL_FILL_COLOR;
    }
    const entry = sceneEntryWorklet(sceneStateSv.value, sceneKind, sceneKey);
    return entry != null && entry.wrong ? LABEL_WRONG_COLOR : LABEL_FILL_COLOR;
  }, [sceneKind, sceneKey, sceneStateSv]);

  const sceneOpacity = useDerivedValue(() => {
    if (sceneStateSv == null || sceneKind == null || sceneKey == null) {
      return 1;
    }
    const state = sceneStateSv.value;
    if (sceneKind === 'letters' && !state.wordOrbsVisible) {
      return 0;
    }
    if (sceneKind === 'picker' && !state.variantPicker.visible) {
      return 0;
    }
    const entry = sceneEntryWorklet(state, sceneKind, sceneKey);
    return entry != null && entry.hidden ? 0 : 1;
  }, [sceneKind, sceneKey, sceneStateSv]);

  const fillColor = status === 'wrong' ? LABEL_WRONG_COLOR : LABEL_FILL_COLOR;

  if (ringVariants == null || bedVariants == null) {
    return null;
  }

  return (
    <Group opacity={sceneOpacity}>
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
        <Glyphs font={font} glyphs={glyphs} color={sceneDriven ? sceneFillColor : fillColor} />
      </Group>
    </Group>
  );
}

/**
 * Memoized so a single popped/inflating orb does not force React-Native-Skia
 * to reconcile every other orb in the canvas on each game-state change.
 */
export const FlowerGardenLetterOrb = React.memo(FlowerGardenLetterOrbComponent);
