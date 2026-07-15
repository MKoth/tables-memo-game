import {
  type LetterLayout,
  computeLetterLayout,
} from '../../core/layout/underseaExerciseLayout';
import type { ZoneRect } from '../../core/layout/computeUnderseaThemeLayout';

/** Upper bound on letter uniforms passed to the metaball shader. */
export const MERGE_SHADER_MAX_LETTERS = 10;

export type MergeLetterState = {
  centerX: number;
  centerY: number;
  diameter: number;
};

export type MergeShaderCenter = {
  x: number;
  y: number;
  radius: number;
};

export type MergeShaderUniforms = {
  mergeProgress: number;
  letterCount: number;
  letterCenters: number[][];
  baseOpacity: number;
};

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  'worklet';
  if (edge1 === edge0) {
    return x >= edge1 ? 1 : 0;
  }
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function interpolateMergeLetterStateAt(
  initialCenterX: number,
  rowY: number,
  initialDiameter: number,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
  position?: number,
  letterCount?: number,
  finalLetterSpacing?: number,
): MergeLetterState {
  'worklet';
  const eased = smoothStep(0, 1, mergeProgress);
  const targetDiameter = Math.max(initialDiameter, lerp(initialDiameter, mergeDiameter, eased));
  let targetCenterX = mergeCenterX;

  if (position !== undefined && letterCount && letterCount > 0) {
    let spacing: number;
    if (finalLetterSpacing !== undefined) {
      spacing = finalLetterSpacing;
    } else {
      const baseSpacing = initialDiameter * 0.9;
      const availableSpacing = mergeDiameter / Math.max(letterCount, 1);
      spacing = Math.min(baseSpacing, Math.max(availableSpacing, baseSpacing * 0.6));
    }
    const centerIndex = (letterCount - 1) / 2;
    targetCenterX = mergeCenterX + (position - centerIndex) * spacing;
  }

  return {
    centerX: lerp(initialCenterX, targetCenterX, mergeProgress),
    centerY: rowY,
    diameter: targetDiameter,
  };
}

export function computeMergeTarget(
  layout: LetterLayout,
  koiRect: ZoneRect,
): { mergeCenterX: number; mergeDiameter: number; finalLetterSpacing: number } {
  'worklet';
  const mergeCenterX =
    layout.centers.length === 0
      ? koiRect.x + koiRect.w * 0.5
      : (layout.centers[0]! + layout.centers[layout.centers.length - 1]!) * 0.5;
  const mergeDiameter = Math.max(layout.diameter * 1.4, 48);
  const gapRatio = 0.26;
  const finalLetterSpacing = layout.diameter * (1 + gapRatio);
  return { mergeCenterX, mergeDiameter, finalLetterSpacing };
}

export function interpolateMergeLetterState(
  layout: LetterLayout,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
  position: number,
  finalLetterSpacing?: number,
): MergeLetterState {
  'worklet';
  const initialCenterX = layout.centers[position] ?? mergeCenterX;
  return interpolateMergeLetterStateAt(
    initialCenterX,
    layout.rowY,
    layout.diameter,
    mergeCenterX,
    mergeDiameter,
    mergeProgress,
    position,
    layout.centers.length,
    finalLetterSpacing,
  );
}

export function computeMergeEndLayout(
  koiRect: ZoneRect,
  word: string,
): { mergeCenterX: number; mergeCenterY: number; mergeDiameter: number; letterCenters: number[] } {
  'worklet';
  const letterLayout = computeLetterLayout(koiRect, word.length);
  const mergeCenterX =
    letterLayout.centers.length > 0
      ? (letterLayout.centers[0]! +
          letterLayout.centers[letterLayout.centers.length - 1]!) *
        0.5
      : koiRect.x + koiRect.w * 0.5;
  const mergeDiameter = Math.max(letterLayout.diameter * 1.4, 48);
  return {
    mergeCenterX,
    mergeCenterY: letterLayout.rowY,
    mergeDiameter,
    letterCenters: letterLayout.centers,
  };
}

export function buildMergeShaderUniforms(
  layout: LetterLayout,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
  maxLetters?: number,
  finalLetterSpacing?: number,
): MergeShaderUniforms {
  'worklet';
  const resolvedMaxLetters = maxLetters ?? 10;
  const letterCount = Math.min(layout.centers.length, resolvedMaxLetters);
  const letterCenters: number[][] = [];

  for (let i = 0; i < resolvedMaxLetters; i++) {
    if (i < letterCount) {
      const state = interpolateMergeLetterState(
        layout,
        mergeCenterX,
        mergeDiameter,
        mergeProgress,
        i,
        finalLetterSpacing,
      );
      letterCenters.push([state.centerX, state.centerY, state.diameter * 0.5]);
    } else {
      letterCenters.push([0, 0, 0]);
    }
  }

  const baseOpacity = lerp(1.0, 1.0, mergeProgress);
  return { mergeProgress, letterCount, letterCenters, baseOpacity };
}
