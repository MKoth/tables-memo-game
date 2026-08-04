import { MAX_LEAVES_PER_STEM, type BushConfig } from '../BushShaderLayer/types';
import { singleStemShadowDefaults } from '../../shaders/singleStemShadow.sksl';
import { roseShadowDefaults } from '../../shaders/singleRoseShadow.sksl';
import type { SceneryShadowStyle } from './types';

export const MAX_SHADOW_LEAVES_PER_STEM = MAX_LEAVES_PER_STEM;

export type ResolvedSceneryShadowStyle = {
  lightOffset: [number, number];
  shadowColor: [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
  roseRadiusFraction: number;
  stemShadowWidthScale: number;
  stemShadowTopSkew: number;
  stemShadowTopBlur: number;
};

export function resolveSceneryShadowStyle(
  style: SceneryShadowStyle | undefined,
): ResolvedSceneryShadowStyle {
  return {
    lightOffset: [
      style?.lightOffset?.[0] ?? singleStemShadowDefaults.lightOffset[0],
      style?.lightOffset?.[1] ?? singleStemShadowDefaults.lightOffset[1],
    ],
    shadowColor: [
      style?.shadowColor?.[0] ?? singleStemShadowDefaults.shadowColor[0],
      style?.shadowColor?.[1] ?? singleStemShadowDefaults.shadowColor[1],
      style?.shadowColor?.[2] ?? singleStemShadowDefaults.shadowColor[2],
    ],
    shadowOpacity:
      style?.shadowOpacity ?? singleStemShadowDefaults.shadowOpacity,
    shadowSoftness:
      style?.shadowSoftness ?? singleStemShadowDefaults.shadowSoftness,
    roseRadiusFraction:
      style?.roseRadiusFraction ?? roseShadowDefaults.roseRadiusFraction,
    stemShadowWidthScale:
      style?.stemShadowWidthScale ??
      singleStemShadowDefaults.stemShadowWidthScale,
    stemShadowTopSkew:
      style?.stemShadowTopSkew ?? singleStemShadowDefaults.stemShadowTopSkew,
    stemShadowTopBlur:
      style?.stemShadowTopBlur ?? singleStemShadowDefaults.stemShadowTopBlur,
  };
}

export type StemShadowLeaf = {
  t: number;
  size: number;
};

export type StemShadowSlot = {
  baseX: number;
  baseY: number;
  topX: number;
  topY: number;
  controlX: number;
  controlY: number;
  baseWidth: number;
  topWidth: number;
  roseIndex: number;
  leaves: ReadonlyArray<StemShadowLeaf>;
};

export function pickStemList(
  bushConfigs: readonly BushConfig[],
  style: SceneryShadowStyle | undefined,
): StemShadowSlot[] {
  const s = resolveSceneryShadowStyle(style);
  const slots: StemShadowSlot[] = [];
  for (const bush of bushConfigs) {
    for (const stem of bush.stems) {
      slots.push({
        baseX: stem.baseX,
        baseY: stem.baseY,
        topX: stem.topX,
        topY: stem.topY,
        controlX: stem.controlX,
        controlY: stem.controlY,
        baseWidth: stem.baseWidth * s.stemShadowWidthScale,
        topWidth: stem.topWidth * s.stemShadowWidthScale,
        roseIndex: stem.roseIndex,
        leaves: stem.leaves.map(l => ({ t: l.t, size: l.size })),
      });
    }
  }
  return slots;
}

export type RoseShadowStaticUniforms = {
  lightOffset: [number, number];
  shadowColor: [number, number, number];
  shadowOpacity: number;
  shadowSoftness: number;
  shadowSquash: number;
  stemShadowTopSkew: number;
  roseShadowBase: number[];
};

export function pickRoseShadowBasePositions(
  bushConfigs: readonly BushConfig[],
  nRoses: number,
): number[] {
  const bases: number[] = [];
  for (let i = 0; i < nRoses; i++) {
    let baseX = 0;
    let baseY = 0;
    for (const bush of bushConfigs) {
      for (const stem of bush.stems) {
        if (stem.roseIndex === i) {
          baseX = stem.baseX;
          baseY = stem.baseY;
        }
      }
    }
    bases.push(baseX, baseY);
  }
  return bases;
}

export function pickRoseStaticUniforms(
  style: SceneryShadowStyle | undefined,
  bushConfigs: readonly BushConfig[],
  nRoses: number,
): RoseShadowStaticUniforms {
  const s = resolveSceneryShadowStyle(style);
  return {
    lightOffset: s.lightOffset,
    shadowColor: s.shadowColor,
    shadowOpacity: s.shadowOpacity,
    shadowSoftness: s.shadowSoftness,
    shadowSquash: 1.0,
    stemShadowTopSkew: s.stemShadowTopSkew,
    roseShadowBase: pickRoseShadowBasePositions(bushConfigs, nRoses),
  };
}

export const ROSE_SHADOW_RECT_EPSILON = 2;

export type RoseShadowRectGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoseShadowRectStyle = {
  lightOffset: readonly [number, number];
  stemShadowTopSkew: number;
  shadowSquash: number;
};

export function pickRoseShadowRect(
  centerX: number,
  centerY: number,
  baseX: number,
  baseY: number,
  radius: number,
  style: RoseShadowRectStyle,
): RoseShadowRectGeometry {
  'worklet';
  const skew = style.stemShadowTopSkew;
  const cx = (centerX + style.lightOffset[0]) * (1 - skew) + baseX * skew;
  const cy = (centerY + style.lightOffset[1]) * (1 - skew) + baseY * skew;
  const rx = radius + ROSE_SHADOW_RECT_EPSILON;
  const ry = radius * style.shadowSquash + ROSE_SHADOW_RECT_EPSILON;
  return {
    x: cx - rx,
    y: cy - ry,
    width: rx * 2,
    height: ry * 2,
  };
}
