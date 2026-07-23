export const MAX_DANDELIONS = 8;
export const MAX_LEAVES_PER_DANDELION = 7;
export const MAX_LEAF_SLOTS = MAX_DANDELIONS * MAX_LEAVES_PER_DANDELION;

export const COVERING_SIZE = 200;

export const DANDELION_SKSL = `
uniform float dandelionCount;
uniform float headerX[${MAX_DANDELIONS}];
uniform float headerY[${MAX_DANDELIONS}];
uniform float offsetX[${MAX_DANDELIONS}];
uniform float offsetY[${MAX_DANDELIONS}];
uniform float offsetScale[${MAX_DANDELIONS}];
uniform float stemBaseX[${MAX_DANDELIONS}];
uniform float stemBaseY[${MAX_DANDELIONS}];
uniform float stemBaseWidth[${MAX_DANDELIONS}];
uniform float stemTopWidth[${MAX_DANDELIONS}];
uniform float leafCount[${MAX_DANDELIONS}];
uniform float leafVariant[${MAX_LEAF_SLOTS}];
uniform float perLeafLength[${MAX_LEAF_SLOTS}];
uniform float perLeafWidth[${MAX_LEAF_SLOTS}];
uniform float flowerSize[${MAX_DANDELIONS}];
uniform float ringRotation[${MAX_DANDELIONS}];
uniform float stemVariant[${MAX_DANDELIONS}];
uniform float flowerVariant[${MAX_DANDELIONS}];
uniform float clusterShadowOffsetX[${MAX_DANDELIONS}];
uniform float clusterShadowOffsetY[${MAX_DANDELIONS}];
uniform float flowerTopShadowOffsetX[${MAX_DANDELIONS}];
uniform float flowerTopShadowOffsetY[${MAX_DANDELIONS}];
uniform shader stemTexture1;
uniform shader stemTexture2;
uniform shader stemTexture3;
uniform shader stemTexture4;
uniform shader leafTexture1;
uniform shader leafTexture2;
uniform shader leafTexture3;
uniform shader leafTexture4;
uniform shader flowerTexture1;
uniform shader flowerTexture2;
uniform shader flowerTexture3;
uniform shader flowerTexture4;

  const float COVERING = ${COVERING_SIZE}.0;

half4 sampleLeaf(int variant, float2 coord) {
  if (variant == 0)      { return leafTexture1.eval(coord); }
  else if (variant == 1) { return leafTexture2.eval(coord); }
  else if (variant == 2) { return leafTexture3.eval(coord); }
  else                   { return leafTexture4.eval(coord); }
}

half4 sampleStem(int variant, float2 coord) {
  if (variant == 0)      { return stemTexture1.eval(coord); }
  else if (variant == 1) { return stemTexture2.eval(coord); }
  else if (variant == 2) { return stemTexture3.eval(coord); }
  else                   { return stemTexture4.eval(coord); }
}

half4 sampleFlower(int variant, float2 coord) {
  if (variant == 0)      { return flowerTexture1.eval(coord); }
  else if (variant == 1) { return flowerTexture2.eval(coord); }
  else if (variant == 2) { return flowerTexture3.eval(coord); }
  else                   { return flowerTexture4.eval(coord); }
}

const float SHADOW_GROWTH = 1.05;
const float SHADOW_ALPHA = 0.6;

half4 applyShadow(half4 src) {
  return half4(0.0, 0.0, 0.0, src.a * SHADOW_ALPHA);
}

half4 main(float2 fragCoord) {
  half4 color = half4(0.0);
  int dCount = int(dandelionCount);

  for (int i = 0; i < ${MAX_DANDELIONS}; i++) {
    if (i >= dCount) break;

    float lcx = headerX[i] + clusterShadowOffsetX[i];
    float lcy = headerY[i] + clusterShadowOffsetY[i];
    int leafN = int(leafCount[i]);
    float rot = ringRotation[i];

    for (int j = 0; j < ${MAX_LEAVES_PER_DANDELION}; j++) {
      if (j >= leafN) break;

      float leafLen = perLeafLength[i * ${MAX_LEAVES_PER_DANDELION} + j];
      float leafWid = perLeafWidth[i * ${MAX_LEAVES_PER_DANDELION} + j];
      float maxR = max(leafLen, leafWid);
      if (abs(fragCoord.x - lcx) > maxR || abs(fragCoord.y - lcy) > maxR) continue;

      float angle = float(j) * 6.2831853 / float(leafN) + rot;
      float cosA = cos(angle);
      float sinA = sin(angle);

      float2 d = fragCoord - float2(lcx, lcy);
      float lx = d.x * cosA + d.y * sinA;
      float ly = -d.x * sinA + d.y * cosA;

      float halfW = leafWid * 0.5;
      if (lx < -halfW || lx > halfW || ly < 0.0 || ly > leafLen) continue;

      int vi = int(leafVariant[i * ${MAX_LEAVES_PER_DANDELION} + j]);
      float u = lx / leafWid + 0.5;
      float v = 1.0 - ly / leafLen;
      float2 leafUV = float2(u, v) * COVERING;
      half4 leafColor = sampleLeaf(vi, leafUV);
      if (leafColor.a > 0.01) {
        half4 shadow = applyShadow(leafColor);
        color = shadow + color * (1.0 - shadow.a);
      }
    }
  }

  for (int i = 0; i < ${MAX_DANDELIONS}; i++) {
    if (i >= dCount) break;

    float lcx = headerX[i];
    float lcy = headerY[i];
    int leafN = int(leafCount[i]);
    float rot = ringRotation[i];

    for (int j = 0; j < ${MAX_LEAVES_PER_DANDELION}; j++) {
      if (j >= leafN) break;

      float leafLen = perLeafLength[i * ${MAX_LEAVES_PER_DANDELION} + j];
      float leafWid = perLeafWidth[i * ${MAX_LEAVES_PER_DANDELION} + j];
      float maxR = max(leafLen, leafWid);
      if (abs(fragCoord.x - lcx) > maxR || abs(fragCoord.y - lcy) > maxR) continue;

      float angle = float(j) * 6.2831853 / float(leafN) + rot;
      float cosA = cos(angle);
      float sinA = sin(angle);

      float2 d = fragCoord - float2(lcx, lcy);
      float lx = d.x * cosA + d.y * sinA;
      float ly = -d.x * sinA + d.y * cosA;

      float halfW = leafWid * 0.5;
      if (lx < -halfW || lx > halfW || ly < 0.0 || ly > leafLen) continue;

      int vi = int(leafVariant[i * ${MAX_LEAVES_PER_DANDELION} + j]);
      float u = lx / leafWid + 0.5;
      float v = 1.0 - ly / leafLen;
      float2 leafUV = float2(u, v) * COVERING;
      half4 leafColor = sampleLeaf(vi, leafUV);
      if (leafColor.a > 0.01) {
        color = leafColor * leafColor.a + color * (1.0 - leafColor.a);
      }
    }
  }

  for (int i = 0; i < ${MAX_DANDELIONS}; i++) {
    if (i >= dCount) break;

    float hx = headerX[i] + offsetX[i];
    float hy = headerY[i] + offsetY[i];
    float os = offsetScale[i];
    float sg = SHADOW_GROWTH;

    float bx = stemBaseX[i];
    float by = stemBaseY[i];
    float baseW = stemBaseWidth[i] * sg;
    float topW = stemTopWidth[i] * os * sg;

    float shx = hx + flowerTopShadowOffsetX[i];
    float shy = hy + flowerTopShadowOffsetY[i];

    float sflSize = flowerSize[i] * os * sg;
    float halfFl = sflSize * 0.5;

    float stemMinX = min(bx, shx) - max(baseW, topW);
    float stemMaxX = max(bx, shx) + max(baseW, topW);
    float stemMinY = min(by, shy) - max(baseW, topW);
    float stemMaxY = max(by, shy) + max(baseW, topW);

    float flMinX = shx - halfFl;
    float flMaxX = shx + halfFl;
    float flMinY = shy - halfFl;
    float flMaxY = shy + halfFl;

    float minX = min(stemMinX, flMinX);
    float maxX = max(stemMaxX, flMaxX);
    float minY = min(stemMinY, flMinY);
    float maxY = max(stemMaxY, flMaxY);
    if (fragCoord.x < minX || fragCoord.x > maxX ||
        fragCoord.y < minY || fragCoord.y > maxY) {
      continue;
    }

    if (fragCoord.x >= stemMinX && fragCoord.x <= stemMaxX &&
        fragCoord.y >= stemMinY && fragCoord.y <= stemMaxY) {
      float2 delta = fragCoord - float2(bx, by);
      float2 dir = float2(shx - bx, shy - by);
      float lenSq = dot(dir, dir);
      if (lenSq >= 1e-12) {
        float t = clamp(dot(delta, dir) / lenSq, 0.0, 1.0);
        float2 pt = float2(bx, by) + dir * t;
        float2 normal = float2(-dir.y, dir.x) * inversesqrt(lenSq);
        float signedPerp = dot(fragCoord - pt, normal);
        float perpDist = abs(signedPerp);
        float w = mix(baseW, topW, t);
        if (perpDist < w) {
          float ux = signedPerp / (2.0 * w) + 0.5;
          float2 stemUV = float2(ux, 1.0 - t);
          int sv = int(stemVariant[i]);
          half4 stemColor = sampleStem(sv, stemUV * COVERING);
          if (stemColor.a > 0.01) {
            half4 shadow = applyShadow(stemColor);
            color = shadow + color * (1.0 - shadow.a);
          }
        }
      }
    }

    float2 sd = fragCoord - float2(shx, shy);
    if (sd.x >= -halfFl && sd.x <= halfFl && sd.y >= -halfFl && sd.y <= halfFl) {
      float su = sd.x / sflSize + 0.5;
      float s_v = sd.y / sflSize + 0.5;
      float2 sflowerUV = float2(su, s_v) * COVERING;
      int fv = int(flowerVariant[i]);
      half4 sflowerCol = sampleFlower(fv, sflowerUV);
      if (sflowerCol.a > 0.01) {
        half4 shadow = applyShadow(sflowerCol);
        color = shadow + color * (1.0 - shadow.a);
      }
    }
  }

  for (int i = 0; i < ${MAX_DANDELIONS}; i++) {
    if (i >= dCount) break;

    float hx = headerX[i] + offsetX[i];
    float hy = headerY[i] + offsetY[i];
    float os = offsetScale[i];

    float bx = stemBaseX[i];
    float by = stemBaseY[i];
    float baseW = stemBaseWidth[i];
    float topW = stemTopWidth[i] * os;

    float minX = min(bx, hx) - max(baseW, topW);
    float maxX = max(bx, hx) + max(baseW, topW);
    float minY = min(by, hy) - max(baseW, topW);
    float maxY = max(by, hy) + max(baseW, topW);
    if (fragCoord.x < minX || fragCoord.x > maxX ||
        fragCoord.y < minY || fragCoord.y > maxY) {
      continue;
    }

    float2 delta = fragCoord - float2(bx, by);
    float2 dir = float2(hx - bx, hy - by);
    float lenSq = dot(dir, dir);
    if (lenSq < 1e-12) continue;

    float t = clamp(dot(delta, dir) / lenSq, 0.0, 1.0);
    float2 pt = float2(bx, by) + dir * t;
    float2 normal = float2(-dir.y, dir.x) * inversesqrt(lenSq);
    float signedPerp = dot(fragCoord - pt, normal);
    float perpDist = abs(signedPerp);
    float w = mix(baseW, topW, t);
    if (perpDist < w) {
      float ux = signedPerp / (2.0 * w) + 0.5;
      float2 stemUV = float2(ux, 1.0 - t);
      int sv = int(stemVariant[i]);
      half4 stemColor = sampleStem(sv, stemUV * COVERING);
      if (stemColor.a > 0.01) {
        color = stemColor * stemColor.a + color * (1.0 - stemColor.a);
      }
    }
  }

  for (int i = 0; i < ${MAX_DANDELIONS}; i++) {
    if (i >= dCount) break;

    float hx = headerX[i] + offsetX[i];
    float hy = headerY[i] + offsetY[i];
    float os = offsetScale[i];
    float flSize = flowerSize[i] * os;

    float halfFl = flSize * 0.5;
    float2 d = fragCoord - float2(hx, hy);
    if (d.x < -halfFl || d.x > halfFl || d.y < -halfFl || d.y > halfFl) continue;

    float u = d.x / flSize + 0.5;
    float v = d.y / flSize + 0.5;
    float2 flowerUV = float2(u, v) * COVERING;
    int fv = int(flowerVariant[i]);
    half4 flowerCol = sampleFlower(fv, flowerUV);
    if (flowerCol.a > 0.01) {
      color = flowerCol * flowerCol.a + color * (1.0 - flowerCol.a);
    }
  }

  return color;
}
`;
