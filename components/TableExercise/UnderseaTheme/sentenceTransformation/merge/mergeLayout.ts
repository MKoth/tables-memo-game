import type { LetterLayout } from '../../core/layout/underseaExerciseLayout';
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
): MergeLetterState {
  'worklet';
  // Default behaviour: move each letter toward the merge center.
  // When position and letterCount are provided, arrange letters into
  // a horizontal word layout centered on mergeCenterX at the end of the
  // merge (mergeProgress === 1) so they don't overlap.
  // Use eased progress for diameter so circles grow smoothly (avoid sudden shrink/expand).
  const eased = smoothStep(0, 1, mergeProgress);
  // Ensure per-letter diameter never becomes smaller than the initial diameter.
  const targetDiameter = Math.max(initialDiameter, lerp(initialDiameter, mergeDiameter, eased));
  let targetCenterX = mergeCenterX;

  if (position !== undefined && letterCount && letterCount > 0) {
    // spacing between letters at the final arrangement.
    // Use the initial diameter as baseline, scaled slightly down so letters sit closer.
    const baseSpacing = initialDiameter * 0.9;
    // If mergeDiameter is large enough to host the whole word, use it to scale spacing.
    const availableSpacing = mergeDiameter / Math.max(letterCount, 1);
    const spacing = Math.min(baseSpacing, Math.max(availableSpacing, baseSpacing * 0.6));
    const centerIndex = (letterCount - 1) / 2;
    targetCenterX = mergeCenterX + (position - centerIndex) * spacing;
  }

  return {
    // Use linear interpolation for center so letters travel predictably,
    // but use eased diameter above for smoother visual growth.
    centerX: lerp(initialCenterX, targetCenterX, mergeProgress),
    centerY: rowY,
    diameter: targetDiameter,
  };
}

export function computeMergeTarget(
  layout: LetterLayout,
  koiRect: ZoneRect,
): { mergeCenterX: number; mergeDiameter: number } {
  'worklet';
  const mergeCenterX =
    layout.centers.length === 0
      ? koiRect.x + koiRect.w * 0.5
      : (layout.centers[0]! + layout.centers[layout.centers.length - 1]!) * 0.5;
  const mergeDiameter = Math.max(layout.diameter * 1.4, 48);
  return { mergeCenterX, mergeDiameter };
}

export function interpolateMergeLetterState(
  layout: LetterLayout,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
  position: number,
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
  );
}

export function buildMergeShaderUniforms(
  layout: LetterLayout,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
  maxLetters?: number,
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
      );
      letterCenters.push([state.centerX, state.centerY, state.diameter * 0.5]);
    } else {
      letterCenters.push([0, 0, 0]);
    }
  }

  const baseOpacity = lerp(1.0, 1.0, mergeProgress);
  return { mergeProgress, letterCount, letterCenters, baseOpacity };
}
