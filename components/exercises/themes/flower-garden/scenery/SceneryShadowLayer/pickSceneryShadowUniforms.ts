import type { BushConfig } from '../BushShaderLayer/types';
import { singleStemShadowDefaults } from '../../shaders/singleStemShadow.sksl';
import { roseShadowDefaults } from '../../shaders/roseShadows.sksl';
import type { SceneryShadowStyle } from './types';

function padArray(arr: readonly number[], target: number, fill = 0): number[] {
  return [...arr, ...Array(Math.max(0, target - arr.length)).fill(fill)];
}

const MAX_ROSE_SHADOWS = 64;

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

export type StemShadowSlot = {
  baseX: number;
  baseY: number;
  topX: number;
  topY: number;
  baseWidth: number;
  topWidth: number;
  roseIndex: number;
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
        baseWidth: stem.baseWidth * s.stemShadowWidthScale,
        topWidth: stem.topWidth * s.stemShadowWidthScale,
        roseIndex: stem.roseIndex,
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
  const slotCount = Math.min(nRoses, MAX_ROSE_SHADOWS);
  for (let i = 0; i < slotCount; i++) {
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
  return padArray(bases, MAX_ROSE_SHADOWS * 2);
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

export type RoseShadowMotionUniforms = {
  roseShadowCount: number;
  roseShadowCenter: number[];
  roseShadowRadius: number[];
};

export function pickRoseMotionUniforms(
  layoutX: readonly number[],
  layoutY: readonly number[],
  bodySizes: readonly number[],
  roseRadiusFraction: number,
): RoseShadowMotionUniforms {
  const count = Math.min(
    layoutX.length,
    layoutY.length,
    bodySizes.length,
    MAX_ROSE_SHADOWS,
  );
  const centers: number[] = [];
  const radii: number[] = [];
  for (let i = 0; i < count; i++) {
    centers.push(layoutX[i] ?? 0, layoutY[i] ?? 0);
    radii.push((bodySizes[i] ?? 0) * roseRadiusFraction);
  }
  return {
    roseShadowCount: count,
    roseShadowCenter: padArray(centers, MAX_ROSE_SHADOWS * 2),
    roseShadowRadius: padArray(radii, MAX_ROSE_SHADOWS),
  };
}
