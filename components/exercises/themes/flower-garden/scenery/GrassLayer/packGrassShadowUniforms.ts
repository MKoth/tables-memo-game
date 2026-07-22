import type { GrassClusterConfig, GrassConfigParams } from './types';
import { MAX_GRASS_ELEMENTS } from './types';

export type GrassShadowUniforms = {
  shadowAngles: number[];
  shadowLengths: number[];
  shadowOpacities: number[];
  elementCount: number;
};

export function packGrassShadowUniforms(
  configs: GrassClusterConfig[],
  screenWidth: number,
  screenHeight: number,
  params: GrassConfigParams,
): GrassShadowUniforms {
  const halfWidth = screenWidth / 2;
  const shadowAngles: number[] = [];
  const shadowLengths: number[] = [];
  const shadowOpacities: number[] = [];

  for (const cluster of configs) {
    const clusterOffset = ((cluster.clusterX - halfWidth) / halfWidth) * params.shadowAngleIntensity;

    for (const element of cluster.elements) {
      const shadowAngle = element.inclineAngle + clusterOffset;
      const shadowLength = element.size * params.shadowLengthRatio;

      shadowAngles.push(shadowAngle);
      shadowLengths.push(shadowLength);
      shadowOpacities.push(params.shadowOpacity);
    }
  }

  const elementCount = shadowAngles.length;

  while (shadowAngles.length < MAX_GRASS_ELEMENTS) {
    shadowAngles.push(0);
  }
  while (shadowLengths.length < MAX_GRASS_ELEMENTS) {
    shadowLengths.push(0);
  }
  while (shadowOpacities.length < MAX_GRASS_ELEMENTS) {
    shadowOpacities.push(0);
  }

  return {
    shadowAngles,
    shadowLengths,
    shadowOpacities,
    elementCount,
  };
}
