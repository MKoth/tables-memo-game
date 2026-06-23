/**
 * Top-down jellyfish radial-deformation shader.
 *
 * Both the bell and the tentacle sprites are radially symmetric and centered.
 * The shader works in polar coordinates around the sprite center:
 *
 *   c     = uv - 0.5          (centered, [-0.5, 0.5])
 *   r     = length(c)         (0 at center, grows toward the rim)
 *   theta = atan(c.y, c.x)    (angle around the center)
 *
 * Swim cycle (asymmetric: slow relax/stretch, fast push/contract):
 *   A skewed phase 'contract' ramps quickly 0->1 during the push (pushDur of
 *   the cycle) then eases slowly back. It drives a non-uniform radial scale
 *   ABOUT a pivot ring (pivotR), not about the center:
 *
 *     rSrc = pivotR + (r - pivotR) * (1 + k)
 *
 *   k > 0 (push):  content near the pivot magnifies (center bulges) while the
 *                  rim is pulled inward — the body rounds toward a circle.
 *   k < 0 (relax): the center shrinks slightly while the rim stretches outward
 *                  — a wider, flatter bell.
 *
 * Pattern density warp (bell, on contraction):
 *   a gamma remap on rSrc compresses texture toward the rim and stretches it
 *   at the center, amplifying the bulge during the push.
 *
 * Tentacle retract (on contraction):
 *   scales rSrc outward so visible tentacle content pulls inward under the bell.
 *
 * Rim transparency (bell, on contraction):
 *   a smooth band near the display-space edge becomes see-through when the bell
 *   is contracted, giving the impression the rim is curling over and is thin.
 *   rimWidth controls how far the band extends inward; rimStrength is how
 *   transparent it becomes at peak contraction (0 = no effect, 1 = fully clear).
 *
 * Swirl wave (tentacles):
 *   adds a traveling angular offset along the radius so the radiating arms
 *   undulate from base to tip.
 *
 * Wobble (bell + tentacles, always on):
 *   low-frequency angular distortion driven only by iTime — independent of the
 *   swim cycle. Edge-weighted so the rim flaps while the center stays stable.
 *
 * Tilt (directional lean, all along the unit vector tiltDir = (cos,sin) of
 * tiltAngle). Three independent, sign-explicit channels so the bell and the
 * tentacles always lean to corresponding sides:
 *   tiltCenterShift: rim-anchored lean in display space (applied to c before the
 *     pulse). Inner disc shifts rigidly toward tiltDir while the rim stays put;
 *     constant across relax and contract so the center stays leaned at rest.
 *   tiltBodyShift: uniform whole-sprite slide of the sampling center — used by
 *     the tentacles to trail opposite the motion (pass a negative value).
 *   tiltLen: radial length asymmetry. dot>0 on the tiltDir side enlarges rSrc
 *     (samples farther out -> shorter arms); the opposite side lengthens.
 *   tiltEgg: only applied to the bell. Shrinks the perpendicular-to-tilt
 *     component on the back half (dot(c,tiltDir) < 0), which expands the
 *     silhouette boundary there → blunt/flat arc. Front hemisphere is untouched
 *     → stays a normal rounded dome. Uses tiltDir, so must be 0 for tentacles.
 * All default to 0, so the sprite is untouched until motion drives them.
 */
