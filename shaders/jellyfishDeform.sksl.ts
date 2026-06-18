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
 *                  — a wider, flatter, ruffled bell.
 *
 * Rim wave (bell):
 *   angular ripple on the sampled radius, strongest near the rim. Its amplitude
 *   fades as the bell contracts, so the edge smooths toward a circle on the push
 *   and ruffles up (with an off-count harmonic for unevenness) when relaxed.
 *
 * Swirl wave (tentacles):
 *   adds a traveling angular offset along the radius so the radiating arms
 *   undulate from base to tip.
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
uniform float waveAmp;
uniform float waveLobes;
uniform float waveSpeed;
uniform float swirlAmp;
uniform float swirlFreq;
uniform float edgeStart;
uniform float opacity;
uniform shader jellyTexture;

half4 main(float2 fragCoord) {
  // Fast path: skip polar math for fully transparent pixels.
  half4 earlyCheck = jellyTexture.eval(fragCoord);
  if (earlyCheck.a < 0.01) { return half4(0.0); }

  vec2 uv = (fragCoord - vec2(jellyX, jellyY)) / vec2(jellyW, jellyH);
  vec2 c = uv - 0.5;
  float r = length(c);
  float theta = atan(c.y, c.x);

  // Asymmetric swim cycle: quick push, slow relax. 'contract' in [0, 1].
  float TWO_PI = 6.2831853;
  float p = fract((iTime * pulseSpeed + phase) / TWO_PI);
  float contract = p < pushDur
    ? smoothstep(0.0, 1.0, p / pushDur)
    : 1.0 - smoothstep(0.0, 1.0, (p - pushDur) / (1.0 - pushDur));

  // k > 0 push (center bulge, rim in); k < 0 relax (center shrink, rim out).
  float k = mix(-relaxAmp, contractAmp, contract);

  // Edge weighting: motion concentrated toward the rim, center stays calm.
  float edgeFactor = smoothstep(edgeStart, 0.5, r);

  // Bell rim ripple — ruffled & uneven when relaxed, smooths to a circle on push.
  float waviness = waveAmp * (1.0 - contract);
  float rim =
      sin(theta * waveLobes - iTime * waveSpeed + phase)
    + 0.5 * sin(theta * (waveLobes * 0.5 + 1.0) + iTime * waveSpeed * 0.7);
  float rimWave = waviness * rim * edgeFactor;

  // Tentacle swirl — traveling angular offset along the radius.
  float swirl = swirlAmp * sin(r * swirlFreq - iTime * waveSpeed + phase) * edgeFactor;
  float thetaSrc = theta + swirl;

  // Non-uniform scale about the pivot ring, then rim ripple.
  float rSrc = pivotR + (r - pivotR) * (1.0 + k) - rimWave;
  if (rSrc < 0.0) {
    return half4(0.0);
  }

  vec2 srcUV = 0.5 + vec2(cos(thetaSrc), sin(thetaSrc)) * rSrc;
  if (srcUV.x < 0.0 || srcUV.x > 1.0 || srcUV.y < 0.0 || srcUV.y > 1.0) {
    return half4(0.0);
  }

  vec2 sampleCoord = vec2(jellyX, jellyY) + srcUV * vec2(jellyW, jellyH);
  half4 color = jellyTexture.eval(sampleCoord);
  return color * opacity;
}
`;

export const jellyfishDeformUniformDefaults = {
  /** Phase offset so instances pulse out of sync. */
  phase: 0,
  /** Pulse cadence in radians/sec. */
  pulseSpeed: 1.6,
  /** Pivot ring (UV radius) the bell scales about — inside it bulges, outside pulls in. */
  pivotR: 0.12,
  /** Outward rim stretch depth during relax (kept modest to avoid clipping). */
  relaxAmp: 0.08,
  /** Inward rim pull / center bulge depth during the push. */
  contractAmp: 0.18,
  /** Fraction of the cycle spent on the fast contraction (rest is slow relax). */
  pushDur: 0.4,
  /** Rim ripple height as a UV-radius fraction (bell). */
  waveAmp: 0.05,
  /** Number of rim lobes the ripple runs over (match sprite scallops ~16). */
  waveLobes: 16,
  /** Speed of the rim/swirl wave travel. */
  waveSpeed: 2.2,
  /** Angular swirl amplitude in radians (tentacles). */
  swirlAmp: 0.0,
  /** Spatial frequency of the swirl along the radius (tentacles). */
  swirlFreq: 14,
  /** Radius where edge motion begins ramping in (0 = center). */
  edgeStart: 0.08,
  /** Overall sprite opacity for translucency. */
  opacity: 1.0,
} as const;
