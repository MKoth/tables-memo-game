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
  centers: MergeShaderCenter[];
};

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

export function interpolateMergeLetterStateAt(
  initialCenterX: number,
  rowY: number,
  initialDiameter: number,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
): MergeLetterState {
  'worklet';
  return {
    centerX: lerp(initialCenterX, mergeCenterX, mergeProgress),
    centerY: rowY,
    diameter: lerp(initialDiameter, mergeDiameter, mergeProgress),
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
  const mergeDiameter = Math.max(layout.diameter * 0.55, 28);
  return { mergeCenterX, mergeDiameter };
}

export function interpolateMergeLetterState(
  layout: LetterLayout,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
  position: number,
): MergeLetterState {
  const initialCenterX = layout.centers[position] ?? mergeCenterX;
  return interpolateMergeLetterStateAt(
    initialCenterX,
    layout.rowY,
    layout.diameter,
    mergeCenterX,
    mergeDiameter,
    mergeProgress,
  );
}

export function buildMergeShaderUniforms(
  layout: LetterLayout,
  mergeCenterX: number,
  mergeDiameter: number,
  mergeProgress: number,
  maxLetters: number = MERGE_SHADER_MAX_LETTERS,
): MergeShaderUniforms {
  'worklet';
  const letterCount = Math.min(layout.centers.length, maxLetters);
  const centers: MergeShaderCenter[] = [];

  for (let i = 0; i < maxLetters; i++) {
    if (i < letterCount) {
      const state = interpolateMergeLetterState(
        layout,
        mergeCenterX,
        mergeDiameter,
        mergeProgress,
        i,
      );
      centers.push({
        x: state.centerX,
        y: state.centerY,
        radius: state.diameter * 0.5,
      });
    } else {
      centers.push({ x: 0, y: 0, radius: 0 });
    }
  }

  return { mergeProgress, letterCount, centers };
}
