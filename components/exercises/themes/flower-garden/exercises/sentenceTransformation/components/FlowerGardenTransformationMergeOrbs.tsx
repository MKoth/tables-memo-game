import React, { useCallback, useEffect, useMemo } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { computeLetterLayout } from '../../../../../core/layout/exerciseLayout';
import { useExerciseLayout } from '../../../../../core';
import { ROUND_MERGE_DURATION_MS } from '../../../../../sentenceTransformation/domain/roundResolutionTiming';
import { hashSeedString } from '../../../scenery/BushShaderLayer/helpers/seededRandom';
import { FlowerGardenBigWordOrb } from './FlowerGardenBigWordOrb';

export type FlowerGardenTransformationMergeOrbsProps = {
  word: string;
  durationMs?: number;
  onComplete?: () => void;
  /** Merge point (letter-row center) — defaults to the computed letter-row midpoint. */
  centerX?: number;
  centerY?: number;
  /** Final orb diameter (blank-slot footprint) — defaults to the computed footprint. */
  diameter?: number;
};

/** Blank footprint diameter for a word, mirroring `computeSentenceRowLayout`'s cap. */
export function computeMergeOrbDiameter(
  wordLength: number,
  zoneWidth: number,
  zoneHeight: number,
): number {
  const letterLayout = computeLetterLayout(
    { x: 0, y: 0, w: zoneWidth, h: zoneHeight },
    wordLength,
  );
  const gap = letterLayout.diameter * 0.26;
  const naturalWidth =
    wordLength > 0
      ? wordLength * letterLayout.diameter + (wordLength - 1) * gap
      : letterLayout.diameter * 1.4;
  return Math.min(naturalWidth, zoneWidth * 0.45, zoneHeight * 0.65, 90 * 2.0);
}

const ORB_MOUNT_DIAMETER = 1;

export function FlowerGardenTransformationMergeOrbs({
  word,
  durationMs = ROUND_MERGE_DURATION_MS,
  onComplete,
  centerX,
  centerY,
  diameter,
}: FlowerGardenTransformationMergeOrbsProps) {
  const { roamerRect } = useExerciseLayout();

  const geometry = useMemo(() => {
    const layout = computeLetterLayout(roamerRect, word.length);
    const first = layout.centers[0] ?? roamerRect.x + roamerRect.w * 0.5;
    const last = layout.centers[layout.centers.length - 1] ?? first;
    const mergeCenterX = (first + last) * 0.5;
    const mergeCenterY = layout.rowY;
    const orbDiameter =
      diameter ??
      computeMergeOrbDiameter(word.length, roamerRect.w, roamerRect.h);
    return {
      centerX: centerX ?? mergeCenterX,
      centerY: centerY ?? mergeCenterY,
      diameter: orbDiameter,
    };
  }, [roamerRect, word.length, centerX, centerY, diameter]);

  const seed = useMemo(() => hashSeedString(`sentence-merge-orb-${word}`), [word]);
  const orbCenterX = useSharedValue(0);
  const orbCenterY = useSharedValue(0);
  const orbTargetDiameter = useSharedValue(ORB_MOUNT_DIAMETER);
  const orbOverallOpacity = useSharedValue(1);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  const fireComplete = useCallback(() => {
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    orbCenterX.value = geometry.centerX;
    orbCenterY.value = geometry.centerY;
    orbOverallOpacity.value = 1;
    orbTargetDiameter.value = withTiming(
      geometry.diameter,
      {
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
      },
      finished => {
        'worklet';
        if (finished) {
          scheduleOnRN(fireComplete);
        }
      },
    );
  }, [
    durationMs,
    fireComplete,
    geometry,
    orbCenterX,
    orbCenterY,
    orbOverallOpacity,
    orbTargetDiameter,
  ]);

  if (word.length === 0) {
    return null;
  }

  return (
    <FlowerGardenBigWordOrb
      centerX={orbCenterX}
      centerY={orbCenterY}
      targetDiameter={orbTargetDiameter}
      overallOpacity={orbOverallOpacity}
      word={word}
      seed={seed}
    />
  );
}
