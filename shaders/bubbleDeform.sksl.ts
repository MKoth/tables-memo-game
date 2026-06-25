/**
 * Radial wobble + translucency for the word bubble sprite.
 *
 * Polar UV mapping matches the jellyfish bell wobble (edge-weighted radial
 * distortion). Dark background pixels from the source PNG are keyed out so
 * koi remain visible through the bubble body.
 */
export const BUBBLE_DEFORM_SKSL = `
uniform float bubbleX;
uniform float bubbleY;
uniform float bubbleW;
uniform float bubbleH;
uniform float iTime;
uniform float phase;
uniform float wobbleAmp;
uniform float wobbleSpeed;
uniform float wobbleLobes;
uniform float opacity;
uniform float bgCutoff;
uniform float centerClear;
uniform float rimClear;
uniform shader bubbleTexture;

half4 main(float2 fragCoord) {
  vec2 uv = (fragCoord - vec2(bubbleX, bubbleY)) / vec2(bubbleW, bubbleH);
  vec2 c = uv - 0.5;
  float r = length(c);

  if (r > 0.5) {
    return half4(0.0);
  }

  float theta = atan(c.y, c.x);
  float rSrc = r;
  float thetaSrc = theta;

  // Always-on wobble — same dual-lobe mix as jellyfish bell rim.
  float w1 = sin(theta * wobbleLobes + iTime * wobbleSpeed + phase);
  float w2 = sin(theta * (wobbleLobes + 1.0) - iTime * wobbleSpeed * 0.7 + phase * 1.7);
  float wobble = wobbleAmp * (w1 + 0.5 * w2) * smoothstep(0.0, 0.5, r);
  rSrc *= 1.0 + wobble;
  thetaSrc += wobbleAmp * 0.5 * sin(theta * wobbleLobes + iTime * wobbleSpeed * 0.9 + phase);

  vec2 srcUV = 0.5 + vec2(cos(thetaSrc), sin(thetaSrc)) * rSrc;

  if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
    return half4(0.0);
  }

  vec2 sampleCoord = vec2(bubbleX, bubbleY) + srcUV * vec2(bubbleW, bubbleH);
  half4 color = bubbleTexture.eval(sampleCoord);

  // Key out the PNG's solid black backdrop.
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float bgMask = smoothstep(bgCutoff, bgCutoff + 0.14, lum);

  // Softer, more see-through center; slightly clearer rim band.
  float centerFade = mix(centerClear, 1.0, smoothstep(0.0, 0.42, r));
  float rimFade = mix(1.0, rimClear, smoothstep(0.34, 0.5, r));
  float alpha = color.a * bgMask * opacity * centerFade * rimFade;

  return half4(color.rgb * alpha, alpha);
}
`;

export const bubbleDeformUniformDefaults = {
  phase: 0,
  wobbleAmp: 0.075,
  wobbleSpeed: 3.4,
  /** Integer lobe count for seamless angular wrap. */
  wobbleLobes: 1,
  /** Overall bubble translucency. */
  opacity: 0.48,
  /** Luminance below which source pixels are treated as background. */
  bgCutoff: 0.27,
  /** Alpha multiplier at bubble center (lower = more transparent). */
  centerClear: 0.15,
  /** Alpha multiplier at the rim highlight band. */
  rimClear: 0.72,
} as const;
