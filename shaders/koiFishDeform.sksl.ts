/**
 * Koi fish arc-deformation shader.
 *
 * Uses smooth polynomial curves along the whole body:
 *   t = 1 - along  (0 at head, 1 at tail tip)
 *   s = along      (0 at tail tip, 1 at head)
 *
 *   disp = swimPhase * waveAmplitude * (
 *     tailBendScale   * t²          — main tail bend
 *   - tailTipBendScale * t³         — tip bends opposite
 *   - headBendScale   * s²          — head tilts opposite to tail
 *   )
 *
 * Arc-length compensation: tail samples are compressed so the
 * rendered silhouette does not elongate when bent.
 */
export const KOI_FISH_DEFORM_SKSL = `
uniform float iTime;
uniform float swimZoneX;
uniform float swimZoneY;
uniform float swimZoneW;
uniform float swimZoneH;
uniform float fishX;
uniform float fishY;
uniform float fishW;
uniform float fishH;
uniform float fishAngle;
uniform float sourceAngle;
uniform float waveAmplitude;
uniform float tailBendScale;
uniform float tailTipBendScale;
uniform float headBendScale;
uniform float swimSpeed;
uniform float phase;
uniform float imageWidth;
uniform float imageHeight;
uniform shader koiTexture;

half4 main(float2 fragCoord) {
  vec2 rel = fragCoord - vec2(fishX, fishY);
  float ca = cos(-fishAngle);
  float sa = sin(-fishAngle);
  vec2 bodySpace = vec2(ca * rel.x - sa * rel.y, sa * rel.x + ca * rel.y);

  float along = bodySpace.x / fishW + 0.5;
  float perp  = bodySpace.y / fishH;

  if (along < 0.0 || along > 1.0 || abs(perp) > 0.5) {
    return half4(0.0);
  }

  float swimPhase = sin(iTime * swimSpeed + phase);

  // Arc-length compression: estimate local slope at the midpoint
  // between this pixel and the head, then compress toward the head.
  float m   = (along + 1.0) * 0.5;
  float tm  = 1.0 - m;
  float sm  = m;
  float slope = swimPhase * waveAmplitude * (
    -2.0 * tailBendScale   * tm
    + 3.0 * tailTipBendScale * tm * tm
    - 2.0 * headBendScale  * sm
  ) * fishH / fishW;
  float arcFactor = sqrt(1.0 + slope * slope);
  float srcAlong = 1.0 - (1.0 - along) * arcFactor;

  // Displacement using smooth polynomial arcs on source coordinates.
  float st = 1.0 - srcAlong;
  float ss = srcAlong;
  float disp = swimPhase * waveAmplitude * (
     tailBendScale    * st * st
   - tailTipBendScale * st * st * st
   - headBendScale    * ss * ss
  );

  float srcPerp = perp - disp;

  if (abs(srcPerp) > 0.5) {
    return half4(0.0);
  }

  vec2 bodyVec = vec2(srcAlong - 0.5, srcPerp);
  float cs = cos(-sourceAngle);
  float sn = sin(-sourceAngle);
  vec2 uvCentered = vec2(cs * bodyVec.x - sn * bodyVec.y, sn * bodyVec.x + cs * bodyVec.y);
  vec2 imgUV = uvCentered + 0.5;

  if (imgUV.x < 0.0 || imgUV.x > 1.0 || imgUV.y < 0.0 || imgUV.y > 1.0) {
    return half4(0.0);
  }

  vec2 texCoord = imgUV * vec2(imageWidth, imageHeight);
  half4 color = koiTexture.eval(texCoord);
  if (color.a < 0.01) {
    return half4(0.0);
  }

  return color;
}
`;

export const koiFishDeformUniformDefaults = {
  /** Swim-strength multiplier (0 = idle, KOI_MAX_AMPLITUDE = full swing). */
  waveAmplitude: 0.12,
  /** Tail displacement scale — drives the main body arc. */
  tailBendScale: 2.5,
  /** Tail-tip counter-bend scale — pulls the very tip back the other way. */
  tailTipBendScale: 1.5,
  /** Head counter-tilt scale — tilts the head opposite to the tail. */
  headBendScale: 0.35,
  /** Tail oscillation rate in cycles per second. */
  swimSpeed: 4.5,
  /** Phase offset so fish animate out of sync. */
  phase: 0,
  /** Image head-to-tail axis in radians — 0 = right, PI/2 = down. */
  sourceAngle: 0,
} as const;

/** Amplitude at which forward speed reaches zero (inverse speed law). */
export const KOI_MAX_AMPLITUDE = 0.25;
