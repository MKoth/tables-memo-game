import type { GrassClusterConfig, GrassConfigParams } from './types';

function randomIntInRange(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function generateGrassConfigs(
  screenWidth: number,
  screenHeight: number,
  rng: () => number,
  params: GrassConfigParams,
): GrassClusterConfig[] {
  if (screenWidth <= 0 || screenHeight <= 0) {
    return [];
  }

  const halfWidth = screenWidth / 2;
  const configs: GrassClusterConfig[] = [];
  let globalVariantCounter = 0;

  for (let i = 0; i < params.clustersPerScreen; i++) {
    const clusterX = rng() * screenWidth;
    const clusterY = rng() * screenHeight;
    const clusterBiasAngle = ((clusterX - halfWidth) / halfWidth) * params.clusterAngleIntensity;

    const nElements = randomIntInRange(rng, params.minGrassPerCluster, params.maxGrassPerCluster);
    const elements = [];

    for (let j = 0; j < nElements; j++) {
      const elementRadialAngle = (j / nElements) * Math.PI * 2;
      const inclineAngle = elementRadialAngle + clusterBiasAngle;
      const imageVariant = globalVariantCounter % 10;
      const size = randomInRange(rng, params.elementMinSize, params.elementMaxSize);

      elements.push({
        imageVariant,
        inclineAngle,
        size,
      });

      globalVariantCounter++;
    }

    configs.push({
      clusterX,
      clusterY,
      clusterBiasAngle,
      elements,
    });
  }

  return configs;
}
