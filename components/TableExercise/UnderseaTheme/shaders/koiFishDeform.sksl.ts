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
 *
 * Bend margin: hit tests widen by maxDisp so curved silhouettes and
 * source sampling are not clipped. bodyFitScale maps the straight body
 * into the center of the texture, reserving perp padding for bends.
 */
/** Fraction of texture perp axis used for the straight body (rest is bend padding). */
export const KOI_BODY_FIT_SCALE = 0.72;

/** Pectoral fin along-band (srcAlong) — upper third just behind the head. */
export const KOI_FIN_BAND_MIN = 0.6;
export const KOI_FIN_BAND_MAX = 0.88;
export const KOI_FIN_BAND_FEATHER = 0.05;
/** Body edge in |srcPerp|; fins extend outward beyond this. */
export const KOI_FIN_INNER = 0.3;
export const KOI_FIN_OUTER = 0.69;
/** Perp-retract squash strength. */
export const KOI_FIN_PERP_RETRACT_GAIN = 1.6;
/** Along-thin squash strength. */
export const KOI_FIN_ALONG_THIN_GAIN = 1.5;
/** Multiplier on spot luma when tinting masked regions. */
export const KOI_SPOT_TINT_GAIN = 2.7;
/** Multiplier on body luma when tinting the full fish silhouette. */
export const KOI_BODY_TINT_GAIN = 2.7;

