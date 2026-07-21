import {
  MAX_LEAVES_PER_STEM,
  MAX_STEMS_PER_BUSH,
} from '../scenery/BushShaderLayer/types';

export { MAX_STEMS_PER_BUSH, MAX_LEAVES_PER_STEM };

const LEAF_SLOTS = MAX_STEMS_PER_BUSH * MAX_LEAVES_PER_STEM;

export const COVERING_SIZE = 200;

export const ROSE_BUSH_SKSL = `
uniform float stemCount;
uniform float stemBaseX[${MAX_STEMS_PER_BUSH}];
uniform float stemBaseY[${MAX_STEMS_PER_BUSH}];
uniform float stemTopX[${MAX_STEMS_PER_BUSH}];
uniform float stemTopY[${MAX_STEMS_PER_BUSH}];
uniform float stemControlX[${MAX_STEMS_PER_BUSH}];
uniform float stemControlY[${MAX_STEMS_PER_BUSH}];
uniform float stemBaseWidth[${MAX_STEMS_PER_BUSH}];
uniform float stemTopWidth[${MAX_STEMS_PER_BUSH}];
uniform float stemCalyxSize[${MAX_STEMS_PER_BUSH}];
uniform float stemLeafCount[${MAX_STEMS_PER_BUSH}];
uniform float leafT[${LEAF_SLOTS}];
uniform float leafSide[${LEAF_SLOTS}];
uniform float leafTilt[${LEAF_SLOTS}];
uniform float leafVariant[${LEAF_SLOTS}];
uniform float leafSize[${LEAF_SLOTS}];
uniform shader stemTexture;
uniform shader calyxTexture;
uniform shader leafTexture1;
uniform shader leafTexture2;
uniform shader leafTexture3;
uniform shader leafTexture4;

const float COVERING = ${COVERING_SIZE}.0;
const int BEZIER_SAMPLES = 24;

float2 bezierPoint(float t, float2 p0, float2 p1, float2 p2) {
  float u = 1.0 - t;
  return u * u * p0 + 2.0 * u * t * p1 + t * t * p2;
}

float2 bezierTangent(float t, float2 p0, float2 p1, float2 p2) {
  return 2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1);
}

float2 bezierNormal(float t, float2 p0, float2 p1, float2 p2) {
  float2 tan = bezierTangent(t, p0, p1, p2);
  return float2(-tan.y, tan.x);
}

half4 sampleLeaf(int variant, float2 coord) {
  if (variant == 0)      { return leafTexture1.eval(coord); }
  else if (variant == 1) { return leafTexture2.eval(coord); }
  else if (variant == 2) { return leafTexture3.eval(coord); }
  else                   { return leafTexture4.eval(coord); }
}

half4 sampleStemLeaves(float2 fragCoord, int stemIdx, float2 p0, float2 p1, float2 p2,
                       float signFilter) {
  int leafN = int(stemLeafCount[stemIdx]);
  half4 result = half4(0.0);
  for (int j = 0; j < ${MAX_LEAVES_PER_STEM}; j++) {
    if (j >= leafN) break;
    int idx = stemIdx * ${MAX_LEAVES_PER_STEM} + j;
    if (leafSide[idx] * signFilter <= 0.0) continue;

    float t = leafT[idx];
    float tilt = leafTilt[idx];
    int variant = int(leafVariant[idx]);
    float lSize = leafSize[idx];

    float2 attachment = bezierPoint(t, p0, p1, p2);
    float2 normal = bezierNormal(t, p0, p1, p2);
    float nLen = length(normal);
    if (nLen < 1e-6) continue;
    float2 nN = normal / nLen;
    float2 upR = float(leafSide[idx]) * nN;
    float2 rightR0 = float2(-upR.y, upR.x);

    float c = cos(tilt);
    float s = sin(tilt);
    float2 upRot = float2(c * upR.x - s * upR.y, s * upR.x + c * upR.y);
    float2 rightRot = float2(c * rightR0.x - s * rightR0.y, s * rightR0.x + c * rightR0.y);

    float2 offset = fragCoord - attachment;
    float2 rotated = float2(dot(offset, rightRot), dot(offset, upRot));
    float2 leafUV = float2(rotated.x / lSize + 0.5, rotated.y / lSize);
    if (leafUV.x < 0.0 || leafUV.x > 1.0 ||
        leafUV.y < 0.0 || leafUV.y > 1.0) continue;

    half4 leafColor = sampleLeaf(variant, leafUV * COVERING);
    if (leafColor.a > 0.01) {
      result = leafColor * leafColor.a + result * (1.0 - leafColor.a);
    }
  }
  return result;
}

half4 main(float2 fragCoord) {
  half4 color = half4(0.0);
  int stemN = int(stemCount);

  for (int i = 0; i < ${MAX_STEMS_PER_BUSH}; i++) {
    if (i >= stemN) break;
    float2 p0 = float2(stemBaseX[i], stemBaseY[i]);
    float2 p1 = float2(stemControlX[i], stemControlY[i]);
    float2 p2 = float2(stemTopX[i], stemTopY[i]);
    half4 inner = sampleStemLeaves(fragCoord, i, p0, p1, p2, -1.0);
    color = inner + color * (1.0 - inner.a);
  }

  for (int i = 0; i < ${MAX_STEMS_PER_BUSH}; i++) {
    if (i >= stemN) break;

    float2 p0 = float2(stemBaseX[i], stemBaseY[i]);
    float2 p1 = float2(stemControlX[i], stemControlY[i]);
    float2 p2 = float2(stemTopX[i], stemTopY[i]);
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

    float minDist = 1e10;
    float bestT = 0.0;
    for (int s = 0; s <= BEZIER_SAMPLES; s++) {
      float t = float(s) / float(BEZIER_SAMPLES);
      float2 pt = bezierPoint(t, p0, p1, p2);
      float d = length(fragCoord - pt);
      if (d < minDist) { minDist = d; bestT = t; }
    }
    for (int r = 0; r < 4; r++) {
      float2 pt = bezierPoint(bestT, p0, p1, p2);
      float2 tan = bezierTangent(bestT, p0, p1, p2);
      float tanLen = length(tan);
      if (tanLen < 1e-6) break;
      float2 toFrag = fragCoord - pt;
      float tOffset = dot(toFrag, tan) / (tanLen * tanLen);
      bestT = clamp(bestT + tOffset, 0.0, 1.0);
    }
    float2 ptFinal = bezierPoint(bestT, p0, p1, p2);
    float dist = length(fragCoord - ptFinal);

    float width = mix(baseW, topW, bestT);
    if (dist < width) {
      float2 tanAtBest = bezierTangent(bestT, p0, p1, p2);
      float tanLen = length(tanAtBest);
      float2 tanN = tanAtBest / max(tanLen, 1e-6);
      float2 normAtBest = float2(-tanN.y, tanN.x);
      float perpOffset = dot(fragCoord - ptFinal, normAtBest);
      float u = clamp((perpOffset + width * 0.5) / width, 0.0, 1.0);
      float2 stemUV = float2(u, bestT);
      half4 stemColor = stemTexture.eval(stemUV * COVERING);
      if (stemColor.a > 0.01) {
        color = stemColor * stemColor.a + color * (1.0 - stemColor.a);
      }
    }
  }

  for (int i = 0; i < ${MAX_STEMS_PER_BUSH}; i++) {
    if (i >= stemN) break;

    float calyxSize = stemCalyxSize[i];
    float2 calyxCenter = float2(stemTopX[i], stemTopY[i]);
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
    float2 p2 = float2(stemTopX[i], stemTopY[i]);
    half4 outer = sampleStemLeaves(fragCoord, i, p0, p1, p2, 1.0);
    color = outer + color * (1.0 - outer.a);
  }

  return color;
}
`;

export const roseBushUniformDefaults = {
  calyxSizeFraction: 0.55,
} as const;