export const JELLYFISH_DEFORM_SKSL = `
uniform float jellyX;
uniform float jellyY;
uniform float jellyW;
uniform float jellyH;
uniform float iTime;
uniform float phase;
uniform float pulseSpeed;
uniform float pivotR;
uniform float relaxAmp;
uniform float contractAmp;
uniform float pushDur;
uniform float swirlAmp;
uniform float swirlFreq;
uniform float swirlSpeed;
uniform float densityGamma;
uniform float contractShrink;
uniform float scaleRelax;
uniform float scaleContract;
uniform float rimWidth;
uniform float rimStrength;
uniform float wobbleAmp;
uniform float wobbleSpeed;
uniform float wobbleLobes;
uniform float opacity;
uniform float tiltAngle;
uniform float tiltCenterShift;
uniform float tiltBodyShift;
uniform float tiltLen;
uniform float tiltEgg;
uniform float renderMode;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform shader jellyTexture;

half4 main(float2 fragCoord) {
  vec2 uv = (fragCoord - vec2(jellyX, jellyY)) / vec2(jellyW, jellyH);

  // Tilt direction — computed once; used by egg warp below and shift effects further down.
  vec2 tiltDir  = vec2(cos(tiltAngle), sin(tiltAngle));
  vec2 tiltPerp = vec2(-tiltDir.y, tiltDir.x);

  vec2 c = uv - 0.5;

  // Egg silhouette warp (bell only, tiltEgg = 0 for tentacles).
  // In backward mapping, shrinking the perpendicular component of c on the
  // back half makes the discard boundary (r = 0.5) expand in display space
  // on that side → wider blunt arc. Front stays a normal circular dome.
  float axisSigned = dot(c, tiltDir);
  float backness   = smoothstep(0.0, 0.5, max(0.0, -axisSigned));
  float perpComp   = dot(c, tiltPerp) / (1.0 + tiltEgg * backness);
  c = tiltDir * axisSigned + tiltPerp * perpComp;

  // Bell center lean in display space — constant across the swim cycle.
  float centerHold = 1.0 - smoothstep(0.32, 0.5, length(c));
  c -= tiltCenterShift * tiltDir * centerHold;

  float r = length(c);
  float shadowSamplePad = step(0.5, renderMode) * shadowSoftness * 0.8;

  if (r > 0.5 + shadowSamplePad) {
    return half4(0.0);
  }

  float theta = atan(c.y, c.x);

  // Asymmetric swim cycle: quick push, slow relax. 'contract' in [0, 1].
  float TWO_PI = 6.2831853;
  float p = fract((iTime * pulseSpeed + phase) / TWO_PI);
  float contract = p < pushDur
    ? smoothstep(0.0, 1.0, p / pushDur)
    : 1.0 - smoothstep(0.0, 1.0, (p - pushDur) / (1.0 - pushDur));

  // k > 0 push (center bulge, rim in); k < 0 relax (center shrink, rim out).
  float k = mix(-relaxAmp, contractAmp, contract);

  // Tentacle swirl — traveling angular offset along the radius.
  float swirl = swirlAmp * sin(r * swirlFreq - iTime * swirlSpeed + phase);
  float thetaSrc = theta + swirl;

  float rSrc = pivotR + (r - pivotR) * (1.0 + k);
  rSrc *= 1.0 + contractShrink * contract;

  // Overall swim scale: zoom in (closer) on contraction, slightly out on relax.
  rSrc /= mix(scaleRelax, scaleContract, contract);

  // Clamp to the center rather than punching a hole when the pivot pushes
  // the source radius past the center.
  rSrc = max(rSrc, 0.0);

  float g = mix(1.0, densityGamma, contract);
  rSrc = pow(rSrc / 0.5, g) * 0.5;

  // Always-on wobble — independent of swim cycle.
  float w1 = sin(theta * wobbleLobes + iTime * wobbleSpeed + phase);
  float w2 = sin(theta * (wobbleLobes + 1.0) - iTime * wobbleSpeed * 0.7 + phase * 1.7);
  float wobble = wobbleAmp * (w1 + 0.5 * w2) * smoothstep(0.0, 0.5, r);
  rSrc *= 1.0 + wobble;
  thetaSrc += wobbleAmp * 0.5 * sin(theta * wobbleLobes + iTime * wobbleSpeed * 0.9 + phase);

  // Tentacle length asymmetry: shorter on the tiltDir side, longer opposite.
  float lenAlign = (r > 0.0001) ? dot(c, tiltDir) / r : 0.0;
  rSrc *= 1.0 + tiltLen * lenAlign * smoothstep(0.0, 0.5, r);

  vec2 srcUV = 0.5 + vec2(cos(thetaSrc), sin(thetaSrc)) * rSrc;

  // Uniform whole-sprite slide (tentacles trail opposite the motion).
  srcUV -= tiltBodyShift * tiltDir;

  if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
    return half4(0.0);
  }

  vec2 sampleCoord = vec2(jellyX, jellyY) + srcUV * vec2(jellyW, jellyH);

  if (renderMode > 0.5) {
    float step = shadowSoftness * jellyH * 0.55;

    // Isotropic 3x3 Gaussian — monotonic falloff at hard alpha edges (no ring bands).
    float accum =
        jellyTexture.eval(sampleCoord + vec2(-step, -step)).a * 1.0
      + jellyTexture.eval(sampleCoord + vec2(0.0, -step)).a * 2.0
      + jellyTexture.eval(sampleCoord + vec2(step, -step)).a * 1.0
      + jellyTexture.eval(sampleCoord + vec2(-step, 0.0)).a * 2.0
      + jellyTexture.eval(sampleCoord + vec2(0.0, 0.0)).a * 4.0
      + jellyTexture.eval(sampleCoord + vec2(step, 0.0)).a * 2.0
      + jellyTexture.eval(sampleCoord + vec2(-step, step)).a * 1.0
      + jellyTexture.eval(sampleCoord + vec2(0.0, step)).a * 2.0
      + jellyTexture.eval(sampleCoord + vec2(step, step)).a * 1.0;

    float coverage = accum / 16.0;
    float a = coverage * shadowOpacity;
    if (a < 0.004) {
      return half4(0.0);
    }
    return half4(shadowColor * a, a);
  }

  half4 color = jellyTexture.eval(sampleCoord);

  // Rim band: rises from 0 at (0.5 - rimWidth) to 1 at the display edge.
  float rim = smoothstep(0.5 - rimWidth, 0.5, r);
  float rimAlpha = 1.0 - rim * rimStrength * (1.0 - contract);
  return color * (opacity * rimAlpha);
}
`;