export const KOI_FISH_DEFORM_SKSL = `
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
uniform float wavePhase;
uniform float phase;
uniform float turnArc;
uniform float finSquashLeft;
uniform float finSquashRight;
uniform float finVariantLeft;
uniform float finVariantRight;
uniform float imageWidth;
uniform float imageHeight;
uniform float renderMode;
uniform float3 shadowColor;
uniform float shadowOpacity;
uniform float shadowSoftness;
uniform shader koiTexture;
uniform shader koiSpotMask;
uniform shader koiOverlayMask;
uniform float3 spotColor;
uniform float3 bodyColor;
uniform float bodyTintStrength;
uniform float3 overlayColor;
uniform float overlayStrength;

half4 main(float2 fragCoord) {
  vec2 rel = fragCoord - vec2(fishX, fishY);
  float ca = cos(-fishAngle);
  float sa = sin(-fishAngle);
  vec2 bodySpace = vec2(ca * rel.x - sa * rel.y, sa * rel.x + ca * rel.y);

  float along = bodySpace.x / fishW + 0.5;
  float perp  = bodySpace.y / fishH;

  float bodyFitScale = ${KOI_BODY_FIT_SCALE};
  float basePerpExtent = 0.5 / bodyFitScale;
  float maxWaveDisp = abs(waveAmplitude) * (tailBendScale + tailTipBendScale + headBendScale);
  float bendMargin = abs(turnArc) + maxWaveDisp;
  float perpLimit = max(basePerpExtent, 0.5 + bendMargin);
  float shadowSamplePad = step(0.5, renderMode) * shadowSoftness * 0.8;

  if (along < 0.0 || along > 1.0 || abs(perp) > perpLimit + shadowSamplePad) {
    return half4(0.0);
  }

  float swimPhase = sin(wavePhase + phase);

  // Arc-length compression: estimate local slope at the midpoint
  // between this pixel and the head, then compress toward the head.
  float m   = (along + 1.0) * 0.5;
  float tm  = 1.0 - m;
  float sm  = m;
  float slope = (
    swimPhase * waveAmplitude * (
      -2.0 * tailBendScale   * tm
      + 3.0 * tailTipBendScale * tm * tm
      - 2.0 * headBendScale  * sm
    )
    + turnArc * 4.0 * (1.0 - 2.0 * m)
  ) * fishH / fishW;
  float arcFactor = sqrt(1.0 + slope * slope);
  float srcAlong = 1.0 - (1.0 - along) * arcFactor;

  // Displacement using smooth polynomial arcs on source coordinates.
  float st = 1.0 - srcAlong;
  float ss = srcAlong;
  float turnDisp = turnArc * 4.0 * srcAlong * (1.0 - srcAlong);
  float disp = swimPhase * waveAmplitude * (
     tailBendScale    * st * st
   - tailTipBendScale * st * st * st
   - headBendScale    * ss * ss
  ) + turnDisp;

  float srcPerp = perp - disp;
  float srcPerpLimit = basePerpExtent + bendMargin;

  if (abs(srcPerp) > srcPerpLimit + shadowSamplePad) {
    return half4(0.0);
  }

  float finBandMin = ${KOI_FIN_BAND_MIN};
  float finBandMax = ${KOI_FIN_BAND_MAX};
  float finBandFeather = ${KOI_FIN_BAND_FEATHER};
  float finInner = ${KOI_FIN_INNER};
  float finOuter = ${KOI_FIN_OUTER};
  float finPerpRetractGain = ${KOI_FIN_PERP_RETRACT_GAIN};
  float finAlongThinGain = ${KOI_FIN_ALONG_THIN_GAIN};

  float absPerp = abs(srcPerp);
  float sideSquash = srcPerp < 0.0 ? finSquashLeft : finSquashRight;
  float sideVariant = srcPerp < 0.0 ? finVariantLeft : finVariantRight;
  float bandMask =
      smoothstep(finBandMin - finBandFeather, finBandMin + finBandFeather, srcAlong)
    * (1.0 - smoothstep(finBandMax - finBandFeather, finBandMax + finBandFeather, srcAlong));
  float perpMask = smoothstep(finInner, finInner + 0.04, absPerp);
  float sq = sideSquash * bandMask * perpMask;

  float retractSq = sq * (1.0 - sideVariant);
  float thinSq = sq * sideVariant;

  float kPerp = 1.0 - retractSq * finPerpRetractGain;
  float retractedAbs = finInner + (absPerp - finInner) / max(kPerp, 0.001);
  float adjPerp = sign(srcPerp) * retractedAbs;

  float center = (finBandMin + finBandMax) * 0.5;
  float kAlong = 1.0 - thinSq * finAlongThinGain;
  float adjAlong = center + (srcAlong - center) / max(kAlong, 0.001);

  srcPerp = adjPerp;
  srcAlong = adjAlong;

  float silPerp = finOuter + 0.02;

  if (renderMode <= 0.5 && abs(srcPerp) > silPerp) {
    return half4(0.0);
  }

  vec2 bodyVec = vec2(srcAlong - 0.5, srcPerp * bodyFitScale);
  float cs = cos(-sourceAngle);
  float sn = sin(-sourceAngle);
  vec2 uvCentered = vec2(cs * bodyVec.x - sn * bodyVec.y, sn * bodyVec.x + cs * bodyVec.y);
  vec2 imgUV = uvCentered + 0.5;

  if (renderMode > 0.5) {
    if (abs(srcPerp) > silPerp + shadowSamplePad) {
      return half4(0.0);
    }

    if (imgUV.x < -0.02 || imgUV.x > 1.02 || imgUV.y < -0.02 || imgUV.y > 1.02) {
      return half4(0.0);
    }

    vec2 texCoord = imgUV * vec2(imageWidth, imageHeight);
    float step = shadowSoftness * fishH * 0.55;

    // Isotropic 3x3 Gaussian — monotonic falloff at hard alpha edges (no ring bands).
    float accum =
        koiTexture.eval(texCoord + vec2(-step, -step)).a * 1.0
      + koiTexture.eval(texCoord + vec2(0.0, -step)).a * 2.0
      + koiTexture.eval(texCoord + vec2(step, -step)).a * 1.0
      + koiTexture.eval(texCoord + vec2(-step, 0.0)).a * 2.0
      + koiTexture.eval(texCoord + vec2(0.0, 0.0)).a * 4.0
      + koiTexture.eval(texCoord + vec2(step, 0.0)).a * 2.0
      + koiTexture.eval(texCoord + vec2(-step, step)).a * 1.0
      + koiTexture.eval(texCoord + vec2(0.0, step)).a * 2.0
      + koiTexture.eval(texCoord + vec2(step, step)).a * 1.0;

    float coverage = accum / 16.0;
    float a = coverage * shadowOpacity;
    if (a < 0.004) {
      return half4(0.0);
    }
    return half4(shadowColor * a, a);
  }

  if (imgUV.x < -0.02 || imgUV.x > 1.02 || imgUV.y < -0.02 || imgUV.y > 1.02) {
    return half4(0.0);
  }

  vec2 texCoord = imgUV * vec2(imageWidth, imageHeight);
  half4 color = koiTexture.eval(texCoord);
  if (color.a < 0.01) {
    return half4(0.0);
  }

  float luma = dot(color.rgb, half3(0.299, 0.587, 0.114));
  float bodyTintGain = ${KOI_BODY_TINT_GAIN};
  float spotTintGain = ${KOI_SPOT_TINT_GAIN};

  half3 bodyTinted = half3(bodyColor) * (luma * bodyTintGain);
  color.rgb = mix(color.rgb, bodyTinted, bodyTintStrength * color.a);

  float mask = koiSpotMask.eval(texCoord).r;
  half3 tinted = half3(spotColor) * (luma * spotTintGain);
  color.rgb = mix(color.rgb, tinted, mask * color.a);

  float overlayMask = koiOverlayMask.eval(texCoord).r;
  half3 overlayTinted = half3(overlayColor) * (luma * spotTintGain);
  color.rgb = mix(color.rgb, overlayTinted, overlayMask * overlayStrength * color.a);

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
  /** Accumulated tail-wave phase in radians (integrated frequency * time). */
  wavePhase: 0,
  /** Phase offset so fish animate out of sync. */
  phase: 0,
  /** Static body arc during turns (0 = straight, driven by angular velocity). */
  turnArc: 0,
  /** Image head-to-tail axis in radians — 0 = right, PI/2 = down. */
  sourceAngle: 0,
  /** Left pectoral fin squash (0 = none, 1 = full). */
  finSquashLeft: 0,
  /** Right pectoral fin squash (0 = none, 1 = full). */
  finSquashRight: 0,
  /** Left fin mode — 0 = retract, 1 = thin. */
  finVariantLeft: 0,
  /** Right fin mode — 0 = retract, 1 = thin. */
  finVariantRight: 0,
  /** 0 = fish, 1 = shadow. */
  renderMode: 0,
  /** Premultiplied shadow tint (RGB). */
  shadowColor: [0.02, 0.06, 0.12] as const,
  /** Shadow alpha multiplier. */
  shadowOpacity: 0.35,
  /** Softens shadow edges in body-perp units (~0.12 ≈ 4–5 px at fishH 38). */
  shadowSoftness: 0.15,
  /** Spot tint RGB (1,1,1 = identity). */
  spotColor: [1, 1, 1] as const,
  /** Body tint RGB when bodyTintStrength > 0. */
  bodyColor: [1, 1, 1] as const,
  /** 0 = original body, 1 = apply bodyColor. */
  bodyTintStrength: 0,
  /** Optional overlay tint RGB. */
  overlayColor: [0, 0, 0] as const,
  /** 0 = no overlay pass, 1 = apply overlay mask. */
  overlayStrength: 0,
} as const;

/** Amplitude at which forward speed reaches zero (inverse speed law). */
export const KOI_MAX_AMPLITUDE = 0.25;
