import {
  buildEarthGrassBackgroundUniforms,
} from '../buildEarthGrassBackgroundUniforms';

const SCREEN_W = 390;
const SCREEN_H = 844;

describe('buildEarthGrassBackgroundUniforms', () => {
  it('projects center ratios into pixel coordinates and halves diameters into radii', () => {
    const uniforms = buildEarthGrassBackgroundUniforms(
      {
        centerX: 0.5,
        centerY: 0.41,
        minDiameter: 400,
        maxDiameter: 370,
        waveAmplitude: 0.1,
        waveLength: 0.8,
        noiseAmount: 0.15,
        noiseScale: 0.2,
      },
      SCREEN_W,
      SCREEN_H,
    );

    expect(uniforms.center[0]).toBe(195);
    expect(uniforms.center[1]).toBeCloseTo(346.04, 5);
    expect(uniforms.radius).toEqual([200, 185]);
  });

  it('converts the wavelength into an angular wave frequency', () => {
    const uniforms = buildEarthGrassBackgroundUniforms(
      { waveLength: 0.8 },
      SCREEN_W,
      SCREEN_H,
    );

    expect(uniforms.waveFrequency).toBeCloseTo((2 * Math.PI) / 0.8, 5);
  });

  it('passes the wave and noise parameters through unchanged', () => {
    const uniforms = buildEarthGrassBackgroundUniforms(
      {
        waveAmplitude: 0.1,
        waveLength: 0.8,
        noiseAmount: 0.15,
        noiseScale: 0.2,
      },
      SCREEN_W,
      SCREEN_H,
    );

    expect(uniforms.waveAmplitude).toBe(0.1);
    expect(uniforms.noiseAmount).toBe(0.15);
    expect(uniforms.noiseScale).toBe(0.2);
  });

  it('defaults mask fields to the reference values', () => {
    const uniforms = buildEarthGrassBackgroundUniforms(
      {},
      SCREEN_W,
      SCREEN_H,
    );

    expect(uniforms.center).toEqual([SCREEN_W * 0.5, SCREEN_H * 0.35]);
    expect(uniforms.radius).toEqual([240, 180]);
    expect(uniforms.waveAmplitude).toBe(0.15);
    expect(uniforms.waveFrequency).toBeCloseTo((2 * Math.PI) / 60, 5);
    expect(uniforms.noiseAmount).toBe(0);
    expect(uniforms.noiseScale).toBe(0.05);
    expect(uniforms.resolutionScale).toBe(1);
  });

  it('applies the grass scale as the shader UV factor and defaults brightness to 1.5', () => {
    const uniforms = buildEarthGrassBackgroundUniforms(
      {},
      SCREEN_W,
      SCREEN_H,
      { grassScale: 1.2 },
    );

    expect(uniforms.grassUvScale).toBe(1.2);
    expect(uniforms.brightness).toBe(1.5);
  });

  it('honours explicit brightness and an identity grass scale', () => {
    const uniforms = buildEarthGrassBackgroundUniforms(
      {},
      SCREEN_W,
      SCREEN_H,
      { grassScale: 1, brightness: 2 },
    );

    expect(uniforms.grassUvScale).toBe(1);
    expect(uniforms.brightness).toBe(2);
  });
});
