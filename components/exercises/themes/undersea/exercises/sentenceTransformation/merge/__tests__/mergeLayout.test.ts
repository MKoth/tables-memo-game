import {
  computeLetterLayout,
  type LetterLayout,
} from '../../../../../../core/layout/exerciseLayout';
import type { ZoneRect } from '../../../../../../core/layout/computeExerciseLayout';
import {
  buildMergeShaderUniforms,
  computeMergeEndLayout,
  computeMergeTarget,
  interpolateMergeLetterState,
  MERGE_SHADER_MAX_LETTERS,
} from '../mergeLayout';

const ROAMER_RECT: ZoneRect = { x: 40, y: 80, w: 720, h: 360 };

describe('computeMergeTarget', () => {
  it('centers merge on the midpoint of the letter row', () => {
    const layout = computeLetterLayout(ROAMER_RECT, 4);

    const { mergeCenterX } = computeMergeTarget(layout, ROAMER_RECT);

    expect(mergeCenterX).toBe((layout.centers[0]! + layout.centers[3]!) * 0.5);
  });

  it('shrinks merged diameter to at least 48px', () => {
    const layout: LetterLayout = {
      diameter: 40,
      rowY: 120,
      centers: [100, 150, 200],
    };

    const { mergeDiameter } = computeMergeTarget(layout, ROAMER_RECT);

    expect(mergeDiameter).toBeGreaterThanOrEqual(48);
  });
});

describe('interpolateMergeLetterState', () => {
  const layout = computeLetterLayout(ROAMER_RECT, 3);
  const { mergeCenterX, mergeDiameter } = computeMergeTarget(layout, ROAMER_RECT);

  it('starts at the spread letter layout when merge progress is zero', () => {
    const state = interpolateMergeLetterState(
      layout,
      mergeCenterX,
      mergeDiameter,
      0,
      1,
    );

    expect(state.centerX).toBe(layout.centers[1]);
    expect(state.centerY).toBe(layout.rowY);
    expect(state.diameter).toBe(layout.diameter);
  });

  it('ends at the merge center when merge progress is one', () => {
    const state = interpolateMergeLetterState(
      layout,
      mergeCenterX,
      mergeDiameter,
      1,
      1,
    );

    expect(state.centerX).toBe(mergeCenterX);
    expect(state.centerY).toBe(layout.rowY);
    expect(state.diameter).toBe(mergeDiameter);
  });
});

describe('buildMergeShaderUniforms', () => {
  it('shares merge progress with interpolated letter centers', () => {
    const layout = computeLetterLayout(ROAMER_RECT, 3);
    const target = computeMergeTarget(layout, ROAMER_RECT);
    const mergeProgress = 0.5;

    const uniforms = buildMergeShaderUniforms(
      layout,
      target.mergeCenterX,
      target.mergeDiameter,
      mergeProgress,
    );

    expect(uniforms.mergeProgress).toBe(mergeProgress);
    expect(uniforms.letterCount).toBe(3);
    expect(uniforms.letterCenters[0][0]).toBe(
      interpolateMergeLetterState(
        layout,
        target.mergeCenterX,
        target.mergeDiameter,
        mergeProgress,
        0,
      ).centerX,
    );
  });

describe('computeMergeEndLayout', () => {
  it('centers merge on the midpoint of the letter row', () => {
    const { mergeCenterX } = computeMergeEndLayout(ROAMER_RECT, 'cantamos');

    expect(mergeCenterX).toBeGreaterThan(ROAMER_RECT.x);
    expect(mergeCenterX).toBeLessThan(ROAMER_RECT.x + ROAMER_RECT.w);
  });

  it('returns letterCenters matching computeLetterLayout centers', () => {
    const layout = computeLetterLayout(ROAMER_RECT, 8);
    const { letterCenters } = computeMergeEndLayout(ROAMER_RECT, 'cantamos');

    expect(letterCenters).toEqual(layout.centers);
  });

  it('returns mergeDiameter at least the letter diameter scaled', () => {
    const layout = computeLetterLayout(ROAMER_RECT, 4);
    const { mergeDiameter } = computeMergeEndLayout(ROAMER_RECT, 'hablo');

    expect(mergeDiameter).toBeGreaterThanOrEqual(layout.diameter * 1.4);
  });

  it('handles empty word gracefully', () => {
    const { mergeCenterX, letterCenters } = computeMergeEndLayout(ROAMER_RECT, '');

    expect(mergeCenterX).toBe(ROAMER_RECT.x + ROAMER_RECT.w * 0.5);
    expect(letterCenters).toEqual([]);
  });
});

  it('zeroes out unused shader slots beyond the letter count', () => {
    const layout = computeLetterLayout(ROAMER_RECT, 2);
    const target = computeMergeTarget(layout, ROAMER_RECT);

    const uniforms = buildMergeShaderUniforms(
      layout,
      target.mergeCenterX,
      target.mergeDiameter,
      0.25,
    );

    expect(uniforms.letterCenters).toHaveLength(MERGE_SHADER_MAX_LETTERS);
    expect(uniforms.letterCenters[2]).toEqual([0, 0, 0]);
  });
});
