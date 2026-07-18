export const MAX_PETALS = 16;
export const MAX_RINGS = 3;

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
uniform float ringsCount;
uniform float petalsCount[${MAX_RINGS}];
uniform float ringRadiusMin[${MAX_RINGS}];
uniform float ringRadiusMax[${MAX_RINGS}];
uniform float ringBorderMin[${MAX_RINGS}];
uniform float ringBorderMax[${MAX_RINGS}];
uniform float petalWidthMin[${MAX_RINGS}];
uniform float petalWidthMax[${MAX_RINGS}];
uniform float coefficient;
uniform float iTime;
uniform shader budTexture;
uniform shader roseCenterTexture;
uniform shader petalTexture1;
uniform shader petalTexture2;
uniform shader petalTexture3;
uniform shader petalTexture4;
uniform shader petalTexture5;
uniform shader petalTexture6;

half4 samplePetal(int variant, float2 coord) {
  if (variant == 0)      { return petalTexture1.eval(coord); }
  else if (variant == 1) { return petalTexture2.eval(coord); }
  else if (variant == 2) { return petalTexture3.eval(coord); }
  else if (variant == 3) { return petalTexture4.eval(coord); }
  else if (variant == 4) { return petalTexture5.eval(coord); }
  else                   { return petalTexture6.eval(coord); }
}

half4 main(float2 fragCoord) {
  float budInner    = mix(budInnerMin, budInnerMax, coefficient);
  float budOuter    = mix(budOuterMin, budOuterMax, coefficient);
  float centerDiam  = mix(roseCenterDiameterMin, roseCenterDiameterMax, coefficient);
  float centerBulge = mix(roseCenterBulgeMin, roseCenterBulgeMax, coefficient);
  int   rings       = int(ringsCount);

  float ringRadiusL[${MAX_RINGS}];
  float ringBorderL[${MAX_RINGS}];
  float petalWidthL[${MAX_RINGS}];
  int   petalsCountL[${MAX_RINGS}];
  for (int i = 0; i < ${MAX_RINGS}; i++) {
    ringRadiusL[i]  = mix(ringRadiusMin[i],  ringRadiusMax[i],  coefficient);
    ringBorderL[i]  = mix(ringBorderMin[i],  ringBorderMax[i],  coefficient);
    petalWidthL[i]  = mix(petalWidthMin[i],  petalWidthMax[i],  coefficient);
    petalsCountL[i] = int(petalsCount[i]);
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
    float2 sourceFragCoord = center + float2(cos(theta), sin(theta)) * sourceDist;
    half4 budColor = budTexture.eval(sourceFragCoord);
    float fadeIn = smoothstep(budInner, budInner + 0.02, r);
    float fadeOut = 1.0 - smoothstep(budOuter - 0.02, budOuter, r);
    color = budColor * fadeIn * fadeOut;
  }

  for (int ring = 0; ring < ${MAX_RINGS}; ring++) {
    if (ring >= rings) break;

    float ringInner = ringRadiusL[ring] - ringBorderL[ring];
    float ringOuter = ringRadiusL[ring] + ringBorderL[ring];
    if (r < ringInner || r > ringOuter) continue;

    int count = petalsCountL[ring];
    float slotAngle = 6.2831853 / float(count);
    float halfSpan  = petalWidthL[ring] * 3.14159265;

    for (int i = 0; i < ${MAX_PETALS}; i++) {
      if (i >= count) break;

      int variant = i;
      if (variant >= 6) { variant -= 6; }

      float petalCenterAngle = float(i) * slotAngle;
      float angularDist = theta - petalCenterAngle;
      if (angularDist >  3.14159265) angularDist -= 6.2831853;
      if (angularDist < -3.14159265) angularDist += 6.2831853;

      if (abs(angularDist) > halfSpan) continue;

      float u = 0.5 + angularDist / (2.0 * halfSpan);
      float v = 1.0 - (r - ringInner) / (2.0 * ringBorderL[ring]);

      float2 texCoord = float2(roseX + u * roseW, roseY + v * roseH);
      half4 petalColor = samplePetal(variant, texCoord);

      if (petalColor.a < 0.01) continue;

      color = petalColor * petalColor.a + color * (1.0 - petalColor.a);
    }
  }

  if (centerDiam > 0.0) {
    float centerRadius = centerDiam * 0.5;
    float bulge = max(centerBulge, 0.0);
    float edgeWidth = mix(0.08, 0.01, clamp(bulge, 0.0, 1.0));
    if (r < centerRadius) {
      float rNorm = r / centerRadius;
      float exponent = 1.0 + bulge;
      float puffScale = pow(rNorm, exponent - 1.0);
      float centerU = 0.5 + delta.x * puffScale / (centerRadius * 2.0 * halfSize);
      float centerV = 0.5 + delta.y * puffScale / (centerRadius * 2.0 * halfSize);
      float2 centerCoord = float2(roseX + centerU * roseW, roseY + centerV * roseH);
      half4 centerColor = roseCenterTexture.eval(centerCoord);
      centerColor.a *= smoothstep(centerRadius, centerRadius - edgeWidth, r);
      if (centerColor.a > 0.01) {
        color = centerColor * centerColor.a + color * (1.0 - centerColor.a);
      }
    }
  }

  return color;
}
`;

export const roseBudUniformDefaults = {
  budInner: { min: 0.0, max: 0.0 },
  budOuter: { min: 1.0, max: 1.0 },
  roseCenterDiameter: { min: 1.0, max: 1.0 },
  roseCenterBulge: { min: 0.0, max: 1.0 },
  ringsCount: 2,
  petalsCount: [9, 7],
  ringRadius: { min: [0.48, 0.39], max: [0.48, 0.39] },
  ringBorder: { min: [0.10, 0.07], max: [0.10, 0.07] },
  petalWidth: { min: [0.17, 0.22], max: [0.17, 0.22] },
} as const;
