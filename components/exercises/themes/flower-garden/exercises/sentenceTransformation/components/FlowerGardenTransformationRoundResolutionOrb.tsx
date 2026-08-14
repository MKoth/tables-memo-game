import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ThemeResolutionOrbProps } from '../../../../../themeContract';
import {
  ROUND_MATERIALIZE_DURATION_MS,
  ROUND_MERGE_DURATION_MS,
  ROUND_SOLVED_POP_DURATION_MS,
} from '../../../../../sentenceTransformation/domain/roundResolutionTiming';
import { computeLetterLayout } from '../../../../../core/layout/exerciseLayout';
import { useExerciseLayout } from '../../../../../core';
import { hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { TAP_MAX_DISTANCE_PX } from '../../../carrier/FlowerGardenWordSpriteTableLayer/config/flowerTableLayerConfig';
import { FlowerGardenBigWordOrb } from './FlowerGardenBigWordOrb';
import { computeMergeOrbDiameter } from './FlowerGardenTransformationMergeOrbs';

const TRANSLATION_HOLD_MS = 800;

export type FlowerGardenTransformationRoundResolutionOrbProps = ThemeResolutionOrbProps & {
  /** Solved word during the merge phase — the orb inflates here, then flies. */
  mergeWord?: string | null;
  mergeCenterX?: number;
  mergeCenterY?: number;
  mergeDiameter?: number;
  mergeDurationMs?: number;
  onMergeComplete?: () => void;
};

export function FlowerGardenTransformationRoundResolutionOrb({
  orb,
  roundPhase,
  translation,
  onMaterializeComplete,
  onResolveComplete,
  onPopComplete,
  mergeWord = null,
  mergeCenterX,
  mergeCenterY,
  mergeDiameter,
  mergeDurationMs = ROUND_MERGE_DURATION_MS,
  onMergeComplete,
}: FlowerGardenTransformationRoundResolutionOrbProps) {
  const { roamerRect } = useExerciseLayout();
  const orbCenterX = useSharedValue(0);
  const orbCenterY = useSharedValue(0);
  const orbTargetDiameter = useSharedValue(1);
  const orbOverallOpacity = useSharedValue(1);
  const [showTranslation, setShowTranslation] = useState(false);
  const translateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mergeGeometry = useMemo(() => {
    if (mergeWord == null || mergeWord.length === 0) {
      return null;
    }
    const layout = computeLetterLayout(roamerRect, mergeWord.length);
    const first = layout.centers[0] ?? roamerRect.x + roamerRect.w * 0.5;
    const last = layout.centers[layout.centers.length - 1] ?? first;
    return {
      centerX: mergeCenterX ?? (first + last) * 0.5,
      centerY: mergeCenterY ?? layout.rowY,
      diameter:
        mergeDiameter ?? computeMergeOrbDiameter(mergeWord.length, roamerRect.w, roamerRect.h),
    };
  }, [mergeWord, mergeCenterX, mergeCenterY, mergeDiameter, roamerRect]);

  const onMaterializeCompleteRef = useRef(onMaterializeComplete);
  onMaterializeCompleteRef.current = onMaterializeComplete;
  const onResolveCompleteRef = useRef(onResolveComplete);
  onResolveCompleteRef.current = onResolveComplete;
  const onPopCompleteRef = useRef(onPopComplete);
  onPopCompleteRef.current = onPopComplete;
  const onMergeCompleteRef = useRef(onMergeComplete);
  onMergeCompleteRef.current = onMergeComplete;

  const fireMaterializeComplete = useCallback(() => {
    onMaterializeCompleteRef.current?.();
  }, []);
  const fireResolveComplete = useCallback(() => {
    onResolveCompleteRef.current?.();
  }, []);
  const firePopComplete = useCallback(() => {
    onPopCompleteRef.current?.();
  }, []);
  const fireMergeComplete = useCallback(() => {
    onMergeCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (mergeGeometry == null) {
      return;
    }
    orbCenterX.value = mergeGeometry.centerX;
    orbCenterY.value = mergeGeometry.centerY;
    orbOverallOpacity.value = 1;
    orbTargetDiameter.value = withTiming(
      mergeGeometry.diameter,
      {
        duration: mergeDurationMs,
        easing: Easing.out(Easing.cubic),
      },
      finished => {
        'worklet';
        if (finished) {
          scheduleOnRN(fireMergeComplete);
        }
      },
    );
  }, [
    fireMergeComplete,
    mergeDurationMs,
    mergeGeometry,
    orbCenterX,
    orbCenterY,
    orbOverallOpacity,
    orbTargetDiameter,
  ]);

  useEffect(() => {
    if (orb == null || roundPhase !== 'materialize') {
      return;
    }
    orbCenterX.value = orb.fromCenterX;
    orbCenterY.value = orb.fromCenterY;
    orbTargetDiameter.value = orb.fromDiameter;
    orbOverallOpacity.value = 1;
    const id = setTimeout(fireMaterializeComplete, ROUND_MATERIALIZE_DURATION_MS);
    return () => clearTimeout(id);
  }, [
    fireMaterializeComplete,
    orb,
    orbCenterX,
    orbCenterY,
    orbOverallOpacity,
    orbTargetDiameter,
    roundPhase,
  ]);

  useEffect(() => {
    if (orb == null || roundPhase !== 'resolve') {
      return;
    }
    orbCenterX.value = withTiming(
      orb.toCenterX,
      {
        duration: orb.flyDurationMs,
        easing: Easing.inOut(Easing.cubic),
      },
      finished => {
        'worklet';
        if (finished) {
          scheduleOnRN(fireResolveComplete);
        }
      },
    );
    orbCenterY.value = withTiming(orb.toCenterY, {
      duration: orb.flyDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
    orbOverallOpacity.value = 1;
    orbTargetDiameter.value = withTiming(orb.toDiameter, {
      duration: orb.flyDurationMs,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [
    fireResolveComplete,
    orb,
    orbCenterX,
    orbCenterY,
    orbOverallOpacity,
    orbTargetDiameter,
    roundPhase,
  ]);

  useEffect(() => {
    if (orb == null || roundPhase !== 'pop') {
      return;
    }
    orbCenterX.value = orb.toCenterX;
    orbCenterY.value = orb.toCenterY;
    orbTargetDiameter.value = withTiming(
      0,
      {
        duration: ROUND_SOLVED_POP_DURATION_MS,
        easing: Easing.in(Easing.cubic),
      },
      finished => {
        'worklet';
        if (finished) {
          scheduleOnRN(firePopComplete);
        }
      },
    );
    orbOverallOpacity.value = withTiming(0, {
      duration: ROUND_SOLVED_POP_DURATION_MS,
      easing: Easing.in(Easing.cubic),
    });
  }, [
    firePopComplete,
    orb,
    orbCenterX,
    orbCenterY,
    orbOverallOpacity,
    orbTargetDiameter,
    roundPhase,
  ]);

  useEffect(() => {
    if (roundPhase === 'hold') {
      setShowTranslation(false);
    }
  }, [roundPhase]);

  const handleOrbTapJs = useCallback(() => {
    if (!translation) {
      return;
    }
    setShowTranslation(true);
    if (translateTimeoutRef.current != null) {
      clearTimeout(translateTimeoutRef.current);
    }
    translateTimeoutRef.current = setTimeout(() => {
      setShowTranslation(false);
      translateTimeoutRef.current = null;
    }, TRANSLATION_HOLD_MS);
  }, [translation]);

  const tapGesture = useTapGesture({
    maxDistance: TAP_MAX_DISTANCE_PX,
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(handleOrbTapJs);
    },
  });

  const activeWord = orb != null ? orb.word : mergeWord ?? '';
  const seed = useMemo(
    () => hashSeedString(`sentence-resolution-orb-${activeWord}`),
    [activeWord],
  );

  const isHolding = orb != null && roundPhase === 'hold';
  const visible =
    mergeWord != null ||
    (orb != null &&
      (roundPhase === 'materialize' ||
        roundPhase === 'resolve' ||
        roundPhase === 'hold' ||
        roundPhase === 'pop'));

  if (!visible || activeWord.length === 0) {
    return null;
  }

  const orbWord = orb != null && showTranslation && translation ? translation : activeWord;

  return (
    <>
      <FlowerGardenBigWordOrb
        centerX={orbCenterX}
        centerY={orbCenterY}
        targetDiameter={orbTargetDiameter}
        overallOpacity={orbOverallOpacity}
        word={orbWord}
        seed={seed}
      />
      {isHolding && translation && orb != null && (
        <GestureDetector gesture={tapGesture}>
          <View
            style={[
              styles.tapTarget,
              {
                left: orb.toCenterX - orb.toDiameter * 0.7,
                top: orb.toCenterY - orb.toDiameter * 0.7,
                width: orb.toDiameter * 1.4,
                height: orb.toDiameter * 1.4,
              },
            ]}
          />
        </GestureDetector>
      )}
    </>
  );
}

export type { ThemeResolutionOrbProps };

const styles = {
  tapTarget: {
    position: 'absolute' as const,
    zIndex: 10,
  },
};
