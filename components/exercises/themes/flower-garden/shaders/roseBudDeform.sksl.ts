export const MAX_RINGS = 4;

export const ROSE_BUD_SKSL = `
uniform float roseX;
uniform float roseY;
uniform float roseW;
uniform float roseH;
uniform float budInnerMin;
uniform float budInnerMax;
uniform float budOuterMin;
uniform float budOuterMax;
uniform float roseCenterDiameterMin;
uniform float roseCenterDiameterMax;
uniform float roseCenterBulgeMin;
uniform float roseCenterBulgeMax;
uniform float budRotationMin;
uniform float budRotationMax;
uniform float roseCenterRotationMin;
uniform float roseCenterRotationMax;
uniform float roseCenterOpacityMin;
uniform float roseCenterOpacityMax;
uniform float brightnessMin;
uniform float brightnessMax;
uniform float3 tintA;
uniform float tintStrength;
uniform float flashActive;
uniform float3 flashColor;
uniform float3 flashCrestColor;
uniform float flashWave;
uniform float flashBaseStrength;
uniform float flashWaveStrength;
uniform float flashWaveRadiusPeriods;
uniform float flashBrightnessBoost;
uniform float ringsCount;
uniform float ringRadiusMin[${MAX_RINGS}];
uniform float ringRadiusMax[${MAX_RINGS}];
uniform float ringOpacityMin[${MAX_RINGS}];
uniform float ringOpacityMax[${MAX_RINGS}];
uniform float ringImageSize[${MAX_RINGS}];
uniform float ringRotCos[${MAX_RINGS}];
uniform float ringRotSin[${MAX_RINGS}];
uniform float ringImageRadiusFrac;
uniform float coefficient;
uniform shader budTexture;
uniform shader roseCenterTexture;
uniform shader ringTexture0;
uniform shader ringTexture1;
uniform shader ringTexture2;
uniform shader ringTexture3;

half4 sampleRing(int ring, float2 px) {
  if (ring == 0)      { return ringTexture0.eval(px); }
  else if (ring == 1) { return ringTexture1.eval(px); }
  else if (ring == 2) { return ringTexture2.eval(px); }
  else                { return ringTexture3.eval(px); }
}

half4 main(float2 fragCoord) {
  float budInner         = mix(budInnerMin, budInnerMax, coefficient);
  float budOuter         = mix(budOuterMin, budOuterMax, coefficient);
  float centerDiam       = mix(roseCenterDiameterMin, roseCenterDiameterMax, coefficient);
  float centerBulge      = mix(roseCenterBulgeMin, roseCenterBulgeMax, coefficient);
  float budRotationL     = mix(budRotationMin, budRotationMax, coefficient);
  float roseCenterRotL   = mix(roseCenterRotationMin, roseCenterRotationMax, coefficient);
  float brightnessL      = mix(brightnessMin, brightnessMax, coefficient);
  float centerOpacity    = mix(roseCenterOpacityMin, roseCenterOpacityMax, coefficient);
  int   rings            = int(ringsCount);

  float ringRadiusL[${MAX_RINGS}];
  float ringOpacityL[${MAX_RINGS}];
  for (int i = 0; i < ${MAX_RINGS}; i++) {
    ringRadiusL[i]   = mix(ringRadiusMin[i], ringRadiusMax[i], coefficient);
    ringOpacityL[i]  = mix(ringOpacityMin[i], ringOpacityMax[i], coefficient);
  }

  float2 center = float2(roseX, roseY) + float2(roseW, roseH) * 0.5;
  float halfSize = min(roseW, roseH) * 0.5;

  if (halfSize < 1.0) {
    return budTexture.eval(fragCoord);
  }

  float2 delta = fragCoord - center;
  float r = length(delta) / halfSize;
  float theta = atan(delta.y, delta.x);

  half4 color;
  if (r < budInner || r > budOuter) {
    color = half4(0.0);
  } else {
    float rSource = (r - budInner) / (budOuter - budInner);
    float sourceDist = rSource * halfSize;
    float budTheta = theta + budRotationL;
    float2 sourceFragCoord = center + float2(cos(budTheta), sin(budTheta)) * sourceDist;
    half4 budColor = budTexture.eval(sourceFragCoord);
    float fadeIn = smoothstep(budInner, budInner + 0.02, r);
    float fadeOut = 1.0 - smoothstep(budOuter - 0.02, budOuter, r);
    color = budColor * fadeIn * fadeOut;
  }

  for (int ring = 0; ring < ${MAX_RINGS}; ring++) {
    if (ring >= rings) break;

    float radius = ringRadiusL[ring];
    if (r < radius * 0.4 || r > radius * 1.6) continue;

    float rc = ringRotCos[ring];
    float rs = ringRotSin[ring];
    float2 rotated = float2(delta.x * rc + delta.y * rs, -delta.x * rs + delta.y * rc);

    float scale = ringImageRadiusFrac * ringImageSize[ring] * 0.5 / radius;
    float2 px = rotated / halfSize * scale + ringImageSize[ring] * 0.5;

    half4 ringColor = sampleRing(ring, px);

    float ringAlpha = ringColor.a * ringOpacityL[ring];
    ringAlpha *= 1.0 - smoothstep(radius * 1.45, radius * 1.6, r);
    if (ringAlpha < 0.01) continue;

    color = ringColor * ringAlpha + color * (1.0 - ringAlpha);
  }

  if (centerDiam > 0.0) {
    float centerRadius = centerDiam * 0.5;
    float bulge = max(centerBulge, 0.0);
    float edgeWidth = mix(0.08, 0.01, clamp(bulge, 0.0, 1.0));
    if (r < centerRadius) {
      float rNorm = r / centerRadius;
      float exponent = 1.0 + bulge;
      float puffScale = pow(rNorm, exponent - 1.0);
      float rcCos = cos(roseCenterRotL);
      float rcSin = sin(roseCenterRotL);
      float rcDeltaX = delta.x * rcCos - delta.y * rcSin;
      float rcDeltaY = delta.x * rcSin + delta.y * rcCos;
      float centerU = 0.5 + rcDeltaX * puffScale / (centerRadius * 2.0 * halfSize);
      float centerV = 0.5 + rcDeltaY * puffScale / (centerRadius * 2.0 * halfSize);
      float2 centerCoord = float2(roseX + centerU * roseW, roseY + centerV * roseH);
      half4 centerColor = roseCenterTexture.eval(centerCoord);
      centerColor.a *= smoothstep(centerRadius, centerRadius - edgeWidth, r) * centerOpacity;
      if (centerColor.a > 0.01) {
        color = centerColor * centerColor.a + color * (1.0 - centerColor.a);
      }
    }
  }

  color.rgb *= brightnessL;
  half lum = max(max(color.r, color.g), color.b);
  color.rgb = mix(color.rgb, half3(tintA) * lum, half(tintStrength));

  if (flashActive > 0.5) {
    half3 baseShade = half3(flashColor) * lum * flashBrightnessBoost;
    color.rgb = mix(color.rgb, baseShade, half(flashBaseStrength));
    float rNorm = min(r, 1.0);
    float wave = 0.5 + 0.5 * cos(6.2831853 * (flashWave - rNorm * flashWaveRadiusPeriods));
    half3 crest = half3(flashCrestColor) * lum * flashBrightnessBoost;
    color.rgb = mix(color.rgb, crest, half(wave * flashWaveStrength));
  }
  return color;
}
`;

export const roseBudUniformDefaults = {
  budInner: { min: 0.0, max: 0.5 },
  budOuter: { min: 1.0, max: 0.5 },
  roseCenterDiameter: { min: 1.0, max: 0.8 },
  roseCenterBulge: { min: 0.0, max: 1.8 },
  budRotation: { min: 0, max: 1.8 },
  roseCenterRotation: { min: 0, max: 0.7 },
  brightness: { min: 1.1, max: 1.3 },
  tintA: [1, 1, 1],
  tintStrength: 1,
  ringsCount: 4,
  ringRadius: { min: [0.41, 0.39, 0.37, 0.3], max: [0.6, 0.5, 0.4, 0.3] },
  ringRotation: { min: [0, 0, 0, 0], max: [1.5, 1.3, 0.9, 0.5] },
  ringOpacity: { min: [1, 1, 1, 1], max: [1, 1, 1, 1] },
  roseCenterOpacity: { min: 1, max: 1 },
  ringImageRadiusFrac: 0.65,
} as const;
