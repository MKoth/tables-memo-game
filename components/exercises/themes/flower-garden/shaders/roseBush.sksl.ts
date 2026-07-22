import {
  MAX_LEAVES_PER_STEM,
  MAX_STEMS_PER_BUSH,
} from '../scenery/BushShaderLayer/types';

export { MAX_STEMS_PER_BUSH, MAX_LEAVES_PER_STEM };

const LEAF_SLOTS = MAX_STEMS_PER_BUSH * MAX_LEAVES_PER_STEM;

export const COVERING_SIZE = 200;

export const MAX_PARALLAX_DELTA = 60;

export const ROSE_BUSH_SKSL = `
uniform float stemCount;
uniform float stemBaseX[${MAX_STEMS_PER_BUSH}];
uniform float stemBaseY[${MAX_STEMS_PER_BUSH}];
uniform float stemControlX[${MAX_STEMS_PER_BUSH}];
uniform float stemControlY[${MAX_STEMS_PER_BUSH}];
uniform float stemBaseWidth[${MAX_STEMS_PER_BUSH}];
uniform float stemTopWidth[${MAX_STEMS_PER_BUSH}];
uniform float stemCalyxSize[${MAX_STEMS_PER_BUSH}];
uniform float stemLeafCount[${MAX_STEMS_PER_BUSH}];
uniform float restX[${MAX_STEMS_PER_BUSH}];
uniform float restY[${MAX_STEMS_PER_BUSH}];
uniform float layoutX[${MAX_STEMS_PER_BUSH}];
uniform float layoutY[${MAX_STEMS_PER_BUSH}];
uniform float layoutScale[${MAX_STEMS_PER_BUSH}];
uniform float leafT[${LEAF_SLOTS}];
uniform float leafSide[${LEAF_SLOTS}];
uniform float leafTilt[${LEAF_SLOTS}];
uniform float leafVariant[${LEAF_SLOTS}];
uniform float leafSize[${LEAF_SLOTS}];
uniform float leafRestX[${LEAF_SLOTS}];
uniform float leafRestY[${LEAF_SLOTS}];
uniform shader stemTexture;
uniform shader calyxTexture;
uniform shader leafTexture1;
uniform shader leafTexture2;
uniform shader leafTexture3;
uniform shader leafTexture4;

const float COVERING = ${COVERING_SIZE}.0;
const float MAX_PARALLAX = ${MAX_PARALLAX_DELTA}.0;
const int BEZIER_SAMPLES = 12;

float2 bezierPoint(float t, float2 p0, float2 p1, float2 p2) {
  float u = 1.0 - t;
  return u * u * p0 + 2.0 * u * t * p1 + t * t * p2;
}

float2 bezierTangent(float t, float2 p0, float2 p1, float2 p2) {
  return 2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1);
}

half4 sampleLeaf(int variant, float2 coord) {
  if (variant == 0)      { return leafTexture1.eval(coord); }
  else if (variant == 1) { return leafTexture2.eval(coord); }
  else if (variant == 2) { return leafTexture3.eval(coord); }
  else                   { return leafTexture4.eval(coord); }
}

half4 blendLeaf(half4 base, float lT, float lSide, float lTilt, int lVariant, float lSize,
                float2 leafRest, float2 fragCoord, float2 p0, float2 p1, float2 p2) {
  float halfSize = lSize * 1.5 + lT * lT * MAX_PARALLAX;
  if (abs(fragCoord.x - leafRest.x) > halfSize) return base;
  if (abs(fragCoord.y - leafRest.y) > halfSize) return base;

  float2 attachment = bezierPoint(lT, p0, p1, p2);
  float2 tan = bezierTangent(lT, p0, p1, p2);
  float tanLenSq = dot(tan, tan);
  if (tanLenSq < 1e-12) return base;
  float2 tanN = tan * inversesqrt(tanLenSq);
  float2 nN = float2(-tanN.y, tanN.x);
  float2 upR = lSide * nN;
  float2 rightR0 = float2(-upR.y, upR.x);

  float c = cos(lTilt);
  float s = sin(lTilt);
  float2 upRot = float2(c * upR.x - s * upR.y, s * upR.x + c * upR.y);
  float2 rightRot = float2(c * rightR0.x - s * rightR0.y, s * rightR0.x + c * rightR0.y);

  float2 offset = fragCoord - attachment;
  float2 rotated = float2(dot(offset, rightRot), dot(offset, upRot));
  float2 leafUV = float2(rotated.x / lSize + 0.5, 1.0 - rotated.y / lSize);
  if (leafUV.x < 0.0 || leafUV.x > 1.0 ||
      leafUV.y < 0.0 || leafUV.y > 1.0) return base;

  half4 leafColor = sampleLeaf(lVariant, leafUV * COVERING);
  if (leafColor.a < 0.01) return base;
  return leafColor * leafColor.a + base * (1.0 - leafColor.a);
}

half4 main(float2 fragCoord) {
  half4 color = half4(0.0);
  int stemN = int(stemCount);

  for (int i = 0; i < ${MAX_STEMS_PER_BUSH}; i++) {
    if (i >= stemN) break;
    float2 p0 = float2(stemBaseX[i], stemBaseY[i]);
    float2 p1 = float2(stemControlX[i], stemControlY[i]);
    float2 p2 = float2(layoutX[i], layoutY[i]);
    int leafN = int(stemLeafCount[i]);
    for (int j = 0; j < ${MAX_LEAVES_PER_STEM}; j++) {
      if (j >= leafN) break;
      if (leafSide[i * ${MAX_LEAVES_PER_STEM} + j] >= 0.0) continue;
      color = blendLeaf(color,
                        leafT[i * ${MAX_LEAVES_PER_STEM} + j],
                        leafSide[i * ${MAX_LEAVES_PER_STEM} + j],
                        leafTilt[i * ${MAX_LEAVES_PER_STEM} + j],
                        int(leafVariant[i * ${MAX_LEAVES_PER_STEM} + j]),
                        leafSize[i * ${MAX_LEAVES_PER_STEM} + j],
                        float2(leafRestX[i * ${MAX_LEAVES_PER_STEM} + j], leafRestY[i * ${MAX_LEAVES_PER_STEM} + j]),
                        fragCoord, p0, p1, p2);
    }
  }

  for (int i = 0; i < ${MAX_STEMS_PER_BUSH}; i++) {
    if (i >= stemN) break;

    float2 p0 = float2(stemBaseX[i], stemBaseY[i]);
    float2 p1 = float2(stemControlX[i], stemControlY[i]);
    float2 p2 = float2(layoutX[i], layoutY[i]);
    float baseW = stemBaseWidth[i];
    float topW = stemTopWidth[i];

    float minBX = min(min(p0.x, p1.x), p2.x) - topW;
    float maxBX = max(max(p0.x, p1.x), p2.x) + topW;
    float minBY = min(min(p0.y, p1.y), p2.y) - topW;
    float maxBY = max(max(p0.y, p1.y), p2.y) + topW;
    if (fragCoord.x < minBX || fragCoord.x > maxBX ||
        fragCoord.y < minBY || fragCoord.y > maxBY) {
      continue;
    }

    float minDistSq = 1e20;
    float bestT = 0.0;
    for (int s = 0; s <= BEZIER_SAMPLES; s++) {
      float t = float(s) / float(BEZIER_SAMPLES);
      float2 pt = bezierPoint(t, p0, p1, p2);
      float2 diff = fragCoord - pt;
      float dSq = dot(diff, diff);
      if (dSq < minDistSq) { minDistSq = dSq; bestT = t; }
    }
    for (int r = 0; r < 2; r++) {
      float2 pt = bezierPoint(bestT, p0, p1, p2);
      float2 tan = bezierTangent(bestT, p0, p1, p2);
      float tanLenSq = dot(tan, tan);
      if (tanLenSq < 1e-12) break;
      float2 toFrag = fragCoord - pt;
      float tOffset = dot(toFrag, tan) / tanLenSq;
      bestT = clamp(bestT + tOffset, 0.0, 1.0);
    }
    float2 ptFinal = bezierPoint(bestT, p0, p1, p2);
    float2 diffFinal = fragCoord - ptFinal;
    float distSq = dot(diffFinal, diffFinal);

    float width = mix(baseW, topW, bestT);
    if (distSq < width * width) {
      float2 tanAtBest = bezierTangent(bestT, p0, p1, p2);
      float tanLenSqBest = dot(tanAtBest, tanAtBest);
      float2 tanN = tanAtBest * inversesqrt(max(tanLenSqBest, 1e-12));
      float2 normAtBest = float2(-tanN.y, tanN.x);
      float perpOffset = dot(diffFinal, normAtBest);
      float u = clamp((perpOffset + width * 0.5) / width, 0.0, 1.0);
      float2 stemUV = float2(u, 1.0 - bestT);
      half4 stemColor = stemTexture.eval(stemUV * COVERING);
      if (stemColor.a > 0.01) {
        color = stemColor * stemColor.a + color * (1.0 - stemColor.a);
      }
    }
  }

  for (int i = 0; i < ${MAX_STEMS_PER_BUSH}; i++) {
    if (i >= stemN) break;

    float calyxSize = stemCalyxSize[i] * layoutScale[i];
    float2 calyxCenter = float2(layoutX[i], layoutY[i]);
    float2 calyxTopLeft = calyxCenter - calyxSize * 0.5;
    float2 calyxUV = (fragCoord - calyxTopLeft) / calyxSize;
    if (calyxUV.x >= 0.0 && calyxUV.x <= 1.0 &&
        calyxUV.y >= 0.0 && calyxUV.y <= 1.0) {
      half4 calyxColor = calyxTexture.eval(calyxUV * COVERING);
      if (calyxColor.a > 0.01) {
        color = calyxColor * calyxColor.a + color * (1.0 - calyxColor.a);
      }
    }
  }

  for (int i = 0; i < ${MAX_STEMS_PER_BUSH}; i++) {
    if (i >= stemN) break;
    float2 p0 = float2(stemBaseX[i], stemBaseY[i]);
    float2 p1 = float2(stemControlX[i], stemControlY[i]);
    float2 p2 = float2(layoutX[i], layoutY[i]);
    int leafN = int(stemLeafCount[i]);
    for (int j = 0; j < ${MAX_LEAVES_PER_STEM}; j++) {
      if (j >= leafN) break;
      if (leafSide[i * ${MAX_LEAVES_PER_STEM} + j] <= 0.0) continue;
      color = blendLeaf(color,
                        leafT[i * ${MAX_LEAVES_PER_STEM} + j],
                        leafSide[i * ${MAX_LEAVES_PER_STEM} + j],
                        leafTilt[i * ${MAX_LEAVES_PER_STEM} + j],
                        int(leafVariant[i * ${MAX_LEAVES_PER_STEM} + j]),
                        leafSize[i * ${MAX_LEAVES_PER_STEM} + j],
                        float2(leafRestX[i * ${MAX_LEAVES_PER_STEM} + j], leafRestY[i * ${MAX_LEAVES_PER_STEM} + j]),
                        fragCoord, p0, p1, p2);
    }
  }

  return color;
}
`;

export const roseBushUniformDefaults = {
  calyxSizeFraction: 1.2,
} as const;
