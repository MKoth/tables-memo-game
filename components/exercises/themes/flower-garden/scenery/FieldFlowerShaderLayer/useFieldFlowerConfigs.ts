import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { createRng, hashSeedString } from '../BushShaderLayer/helpers/seededRandom';
import {
  generateFieldFlowerConfigs,
  type GenerateFieldFlowerConfigsInput,
} from './generateFieldFlowerConfigs';
import type { FieldFlowerConfig } from './types';

const FIELD_FLOWER_SEED = 'field-flower-scenery-v1';

export const DEFAULT_FIELD_FLOWER_COUNT = 12;
export const DEFAULT_MIN_LEAVES = 5;
export const DEFAULT_MAX_LEAVES = 7;
export const DEFAULT_MIN_DISTANCE = 190;
export const DEFAULT_LOWER_SCREEN_FRACTION = 0.4;
export const DEFAULT_MIN_FLOWER_SIZE = 45;
export const DEFAULT_MAX_FLOWER_SIZE = 65;
export const DEFAULT_MIN_LEAF_LENGTH = 30;
export const DEFAULT_MAX_LEAF_LENGTH = 45;
export const DEFAULT_MIN_LEAF_WIDTH = 25;
export const DEFAULT_MAX_LEAF_WIDTH = 32;
export const DEFAULT_STEM_BASE_WIDTH = 5;
export const DEFAULT_STEM_TOP_WIDTH = 12;
export const DEFAULT_OFFSET_X = 0;
export const DEFAULT_OFFSET_Y = 0;
export const DEFAULT_OFFSET_SCALE = 1;
export const DEFAULT_CLUSTER_SHADOW_OFFSET_X = 0;
export const DEFAULT_CLUSTER_SHADOW_OFFSET_Y = -10;
export const DEFAULT_FLOWER_TOP_SHADOW_OFFSET_X = 0;
export const DEFAULT_FLOWER_TOP_SHADOW_OFFSET_Y = -30;
export const DEFAULT_BOTTOM_PADDING = 60;

export type UseFieldFlowerConfigsOptions = {
  count?: number;
  minLeaves?: number;
  maxLeaves?: number;
  minDistance?: number;
  lowerScreenFraction?: number;
  minFlowerSize?: number;
  maxFlowerSize?: number;
  minLeafLength?: number;
  maxLeafLength?: number;
  minLeafWidth?: number;
  maxLeafWidth?: number;
  stemBaseWidth?: number;
  stemTopWidth?: number;
  offsetX?: number;
  offsetY?: number;
  offsetScale?: number;
  clusterShadowOffsetX?: number;
  clusterShadowOffsetY?: number;
  flowerTopShadowOffsetX?: number;
  flowerTopShadowOffsetY?: number;
  bottomPadding?: number;
};

export function useFieldFlowerConfigs(
  options: UseFieldFlowerConfigsOptions = {},
): FieldFlowerConfig[] {
  const { width, height } = useWindowDimensions();

  const count = options.count ?? DEFAULT_FIELD_FLOWER_COUNT;
  const minLeaves = options.minLeaves ?? DEFAULT_MIN_LEAVES;
  const maxLeaves = options.maxLeaves ?? DEFAULT_MAX_LEAVES;
  const lowerScreenFraction = options.lowerScreenFraction ?? DEFAULT_LOWER_SCREEN_FRACTION;
  const minDistance = options.minDistance ?? DEFAULT_MIN_DISTANCE;
  const minFlowerSize = options.minFlowerSize ?? DEFAULT_MIN_FLOWER_SIZE;
  const maxFlowerSize = options.maxFlowerSize ?? DEFAULT_MAX_FLOWER_SIZE;
  const minLeafLength = options.minLeafLength ?? DEFAULT_MIN_LEAF_LENGTH;
  const maxLeafLength = options.maxLeafLength ?? DEFAULT_MAX_LEAF_LENGTH;
  const minLeafWidth = options.minLeafWidth ?? DEFAULT_MIN_LEAF_WIDTH;
  const maxLeafWidth = options.maxLeafWidth ?? DEFAULT_MAX_LEAF_WIDTH;
  const stemBaseWidth = options.stemBaseWidth ?? DEFAULT_STEM_BASE_WIDTH;
  const stemTopWidth = options.stemTopWidth ?? DEFAULT_STEM_TOP_WIDTH;
  const offsetX = options.offsetX ?? DEFAULT_OFFSET_X;
  const offsetY = options.offsetY ?? DEFAULT_OFFSET_Y;
  const offsetScale = options.offsetScale ?? DEFAULT_OFFSET_SCALE;
  const clusterShadowOffsetX = options.clusterShadowOffsetX ?? DEFAULT_CLUSTER_SHADOW_OFFSET_X;
  const clusterShadowOffsetY = options.clusterShadowOffsetY ?? DEFAULT_CLUSTER_SHADOW_OFFSET_Y;
  const flowerTopShadowOffsetX = options.flowerTopShadowOffsetX ?? DEFAULT_FLOWER_TOP_SHADOW_OFFSET_X;
  const flowerTopShadowOffsetY = options.flowerTopShadowOffsetY ?? DEFAULT_FLOWER_TOP_SHADOW_OFFSET_Y;
  const bottomPadding = options.bottomPadding ?? DEFAULT_BOTTOM_PADDING;

  return useMemo(() => {
    if (width === 0 || height === 0) return [];

    const input: GenerateFieldFlowerConfigsInput = {
      screenWidth: width,
      screenHeight: height,
      rng: createRng(hashSeedString(FIELD_FLOWER_SEED)),
      count,
      minLeaves,
      maxLeaves,
      lowerScreenFraction,
      minDistance,
      minFlowerSize,
      maxFlowerSize,
      minLeafLength,
      maxLeafLength,
      minLeafWidth,
      maxLeafWidth,
      stemBaseWidth,
      stemTopWidth,
      offsetX,
      offsetY,
      offsetScale,
      clusterShadowOffsetX,
      clusterShadowOffsetY,
      flowerTopShadowOffsetX,
      flowerTopShadowOffsetY,
      bottomPadding,
    };

    return generateFieldFlowerConfigs(input);
  }, [
    width,
    height,
    count,
    minLeaves,
    maxLeaves,
    lowerScreenFraction,
    minDistance,
    minFlowerSize,
    maxFlowerSize,
    minLeafLength,
    maxLeafLength,
    minLeafWidth,
    maxLeafWidth,
    stemBaseWidth,
    stemTopWidth,
    offsetX,
    offsetY,
    offsetScale,
    clusterShadowOffsetX,
    clusterShadowOffsetY,
    flowerTopShadowOffsetX,
    flowerTopShadowOffsetY,
    bottomPadding,
  ]);
}
