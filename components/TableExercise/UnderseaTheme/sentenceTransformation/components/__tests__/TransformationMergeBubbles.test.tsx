import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { computeLetterLayout } from '../../../core/layout/underseaExerciseLayout';
import type { ZoneRect } from '../../../core/layout/computeUnderseaThemeLayout';
import {
  buildMergeShaderUniforms,
  computeMergeTarget,
  interpolateMergeLetterState,
} from '../../merge/mergeLayout';

const KOI_RECT: ZoneRect = { x: 40, y: 80, w: 720, h: 360 };
const MOCK_MERGE_PROGRESS = { value: 0.4 };

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  useSharedValue: (initial: number) => ({ value: initial }),
  withTiming: (value: number) => value,
  Easing: { inOut: () => (t: number) => t, cubic: (t: number) => t },
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: () => void) => fn(),
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  return {
    Canvas: ({ children }: { children: React.ReactNode }) => children,
    Group: ({ children }: { children?: React.ReactNode }) => children ?? null,
    Glyphs: () => null,
    matchFont: () => ({
      getGlyphIDs: () => [1],
      getTextWidth: () => 12,
      getMetrics: () => ({ ascent: 10, descent: -2 }),
    }),
    vec: (x: number, y: number) => ({ x, y }),
  };
});

jest.mock('../../../core/providers/UnderseaThemeLayoutProvider', () => ({
  useUnderseaThemeLayout: () => ({ koiRect: KOI_RECT }),
}));

jest.mock('../../../core/providers/UnderseaThemeAssetsProvider', () => ({
  useUnderseaThemeAssetsContext: () => ({ images: { bubble: {} } }),
}));

jest.mock('../../merge/useMergeProgress', () => ({
  useMergeProgress: () => MOCK_MERGE_PROGRESS,
}));

jest.mock('../../merge/MetaballMergeLayer', () => ({
  MetaballMergeLayer: () => null,
}));

jest.mock('../../merge/MergeLetterLabels', () => ({
  MergeLetterLabels: () => null,
}));

import { TransformationMergeBubbles } from '../TransformationMergeBubbles';

describe('TransformationMergeBubbles', () => {
  it('renders the merge layer and keeps shader uniforms aligned with letter positions', async () => {
    const word = 'hola';
    const layout = computeLetterLayout(KOI_RECT, word.length);
    const target = computeMergeTarget(layout, KOI_RECT);
    const mergeProgress = MOCK_MERGE_PROGRESS.value;

    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <TransformationMergeBubbles word={word} onComplete={jest.fn()} />,
      );
    });

    const uniforms = buildMergeShaderUniforms(
      layout,
      target.mergeCenterX,
      target.mergeDiameter,
      mergeProgress,
    );
    const letterState = interpolateMergeLetterState(
      layout,
      target.mergeCenterX,
      target.mergeDiameter,
      mergeProgress,
      0,
    );

    expect(uniforms.mergeProgress).toBe(mergeProgress);
    expect(uniforms.letterCenters[0][0]).toBe(letterState.centerX);
  });
});