export const jellyfishDeformUniformDefaults = {
  /** Phase offset so instances pulse out of sync. */
  phase: 0,
  /** Pulse cadence in radians/sec. */
  pulseSpeed: 1.6,
  /** Pivot ring (UV radius) the bell scales about — inside it bulges, outside pulls in. */
  pivotR: 0.12,
  /** Outward rim stretch depth during relax. */
  relaxAmp: 0.03,
  /** Inward rim pull / center bulge depth during the push. */
  contractAmp: 0.12,
  /** Fraction of the cycle spent on the fast contraction (rest is slow relax). */
  pushDur: 0.4,
  /** Angular swirl amplitude in radians (tentacles only; 0 for bell). */
  swirlAmp: 0.3,
  /** Spatial frequency of the swirl along the radius (tentacles). */
  swirlFreq: 9,
  /** Speed of the tentacle swirl wave travel. */
  swirlSpeed: 2.2,
  /** Bell pattern gamma on contraction — >1 denser at rim, stretched at center. */
  densityGamma: 1.1,
  /** Tentacle source-radius scale on contraction — pulls arms under the bell. */
  contractShrink: 0.9,
  /** Display scale during relax (<1 = slightly farther/smaller). */
  scaleRelax: 0.8,
  /** Display scale during contraction (>1 = closer/larger). */
  scaleContract: 1.1,
  /** How far the see-through rim band extends inward from the edge (UV units). */
  rimWidth: 0.12,
  /** How transparent the rim becomes at peak contraction (0 = off, 1 = fully clear). */
  rimStrength: 1.0,
  /** Radial wobble amplitude at the rim (always on). */
  wobbleAmp: 0.05,
  /** Wobble cycle speed. */
  wobbleSpeed: 4.3,
  /** Angular lobe count — use an integer for seamless wrap. */
  wobbleLobes: 1,
  /** Overall sprite opacity for translucency. */
  opacity: 1.0,
  /** Tilt/lean direction in radians (0 = +x, increasing toward +y / screen-down). */
  tiltAngle: 0,
  /** Display-space center lean toward tiltDir, UV units (bell uses this). */
  tiltCenterShift: 0,
  /** Uniform whole-sprite slide toward tiltDir, UV units (tentacles use negative). */
  tiltBodyShift: 0,
  /** Radial length asymmetry along the tilt axis, fraction (tentacles use this). */
  tiltLen: 0,
  /** Egg silhouette: widens the back half into a blunt arc, front stays round (bell only). */
  tiltEgg: 0,
  /** 0 = body, 1 = shadow. */
  renderMode: 0,
  /** Premultiplied shadow tint (RGB). */
  shadowColor: [0.02, 0.06, 0.12] as const,
  /** Shadow alpha multiplier. */
  shadowOpacity: 0.35,
  /** Softens shadow edges in sprite-perp units. */
  shadowSoftness: 0.15,
} as const;
