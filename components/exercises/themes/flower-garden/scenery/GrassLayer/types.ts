export type GrassConfigParams = {
  clustersPerScreen: number;
  minGrassPerCluster: number;
  maxGrassPerCluster: number;
  clusterAngleIntensity: number;
  skewIntensity: number;
  elementMinSize: number;
  elementMaxSize: number;
  shadowOpacity: number;
  shadowAngleIntensity: number;
  shadowLengthRatio: number;
};

export type GrassElementConfig = {
  imageVariant: number;
  inclineAngle: number;
  size: number;
};

export type GrassClusterConfig = {
  clusterX: number;
  clusterY: number;
  clusterBiasAngle: number;
  elements: GrassElementConfig[];
};

export const DEFAULT_GRASS_CONFIG_PARAMS: GrassConfigParams = {
  clustersPerScreen: 30,
  minGrassPerCluster: 3,
  maxGrassPerCluster: 7,
  clusterAngleIntensity: Math.PI / 4,
  skewIntensity: 0.3,
  elementMinSize: 20,
  elementMaxSize: 40,
  shadowOpacity: 0.3,
  shadowAngleIntensity: Math.PI / 4,
  shadowLengthRatio: 0.5,
};

export const MAX_GRASS_ELEMENTS = 300;
