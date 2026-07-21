export const MAX_PETALS = 16;
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
uniform float brightnessMin;
uniform float brightnessMax;
uniform float3 tintA;
uniform float tintStrength;
uniform float ringsCount;
uniform float petalsCount[${MAX_RINGS}];
uniform float ringRadiusMin[${MAX_RINGS}];
uniform float ringRadiusMax[${MAX_RINGS}];
uniform float ringBorderMin[${MAX_RINGS}];
uniform float ringBorderMax[${MAX_RINGS}];
uniform float petalWidthMin[${MAX_RINGS}];
uniform float petalWidthMax[${MAX_RINGS}];
uniform float ringRotationMin[${MAX_RINGS}];
uniform float ringRotationMax[${MAX_RINGS}];
uniform float ringBorderDeviation[${MAX_RINGS}];
uniform float petalWidthDeviation[${MAX_RINGS}];
uniform float roseSeed;
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

const float petalBottomDarkness = 0.7;

half4 samplePetal(int variant, float2 coord) {
  if (variant == 0)      { return petalTexture1.eval(coord); }
  else if (variant == 1) { return petalTexture2.eval(coord); }
  else if (variant == 2) { return petalTexture3.eval(coord); }
  else if (variant == 3) { return petalTexture4.eval(coord); }
  else if (variant == 4) { return petalTexture5.eval(coord); }
  else                   { return petalTexture6.eval(coord); }
}

float ringHash(int a, int b, int c, float seed) {
  return fract(sin(float(a) * 12.9898 + float(b) * 78.233 + float(c) * 37.719 + seed * 51.137) * 43758.5453);
}

half4 main(float2 fragCoord) {
  float budInner         = mix(budInnerMin, budInnerMax, coefficient);
  float budOuter         = mix(budOuterMin, budOuterMax, coefficient);
  float centerDiam       = mix(roseCenterDiameterMin, roseCenterDiameterMax, coefficient);
  float centerBulge      = mix(roseCenterBulgeMin, roseCenterBulgeMax, coefficient);
  float budRotationL     = mix(budRotationMin, budRotationMax, coefficient);
  float roseCenterRotL   = mix(roseCenterRotationMin, roseCenterRotationMax, coefficient);
  float brightnessL      = mix(brightnessMin, brightnessMax, coefficient);
  int   rings            = int(ringsCount);

  float ringRadiusL[${MAX_RINGS}];
  float ringBorderL[${MAX_RINGS}];
  float petalWidthL[${MAX_RINGS}];
  float ringRotationL[${MAX_RINGS}];
  float ringBorderDeviationL[${MAX_RINGS}];
  float petalWidthDeviationL[${MAX_RINGS}];
  int   petalsCountL[${MAX_RINGS}];
  for (int i = 0; i < ${MAX_RINGS}; i++) {
    ringRadiusL[i]         = mix(ringRadiusMin[i],   ringRadiusMax[i],   coefficient);
    ringBorderL[i]         = mix(ringBorderMin[i],   ringBorderMax[i],   coefficient);
    petalWidthL[i]         = mix(petalWidthMin[i],   petalWidthMax[i],   coefficient);
    ringRotationL[i]       = mix(ringRotationMin[i], ringRotationMax[i], coefficient);
    ringBorderDeviationL[i] = ringBorderDeviation[i];
    petalWidthDeviationL[i] = petalWidthDeviation[i];
    petalsCountL[i]        = int(petalsCount[i]);
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

    float borderDevFrac = ringBorderDeviationL[ring] / 100.0;
    float ringInner = ringRadiusL[ring] - ringBorderL[ring] * (1.0 + borderDevFrac);
    float ringOuter = ringRadiusL[ring] + ringBorderL[ring] * (1.0 + borderDevFrac);
    if (r < ringInner || r > ringOuter) continue;

    int count = petalsCountL[ring];
    float slotAngle = 6.2831853 / float(count);
    float widthDevFrac = petalWidthDeviationL[ring] / 100.0;

    for (int i = 0; i < ${MAX_PETALS}; i++) {
      if (i >= count) break;

      int variant = i;
      if (variant >= 6) { variant -= 6; }

      float borderRng = ringHash(ring, i, 0, roseSeed);
      float petalBorder = ringBorderL[ring] * (1.0 + (borderRng * 2.0 - 1.0) * borderDevFrac);

      float widthRng = ringHash(ring, i, 1, roseSeed);
      float halfSpan = petalWidthL[ring] * (1.0 + (widthRng * 2.0 - 1.0) * widthDevFrac) * 3.14159265;

      float petalInner = ringRadiusL[ring] - petalBorder;
      float petalOuter = ringRadiusL[ring] + petalBorder;
      if (r < petalInner || r > petalOuter) continue;

      float petalCenterAngle = float(i) * slotAngle + ringRotationL[ring];
      float angularDist = theta - petalCenterAngle;
      if (angularDist >  3.14159265) angularDist -= 6.2831853;
      if (angularDist < -3.14159265) angularDist += 6.2831853;

      if (abs(angularDist) > halfSpan) continue;

      float u = 0.5 + angularDist / (2.0 * halfSpan);
      float v = 1.0 - (r - petalInner) / (2.0 * petalBorder);

      float uFade = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.94, 1.0, u));
      float vFade = smoothstep(0.0, 0.06, v) * (1.0 - smoothstep(0.94, 1.0, v));
      float edgeFade = uFade * vFade;

      float2 texCoord = float2(roseX + u * roseW, roseY + v * roseH);
      half4 petalColor = samplePetal(variant, texCoord);
      petalColor.rgb *= brightnessL + 0.1 - petalBottomDarkness * v;
      petalColor.a *= edgeFade;

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
      float rcCos = cos(roseCenterRotL);
      float rcSin = sin(roseCenterRotL);
      float rcDeltaX = delta.x * rcCos - delta.y * rcSin;
      float rcDeltaY = delta.x * rcSin + delta.y * rcCos;
      float centerU = 0.5 + rcDeltaX * puffScale / (centerRadius * 2.0 * halfSize);
      float centerV = 0.5 + rcDeltaY * puffScale / (centerRadius * 2.0 * halfSize);
      float2 centerCoord = float2(roseX + centerU * roseW, roseY + centerV * roseH);
      half4 centerColor = roseCenterTexture.eval(centerCoord);
      centerColor.a *= smoothstep(centerRadius, centerRadius - edgeWidth, r);
      if (centerColor.a > 0.01) {
        color = centerColor * centerColor.a + color * (1.0 - centerColor.a);
      }
    }
  }

  color.rgb *= brightnessL;
  half lum = max(max(color.r, color.g), color.b);
  color.rgb = mix(color.rgb, half3(tintA) * lum, half(tintStrength));
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
  petalsCount: [7 ,8 ,10, 11],
  ringRadius: { min: [0.5 ,0.5 ,0.5, 0.4], max: [0.72, 0.68 ,0.57, 0.43] },
  ringBorder: { min: [0.09, 0.07 ,0.04, 0.02], max: [0.27, 0.12 ,0.11, 0.10] },
  petalWidth: { min: [0.17, 0.15 ,0.14, 0.16], max: [0.17, 0.15 ,0.14, 0.16] },
  ringRotation: { min: [0, 0, 0, 0], max: [1.5, 1.3, 0.9, 0.5] },
  ringBorderDeviation: [10, 30, 30, 20],
  petalWidthDeviation: [10, 10, 20, 50],
} as const;
