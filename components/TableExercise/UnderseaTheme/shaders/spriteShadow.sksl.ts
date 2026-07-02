/**
 * Generic sprite shadow shader:
 * - Samples source texture alpha in screen space.
 * - Applies a small isotropic 3x3 Gaussian blur.
 * - Tints with a premultiplied shadow color and opacity.
 * - Applies a constant projected offset in pixels.
 */
export const SPRITE_SHADOW_SKSL = `
uniform float spriteX;
uniform float spriteY;
uniform float spriteW;
uniform float spriteH;
uniform float2 offset;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform shader spriteTexture;

half4 main(float2 fragCoord) {
  // Shift sampling position opposite the shadow offset so the rendered
  // shadow frame appears displaced by +offset relative to the sprite.
  vec2 sampleCoord = fragCoord - offset;

  // Quick reject outside the sprite bounds plus a soft penumbra region.
  float pad = shadowSoftness * spriteH * 0.8;
  if (sampleCoord.x < spriteX - pad || sampleCoord.x > spriteX + spriteW + pad ||
      sampleCoord.y < spriteY - pad || sampleCoord.y > spriteY + spriteH + pad) {
    return half4(0.0);
  }

  // Isotropic 3x3 Gaussian blur over alpha, same weights as koi shadow.
  float step = shadowSoftness * spriteH * 0.55;
  vec2 dx = vec2(step, 0.0);
  vec2 dy = vec2(0.0, step);

  float accum =
      spriteTexture.eval(sampleCoord - dx - dy).a * 1.0 +
      spriteTexture.eval(sampleCoord      - dy).a * 2.0 +
      spriteTexture.eval(sampleCoord + dx - dy).a * 1.0 +
      spriteTexture.eval(sampleCoord - dx     ).a * 2.0 +
      spriteTexture.eval(sampleCoord         ).a * 4.0 +
      spriteTexture.eval(sampleCoord + dx     ).a * 2.0 +
      spriteTexture.eval(sampleCoord - dx + dy).a * 1.0 +
      spriteTexture.eval(sampleCoord      + dy).a * 2.0 +
      spriteTexture.eval(sampleCoord + dx + dy).a * 1.0;

  float coverage = accum / 16.0;
  float a = coverage * shadowOpacity;
  if (a < 0.004) {
    return half4(0.0);
  }

  return half4(shadowColor * a, a);
}
`;

export const spriteShadowDefaults = {
  /** RGB tint for the shadow, matches koi shadow by default. */
  shadowColor: [0.02, 0.06, 0.12] as const,
  /** Shadow alpha multiplier. */
  shadowOpacity: 0.15,
  /** Softens shadow edges in sprite-perp units. */
  shadowSoftness: 0.45,
  /** Default projected offset in pixels (small, down-right). */
  offset: [-4, 11] as const,
} as const;

