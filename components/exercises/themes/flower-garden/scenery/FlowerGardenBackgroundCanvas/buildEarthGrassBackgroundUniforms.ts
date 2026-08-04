import type { EarthGrassBackgroundConfig } from '../../shaders/earthGrassBackground.sksl';

export type EarthGrassBackgroundUniforms = {
  center: [number, number];
  radius: [number, number];
  waveAmplitude: number;
  waveFrequency: number;
  noiseAmount: number;
  noiseScale: number;
  resolutionScale: number;
  grassUvScale: number;
  brightness: number;
};

export type BuildEarthGrassBackgroundUniformsOptions = {
  grassScale?: number;
  brightness?: number;
};

export function buildEarthGrassBackgroundUniforms(
  config: EarthGrassBackgroundConfig,
  width: number,
  height: number,
  options: BuildEarthGrassBackgroundUniformsOptions = {},
): EarthGrassBackgroundUniforms {
  const cx = (config.centerX ?? 0.5) * width;
  const cy = (config.centerY ?? 0.35) * height;
  const rX = (config.minDiameter ?? 480) * 0.5;
  const rY = (config.maxDiameter ?? 360) * 0.5;

  return {
    center: [cx, cy],
    radius: [rX, rY],
    waveAmplitude: config.waveAmplitude ?? 0.15,
    waveFrequency: (2 * Math.PI) / (config.waveLength ?? 60),
    noiseAmount: config.noiseAmount ?? 0,
    noiseScale: config.noiseScale ?? 0.05,
    resolutionScale: 1.0,
    grassUvScale: options.grassScale ?? 1,
    brightness: options.brightness ?? 1.5,
  };
}
